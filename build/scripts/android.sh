#!/usr/bin/env bash
# Builds, signs and stores one client's Android app.
#
# Usage: build/scripts/android.sh <build-id> <out-dir>
# Needs: PLATFORM_API_URL, BUILD_PIPELINE_TOKEN, FILES_* (see upload.sh), Flutter and Java 17.
# Writes <out-dir>/result.json: {"stages": {...}, "artifacts": [...], "message": ...}.
set -euo pipefail

BUILD_ID=$1
OUT=$(mkdir -p "$2" && cd "$2" && pwd)
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPTS="$ROOT/build/scripts"
MOBILE="$ROOT/mobile"
WORK=$(mktemp -d)
# 87.2 Everything the build prints, to tell the client why it failed (diagnose.py).
LOG="$OUT/build.log"
exec > >(tee -a "$LOG") 2>&1
finish() {
	local status=$?
	rm -rf "$WORK"
	if [ "$status" -ne 0 ]; then
		python3 "$SCRIPTS/diagnose.py" "$LOG" android > "$OUT/failure.json" 2>/dev/null && add_failure "$OUT/failure.json" || true
	fi
}
trap finish EXIT

platform() { python3 "$SCRIPTS/platform.py" "$@"; }
result() { # stages-json artifacts-json message
	python3 - "$OUT/result.json" "$1" "$2" "$3" <<'PY'
import json, sys
path, stages, artifacts, message = sys.argv[1:]
json.dump({"stages": json.loads(stages), "artifacts": json.loads(artifacts), "message": message or None}, open(path, "w"))
PY
}
# 87.2 Adds why it failed (diagnose.py's output) to result.json.
add_failure() {
	python3 - "$OUT/result.json" "$1" <<'PY'
import json, sys
result, failure = sys.argv[1:]
data = json.load(open(result))
data["failure"] = json.load(open(failure))
json.dump(data, open(result, "w"))
PY
}
result '{"android":"failed"}' '[]' "The Android app couldn't be built."

platform status "$BUILD_ID" '{"stages":{"android":"running"}}'
platform config "$BUILD_ID" "$WORK/config.json"
platform secrets "$BUILD_ID" "$WORK/secrets.json"

# App identity, colors, version and Firebase files from the build config.
(cd "$MOBILE" && dart run tool/apply_config.dart "$WORK/config.json")

ICON_URL=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["branding"].get("icon_url",""))' "$WORK/config.json")
if [ -n "$ICON_URL" ]; then
	curl -fsSL --retry 3 -o "$WORK/icon.png" "$ICON_URL"
	python3 "$SCRIPTS/make_icons.py" "$WORK/icon.png" "$MOBILE"
fi

# Upload key: reuse the saved one, or create it on the app's first build and save it
# before anything is built with it, so the platform always holds the key in use.
KEYSTORE="$WORK/upload-keystore.jks"
python3 - "$WORK/secrets.json" "$WORK/key.json" <<'PY'
import json, sys
key = json.load(open(sys.argv[1]))["android_upload_key"]
json.dump(key, open(sys.argv[2], "w")) if key else None
PY
if [ -f "$WORK/key.json" ]; then
	python3 -c 'import base64,json,sys; open(sys.argv[2],"wb").write(base64.b64decode(json.load(open(sys.argv[1]))["keystore_base64"]))' "$WORK/key.json" "$KEYSTORE"
else
	STORE_PASSWORD=$(openssl rand -hex 24)
	APP_NAME=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["app_name"].replace(",", " "))' "$WORK/config.json")
	keytool -genkeypair -noprompt -storetype PKCS12 -keystore "$KEYSTORE" -alias upload \
		-keyalg RSA -keysize 4096 -validity 10000 \
		-storepass "$STORE_PASSWORD" -keypass "$STORE_PASSWORD" \
		-dname "CN=$APP_NAME, O=$APP_NAME" >/dev/null
	python3 - "$KEYSTORE" "$STORE_PASSWORD" "$WORK/key.json" <<'PY'
import base64, json, sys
keystore, password, out = sys.argv[1:]
json.dump({"keystore_base64": base64.b64encode(open(keystore, "rb").read()).decode(),
           "store_password": password, "key_alias": "upload", "key_password": password}, open(out, "w"))
