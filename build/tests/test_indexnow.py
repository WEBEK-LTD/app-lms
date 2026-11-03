"""Tests for build/scripts/indexnow.py. Run: python3 -m unittest discover build/tests"""
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "build" / "scripts"))

import indexnow  # noqa: E402

URLSET = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://yallapp.com.tr/</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="https://yallapp.com.tr/ar"/></url>
  <url><loc> https://yallapp.com.tr/ar </loc></url>
  <url><loc>https://yallapp.com.tr/</loc></url>
  <url><loc>https://elsewhere.example/page</loc></url>
</urlset>"""

INDEX = """<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://yallapp.com.tr/sitemap-1.xml</loc></sitemap>
</sitemapindex>"""


class IndexNowTest(unittest.TestCase):
    def test_key_is_the_served_file(self):
        key = indexnow.read_key()
        self.assertRegex(key, r"^[0-9a-f]{32}$")
        served = ROOT / "platform" / "web" / "public" / f"{key}.txt"
        self.assertEqual(key, served.read_text(encoding="utf-8").strip())
        others = [p.name for p in served.parent.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}\.txt", p.name) and p != served]
        self.assertEqual([], others, "one IndexNow key file only")

    def test_reads_pages_but_not_hreflang_links(self):
        pages, children = indexnow.parse_sitemap(URLSET)
        self.assertEqual([], children)
        self.assertEqual(
            ["https://yallapp.com.tr/", "https://yallapp.com.tr/ar", "https://yallapp.com.tr/", "https://elsewhere.example/page"],
            pages,
        )

    def test_reads_a_sitemap_index(self):
        self.assertEqual(([], ["https://yallapp.com.tr/sitemap-1.xml"]), indexnow.parse_sitemap(INDEX))

    def test_keeps_the_site_s_urls_once_and_at_most_the_limit(self):
        pages, _ = indexnow.parse_sitemap(URLSET)
        self.assertEqual(["https://yallapp.com.tr/", "https://yallapp.com.tr/ar"], indexnow.keep_site_urls(pages, "yallapp.com.tr"))
        many = [f"https://yallapp.com.tr/p{i}" for i in range(20)]
        self.assertEqual(5, len(indexnow.keep_site_urls(many, "yallapp.com.tr", limit=5)))

    def test_payload(self):
        self.assertEqual(
            {
                "host": "yallapp.com.tr",
                "key": "abc",
                "keyLocation": "https://yallapp.com.tr/abc.txt",
                "urlList": ["https://yallapp.com.tr/"],
            },
            indexnow.payload("https://yallapp.com.tr", "abc", ["https://yallapp.com.tr/"]),
        )

    def test_outcomes(self):
        self.assertEqual("sent", indexnow.outcome(200))
        self.assertEqual("sent", indexnow.outcome(202))
        for status in (429, 500, 503):
            self.assertEqual("retry later", indexnow.outcome(status))
        for status in (400, 403, 422):
            self.assertEqual("refused", indexnow.outcome(status))


if __name__ == "__main__":
    unittest.main()
