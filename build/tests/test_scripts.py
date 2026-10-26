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

    def test_failed_when_the_android_app_fails(self):
        out = report.summarize(
            result({"android": "failed"}, message="The Android app couldn't be built."),
            result({"ios": "skipped"}, message="Add your App Store Connect key."),
        )
        self.assertEqual("failed", out["status"])
        # Only why it failed: the iOS hint doesn't belong in a failure message.
        self.assertEqual("The Android app couldn't be built.", out["message"])

    def test_android_files_stay_usable_when_only_ios_fails(self):
        apk = {"kind": "apk", "url": "https://f/a.apk"}
        out = report.summarize(result({"android": "done"}, [apk]), result({"ios": "failed"}, message="The iOS app couldn't be built."))
        self.assertEqual("ready", out["status"])
        self.assertEqual("failed", out["stages"]["ios"])
        self.assertEqual([apk], out["artifacts"])
        self.assertIn("the iOS app couldn't be built", out["message"])

    def test_messages_are_plain_words(self):
        for platform in ("android", "ios"):
            message = report.FAILED[platform]["message"]
            self.assertNotIn("We'll", message)
            self.assertTrue(message.endswith("."))

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


class StoreAssetsTest(unittest.TestCase):
    def setUp(self):
        try:
            import PIL  # noqa: F401
        except ImportError:
            self.skipTest("Pillow not installed")

    def run_script(self, tmp, logo=None, splash="#F4EFE6", extra=None):
        from PIL import Image
        import store_assets

        tmp = Path(tmp)
        Image.new("RGB", (1024, 1024), (255, 90, 31)).save(tmp / "icon.png")
        Image.new("RGB", (1080, 1920), (20, 20, 20)).save(tmp / "phone.png")
        Image.new("RGB", (1290, 2796), (30, 30, 30)).save(tmp / "iphone.jpg", "JPEG")
        branding = {"splash_color": splash, "primary_color": "#0E0D24"}
        if logo:
            branding["logo_url"] = (tmp / logo).as_uri()
        (tmp / "config.json").write_text(json.dumps({"app_name": "Dental Academy", "branding": branding}))
        (tmp / "store.json").write_text(json.dumps({
            "store_title": "Dental Academy",
            "short_description": "Courses for dentists",
            "full_description": "Learn anywhere.",
            "support_email": "help@academy.test",
            "privacy_url": "https://academy.test/privacy",
            "phone_screenshots": [(tmp / "phone.png").as_uri(), (tmp / "phone.png").as_uri()],
            "iphone_screenshots": [(tmp / "iphone.jpg").as_uri()],
            **(extra(tmp) if extra else {}),
        }))
        out = tmp / "store-assets.zip"
        store_assets.main(tmp / "config.json", tmp / "store.json", tmp / "icon.png", out)
        return out

    def test_packs_icons_feature_graphic_screenshots_and_listing(self):
        import zipfile
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            with zipfile.ZipFile(self.run_script(tmp)) as archive:
                names = set(archive.namelist())
                self.assertEqual({
                    "google-play/icon-512.png",
                    "google-play/feature-graphic.png",
                    "google-play/phone-screenshots/01.png",
                    "google-play/phone-screenshots/02.png",
                    "app-store/icon-1024.png",
                    "app-store/iphone-screenshots/01.jpg",
                    "listing.txt",
                }, names)
                feature = Image.open(archive.open("google-play/feature-graphic.png"))
                self.assertEqual(((1024, 500), "RGB"), (feature.size, feature.mode))
                self.assertEqual((512, 512), Image.open(archive.open("google-play/icon-512.png")).size)
                app_store_icon = Image.open(archive.open("app-store/icon-1024.png"))
                self.assertEqual(("RGB", (1024, 1024)), (app_store_icon.mode, app_store_icon.size))
                self.assertIn("Courses for dentists", archive.read("listing.txt").decode())

    def test_packs_tablet_screenshots_other_languages_and_framed_screenshots(self):
        import zipfile
        from PIL import Image

        def extra(tmp):
            Image.new("RGB", (2064, 2752), (40, 40, 40)).save(tmp / "ipad.png")
            return {
                "tablet_screenshots": [(tmp / "phone.png").as_uri()],
                "ipad_screenshots": [(tmp / "ipad.png").as_uri()],
                "language": "en",
                "translations": [{"language": "ar", "store_title": "أكاديمية الأسنان", "short_description": "دورات لأطباء الأسنان", "full_description": "تعلّم في أي مكان."}],
                "frame": {"background": "#0E0D24", "text_color": "#FFFFFF", "captions": ["Learn anywhere"]},
            }

        with tempfile.TemporaryDirectory() as tmp:
            with zipfile.ZipFile(self.run_script(tmp, extra=extra)) as archive:
                names = set(archive.namelist())
                self.assertIn("google-play/tablet-screenshots/01.png", names)
                self.assertIn("app-store/ipad-screenshots/01.png", names)
                self.assertIn("دورات لأطباء الأسنان", archive.read("listing-ar.txt").decode())
                self.assertIn("help@academy.test", archive.read("listing-ar.txt").decode())
                for path in ("framed/en/phone/1_en.png", "framed/ar/phone/2_ar.png", "framed/ar/tablet/1_ar.png", "framed/en/ipad/1_en.png"):
                    self.assertIn(path, names)
                self.assertEqual((2064, 2752), Image.open(archive.open("framed/en/ipad/1_en.png")).size)
            self.assertTrue((Path(tmp) / "feature-graphic.png").exists())

    def test_feature_graphic_uses_a_png_logo_and_ignores_svg(self):
        import zipfile
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            Image.new("RGBA", (800, 200), (0, 0, 0, 255)).save(Path(tmp) / "logo.png")
            (Path(tmp) / "logo.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'/>")
            with zipfile.ZipFile(self.run_script(tmp, logo="logo.png")) as archive:
                feature = Image.open(archive.open("google-play/feature-graphic.png")).convert("RGB")
                self.assertEqual((0, 0, 0), feature.getpixel((512, 250)))
            with zipfile.ZipFile(self.run_script(tmp, logo="logo.svg", splash="#0E0D24")) as archive:
                self.assertIn("google-play/feature-graphic.png", archive.namelist())

    def test_text_color_contrasts_with_the_background(self):
        import store_assets

        self.assertEqual(store_assets.MIDNIGHT, store_assets.text_color((244, 239, 230)))
        self.assertEqual(store_assets.WHITE, store_assets.text_color((14, 13, 36)))


