#!/usr/bin/env bash
# Prints an index of a plugin's PHP code: files, then each class with its public
# methods and their parameters. Used to write adapters for plugins this machine
# can't download (CI can).
#
# Usage: [SHOW=<regex>] tests/dev-site/describe-source.sh <plugin-dir> [path-pattern...]
#        Patterns (grep -E on the file path) limit the method index; the file
#        list always covers the whole plugin. SHOW prints, with line numbers,
#        every file whose content matches the regex (grep -E).
set -euo pipefail

DIR=${1:?usage: describe-source.sh <plugin-dir> [path-pattern...]}
shift
cd "$DIR"
echo "== files"
find . -name '*.php' -not -path '*/vendor/*' -not -path '*/node_modules/*' | sort | sed 's#^\./##'
echo "== methods"
PATTERN=$(IFS='|'; echo "${*:-.}")
find . -name '*.php' -not -path '*/vendor/*' -not -path '*/node_modules/*' | sort | grep -E "$PATTERN" | while read -r file; do
	lines=$(grep -nE '^\s*(abstract |final )?(class|interface|trait) [A-Za-z_]|^\s*(public )?(static )?function [a-zA-Z_]+\(|^\s*namespace ' "$file" | grep -vE 'private |protected ' || true)
	if [ -n "$lines" ]; then
		echo "-- ${file#./}"
		echo "$lines" | sed -E 's/\{\s*$//; s/^[0-9]+:\s*/  /'
	fi
done
if [ -n "${SHOW:-}" ]; then
	grep -rlE --include='*.php' --exclude-dir=vendor --exclude-dir=node_modules "$SHOW" . | sort | while read -r file; do
		echo "== show ${file#./}"
		cat -n "$file"
	done
fi
