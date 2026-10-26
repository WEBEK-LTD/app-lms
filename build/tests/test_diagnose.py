"""87.2 Why a build failed, from its output, and the log the client may read. Run: python3 -m unittest discover build/tests"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import diagnose  # noqa: E402
import report  # noqa: E402


class DiagnoseTest(unittest.TestCase):
    def code(self, *lines):
        return diagnose.diagnose("\n".join(["> Task :app:compileReleaseKotlin", *lines, "FAILURE: Build failed with an exception."]))["code"]

    def test_knows_the_usual_causes(self):
        self.assertEqual("firebase_android", self.code("Execution failed for task ':app:processReleaseGoogleServices'.", "> No matching client found for package name 'com.rose.shop'"))
        self.assertEqual("android_signing", self.code("Keystore was tampered with, or password was incorrect"))
        self.assertEqual("ios_signing", self.code("error: No profiles for 'com.rose.shop' were found"))
        self.assertEqual("apple_key", self.code("[!] NOT_AUTHORIZED: Authentication credentials are missing or invalid."))
        self.assertEqual("apple_agreement", self.code("FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED"))
        self.assertEqual("version_used", self.code("Google Api Error: Invalid request - Version code 12 has already been used."))
        self.assertEqual("play_app_missing", self.code("Google Api Error: applicationNotFound: Package not found: com.rose.shop."))
        self.assertEqual("play_permission", self.code("Google Api Error: The caller does not have permission"))
        self.assertEqual("infrastructure", self.code("curl: (6) Could not resolve host: files.yallapp.com.tr"))
        self.assertEqual("unknown", self.code("e: something nobody has seen before"))

    def test_the_newest_cause_wins(self):
        # An early retry that recovered doesn't decide it; the last error does.
        self.assertEqual("android_signing", self.code("Connection timed out", "retrying...", "Keystore was tampered with, or password was incorrect"))

    def test_the_log_keeps_no_secret(self):
        text = "\n".join([
            "::add-mask::s3cr3t",
            "##[group]Run fastlane",
            "password=hunter2-very-long",
            "Authorization: Bearer abc.def.ghi",
            "Using key AIzaSyD-abcdefghijklmnopqrstuvwxyz123",
            "-----BEGIN PRIVATE KEY-----",
            "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg",
            "-----END PRIVATE KEY-----",
            "Uploading to https://files.yallapp.com.tr/builds/1f0c/app.apk?expires=1&sig=abcdef",
            "Owner owner@rose.shop asked for it",
            "Reading /home/runner/work/app-lms/app-lms/mobile/pubspec.yaml",
            "A" * 80,
            "Build failed.",
        ])
        log = diagnose.diagnose(text)["log"]
        for secret in ["hunter2", "abc.def.ghi", "AIzaSyD", "MIGTAgEA", "sig=abcdef", "owner@rose.shop", "/home/runner", "A" * 80, "add-mask", "##[group]"]:
            self.assertNotIn(secret, log)
        self.assertIn("password=[hidden]", log)
        self.assertIn("Build failed.", log)
        self.assertIn("Reading …", log)

    def test_the_log_is_the_end_of_the_output(self):
        log = diagnose.diagnose("\n".join(f"line {n}" for n in range(1000)))["log"]
        self.assertEqual(diagnose.LOG_LINES, len(log.splitlines()))
        self.assertTrue(log.endswith("line 999"))

    def test_the_report_carries_the_android_failure_first(self):
        android = {"stages": {"android": "failed"}, "artifacts": [], "message": None, "failure": {"code": "android_signing", "stage": "android", "log": "x"}}
        ios = {"stages": {"ios": "failed"}, "artifacts": [], "message": None, "failure": {"code": "ios_signing", "stage": "ios", "log": "y"}}
        self.assertEqual("android_signing", report.summarize(android, ios)["failure"]["code"])
        done = {"stages": {"android": "done", "upload_play": "failed"}, "artifacts": [], "message": "m", "failure": {"code": "play_app_missing", "stage": "upload_play", "log": "z"}}
        self.assertEqual("ios_signing", report.summarize(done, ios)["failure"]["code"])
        self.assertEqual("play_app_missing", report.summarize(done, {"stages": {"ios": "skipped"}, "artifacts": [], "message": None})["failure"]["code"])
        self.assertNotIn("failure", report.summarize({"stages": {"android": "done"}, "artifacts": [], "message": None}, {"stages": {"ios": "skipped"}, "artifacts": [], "message": None}))


if __name__ == "__main__":
    unittest.main()
