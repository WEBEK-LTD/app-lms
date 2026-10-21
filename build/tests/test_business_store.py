"""Tests for business_store.py: Yallapp Business's store listing and Firebase options (roadmap 65)."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import business_store as store  # noqa: E402

GOOGLE_SERVICES = {
    "project_info": {"project_number": "123456789012", "project_id": "yallapp-business"},
    "client": [
        {
            "client_info": {"mobilesdk_app_id": "1:123:android:other", "android_client_info": {"package_name": "tr.com.other"}},
            "api_key": [{"current_key": "other-key"}],
        },
        {
            "client_info": {"mobilesdk_app_id": "1:123:android:abc", "android_client_info": {"package_name": "tr.com.yallapp.business"}},
            "api_key": [{"current_key": "android-key"}],
        },
    ],
}

GOOGLE_SERVICE_INFO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>API_KEY</key><string>ios-key</string>
  <key>GCM_SENDER_ID</key><string>123456789012</string>
  <key>BUNDLE_ID</key><string>tr.com.yallapp.business</string>
  <key>PROJECT_ID</key><string>yallapp-business</string>
  <key>GOOGLE_APP_ID</key><string>1:123:ios:def</string>
</dict>
</plist>
"""


class ListingTest(unittest.TestCase):
    def test_every_language_has_every_file_within_the_limits(self):
        self.assertEqual([], store.problems())

    def test_the_three_languages(self):
        self.assertEqual(["en", "ar", "tr"], [lang for lang, _, _ in store.LANGUAGES])
        for _, play, locale in store.LANGUAGES:
            self.assertTrue((store.STORE / "android" / play).is_dir(), play)
            self.assertTrue((store.STORE / "ios" / locale).is_dir(), locale)

    def test_the_name_and_the_addresses(self):
        for _, play, locale in store.LANGUAGES:
            self.assertEqual("Yallapp Business", store.read(store.STORE / "android" / play / "title.txt"))
            self.assertEqual("Yallapp Business", store.read(store.STORE / "ios" / locale / "name.txt"))
            self.assertTrue(store.read(store.STORE / "ios" / locale / "privacy_url.txt").endswith("/privacy"))
            self.assertTrue(store.read(store.STORE / "ios" / locale / "marketing_url.txt").startswith("https://yallapp.com.tr"))

    def test_the_limits_are_checked(self):
        with tempfile.TemporaryDirectory() as tmp:
            copy = Path(tmp) / "store"
            import shutil

            shutil.copytree(store.STORE, copy)
            (copy / "ios" / "tr" / "subtitle.txt").write_text("x" * 31)
            (copy / "ios" / "ar-SA" / "keywords.txt").write_text("ت" * 51)  # 102 bytes
            (copy / "android" / "en-US" / "short_description.txt").unlink()
            (copy / "ios" / "en-US" / "promotional_text.txt").write_text("Now with AI-powered answers")
            with mock.patch.object(store, "STORE", copy), mock.patch.object(store, "ROOT", Path(tmp)):
                found = "\n".join(store.problems())
        self.assertIn("31 > 30: store/ios/tr/subtitle.txt", found)
        self.assertIn("102 > 100: store/ios/ar-SA/keywords.txt", found)
        self.assertIn("missing: store/android/en-US/short_description.txt", found)
        self.assertIn("ai-powered", found)

    def test_the_age_rating_answers(self):
        answers = json.loads((store.STORE / "ios" / "age_rating.json").read_text())
        self.assertFalse(answers["advertising"])
        self.assertFalse(answers["gambling"])
        self.assertFalse(answers["unrestrictedWebAccess"])
        # Owners answer their customers and moderate their reviews and questions.
        self.assertTrue(answers["messagingAndChat"])
        self.assertTrue(answers["userGeneratedContent"])

    def test_review_notes_say_there_are_no_payments(self):
        notes = store.read(store.STORE / "ios" / "review_notes.txt")
        self.assertIn("no in-app purchases", notes)
        self.assertIn("no sign-up", notes)


