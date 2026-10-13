# A GitHub Actions runner for Yallapp's Linux jobs, close to GitHub's
# ubuntu-24.04 runners so the workflows run unchanged. See build/README.md.
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

COPY --chmod=0755 entrypoint.sh /usr/local/bin/entrypoint.sh
USER runner
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
