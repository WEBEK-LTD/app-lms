import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isSetupComplete, newApp, stepStatus } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import { PLAN_INFO } from "@/lib/plans";
import type { App } from "@/lib/data/types";
import { notifyPublishingStatus, publishingTeamEmail } from "@/lib/publishing/service";
import {
  applyChecklist,
  canUseManagedPublishing,
  checklistProgress,
  EMPTY_LISTING,
  listingMissing,
  newPublishingRequest,
  PUBLISHING_STEPS,
  statusText,
  stepDone,
  stepText,
  storeUrlProblem,
  trackChangeProblems,
} from "@/lib/publishing/steps";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW, days } from "./helpers";

function listedApp(clientId: string): App {
  return {
    ...newApp(clientId, "https://academy.test", NOW),
    storeTitle: "Ada Academy",
    shortDescription: "Learn with Ada on your phone.",
    fullDescription: "Ada Academy brings every course to your phone.",
    supportEmail: "help@academy.test",
    privacyUrl: "https://academy.test/privacy",
  };
}

const fullListing = { playCategory: "Education", appStoreCategory: "Education", contentRatingNotes: "Courses for adults. No ads.", reviewNotes: null };

describe("the “Publish it for me” checklist", () => {
  it("comes with the plans that have “We publish for you”", () => {
    expect(canUseManagedPublishing(PLAN_INFO.pro)).toBe(true);
    expect(canUseManagedPublishing(PLAN_INFO.business)).toBe(true);
    expect(canUseManagedPublishing(PLAN_INFO.starter)).toBe(false);
    expect(canUseManagedPublishing(PLAN_INFO.growth)).toBe(false);
    expect(canUseManagedPublishing(null)).toBe(false);
  });

  it("links only to Google's, Apple's, Firebase's, Samsung's, Huawei's and Xiaomi's own pages, and never asks for a password", () => {
    const hosts = new Set(PUBLISHING_STEPS.flatMap((s) => s.links.map((l) => new URL(l.href).hostname)));
    for (const host of hosts) {
      expect([
        "play.google.com",
        "support.google.com",
        "developer.apple.com",
        "appstoreconnect.apple.com",
        "console.firebase.google.com",
        "firebase.google.com",
        // 35, 36
        "seller.samsungapps.com",
        "developer.samsung.com",
        "developer.huawei.com",
        // 42
        "dev.mi.com",
        "global.developer.mi.com",
      ]).toContain(host);
    }
    for (const step of PUBLISHING_STEPS) {
      expect(step.text.toLowerCase()).not.toMatch(/password/);
      for (const link of step.links) expect(link.href.startsWith("https://")).toBe(true);
    }
    // Apple needs a D-U-N-S number from organisations.
    expect(PUBLISHING_STEPS.find((s) => s.id === "apple_account")!.text).toContain("D-U-N-S");
  });

  it("shows the team email in the invitation steps", () => {
    const invite = PUBLISHING_STEPS.find((s) => s.id === "apple_invite")!;
    expect(stepText(invite, "publish@yallapp.test")).toContain("add publish@yallapp.test with the App Manager role");
    expect(stepText(PUBLISHING_STEPS.find((s) => s.id === "play_invite")!, "publish@yallapp.test")).toContain("enter publish@yallapp.test");
  });

  it("keeps when each step was first ticked, and forgets unticked or unknown ones", () => {
    const first = applyChecklist({}, ["play_account", "nonsense"], NOW);
    expect(first).toEqual({ play_account: NOW.toISOString() });
    const second = applyChecklist(first, ["play_account", "play_invite"], days(1));
    expect(second).toEqual({ play_account: NOW.toISOString(), play_invite: days(1).toISOString() });
    expect(applyChecklist(second, ["play_invite"], days(2))).toEqual({ play_invite: days(1).toISOString() });
  });

  it("counts the Firebase step as done when our team creates the project", () => {
    const request = newPublishingRequest({ id: "a1", clientId: "c1" }, "managed", NOW);
    expect(stepDone(request, "firebase")).toBe(false);
    expect(stepDone({ ...request, firebaseBy: "team" }, "firebase")).toBe(true);
  });

  it("is ready when every step is ticked and the listing is complete; screenshots are optional", () => {
    const app = listedApp("c1");
    const request = newPublishingRequest(app, "managed", NOW);
    expect(request).toMatchObject({ requestedAt: NOW, readyAt: null, android: { status: "waiting_client" }, ios: { status: "waiting_client" } });
    expect(checklistProgress(request, app)).toEqual({ done: 0, total: 6, complete: false });
    expect(listingMissing(app, EMPTY_LISTING)).toEqual(["Google Play category", "App Store category", "Content rating notes"]);
    const ticked = { ...request, firebaseBy: "team" as const, checklist: applyChecklist({}, ["play_account", "play_invite", "apple_account", "apple_invite"], NOW) };
    expect(checklistProgress(ticked, app)).toMatchObject({ done: 5, complete: false });
    expect(checklistProgress({ ...ticked, listing: fullListing }, app)).toMatchObject({ done: 6, complete: true });
    expect(listingMissing({ ...app, privacyUrl: null }, fullListing)).toEqual(["Privacy policy URL"]);
  });
});

