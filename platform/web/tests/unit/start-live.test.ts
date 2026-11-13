import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar as startAr, en as startEn, tr as startTr } from "@/i18n/dashboard/start";
import { ALL_DEMO_TYPES, DEMO_SLUGS } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { LIVE_PHONE, liveStart, previewHasPages } from "@/lib/demo/live";
import { demoLoop, liveLanguage, LOOP_DIR, LOOP_SIZE } from "@/lib/demo/loops";

/**
 * 128.9 The demos alive on /start: every demo has its loop for its card
 * (public/loops, small), the live app in the phone opens in a language the
 * demo has, loads by itself only on a desktop that allows motion and data,
 * and replaces the screenshot only once it has its pages.
 */

const PUBLIC = join(__dirname, "../../public");

describe("the demos' loops on the /start cards", () => {
  it("are at /loops/<slug>, a WebM and an MP4 for every demo", () => {
    for (const id of ALL_DEMO_TYPES) {
      const loop = demoLoop(id);
      expect(loop).toEqual({ webm: `${LOOP_DIR}/${DEMO_SLUGS[id]}.webm`, mp4: `${LOOP_DIR}/${DEMO_SLUGS[id]}.mp4` });
    }
    // Every demo once: no two share a file.
    expect(new Set(ALL_DEMO_TYPES.map((id) => demoLoop(id).webm)).size).toBe(ALL_DEMO_TYPES.length);
  });

  it("are made for every demo, each small enough for a card (under 600 KB)", () => {
    for (const id of ALL_DEMO_TYPES) {
      for (const file of Object.values(demoLoop(id))) {
        const size = statSync(join(PUBLIC, file)).size;
        expect(size, file).toBeGreaterThan(5_000);
        expect(size, file).toBeLessThan(600_000);
      }
    }
  });

  it("are real videos: WebM (EBML) and MP4 (ftyp), at the loops' size", () => {
    for (const id of ALL_DEMO_TYPES) {
      const { webm, mp4 } = demoLoop(id);
      expect(readFileSync(join(PUBLIC, webm)).subarray(0, 4).toString("hex"), webm).toBe("1a45dfa3");
      expect(readFileSync(join(PUBLIC, mp4)).subarray(4, 8).toString("latin1"), mp4).toBe("ftyp");
    }
    // The phone's shape, as the screenshots and the live app.
    expect(LOOP_SIZE.width / LOOP_SIZE.height).toBeCloseTo(LIVE_PHONE.width / LIVE_PHONE.height, 2);
  });
});

describe("the live demo app in the phone", () => {
  it("opens in the dashboard's language when the demo has it, else in the demo's first", () => {
    expect(liveLanguage(DEMO_BRANDS.lms.languages, "ar")).toBe("ar");
    expect(liveLanguage(DEMO_BRANDS.lms.languages, "tr")).toBe("tr");
    // Lale Flowers has no Arabic: English, its first.
    expect(DEMO_BRANDS.store.languages).not.toContain("ar");
    expect(liveLanguage(DEMO_BRANDS.store.languages, "ar")).toBe(DEMO_BRANDS.store.languages[0]);
    expect(liveLanguage([], "ar")).toBe("en");
    for (const id of ALL_DEMO_TYPES) expect(DEMO_BRANDS[id].languages).toContain(liveLanguage(DEMO_BRANDS[id].languages, "tr"));
  });

  it("loads by itself on a desktop only; on a phone, with Save-Data or with reduced motion, on a tap", () => {
    expect(liveStart({ desktop: true, saveData: false, reducedMotion: false })).toBe("view");
    expect(liveStart({ desktop: false, saveData: false, reducedMotion: false })).toBe("tap");
    expect(liveStart({ desktop: true, saveData: true, reducedMotion: false })).toBe("tap");
    expect(liveStart({ desktop: true, saveData: false, reducedMotion: true })).toBe("tap");
  });

  it("is ready once the hosted API answered its pages, not before (never a blank or loading app)", () => {
    const app = "0b0c2f7e-7d1e-4c55-9a43-5d0e5a8f1c11";
    const base = "http://localhost:3210";
    expect(previewHasPages([], app)).toBe(false);
    expect(previewHasPages([{ name: `${base}/api/preview/p1.x/config`, responseEnd: 120 }, { name: `${base}/api/app/${app}/config?platform=android`, responseEnd: 300 }], app)).toBe(false);
    // Asked, not answered yet.
    expect(previewHasPages([{ name: `${base}/api/app/${app}/pages`, responseEnd: 0 }], app)).toBe(false);
    // Another app's pages don't count.
    expect(previewHasPages([{ name: `${base}/api/app/aaaaaaaa-7d1e-4c55-9a43-5d0e5a8f1c11/pages`, responseEnd: 500 }], app)).toBe(false);
    expect(previewHasPages([{ name: `${base}/api/app/${app}/pages?lang=en`, responseEnd: 640 }], app)).toBe(true);
    expect(previewHasPages([{ name: "not a url ::", responseEnd: 1 }], app)).toBe(false);
  });

  it("has its words in English, Arabic and Turkish", () => {
    for (const words of [startEn, startAr, startTr]) {
      for (const key of ["liveTry", "liveOpening", "liveFrame", "liveFull"] as const) expect(words[key], key).toBeTruthy();
      expect(words.liveFrame).toContain("{app}");
    }
  });
});
