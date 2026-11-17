#!/usr/bin/env python3
"""Sends a build's final status from the Android and iOS job results.

Usage: report.py <build-id> <results-dir>

The build is ready when the Android app was built: its files are usable even
when the iOS app couldn't be built (the iOS stage then shows as failed, with a
message, and the team is emailed). It fails when the Android app couldn't be
built. A missing result means that job failed before it could write one.

Messages are shown to the client and put in their email: plain words only.

142 A build makes the apps the queue said (BUILD_ONLY, BUILD_IOS from the
workflow's matrix): started for the iPhone only, it is ready when the iOS app
was built; a platform it doesn't make has its stages skipped, with no result
to read (its job didn't run).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

ANDROID_FAILED = "The Android app couldn't be built."
IOS_FAILED = "The iOS app couldn't be built."

FAILED = {
    "android": {"stages": {"android": "failed"}, "artifacts": [], "message": ANDROID_FAILED},
    "ios": {"stages": {"ios": "failed"}, "artifacts": [], "message": IOS_FAILED},
}


# 142 A platform the build doesn't make: its job didn't run.
NOT_BUILT = {
    "android": {
        "stages": {"android": "skipped", "upload_play": "skipped", "upload_galaxy": "skipped", "upload_appgallery": "skipped", "upload_xiaomi": "skipped"},
        "artifacts": [],
        "message": None,
    },
    "ios": {"stages": {"ios": "skipped", "upload_testflight": "skipped", "app_review": "skipped"}, "artifacts": [], "message": None},
}
# The iOS job's own words when it finds no key (build-apps.yml), for a build whose plan or key had no iOS app when it was queued.
NO_IOS = "No iOS app in this build: add your App Store Connect key in App setup › Publishing, on a plan with the iOS app."


def load(results, platform, build_id):
    path = Path(results) / f"result-{build_id}-{platform}" / "result.json"
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return FAILED[platform]


def results_for(results, build_id, only="", ios_built=True):
    """142 The Android and iOS results of a build: read from the jobs that ran, the others not built."""
    android = NOT_BUILT["android"] if only == "ios" else load(results, "android", build_id)
    if only == "android":
        ios = NOT_BUILT["ios"]
    elif not ios_built:
        ios = {**NOT_BUILT["ios"], "message": NO_IOS}
    else:
        ios = load(results, "ios", build_id)
    return android, ios


def summarize(android, ios, only=""):
    if only == "ios":
        return summarize_ios_only(android, ios)
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


def summarize_ios_only(android, ios):
    """142 Started for the iPhone only: ready when the iOS app was built."""
    stages = {**android["stages"], **ios["stages"]}
    done = stages.get("ios") == "done"
    message = ios.get("message") or (None if done else IOS_FAILED)
    out = {"status": "ready" if done else "failed", "stages": stages, "artifacts": ios["artifacts"], "message": message}
    failure = failure_of(ios)
    if failure:
        out["failure"] = failure
    return out


def failure_of(result):
    failure = (result or {}).get("failure")
    return failure if isinstance(failure, dict) and failure.get("code") else None


def main():
    build_id, results = sys.argv[1], sys.argv[2]
    only = os.environ.get("BUILD_ONLY", "")
    android, ios = results_for(results, build_id, only, os.environ.get("BUILD_IOS", "true") != "false")
    report = summarize(android, ios, only)
    print(json.dumps({k: v for k, v in report.items() if k != "artifacts"}))
    script = Path(__file__).with_name("platform.py")
    subprocess.run([sys.executable, str(script), "status", build_id, json.dumps(report)], check=True)


if __name__ == "__main__":
    main()
