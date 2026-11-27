import { describe, expect, it } from "vitest";
import { jsonBody, list, zonedToUtc } from "@/components/community/site/form-body";
import { cmLinks } from "@/components/community/site/links";
import { CM_WORDS2, SHOWCASE_TYPES } from "@/components/community/site/words2";
import { CM_LANGS } from "@/components/community/site/words";

/** 232–234 The website's phase 2–4 forms and words. */
describe("232 a form's fields as the API's JSON body", () => {
  it("reads numbers, yes/no, lists and plain text, and leaves the form's own fields out", () => {
    const f = new FormData();
    f.set("_m", "POST");
    f.set("_p", "/jobs");
    f.set("title", "  Build my menu app  ");
    f.set("n:reward_points", "150");
    f.set("n:capacity", "");
    f.append("b:remote", "0");
    f.append("b:remote", "1");
    f.set("b:other", "0");
    f.set("l:skills", "Studio, payments\nUI design");
    f.append("l:entry_ids", "a");
    f.append("l:entry_ids", "b");
    expect(jsonBody(f)).toEqual({ title: "Build my menu app", reward_points: 150, capacity: null, remote: true, other: false, skills: ["Studio", "payments", "UI design"], entry_ids: ["a", "b"] });
    expect(list(" a ,, b\n\nc ")).toEqual(["a", "b", "c"]);
  });

  it("sends an optional link left empty as no link, and keeps other empty text", () => {
    const f = new FormData();
    f.set("cover_url", "");
    f.set("embed_url", " https://www.youtube.com/live/x ");
    f.set("summary", "");
    expect(jsonBody(f)).toEqual({ cover_url: null, embed_url: "https://www.youtube.com/live/x", summary: "" });
  });

  it("turns a datetime-local into UTC in the event's time zone", () => {
    expect(zonedToUtc("2026-12-01T19:00", "Europe/Istanbul")).toBe("2026-12-01T16:00:00.000Z");
    expect(zonedToUtc("2026-07-01T10:30", "Europe/London")).toBe("2026-07-01T09:30:00.000Z");
    expect(zonedToUtc("2026-12-01T19:00", "UTC")).toBe("2026-12-01T19:00:00.000Z");
    expect(zonedToUtc("not a date", "UTC")).toBeNull();
    const f = new FormData();
    f.set("time_zone", "Asia/Dubai");
    f.set("d:starts_at", "2026-12-01T09:00");
    f.set("d:ends_at", "");
    expect(jsonBody(f)).toMatchObject({ time_zone: "Asia/Dubai", starts_at: "2026-12-01T05:00:00.000Z", ends_at: null });
  });
});

describe("232–234 the new pages' addresses and words", () => {
  it("are under the Community's own paths", () => {
    expect(cmLinks.post("p 1")).toBe("/community/posts/p%201");
    expect(cmLinks.group("app-makers", "members")).toBe("/community/groups/app-makers/members");
    expect(cmLinks.lesson("first-app", "l1")).toBe("/community/academy/first-app/l1");
    expect(cmLinks.events("past")).toBe("/community/events?when=past");
    expect(cmLinks.showcase({ sort: "most_liked" })).toBe("/community/showcase?sort=most_liked");
  });

  it("are in English, Arabic and Turkish, with the same keys and slots", () => {
    const keys = Object.keys(CM_WORDS2.en).sort();
    for (const lang of CM_LANGS) {
      const w = CM_WORDS2[lang];
      expect(Object.keys(w).sort()).toEqual(keys);
      for (const k of keys) {
        const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(slots(w[k as keyof typeof w]), `${lang}.${k}`).toEqual(slots(CM_WORDS2.en[k as keyof typeof w]));
      }
      for (const t of SHOWCASE_TYPES) expect(w[`st_${t}`]).toBeTruthy();
    }
  });

  it("say no money moves on the platform, and sell nothing in the app", () => {
    for (const lang of CM_LANGS) {
      const all = JSON.stringify(CM_WORDS2[lang]);
      expect(all).not.toMatch(/\b(?:checkout|subscribe|in-app purchase)\b/i);
    }
    expect(CM_WORDS2.en.noMoneyNote).toMatch(/doesn't take or hold payments/);
  });
});
