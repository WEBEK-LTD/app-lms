#!/usr/bin/env python3
"""Sends a build's final status from the Android and iOS job results.

Usage: report.py <build-id> <results-dir>

The build is ready when the Android app was built: its files are usable even
when the iOS app couldn't be built (the iOS stage then shows as failed, with a
message, and the team is emailed). It fails when the Android app couldn't be
built. A missing result means that job failed before it could write one.

Messages are shown to the client and put in their email: plain words only.
"""
import json
import subprocess
import sys
from pathlib import Path

ANDROID_FAILED = "The Android app couldn't be built."
IOS_FAILED = "The iOS app couldn't be built."

FAILED = {
    "android": {"stages": {"android": "failed"}, "artifacts": [], "message": ANDROID_FAILED},
    "ios": {"stages": {"ios": "failed"}, "artifacts": [], "message": IOS_FAILED},
}


def load(results, platform, build_id):
    path = Path(results) / f"result-{build_id}-{platform}" / "result.json"
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return FAILED[platform]


def summarize(android, ios):
    stages = {**android["stages"], **ios["stages"]}
    android_done = stages.get("android") == "done"
    ios_failed = stages.get("ios") == "failed"
    if not android_done:
        # Only why it failed: hints about the iOS app don't help here.
        messages = [android.get("message") or ANDROID_FAILED]
        if ios_failed:
            messages.append(ios.get("message") or IOS_FAILED)
    elif ios_failed:
        messages = [
            android.get("message"),
            "Your Android app is ready, but the iOS app couldn't be built. Our team has been told and will look into it.",
        ]
    else:
        messages = [android.get("message"), ios.get("message")]
    out = {
        "status": "ready" if android_done else "failed",
        "stages": stages,
        "artifacts": android["artifacts"] + ios["artifacts"],
        "message": " ".join(m for m in messages if m) or None,
    }
    # 87.2 Why: the Android app's failure first (it decides the build), then the iOS app's, then a store upload's.
    failure = failure_of(android if not android_done else None) or failure_of(ios if ios_failed else None) or failure_of(android) or failure_of(ios)
    if failure:
        out["failure"] = failure
    return out


def failure_of(result):
    failure = (result or {}).get("failure")
    return failure if isinstance(failure, dict) and failure.get("code") else None


def main():
    build_id, results = sys.argv[1], sys.argv[2]
    report = summarize(load(results, "android", build_id), load(results, "ios", build_id))
    print(json.dumps({k: v for k, v in report.items() if k != "artifacts"}))
    script = Path(__file__).with_name("platform.py")
    subprocess.run([sys.executable, str(script), "status", build_id, json.dumps(report)], check=True)


if __name__ == "__main__":
    main()
