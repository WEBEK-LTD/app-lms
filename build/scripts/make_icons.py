#!/usr/bin/env python3
"""Writes a client's launcher icons into the Flutter project.

Usage: make_icons.py <icon.png> <mobile-dir>

The icon is the 1024 x 1024 square without transparency that the client uploads
in the dashboard. Android gets legacy icons plus an adaptive icon (the icon on
a background of its own edge color, inside the launcher's safe zone). iOS gets
every size listed in AppIcon.appiconset/Contents.json, without an alpha channel
as App Store Connect requires.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ANDROID_DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<!-- Written by build/scripts/make_icons.py from the client's icon. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""


def edge_color(icon):
    """The most common color along the icon's border."""
    small = icon.resize((64, 64), Image.LANCZOS)
    pixels = [small.getpixel((x, y)) for x in range(64) for y in (0, 63)]
    pixels += [small.getpixel((x, y)) for y in range(64) for x in (0, 63)]
    return max(set(pixels), key=pixels.count)


def android(icon, res):
    background = edge_color(icon)
    for name, scale in ANDROID_DENSITIES.items():
        folder = res / f"mipmap-{name}"
        folder.mkdir(parents=True, exist_ok=True)
        legacy = round(48 * scale)
        icon.resize((legacy, legacy), Image.LANCZOS).save(folder / "ic_launcher.png", optimize=True)
        layer = round(108 * scale)
        inner = round(72 * scale)
        Image.new("RGB", (layer, layer), background).save(folder / "ic_launcher_background.png", optimize=True)
        foreground = Image.new("RGBA", (layer, layer), (0, 0, 0, 0))
        offset = (layer - inner) // 2
        foreground.paste(icon.resize((inner, inner), Image.LANCZOS).convert("RGBA"), (offset, offset))
        foreground.save(folder / "ic_launcher_foreground.png", optimize=True)
    anydpi = res / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    (anydpi / "ic_launcher.xml").write_text(ADAPTIVE_XML)


def ios(icon, iconset):
    contents = json.loads((iconset / "Contents.json").read_text())
    for image in contents["images"]:
        if "filename" not in image:
            continue
        points = float(image["size"].split("x")[0])
        pixels = round(points * float(image["scale"].rstrip("x")))
        icon.resize((pixels, pixels), Image.LANCZOS).save(iconset / image["filename"], optimize=True)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: make_icons.py <icon.png> <mobile-dir>")
    source, mobile = Path(sys.argv[1]), Path(sys.argv[2])
    icon = Image.open(source)
    if icon.size[0] != icon.size[1] or icon.size[0] < 1024:
        sys.exit(f"The icon must be a square of at least 1024 x 1024 pixels, not {icon.size[0]} x {icon.size[1]}.")
    icon = icon.convert("RGB")
    android(icon, mobile / "android/app/src/main/res")
    ios(icon, mobile / "ios/Runner/Assets.xcassets/AppIcon.appiconset")
    print(f"Icons written from {source}")


if __name__ == "__main__":
    main()
