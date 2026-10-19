#!/usr/bin/env python3
"""Uploads an Android build to Xiaomi GetApps and submits it (roadmap 42).

Usage: xiaomi_getapps.py <secrets.json> <app.apk> <config.json> <icon.png> [<store.json>]

Uses the automatic publishing API of the Xiaomi developer platform
(https://api.developer.xiaomi.com/devupload) with the client's keys from the
build's secrets (`xiaomi_getapps` in docs/api/pipeline.yaml):

  1. /dev/query: the app (by package name) must already be on the store under
     this developer account, Xiaomi must allow a new version, and the version
     on the store must be older than this build. The first version is
     submitted by hand in the developer console.
  2. /dev/push: one multipart request with RequestData (the account, the
     update type 1, "a new package", and appInfo: the name already on the
     store, the package name, the release notes and the privacy policy
     link), the APK and the app's 512 px icon. Xiaomi submits it for review
     at once; there is no upload-only step and no sandbox.

Every request carries SIG: the MD5 of RequestData and of each file, with the
account's API private key ("password"), as JSON, encrypted with Xiaomi's
public certificate (RSA, PKCS#1 v1.5, in blocks of the key size less 11
bytes) and written as hex. openssl encrypts (the standard library can't).
Xiaomi gets the APK, signed with the app's upload key; its API has no field
for an App Bundle.

The documentation (dev.mi.com, in Chinese) couldn't be fetched from here: the
request shape follows three independent clients of the same API. What's left
to confirm with a real account is in docs/ROADMAP.md (42.7).

Secrets never reach the output: errors name the step and Xiaomi's result code
only. A push is never sent twice: when its answer is lost the update may have
arrived, so the console is checked first. XIAOMI_API_URL overrides the address
(tests); XIAOMI_QUERY_WAITS (seconds, comma separated) how long the query
waits when Xiaomi says it is asked too often.
"""
import hashlib
import json
import os
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

API = os.environ.get("XIAOMI_API_URL", "https://api.developer.xiaomi.com/devupload").rstrip("/")
QUERY_WAITS = [float(w) for w in os.environ.get("XIAOMI_QUERY_WAITS", "3,10").split(",") if w.strip()]

# Xiaomi's result codes, as the clients we followed name them (42.7: confirm).
TOO_OFTEN = -20035
HINTS = {
    -7: "The app belongs to another Xiaomi developer account.",
    -20014: "Xiaomi refused the API private key. Check the email and the key saved in the dashboard (resetting the key in Xiaomi's console makes the old one stop working).",
    -20002: "Xiaomi couldn't read the signature. Check the public certificate saved in the dashboard.",
    -20030: "Xiaomi couldn't read the signature. Check the public certificate saved in the dashboard.",
    -92: "Xiaomi refused the APK: its version must be newer than the one on the store, signed with the same key.",
    TOO_OFTEN: "Xiaomi says it was asked too often. The next build tries again.",
}


class StoreError(Exception):
    """A step that didn't work, in words safe to log."""


def md5_hex(data):
    # Not for security: Xiaomi's signature lists each part's MD5.
    return hashlib.md5(data, usedforsecurity=False).hexdigest()


def md5_file(path):
    digest = hashlib.md5(usedforsecurity=False)
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def encrypt(message, certificate):
    """RSA PKCS#1 v1.5 with the certificate's public key, block by block, as hex."""
    with tempfile.TemporaryDirectory() as tmp:
        cert_path = os.path.join(tmp, "xiaomi.pem")
        with open(cert_path, "w") as handle:
            handle.write(certificate.strip() + "\n")
        modulus = subprocess.run(["openssl", "x509", "-in", cert_path, "-noout", "-modulus"], capture_output=True, text=True, check=False)
        if modulus.returncode != 0 or "=" not in modulus.stdout:
            raise StoreError("Xiaomi GetApps: the public certificate saved in the dashboard can't be read. Upload it again from Xiaomi's console.")
        block = (int(modulus.stdout.split("=", 1)[1].strip(), 16).bit_length() + 7) // 8 - 11
        out = []
        for start in range(0, len(message), block):
            result = subprocess.run(
                ["openssl", "pkeyutl", "-encrypt", "-certin", "-inkey", cert_path, "-pkeyopt", "rsa_padding_mode:pkcs1"],
                input=message[start : start + block],
                capture_output=True,
                check=False,
            )
            if result.returncode != 0:
                raise StoreError("Xiaomi GetApps: the public certificate saved in the dashboard couldn't encrypt the signature.")
            out.append(result.stdout)
    return b"".join(out).hex()


def signature(request_data, password, certificate, files=()):
    """SIG: the parts' MD5s and the API private key, encrypted with Xiaomi's certificate."""
    parts = [{"name": "RequestData", "hash": md5_hex(request_data.encode())}]
    parts += [{"name": name, "hash": md5_file(path)} for name, path in files]
    plain = json.dumps({"sig": parts, "password": password}, separators=(",", ":")).encode()
    return encrypt(plain, certificate)


