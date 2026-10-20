#!/usr/bin/env python3
"""Yallapp Business in Google Play and the App Store (roadmap 65).

Used by .github/workflows/business-release.yml (and the Mobile workflow's
Firebase options). Nothing here prints a secret.

  business_store.py firebase android|ios <out.json>
      The Firebase client options of Yallapp Business's own project, from the
      Actions variables YB_FIREBASE_PROJECT_ID, YB_FIREBASE_SENDER_ID,
      YB_FIREBASE_APP_ID_ANDROID / _IOS and YB_FIREBASE_API_KEY_ANDROID / _IOS,
      as a --dart-define-from-file JSON ({} when they're missing: no pushes).
      Any of them may hold a whole google-services.json (Android) or
      GoogleService-Info.plist (iOS) instead: its values are read from it.

  business_store.py play <out-dir> <screenshots-dir>
      fastlane supply's metadata folder: business/store/android's texts, the
      icon and feature graphic from brand/stores, the phone screenshots.

  business_store.py appstore <out-dir> <screenshots-dir>
      For fastlane deliver: <out>/metadata (business/store/ios without the
      release notes), <out>/release_notes/<locale>.txt (sent only once a
      version is live: Apple refuses them on the first one),
      <out>/screenshots/<locale>/ (iPhone 6.9" and iPad 13"),
      <out>/review.json (App Review's contact, notes and the demo account from
      YB_APP_REVIEW_* variables and secrets) and <out>/age_rating.json.

  business_store.py check
      The listing's texts: every file in every language, within the stores'
      limits. Exit 1 with the problems.
"""
import json
import os
import plistlib
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "business" / "store"
BRAND = ROOT / "brand" / "stores"
PACKAGE = "tr.com.yallapp.business"

# The app's languages: (screenshots folder, Google Play locale, App Store locale).
LANGUAGES = [("en", "en-US", "en-US"), ("ar", "ar", "ar-SA"), ("tr", "tr-TR", "tr")]

# Every file of a language, with the store's limit in characters (None: a URL).
PLAY_FILES = {
    "title.txt": 30,
    "short_description.txt": 80,
    "full_description.txt": 4000,
    "changelogs/default.txt": 500,
}
APPSTORE_FILES = {
    "name.txt": 30,
    "subtitle.txt": 30,
    "description.txt": 4000,
    "keywords.txt": 100,
    "promotional_text.txt": 170,
    "release_notes.txt": 4000,
    "support_url.txt": None,
    "marketing_url.txt": None,
    "privacy_url.txt": None,
}
APPSTORE_SHARED = ["copyright.txt", "primary_category.txt", "secondary_category.txt"]
# Words the brand never uses for itself (docs/BRAND.md: nothing that suggests AI).
AVOID = ["artificial intelligence", " ai ", "ai-powered", "smart assistant", "machine learning", "الذكاء الاصطناعي", "yapay zeka"]

# Screenshots: folder written by business/test/store/store_screenshots_test.dart.
PLAY_SHOTS = "android-phone"
APPSTORE_SHOTS = ["iphone", "ipad"]


def read(path):
    return path.read_text(encoding="utf-8").strip()


# Firebase -------------------------------------------------------------------

FIREBASE_KEYS = {
    "android": ["YB_FIREBASE_PROJECT_ID", "YB_FIREBASE_SENDER_ID", "YB_FIREBASE_APP_ID_ANDROID", "YB_FIREBASE_API_KEY_ANDROID"],
    "ios": ["YB_FIREBASE_PROJECT_ID", "YB_FIREBASE_SENDER_ID", "YB_FIREBASE_APP_ID_IOS", "YB_FIREBASE_API_KEY_IOS"],
}


def from_google_services(text):
    """The Android app's options from a google-services.json."""
    data = json.loads(text)
    project = data.get("project_info", {})
    client = next(
        (c for c in data.get("client", []) if c.get("client_info", {}).get("android_client_info", {}).get("package_name") == PACKAGE),
        None,
    )
    if client is None:
        raise ValueError(f"the google-services.json has no Android app {PACKAGE}")
    keys = client.get("api_key") or [{}]
    return {
        "YB_FIREBASE_PROJECT_ID": project.get("project_id", ""),
        "YB_FIREBASE_SENDER_ID": project.get("project_number", ""),
        "YB_FIREBASE_APP_ID_ANDROID": client["client_info"].get("mobilesdk_app_id", ""),
        "YB_FIREBASE_API_KEY_ANDROID": keys[0].get("current_key", ""),
    }


