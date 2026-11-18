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

151 An iOS job GitHub had no Mac for (it waited in the queue, then GitHub
cancelled it before any step ran: no runner, no steps) leaves no result
either. Its own reason, `ios_no_mac_runner`, not a build failure: read from
the run's jobs (GITHUB_TOKEN with `actions: read`). Nothing builds it again
by itself: the client starts the iPhone app again when they choose.
"""
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime
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

# 151 GitHub had no Mac for the iOS job. The client's words never name GitHub, a Mac or a
# runner: it's on our side (the platform explains it in the client's language, with iPhone only).
NO_MAC_CODE = "ios_no_mac_runner"
NO_MAC = "The iPhone app wasn't built this time because of a temporary problem on our side, not in your app. Our team has been told. Try again later with iPhone only."


def read(results, platform, build_id):
    """The result a job wrote, or None when it wrote none."""
    path = Path(results) / f"result-{build_id}-{platform}" / "result.json"
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def load(results, platform, build_id):
    return read(results, platform, build_id) or FAILED[platform]


def no_runner(job):
    """151 A job GitHub never gave a runner: finished (cancelled, or failed) before any step ran."""
    return job.get("status") == "completed" and job.get("conclusion") in ("cancelled", "failure", "timed_out") and not job.get("runner_name") and not job.get("steps")


def no_mac(build_id, jobs):
    """151 The iOS job of this build, when GitHub had no Mac for it: None otherwise or when the run's jobs can't be read."""
    for job in jobs or []:
        if job.get("name") == f"iOS {build_id}":
            return job if no_runner(job) else None
    return None


def waited_minutes(job):
    try:
        start = datetime.fromisoformat(job["created_at"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(job["completed_at"].replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError, AttributeError):
        return None
    return max(0, round((end - start).total_seconds() / 60))


def no_mac_result(job):
    """151 The iOS result of a job GitHub had no Mac for: its own reason, the technical detail for our team (Admin) only."""
    labels = ", ".join(job.get("labels") or []) or "macOS"
    minutes = waited_minutes(job)
    waited = f" after {minutes} minutes in the queue" if minutes is not None else ""
    detail = (
        f"GitHub had no {labels} runner for the iOS job: it was {job.get('conclusion')}{waited} before any step ran "
        f"(no runner assigned). Nothing is wrong with the app, and nothing builds it again by itself: the client starts it again with iPhone only."
    )
    return {"stages": {"ios": "failed"}, "artifacts": [], "message": NO_MAC, "failure": {"code": NO_MAC_CODE, "stage": "ios", "log": detail}}


def run_jobs():
    """151 This run's jobs (GitHub's API with the job's GITHUB_TOKEN); None when they can't be read."""
    token, repository, run = os.environ.get("GITHUB_TOKEN"), os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GITHUB_RUN_ID")
    if not (token and repository and run):
        return None
    api = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
    jobs = []
    try:
        for page in range(1, 4):
            request = urllib.request.Request(
                f"{api}/repos/{repository}/actions/runs/{run}/jobs?per_page=100&page={page}",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "yallapp-build-pipeline"},
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                body = json.loads(response.read())
            jobs += body.get("jobs") or []
            if len(jobs) >= body.get("total_count", 0) or not body.get("jobs"):
                break
    except (OSError, ValueError) as error:
        print(f"The run's jobs couldn't be read: {error}", file=sys.stderr)
        return None
    return jobs


def results_for(results, build_id, only="", ios_built=True, jobs=None):
    """142 The Android and iOS results of a build: read from the jobs that ran, the others not built.
    151 `jobs` reads the run's jobs, asked only when the iOS job wrote no result."""
    android = NOT_BUILT["android"] if only == "ios" else load(results, "android", build_id)
    if only == "android":
        ios = NOT_BUILT["ios"]
    elif not ios_built:
        ios = {**NOT_BUILT["ios"], "message": NO_IOS}
    else:
        ios = read(results, "ios", build_id)
        if ios is None:
            job = no_mac(build_id, jobs() if jobs else None)
            ios = no_mac_result(job) if job else FAILED["ios"]
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
    elif ios_failed and is_no_mac(ios):
        # 151 Only the Android app's words: the platform says why the iPhone app wasn't built, with iPhone only.
        messages = [android.get("message")]
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
    # 151 A failed build is the Android app's: the iOS job GitHub had no Mac for isn't why (its words are in the message).
    order = [android if not android_done else None, ios if ios_failed else None, android, ios]
    failure = next((failure_of(r) for r in order if failure_of(r) and (android_done or not is_no_mac(r))), None)
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


def is_no_mac(result):
    return (failure_of(result) or {}).get("code") == NO_MAC_CODE


def main():
    build_id, results = sys.argv[1], sys.argv[2]
    only = os.environ.get("BUILD_ONLY", "")
    android, ios = results_for(results, build_id, only, os.environ.get("BUILD_IOS", "true") != "false", jobs=run_jobs)
    report = summarize(android, ios, only)
    print(json.dumps({k: v for k, v in report.items() if k != "artifacts"}))
    script = Path(__file__).with_name("platform.py")
    subprocess.run([sys.executable, str(script), "status", build_id, json.dumps(report)], check=True)


if __name__ == "__main__":
    main()
