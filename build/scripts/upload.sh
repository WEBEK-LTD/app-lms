#!/usr/bin/env bash
# Uploads build files to the files host (files.yallapp.com.tr) over FTPS and prints
# their Artifact list (docs/api/pipeline.yaml) as JSON.
#
# Usage: build/scripts/upload.sh <build-id> <kind> <file> [<kind> <file> ...]
# Needs: FILES_FTP_URL      ftps://host.webek.org/  (the FTP account's root is the storage folder)
#        FILES_FTP_USER, FILES_FTP_PASSWORD
#        FILES_BASE_URL     https://files.yallapp.com.tr
set -euo pipefail

BUILD_ID=$1
shift
[[ $BUILD_ID =~ ^[0-9a-f-]{36}$ ]] || { echo "Invalid build id" >&2; exit 1; }
BASE=${FILES_BASE_URL%/}
FTP=${FILES_FTP_URL%/}
ITEMS=()
while [ $# -ge 2 ]; do
	KIND=$1
	FILE=$2
	shift 2
	NAME=$(basename "$FILE")
	curl -fsS --ssl-reqd --retry 3 --ftp-create-dirs \
		--user "$FILES_FTP_USER:$FILES_FTP_PASSWORD" \
		-T "$FILE" "$FTP/builds/$BUILD_ID/$NAME" >&2
	SIZE=$(wc -c < "$FILE" | tr -d ' ')
	SHA=$( (sha256sum "$FILE" 2>/dev/null || shasum -a 256 "$FILE") | cut -d' ' -f1)
	ITEMS+=("{\"kind\":\"$KIND\",\"url\":\"$BASE/builds/$BUILD_ID/$NAME\",\"size\":$SIZE,\"sha256\":\"$SHA\"}")
done
(IFS=,; echo "[${ITEMS[*]}]")