def from_google_service_info(text):
    """The iOS app's options from a GoogleService-Info.plist."""
    data = plistlib.loads(text.strip().encode("utf-8"))
    bundle = data.get("BUNDLE_ID", PACKAGE)
    if bundle != PACKAGE:
        raise ValueError(f"the GoogleService-Info.plist is for {bundle}, not {PACKAGE}")
    return {
        "YB_FIREBASE_PROJECT_ID": data.get("PROJECT_ID", ""),
        "YB_FIREBASE_SENDER_ID": str(data.get("GCM_SENDER_ID", "")),
        "YB_FIREBASE_APP_ID_IOS": data.get("GOOGLE_APP_ID", ""),
        "YB_FIREBASE_API_KEY_IOS": data.get("API_KEY", ""),
    }


def firebase_options(platform, env):
    """The --dart-define values for the platform, and a line saying where they came from."""
    names = FIREBASE_KEYS[platform]
    values = {name: (env.get(name) or "").strip() for name in names}
    for name in names:
        value = values[name]
        if platform == "android" and value.startswith("{"):
            values = from_google_services(value)
            source = f"the google-services.json in {name}"
            break
        if platform == "ios" and value.startswith("<"):
            values = from_google_service_info(value)
            source = f"the GoogleService-Info.plist in {name}"
            break
    else:
        source = "the YB_FIREBASE_* variables"
    if all(str(values.get(name, "")).strip() for name in names):
        return {name: str(values[name]).strip() for name in names}, f"Pushes: on (from {source}, project {values['YB_FIREBASE_PROJECT_ID']})"
    missing = ", ".join(name for name in names if not str(values.get(name, "")).strip())
    return {}, f"Pushes: off (missing {missing})"


def cmd_firebase(platform, out):
    try:
        values, line = firebase_options(platform, os.environ)
    except ValueError as error:
        print(f"Firebase options can't be read: {error}.", file=sys.stderr)
        return 1
    Path(out).write_text(json.dumps(values))
    print(line)
    return 0


# Listings -------------------------------------------------------------------


def copy_texts(source, target, files):
    for name in files:
        path = target / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(read(source / name) + "\n", encoding="utf-8")


def screenshots(folder, device, lang):
    return sorted((Path(folder) / device / lang).glob("*.png")) if folder else []


def copy_screenshot(source, target):
    """A 24-bit PNG without alpha: both stores refuse screenshots with transparency."""
    from PIL import Image  # pillow, as store_assets.py

    with Image.open(source) as image:
        image.convert("RGB").save(target, "PNG", optimize=True)


def cmd_play(out, shots):
    out = Path(out)
    for lang, play, _ in LANGUAGES:
        target = out / play
        copy_texts(STORE / "android" / play, target, PLAY_FILES)
        images = target / "images"
        images.mkdir(parents=True, exist_ok=True)
        shutil.copy(BRAND / "google-play-icon-512.png", images / "icon.png")
        shutil.copy(BRAND / "google-play-feature-graphic-1024x500.png", images / "featureGraphic.png")
        found = screenshots(shots, PLAY_SHOTS, lang)
        if found:
            phone = images / "phoneScreenshots"
            phone.mkdir(exist_ok=True)
            for index, shot in enumerate(found, 1):
                copy_screenshot(shot, phone / f"{index}_{play}.png")
        print(f"Google Play {play}: listing, icon, feature graphic, {len(found)} phone screenshots")
    return 0


