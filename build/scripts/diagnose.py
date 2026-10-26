#!/usr/bin/env python3
"""Reads a build's output and says why it failed (roadmap 87.2).

Usage: diagnose.py <log-file> [stage]
Prints {"code": ..., "stage": ..., "log": ...} (docs/api/pipeline.yaml, StatusReport.failure).

`code` is the first known cause found in the output, newest lines first;
`log` is the end of the output the client may read: every secret, token,
key, e-mail address and path of the build machine taken out.
"""
import json
import re
import sys

# The causes, in the order they're looked for: the most specific first.
CAUSES = [
    ("firebase_android", [r"No matching client found for package name", r"google-services\.json.*(missing|not found)"]),
    ("firebase_ios", [r"GoogleService-Info\.plist.*(not found|BUNDLE_ID)", r"bundle ID .* doesn't match GoogleService-Info"]),
    ("icon", [r"make_icons\.py", r"cannot identify image file", r"icon.*(1024|transparen)"]),
    ("version_used", [
        r"[Vv]ersion code \d+ has already been used",
        r"bundle version must be higher than the previously uploaded version",
        r"CFBundleVersion.*(already been used|must be higher)",
        r"ENTITY_ERROR\.ATTRIBUTE\.INVALID\.DUPLICATE",
    ]),
    ("apple_agreement", [r"agreement.*(has not been|hasn't been|needs to be) (signed|accepted)", r"FORBIDDEN\.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED"]),
    ("apple_key", [r"NOT_AUTHORIZED", r"Authentication credentials are missing or invalid", r"appstoreconnect.*\b401\b", r"invalid.*\.p8"]),
    ("ios_signing", [
        r"No signing certificate",
        r"doesn't include signing certificate",
        r"[Nn]o profiles for '",
        r"[Pp]rovisioning profile .*(doesn't|does not|expired|missing)",
        r"Code Signing Error",
    ]),
    ("android_signing", [r"Keystore was tampered with, or password was incorrect", r"Failed to read key .* from store", r"KeytoolException"]),
    ("play_app_missing", [r"Package not found: ", r"applicationNotFound"]),
    ("play_permission", [r"The caller does not have permission", r"\b403\b.*androidpublisher", r"insufficientPermissions"]),
    ("infrastructure", [
        r"Could not resolve host",
        r"Connection timed out",
        r"No space left on device",
        r"Could not GET 'https://",
        r"Gradle could not start",
        r"The runner has received a shutdown signal",
    ]),
]

# What never goes into the client's log.
SECRETS = [
    (re.compile(r"-----BEGIN [A-Z ]+-----.*?-----END [A-Z ]+-----", re.S), "[key]"),
    (re.compile(r"(?i)\b(bearer|basic)\s+\S+"), r"\1 [hidden]"),
    (re.compile(r"(?i)\b(token|password|passwd|secret|api[_-]?key)\b(\s*[:=]\s*|\s+)\S+"), r"\1\2[hidden]"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{20,}"), "[hidden]"),
    (re.compile(r"\bghp_[0-9A-Za-z]{20,}|\bgithub_pat_[0-9A-Za-z_]{20,}"), "[hidden]"),
    (re.compile(r"[A-Za-z0-9+/]{60,}={0,2}"), "[hidden]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[e-mail]"),
    (re.compile(r"https://files\.yallapp\.com\.tr/\S+"), "[file]"),
    (re.compile(r"[?&](sig|signature|token|key)=[^&\s]+"), "?[hidden]"),
    (re.compile(r"(/home/runner|/Users/runner|/tmp|/private/var)[^\s:'\"]*"), "…"),
]

LOG_LINES = 150
LOG_MAX = 20000


def cause(lines):
    for line in reversed(lines):
        for code, patterns in CAUSES:
            if any(re.search(p, line) for p in patterns):
                return code
    return "unknown"


def clean(text):
    for pattern, replacement in SECRETS:
        text = pattern.sub(replacement, text)
    return text


def client_log(lines):
    # GitHub's own markers and blank lines aren't for the client.
    kept = [line.rstrip() for line in lines if line.strip() and not line.startswith("##[") and not line.startswith("::")]
    text = clean("\n".join(kept[-LOG_LINES:]))
    return text[-LOG_MAX:]


def diagnose(text, stage=None):
    lines = text.splitlines()
    out = {"code": cause(lines), "log": client_log(lines)}
    if stage:
        out["stage"] = stage
    return out


def main():
    path = sys.argv[1]
    stage = sys.argv[2] if len(sys.argv) > 2 else None
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        text = ""
    print(json.dumps(diagnose(text, stage)))


if __name__ == "__main__":
    main()
