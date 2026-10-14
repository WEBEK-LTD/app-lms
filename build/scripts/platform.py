#!/usr/bin/env python3
"""Calls the platform's build pipeline API (docs/api/pipeline.yaml).

Environment: PLATFORM_API_URL (e.g. https://yallapp.com.tr/api/v1) and BUILD_PIPELINE_TOKEN.

  platform.py queue                      prints queued builds as a JSON array
  platform.py claim <id> <log-url>       marks a build as building
  platform.py config <id> <file>         saves the build config
  platform.py store <id> <file>          saves the store listing (texts and screenshot URLs)
  platform.py secrets <id> <file>        saves the build's keys (file mode 600)
  platform.py has_ios <id>               prints yes when an App Store Connect key is saved
  platform.py signing <id> <json-file>   saves signing keys created by this build
  platform.py status <id> <json>         sends a status report
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request


def call(method, path, body=None):
    base = os.environ["PLATFORM_API_URL"].rstrip("/")
    data = None if body is None else json.dumps(body).encode()
    for attempt in range(4):
        request = urllib.request.Request(
            base + path,
            data=data,
            method=method,
            headers={
                "Authorization": "Bearer " + os.environ["BUILD_PIPELINE_TOKEN"],
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "yallapp-build-pipeline",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read()
            if error.code in (429, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            try:
                payload = json.loads(raw)
            except ValueError:
                payload = {"code": "http_error", "message": raw.decode(errors="replace")[:500]}
            return error.code, payload
        except urllib.error.URLError:
            if attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def need(status, payload, ok=(200, 204)):
    if status not in ok:
        sys.exit(f"Platform API error {status}: {json.dumps(payload)}")
    return payload


def write_private(path, payload):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        json.dump(payload, handle)


def main():
    command, args = sys.argv[1], sys.argv[2:]
    if command == "queue":
        builds = need(*call("GET", "/builds/queue?limit=5"))["builds"]
        print(json.dumps([{"id": b["id"], "auto_publish": b["auto_publish"]} for b in builds]))
    elif command == "claim":
        need(*call("POST", f"/builds/{args[0]}/status", {"status": "building", "stages": {"queued": "done"}, "log_url": args[1]}))
    elif command == "config":
        with open(args[1], "w") as handle:
            json.dump(need(*call("GET", f"/builds/{args[0]}/config")), handle, indent=2)
    elif command == "store":
        with open(args[1], "w") as handle:
            json.dump(need(*call("GET", f"/builds/{args[0]}/store")), handle, indent=2)
    elif command == "secrets":
        write_private(args[1], need(*call("GET", f"/builds/{args[0]}/secrets")))
    elif command == "has_ios":
        print("yes" if need(*call("GET", f"/builds/{args[0]}/secrets"))["app_store_connect"] else "no")
    elif command == "signing":
        with open(args[1]) as handle:
            status, payload = call("PUT", f"/builds/{args[0]}/signing", json.load(handle))
        if status == 409:
            sys.exit("A signing key is already saved for this app. Refusing to continue with a different key.")
        need(status, payload)
    elif command == "status":
        need(*call("POST", f"/builds/{args[0]}/status", json.loads(args[1])))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
