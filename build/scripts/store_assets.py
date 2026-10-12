#!/usr/bin/env python3
"""Packs a client's store assets into one zip for the dashboard's downloads.

Usage: store_assets.py <config.json> <store.json> <icon.png> <out.zip>

config.json is the build config, store.json the store listing from the
platform (platform.py store), icon.png the client's 1024 x 1024 icon.

The zip holds what Google Play and App Store Connect ask for:
  google-play/icon-512.png             hi-res icon, 512 x 512
  google-play/feature-graphic.png      1024 x 500, the logo (or icon and name) on the splash color
  google-play/phone-screenshots/       the client's screenshots, in order
  app-store/icon-1024.png              1024 x 1024, no alpha
  app-store/iphone-screenshots/        the client's screenshots, in order
  listing.txt                          title, descriptions, support email, privacy policy
"""
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FEATURE_SIZE = (1024, 500)
MIDNIGHT = (14, 13, 36)
WHITE = (255, 255, 255)


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "yallapp-build-pipeline"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def hex_color(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def text_color(background):
    """Dark text on light backgrounds, white on dark ones (relative luminance)."""

    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in background)
    return MIDNIGHT if 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 else WHITE


def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow without FreeType
        return ImageFont.load_default()


def rounded(image, radius):
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *image.size), radius=radius, fill=255)
    out = Image.new("RGBA", image.size)
    out.paste(image.convert("RGBA"), mask=mask)
    return out


def feature_graphic(config, icon, logo):
    background = hex_color(config["branding"]["splash_color"])
    canvas = Image.new("RGB", FEATURE_SIZE, background)
    if logo is not None:
        logo = logo.convert("RGBA")
        logo.thumbnail((640, 240), Image.LANCZOS)
        canvas.paste(logo, ((FEATURE_SIZE[0] - logo.width) // 2, (FEATURE_SIZE[1] - logo.height) // 2), logo)
        return canvas
    # The icon and the app name, centered together.
    side = 220
    badge = rounded(icon.resize((side, side), Image.LANCZOS), 44)
    name = config["app_name"]
    draw = ImageDraw.Draw(canvas)
    size = 72
    while size > 28 and draw.textlength(name, font=font(size)) > FEATURE_SIZE[0] - side - 200:
        size -= 4
    face = font(size)
    width = side + 48 + int(draw.textlength(name, font=face))
    left = max(40, (FEATURE_SIZE[0] - width) // 2)
    canvas.paste(badge, (left, (FEATURE_SIZE[1] - side) // 2), badge)
    draw.text((left + side + 48, FEATURE_SIZE[1] // 2), name, font=face, fill=text_color(background), anchor="lm")
    return canvas


def png(image):
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


def screenshot_name(index, data):
    kind = Image.open(io.BytesIO(data)).format
    return f"{index:02d}.{'jpg' if kind == 'JPEG' else 'png'}"


def listing_text(store):
    return (
        f"Title\n{store['store_title']}\n\n"
        f"Short description (Google Play)\n{store['short_description']}\n\n"
        f"Full description\n{store['full_description']}\n\n"
        f"Support email\n{store['support_email']}\n\n"
        f"Privacy policy\n{store['privacy_url']}\n"
    )


def main(config_path, store_path, icon_path, out_path):
    config = json.loads(Path(config_path).read_text())
    store = json.loads(Path(store_path).read_text())
    icon = Image.open(icon_path).convert("RGB")
    logo = None
    logo_url = config["branding"].get("logo_url")
    if logo_url:
        data = fetch(logo_url)
        try:
            logo = Image.open(io.BytesIO(data))
            logo.load()
        except Exception:  # SVG logos: Pillow can't draw them, so the icon and name are used.
            logo = None

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("google-play/icon-512.png", png(icon.resize((512, 512), Image.LANCZOS).convert("RGBA")))
        archive.writestr("google-play/feature-graphic.png", png(feature_graphic(config, icon, logo)))
        archive.writestr("app-store/icon-1024.png", png(icon.resize((1024, 1024), Image.LANCZOS)))
        for folder, urls in (("google-play/phone-screenshots", store["phone_screenshots"]), ("app-store/iphone-screenshots", store["iphone_screenshots"])):
            for index, url in enumerate(urls, start=1):
                data = fetch(url)
                archive.writestr(f"{folder}/{screenshot_name(index, data)}", data)
        archive.writestr("listing.txt", listing_text(store))


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