def multipart(fields, files=()):
    # Not uuid: on some Pythons it imports `platform`, which this folder's platform.py shadows in the tests.
    boundary = secrets.token_hex(16)
    parts = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'.encode() + value.encode() + b"\r\n")
    for name, path, content_type in files:
        with open(path, "rb") as handle:
            content = handle.read()
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{os.path.basename(path)}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n".encode()
            + content
            + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def post(path, fields, files, step):
    """A multipart POST; returns Xiaomi's JSON answer (a dict)."""
    body, content_type = multipart(fields, files)
    req = urllib.request.Request(
        f"{API}{path}",
        data=body,
        method="POST",
        headers={"Accept": "application/json", "User-Agent": "yallapp-build-pipeline", "Content-Type": content_type},
    )
    try:
        with urllib.request.urlopen(req, timeout=900) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        raise StoreError(f"Xiaomi GetApps: {step} failed (HTTP {error.code}).") from None
    except (urllib.error.URLError, OSError) as error:
        reason = getattr(error, "reason", None) or type(error).__name__
        if path == "/dev/push":
            raise StoreError(f"Xiaomi GetApps: {step} got no answer ({reason}). The update may have arrived: check Xiaomi's console before uploading it by hand.") from None
        raise StoreError(f"Xiaomi GetApps: {step} failed ({reason}).") from None
    try:
        answer = json.loads(raw)
    except ValueError:
        answer = None
    if not isinstance(answer, dict) or not isinstance(answer.get("result"), int):
        raise StoreError(f"Xiaomi GetApps: {step} failed (an answer without a result).")
    return answer


def failed(step, result):
    hint = HINTS.get(result)
    return StoreError(f"Xiaomi GetApps: {step} failed (result {result}).{' ' + hint if hint else ''}")


def query(credentials, package, sleep=time.sleep):
    """The app's details on the store (packageInfo and updateVersion), asking again while Xiaomi says it's asked too often."""
    request_data = json.dumps({"packageName": package, "userName": credentials["user_name"]}, separators=(",", ":"))
    for attempt in range(len(QUERY_WAITS) + 1):
        if attempt:
            sleep(QUERY_WAITS[attempt - 1])
        sig = signature(request_data, credentials["password"], credentials["public_certificate"])
        answer = post("/dev/query", {"RequestData": request_data, "SIG": sig}, (), "reading the app")
        if answer["result"] != TOO_OFTEN:
            break
    if answer["result"] != 0:
        raise failed("reading the app", answer["result"])
    return answer


def publish(credentials, apk, config, icon, listing=None, sleep=time.sleep):
    """Checks the app on the store, then uploads and submits the APK. Returns the package name."""
    package = config["android_package"]
    if not icon or not os.path.isfile(icon):
        raise StoreError("Xiaomi GetApps: no icon to send. Xiaomi needs the app's icon with every update: add it in App setup › Branding.")
    answer = query(credentials, package, sleep)
    info = answer.get("packageInfo")
    if not isinstance(info, dict) or info.get("packageName") != package:
        raise StoreError(
            f"Xiaomi GetApps: {package} isn't on Xiaomi GetApps under this developer account. Submit the first version by hand in Xiaomi's console;"
            " after that, uploads are automatic."
        )
    if answer.get("updateVersion") is False:
        raise StoreError("Xiaomi GetApps: Xiaomi doesn't take a new version of this app now (another one may be in review). Check Xiaomi's console.")
    on_store = info.get("versionCode")
    if isinstance(on_store, int) and on_store >= int(config["version_code"]):
        raise StoreError(f"Xiaomi GetApps: the store already has version code {on_store}; this build is {config['version_code']}.")

    app_info = {
        # The name already on the store: an upload never renames the listing.
        "appName": info.get("appName") or config.get("app_name") or package,
        "packageName": package,
        "updateDesc": credentials["release_notes"],
    }
    privacy = (listing or {}).get("privacy_url") or ""
    if privacy.startswith("https://"):
        app_info["privacyUrl"] = privacy
    request_data = json.dumps(
        {"userName": credentials["user_name"], "synchroType": 1, "appInfo": json.dumps(app_info, separators=(",", ":"))},
        separators=(",", ":"),
    )
    files = (("apk", apk), ("icon", icon))
    sig = signature(request_data, credentials["password"], credentials["public_certificate"], files)
    pushed = post(
        "/dev/push",
        {"RequestData": request_data, "SIG": sig},
        (("apk", apk, "application/vnd.android.package-archive"), ("icon", icon, "image/png")),
        "uploading the APK",
    )
    if pushed["result"] != 0:
        raise failed("uploading the APK", pushed["result"])
    return package


def main():
    secrets_path, apk, config_path, icon = sys.argv[1:5]
    store_path = sys.argv[5] if len(sys.argv) > 5 else None
    with open(secrets_path) as handle:
        credentials = json.load(handle).get("xiaomi_getapps")
    if not credentials:
        sys.exit("No Xiaomi GetApps keys in this build.")
    with open(config_path) as handle:
        config = json.load(handle)
    listing = None
    if store_path and os.path.isfile(store_path):
        with open(store_path) as handle:
            listing = json.load(handle)
    try:
        package = publish(credentials, apk, config, icon, listing)
    except StoreError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    print(f"Uploaded to Xiaomi GetApps and submitted for review ({package}).")


if __name__ == "__main__":
    main()
