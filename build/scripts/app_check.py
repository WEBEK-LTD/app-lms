#!/usr/bin/env python3
"""The check after a client build (roadmap 182).

Usage:
  app_check.py run <build_id>
      Claims the build's check (POST /builds/{id}/app-check/claim: the app
      preview's signed, read-only link, the passes and the routes), opens the
      app in Chromium at a phone's size in each pass (check_app.mjs), turns
      what the browser saw into the build's issues and reports them
      (POST /builds/{id}/app-check). It never fails the job: a check that
      couldn't finish is reported as failed and the build stays as it is.

  app_check.py parse <out.json>
      The issues check_app.mjs's output gives, printed as JSON (for a look by hand).

Environment: PLATFORM_API_URL, BUILD_PIPELINE_TOKEN (docs/api/pipeline.yaml),
and optionally PLAYWRIGHT_DIR (an npm prefix with playwright installed).
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
CHECK = HERE / "check_app.mjs"

# docs/api/pipeline.yaml › AppCheckResult limits.
MAX_ISSUES = 500
MAX_MESSAGE = 500

# A Flutter error that says something didn't fit, written by Flutter itself in a debug build
# or by the preview's check mode in the release one ("A RenderFlex overflowed by 12.0 pixels on the right.").
OVERFLOW_WORDS = ("overflowed by", "RenderFlex overflowed")

# Requests that aren't the app's: the browser's own, fonts and pictures from other sites the preview can't control.
IGNORED_HOSTS = ("fonts.gstatic.com", "fonts.googleapis.com", "www.gstatic.com")


def _short(text):
    text = " ".join(str(text).split())
    return text if len(text) <= MAX_MESSAGE else text[: MAX_MESSAGE - 1] + "…"


def _request_path(url):
    """A failed request as the team reads it: its host and path, never its query (it may carry a token)."""
    try:
        parts = urlparse(url)
    except ValueError:
        return _short(url.split("?")[0])
    return _short(f"{parts.netloc}{parts.path}")


def issues_of(output):
    """The build's issues from check_app.mjs's output: each overflow, error and failed request, once per pass and screen."""
    issues = []
    seen = set()

    def add(kind, lang, scale, route, message):
        key = (kind, lang, scale, route, message)
        if key in seen or len(issues) >= MAX_ISSUES:
            return
        seen.add(key)
        issues.append({"kind": kind, "lang": lang, "scale": scale, "route": _short(route), "message": _short(message)})

    for run in output.get("passes", []):
        lang, scale = run["lang"], run["scale"]
        for screen in run.get("routes", []):
            route = screen.get("route", "/")
            for line in screen.get("lines", []):
                try:
                    report = json.loads(line)
                except ValueError:
                    continue
                kind = report.get("kind")
                message = str(report.get("message") or "")
                if kind == "overflow" or (kind == "error" and any(word in message for word in OVERFLOW_WORDS)):
                    add("overflow", lang, scale, route, message)
                elif kind == "error":
                    add("error", lang, scale, route, message)
            for error in screen.get("page_errors", []):
                add("overflow" if any(word in error for word in OVERFLOW_WORDS) else "error", lang, scale, route, error)
            for failed in screen.get("failed", []):
                url = failed.get("url", "")
                host = urlparse(url).netloc if url else ""
                if host in IGNORED_HOSTS or url.startswith("data:") or url.startswith("blob:"):
                    continue
                add("request", lang, scale, _request_path(url), f"{failed.get('status', 'failed')} on {route}")
    return issues


def result_of(output):
    """The report sent: done with the passes and issues, or failed with why when nothing was opened."""
    passes = [{"lang": p["lang"], "scale": p["scale"], "routes": sum(1 for r in p.get("routes", []) if r.get("loaded"))} for p in output.get("passes", [])]
    opened = sum(p["routes"] for p in passes)
    result = {
        "status": "done" if opened else "failed",
        "passes": passes,
        "issues": issues_of(output),
        "check_mode": bool(output.get("check_mode")),
    }
    if not opened:
        result["message"] = "No screen of the app opened in the browser."
    elif output.get("stopped"):
        result["message"] = _short(output["stopped"])
    return result


def _api():
    # The same calls as the store screenshots' (retries included).
    sys.path.insert(0, str(HERE))
    import store_screenshots  # noqa: E402

    return store_screenshots.request


def run(build_id):
    request = _api()
    status, plan = request("POST", f"/builds/{build_id}/app-check/claim")
    if status == 409:
        print(f"Build {build_id} isn't checked: {(plan or {}).get('message', '')}")
        return 0
    if status != 200 or not plan:
        print(f"Couldn't claim the check of build {build_id}: {status} {plan}", file=sys.stderr)
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        plan_path = Path(tmp) / "plan.json"
        out_path = Path(tmp) / "out.json"
        plan_path.write_text(json.dumps(plan))
        os.chmod(plan_path, 0o600)
        try:
            subprocess.run(["node", str(CHECK), str(plan_path), str(out_path)], check=False, timeout=17 * 60)
            output = json.loads(out_path.read_text()) if out_path.exists() else {}
        except (subprocess.TimeoutExpired, ValueError) as error:
            output = {"passes": [], "stopped": f"The browser didn't finish: {error}"}
    result = result_of(output)
    if result["status"] == "failed" and output.get("stopped"):
        result["message"] = _short(output["stopped"])
    status, answer = request("POST", f"/builds/{build_id}/app-check", result)
    print(f"Build {build_id}: {result['status']}, {len(result['issues'])} issues ({status} {answer})")
    return 0


def main(argv):
    if len(argv) >= 3 and argv[1] == "run":
        return run(argv[2])
    if len(argv) >= 3 and argv[1] == "parse":
        print(json.dumps(result_of(json.loads(Path(argv[2]).read_text())), indent=1, ensure_ascii=False))
        return 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
