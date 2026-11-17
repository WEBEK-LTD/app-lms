#!/usr/bin/env python3
"""Store screenshots made from the app itself (roadmap 139, "Make them for me").

Usage:
  store_screenshots.py run [<limit>]
      Takes the runs waiting (GET /screenshots/queue), and for each: claims it
      (the app preview's signed, read-only link and the shots to take),
      captures every shot with Chromium (capture_screens.mjs), makes each one
      a store-ready picture at its device's exact size (24-bit, no alpha; a
      JPEG only when the PNG is too large), sends it back
      (PUT /screenshots/{id}/shots/{key}) and reports how the run ended.

  store_screenshots.py pending
      How many runs are waiting (GET /screenshots/queue), printed as
      `waiting=N` and, on GitHub Actions, written to $GITHUB_OUTPUT, so the
      workflow sets up Chromium only when there is work. Plain Python.

  store_screenshots.py normalize <in.png> <device> <out-dir>
      One picture as the run sends it (for a look by hand).

Environment: PLATFORM_API_URL, BUILD_PIPELINE_TOKEN (docs/api/pipeline.yaml),
and optionally PLAYWRIGHT_DIR (an npm prefix with playwright installed).

The pictures are the app's own screens, as the store asks: no device frame
and no added text. When the owner asks for framed screenshots, the build
frames them on the app's colour with the owner's captions (store_listing.py),
as it does with uploaded ones.
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CAPTURE = HERE / "capture_screens.mjs"

# The platform's limit for a screenshot (lib/store-files.ts SCREENSHOT_MAX_BYTES), with room to spare.
MAX_BYTES = 4_800_000

# The sizes the stores ask for (lib/app/auto-screenshots.ts DEVICE_SIZES).
SIZES = {
    "phone": (1080, 1920),
    "iphone": (1320, 2868),
    "tablet": (1600, 2560),
    "ipad": (2064, 2752),
}


def request(method, path, body=None, content_type="application/json", attempts=4):
    """A call to the pipeline API: (status, JSON body or None). Retries busy and unreachable answers."""
    base = os.environ["PLATFORM_API_URL"].rstrip("/")
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    for attempt in range(attempts):
        req = urllib.request.Request(
            base + path,
            data=data,
            method=method,
            headers={
                "Authorization": "Bearer " + os.environ["BUILD_PIPELINE_TOKEN"],
                "Accept": "application/json",
                "Content-Type": content_type,
                "User-Agent": "yallapp-build-pipeline",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read()
            if error.code in (429, 502, 503, 504) and attempt < attempts - 1:
                time.sleep(2 ** (attempt + 1))
                continue
            try:
                return error.code, json.loads(raw)
            except ValueError:
                return error.code, {"code": "http_error", "message": raw.decode(errors="replace")[:500]}
        except urllib.error.URLError:
            if attempt < attempts - 1:
                time.sleep(2 ** (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def normalize(data, device):
    """The picture as the store wants it: exactly the device's size, 24-bit with no alpha. (bytes, content type)."""
    from PIL import Image  # Only where pictures are made: `pending` runs before Pillow is installed.

    width, height = SIZES[device]
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        if image.mode in ("RGBA", "LA", "P"):
            flat = Image.new("RGB", image.size, (255, 255, 255))
            rgba = image.convert("RGBA")
            flat.paste(rgba, mask=rgba.split()[3])
            picture = flat
        else:
            picture = image.convert("RGB")
    if picture.size != (width, height):
        picture = picture.resize((width, height), Image.LANCZOS)
    out = io.BytesIO()
    picture.save(out, "PNG", optimize=True)
    if out.tell() <= MAX_BYTES:
        return out.getvalue(), "image/png"
    for quality in (92, 85, 78):
        out = io.BytesIO()
        picture.save(out, "JPEG", quality=quality, optimize=True)
        if out.tell() <= MAX_BYTES:
            break
    return out.getvalue(), "image/jpeg"


