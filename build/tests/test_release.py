"""Tests for what a build job gets from the queue: 87.3 the commit of a
rebuild, 89.2 the staged release (docs/api/pipeline.yaml, Build.release).

Run: python3 -m unittest discover build/tests
"""
import importlib.util
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# build/scripts/platform.py, by its path: the name is also the standard library's.
_spec = importlib.util.spec_from_file_location("yallapp_platform", ROOT / "build" / "scripts" / "platform.py")
yallapp_platform = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(yallapp_platform)


def build(**extra):
    base = {"id": "b1", "auto_publish": True, "status": "queued"}
    base.update(extra)
    return base


class QueueEntryTest(unittest.TestCase):
    def test_a_build_from_before_is_released_as_before(self):
        self.assertEqual(
            yallapp_platform.queue_entry(build()),
            {"id": "b1", "auto_publish": True, "source_ref": "", "android_rollout": "", "ios_phased": False},
        )

    def test_a_staged_release_and_a_rebuild_reach_the_jobs(self):
        entry = yallapp_platform.queue_entry(
            build(source_ref="a" * 40, release={"android_rollout": 0.1, "ios_phased": True})
        )
        self.assertEqual(entry["source_ref"], "a" * 40)
        self.assertEqual(entry["android_rollout"], "0.1")
        self.assertIs(entry["ios_phased"], True)
        self.assertEqual(yallapp_platform.queue_entry(build(release={"android_rollout": 1, "ios_phased": False}))["android_rollout"], "1")
        self.assertEqual(yallapp_platform.queue_entry(build(release={"android_rollout": None, "ios_phased": False}))["android_rollout"], "")

    def test_the_workflow_and_the_scripts_pass_them_on(self):
        workflow = (ROOT / ".github" / "workflows" / "build-apps.yml").read_text()
        self.assertIn("ANDROID_ROLLOUT: ${{ matrix.build.android_rollout }}", workflow)
        self.assertIn("IOS_PHASED: ${{ matrix.build.ios_phased }}", workflow)
        self.assertEqual(workflow.count("ref: ${{ matrix.build.source_ref || github.sha }}"), 2)
        android = (ROOT / "build" / "scripts" / "android.sh").read_text()
        self.assertIn('rollout:"${ANDROID_ROLLOUT:-}"', android)
        ios = (ROOT / "build" / "scripts" / "ios.sh").read_text()
        self.assertIn('phased:"${IOS_PHASED:-false}"', ios)
        fastfile = (ROOT / "build" / "fastlane" / "Fastfile").read_text()
        self.assertRegex(fastfile, re.compile(r'track = rollout \? "production" : "internal"'))
        self.assertIn('phased_release: options[:phased].to_s == "true"', fastfile)

    def test_138_where_the_release_went_and_the_app_review_step(self):
        """138 Google Play's report (a draft until the first release by hand), the App Store
        version made with the build's version string, and App Review left to the platform."""
        android = (ROOT / "build" / "scripts" / "android.sh").read_text()
        self.assertIn('report:"$WORK/play-release.json"', android)
        self.assertIn('platform status "$BUILD_ID" "{\\"play\\":$(cat "$WORK/play-release.json")}"', android)
        # The other Android stores upload with the client's keys on every plan.
        self.assertNotIn('[ "$AUTO_PUBLISH" != "true" ] || [ "$has" != "yes" ]', android)
        fastfile = (ROOT / "build" / "fastlane" / "Fastfile").read_text()
        self.assertIn('File.write(options[:report], JSON.generate("track" => track, "status" => sent))', fastfile)
        self.assertIn('sent = "draft"', fastfile)
        self.assertIn("automatic_release: true", fastfile)
        self.assertIn("submit_for_review: false", fastfile)
        self.assertIn("app_version: version.empty? ? nil : version", fastfile)
        ios = (ROOT / "build" / "scripts" / "ios.sh").read_text()
        self.assertIn('version:"$VERSION_NAME"', ios)
        self.assertIn('REVIEW_STAGE=pending', ios)
        self.assertIn(r'\"app_review\":\"$REVIEW_STAGE\"', ios)
        workflow = (ROOT / ".github" / "workflows" / "build-apps.yml").read_text()
        self.assertEqual(workflow.count('"app_review":"skipped"'), 2)


if __name__ == "__main__":
    unittest.main()
