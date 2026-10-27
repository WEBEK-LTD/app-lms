import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { checkConnection } from "@/lib/admin/connection";
import { failedApiCheck, recordApiCheck } from "@/lib/app/api-check-notice";
import { newApp, stepStatus, websiteReady } from "@/lib/app/setup";
import { httpsSiteAddress, moveToWordpress } from "@/lib/app/wordpress-ready";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { emailTemplate, placeholderErrors } from "@/lib/email/templates";
import { emailSignInPossible } from "@/lib/hosted/sign-in-methods";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { mailDelivered } from "@/lib/mail";
import { choosePublishingMode, notifyPublishingTeam } from "@/lib/publishing/service";
import { isLiveEverywhere, isLiveSomewhere, newPublishingRequest, openPublishingCount, publishingEventLabel } from "@/lib/publishing/steps";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { websiteSchema } from "@/lib/validation";
import { KEY, NOW, days } from "./helpers";

/**
 * Roadmap 19: "Set up WordPress for me, set it up for me" (setup_requested),
 * hosted apps without a content source, the API check on save, and
 * "Publish it for me" (team emails that fail, switching back, re-requests).
 */

/** A client with one app waiting for its WordPress site, activated on its own license. */
async function waitingApp(store = new MemoryStore()) {
  const { user, client } = await registerClient(
    store,
    { name: "Ada", email: `ada-${Math.random().toString(36).slice(2)}@academy.test`, whatsapp: "+905446731942", siteUrl: "", password: null },
    NOW,
  );
  const app: App = { ...newApp(client.id, null, NOW, "lms"), appName: "Ada Academy", backend: "setup_requested", setupRequestedAt: NOW, websiteDoneAt: NOW };
  await store.createApp(app);
  const outcome = await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return { store, user, client, app, licenseKey: outcome.licenseKey as string };
}

function site(licenseKey: string, url: string) {
  const parsed = parseSiteInfo({ license_key: licenseKey, site_url: url, plugin_version: "0.3.0", wp_version: "6.8", lms: "tutor" });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.result));
  return parsed.value;
}

describe("asking us to set up WordPress", () => {
  it("doesn't need a website: an empty one is saved as none", () => {
    const empty = websiteSchema.safeParse({ backend: "setup_requested", siteUrl: "" });
    expect(empty.success && empty.data.backend === "setup_requested" && empty.data.siteUrl).toBeNull();
    const missing = websiteSchema.safeParse({ backend: "setup_requested" });
    expect(missing.success && missing.data.backend === "setup_requested" && missing.data.siteUrl).toBeNull();
    const given = websiteSchema.safeParse({ backend: "setup_requested", siteUrl: "shop.test" });
    expect(given.success && given.data.backend === "setup_requested" && given.data.siteUrl).toBe("https://shop.test");
    const insecure = websiteSchema.safeParse({ backend: "setup_requested", siteUrl: "http://shop.test" });
    expect(insecure.success ? null : insecure.error.issues[0]?.message).toBe("Your website must use https. Apps can only connect to secure sites.");
    // A WordPress site still needs its address.
    expect(websiteSchema.safeParse({ backend: "wordpress", siteUrl: "" }).success).toBe(false);
  });

  it("lets the owner choose how people sign in while they wait", () => {
    expect(emailSignInPossible({ backend: "setup_requested", connector: null })).toBe(true);
    expect(emailSignInPossible({ backend: "custom_api", connector: null })).toBe(false);
  });

  it("turns a site the plugin reports into its https address", () => {
    expect(httpsSiteAddress("http://www.Academy.test/")).toBe("https://www.academy.test");
    expect(httpsSiteAddress("academy.test/school/")).toBe("https://academy.test/school");
    expect(httpsSiteAddress("https://academy.test:8443/?x=1#y")).toBe("https://academy.test:8443");
    expect(httpsSiteAddress("not a site")).toBeNull();
    expect(httpsSiteAddress("ftp://academy.test")).toBeNull();
    expect(httpsSiteAddress("")).toBeNull();
  });
});

