"""Tests for store_listing.py: the listing in every language, tablet and framed screenshots (roadmap 88.2).

Run: python3 -m unittest discover build/tests
"""
import io
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import store_listing  # noqa: E402


def png(size, color=(10, 120, 200), alpha=False):
    out = io.BytesIO()
    Image.new("RGBA" if alpha else "RGB", size, color + ((128,) if alpha else ())).save(out, "PNG")
    return out.getvalue()


PHONE = png((1080, 1920), alpha=True)
TABLET = png((1600, 2560))
IPHONE = png((1320, 2868))
IPAD = png((2064, 2752))
FILES = {
    "https://files.test/p1.png": PHONE,
    "https://files.test/p2.png": PHONE,
    "https://files.test/t1.png": TABLET,
    "https://files.test/i1.png": IPHONE,
    "https://files.test/d1.png": IPAD,
}


def listing(**extra):
    base = {
        "store_title": "Ada Academy",
        "short_description": "Learn with Ada on your phone.",
        "full_description": "Every course on your phone.",
        "support_email": "help@academy.test",
        "privacy_url": "https://academy.test/privacy",
        "phone_screenshots": ["https://files.test/p1.png", "https://files.test/p2.png"],
        "iphone_screenshots": ["https://files.test/i1.png"],
        "tablet_screenshots": ["https://files.test/t1.png"],
        "ipad_screenshots": ["https://files.test/d1.png"],
        "language": "en",
        "translations": [
            {"language": "ar", "store_title": "أكاديمية آدا", "short_description": "تعلّم مع آدا على هاتفك.", "full_description": "كل الدورات على هاتفك.", "captions": ["دوراتك في جيبك"]},
            {"language": "tr", "store_title": "Ada Akademi", "short_description": "Ada ile telefonunuzda öğrenin.", "full_description": "Tüm kurslar telefonunuzda."},
            {"language": "fa", "store_title": "آکادمی آدا", "short_description": "یاد بگیرید", "full_description": "همه دوره‌ها"},
        ],
    }
    base.update(extra)
    return base


class Loader:
    def __init__(self):
        self.calls = []

    def __call__(self, url):
        self.calls.append(url)
        return FILES[url]


class StoreListingTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        icon = Image.new("RGB", (1024, 1024), (200, 30, 30))
        icon.save(self.dir / "icon.png")
        Image.new("RGB", (1024, 500), (0, 0, 0)).save(self.dir / "feature.png")

    def run_play(self, data, loader=None):
        loader = loader or Loader()
        with redirect_stdout(io.StringIO()) as out:
            store_listing.cmd_play(data, self.dir / "icon.png", self.dir / "feature.png", self.dir / "play", store_listing.Images(loader))
        return out.getvalue(), loader

    def test_google_play_gets_every_language_with_phone_and_tablet_screenshots(self):
        printed, loader = self.run_play(listing())
        play = self.dir / "play"
        self.assertEqual(sorted(p.name for p in play.iterdir()), ["ar", "en-US", "fa", "tr-TR"])
        self.assertEqual((play / "ar" / "title.txt").read_text(encoding="utf-8").strip(), "أكاديمية آدا")
        self.assertEqual((play / "tr-TR" / "short_description.txt").read_text(encoding="utf-8").strip(), "Ada ile telefonunuzda öğrenin.")
        images = play / "en-US" / "images"
        self.assertEqual(len(list((images / "phoneScreenshots").glob("*.png"))), 2)
        self.assertEqual(len(list((images / "sevenInchScreenshots").glob("*.png"))), 1)
        self.assertEqual(len(list((images / "tenInchScreenshots").glob("*.png"))), 1)
        with Image.open(images / "icon.png") as icon:
            self.assertEqual(icon.size, (512, 512))
        # No alpha: the stores refuse screenshots with transparency.
        with Image.open(next((images / "phoneScreenshots").glob("*.png"))) as shot:
            self.assertEqual(shot.mode, "RGB")
            self.assertEqual(shot.size, (1080, 1920))
        # Each screenshot is downloaded once for every language.
        self.assertEqual(sorted(set(loader.calls)), sorted(loader.calls))
        self.assertIn("Google Play ar: listing, 2 phone and 1 tablet screenshots", printed)

    def test_the_app_store_gets_its_locales_and_leaves_out_the_ones_it_has_not(self):
        loader = Loader()
        with redirect_stdout(io.StringIO()) as out:
            store_listing.cmd_appstore(listing(), self.dir / "asc", store_listing.Images(loader))
        metadata = self.dir / "asc" / "metadata"
        self.assertEqual(sorted(p.name for p in metadata.iterdir()), ["ar-SA", "en-US", "tr"])
        self.assertIn("App Store: no listing in fa", out.getvalue())
        self.assertEqual((metadata / "en-US" / "name.txt").read_text().strip(), "Ada Academy")
        self.assertEqual((metadata / "ar-SA" / "privacy_url.txt").read_text().strip(), "https://academy.test/privacy")
        shots = sorted(p.name for p in (self.dir / "asc" / "screenshots" / "tr").iterdir())
        self.assertEqual(shots, ["1_tr_ipad.png", "1_tr_iphone.png"])
        with Image.open(self.dir / "asc" / "screenshots" / "tr" / "1_tr_ipad.png") as ipad:
            self.assertEqual(ipad.size, (2064, 2752))

    def test_texts_stay_within_the_stores_limits(self):
        long = listing(store_title="A" * 50, short_description="B" * 120, translations=[])
        self.run_play(long)
        self.assertEqual(len((self.dir / "play" / "en-US" / "title.txt").read_text().strip()), 30)
        self.assertEqual(len((self.dir / "play" / "en-US" / "short_description.txt").read_text().strip()), 80)

    def test_a_listing_without_languages_is_english_as_before(self):
        old = {k: v for k, v in listing().items() if k not in ("language", "translations", "tablet_screenshots", "ipad_screenshots")}
        self.run_play(old)
        self.assertEqual([p.name for p in (self.dir / "play").iterdir()], ["en-US"])
        self.assertFalse((self.dir / "play" / "en-US" / "images" / "tenInchScreenshots").exists())

    def test_framed_screenshots_keep_the_store_size_on_the_brand_colour_with_each_language_s_caption(self):
        frame = {"background": "#0E0D24", "text_color": "#FFFFFF", "captions": ["Your courses in your pocket", "Learn offline"]}
        self.run_play(listing(frame=frame))
        en = self.dir / "play" / "en-US" / "images" / "phoneScreenshots"
        ar = self.dir / "play" / "ar" / "images" / "phoneScreenshots"
        with Image.open(sorted(en.glob("*.png"))[0]) as first, Image.open(sorted(ar.glob("*.png"))[0]) as arabic, Image.open(sorted(ar.glob("*.png"))[1]) as second:
            self.assertEqual(first.size, (1080, 1920))
            # The brand colour around the frame, the screenshot inside it.
            self.assertEqual(first.getpixel((5, 1910)), (14, 13, 36))
            self.assertEqual(first.getpixel((540, 1300)), (10, 120, 200))
            # The caption is drawn above (white text on the background).
            band = first.crop((0, 0, 1080, 260))
            self.assertIn((255, 255, 255), [color for _, color in band.getcolors(1080 * 260)])
            # Arabic has its own first caption, and the main second caption.
            self.assertNotEqual(first.crop((0, 0, 1080, 260)).tobytes(), arabic.crop((0, 0, 1080, 260)).tobytes())
            self.assertEqual(second.size, (1080, 1920))

    def test_frames_for_the_store_assets(self):
        loader = Loader()
        self.assertEqual(store_listing.cmd_frames(listing(), self.dir / "frames", store_listing.Images(loader)), 0)
        self.assertFalse((self.dir / "frames").exists())
        store_listing.cmd_frames(listing(frame={"background": "#FFFFFF", "text_color": "#000000", "captions": []}), self.dir / "frames", store_listing.Images(loader))
        self.assertEqual(sorted(p.name for p in (self.dir / "frames" / "en").iterdir()), ["ipad", "iphone", "phone", "tablet"])

    def test_wrap_keeps_two_lines(self):
        from PIL import ImageDraw

        draw = ImageDraw.Draw(Image.new("RGB", (10, 10)))
        lines = store_listing.wrap(draw, "one two three four five six seven eight nine ten eleven twelve", store_listing.font(40), 300)
        self.assertEqual(len(lines), 2)
        self.assertTrue(lines[1].endswith("…"))


if __name__ == "__main__":
    unittest.main()