class AssembleTest(unittest.TestCase):
    def shots(self, folder):
        from PIL import Image

        devices = (
            ("android-phone", (108, 192)),
            ("android-tablet", (160, 256)),
            ("iphone", (129, 280)),
            ("iphone-65", (128, 278)),
            ("ipad", (206, 275)),
        )
        for device, size in devices:
            for lang in ("en", "ar", "tr"):
                path = Path(folder) / device / lang
                path.mkdir(parents=True)
                for index, name in enumerate(("today", "orders"), 1):
                    Image.new("RGBA", size, (14, 13, 36, 255)).save(path / f"{index}_{name}.png")

    def test_play_layout(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.shots(Path(tmp) / "shots")
            out = Path(tmp) / "play"
            store.cmd_play(out, Path(tmp) / "shots")
            for _, play, _ in store.LANGUAGES:
                for name in store.PLAY_FILES:
                    self.assertTrue((out / play / name).is_file(), name)
                self.assertTrue((out / play / "images" / "icon.png").is_file())
                self.assertTrue((out / play / "images" / "featureGraphic.png").is_file())
                for folder in ("phoneScreenshots", "sevenInchScreenshots", "tenInchScreenshots"):
                    shots = sorted(p.name for p in (out / play / "images" / folder).iterdir())
                    self.assertEqual([f"1_{play}.png", f"2_{play}.png"], shots, folder)
            from PIL import Image

            with Image.open(out / "ar" / "images" / "tenInchScreenshots" / "1_ar.png") as image:
                self.assertEqual((160, 256), image.size)
            from PIL import Image

            with Image.open(out / "ar" / "images" / "phoneScreenshots" / "1_ar.png") as image:
                self.assertEqual("RGB", image.mode)  # no alpha

    def test_appstore_layout_and_review_details(self):
        env = {
            "YB_APP_REVIEW_FIRST_NAME": "Layla",
            "YB_APP_REVIEW_DEMO_USER": "review@example.com",
            "YB_APP_REVIEW_DEMO_PASSWORD": "not-a-real-password",
        }
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(os.environ, env, clear=False):
            for key in ("YB_APP_REVIEW_LAST_NAME", "YB_APP_REVIEW_PHONE", "YB_APP_REVIEW_EMAIL"):
                os.environ.pop(key, None)
            self.shots(Path(tmp) / "shots")
            out = Path(tmp) / "asc"
            store.cmd_appstore(out, Path(tmp) / "shots")
            for _, _, locale in store.LANGUAGES:
                # Release notes stay out of the metadata: Apple refuses them on a first version.
                self.assertFalse((out / "metadata" / locale / "release_notes.txt").exists())
                self.assertTrue((out / "release_notes" / f"{locale}.txt").is_file())
                self.assertTrue((out / "metadata" / locale / "keywords.txt").is_file())
                shots = sorted(p.name for p in (out / "screenshots" / locale).iterdir())
                self.assertEqual(
                    ["ipad_1.png", "ipad_2.png", "iphone-65_1.png", "iphone-65_2.png", "iphone_1.png", "iphone_2.png"],
                    shots,
                )
            self.assertEqual("BUSINESS", store.read(out / "metadata" / "primary_category.txt"))
            review = json.loads((out / "review.json").read_text())
            self.assertEqual(0o600, (out / "review.json").stat().st_mode & 0o777)
        self.assertEqual("Layla", review["first_name"])
        self.assertEqual("info@yallapp.com.tr", review["email_address"])
        self.assertEqual("review@example.com", review["demo_user"])
        self.assertNotIn("last_name", review)  # kept as it is in App Store Connect
        self.assertIn("no in-app purchases", review["notes"])


class FirebaseTest(unittest.TestCase):
    def test_android_from_the_variables(self):
        env = {
            "YB_FIREBASE_PROJECT_ID": "yallapp-business",
            "YB_FIREBASE_SENDER_ID": "123",
            "YB_FIREBASE_APP_ID_ANDROID": "1:123:android:abc",
            "YB_FIREBASE_API_KEY_ANDROID": " android-key\n",
        }
        values, line = store.firebase_options("android", env)
        self.assertEqual("android-key", values["YB_FIREBASE_API_KEY_ANDROID"])
        self.assertIn("Pushes: on", line)
        self.assertNotIn("android-key", line)

    def test_android_from_a_whole_google_services_json(self):
        env = {"YB_FIREBASE_APP_ID_ANDROID": "  " + json.dumps(GOOGLE_SERVICES)}
        values, line = store.firebase_options("android", env)
        self.assertEqual(
            {
                "YB_FIREBASE_PROJECT_ID": "yallapp-business",
                "YB_FIREBASE_SENDER_ID": "123456789012",
                "YB_FIREBASE_APP_ID_ANDROID": "1:123:android:abc",
                "YB_FIREBASE_API_KEY_ANDROID": "android-key",
            },
            values,
        )
        self.assertIn("google-services.json in YB_FIREBASE_APP_ID_ANDROID", line)

    def test_ios_from_a_whole_google_service_info_plist(self):
        values, line = store.firebase_options("ios", {"YB_FIREBASE_API_KEY_IOS": GOOGLE_SERVICE_INFO})
        self.assertEqual("1:123:ios:def", values["YB_FIREBASE_APP_ID_IOS"])
        self.assertEqual("ios-key", values["YB_FIREBASE_API_KEY_IOS"])
        self.assertEqual("123456789012", values["YB_FIREBASE_SENDER_ID"])
        self.assertIn("GoogleService-Info.plist", line)

    def test_ios_plist_of_another_app_is_refused(self):
        with self.assertRaises(ValueError):
            store.firebase_options("ios", {"YB_FIREBASE_APP_ID_IOS": GOOGLE_SERVICE_INFO.replace("tr.com.yallapp.business", "tr.com.other")})

    def test_missing_options_mean_no_pushes(self):
        values, line = store.firebase_options("ios", {"YB_FIREBASE_PROJECT_ID": "p", "YB_FIREBASE_SENDER_ID": "1"})
        self.assertEqual({}, values)
        self.assertIn("missing YB_FIREBASE_APP_ID_IOS, YB_FIREBASE_API_KEY_IOS", line)

    def test_the_json_file_for_dart_defines(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(os.environ, {}, clear=True):
            out = Path(tmp) / "firebase.json"
            self.assertEqual(0, store.cmd_firebase("android", out))
            self.assertEqual({}, json.loads(out.read_text()))


if __name__ == "__main__":
    unittest.main()
