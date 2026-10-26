#!/usr/bin/env python3
"""A client's store listing for fastlane (roadmap 88.2).

Usage:
  store_listing.py play <store.json> <icon.png> <feature.png> <out-dir>
      fastlane supply's metadata folder: for the listing's language and each
      translation, <locale>/title.txt, short_description.txt,
      full_description.txt and images/ (icon, feature graphic, phone and
      tablet screenshots; the tablet ones serve 7" and 10" tablets).

  store_listing.py appstore <store.json> <out-dir>
      For fastlane deliver: <out>/metadata/<locale>/ (name, description,
      privacy URL) and <out>/screenshots/<locale>/ (iPhone 6.9" and iPad 13").

  store_listing.py frames <store.json> <out-dir>
      Only the framed screenshots, in <out>/<language>/<device>/ (for the
      store assets zip).

store.json is the build's store listing (docs/api/pipeline.yaml,
StoreListing). With `frame`, every screenshot is drawn in a thin device frame
on the brand colour with its caption above, at the size it was uploaded (the
size the store asks for); in each language with that language's captions.
Languages the store doesn't offer are left out, and said so.
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "mobile" / "assets" / "fonts" / "readexpro" / "ReadexPro-Variable.ttf"

# The app's language code: (Google Play locale, App Store locale); None where the store has none.
LOCALES = {
    "en": ("en-US", "en-US"),
    "ar": ("ar", "ar-SA"),
    "tr": ("tr-TR", "tr"),
    "fr": ("fr-FR", "fr-FR"),
    "de": ("de-DE", "de-DE"),
    "es": ("es-ES", "es-ES"),
    "it": ("it-IT", "it"),
    "pt": ("pt-PT", "pt-PT"),
    "nl": ("nl-NL", "nl-NL"),
    "ru": ("ru-RU", "ru"),
    "uk": ("uk", "uk"),
    "pl": ("pl-PL", "pl"),
    "ro": ("ro", "ro"),
    "el": ("el-GR", "el"),
    "cs": ("cs-CZ", "cs"),
    "hu": ("hu-HU", "hu"),
    "sv": ("sv-SE", "sv"),
    "da": ("da-DK", "da"),
    "fi": ("fi-FI", "fi"),
    "nb": ("no-NO", "no"),
    "he": ("iw-IL", "he"),
    "fa": ("fa", None),
    "ur": ("ur", None),
    "hi": ("hi-IN", "hi"),
    "bn": ("bn-BD", None),
    "id": ("id", "id"),
    "ms": ("ms", "ms"),
    "th": ("th", "th"),
    "vi": ("vi", "vi"),
    "zh": ("zh-CN", "zh-Hans"),
    "ja": ("ja-JP", "ja"),
    "ko": ("ko-KR", "ko"),
    "az": ("az-AZ", None),
    "ka": ("ka-GE", None),
    "sq": ("sq", None),
    "sr": ("sr", None),
    "bg": ("bg", None),
    "hr": ("hr", "hr"),
    "sk": ("sk", "sk"),
    "ca": ("ca", "ca"),
}
RTL = {"ar", "fa", "ur", "he"}

PLAY_FILES = {"title.txt": ("store_title", 30), "short_description.txt": ("short_description", 80), "full_description.txt": ("full_description", 4000)}
APPSTORE_FILES = {"name.txt": ("store_title", 30), "description.txt": ("full_description", 4000)}

FRAME_BEZEL = (20, 18, 31)
FRAME_BEZEL_ON_DARK = (62, 60, 78)
# Right-to-left captions join and order their letters only with libraqm (Pillow's wheels have it).
RAQM = features.check_feature("raqm")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "yallapp-build-pipeline"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def hex_color(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def base_language(code):
    return (code or "en").split("-")[0].lower()


def languages(listing):
    """The listing's languages, the main one first: (code, texts, captions)."""
    frame = listing.get("frame") or {}
    main = base_language(listing.get("language"))
    out = [(main, listing, frame.get("captions") or [])]
    seen = {main}
    for item in listing.get("translations") or []:
        code = base_language(item.get("language"))
        if code in seen:
            continue
        seen.add(code)
        own, base = item.get("captions") or [], frame.get("captions") or []
        captions = [(own[i] if i < len(own) else "") or (base[i] if i < len(base) else "") for i in range(max(len(own), len(base)))]
        out.append((code, item, captions))
    return out


def write_texts(folder, texts, files):
    folder.mkdir(parents=True, exist_ok=True)
    for name, (key, limit) in files.items():
        (folder / name).write_text(str(texts.get(key) or "").strip()[:limit] + "\n", encoding="utf-8")


def font(size):
    try:
        return ImageFont.truetype(str(FONT), size)
    except OSError:
        return ImageFont.load_default(size=size)


def wrap(draw, text, face, width, lines=2):
    """The caption in at most two lines that fit the width (the last cut with …)."""
    words = text.split()
    out, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=face) <= width or not line:
            line = candidate
        else:
            out.append(line)
            line = word
    if line:
        out.append(line)
    if len(out) > lines:
        out = out[:lines]
        while out[-1] and draw.textlength(out[-1] + "…", font=face) > width:
            out[-1] = out[-1][:-1]
        out[-1] = out[-1].rstrip() + "…"
    return out


