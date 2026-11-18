"""Tests for network_retry.py (roadmap 185.2). Run: python3 -m unittest discover build/tests"""
import io
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "build" / "scripts" / "network_retry.py"
sys.path.insert(0, str(SCRIPT.parent))

import network_retry  # noqa: E402

# The failure of 18 November (run 44284453178), as Gradle printed it.
MAVEN_429 = """
FAILURE: Build failed with an exception.

* What went wrong:
A problem occurred configuring root project 'android'.
> Could not resolve all artifacts for configuration 'classpath'.
   > Could not resolve org.jetbrains.kotlin:kotlin-gradle-plugins-bom:2.2.20.
     Required by:
         root project : > org.jetbrains.kotlin.android:org.jetbrains.kotlin.android.gradle.plugin:2.2.20
      > Could not resolve org.jetbrains.kotlin:kotlin-gradle-plugins-bom:2.2.20.
         > Could not get resource 'https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-gradle-plugins-bom/2.2.20/kotlin-gradle-plugins-bom-2.2.20.pom'.
            > Could not GET 'https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-gradle-plugins-bom/2.2.20/kotlin-gradle-plugins-bom-2.2.20.pom'. Received status code 429 from server: Too Many Requests
   > Could not resolve org.jetbrains.kotlin:kotlin-stdlib:2.2.21.
            > Could not GET 'https://plugins.gradle.org/m2/org/jetbrains/kotlin/kotlin-stdlib/2.2.21/kotlin-stdlib-2.2.21.pom'. Received status code 429 from server: Too Many Requests

BUILD FAILED in 41s
Gradle task assembleRelease failed with exit code 1
"""


class RetryableTest(unittest.TestCase):
    def test_the_429_of_18_november_retries(self):
        self.assertTrue(network_retry.retryable(MAVEN_429))

    def test_server_errors_and_timeouts_retry(self):
        for line in (
            "> Could not GET 'https://dl.google.com/dl/android/maven2/x.pom'. Received status code 502 from server: Bad Gateway",
            "> Could not GET 'https://repo.maven.apache.org/x.pom'. Received status code 503 from server: Service Unavailable",
            "> Could not HEAD 'https://storage.googleapis.com/download.flutter.io/x.pom'. Received status code 500 from server: Internal Server Error",
            "      > Read timed out",
            "      > Connect to repo.maven.apache.org:443 [repo.maven.apache.org/151.101.0.215] failed: Connect timed out",
            "java.net.SocketTimeoutException: timeout",
            "> Connection reset",
            "> Remote host terminated the handshake",
            "> Could not resolve host: plugins.gradle.org",
            "java.net.UnknownHostException: repo.maven.apache.org",
            "< HTTP/2 429",
        ):
            with self.subTest(line=line):
                self.assertTrue(network_retry.retryable(f"* What went wrong:\n{line}\nBUILD FAILED in 12s\n"))

    def test_other_failures_do_not_retry(self):
        for text in (
            # A dependency no repository has: a retry finds it no more.
            "> Could not find com.example:missing:1.0.\n  Searched in the following locations:\n    - https://repo.maven.apache.org/maven2/com/example/missing/1.0/missing-1.0.pom",
            "> Could not GET 'https://maven.example.com/x.pom'. Received status code 401 from server: Unauthorized",
            "> Could not GET 'https://maven.example.com/x.pom'. Received status code 404 from server: Not Found",
            "e: file:///mobile/android/app/src/main/kotlin/MainActivity.kt:12:5 Unresolved reference: foo",
            "lib/main.dart:3:1: Error: Expected ';' after this.",
            "Execution failed for task ':app:packageRelease'.\n> Keystore was tampered with, or password was incorrect",
            "No space left on device",
            "Execution failed for task ':app:compileReleaseKotlin'.\n> Compilation error. See log for more details",
            "FAILURE: Build failed with an exception.\nBUILD FAILED in 3m 2s",
            "",
        ):
            with self.subTest(text=text):
                self.assertFalse(network_retry.retryable(text))

    def test_a_compile_error_after_a_slow_download_does_not_retry(self):
        text = "Download https://repo.maven.apache.org/x.jar Read timed out, retrying\nCompilation failed; see the compiler error output for details.\n"
        self.assertFalse(network_retry.retryable(text))


