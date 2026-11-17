"""Tests for app_review.py: a client's App Store App Review Information (roadmap 102.2)."""
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import app_review  # noqa: E402

CONTACT = {"first_name": "Layla", "last_name": "Ahmed", "phone": "+905321112233", "email": "help@academy.test"}


def payload(**patch):
    review = {"kind": "code", "demo_user": "+905320000000", "demo_password": "246810", "notes": "Open My courses.", "contact": dict(CONTACT)}
    review.update(patch)
    return review


class ReviewInformationTest(unittest.TestCase):
    def test_code_apps_say_how_to_sign_in(self):
        info = app_review.review_information(payload())
        self.assertEqual(
            {
                "demo_user": "+905320000000",
                "demo_password": "246810",
                "notes": "Sign in with +905320000000 and the code 246810; no message is sent.\n\nOpen My courses.",
                "first_name": "Layla",
                "last_name": "Ahmed",
                "phone_number": "+905321112233",
                "email_address": "help@academy.test",
            },
            info,
        )

    def test_account_apps_keep_the_password_out_of_the_notes(self):
        info = app_review.review_information(payload(kind="account", demo_user="review@academy.test", demo_password="s3cret pass", notes=None))
        self.assertEqual("review@academy.test", info["demo_user"])
        self.assertEqual("s3cret pass", info["demo_password"])
        self.assertEqual("Sign in with the account review@academy.test and the password in the demo account fields.", info["notes"])
        self.assertNotIn("s3cret", info["notes"])

    def test_missing_contact_fields_are_left_out(self):
        info = app_review.review_information(payload(contact={"first_name": "Layla", "last_name": None, "phone": "  ", "email": None}))
        self.assertEqual("Layla", info["first_name"])
        for key in ("last_name", "phone_number", "email_address"):
            self.assertNotIn(key, info)
        self.assertNotIn("first_name", app_review.review_information(payload(contact=None)))

    def test_notes_keep_apples_limit(self):
        self.assertEqual(app_review.NOTES_MAX, len(app_review.review_information(payload(notes="n" * 5000))["notes"]))

    def test_skipped_without_a_sign_in(self):
        self.assertIsNone(app_review.review_information(None))
        self.assertIsNone(app_review.review_information(payload(demo_user=" ")))
        self.assertIsNone(app_review.review_information(payload(demo_password="")))


class MainTest(unittest.TestCase):
    def run_main(self, secrets):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "secrets.json"
            target = Path(folder) / "review.json"
            source.write_text(json.dumps(secrets))
            out = io.StringIO()
            with redirect_stdout(out):
                code = app_review.main(["app_review.py", str(source), str(target)])
            written = json.loads(target.read_text()) if target.exists() else None
            mode = target.stat().st_mode & 0o777 if target.exists() else None
        return code, written, mode, out.getvalue()

    def test_writes_a_private_file_and_never_prints_the_secret(self):
        code, written, mode, printed = self.run_main({"app_review": payload(contact={"first_name": "Layla", "last_name": None, "phone": None, "email": "help@academy.test"})})
        self.assertEqual(0, code)
        self.assertEqual(0o600, mode)
        self.assertEqual("246810", written["demo_password"])
        self.assertNotIn("246810", printed)
        self.assertIn("first_name, email_address", printed)
        self.assertIn("kept as they are in App Store Connect: last_name, phone_number", printed)

    def test_skips_without_a_sign_in(self):
        code, written, _, printed = self.run_main({"app_store_connect": None, "app_review": None})
        self.assertEqual(2, code)
        self.assertIsNone(written)
        self.assertIn("stays as it is", printed)
        # Older platforms send no app_review at all.
        self.assertEqual(2, self.run_main({})[0])


if __name__ == "__main__":
    unittest.main()