describe("the WordPress site is ready", () => {
  it("moves the app to it when the plugin activates its license there, and tells the owner", async () => {
    const { store, app, client, licenseKey } = await waitingApp();
    const mail = vi.fn(async () => undefined);
    const result = await activateLicense(store, site(licenseKey, "http://new.academy.test/"), NOW, { mail, baseUrl: "https://yallapp.test" });
    expect(result.status).toBe(200);
    const moved = (await store.getAppById(app.id))!;
    expect(moved).toMatchObject({ backend: "wordpress", siteUrl: "https://new.academy.test" });
    expect(websiteReady(moved)).toBe(true);
    expect(stepStatus(moved, "pro").website).toBe(true);
    const [notice] = await store.listOwnerNotices({ clientId: client.id, open: true });
    expect(notice).toMatchObject({ kind: "wordpress_ready", linkUrl: `https://yallapp.test/dashboard/open/${app.id}?to=setup`, linkLabel: "Continue setup" });
    expect(notice!.body).toContain("https://new.academy.test");
    expect(mail).toHaveBeenCalledTimes(1);
    expect(mail).toHaveBeenCalledWith("wordpress_ready", expect.stringMatching(/@academy\.test$/), expect.objectContaining({ website: "https://new.academy.test", app_name: "Ada Academy" }));

    // Activating again (same site) changes nothing and sends nothing more.
    await activateLicense(store, site(licenseKey, "https://new.academy.test"), NOW, { mail, baseUrl: "https://yallapp.test" });
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("leaves apps that aren't waiting alone", async () => {
    const { store, app, licenseKey } = await waitingApp();
    await store.updateApp(app.id, { backend: "custom_api", apiBaseUrl: "https://api.academy.test/v1", siteUrl: "https://academy.test" }, NOW);
    const mail = vi.fn(async () => undefined);
    await activateLicense(store, site(licenseKey, "https://other.test"), NOW, { mail });
    expect((await store.getAppById(app.id))?.backend).toBe("custom_api");
    expect(mail).not.toHaveBeenCalled();
    expect(await moveToWordpress({ store, now: NOW, baseUrl: "", mail }, (await store.getAppById(app.id))!, "https://x.test")).toBeNull();
  });

  it("is what our team marks on the client's page, once per request", async () => {
    const { store, app, client } = await waitingApp();
    const mail = vi.fn(async () => undefined);
    const moved = await moveToWordpress({ store, now: NOW, baseUrl: "https://yallapp.test", mail }, app, "https://academy.test");
    expect(moved).toMatchObject({ backend: "wordpress", siteUrl: "https://academy.test", connector: null });
    expect(await store.countOwnerNotices(app.id, "wordpress_ready")).toBe(1);
    // A second request later is a new notice.
    await store.updateApp(app.id, { backend: "setup_requested", setupRequestedAt: days(2) }, days(2));
    await moveToWordpress({ store, now: days(3), baseUrl: "", mail }, (await store.getAppById(app.id))!, "https://academy.test");
    expect(await store.countOwnerNotices(app.id, "wordpress_ready")).toBe(2);
    expect(mail).toHaveBeenCalledTimes(2);
    expect((await store.listOwnerNotices({ clientId: client.id })).every((n) => n.kind === "wordpress_ready")).toBe(true);
  });

  it("has an email the team can edit", () => {
    const template = emailTemplate("wordpress_ready")!;
    expect(template.subject).toBe("{{app_name}}: your WordPress site is ready");
    expect(placeholderErrors(template.body, template)).toEqual([]);
    expect(template.body).toContain("{{setup_url}}");
  });

  it("says in the admin's connection check whether the plugin is active yet", async () => {
    const { store, app, licenseKey } = await waitingApp();
    expect((await checkConnection(store, app, KEY)).message).toBe("Waiting for our team to set up WordPress: the plugin isn't active on a site yet.");
    // Activated before the client asked (so the app wasn't moved): the check looks at that site.
    const license = (await store.listLicensesByClient(app.clientId))[0]!;
    await store.claimActivation({
      licenseId: license.id,
      siteUrl: "localhost",
      siteUrlRaw: "https://localhost",
      pluginVersion: "0.3.0",
      wpVersion: null,
      lms: null,
      store: null,
      bookings: null,
      activatedAt: NOW,
      lastCheckedAt: NOW,
    });
    expect(licenseKey).toBeTruthy();
    const status = await checkConnection(store, app, KEY);
    expect(status.ok).toBe(false);
    expect(status.message).toContain("The plugin is active on localhost");
  });
});

describe("hosted apps without a content source", () => {
  it("keep the Website step open until the owner chooses one", () => {
    const app: App = { ...newApp("c", null, NOW, "store"), backend: "hosted", websiteDoneAt: NOW };
    expect(websiteReady(app)).toBe(false);
    expect(stepStatus(app, "pro").website).toBe(false);
    expect(websiteReady({ ...app, connector: { kind: "catalog" } })).toBe(true);
    expect(websiteReady({ ...app, appType: "real_estate", connector: { kind: "listings" } })).toBe(true);
  });
});

describe("the API check when the owner saves their own API", () => {
  const failing = {
    ok: false,
    checks: [
      { id: "reachable" as const, label: "The API answers", ok: true },
      { id: "config" as const, label: "Config is valid", ok: false, detail: "the response isn't a JSON object" },
    ],
  };

  it("leaves a notice while it fails, and resolves it when it passes", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ada", email: "ada@api.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, "https://api.test", NOW, "store"), appName: "Ada Shop", backend: "custom_api", apiBaseUrl: "https://api.test/v1" };
    await store.createApp(app);
    const notice = await recordApiCheck(store, app, failing, NOW, "https://yallapp.test/");
    expect(notice).toMatchObject({ kind: "api_check_failed", tone: "warn", linkUrl: "https://yallapp.test/dashboard/setup?step=website", emailedAt: null });
    expect(notice!.body).toBe("Config is valid: the response isn't a JSON object. Your app can't load its content until these pass.");
    // Closed on the overview, it still shows on Builds & downloads.
    await store.updateOwnerNotice(client.id, notice!.id, { dismissedAt: NOW });
    expect((await failedApiCheck(store, app))?.id).toBe(notice!.id);
    // A second failure replaces it.
    const again = await recordApiCheck(store, app, failing, days(1), "https://yallapp.test");
    expect(again?.id).not.toBe(notice!.id);
    expect((await failedApiCheck(store, app))?.id).toBe(again!.id);
    await recordApiCheck(store, app, { ok: true, checks: [] }, days(2), "https://yallapp.test");
    expect(await failedApiCheck(store, app)).toBeNull();
    // Apps that don't use their own API never show it.
    await recordApiCheck(store, app, failing, days(3), "https://yallapp.test");
    expect(await failedApiCheck(store, { ...app, backend: "wordpress" })).toBeNull();
  });
});

