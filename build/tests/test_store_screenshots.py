"""Tests for store_screenshots.py and the listing's screenshots in each language (roadmap 139).

Run: python3 -m unittest discover build/tests
"""
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import store_listing  # noqa: E402
import store_screenshots  # noqa: E402


def png(size, mode="RGB", color=(10, 120, 200)):
    out = io.BytesIO()
    fill = color + ((200,) if mode == "RGBA" else ())
    Image.new(mode, size, fill).save(out, "PNG")
    return out.getvalue()


def noise_png(size):
    out = io.BytesIO()
    Image.frombytes("RGB", size, os.urandom(size[0] * size[1] * 3)).save(out, "PNG")
    return out.getvalue()


PLAN = {
    "id": "run-1",
    "app_id": "app-1",
    "preview_url": "https://yallapp.example/preview-app/index.html?token=p1.x&theme=light",
    "storage": {"yallapp.preview.app-1.settings.guest_mode": "true"},
    "devices": {},
    "shots": [
        {"key": "phone:en:home", "device": "phone", "language": "en", "screen": "home", "route": "/"},
        {"key": "phone:en:item", "device": "phone", "language": "en", "screen": "item", "route": "/product/{id}", "list": "/store/products"},
        {"key": "iphone:ar:home", "device": "iphone", "language": "ar", "screen": "home", "route": "/"},
    ],
}


class FakeApi:
    def __init__(self, claim=(200, PLAN), put=200):
        self.calls = []
        self.claim = claim
        self.put = put

    def __call__(self, method, path, body=None, content_type="application/json"):
        self.calls.append((method, path, body if not isinstance(body, bytes) else f"<{len(body)} bytes {content_type}>"))
        if path.startswith("/screenshots/queue"):
            return 200, {"runs": [{"id": "run-1", "app_id": "app-1"}]}
        if path.endswith("/claim"):
            return self.claim
        if method == "PUT":
            return self.put, {"asset_id": "a"} if self.put == 200 else {"code": "owner_upload"}
        return 200, {"state": "idle"}

    def status(self):
        return [body for method, path, body in self.calls if path.endswith("/status")]


def capturer(results):
    """A stand-in for capture_screens.mjs: writes the shots it says it took."""

    def run(plan, folder):
        shots = Path(folder) / "shots"
        shots.mkdir(parents=True, exist_ok=True)
        sizes = {"phone": (360 * 3, 640 * 3), "iphone": (440 * 3, 956 * 3)}
        for shot in plan["shots"]:
            if results.get(shot["key"]) == "ok":
                (shots / (shot["key"].replace(":", "_") + ".png")).write_bytes(png(sizes[shot["device"]], "RGBA"))
        return results

    return run


class Normalize(unittest.TestCase):
    def test_every_device_exact_size_without_alpha(self):
        for device, size in store_screenshots.SIZES.items():
            data, content_type = store_screenshots.normalize(png(size, "RGBA"), device)
            self.assertEqual(content_type, "image/png")
            with Image.open(io.BytesIO(data)) as image:
                self.assertEqual(image.size, size, device)
                self.assertEqual(image.mode, "RGB", device)

    def test_store_sizes(self):
        self.assertEqual(store_screenshots.SIZES["iphone"], (1320, 2868))
        self.assertEqual(store_screenshots.SIZES["ipad"], (2064, 2752))
        phone = store_screenshots.SIZES["phone"]
        tablet = store_screenshots.SIZES["tablet"]
        # Google Play: the long side at most twice the short one; tablets at least 1080 on the short side.
        self.assertLessEqual(max(phone), 2 * min(phone))
        self.assertGreaterEqual(min(tablet), 1080)

    def test_a_picture_a_pixel_off_is_made_the_exact_size(self):
        data, _ = store_screenshots.normalize(png((1319, 2867)), "iphone")
        with Image.open(io.BytesIO(data)) as image:
            self.assertEqual(image.size, (1320, 2868))

    def test_too_large_png_becomes_a_jpeg_within_the_limit(self):
        original = store_screenshots.MAX_BYTES
        store_screenshots.MAX_BYTES = 400_000
        try:
            data, content_type = store_screenshots.normalize(noise_png((1080, 1920)), "phone")
        finally:
            store_screenshots.MAX_BYTES = original
        self.assertEqual(content_type, "image/jpeg")
        with Image.open(io.BytesIO(data)) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertEqual(image.size, (1080, 1920))


