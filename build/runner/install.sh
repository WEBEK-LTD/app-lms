#!/usr/bin/env bash
# Installs Yallapp's GitHub Actions runners on an AlmaLinux 9 server, with or
# without cPanel and CloudLinux. Each runner is a Podman container run by a
# system service (yallapp-runner-N) and capped in CPU and memory, so the sites
# on the server keep their share. Nothing is added to cPanel accounts.
#
# The containers run under root's Podman: CloudLinux turns user namespaces
# off for everyone (user.max_user_namespaces = 0), which rootless containers
# need, and turning them on would widen what every hosting account can reach.
# Jobs run as an ordinary user inside their container, with sudo there only.
#
# A single file, so it can be pasted on the server. Run as root (WHM >
# Server Configuration > Terminal works):
#   RUNNERS=2 CPUS=2 MEMORY=4g bash install.sh
# It asks for a registration token from the repository's Settings > Actions >
# Runners > New self-hosted runner (or reads RUNNER_TOKEN); the token is only
# needed while runners register. Running the script again rebuilds the image
# and restarts the runners.
set -euo pipefail

RUNNERS="${RUNNERS:-2}"
CPUS="${CPUS:-2}"
MEMORY="${MEMORY:-4g}"
RUNNER_URL="${RUNNER_URL:-https://github.com/WEBEK-LTD/app-lms}"
DATA_DIR=/var/lib/yallapp-runner
IMAGE_DIR="$DATA_DIR/image"
ENV_FILE="$DATA_DIR/runner.env"

fail() {
	echo "$1" >&2
	exit 1
}

[ "$(id -u)" = 0 ] || fail "Run as root."
[ "$(uname -m)" = x86_64 ] || fail "This needs an x86_64 server: Android's build tools only run there."
case "$RUNNERS" in '' | *[!0-9]* | 0) fail "RUNNERS must be a number from 1." ;; esac
case "$CPUS" in '' | *[!0-9]* | 0) fail "CPUS must be a whole number from 1." ;; esac
case "$MEMORY" in [0-9]*[gGmM]) ;; *) fail "MEMORY must look like 4g or 4096m." ;; esac

# The token first, so nobody has to wait for the build to give it.
if [ -z "${RUNNER_TOKEN:-}" ]; then
	read -rsp "Registration token (Enter to keep the saved one): " RUNNER_TOKEN
	echo
fi

dnf install -y podman

# Undoes earlier versions of this script, which ran rootless containers as a
# "ghrunner" user.
for file in /etc/systemd/system/yallapp-runner-*.service; do
	[ -e "$file" ] || continue
	if grep -q '^User=ghrunner$' "$file"; then
		systemctl disable --now "$(basename "$file")" || true
		rm -f "$file"
	fi
done
rm -f /etc/systemd/system/user@.service.d/yallapp-delegate.conf /etc/tmpfiles.d/yallapp-runner.conf
if id ghrunner >/dev/null 2>&1 && [ "$(getent passwd ghrunner | cut -d: -f6)" = /var/lib/ghrunner ]; then
	loginctl disable-linger ghrunner 2>/dev/null || true
	userdel --remove ghrunner 2>/dev/null || true
fi

install -d -m 0700 "$DATA_DIR" "$IMAGE_DIR"

# The image, close to GitHub's ubuntu-24.04 runners so the workflows run
# unchanged.
cat >"$IMAGE_DIR/Dockerfile" <<'DOCKERFILE'
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
cat >"$IMAGE_DIR/entrypoint.sh" <<'ENTRYPOINT'
#!/usr/bin/env bash
# Registers the runner on its first start (the registration lives in the
# runner's volume), then waits for jobs.
set -euo pipefail

cd /home/runner/actions-runner

if [ ! -f .runner ]; then
	if [ -z "${RUNNER_TOKEN:-}" ]; then
		echo "No registration token. Run the install script again and give it a new token from the repository's Settings > Actions > Runners > New self-hosted runner." >&2
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
podman build --pull=newer -t localhost/yallapp-runner "$IMAGE_DIR"

# The registration token, readable only by root.
if [ -n "$RUNNER_TOKEN" ]; then
	(
		umask 077
		printf 'RUNNER_TOKEN=%s\nRUNNER_URL=%s\n' "$RUNNER_TOKEN" "$RUNNER_URL" >"$ENV_FILE"
	)
fi
[ -f "$ENV_FILE" ] || fail "No registration token given."

# One system service per runner.
for file in /etc/systemd/system/yallapp-runner-*.service; do
	[ -e "$file" ] || continue
	n="${file##*-}"
	n="${n%.service}"
	if [ "$n" -gt "$RUNNERS" ]; then
		systemctl disable --now "yallapp-runner-$n.service" || true
		rm -f "$file"
	fi
done
host="$(hostname -s)"
for n in $(seq 1 "$RUNNERS"); do
	cat >"/etc/systemd/system/yallapp-runner-$n.service" <<UNIT
[Unit]
Description=Yallapp GitHub Actions runner $n
Wants=network-online.target
After=network-online.target

[Service]
ExecStartPre=-/usr/bin/podman rm --force --ignore yallapp-runner-$n
ExecStart=/usr/bin/podman run --rm --name yallapp-runner-$n --hostname $host-runner-$n --init --shm-size=2g --cpus=$CPUS --memory=$MEMORY --pids-limit=8192 --env-file $ENV_FILE --env RUNNER_NAME=$host-runner-$n --volume yallapp-runner-$n-home:/home/runner --volume yallapp-runner-$n-tools:/opt/hostedtoolcache localhost/yallapp-runner
ExecStop=/usr/bin/podman stop --ignore --time 30 yallapp-runner-$n
Restart=always
RestartSec=30
TimeoutStartSec=300
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
UNIT
done

systemctl daemon-reload
for n in $(seq 1 "$RUNNERS"); do
	systemctl enable "yallapp-runner-$n.service" >/dev/null 2>&1
	systemctl restart "yallapp-runner-$n.service"
done

echo
echo "$RUNNERS runner(s) started. They show as Idle in the repository's Settings > Actions > Runners within a minute."
echo "Status: systemctl status yallapp-runner-1    Logs: journalctl -u yallapp-runner-1 -f"
