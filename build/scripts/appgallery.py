#!/usr/bin/env python3
"""Uploads an Android build to Huawei AppGallery and submits it (roadmap 36).

Usage: appgallery.py <secrets.json> <app.apk>

Uses the AppGallery Connect Publishing API with the client's Connect API
client from the build's secrets (`huawei_appgallery` in docs/api/pipeline.yaml):

  1. A token from the API client's ID and key (client credentials).
  2. An upload URL for the file (upload-url/for-obs), and the file sent there
     with the method and headers it gives.
  3. The app's file information updated with the uploaded object (fileType 5:
     an APK or App Bundle), then the app submitted for review. Huawei parses
     the package first: while it does, the submission is tried again.

The app must already exist in AppGallery Connect with the same package name;
the first version is submitted by hand. AppGallery gets the APK, signed with
the app's upload key (an App Bundle needs Huawei's App Signing).

Secrets never reach the output. APPGALLERY_API_URL overrides
https://connect-api.cloud.huawei.com/api (tests); APPGALLERY_SUBMIT_TRIES and
APPGALLERY_SUBMIT_WAIT (seconds) how long the submission waits for parsing.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("APPGALLERY_API_URL", "https://connect-api.cloud.huawei.com/api").rstrip("/")
SUBMIT_TRIES = int(os.environ.get("APPGALLERY_SUBMIT_TRIES", "10"))
SUBMIT_WAIT = float(os.environ.get("APPGALLERY_SUBMIT_WAIT", "30"))


class StoreError(Exception):
    """A step that didn't work, in words safe to log."""


def request(method, url, headers=None, body=None, step=""):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    all_headers = {"Accept": "application/json", "User-Agent": "yallapp-build-pipeline", **(headers or {})}
    if body is not None and not isinstance(body, bytes):
        all_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=all_headers)
    try:
        with urllib.request.urlopen(req, timeout=600) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        raise StoreError(f"AppGallery: {step} failed (HTTP {error.code}{ret_code(error.read())}).") from None
    except urllib.error.URLError as error:
        raise StoreError(f"AppGallery: {step} failed ({error.reason}).") from None
    try:
        return json.loads(raw) if raw else {}
    except ValueError:
        return {}


def ret_code(raw):
    try:
        code = (json.loads(raw).get("ret") or {}).get("code")
    except (ValueError, AttributeError):
        return ""
    return f", code {code}" if code is not None else ""


def check(answer, step):
    """AppGallery answers 200 with ret.code 0 on success."""
    code = (answer.get("ret") or {}).get("code")
    if code != 0:
        raise StoreError(f"AppGallery: {step} failed (code {code}).")
    return answer


def publish(credentials, apk, sleep=time.sleep):
    app_id = credentials["app_id"]
    token = request(
        "POST",
        f"{API}/oauth2/v1/token",
        None,
        {"grant_type": "client_credentials", "client_id": credentials["client_id"], "client_secret": credentials["client_secret"]},
        "signing in",
    ).get("access_token")
    if not token:
        raise StoreError("AppGallery: signing in failed (no access token). Check the API client ID and key.")
    auth = {"Authorization": f"Bearer {token}", "client_id": credentials["client_id"]}

    name = os.path.basename(apk)
    size = os.path.getsize(apk)
    query = urllib.parse.urlencode({"appId": app_id, "fileName": name, "contentLength": size})
    info = check(request("GET", f"{API}/publish/v2/upload-url/for-obs?{query}", auth, None, "getting an upload address"), "getting an upload address")
    url_info = info.get("urlInfo") or {}
    if not url_info.get("url") or not url_info.get("objectId"):
        raise StoreError("AppGallery: getting an upload address failed (no address).")
    with open(apk, "rb") as handle:
        content = handle.read()
    upload_headers = {str(k): str(v) for k, v in (url_info.get("headers") or {}).items()}
    upload_headers.setdefault("Content-Type", "application/octet-stream")
    request(url_info.get("method") or "PUT", url_info["url"], upload_headers, content, "uploading the APK")

    check(
        request(
            "PUT",
            f"{API}/publish/v2/app-file-info?{urllib.parse.urlencode({'appId': app_id})}",
            auth,
            {"fileType": 5, "files": [{"fileName": name, "fileDestUrl": url_info["objectId"]}]},
            "adding the APK to the app",
        ),
        "adding the APK to the app",
    )

    # Huawei parses the package before it can be submitted.
    last = None
    for attempt in range(SUBMIT_TRIES):
        if attempt:
            sleep(SUBMIT_WAIT)
        answer = request("POST", f"{API}/publish/v2/app-submit?{urllib.parse.urlencode({'appId': app_id})}", auth, {}, "submitting for review")
        last = (answer.get("ret") or {}).get("code")
        if last == 0:
            return app_id
    raise StoreError(f"AppGallery: submitting for review failed (code {last}). The APK is uploaded: submit it in AppGallery Connect.")


def main():
    secrets_path, apk = sys.argv[1], sys.argv[2]
    with open(secrets_path) as handle:
        credentials = json.load(handle).get("huawei_appgallery")
    if not credentials:
        sys.exit("No AppGallery keys in this build.")
    try:
        app_id = publish(credentials, apk)
    except StoreError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    print(f"Uploaded to AppGallery and submitted for review (app {app_id}).")


if __name__ == "__main__":
    main()
