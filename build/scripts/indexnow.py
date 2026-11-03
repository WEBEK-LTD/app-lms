#!/usr/bin/env python3
"""Tell IndexNow (Bing and the other engines that share it) about the public site's pages.

Used by .github/workflows/indexnow.yml after a deploy of main. Google doesn't use IndexNow;
it reads the sitemap as before.

  indexnow.py [--site https://yallapp.com.tr] [--wait SECONDS] [--dry-run]

The key is public by design: IndexNow checks that <site>/<key>.txt answers with it. It lives
in build/indexnow-key.txt and in platform/web/public/<key>.txt (the file the site serves).

Exit codes: 0 sent, or the engine is busy (429, 5xx: a warning, the next deploy sends again);
1 refused (400, 403, 422: a wrong key or site, which needs fixing); 2 the site wasn't ready.
Standard library only.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
KEY_FILE = ROOT / "build" / "indexnow-key.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS = 10000
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
USER_AGENT = "yallapp-indexnow/1"


def read_key(path=KEY_FILE):
    return path.read_text(encoding="utf-8").strip()


def parse_sitemap(xml_text):
    """(page URLs, child sitemap URLs) of a sitemap or a sitemap index."""
    root = ET.fromstring(xml_text)
    locs = [el.text.strip() for el in root.iter(f"{NS}loc") if el.text and el.text.strip()]
    if root.tag == f"{NS}sitemapindex":
        return [], locs
    return locs, []


def keep_site_urls(urls, host, limit=MAX_URLS):
    """Only http(s) URLs on the site's host, without duplicates, in order, at most `limit`."""
    seen, out = set(), []
    for url in urls:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or parsed.hostname != host or url in seen:
            continue
        seen.add(url)
        out.append(url)
        if len(out) >= limit:
            break
    return out


def payload(site, key, urls):
    host = urlparse(site).hostname
    return {"host": host, "key": key, "keyLocation": f"{site}/{key}.txt", "urlList": urls}


def outcome(status):
    """'sent', 'retry later' (a warning) or 'refused' (fails the run)."""
    if status in (200, 202):
        return "sent"
    if status == 429 or status >= 500:
        return "retry later"
    return "refused"


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.status, res.read().decode("utf-8", "replace")


def wait_until_live(site, key, wait, every=30):
    """True once the key file answers with the key and the sitemap answers 200."""
    deadline = time.monotonic() + wait
    while True:
        try:
            k_status, k_body = fetch(f"{site}/{key}.txt")
            s_status, _ = fetch(f"{site}/sitemap.xml")
            if k_status == 200 and k_body.strip() == key and s_status == 200:
                return True
            print(f"Not live yet: key file {k_status}, sitemap {s_status}")
        except (urllib.error.URLError, OSError) as error:
            print(f"Not live yet: {error}")
        if time.monotonic() + every > deadline:
            return False
        time.sleep(every)


def collect(site, host):
    urls, queue, seen = [], [f"{site}/sitemap.xml"], set()
    while queue and len(urls) < MAX_URLS:
        sitemap = queue.pop(0)
        if sitemap in seen:
            continue
        seen.add(sitemap)
        _, text = fetch(sitemap)
        pages, children = parse_sitemap(text)
        urls.extend(pages)
        queue.extend(u for u in children if urlparse(u).hostname == host)
    return keep_site_urls(urls, host)


def summary(lines):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    text = "\n".join(lines) + "\n"
    print(text)
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(text)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="https://yallapp.com.tr")
    parser.add_argument("--wait", type=int, default=1200, help="seconds to wait for the deploy")
    parser.add_argument("--dry-run", action="store_true", help="list the URLs, send nothing")
    args = parser.parse_args(argv)
    site = args.site.rstrip("/")
    host = urlparse(site).hostname
    key = read_key()

    if not wait_until_live(site, key, args.wait):
        summary(["### IndexNow", "", f"- **Not sent**: {site}/{key}.txt or the sitemap didn't answer in time."])
        return 2
    urls = collect(site, host)
    if args.dry_run:
        summary(["### IndexNow (dry run)", "", f"- {len(urls)} URLs would be sent."])
        return 0

    body = json.dumps(payload(site, key, urls)).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=body, method="POST",
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            status, text = res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        status, text = error.code, error.read().decode("utf-8", "replace")
    result = outcome(status)
    summary([
        "### IndexNow",
        "",
        f"- {len(urls)} URLs from {site}/sitemap.xml",
        f"- Answer: {status} ({result}){': ' + text[:300] if text.strip() else ''}",
    ])
    if result == "refused":
        print(f"::error::IndexNow refused the URLs ({status}). Check the key file and the site.")
        return 1
    if result == "retry later":
        print(f"::warning::IndexNow answered {status}; the next deploy sends again.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
