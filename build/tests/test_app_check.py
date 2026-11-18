"""Tests for app_check.py: how the check after a build reads what the browser saw (roadmap 182).

Run: python3 -m unittest discover build/tests
"""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import app_check  # noqa: E402


def line(kind, message, **extra):
    return json.dumps({"kind": kind, "message": message, **extra})


def output(*passes, check_mode=True, stopped=None):
    return {"passes": list(passes), "check_mode": check_mode, "stopped": stopped}


def run(lang, scale, *routes):
    return {"lang": lang, "scale": scale, "routes": list(routes)}


def screen(route, lines=(), page_errors=(), failed=(), loaded=True):
    return {"route": route, "lines": list(lines), "page_errors": list(page_errors), "failed": list(failed), "loaded": loaded}


class IssuesTest(unittest.TestCase):
    def test_overflow_from_the_check_mode_and_from_flutter_itself(self):
        out = output(
            run(
                "ar",
                1.3,
                screen("/page/orders", lines=[line("ready", "check mode"), line("overflow", "A RenderFlex overflowed by 18.0 pixels on the right.")]),
                screen("/", lines=[line("error", "A RenderFlex overflowed by 91 pixels on the bottom.")]),
            )
        )
        issues = app_check.issues_of(out)
        self.assertEqual([i["kind"] for i in issues], ["overflow", "overflow"])
        self.assertEqual(issues[0], {"kind": "overflow", "lang": "ar", "scale": 1.3, "route": "/page/orders", "message": "A RenderFlex overflowed by 18.0 pixels on the right."})

    def test_errors_uncaught_and_flutter_ones(self):
        out = output(run("en", 1, screen("/shop", lines=[line("error", "Null check operator used on a null value")], page_errors=["TypeError: x is undefined\n  at main.dart.js:1"])))
        issues = app_check.issues_of(out)
        self.assertEqual([(i["kind"], i["message"]) for i in issues], [("error", "Null check operator used on a null value"), ("error", "TypeError: x is undefined at main.dart.js:1")])

    def test_failed_requests_without_their_query_and_not_other_sites_fonts(self):
        out = output(
            run(
                "en",
                1,
                screen(
                    "/page/home",
                    failed=[
                        {"url": "https://yallapp.test/api/app/abc/pages/offers?token=secret", "status": "500"},
                        {"url": "https://fonts.gstatic.com/s/x.woff2", "status": "net::ERR_FAILED"},
                        {"url": "data:image/png;base64,AAAA", "status": "net::ERR_FAILED"},
                    ],
                ),
            )
        )
        issues = app_check.issues_of(out)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["kind"], "request")
        self.assertEqual(issues[0]["route"], "yallapp.test/api/app/abc/pages/offers")
        self.assertNotIn("secret", json.dumps(issues))
        self.assertEqual(issues[0]["message"], "500 on /page/home")

    def test_the_same_issue_once_per_pass_and_screen(self):
        overflow = line("overflow", "A RenderFlex overflowed by 4.0 pixels on the right.")
        out = output(run("en", 1, screen("/", lines=[overflow, overflow])), run("ar", 1.3, screen("/", lines=[overflow])))
        issues = app_check.issues_of(out)
        self.assertEqual([(i["lang"], i["scale"]) for i in issues], [("en", 1), ("ar", 1.3)])

    def test_lines_that_are_not_json_are_skipped(self):
        out = output(run("en", 1, screen("/", lines=["not json", line("ready", "check mode")])))
        self.assertEqual(app_check.issues_of(out), [])

    def test_long_messages_are_cut(self):
        out = output(run("en", 1, screen("/", lines=[line("error", "x" * 2000)])))
        self.assertEqual(len(app_check.issues_of(out)[0]["message"]), 500)


class ResultTest(unittest.TestCase):
    def test_done_with_the_screens_each_pass_opened(self):
        out = output(run("en", 1, screen("/"), screen("/shop"), screen("/cart", loaded=False)), run("ar", 1.3, screen("/")))
        result = app_check.result_of(out)
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["passes"], [{"lang": "en", "scale": 1, "routes": 2}, {"lang": "ar", "scale": 1.3, "routes": 1}])
        self.assertTrue(result["check_mode"])
        self.assertNotIn("message", result)

    def test_failed_when_nothing_opened(self):
        result = app_check.result_of(output(run("en", 1, screen("/", loaded=False)), check_mode=False))
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["message"], "No screen of the app opened in the browser.")
        self.assertFalse(result["check_mode"])

    def test_out_of_time_says_so(self):
        result = app_check.result_of(output(run("en", 1, screen("/")), stopped="The time for the check ran out after 1 screens of en at 1."))
        self.assertEqual(result["status"], "done")
        self.assertIn("ran out", result["message"])

    def test_the_report_matches_the_pipeline_contract(self):
        result = app_check.result_of(output(run("en", 1, screen("/", lines=[line("overflow", "A RenderFlex overflowed by 2 pixels on the right.")]))))
        self.assertEqual(set(result), {"status", "passes", "issues", "check_mode"})
        self.assertEqual(set(result["issues"][0]), {"kind", "lang", "scale", "route", "message"})


if __name__ == "__main__":
    unittest.main()
