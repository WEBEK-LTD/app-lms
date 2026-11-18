#!/usr/bin/env bash
# Writes the template guard's fixtures (roadmap 166): every Studio template's
# Home and the pages its tabs open, as the platform's hosted API serves them
# in English and Arabic, for test/widget/template_guard_test.dart to draw
# through the app's own renderer (test/support/template_guard/<template>.json).
#
#   tool/template_guard_fixtures.sh           write the fixtures from the platform
#   tool/template_guard_fixtures.sh --check   fail when the committed fixtures
#                                             differ from what the platform
#                                             serves now (CI)
#
# Needs the platform's packages (npm ci in platform/web). The platform makes
# the pages exactly as an owner's project gets them (lib/studio/new-project.ts)
# and serves them as GET /pages does; tests/unit/template-guard-fixtures.test.ts
# writes them, or compares them with the committed ones.
set -euo pipefail

cd "$(dirname "$0")/../../platform/web"

if [ "${1:-}" = "--check" ]; then
  if ! npx vitest run tests/unit/template-guard-fixtures.test.ts; then
    echo "The template guard's fixtures in mobile/test/support/template_guard are out of date." >&2
    echo "Run mobile/tool/template_guard_fixtures.sh and commit the result." >&2
    exit 1
  fi
  echo "The template guard's fixtures are up to date."
  exit 0
fi

YALLAPP_WRITE_GUARD=1 npx vitest run tests/unit/template-guard-fixtures.test.ts
echo "Wrote $(find ../../mobile/test/support/template_guard -name '*.json' | wc -l) fixtures to mobile/test/support/template_guard."
