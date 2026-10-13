#!/usr/bin/env bash
# Installs Yallapp's GitHub Actions runners on an AlmaLinux 9 server, cPanel
# or not. Each runner is a rootless Podman container that systemd keeps
# running under the "ghrunner" user, capped in CPU and memory so the sites on
# the server keep their share. Nothing is added to cPanel accounts.
#
# A single file, so it can be pasted on the server. Run as root (WHM >
# Server Configuration > Terminal works):
#   RUNNERS=2 CPUS=2 MEMORY=4g bash install.sh
# The token comes from the repository's Settings > Actions > Runners > New
# self-hosted runner; the script asks for it (or reads RUNNER_TOKEN) and it is
# only needed while runners register. Running the script again rebuilds the
# image and restarts the runners.
set -euo pipefail

RUNNERS="${RUNNERS:-2}"
CPUS="${CPUS:-2}"
MEMORY="${MEMORY:-4g}"
RUNNER_URL="${RUNNER_URL:-https://github.com/WEBEK-LTD/app-lms}"
USER_NAME=ghrunner

fail() {
	echo "$1" >&2
	exit 1
}

[ "$(id -u)" = 0 ] || fail "Run as root."
[ "$(uname -m)" = x86_64 ] || fail "This needs an x86_64 server: Android's build tools only run there."
case "$RUNNERS" in '' | *[!0-9]*) fail "RUNNERS must be a number." ;; esac

dnf install -y podman

if ! id "$USER_NAME" >/dev/null 2>&1; then
	# Outside /home, so cPanel's account tools and scans leave it alone.
	useradd --home-dir "/var/lib/$USER_NAME" --create-home --shell /bin/bash "$USER_NAME"
	passwd --lock "$USER_NAME" >/dev/null
fi
if ! grep -q "^$USER_NAME:" /etc/subuid; then
	usermod --add-subuids 524288-589823 --add-subgids 524288-589823 "$USER_NAME"
fi
uid="$(id -u "$USER_NAME")"
home="$(getent passwd "$USER_NAME" | cut -d: -f6)"

# Lets systemd cap the user's containers in CPU and memory.
mkdir -p /etc/systemd/system/user@.service.d
printf '[Service]\nDelegate=cpu cpuset io memory pids\n' >/etc/systemd/system/user@.service.d/yallapp-delegate.conf
systemctl daemon-reload
# Starts the user's services at boot, without a login.
loginctl enable-linger "$USER_NAME"
for _ in $(seq 1 30); do
	[ -S "/run/user/$uid/bus" ] && break
	sleep 1
done
[ -S "/run/user/$uid/bus" ] || fail "The $USER_NAME user's systemd did not start."

as_user() {
	(cd "$home" && runuser -u "$USER_NAME" -- env \
		XDG_RUNTIME_DIR="/run/user/$uid" \
		DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
		"$@")
}

