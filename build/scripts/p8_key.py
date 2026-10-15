#!/usr/bin/env python3
"""The App Store Connect key in a build's secrets, rebuilt as fastlane's OpenSSL reads it.

A key whose line breaks were lost, or that gained spaces, a byte order mark or Windows line endings,
makes fastlane stop with "invalid curve name". This rewraps its base64 body in 64-character lines
and checks it with `openssl pkey` before the build signs anything.

Usage: p8_key.py <secrets.json>   exit 0: fixed in place and readable; 1: unreadable; 2: no key
"""
import json
import os
import re
import subprocess
import sys
import tempfile

PEM = re.compile(r"-----BEGIN ([A-Z0-9 ]+)-----(.*?)-----END \1-----", re.S)


def rewrap(text):
    """The PEM block in text with one header, 64-character lines and LF; other text as it is."""
    match = PEM.search(text.lstrip("﻿"))
    if not match:
        return text
    body = re.sub(r"[^A-Za-z0-9+/=]", "", match.group(2))
    lines = [body[i : i + 64] for i in range(0, len(body), 64)]
    return f"-----BEGIN {match.group(1)}-----\n" + "\n".join(lines) + f"\n-----END {match.group(1)}-----\n"


def readable(pem):
    """Whether OpenSSL reads the key."""
    with tempfile.NamedTemporaryFile("w", suffix=".p8", delete=False) as handle:
        handle.write(pem)
        path = handle.name
    try:
        os.chmod(path, 0o600)
        return subprocess.run(["openssl", "pkey", "-in", path, "-noout"], capture_output=True).returncode == 0
    finally:
        os.unlink(path)


def main(path):
    with open(path) as handle:
        secrets = json.load(handle)
    asc = secrets.get("app_store_connect")
    if not asc or not asc.get("private_key"):
        return 2
    asc["private_key"] = rewrap(asc["private_key"])
    if not readable(asc["private_key"]):
        return 1
    with open(path, "w") as handle:
        json.dump(secrets, handle)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