if __name__ == "__main__":
    unittest.main()


class AppStoreKeyTest(unittest.TestCase):
    """The App Store Connect key reaches fastlane in a shape OpenSSL reads ("invalid curve name")."""

    @classmethod
    def setUpClass(cls):
        import subprocess

        cls.pem = subprocess.run(
            ["openssl", "genpkey", "-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256"],
            capture_output=True, text=True, check=True,
        ).stdout

    def secrets(self, key):
        folder = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, folder)
        path = Path(folder) / "secrets.json"
        path.write_text(json.dumps({"app_store_connect": {"key_id": "ABC123DEFG", "issuer_id": "x", "private_key": key}}))
        return path

    def test_keys_that_lost_their_shape_are_rewrapped(self):
        import p8_key

        for key in (
            self.pem,
            self.pem.replace("\n", " "),
            self.pem.replace("\n", "\r\n"),
            "﻿" + self.pem,
            "\n".join("  " + line for line in self.pem.split("\n")),
        ):
            path = self.secrets(key)
            self.assertEqual(0, p8_key.main(str(path)))
            self.assertEqual(self.pem, json.loads(path.read_text())["app_store_connect"]["private_key"])

    def test_an_unreadable_key_is_refused(self):
        import p8_key

        broken = self.pem.replace(self.pem.split("\n")[1], "AAAA" * 16)
        self.assertEqual(1, p8_key.main(str(self.secrets(broken))))
        self.assertEqual(1, p8_key.main(str(self.secrets("not a key"))))

    def test_no_key(self):
        import p8_key

        self.assertEqual(2, p8_key.main(str(self.secrets(""))))


class FingerprintTest(unittest.TestCase):
    """46 The upload key's SHA-256 for the link files, as keytool prints it."""

    @unittest.skipUnless(shutil.which("keytool"), "keytool is needed")
    def test_matches_keytool(self):
        import re
        import subprocess

        folder = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, folder)
        store = folder / "upload.jks"
        subprocess.run(
            ["keytool", "-genkeypair", "-noprompt", "-storetype", "PKCS12", "-keystore", str(store), "-alias", "upload",
             "-keyalg", "RSA", "-keysize", "2048", "-validity", "30", "-storepass", "test-password-123456", "-keypass",
             "test-password-123456", "-dname", "CN=Test"],
            check=True, capture_output=True,
        )
        der = subprocess.run(
            ["keytool", "-exportcert", "-keystore", str(store), "-storepass", "test-password-123456", "-alias", "upload"],
            check=True, capture_output=True,
        ).stdout
        listing = subprocess.run(
            ["keytool", "-list", "-v", "-keystore", str(store), "-storepass", "test-password-123456", "-alias", "upload"],
            check=True, capture_output=True, text=True,
        ).stdout
        expected = re.search(r"SHA256:\s*([0-9A-F:]{95})", listing).group(1)
        out = subprocess.run([sys.executable, str(ROOT / "build" / "scripts" / "fingerprint.py")], input=der, capture_output=True, check=True)
        self.assertEqual(expected, out.stdout.decode().strip())
        self.assertRegex(expected, r"^([0-9A-F]{2}:){31}[0-9A-F]{2}$")

    def test_nothing_without_a_certificate(self):
        import subprocess

        out = subprocess.run([sys.executable, str(ROOT / "build" / "scripts" / "fingerprint.py")], input=b"", capture_output=True)
        self.assertEqual(1, out.returncode)
        self.assertEqual(b"", out.stdout)