def review_information(env):
    """App Review's details: contact from variables, the demo account from secrets (only when given)."""
    info = {
        "first_name": env.get("YB_APP_REVIEW_FIRST_NAME", "").strip(),
        "last_name": env.get("YB_APP_REVIEW_LAST_NAME", "").strip(),
        "phone_number": env.get("YB_APP_REVIEW_PHONE", "").strip(),
        "email_address": env.get("YB_APP_REVIEW_EMAIL", "").strip() or "info@yallapp.com.tr",
        "demo_user": env.get("YB_APP_REVIEW_DEMO_USER", "").strip(),
        "demo_password": env.get("YB_APP_REVIEW_DEMO_PASSWORD", ""),
        "notes": read(STORE / "ios" / "review_notes.txt"),
    }
    return {key: value for key, value in info.items() if value}


def cmd_appstore(out, shots):
    out = Path(out)
    metadata = out / "metadata"
    for name in APPSTORE_SHARED:
        copy_texts(STORE / "ios", metadata, [name])
    for lang, _, locale in LANGUAGES:
        source = STORE / "ios" / locale
        copy_texts(source, metadata / locale, [name for name in APPSTORE_FILES if name != "release_notes.txt"])
        notes = out / "release_notes" / f"{locale}.txt"
        notes.parent.mkdir(parents=True, exist_ok=True)
        notes.write_text(read(source / "release_notes.txt") + "\n", encoding="utf-8")
        target = out / "screenshots" / locale
        target.mkdir(parents=True, exist_ok=True)
        counts = []
        for device in APPSTORE_SHOTS:
            found = screenshots(shots, device, lang)
            for index, shot in enumerate(found, 1):
                copy_screenshot(shot, target / f"{device}_{index}.png")
            counts.append(f"{len(found)} {device}")
        print(f"App Store {locale}: listing, {', '.join(counts)} screenshots")
    review = review_information(os.environ)
    path = out / "review.json"
    path.write_text(json.dumps(review))
    os.chmod(path, 0o600)
    shutil.copy(STORE / "ios" / "age_rating.json", out / "age_rating.json")
    missing = [key for key in ("first_name", "last_name", "phone_number", "demo_user", "demo_password") if key not in review]
    if missing:
        print("App Review: not set here, kept as they are in App Store Connect: " + ", ".join(missing))
    return 0


def problems():
    """Every missing file and text over its store's limit."""
    found = []

    def check(path, limit):
        if not path.is_file():
            found.append(f"missing: {path.relative_to(ROOT)}")
            return
        text = read(path)
        if not text:
            found.append(f"empty: {path.relative_to(ROOT)}")
        elif limit is None:
            if not text.startswith("https://") or any(c.isspace() for c in text):
                found.append(f"not a URL: {path.relative_to(ROOT)}")
        else:
            # Keywords: Apple counts bytes there.
            size = len(text.encode("utf-8")) if path.name == "keywords.txt" else len(text)
            if size > limit:
                found.append(f"{size} > {limit}: {path.relative_to(ROOT)}")
        lowered = f" {text.lower()} "
        for word in AVOID:
            if word in lowered:
                found.append(f"says {word.strip()!r}: {path.relative_to(ROOT)}")

    for _, play, locale in LANGUAGES:
        for name, limit in PLAY_FILES.items():
            check(STORE / "android" / play / name, limit)
        for name, limit in APPSTORE_FILES.items():
            check(STORE / "ios" / locale / name, limit)
    for name in APPSTORE_SHARED + ["review_notes.txt"]:
        check(STORE / "ios" / name, 4000)
    for image in ("google-play-icon-512.png", "google-play-feature-graphic-1024x500.png"):
        if not (BRAND / image).is_file():
            found.append(f"missing: brand/stores/{image}")
    try:
        json.loads((STORE / "ios" / "age_rating.json").read_text())
    except (OSError, ValueError) as error:
        found.append(f"age_rating.json: {error}")
    return found


def cmd_check():
    found = problems()
    for line in found:
        print(line)
    if not found:
        print("The store listing is complete in every language and within the limits.")
    return 1 if found else 0


def main(argv):
    if len(argv) == 3 and argv[0] == "firebase" and argv[1] in FIREBASE_KEYS:
        return cmd_firebase(argv[1], argv[2])
    if len(argv) == 3 and argv[0] == "play":
        return cmd_play(argv[1], argv[2])
    if len(argv) == 3 and argv[0] == "appstore":
        return cmd_appstore(argv[1], argv[2])
    if argv == ["check"]:
        return cmd_check()
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
