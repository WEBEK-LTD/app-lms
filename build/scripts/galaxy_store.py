#!/usr/bin/env python3
"""Uploads an Android build to Samsung Galaxy Store and submits it (roadmap 35).

Usage: galaxy_store.py <secrets.json> <app.apk>

Uses the Galaxy Store Developer API (Content Publish API) with the client's
Seller Portal service account from the build's secrets (`galaxy_store` in
docs/api/pipeline.yaml):

  1. A JWT signed with the service account's private key (RS256, scope
     "publishing", 20 minutes at most) is exchanged for an access token.
  2. The app's content info must be FOR_SALE: the first version is registered
     by hand in Seller Portal, and an app already in review can't be updated.
  3. An upload session, the APK upload (it gives a file key), a new version
     of the content (contentUpdate), the binary added with the file key
     (/seller/v2/content/binary) and the version submitted for review.

Galaxy Store gets the APK: it is signed with the app's upload key, and an App
Bundle would need Samsung to manage the signing key.

Secrets never reach the output: errors name the step and Samsung's answer
code only. GALAXY_API_URL overrides https://devapi.samsungapps.com (tests).
"""
import base64
import json
import secrets
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("GALAXY_API_URL", "https://devapi.samsungapps.com").rstrip("/")


class StoreError(Exception):
    """A step that didn't work, in words safe to log."""


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def sign_rs256(message, private_key):
    """RS256 signature with openssl (the runners have it; Python's standard library can't sign)."""
    with tempfile.TemporaryDirectory() as tmp:
        key_path = os.path.join(tmp, "key.pem")
        fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as handle:
            handle.write(private_key.strip() + "\n")
        result = subprocess.run(["openssl", "dgst", "-sha256", "-sign", key_path], input=message, capture_output=True, check=False)
    if result.returncode != 0:
        raise StoreError("The Galaxy Store private key couldn't sign the sign-in request. Check the key saved in the dashboard.")
    return result.stdout


def make_jwt(service_account_id, private_key, now=None):
    now = int(now if now is not None else time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = b64url(json.dumps({"iss": service_account_id, "scopes": ["publishing"], "iat": now, "exp": now + 1200}, separators=(",", ":")).encode())
    signing_input = f"{header}.{claims}".encode()
    return f"{header}.{claims}.{b64url(sign_rs256(signing_input, private_key))}"


def request(method, url, headers=None, body=None, step=""):
    """JSON request; returns the decoded answer ({} when empty)."""
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    all_headers = {"Accept": "application/json", "User-Agent": "yallapp-build-pipeline", **(headers or {})}
    if body is not None and not isinstance(body, bytes):
        all_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=all_headers)
    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        raise StoreError(f"Galaxy Store: {step} failed (HTTP {error.code}{answer_code(error.read())}).") from None
    except urllib.error.URLError as error:
        raise StoreError(f"Galaxy Store: {step} failed ({error.reason}).") from None
    try:
        return json.loads(raw) if raw else {}
    except ValueError:
        return {}


def answer_code(raw):
    """Samsung's error code, without anything else from the answer."""
    try:
        payload = json.loads(raw)
    except ValueError:
        return ""
    error = payload.get("error") if isinstance(payload, dict) else None
    code = (error or {}).get("code") if isinstance(error, dict) else None
    code = code or (payload.get("resultCode") if isinstance(payload, dict) else None)
    return f", code {code}" if code else ""


def multipart(fields, file_field, file_path):
    # Not uuid: on some Pythons it imports `platform`, which this folder's platform.py shadows in the tests.
    boundary = secrets.token_hex(16)
    parts = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    with open(file_path, "rb") as handle:
        content = handle.read()
    name = os.path.basename(file_path)
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{name}"\r\n'
        f"Content-Type: application/vnd.android.package-archive\r\n\r\n".encode()
        + content
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def publish(credentials, apk, now=None):
    """Uploads and submits the APK. Returns the content ID."""
    content_id = credentials["content_id"]
    jwt = make_jwt(credentials["service_account_id"], credentials["private_key"], now)
    answer = request("POST", f"{API}/auth/accessToken", {"Authorization": f"Bearer {jwt}"}, {}, "signing in")
    token = (answer.get("createdItem") or {}).get("accessToken")
    if not token:
        raise StoreError("Galaxy Store: signing in failed (no access token). Check the service account ID and private key.")
    auth = {"Authorization": f"Bearer {token}", "service-account-id": credentials["service_account_id"]}

    info = request("GET", f"{API}/seller/contentInfo?{urllib.parse.urlencode({'contentId': content_id})}", auth, None, "reading the app")
    content = info[0] if isinstance(info, list) and info else info if isinstance(info, dict) else {}
    status = content.get("contentStatus")
    if status != "FOR_SALE":
        raise StoreError(
            f"Galaxy Store: the app is {status or 'not found'}, not on sale. The first version must be published by hand in Seller Portal,"
            " and an update can't be sent while another one is in review."
        )

    session = request("POST", f"{API}/seller/createUploadSessionId", auth, {}, "starting the upload")
    if not session.get("sessionId") or not session.get("url"):
        raise StoreError("Galaxy Store: starting the upload failed (no upload session).")
    body, content_type = multipart({"sessionId": session["sessionId"]}, "file", apk)
    uploaded = request("POST", session["url"], {**auth, "Content-Type": content_type}, body, "uploading the APK")
    file_key = uploaded.get("fileKey")
    if not file_key:
        raise StoreError("Galaxy Store: uploading the APK failed (no file key).")

    # A new version of the app, with the same details as the one on sale.
    update = {"contentId": content_id}
    for key in ("defaultLanguageCode", "paid", "usExportLaws", "publicationType"):
        if key in content:
            update[key] = content[key]
    update.setdefault("usExportLaws", True)
    request("POST", f"{API}/seller/contentUpdate", auth, update, "starting the new version")

    added = request("POST", f"{API}/seller/v2/content/binary", auth, {"contentId": content_id, "filekey": file_key, "gms": "Y"}, "adding the APK")
    if added.get("resultCode") not in (None, "0000"):
        raise StoreError(f"Galaxy Store: adding the APK failed (code {added.get('resultCode')}).")

    request("POST", f"{API}/seller/contentSubmit", auth, {"contentId": content_id}, "submitting for review")
    return content_id


def main():
    secrets_path, apk = sys.argv[1], sys.argv[2]
    with open(secrets_path) as handle:
        credentials = json.load(handle).get("galaxy_store")
    if not credentials:
        sys.exit("No Galaxy Store keys in this build.")
    try:
        content_id = publish(credentials, apk)
    except StoreError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    print(f"Uploaded to Galaxy Store and submitted for review (content {content_id}).")


if __name__ == "__main__":
    main()
