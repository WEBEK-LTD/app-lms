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
trap 'rm -rf "$WORK"' EXIT

platform() { python3 "$SCRIPTS/platform.py" "$@"; }
result() { # stages-json artifacts-json message
	python3 - "$OUT/result.json" "$1" "$2" "$3" <<'PY'
import json, sys
path, stages, artifacts, message = sys.argv[1:]
json.dump({"stages": json.loads(stages), "artifacts": json.loads(artifacts), "message": message or None}, open(path, "w"))
PY
}
result '{"android":"failed"}' '[]' "The Android build failed. We'll look into it and start it again."

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

ARTIFACTS=$("$SCRIPTS/upload.sh" "$BUILD_ID" apk "$APK" aab "$AAB" keystore "$WORK/android-upload-key.zip")

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
		MESSAGE="Your Android app is ready, but the Google Play upload failed. Google Play needs the first version uploaded by hand in Play Console; after that, uploads are automatic. Check the guide, then start a new build."
	fi
fi

result "{\"android\":\"done\",\"upload_play\":\"$PLAY\"}" "$ARTIFACTS" "$MESSAGE"
platform status "$BUILD_ID" "{\"stages\":{\"android\":\"done\",\"upload_play\":\"$PLAY\"}}"
