"""84.2 Yallapp's picture library for the designs (33.8): plain shapes in the
designs' colours, 1200x675 JPEGs in public/design-pictures. 99.1 Two for
each design too, in its own colours (src/lib/pages/designs/colours.json):
<design>-1.jpg (waves) and <design>-2.jpg (circles). Run again after
changing it: python3 scripts/design-pictures.py (needs Pillow)."""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "design-pictures")
W, H = 1200, 675

# The palettes of lib/pages/designs/build.ts PALETTES.
PALETTES = {
    "ocean": ("#0E4C92", "#38BDF8"),
    "forest": ("#1F5135", "#A3C46B"),
    "sunset": ("#B4232A", "#F59E0B"),
    "berry": ("#6D1A5B", "#EC4899"),
    "slate": ("#1E293B", "#14B8A6"),
    "sand": ("#7C4A1E", "#E9B872"),
}


def rgb(hex_color):
    return tuple(int(hex_color[i : i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(a, b):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(0, W):
            px[x, y] = mix(a, b, (x / W) * 0.6 + (y / H) * 0.4)
    return img


def waves(a, b, seed):
    img = gradient(mix(a, (255, 255, 255), 0.1), a)
    draw = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(seed)
    for band in range(5):
        base = H * (0.35 + band * 0.14)
        amp = 30 + rnd.random() * 40
        phase = rnd.random() * math.pi * 2
        points = [(x, base + amp * math.sin(x / 160 + phase)) for x in range(0, W + 20, 20)]
        alpha = 70 + band * 30
        draw.polygon(points + [(W, H), (0, H)], fill=(*mix(b, (255, 255, 255), band * 0.08), alpha))
    return img


def circles(a, b, seed):
    img = gradient(a, mix(a, (0, 0, 0), 0.3))
    draw = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(seed)
    for _ in range(9):
        r = 60 + rnd.random() * 220
        x, y = rnd.random() * W, rnd.random() * H
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*mix(b, (255, 255, 255), rnd.random() * 0.3), 90 + int(rnd.random() * 90)))
    return img.filter(ImageFilter.GaussianBlur(2))


def blocks(a, b, seed):
    img = Image.new("RGB", (W, H), mix(a, (255, 255, 255), 0.85))
    draw = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(seed)
    for _ in range(14):
        w, h = 120 + rnd.random() * 360, 80 + rnd.random() * 240
        x, y = rnd.random() * (W - 60), rnd.random() * (H - 60)
        color = a if rnd.random() < 0.5 else b
        draw.rounded_rectangle((x, y, x + w, y + h), radius=36, fill=(*color, 120 + int(rnd.random() * 100)))
    return img


SHAPES = {"waves": waves, "circles": circles, "blocks": blocks}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, (primary, secondary) in PALETTES.items():
        for index, (shape, make) in enumerate(SHAPES.items()):
            image = make(rgb(primary), rgb(secondary), seed=hash((name, shape)) % 1000 + index)
            image.save(os.path.join(OUT, f"{name}-{shape}.jpg"), "JPEG", quality=78, optimize=True, progressive=True)
    colours = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "pages", "designs", "colours.json")
    with open(colours, encoding="utf-8") as f:
        designs = json.load(f)
    for design, pair in designs.items():
        for number, make in ((1, waves), (2, circles)):
            image = make(rgb(pair["primary"]), rgb(pair["secondary"]), seed=sum(map(ord, design)) + number)
            image.save(os.path.join(OUT, f"{design}-{number}.jpg"), "JPEG", quality=78, optimize=True, progressive=True)
