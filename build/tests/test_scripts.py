"""Tests for the build pipeline's Python scripts. Run: python3 -m unittest discover build/tests"""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import report  # noqa: E402


def result(stages, artifacts=(), message=None):
    return {"stages": stages, "artifacts": list(artifacts), "message": message}


class ReportTest(unittest.TestCase):
    def test_ready_when_android_done_and_ios_skipped(self):
        apk = {"kind": "apk", "url": "https://files.yallapp.com.tr/builds/x/app-release.apk"}
        out = report.summarize(
            result({"android": "done", "upload_play": "skipped"}, [apk]),
            result({"ios": "skipped", "upload_testflight": "skipped"}, message="Add your App Store Connect key."),
        )
        self.assertEqual("ready", out["status"])
        self.assertEqual([apk], out["artifacts"])
        self.assertEqual("Add your App Store Connect key.", out["message"])

    def test_failed_when_either_build_fails(self):
        self.assertEqual("failed", report.summarize(result({"android": "failed"}), result({"ios": "done"}))["status"])
        self.assertEqual("failed", report.summarize(result({"android": "done"}), result({"ios": "failed"}))["status"])

    def test_store_upload_failure_keeps_the_files(self):
        out = report.summarize(
            result({"android": "done", "upload_play": "failed"}, [{"kind": "aab", "url": "https://f/a.aab"}], "Upload failed."),
            result({"ios": "done", "upload_testflight": "done"}, [{"kind": "ipa", "url": "https://f/a.ipa"}]),
        )
        self.assertEqual("ready", out["status"])
        self.assertEqual(2, len(out["artifacts"]))
        self.assertEqual("failed", out["stages"]["upload_play"])

    def test_missing_result_counts_as_failed(self):
        with tempfile.TemporaryDirectory() as tmp:
            loaded = report.load(tmp, "android", "abc")
        self.assertEqual("failed", loaded["stages"]["android"])


@unittest.skipUnless(shutil.which("python3"), "python3 missing")
class IconsTest(unittest.TestCase):
    def test_writes_android_and_ios_icons(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow not installed")
        import make_icons

        with tempfile.TemporaryDirectory() as tmp:
            mobile = Path(tmp)
            shutil.copytree(ROOT / "mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset", mobile / "ios/Runner/Assets.xcassets/AppIcon.appiconset")
            icon = mobile / "icon.png"
            Image.new("RGBA", (1024, 1024), (255, 90, 31, 255)).save(icon)
            sys.argv = ["make_icons.py", str(icon), str(mobile)]
            make_icons.main()
            res = mobile / "android/app/src/main/res"
            self.assertEqual((192, 192), Image.open(res / "mipmap-xxxhdpi/ic_launcher.png").size)
            self.assertEqual((432, 432), Image.open(res / "mipmap-xxxhdpi/ic_launcher_foreground.png").size)
            self.assertNotIn("monochrome", (res / "mipmap-anydpi-v26/ic_launcher.xml").read_text())
            big = Image.open(mobile / "ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png")
            self.assertEqual(("RGB", (1024, 1024)), (big.mode, big.size))
            contents = json.loads((mobile / "ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json").read_text())
            self.assertTrue(contents["images"])


if __name__ == "__main__":
    unittest.main()