PY
	python3 -c 'import json,sys; print(json.dumps({"android_upload_key": json.load(open(sys.argv[1]))}))' "$WORK/key.json" > "$WORK/signing.json"
	platform signing "$BUILD_ID" "$WORK/signing.json"
fi
PASSWORD=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["store_password"])' "$WORK/key.json")
KEY_PASSWORD=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["key_password"])' "$WORK/key.json")
ALIAS=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["key_alias"])' "$WORK/key.json")
if [ -n "${GITHUB_ACTIONS:-}" ]; then
	echo "::add-mask::$PASSWORD"
	echo "::add-mask::$KEY_PASSWORD"
fi
# 46 The upload key's SHA-256 fingerprint, for the link files (App Links). Never fails the build.
UPLOAD_SHA256=$(keytool -exportcert -keystore "$KEYSTORE" -storepass "$PASSWORD" -alias "$ALIAS" 2>/dev/null | python3 "$SCRIPTS/fingerprint.py" || true)
if [ -n "$UPLOAD_SHA256" ]; then
	platform status "$BUILD_ID" "{\"signing\":{\"android_upload_sha256\":\"$UPLOAD_SHA256\"}}" || true
fi
cat > "$MOBILE/android/key.properties" <<PROPS
storeFile=$KEYSTORE
storePassword=$PASSWORD
keyAlias=$ALIAS
keyPassword=$KEY_PASSWORD
PROPS

(cd "$MOBILE" && flutter build apk --release && flutter build appbundle --release)
rm -f "$MOBILE/android/key.properties"

APK="$MOBILE/build/app/outputs/flutter-apk/app-release.apk"
AAB="$MOBILE/build/app/outputs/bundle/release/app-release.aab"

# The upload key for the client (Starter uploads to Google Play themselves).
mkdir -p "$WORK/key"
cp "$KEYSTORE" "$WORK/key/upload-keystore.jks"
cat > "$WORK/key/README.txt" <<TXT
Your app's Android upload key. Keep this file and these details safe and private.
Google Play needs them for every update you upload yourself.

Keystore:       upload-keystore.jks
Keystore type:  PKCS12
Key alias:      $ALIAS
Store password: $PASSWORD
Key password:   $KEY_PASSWORD
TXT
(cd "$WORK/key" && zip -q -X "$WORK/android-upload-key.zip" upload-keystore.jks README.txt)

# Store icons, feature graphic, the client's screenshots and the listing texts.
FILES=(apk "$APK" aab "$AAB" keystore "$WORK/android-upload-key.zip")
if [ -f "$WORK/icon.png" ]; then
	platform store "$BUILD_ID" "$WORK/store.json"
	python3 "$SCRIPTS/store_assets.py" "$WORK/config.json" "$WORK/store.json" "$WORK/icon.png" "$WORK/store-assets.zip"
	FILES+=(store_assets "$WORK/store-assets.zip")
fi

ARTIFACTS=$("$SCRIPTS/upload.sh" "$BUILD_ID" "${FILES[@]}")

PLAY=skipped
MESSAGE=""
AUTO_PUBLISH=${AUTO_PUBLISH:-false}
HAS_PLAY=$(python3 -c 'import json,sys; print("yes" if json.load(open(sys.argv[1]))["google_play"] else "no")' "$WORK/secrets.json")
if [ "$AUTO_PUBLISH" = "true" ] && [ "$HAS_PLAY" = "yes" ]; then
	platform status "$BUILD_ID" '{"stages":{"android":"done","upload_play":"running"}}'
	python3 -c 'import json,sys; open(sys.argv[2],"w").write(json.load(open(sys.argv[1]))["google_play"]["service_account_json"])' "$WORK/secrets.json" "$WORK/play.json"
	PACKAGE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["android_package"])' "$WORK/config.json")
	if (cd "$ROOT/build" && bundle exec fastlane android upload_play aab:"$AAB" package:"$PACKAGE" json_key:"$WORK/play.json"); then
		PLAY="done"
	else
		PLAY=failed
		MESSAGE="Your Android app is ready, but the upload to Google Play didn't work. Google Play needs the first version uploaded by hand in Play Console; after that, uploads are automatic. Download the App Bundle below and see the Google Play guide."
	fi
