#!/usr/bin/env bash
# Registers the runner on its first start (the registration lives in the
# runner's volume), then waits for jobs.
set -euo pipefail

cd /home/runner/actions-runner

if [ ! -f .runner ]; then
	if [ -z "${RUNNER_TOKEN:-}" ]; then
		echo "Set RUNNER_TOKEN in .env to a registration token from GitHub: the repository's Settings > Actions > Runners > New self-hosted runner." >&2
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