class RunTest(unittest.TestCase):
    def fake(self, results):
        calls = []

        def once(command, out):
            calls.append(command)
            return results[len(calls) - 1]

        return once, calls

    def test_retries_a_download_failure_with_the_growing_waits(self):
        once, calls = self.fake([(1, MAVEN_429), (1, MAVEN_429), (0, "BUILD SUCCESSFUL")])
        slept, log = [], io.StringIO()
        code = network_retry.run(["flutter", "build", "apk"], sleep=slept.append, log=log, once=once)
        self.assertEqual(0, code)
        self.assertEqual(3, len(calls))
        self.assertEqual([30, 90], slept)
        self.assertIn("failed on a download (attempt 1 of 4); trying again in 30 s", log.getvalue())
        self.assertIn("trying again in 90 s", log.getvalue())
        self.assertIn("passed on attempt 3 of 4", log.getvalue())

    def test_gives_up_after_three_retries(self):
        once, calls = self.fake([(1, MAVEN_429)] * 4)
        slept, log = [], io.StringIO()
        code = network_retry.run(["flutter", "build", "apk"], sleep=slept.append, log=log, once=once)
        self.assertEqual(1, code)
        self.assertEqual(4, len(calls))
        self.assertEqual([30, 90, 180], slept)
        self.assertIn("failed on a download 4 times; giving up", log.getvalue())

    def test_other_failures_fail_at_once_with_their_code(self):
        once, calls = self.fake([(2, "lib/main.dart:3:1: Error: Expected ';' after this.\nCompilation failed")])
        slept, log = [], io.StringIO()
        code = network_retry.run(["flutter", "build", "apk"], sleep=slept.append, log=log, once=once)
        self.assertEqual(2, code)
        self.assertEqual(1, len(calls))
        self.assertEqual([], slept)
        self.assertEqual("", log.getvalue())

    def test_a_first_success_says_nothing(self):
        once, calls = self.fake([(0, "BUILD SUCCESSFUL")])
        log = io.StringIO()
        self.assertEqual(0, network_retry.run(["true"], sleep=lambda s: None, log=log, once=once))
        self.assertEqual("", log.getvalue())

    def test_the_script_runs_a_real_command_and_passes_its_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            counter = Path(tmp) / "count"
            # Fails twice with a 429, then passes.
            cmd = (
                "n=$(cat \"$1\" 2>/dev/null || echo 0); n=$((n+1)); echo $n > \"$1\"; "
                "if [ $n -lt 3 ]; then echo 'Received status code 429 from server: Too Many Requests'; exit 1; fi; "
                "echo BUILD SUCCESSFUL"
            )
            env = dict(os.environ, BUILD_RETRY_WAITS="0,0,0")
            proc = subprocess.run(
                [sys.executable, str(SCRIPT), "sh", "-c", cmd, "sh", str(counter)],
                capture_output=True, text=True, env=env, timeout=30,
            )
            self.assertEqual(0, proc.returncode, proc.stderr)
            self.assertEqual(2, proc.stdout.count("Too Many Requests"))
            self.assertIn("BUILD SUCCESSFUL", proc.stdout)
            self.assertIn("passed on attempt 3 of 4", proc.stderr)

    def test_the_script_keeps_a_plain_failure_exit_code(self):
        env = dict(os.environ, BUILD_RETRY_WAITS="0,0,0")
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), "sh", "-c", "echo 'Compilation failed'; exit 3"],
            capture_output=True, text=True, env=env, timeout=30,
        )
        self.assertEqual(3, proc.returncode)
        self.assertEqual("", proc.stderr)


if __name__ == "__main__":
    unittest.main()