fi

# 35, 36 Samsung Galaxy Store and Huawei AppGallery: the APK (signed with the upload key),
# only on plans with "We publish for you" and with the client's keys (the secrets send
# null otherwise). The first version of each is published by hand. 42 Xiaomi GetApps
# the same way, with the build config, the 512 px icon and the store listing too.
store_upload() { # stage script secrets-key failure-message [more script arguments]
	local stage=$1 script=$2 key=$3 failure=$4 has
	shift 4
	has=$(python3 -c 'import json,sys; print("yes" if json.load(open(sys.argv[1])).get(sys.argv[2]) else "no")' "$WORK/secrets.json" "$key")
	if [ "$AUTO_PUBLISH" != "true" ] || [ "$has" != "yes" ]; then
		echo skipped
		return
	fi
	platform status "$BUILD_ID" "{\"stages\":{\"$stage\":\"running\"}}" >&2
	if python3 "$SCRIPTS/$script" "$WORK/secrets.json" "$APK" "$@" >&2; then
		echo "done"
	else
		MESSAGE="${MESSAGE:+$MESSAGE }$failure"
		echo failed
	fi
}
GALAXY_FAILED="The upload to Samsung Galaxy Store didn't work. Galaxy Store needs the first version published by hand in Seller Portal, and no other update in review; download the APK below and see the Galaxy Store guide."
APPGALLERY_FAILED="The upload to Huawei AppGallery didn't work. AppGallery needs the first version submitted by hand in AppGallery Connect; download the APK below and see the AppGallery guide."
# Run in this shell (not in $(...)) so a failure's message is kept.
store_upload upload_galaxy galaxy_store.py galaxy_store "$GALAXY_FAILED" > "$WORK/galaxy.stage"
GALAXY=$(cat "$WORK/galaxy.stage")
store_upload upload_appgallery appgallery.py huawei_appgallery "$APPGALLERY_FAILED" > "$WORK/appgallery.stage"
APPGALLERY=$(cat "$WORK/appgallery.stage")
# 42 Xiaomi wants the icon with every update: the 512 px one from the store assets.
XIAOMI_ICON="$WORK/xiaomi-icon.png"
if [ -f "$WORK/store-assets.zip" ]; then
	python3 -c 'import sys,zipfile; open(sys.argv[2],"wb").write(zipfile.ZipFile(sys.argv[1]).read("google-play/icon-512.png"))' "$WORK/store-assets.zip" "$XIAOMI_ICON" || rm -f "$XIAOMI_ICON"
fi
XIAOMI_FAILED="The upload to Xiaomi GetApps didn't work. Xiaomi GetApps needs the first version submitted by hand in Xiaomi's developer console, and no other update in review; download the APK below and see the Xiaomi GetApps guide."
store_upload upload_xiaomi xiaomi_getapps.py xiaomi_getapps "$XIAOMI_FAILED" "$WORK/config.json" "$XIAOMI_ICON" "$WORK/store.json" > "$WORK/xiaomi.stage"
XIAOMI=$(cat "$WORK/xiaomi.stage")

STAGES="{\"android\":\"done\",\"upload_play\":\"$PLAY\",\"upload_galaxy\":\"$GALAXY\",\"upload_appgallery\":\"$APPGALLERY\",\"upload_xiaomi\":\"$XIAOMI\"}"
result "$STAGES" "$ARTIFACTS" "$MESSAGE"
# 87.2 A store upload that didn't work, explained from its output.
for stage in upload_play:$PLAY upload_galaxy:$GALAXY upload_appgallery:$APPGALLERY upload_xiaomi:$XIAOMI; do
	if [ "${stage#*:}" = "failed" ]; then
		python3 "$SCRIPTS/diagnose.py" "$LOG" "${stage%%:*}" > "$OUT/failure.json" && add_failure "$OUT/failure.json" || true
		break
	fi
done
platform status "$BUILD_ID" "{\"stages\":$STAGES}"
