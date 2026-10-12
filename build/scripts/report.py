#!/usr/bin/env python3
"""Sends a build's final status from the Android and iOS job results.

Usage: report.py <build-id> <results-dir>

The build is ready when the Android app was built and iOS was built or skipped.
A missing result means that job failed before it could write one.
"""
import json
import subprocess
import sys
from pathlib import Path

FAILED = {
    "android": {"stages": {"android": "failed"}, "artifacts": [], "message": "The Android build failed. We'll look into it and start it again."},
    "ios": {"stages": {"ios": "failed"}, "artifacts": [], "message": "The iOS build failed. We'll look into it and start it again."},
}


def load(results, platform, build_id):
    path = Path(results) / f"result-{build_id}-{platform}" / "result.json"
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return FAILED[platform]


def summarize(android, ios):
    stages = {**android["stages"], **ios["stages"]}
    ok = stages.get("android") == "done" and stages.get("ios") in ("done", "skipped")
    messages = [m for m in (android.get("message"), ios.get("message")) if m]
    return {
        "status": "ready" if ok else "failed",
        "stages": stages,
        "artifacts": android["artifacts"] + ios["artifacts"],
        "message": " ".join(messages) or None,
    }


def main():
    build_id, results = sys.argv[1], sys.argv[2]
    report = summarize(load(results, "android", build_id), load(results, "ios", build_id))
    print(json.dumps({k: v for k, v in report.items() if k != "artifacts"}))
    script = Path(__file__).with_name("platform.py")
    subprocess.run([sys.executable, str(script), "status", build_id, json.dumps(report)], check=True)


if __name__ == "__main__":
    main()
