#!/usr/bin/env bash
# Builds, signs and stores one client's iOS app. Runs on macOS.
#
# Usage: build/scripts/ios.sh <build-id> <out-dir>
# Needs: PLATFORM_API_URL, BUILD_PIPELINE_TOKEN, FILES_* (see upload.sh), Flutter, Xcode, Bundler.
# Writes <out-dir>/result.json like android.sh.
set -euo pipefail

BUILD_ID=$1
OUT=$(mkdir -p "$2" && cd "$2" && pwd)
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPTS="$ROOT/build/scripts"
MOBILE="$ROOT/mobile"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

platform() { python3 "$SCRIPTS/platform.py" "$@"; }
result() {
	python3 - "$OUT/result.json" "$1" "$2" "$3" <<'PY'
import json, sys
path, stages, artifacts, message = sys.argv[1:]
json.dump({"stages": json.loads(stages), "artifacts": json.loads(artifacts), "message": message or None}, open(path, "w"))
PY
}
result '{"ios":"failed"}' '[]' "The iOS app couldn't be built."

platform secrets "$BUILD_ID" "$WORK/secrets.json"
HAS_ASC=$(python3 -c 'import json,sys; print("yes" if json.load(open(sys.argv[1]))["app_store_connect"] else "no")' "$WORK/secrets.json")
if [ "$HAS_ASC" != "yes" ]; then
	result '{"ios":"skipped","upload_testflight":"skipped"}' '[]' "No iOS app in this build: add your App Store Connect key in App setup › Publishing, on a plan with the iOS app."
	platform status "$BUILD_ID" '{"stages":{"ios":"skipped","upload_testflight":"skipped"}}'
	exit 0
fi

# The key as fastlane's OpenSSL reads it; a key it can't read gets a plain message, not a stack trace.
if ! python3 "$SCRIPTS/p8_key.py" "$WORK/secrets.json"; then
	result '{"ios":"failed"}' '[]' "Your App Store Connect key can't be read. Download the .p8 file again from App Store Connect › Users and Access › Integrations, and upload it in App setup › Publishing."
	exit 1
fi

platform status "$BUILD_ID" '{"stages":{"ios":"running"}}'
platform config "$BUILD_ID" "$WORK/config.json"
(cd "$MOBILE" && dart run tool/apply_config.dart "$WORK/config.json")

ICON_URL=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["branding"].get("icon_url",""))' "$WORK/config.json")
if [ -n "$ICON_URL" ]; then
	curl -fsSL --retry 3 -o "$WORK/icon.png" "$ICON_URL"
	python3 "$SCRIPTS/make_icons.py" "$WORK/icon.png" "$MOBILE"
fi

BUNDLE_ID=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["ios_bundle_id"])' "$WORK/config.json")

# Generates the iOS project settings and installs packages, without building. Signing
# happens later in fastlane, so Flutter must not look for a certificate here.
(cd "$MOBILE" && flutter build ios --release --config-only --no-codesign)

mkdir -p "$WORK/ipa"
(cd "$ROOT/build" && bundle exec fastlane ios build_ipa \
	secrets:"$WORK/secrets.json" config:"$WORK/config.json" \
	mobile:"$MOBILE" out:"$WORK/ipa" signing_out:"$WORK/signing.json")
if [ -f "$WORK/signing.json" ]; then
	platform signing "$BUILD_ID" "$WORK/signing.json"
	rm -f "$WORK/signing.json"
fi

IPA="$WORK/ipa/app.ipa"
SAFE_NAME=$(python3 -c 'import json,re,sys; print(re.sub(r"[^A-Za-z0-9]+", "-", json.load(open(sys.argv[1]))["short_name"]).strip("-") or "app")' "$WORK/config.json")
mv "$IPA" "$WORK/ipa/$SAFE_NAME.ipa"
ARTIFACTS=$("$SCRIPTS/upload.sh" "$BUILD_ID" ipa "$WORK/ipa/$SAFE_NAME.ipa")

TESTFLIGHT=skipped
MESSAGE=""
if [ "${AUTO_PUBLISH:-false}" = "true" ]; then
	platform status "$BUILD_ID" '{"stages":{"ios":"done","upload_testflight":"running"}}'
	if (cd "$ROOT/build" && bundle exec fastlane ios upload_testflight secrets:"$WORK/secrets.json" ipa:"$WORK/ipa/$SAFE_NAME.ipa"); then
		TESTFLIGHT="done"
	else
		TESTFLIGHT=failed
		MESSAGE="Your iOS app is ready, but the upload to TestFlight didn't work. Create the app in App Store Connect with the bundle ID $BUNDLE_ID first (see the App Store guide), then start a new build."
	fi
fi

result "{\"ios\":\"done\",\"upload_testflight\":\"$TESTFLIGHT\"}" "$ARTIFACTS" "$MESSAGE"
platform status "$BUILD_ID" "{\"stages\":{\"ios\":\"done\",\"upload_testflight\":\"$TESTFLIGHT\"}}"