class Run(unittest.TestCase):
    def run_quiet(self, *args, **kwargs):
        with redirect_stdout(io.StringIO()):
            return store_screenshots.run_one(*args, **kwargs)

    def test_sends_each_shot_taken_and_says_what_was_left_out(self):
        api = FakeApi()
        sent = self.run_quiet("run-1", api, capturer({"phone:en:home": "ok", "phone:en:item": "skipped: the list had no items", "iphone:ar:home": "ok"}))
        self.assertEqual(sent, 2)
        puts = [(path, body) for method, path, body in api.calls if method == "PUT"]
        self.assertEqual([p for p, _ in puts], ["/screenshots/run-1/shots/phone%3Aen%3Ahome", "/screenshots/run-1/shots/iphone%3Aar%3Ahome"])
        self.assertTrue(all("image/png" in body for _, body in puts))
        [status] = api.status()
        self.assertEqual(status["status"], "done")
        self.assertIn("1 left out", status["message"])
        self.assertIn("phone:en:item", status["message"])

    def test_nothing_taken_fails_the_run(self):
        api = FakeApi()
        self.assertEqual(self.run_quiet("run-1", api, capturer({})), 0)
        [status] = api.status()
        self.assertEqual(status["status"], "failed")

    def test_an_owner_upload_refused_by_the_platform_is_left_out(self):
        api = FakeApi(put=409)
        self.assertEqual(self.run_quiet("run-1", api, capturer({"phone:en:home": "ok"})), 0)
        self.assertEqual(api.status()[0]["status"], "failed")

    def test_a_run_not_claimed_is_left_alone(self):
        api = FakeApi(claim=(404, {"code": "run_not_found"}))
        self.assertEqual(self.run_quiet("run-1", api, capturer({})), 0)
        self.assertEqual(api.status(), [])

    def test_a_capture_that_breaks_closes_the_run(self):
        api = FakeApi()

        def broken(plan, folder):
            raise RuntimeError("Chromium didn't start")

        with self.assertRaises(RuntimeError):
            self.run_quiet("run-1", api, broken)
        [status] = api.status()
        self.assertEqual(status["status"], "failed")
        self.assertIn("Chromium didn't start", status["message"])

    def test_queue(self):
        api = FakeApi()
        with redirect_stdout(io.StringIO()):
            self.assertEqual(store_screenshots.cmd_run(3, api, capturer({"phone:en:home": "ok"})), 0)
        self.assertEqual(api.calls[0][:2], ("GET", "/screenshots/queue?limit=3"))

    def test_capture_reads_the_report(self):
        def runner(args, check, timeout):
            out = Path(args[-1])
            out.mkdir(parents=True)
            (out / "report.json").write_text(json.dumps({"phone:en:home": "ok"}))
            self.assertEqual(json.loads(Path(args[-2]).read_text())["id"], "run-1")

        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(store_screenshots.capture(PLAN, folder, runner), {"phone:en:home": "ok"})


class Pending(unittest.TestCase):
    """`pending`: the workflow's cheap first step, before Chromium is set up."""

    def run_pending(self, payload, status=200):
        calls = []

        def call(method, path, body=None, content_type="application/json"):
            calls.append((method, path))
            return status, payload

        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "out"
            output.write_text("earlier=1\n")
            out = io.StringIO()
            with redirect_stdout(out):
                store_screenshots.cmd_pending(call, str(output))
            return calls, out.getvalue(), output.read_text()

    def test_counts_the_waiting_runs_into_the_step_outputs(self):
        calls, printed, written = self.run_pending({"runs": [{"id": "a", "app_id": "1"}, {"id": "b", "app_id": "2"}]})
        self.assertEqual(calls, [("GET", "/screenshots/queue?limit=50")])
        self.assertEqual(printed.strip(), "waiting=2")
        self.assertEqual(written, "earlier=1\nwaiting=2\n")

    def test_nothing_waiting(self):
        _, printed, written = self.run_pending({"runs": []})
        self.assertEqual(printed.strip(), "waiting=0")
        self.assertTrue(written.endswith("waiting=0\n"))

    def test_an_api_error_stops_the_step(self):
        with self.assertRaises(SystemExit):
            self.run_pending({"code": "unauthorized"}, status=401)

    def test_needs_no_pillow(self):
        source = (ROOT / "build" / "scripts" / "store_screenshots.py").read_text()
        self.assertNotIn("\nfrom PIL", source.split("def normalize")[0])