def capture(plan, folder, runner=subprocess.run):
    """Runs capture_screens.mjs; returns its report ({key: "ok" | why not})."""
    plan_path = Path(folder) / "plan.json"
    plan_path.write_text(json.dumps(plan))
    shots = Path(folder) / "shots"
    runner(["node", str(CAPTURE), str(plan_path), str(shots)], check=False, timeout=3600)
    report = shots / "report.json"
    return json.loads(report.read_text()) if report.exists() else {}


def shot_file(folder, key):
    return Path(folder) / "shots" / (key.replace(":", "_") + ".png")


def summary(report, sent, refused):
    """The run's message for the owner's page: what was left out, in a line."""
    left = [key for key, result in report.items() if result != "ok"] + refused
    if not left:
        return f"{sent} screenshots."
    return f"{sent} screenshots; {len(left)} left out ({', '.join(sorted(set(left))[:6])}{'…' if len(set(left)) > 6 else ''})."


def run_one(run_id, call=request, capturer=capture):
    """One run, start to end. Returns how many shots were sent."""
    status, plan = call("POST", f"/screenshots/{run_id}/claim", {})
    if status != 200:
        print(f"Run {run_id}: not claimed ({status}: {json.dumps(plan)[:300]})")
        return 0
    sent = 0
    refused = []
    try:
        with tempfile.TemporaryDirectory() as folder:
            report = capturer(plan, folder)
            for shot in plan.get("shots") or []:
                key = shot["key"]
                path = shot_file(folder, key)
                if report.get(key) != "ok" or not path.exists():
                    continue
                data, content_type = normalize(path.read_bytes(), shot["device"])
                code, answer = call("PUT", f"/screenshots/{run_id}/shots/{urllib.request.quote(key, safe='')}", data, content_type)
                if code == 200:
                    sent += 1
                else:
                    refused.append(key)
                    print(f"Run {run_id}: {key} refused ({code}: {json.dumps(answer)[:200]})")
    except Exception as error:  # The run is closed with why, whatever happened.
        call("POST", f"/screenshots/{run_id}/status", {"status": "failed", "message": f"The screenshots couldn't be made: {error}"[:300]})
        raise
    if sent == 0:
        call("POST", f"/screenshots/{run_id}/status", {"status": "failed", "message": "No screen of the app could be taken. Check that the app preview opens, then make them again."})
    else:
        call("POST", f"/screenshots/{run_id}/status", {"status": "done", "message": summary(report, sent, refused)})
    print(f"Run {run_id}: {sent} screenshots sent")
    return sent


def cmd_run(limit=5, call=request, capturer=capture):
    status, payload = call("GET", f"/screenshots/queue?limit={int(limit)}")
    if status != 200:
        sys.exit(f"Platform API error {status}: {json.dumps(payload)}")
    runs = payload.get("runs") or []
    print(f"Runs waiting: {len(runs)}")
    failures = 0
    for item in runs:
        try:
            run_one(item["id"], call, capturer)
        except Exception as error:
            failures += 1
            print(f"Run {item['id']}: {error}")
    return 1 if failures and failures == len(runs) else 0


def cmd_pending(call=request, output=None):
    """How many runs are waiting; `waiting=N` printed and added to the step's outputs."""
    status, payload = call("GET", "/screenshots/queue?limit=50")
    if status != 200:
        sys.exit(f"Platform API error {status}: {json.dumps(payload)}")
    line = f"waiting={len(payload.get('runs') or [])}"
    print(line)
    output = output if output is not None else os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    return 0


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "pending":
        return cmd_pending()
    if len(sys.argv) >= 2 and sys.argv[1] == "run" and len(sys.argv) <= 3:
        return cmd_run(int(sys.argv[2]) if len(sys.argv) == 3 else 5)
    if len(sys.argv) == 5 and sys.argv[1] == "normalize" and sys.argv[3] in SIZES:
        data, content_type = normalize(Path(sys.argv[2]).read_bytes(), sys.argv[3])
        out = Path(sys.argv[4]) / ("shot.png" if content_type == "image/png" else "shot.jpg")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        print(out)
        return 0
    sys.exit(__doc__)


if __name__ == "__main__":
    sys.exit(main())