def framed(image, background, text_color, caption, rtl=False):
    """The screenshot in a thin device frame on `background`, its caption above, at the image's own size."""
    shot = image.convert("RGB")
    width, height = shot.size
    canvas = Image.new("RGB", (width, height), hex_color(background))
    draw = ImageDraw.Draw(canvas)
    top = 0
    if caption:
        size = max(18, round(width * 0.058))
        face = font(size)
        lines = wrap(draw, caption.strip(), face, width * 0.86)
        top = round(height * 0.05)
        for line in lines:
            options = {"direction": "rtl"} if rtl and RAQM else {}
            line_width = draw.textlength(line, font=face, **options)
            draw.text(((width - line_width) / 2, top), line, font=face, fill=hex_color(text_color), **options)
            top += round(size * 1.3)
        top += round(height * 0.03)
    else:
        top = round(height * 0.06)
    bottom = round(height * 0.04)
    bezel = max(4, round(width * 0.018))
    room_h = height - top - bottom
    scale = min((width * 0.84 - 2 * bezel) / width, (room_h - 2 * bezel) / height)
    inner = shot.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS)
    frame_w, frame_h = inner.width + 2 * bezel, inner.height + 2 * bezel
    left = (width - frame_w) // 2
    radius = round(frame_w * 0.08)
    dark = sum(hex_color(background)) < 150
    draw.rounded_rectangle((left, top, left + frame_w, top + frame_h), radius=radius, fill=FRAME_BEZEL_ON_DARK if dark else FRAME_BEZEL)
    mask = Image.new("L", inner.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, inner.width, inner.height), radius=max(0, radius - bezel), fill=255)
    canvas.paste(inner, (left + bezel, top + bezel), mask)
    return canvas


def screenshot(data, frame, caption, rtl):
    """One screenshot as the store wants it: a 24-bit PNG without alpha, framed when asked."""
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        if frame:
            return framed(image, frame["background"], frame["text_color"], caption, rtl)
        return image.convert("RGB")


class Images:
    """Downloads each screenshot once."""

    def __init__(self, loader=fetch):
        self.loader = loader
        self.cache = {}

    def get(self, url):
        if url not in self.cache:
            self.cache[url] = self.loader(url)
        return self.cache[url]


def write_shots(images, urls, frame, captions, rtl, folders, locale):
    count = 0
    for index, url in enumerate(urls, 1):
        caption = captions[index - 1] if index - 1 < len(captions) else ""
        picture = screenshot(images.get(url), frame, caption, rtl)
        for folder in folders:
            folder.mkdir(parents=True, exist_ok=True)
            picture.save(folder / f"{index}_{locale}.png", "PNG", optimize=True)
        count += 1
    return count


def cmd_play(listing, icon, feature, out, images=None):
    images = images or Images()
    out = Path(out)
    frame = listing.get("frame")
    for code, texts, captions in languages(listing):
        locale = (LOCALES.get(code) or (None, None))[0]
        if not locale:
            print(f"Google Play: no listing in {code} (Google Play has no such language)")
            continue
        target = out / locale
        write_texts(target, texts, PLAY_FILES)
        pictures = target / "images"
        pictures.mkdir(parents=True, exist_ok=True)
        if icon:
            with Image.open(icon) as image:
                image.convert("RGB").resize((512, 512), Image.LANCZOS).save(pictures / "icon.png")
        if feature:
            with Image.open(feature) as image:
                image.convert("RGB").save(pictures / "featureGraphic.png")
        rtl = code in RTL
        phone = write_shots(images, listing.get("phone_screenshots") or [], frame, captions, rtl, [pictures / "phoneScreenshots"], locale)
        tablet = write_shots(images, listing.get("tablet_screenshots") or [], frame, captions, rtl, [pictures / "sevenInchScreenshots", pictures / "tenInchScreenshots"], locale)
        print(f"Google Play {locale}: listing, {phone} phone and {tablet} tablet screenshots{' (framed)' if frame else ''}")
    return 0


def cmd_appstore(listing, out, images=None):
    images = images or Images()
    out = Path(out)
    frame = listing.get("frame")
    for code, texts, captions in languages(listing):
        locale = (LOCALES.get(code) or (None, None))[1]
        if not locale:
            print(f"App Store: no listing in {code} (the App Store has no such language)")
            continue
        folder = out / "metadata" / locale
        write_texts(folder, texts, APPSTORE_FILES)
        (folder / "privacy_url.txt").write_text(listing.get("privacy_url", "") + "\n", encoding="utf-8")
        rtl = code in RTL
        shots = out / "screenshots" / locale
        iphone = write_shots(images, listing.get("iphone_screenshots") or [], frame, captions, rtl, [shots], f"{locale}_iphone")
        ipad = write_shots(images, listing.get("ipad_screenshots") or [], frame, captions, rtl, [shots], f"{locale}_ipad")
        print(f"App Store {locale}: listing, {iphone} iPhone and {ipad} iPad screenshots{' (framed)' if frame else ''}")
    return 0


def cmd_frames(listing, out, images=None):
    """The framed screenshots for the store assets zip; nothing without `frame`."""
    images = images or Images()
    frame = listing.get("frame")
    if not frame:
        return 0
    out = Path(out)
    devices = {"phone": "phone_screenshots", "tablet": "tablet_screenshots", "iphone": "iphone_screenshots", "ipad": "ipad_screenshots"}
    for code, _texts, captions in languages(listing):
        for device, key in devices.items():
            write_shots(images, listing.get(key) or [], frame, captions, code in RTL, [out / code / device], code)
    return 0


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    command = sys.argv[1]
    if command == "play" and len(sys.argv) == 6:
        listing = json.loads(Path(sys.argv[2]).read_text())
        return cmd_play(listing, sys.argv[3] or None, sys.argv[4] or None, sys.argv[5])
    if command == "appstore" and len(sys.argv) == 4:
        return cmd_appstore(json.loads(Path(sys.argv[2]).read_text()), sys.argv[3])
    if command == "frames" and len(sys.argv) == 4:
        return cmd_frames(json.loads(Path(sys.argv[2]).read_text()), sys.argv[3])
    sys.exit(__doc__)


if __name__ == "__main__":
    sys.exit(main())
