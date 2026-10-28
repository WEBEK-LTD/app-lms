import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { dashboardTextFor } from "@/lib/dashboard-words";
import { accountDeletionUrl, readiness, readyToSubmit, type ReadyItem } from "@/lib/publishing/readiness";
import { NOW } from "./helpers";

const listing = { playCategory: "Education", appStoreCategory: "Education", contentRatingNotes: "Courses for adults. No ads.", reviewNotes: null };

function ready(clientId = "c1"): App {
  return {
    ...newApp(clientId, null, NOW),
    backend: "hosted",
    storeTitle: "Ada Academy",
    shortDescription: "Learn with Ada on your phone.",
    fullDescription: "Ada Academy brings every course to your phone, with lessons you can watch anywhere.",
    supportEmail: "help@academy.test",
    privacyUrl: "https://academy.test/privacy",
    phoneScreenshotIds: ["s1", "s2"],
    iphoneScreenshotIds: ["s3"],
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewPhone: "+905550000000", reviewCode: "123456" },
  };
}

const byKey = (items: ReadyItem[]) => Object.fromEntries(items.map((item) => [item.key, item]));
const base = { listing, ios: true, managed: true, platformUrl: "https://yallapp.test/" };

describe("88.1 ready to submit", () => {
  it("is ready when the reviewers can sign in, the privacy page, listing and screenshots are there", () => {
    const app = ready();
    const items = readiness({ ...base, app });
    expect(items.map((item) => item.key)).toEqual(["review", "privacy", "deletion", "ios", "listing", "screenshots"]);
    expect(items.every((item) => item.state === "ok")).toBe(true);
    expect(readyToSubmit(items)).toBe(true);
    expect(byKey(items).review!.values).toEqual({ who: "+905550000000" });
    expect(byKey(items).deletion!.values!.url).toBe(`https://yallapp.test/a/${app.id}/delete-account`);
    // The iPhone rule of the app's kind: no buy buttons for paid courses.
    expect(String(byKey(items).ios!.values!.rule)).toMatch(/never shows buy buttons for paid courses/);
  });

  it("stops on review access that doesn't fit how people sign in", () => {
    const app = ready();
    const noCode = readiness({ ...base, app: { ...app, hostedSettings: { ...app.hostedSettings!, reviewCode: null } } });
    expect(byKey(noCode).review).toMatchObject({ state: "missing", text: "reviewMissing", link: "/dashboard/app-sign-in" });
    expect(readyToSubmit(noCode)).toBe(false);
    // Email only: the test phone number doesn't help, the test email does.
    const emailOnly = { ...app, hostedSettings: { ...app.hostedSettings!, signInMethods: ["email" as const] } };
    expect(byKey(readiness({ ...base, app: emailOnly })).review!.state).toBe("missing");
    const withEmail = { ...emailOnly, hostedSettings: { ...emailOnly.hostedSettings, reviewEmail: "review@academy.test" } };
    expect(byKey(readiness({ ...base, app: withEmail })).review).toMatchObject({ state: "ok", values: { who: "review@academy.test" } });
  });

  it("102 requires a review account from WordPress and own API apps; notes alone don't do", () => {
    const site = { ...ready(), backend: "wordpress" as const, siteUrl: "https://academy.test" };
    expect(byKey(readiness({ ...base, app: site })).review).toMatchObject({ state: "missing", text: "reviewAccountMissing", link: "/dashboard/publishing#h-review" });
    expect(byKey(readiness({ ...base, app: site, listing: { ...listing, reviewNotes: "Sign in with review@academy.test and 000000." } })).review!.state).toBe("missing");
    const account = { username: "review@academy.test", passwordEncrypted: "sealed", notes: null, savedAt: NOW.toISOString() };
    const withAccount = { ...site, hostedSettings: { ...site.hostedSettings!, reviewAccount: account } };
    expect(byKey(readiness({ ...base, app: withAccount })).review).toMatchObject({ state: "ok", text: "reviewAccountOk", values: { who: "review@academy.test" } });
    const api = { ...ready(), backend: "custom_api" as const };
    expect(byKey(readiness({ ...base, app: api })).review).toMatchObject({ state: "missing", text: "reviewAccountMissing" });
    // An own API app Yallapp signs people in to has the hosted review access.
    const signedByUs = { ...api, hostedSettings: { ...api.hostedSettings!, signInBy: "yallapp" as const } };
    expect(byKey(readiness({ ...base, app: signedByUs })).review!.state).toBe("ok");
  });

  it("needs a public https privacy page", () => {
    expect(byKey(readiness({ ...base, app: { ...ready(), privacyUrl: null } })).privacy).toMatchObject({ state: "missing", text: "privacyMissing" });
    expect(byKey(readiness({ ...base, app: { ...ready(), privacyUrl: "http://academy.test/privacy" } })).privacy).toMatchObject({ state: "missing", text: "privacyHttps" });
    // Said once: the listing doesn't count it again.
    expect(byKey(readiness({ ...base, app: { ...ready(), privacyUrl: null } })).listing!.state).toBe("ok");
  });

  it("lists what the listing still needs and where to add it", () => {
    const texts = readiness({ ...base, app: { ...ready(), supportEmail: null } });
    expect(byKey(texts).listing).toMatchObject({ state: "missing", items: ["Support email"], link: "/dashboard/setup?step=listing" });
    const categories = readiness({ ...base, app: ready(), listing: { ...listing, appStoreCategory: null } });
    expect(byKey(categories).listing).toMatchObject({ state: "missing", items: ["App Store category"], link: "#h-listing" });
    // Publishing themselves: no categories asked here.
    expect(byKey(readiness({ ...base, app: ready(), listing: null, managed: false })).listing).toMatchObject({ state: "ok", text: "listingOkSelf" });
  });

  it("counts the screenshots each store needs; our team takes them when publishing for the client", () => {
    const one = { ...ready(), phoneScreenshotIds: ["s1"], iphoneScreenshotIds: [] };
    expect(byKey(readiness({ ...base, app: one, managed: false, listing: null })).screenshots).toMatchObject({ state: "missing", text: "shotsMissing", values: { play: 1, apple: 0 } });
    expect(byKey(readiness({ ...base, app: one, managed: false, listing: null, ios: false })).screenshots).toMatchObject({ state: "missing", text: "shotsMissingAndroid" });
    expect(byKey(readiness({ ...base, app: one })).screenshots).toMatchObject({ state: "note", text: "shotsWeTake" });
    // Android only: no iPhone item, no iPhone screenshots asked.
    const android = readiness({ ...base, app: { ...ready(), iphoneScreenshotIds: [] }, ios: false });
    expect(byKey(android).ios).toBeUndefined();
    expect(byKey(android).screenshots).toMatchObject({ state: "ok", text: "shotsOkAndroid" });
  });

  it("has every text in English, Arabic and Turkish", () => {
    const app = ready();
    const all = [
      ...readiness({ ...base, app }),
      ...readiness({ ...base, app: { ...app, privacyUrl: null, supportEmail: null, phoneScreenshotIds: [], hostedSettings: { ...app.hostedSettings!, reviewCode: null } }, managed: false }),
      ...readiness({ ...base, app: { ...app, backend: "wordpress" } }),
    ];
    for (const lang of ["en", "ar", "tr"] as const) {
      const { t } = dashboardTextFor(lang);
      for (const item of all) {
        const text = t(`publishing.ready.${item.text}` as never, { ...item.values, items: "x" });
        expect(text).not.toMatch(/^publishing\./);
        expect(text).not.toMatch(/\{\w+\}/);
        expect(t(`publishing.ready.${item.key}` as never)).not.toMatch(/^publishing\./);
      }
      expect(t("publishing.ready.notReady", { count: 2 })).toMatch(/2|أمران/);
    }
  });

  it("gives each app its own account deletion page", () => {
    expect(accountDeletionUrl("https://yallapp.test///", "a1")).toBe("https://yallapp.test/a/a1/delete-account");
  });
});