class EachLanguage(unittest.TestCase):
    """store_listing.py: a translation with its own screenshots (made in its language) uses them."""

    FILES = {
        "https://files.test/en1.png": png((1080, 1920)),
        "https://files.test/en2.png": png((1080, 1920)),
        "https://files.test/ar1.png": png((1080, 1920), color=(200, 10, 10)),
        "https://files.test/i-en.png": png((1320, 2868)),
        "https://files.test/i-ar.png": png((1320, 2868), color=(200, 10, 10)),
    }

    def listing(self):
        return {
            "store_title": "Harbour Books",
            "short_description": "Books delivered from the harbour shop.",
            "full_description": "x" * 60,
            "support_email": "help@harbour.test",
            "privacy_url": "https://harbour.test/privacy",
            "language": "en",
            "phone_screenshots": ["https://files.test/en1.png", "https://files.test/en2.png"],
            "iphone_screenshots": ["https://files.test/i-en.png"],
            "translations": [
                {
                    "language": "ar",
                    "store_title": "كتب الميناء",
                    "short_description": "كتب من متجر الميناء إلى بابك.",
                    "full_description": "ن" * 60,
                    "captions": [],
                    "phone_screenshots": ["https://files.test/ar1.png"],
                    "iphone_screenshots": ["https://files.test/i-ar.png"],
                },
                {"language": "tr", "store_title": "Liman Kitap", "short_description": "Liman dükkanından kitaplar kapınıza.", "full_description": "y" * 60, "captions": []},
            ],
        }

    def images(self):
        return store_listing.Images(lambda url: self.FILES[url])

    def test_play_each_language_its_own(self):
        with tempfile.TemporaryDirectory() as out, redirect_stdout(io.StringIO()):
            store_listing.cmd_play(self.listing(), None, None, out, self.images())
            phone = lambda locale: sorted(p.name for p in (Path(out) / locale / "images" / "phoneScreenshots").iterdir())
            self.assertEqual(phone("en-US"), ["1_en-US.png", "2_en-US.png"])
            self.assertEqual(phone("ar"), ["1_ar.png"])
            with Image.open(Path(out) / "ar" / "images" / "phoneScreenshots" / "1_ar.png") as image:
                self.assertEqual(image.getpixel((5, 5)), (200, 10, 10))
            # Without its own, the main ones.
            self.assertEqual(phone("tr-TR"), ["1_tr-TR.png", "2_tr-TR.png"])

    def test_appstore_each_language_its_own(self):
        with tempfile.TemporaryDirectory() as out, redirect_stdout(io.StringIO()):
            store_listing.cmd_appstore(self.listing(), out, self.images())
            ar = sorted(p.name for p in (Path(out) / "screenshots" / "ar-SA").iterdir())
            self.assertEqual(ar, ["1_ar-SA_iphone.png"])
            with Image.open(Path(out) / "screenshots" / "ar-SA" / "1_ar-SA_iphone.png") as image:
                self.assertEqual(image.getpixel((5, 5)), (200, 10, 10))

    def test_framed_in_each_language(self):
        listing = self.listing()
        listing["frame"] = {"background": "#0E0D24", "text_color": "#FFFFFF", "captions": ["Harbour Books"]}
        with tempfile.TemporaryDirectory() as out:
            store_listing.cmd_frames(listing, out, self.images())
            self.assertEqual(len(list((Path(out) / "ar" / "phone").iterdir())), 1)
            self.assertEqual(len(list((Path(out) / "en" / "phone").iterdir())), 2)


if __name__ == "__main__":
    unittest.main()