# The image.
install -d -o "$USER_NAME" -g "$USER_NAME" "$home/image"
# Close to GitHub's ubuntu-24.04 runners, so the workflows run unchanged.
cat >"$home/image/Dockerfile" <<'DOCKERFILE'
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
# Empty: the latest runner release when the image is built. The runner then
# updates itself.
ARG RUNNER_VERSION=

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl file git gnupg jq libffi-dev \
      libsqlite3-dev libssl-dev libyaml-dev locales lsb-release openssh-client \
      pkg-config python3 python3-pip python3-venv rsync shellcheck \
      software-properties-common sqlite3 sudo tzdata unzip wget xz-utils \
      zip zlib1g-dev \
 && locale-gen en_US.UTF-8 \
 && rm -rf /var/lib/apt/lists/*

# Jobs install what they need (setup-php, Playwright's browser libraries) with
# sudo, as on GitHub's runners. Sudo stays inside this container.
RUN useradd --create-home --shell /bin/bash runner \
 && echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner \
 && chmod 0440 /etc/sudoers.d/runner \
 && mkdir -p /opt/hostedtoolcache \
 && chown runner:runner /opt/hostedtoolcache

WORKDIR /home/runner/actions-runner
RUN version="${RUNNER_VERSION:-$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')}" \
 && curl -fsSL "https://github.com/actions/runner/releases/download/v${version}/actions-runner-linux-x64-${version}.tar.gz" \
    | tar -xz \
 && ./bin/installdependencies.sh \
 && rm -rf /var/lib/apt/lists/* \
 && chown -R runner:runner /home/runner

# setup-python and setup-ruby download builds made for this path and these
# names.
ENV RUNNER_TOOL_CACHE=/opt/hostedtoolcache \
    AGENT_TOOLSDIRECTORY=/opt/hostedtoolcache \
    ImageOS=ubuntu24 \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0755 /usr/local/bin/entrypoint.sh
USER runner
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
DOCKERFILE
# Registers the runner on its first start (the registration lives in the
# runner's volume), then waits for jobs.
cat >"$home/image/entrypoint.sh" <<'ENTRYPOINT'
#!/usr/bin/env bash
# Registers the runner on its first start (the registration lives in the
# runner's volume), then waits for jobs.
set -euo pipefail

cd /home/runner/actions-runner

if [ ! -f .runner ]; then
	if [ -z "${RUNNER_TOKEN:-}" ]; then
		echo "No registration token. Run install.sh again with RUNNER_TOKEN set to a new token from the repository's Settings > Actions > Runners > New self-hosted runner." >&2
		exit 1
	fi
	./config.sh --unattended --replace \
		--url "${RUNNER_URL:-https://github.com/WEBEK-LTD/app-lms}" \
		--token "$RUNNER_TOKEN" \
		--name "${RUNNER_NAME:-$(hostname)}" \
		--labels "${RUNNER_LABELS:-yallapp}" \
		--work _work
fi

exec ./run.sh
ENTRYPOINT
chown "$USER_NAME:$USER_NAME" "$home/image/Dockerfile" "$home/image/entrypoint.sh"
as_user podman build --pull=newer -t localhost/yallapp-runner "$home/image"

# The registration token, readable only by the runners' user.
env_file="$home/.config/yallapp-runner.env"
install -d -o "$USER_NAME" -g "$USER_NAME" -m 0700 "$home/.config"
if [ -z "${RUNNER_TOKEN:-}" ] && [ ! -f "$env_file" ]; then
	read -rsp "Registration token: " RUNNER_TOKEN
	echo
fi
if [ -n "${RUNNER_TOKEN:-}" ]; then
	umask 077
	printf 'RUNNER_TOKEN=%s\nRUNNER_URL=%s\n' "$RUNNER_TOKEN" "$RUNNER_URL" >"$env_file"
	chown "$USER_NAME:$USER_NAME" "$env_file"
fi

# One systemd service per runner (Podman Quadlet).
units="$home/.config/containers/systemd"
install -d -o "$USER_NAME" -g "$USER_NAME" "$home/.config/containers" "$units"
for file in "$units"/yallapp-runner-*.container; do
	[ -e "$file" ] || continue
	n="${file##*-}"
	n="${n%.container}"
	if [ "$n" -gt "$RUNNERS" ]; then
		as_user systemctl --user stop "yallapp-runner-$n.service" || true
		rm -f "$file"
	fi
done
host="$(hostname -s)"
for n in $(seq 1 "$RUNNERS"); do
	cat >"$units/yallapp-runner-$n.container" <<EOF
[Unit]
Description=Yallapp GitHub Actions runner $n

[Container]
Image=localhost/yallapp-runner
ContainerName=yallapp-runner-$n
HostName=$host-runner-$n
EnvironmentFile=$env_file
Environment=RUNNER_NAME=$host-runner-$n
Volume=yallapp-runner-$n-home:/home/runner
Volume=yallapp-runner-$n-tools:/opt/hostedtoolcache
PodmanArgs=--init --shm-size=2g --cpus=$CPUS --memory=$MEMORY

[Service]
Restart=always
RestartSec=30
TimeoutStartSec=300

[Install]
WantedBy=default.target
EOF
	chown "$USER_NAME:$USER_NAME" "$units/yallapp-runner-$n.container"
done

as_user systemctl --user daemon-reload
for n in $(seq 1 "$RUNNERS"); do
	as_user systemctl --user restart "yallapp-runner-$n.service"
done

echo
echo "$RUNNERS runner(s) started. They show as Idle in the repository's Settings > Actions > Runners within a minute."
echo "Logs: journalctl --user-unit yallapp-runner-1 -f"