describe("store statuses", () => {
  it("explain each status to the client", () => {
    expect(statusText("android", "in_review")).toBe("Google is reviewing your app. This usually takes a few days.");
    expect(statusText("ios", "live")).toBe("Your app is live on the App Store.");
    expect(statusText("ios", "rejected")).toMatch(/^Apple asked for changes/);
  });

  it("need a note when rejected and the store's own link when live", () => {
    expect(trackChangeProblems("android", { status: "rejected", note: " ", storeUrl: "" })).toHaveProperty("note");
    expect(trackChangeProblems("android", { status: "live", note: "", storeUrl: "" })).toHaveProperty("storeUrl");
    expect(trackChangeProblems("android", { status: "done", note: "", storeUrl: "" })).toHaveProperty("status");
    expect(trackChangeProblems("android", { status: "live", note: "", storeUrl: "https://play.google.com/store/apps/details?id=com.ada.app" })).toEqual({});
    expect(storeUrlProblem("android", "https://apps.apple.com/app/id1")).toMatch(/play\.google\.com/);
    expect(storeUrlProblem("ios", "https://apps.apple.com/tr/app/ada/id123")).toBeNull();
    expect(storeUrlProblem("ios", "javascript:alert(1)")).not.toBeNull();
    expect(storeUrlProblem("ios", "")).toBeNull();
  });
});

describe("the setup with “Publish it for me”", () => {
  it("doesn't need store keys on Pro when our team publishes", () => {
    const app: App = {
      ...listedApp("c1"),
      websiteDoneAt: NOW,
      appName: "Ada Academy",
      shortName: "Ada",
      iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
      brandingDoneAt: NOW,
      androidPackage: "com.adaacademy.app",
      iosBundleId: "com.adaacademy.app",
      listingDoneAt: NOW,
      publishingDoneAt: NOW,
    };
    expect(stepStatus(app, "pro").publishing).toBe(false);
    expect(isSetupComplete({ ...app, publishingMode: "managed" }, "pro")).toBe(true);
    expect(isSetupComplete({ ...app, publishingMode: "self" }, "pro")).toBe(false);
  });
});

describe("publishing data", () => {
  it("keeps one request per app, managed ones in request order, and the history newest first", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ada", email: "ada@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    const first = listedApp(client.id);
    const second = { ...listedApp(client.id), id: "9a8e5a52-6c1b-4c39-9d7e-5b0c0e9a1a99", createdAt: days(1) };
    await store.createApp(first);
    await store.createApp(second);
    await store.savePublishingRequest(newPublishingRequest(second, "managed", days(2)));
    await store.savePublishingRequest(newPublishingRequest(first, "managed", days(3)));
    await store.savePublishingRequest({ ...(await store.getPublishingRequest(first.id))!, mode: "self" });
    expect((await store.listManagedPublishingRequests()).map((r) => r.appId)).toEqual([second.id]);
    await expect(store.savePublishingRequest(newPublishingRequest({ id: "unknown", clientId: client.id }, "managed", NOW))).rejects.toThrow();

    await store.addPublishingEvent({ appId: second.id, store: "android", status: "accounts_ready", note: null, actorEmail: "t@y.test", at: days(4) });
    await store.addPublishingEvent({ appId: second.id, store: "ios", status: "submitted", note: "Sent", actorEmail: "t@y.test", at: days(5) });
    expect((await store.listPublishingEvents(second.id)).map((e) => e.status)).toEqual(["submitted", "accounts_ready"]);
    expect(await store.listPublishingEvents(first.id)).toEqual([]);
  });
});

describe("publishing emails", () => {
  it("use the team email from Settings, else the contact email", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    expect(await publishingTeamEmail(store)).toBe("info@yallapp.com.tr");
    await store.setPlatformSetting("contact", { whatsapp: "+90 500 000 00 00", email: "hello@yallapp.test" }, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect(await publishingTeamEmail(store)).toBe("hello@yallapp.test");
    await store.setPlatformSetting("publishing", { teamEmail: "publish@yallapp.test" }, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect(await publishingTeamEmail(store)).toBe("publish@yallapp.test");
    clearPlatformSettingsCache();
  });

  it("tell the client about a new status, with the team's note and the store link", async () => {
    const dir = path.join(tmpdir(), `yallapp-publishing-mail-${Date.now()}`);
    process.env.YALLAPP_MAIL_DIR = dir;
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    try {
      const store = await getStore();
      const email = `ada-${Date.now()}@academy.test`;
      const { client } = await registerClient(store, { name: "Ada", email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
      const app = { ...listedApp(client.id), appName: "Ada Academy" };
      await store.createApp(app);
      const request = newPublishingRequest(app, "managed", NOW);
      const live = { ...request, android: { status: "live" as const, note: "Welcome to Google Play!", storeUrl: "https://play.google.com/store/apps/details?id=com.ada.app", updatedAt: NOW } };
      await notifyPublishingStatus(store, live, "android");
      const [file] = await readdir(dir);
      const mail = JSON.parse(await readFile(path.join(dir, file!), "utf8")) as Record<string, string>;
      expect(mail).toMatchObject({ to: email, subject: "Ada Academy on Google Play: Live" });
      expect(mail.text).toContain("Your app is live on Google Play.");
      expect(mail.text).toContain("Note: Welcome to Google Play!");
      expect(mail.text).toContain("Your app: https://play.google.com/store/apps/details?id=com.ada.app");
      expect(mail.text).toContain(`https://yallapp.com.tr/dashboard/open/${app.id}?to=publishing`);
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      vi.unstubAllEnvs();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
