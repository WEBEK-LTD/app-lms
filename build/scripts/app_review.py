#!/usr/bin/env python3
"""The App Store's App Review Information for a client's build (roadmap 102.2).

Usage: app_review.py <secrets.json> <review.json>
    exit 0: review.json written (mode 600) for the appstore_listing lane;
    exit 2: no review sign-in in this build's keys, nothing written.

secrets.json is GET /builds/{id}/secrets (docs/api/pipeline.yaml); its
`app_review` has the reviewers' sign-in (a fixed code, or an account of the
client's site or API), the owner's notes and the owner's contact. Never
prints the code or the password.
"""
import json
import os
import sys

# Apple's limit on App Review notes.
NOTES_MAX = 4000


def sign_in_line(review):
    who = review["demo_user"]
    if review.get("kind") == "code":
        return f"Sign in with {who} and the code {review['demo_password']}; no message is sent."
    return f"Sign in with the account {who} and the password in the demo account fields."


def review_information(review):
    """What the lane sets on the version's App Review Information, in deliver's names; None without a sign-in."""
    if not review or not str(review.get("demo_user") or "").strip() or not review.get("demo_password"):
        return None
    notes = "\n\n".join(part for part in (sign_in_line(review), (review.get("notes") or "").strip()) if part)
    info = {
        "demo_user": review["demo_user"].strip(),
        "demo_password": review["demo_password"],
        "notes": notes[:NOTES_MAX],
    }
    contact = review.get("contact") or {}
    for key, name in (("first_name", "first_name"), ("last_name", "last_name"), ("phone_number", "phone"), ("email_address", "email")):
        value = str(contact.get(name) or "").strip()
        if value:
            info[key] = value
    return info


def write_private(path, payload):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        json.dump(payload, handle)


def main(argv):
    if len(argv) != 3:
        sys.exit(__doc__)
    with open(argv[1]) as handle:
        secrets = json.load(handle)
    info = review_information(secrets.get("app_review"))
    if info is None:
        print("App Review: no review sign-in for this app; App Review Information stays as it is in App Store Connect.")
        return 2
    write_private(argv[2], info)
    contact = [key for key in ("first_name", "last_name", "phone_number", "email_address") if key in info]
    missing = [key for key in ("first_name", "last_name", "phone_number", "email_address") if key not in info]
    line = f"App Review: demo account and notes ready; contact from the owner's account and app: {', '.join(contact) or 'none'}"
    if missing:
        line += f" (kept as they are in App Store Connect: {', '.join(missing)})"
    print(line + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
