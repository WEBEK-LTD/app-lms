#!/usr/bin/env python3
"""Runs a build command again when it failed on a download (roadmap 185.2).

Usage: network_retry.py <command> [arguments...]

Maven Central, the Gradle Plugin Portal and Flutter's own Maven repository can answer
429 Too Many Requests, a 5xx or time out while several clients' apps build at once. When
the command fails and its output says so, it runs again after 30 s, 90 s and 180 s; any
other failure (code that doesn't compile, a dependency that doesn't exist, a 404 or 401)
fails at once, with the command's own exit code. The command's output goes through as is,
so build.log and diagnose.py see every attempt.

BUILD_RETRY_WAITS (seconds, comma-separated, e.g. "0,0") replaces the waits, for tests.
"""
import collections
import os
import re
import subprocess
import sys
import time

WAITS = (30, 90, 180)

# What a download that may work a little later prints (Gradle, Flutter's Gradle plugin, curl).
RETRYABLE = [
    re.compile(p, re.I)
    for p in (
        r"\b429\b.*Too Many Requests",
        r"Too Many Requests.*\b429\b",
        r"Received status code (429|5\d\d)\b",
        r"status code (429|5\d\d) from server",
        r"\bHTTP/[\d.]+ (429|5\d\d)\b",
        r"\b(502 Bad Gateway|503 Service Unavailable|504 Gateway Time-?out)\b",
        r"\b(Read|Connect) timed out\b",
        r"\bConnection timed out\b",
        r"SocketTimeoutException",
        r"Connection reset( by peer)?\b",
        r"Remote host terminated the handshake",
        r"\bUnknownHostException\b",
        r"Could not resolve host",
        r"Temporary failure in name resolution",
        r"The server may not support the client's requested TLS protocol",
    )
]

# The output a retry can't change, even next to a download message.
NOT_RETRYABLE = [
    re.compile(p)
    for p in (
        r"Could not find [\w.-]+:[\w.-]+:",  # the dependency doesn't exist in any repository
        r"Received status code (400|401|403|404)\b",
        r"No space left on device",
        r"Compilation failed|Compilation error|error: .*\.(kt|java|dart):\d+",
        r"Keystore was tampered with|Failed to read key",
    )
]

# The end of the output is where the failure is said.
TAIL_LINES = 400


def retryable(text):
    """True when a failed command's output says a download failed in a way that may pass later."""
    lines = text.splitlines()[-TAIL_LINES:]
    if any(p.search(line) for line in lines for p in NOT_RETRYABLE):
        return False
    return any(p.search(line) for line in lines for p in RETRYABLE)


def waits():
    raw = os.environ.get("BUILD_RETRY_WAITS", "")
    if raw.strip():
        return tuple(float(w) for w in raw.split(",") if w.strip())
    return WAITS


def run_once(command, out):
    """Runs the command once, its output passed through and its end kept."""
    kept = collections.deque(maxlen=TAIL_LINES)
    with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) as proc:
        for raw in proc.stdout:
            out.write(raw)
            out.flush()
            kept.append(raw.decode("utf-8", "replace"))
    return proc.returncode, "".join(kept)


def run(command, delays=WAITS, sleep=time.sleep, out=None, log=None, once=run_once):
    out = out or sys.stdout.buffer
    log = log or sys.stderr
    name = " ".join(command)
    attempts = len(delays) + 1
    for attempt in range(1, attempts + 1):
        code, text = once(command, out)
        if code == 0:
            if attempt > 1:
                print(f"network_retry: '{name}' passed on attempt {attempt} of {attempts}.", file=log, flush=True)
            return 0
        if not retryable(text):
            return code
        if attempt == attempts:
            print(f"network_retry: '{name}' failed on a download {attempts} times; giving up.", file=log, flush=True)
            return code
        delay = delays[attempt - 1]
        print(
            f"network_retry: '{name}' failed on a download (attempt {attempt} of {attempts}); "
            f"trying again in {delay:g} s.",
            file=log,
            flush=True,
        )
        sleep(delay)
    return code


def main():
    command = sys.argv[1:]
    if not command:
        print(__doc__, file=sys.stderr)
        return 2
    return run(command, delays=waits())


if __name__ == "__main__":
    sys.exit(main())