describe("“Publish it for me”", () => {
  async function managedSetup() {
    const store = await getStore();
    const email = `pub-${Date.now()}-${Math.random().toString(36).slice(2)}@academy.test`;
    const { user, client } = await registerClient(store, { name: "Ada", email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    const app: App = { ...newApp(client.id, "https://a.test", NOW), appName: "Ada Academy" };
    await store.createApp(app);
    return { store, user, client, app };
  }

  async function withMailDir<T>(run: (mails: () => Promise<{ to: string; subject: string; text: string }[]>) => Promise<T>): Promise<T> {
    const dir = path.join(tmpdir(), `yallapp-19-mail-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    process.env.YALLAPP_MAIL_DIR = dir;
    try {
      return await run(async () => {
        const files = await readdir(dir).catch(() => [] as string[]);
        return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8"))));
      });
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("starts a new request from now, and tells the team when the client publishes themselves after all", async () => {
    await withMailDir(async (mails) => {
      const { store, user, client, app } = await managedSetup();
      const context = { user, staff: null, client, app };
      const first = await choosePublishingMode(store, context, "managed", NOW);
      expect(first).toMatchObject({ mode: "managed", requestedAt: NOW });
      let fresh = (await store.getAppById(app.id))!;
      expect(fresh).toMatchObject({ publishingMode: "managed", publishingDoneAt: NOW });

      await choosePublishingMode(store, { ...context, app: fresh }, "self", days(1));
      fresh = (await store.getAppById(app.id))!;
      expect(fresh.publishingMode).toBe("self");
      expect((await mails()).map((m) => m.subject)).toEqual(
        expect.arrayContaining(["Publishing: Ada asked us to publish their app", "Publishing: Ada will publish their app themselves"]),
      );

      // Asking again is a new request: its place in the queue is from now.
      const again = await choosePublishingMode(store, { ...context, app: fresh }, "managed", days(5));
      expect(again.requestedAt).toEqual(days(5));
      const events = await store.listPublishingEvents(app.id);
      expect(events.map((e) => publishingEventLabel(e, "team"))).toEqual([
        "Asked us to publish the app",
        "Will publish the app themselves",
        "Asked us to publish the app",
      ]);
      expect(events.every((e) => e.actorEmail === user.email)).toBe(true);
      expect(publishingEventLabel(events[1]!, "client")).toBe("You chose to publish your app yourself");
      expect(publishingEventLabel({ store: "android", status: "waiting_client" }, "client")).toBe("Google Play: Waiting for you");
      // Choosing the same again changes nothing.
      await choosePublishingMode(store, { ...context, app: (await store.getAppById(app.id))! }, "managed", days(6));
      expect(await store.listPublishingEvents(app.id)).toHaveLength(3);
    });
  });

  it("flags the request when the team email isn't sent, until one goes out", async () => {
    const { store, user, client, app } = await managedSetup();
    await store.savePublishingRequest(newPublishingRequest(app, "managed", NOW));
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = vi.fn(async () => {
      throw new Error("Connection refused");
    });
    expect(await notifyPublishingTeam(store, { user, client, app, event: "asked us to publish their app" }, failing)).toBe(false);
    expect((await store.getPublishingRequest(app.id))?.teamEmailFailedAt).toBeInstanceOf(Date);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("the team email wasn't sent"), "Connection refused");
    errors.mockRestore();
    const working = vi.fn(async () => ({ subject: "", text: "", html: "" }));
    expect(await notifyPublishingTeam(store, { user, client, app, event: "finished the publishing checklist" }, working)).toBe(true);
    expect((await store.getPublishingRequest(app.id))?.teamEmailFailedAt).toBeNull();
  });

  it("knows production drops email without SMTP", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    expect(await mailDelivered(store)).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("YALLAPP_DATA", "mysql");
    try {
      expect(await mailDelivered(store)).toBe(false);
    } finally {
      vi.unstubAllEnvs();
      clearPlatformSettingsCache();
    }
  });

  it("counts the requests still open for the admin's badge", () => {
    const base = newPublishingRequest({ id: "a", clientId: "c" }, "managed", NOW);
    const live = { status: "live" as const, note: null, storeUrl: "https://play.google.com/x", updatedAt: NOW };
    const requests = [base, { ...base, appId: "b", android: live }, { ...base, appId: "c", android: live, ios: live }, { ...base, appId: "d", mode: "self" as const }];
    expect(openPublishingCount(requests)).toBe(2);
    expect(isLiveSomewhere(requests[1]!)).toBe(true);
    expect(isLiveEverywhere(requests[1]!)).toBe(false);
    expect(isLiveSomewhere(base)).toBe(false);
  });
});
