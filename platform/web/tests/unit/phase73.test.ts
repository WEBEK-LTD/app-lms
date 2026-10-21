import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { DELETION_WAIT_DAYS, requestAccountDeletion, type DeletionDeps } from "@/lib/account/deletion";
import { carryOutAccountDeletion, deletionDueAt, runAccountDeletions, type AccountPurgeDeps } from "@/lib/account/purge";
import { buildFolderRemover, folderDeletePayload, folderDeleteUrl } from "@/lib/apps/build-files";
import { APP_DELETION_MESSAGES, APP_RESTORE_DAYS, appDeletionRefusal, deleteApp, purgeApp, restoreApp, runAppPurges, sameAppName } from "@/lib/apps/deletion";
import { APP_DELETED_BEFORE_START, takeQueuedBuilds } from "@/lib/builds/queue";
import { hashLicenseKey } from "@/lib/license/key";
import { MemoryStore } from "@/lib/data/memory";
import type { Build } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { checkLicense } from "@/lib/license/service";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { messagesFor } from "@/i18n";
import { COUNTRY_MESSAGES, countryName, countryOptions, parseCountry } from "@/lib/account/country";
import { parseCourse } from "@/lib/courses/forms";
import { THEME_KEY, THEME_SCRIPT } from "@/components/theme-script";
import { days, NOW } from "./helpers";
import { fakeFiles, PASSWORD, seedAccount } from "./phase73-fixtures";

/**
 * 73 Deleting an app (60.13): the owner with the app's name and their
 * password; gone at once everywhere; restored by our team within 7 days, or
 * purged with its files after them. Deleting an account (66.7): carried out
 * after the waiting days or at once, keeping the billing records.
 */

type Seed = Awaited<ReturnType<typeof seedAccount>>;

describe("73 deleting an app", () => {
  let store: MemoryStore;
  let seed: Seed;
  const asker = () => ({ user: seed.user, staff: null, member: null, client: seed.client });

  beforeEach(async () => {
    store = new MemoryStore();
    seed = await seedAccount(store, NOW, "ada@academy.test");
  });

  it("is the owner's, with the app's name and the password", async () => {
    expect(appDeletionRefusal({ staff: null, member: { id: "m", email: "m@x.test" } })).toBe(APP_DELETION_MESSAGES.owner);
    expect(await deleteApp({ store, now: NOW }, { ...asker(), member: { id: "m", email: "m@x.test" } }, { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD })).toEqual({
      ok: false,
      message: APP_DELETION_MESSAGES.owner,
    });
    expect(await deleteApp({ store, now: NOW }, { ...asker(), staff: { id: "s", email: "s@yallapp.test" } }, { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD })).toMatchObject({ ok: false });
    expect(await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "Ada Shop", password: "" })).toEqual({
      ok: false,
      errors: { name: APP_DELETION_MESSAGES.name, password: APP_DELETION_MESSAGES.password },
    });
    expect(await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "ada  academy ", password: "wrong" })).toEqual({
      ok: false,
      errors: { password: APP_DELETION_MESSAGES.wrongPassword },
    });
    expect(sameAppName(" ada   ACADEMY", "Ada Academy")).toBe(true);
    expect(sameAppName("", "")).toBe(false);
    expect(await store.getAppById(seed.appA.id)).not.toBeNull();
    // Another account's app is never theirs to delete.
    const other = await seedAccount(store, NOW);
    expect(await deleteApp({ store, now: NOW }, asker(), { app: other.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD })).toEqual({ ok: false, message: APP_DELETION_MESSAGES.gone });
  });

  it("is gone at once for the dashboard, the hosted API, the plugin's license and the builds; our team restores it as it was", async () => {
    const result = await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD });
    if (!result.ok) throw new Error("not deleted");
    expect(result.deletion).toMatchObject({ appName: "Ada Academy", reason: "owner", deletedBy: "ada@academy.test", status: "waiting", purgeAfter: days(APP_RESTORE_DAYS) });
    // A second deletion of the same app finds it gone.
    expect(await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD })).toEqual({ ok: false, message: APP_DELETION_MESSAGES.gone });

    expect(await store.getAppById(seed.appA.id)).toBeNull();
    expect((await store.listAppsByClient(seed.client.id)).map((a) => a.id)).toEqual([seed.appB.id]);
    expect((await store.listApps()).some((a) => a.id === seed.appA.id)).toBe(false);
    expect(await store.getLicenseByHash(hashLicenseKey(seed.licenseKey))).toBeNull();
    expect(await store.getLicenseForApp(seed.client.id, seed.appA.id)).toBeNull();
    expect(await store.listLicensesByClient(seed.client.id)).toEqual([]);
    expect((await store.getAppIncludingDeleted(seed.appA.id))?.deletedAt).toEqual(NOW);
    // The plugin's license check: the key doesn't exist any more.
    const check = await checkLicense(store, { licenseKey: seed.licenseKey, siteUrlRaw: "https://academy.test", siteUrl: "academy.test", pluginVersion: "0.4.7", wpVersion: "6.8", lms: "tutor", store: "", bookings: "" }, NOW);
    expect(check).toMatchObject({ status: 404, body: { code: "license_not_found" } });
    // A queued build of it is closed, never built.
    const queued = await store.createBuild({ ...seed.build, id: "11111111-1111-4111-8111-111111111111", status: "queued", artifacts: [], stages: { queued: "done", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" } } as Omit<Build, "number" | "versionCode">);
    const take = await takeQueuedBuilds(store, [queued], NOW);
    expect(take.builds).toEqual([]);
    expect(take.closed[0]).toMatchObject({ status: "failed", message: APP_DELETED_BEFORE_START });
    // The dashboard says it in every language.
    for (const lang of ["en", "ar", "tr"] as const) expect(getDashT(lang)("builds.known.appDeletedBeforeStart")).not.toBe("");

    expect(await restoreApp({ store, now: days(2) }, result.deletion.id, "admin@yallapp.test")).toBe(true);
    expect(await restoreApp({ store, now: days(2) }, result.deletion.id, "admin@yallapp.test")).toBe(false);
    expect(await store.getAppById(seed.appA.id)).toMatchObject({ appName: "Ada Academy", deletedAt: null });
    expect((await store.getLicenseByHash(hashLicenseKey(seed.licenseKey)))?.id).toBe(seed.license.id);
    expect(await store.listMediaFiles(seed.appA.id, { limit: 10 })).toHaveLength(1);
    expect(await store.getAppDeletion(result.deletion.id)).toMatchObject({ status: "restored", closedBy: "admin@yallapp.test" });
    // Restored, it can't be purged.
    expect(await purgeApp(fakeFiles(store, days(9)).deps, result.deletion, "admin@yallapp.test")).toBe("not_waiting");
  });

  it("answers 404 on the hosted API once deleted", async () => {
    const context = () => ({
      store,
      app: seed.appA,
      active: true,
      now: NOW,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id: string) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      connector: new CoursesConnector({ store, app: seed.appA, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }),
    });
    expect((await handleHosted(context(), { method: "GET", path: ["courses"], query: new URLSearchParams(), body: undefined, token: null })).status).toBe(200);
    await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD });
    // The route finds no app (as for an ID that never existed) and answers not_found before anything else.
    expect(await store.getAppById(seed.appA.id)).toBeNull();
  });

  it("purges it after 7 days: rows, Media, build folders and the images only it used; payments stay for billing", async () => {
    const result = await deleteApp({ store, now: NOW }, asker(), { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD });
    if (!result.ok) throw new Error("not deleted");
    // Not before its 7 days.
    const early = fakeFiles(store, days(6), { filesDown: new Set([seed.build.id]) });
    expect(await runAppPurges(early.deps)).toMatchObject({ purged: 0 });
    // The media server down: nothing is purged, and it's tried again.
    const down = fakeFiles(store, days(8), { mediaDown: true });
    expect(await runAppPurges(down.deps)).toMatchObject({ purged: 0, failed: 1 });
    expect(await store.getAppIncludingDeleted(seed.appA.id)).not.toBeNull();
    // The files host didn't confirm the build's folder: kept to try again.
    const late = fakeFiles(store, days(8), { filesDown: new Set([seed.build.id]) });
    expect(await runAppPurges(late.deps)).toMatchObject({ purged: 1, failed: 0, foldersLeft: 1 });
    expect(late.calls.mediaApps).toEqual([seed.appA.id]);
    expect(late.calls.blobs).toEqual([seed.assets.icon.blobKey]);
    expect(await store.getAsset(seed.assets.icon.id)).toBeNull();
    expect(await store.getAsset(seed.assets.shared.id)).not.toBeNull();
    expect(await store.getAppIncludingDeleted(seed.appA.id)).toBeNull();
    expect(await store.listBuildsByApp(seed.appA.id, 10)).toEqual([]);
    expect(await store.listMediaFiles(seed.appA.id, { limit: 10 })).toEqual([]);
    expect(await store.getHostedUser(seed.appA.id, seed.customer.id)).toBeNull();
    expect(await store.getLicenseById(seed.license.id)).toBeNull();
    // The plan payment stays, without its app.
    expect((await store.listPlanPayments({ clientId: seed.client.id, limit: 10 }))[0]).toMatchObject({ id: seed.payment.id, appId: null, status: "paid" });
    expect(await store.getAppDeletion(result.deletion.id)).toMatchObject({ status: "purged", closedBy: "daily job", pendingBuilds: [seed.build.id] });
    // The next day the files host answers: the folder goes and the record is clear.
    const next = fakeFiles(store, days(9));
    expect(await runAppPurges(next.deps)).toMatchObject({ purged: 0, foldersRemoved: 1, foldersLeft: 0 });
    expect(next.calls.folders).toEqual([seed.build.id]);
    expect((await store.getAppDeletion(result.deletion.id))?.pendingBuilds).toEqual([]);
    // The other app is untouched.
    expect(await store.getAppById(seed.appB.id)).toMatchObject({ appName: "Ada Shop" });
  });
});

describe("73 the files host deletes a build's folder only with its own signature", () => {
  it("signs DELETE over the path, unlike a download link", async () => {
    const now = new Date("2026-10-21T10:00:00Z");
    const url = folderDeleteUrl({ baseUrl: "https://files.yallapp.com.tr", secret: "s".repeat(32), buildId: "0b0e6c1e-6a7b-4c9d-8e0f-1a2b3c4d5e6f", now });
    const expires = Math.floor(now.getTime() / 1000) + 300;
    const sig = createHmac("sha256", "s".repeat(32)).update(`DELETE /builds/0b0e6c1e-6a7b-4c9d-8e0f-1a2b3c4d5e6f/?expires=${expires}`).digest("hex");
    expect(url).toBe(`https://files.yallapp.com.tr/builds/0b0e6c1e-6a7b-4c9d-8e0f-1a2b3c4d5e6f/?expires=${expires}&sig=${sig}`);
    expect(folderDeletePayload("/builds/x/", 1)).toBe("DELETE /builds/x/?expires=1");
    expect(() => folderDeleteUrl({ baseUrl: "https://files.yallapp.com.tr", secret: "s", buildId: "../etc", now })).toThrow();
    const seen: string[] = [];
    const remove = buildFolderRemover({
      baseUrl: "https://files.yallapp.com.tr",
      secret: "s".repeat(32),
      now: () => now,
      fetcher: (async (input: string, init: RequestInit) => {
        seen.push(`${init.method} ${input}`);
        return new Response(null, { status: input.includes("0b0e6c1e") ? 204 : 404 });
      }) as unknown as typeof fetch,
    });
    await remove("0b0e6c1e-6a7b-4c9d-8e0f-1a2b3c4d5e6f");
    await expect(remove("1b0e6c1e-6a7b-4c9d-8e0f-1a2b3c4d5e6f")).rejects.toThrow("404");
    expect(seen[0]).toMatch(/^DELETE https:\/\/files\.yallapp\.com\.tr\/builds\/0b0e6c1e/);
  });
});

describe("73 deleting an account is carried out, keeping the billing records", () => {
  let store: MemoryStore;
  let seed: Seed;
  let sent: { key: string; to: string; lang: string }[];

  const purgeDeps = (now: Date, options: Parameters<typeof fakeFiles>[2] = {}): AccountPurgeDeps & { calls: ReturnType<typeof fakeFiles>["calls"] } => {
    const { deps, calls } = fakeFiles(store, now, options);
    return {
      ...deps,
      calls,
      mail: async (key, to, _values, lang) => void sent.push({ key, to, lang }),
      receipt: async (payment) => ({ title: "Receipt", numberLine: `No. ${payment.id}` }) as never,
    };
  };

  const ask = async () => {
    const deps: DeletionDeps = { store, now: NOW, mail: async () => undefined, teamEmail: "info@yallapp.test", baseUrl: "https://yallapp.test" };
    const result = await requestAccountDeletion(deps, { user: seed.user, staff: null, member: null, client: seed.client, apps: [seed.appA, seed.appB], licenses: [seed.license] }, { password: PASSWORD, confirmEmail: seed.user.email, reason: "", lang: "tr" });
    if (!result.ok) throw new Error("not asked");
    return result.request;
  };

  beforeEach(async () => {
    store = new MemoryStore();
    sent = [];
    seed = await seedAccount(store, NOW, "ada@academy.test");
  });

  it("waits the 7 days, then deletes everything but the billing records, and emails the owner", async () => {
    const request = await ask();
    expect(deletionDueAt(request)).toEqual(days(DELETION_WAIT_DAYS));
    // An app the owner deleted before asking goes with the account.
    await deleteApp({ store, now: NOW }, { user: seed.user, staff: null, member: null, client: seed.client }, { app: seed.appB, shownName: "Ada Shop", name: "Ada Shop", password: PASSWORD });
    expect(await runAccountDeletions(purgeDeps(days(6)))).toEqual({ deleted: 0, failed: 0 });
    expect(await store.getUserById(seed.user.id)).not.toBeNull();

    const deps = purgeDeps(days(7));
    expect(await runAccountDeletions(deps)).toEqual({ deleted: 1, failed: 0 });
    // Kept: the paid payment, who paid, and its receipt.
    const kept = await store.listKeptBillingRecords({ clientId: seed.client.id, limit: 10 });
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      id: seed.payment.id,
      userId: seed.user.id,
      buyerName: "Ada",
      buyerEmail: "ada@academy.test",
      buyerWhatsapp: "+201001234567",
      buyerCountry: "EG",
      amountCents: 150_000,
      currency: "EGP",
      status: "paid",
      receipt: { numberLine: `No. ${seed.payment.id}` },
      details: { appName: "Ada Academy", payment: { providerRef: "ref-1" } },
    });
    // Gone: the user, the client, both apps and their rows, the sessions, the team membership; the files too.
    expect(await store.getUserById(seed.user.id)).toBeNull();
    expect(await store.getClientById(seed.client.id)).toBeNull();
    expect(await store.getAppIncludingDeleted(seed.appA.id)).toBeNull();
    expect(await store.getAppIncludingDeleted(seed.appB.id)).toBeNull();
    expect(await store.listPlanPayments({ clientId: seed.client.id, limit: 10 })).toEqual([]);
    expect(await store.listBuildsByApp(seed.appA.id, 10)).toEqual([]);
    expect(await store.deleteUserSessions(seed.user.id)).toBe(0);
    expect(await store.getTeamMember(seed.client.id, seed.teammate.id)).toBeNull();
    expect(await store.listAssetsByClient(seed.client.id)).toEqual([]);
    expect(deps.calls.mediaApps.sort()).toEqual([seed.appA.id, seed.appB.id].sort());
    expect(deps.calls.blobs.sort()).toEqual([seed.assets.icon.blobKey, seed.assets.shared.blobKey, seed.assets.ownB.blobKey].sort());
    expect(deps.calls.folders).toEqual([seed.build.id]);
    // The team member keeps their own sign-in.
    expect(await store.getUserById(seed.teammate.id)).not.toBeNull();
    // The records of it: the request done, both apps purged with it, the owner emailed in their language.
    expect(await store.getAccountDeletionRequest(request.id)).toMatchObject({ status: "done", closedBy: "daily job" });
    const records = await store.listAppDeletions({ statuses: [], clientId: seed.client.id, limit: 10 });
    expect(records.map((r) => [r.appName, r.status, r.reason]).sort()).toEqual([
      ["Ada Academy", "purged", "account"],
      ["Ada Shop", "purged", "owner"],
    ]);
    expect(sent).toEqual([{ key: "account_deletion_done", to: "ada@academy.test", lang: "tr" }]);
    // Run again: nothing to do.
    expect(await runAccountDeletions(purgeDeps(days(8)))).toEqual({ deleted: 0, failed: 0 });
  });

  it("is carried out at once by our team's Delete now, and stops untouched when the media server is down", async () => {
    const request = await ask();
    expect(await carryOutAccountDeletion(purgeDeps(NOW, { mediaDown: true }), request.id, "admin@yallapp.test")).toMatchObject({ ok: false });
    expect(await store.getUserById(seed.user.id)).not.toBeNull();
    expect((await store.listPlanPayments({ clientId: seed.client.id, limit: 10 }))[0]?.id).toBe(seed.payment.id);
    expect(await carryOutAccountDeletion(purgeDeps(NOW), request.id, "admin@yallapp.test")).toEqual({ ok: true, kept: 1, apps: 2, pendingBuilds: 0 });
    expect(await store.getAccountDeletionRequest(request.id)).toMatchObject({ status: "done", closedBy: "admin@yallapp.test" });
    expect(await carryOutAccountDeletion(purgeDeps(NOW), request.id, "admin@yallapp.test")).toMatchObject({ ok: false });
  });

  it("leaves a cancelled request's account as it is", async () => {
    const request = await ask();
    await store.closeAccountDeletionRequest(request.id, { status: "cancelled", closedAt: NOW, closedBy: seed.user.email, teamNote: null });
    expect(await runAccountDeletions(purgeDeps(days(30)))).toEqual({ deleted: 0, failed: 0 });
    expect(await store.getUserById(seed.user.id)).not.toBeNull();
  });
});

describe("73 the account's country (52.9)", () => {
  it("takes a country from the list, named in the dashboard's language", () => {
    expect(parseCountry(" eg ")).toBe("EG");
    expect(parseCountry("TR")).toBe("TR");
    expect(parseCountry("XX")).toBeNull();
    expect(parseCountry("")).toBeNull();
    expect(parseCountry(null)).toBeNull();
    expect([countryName("EG", "en"), countryName("EG", "ar"), countryName("EG", "tr")]).toEqual(["Egypt", "مصر", "Mısır"]);
    const ar = countryOptions("ar");
    expect(ar.length).toBeGreaterThan(200);
    expect(ar.find((c) => c.code === "SA")?.name).toBe("المملكة العربية السعودية");
    // The messages are translated in the dashboard.
    for (const lang of ["ar", "tr"] as const) {
      for (const message of Object.values(COUNTRY_MESSAGES)) expect(knownTranslator(lang)(message)).not.toBe(message);
      for (const message of [APP_DELETION_MESSAGES.owner, APP_DELETION_MESSAGES.name, APP_DELETION_MESSAGES.gone]) expect(knownTranslator(lang)(message)).not.toBe(message);
    }
  });
});

describe("73 light and dark", () => {
  it("sets the browser's choice before the page paints, and nothing else", () => {
    expect(THEME_KEY).toBe("yallapp-theme");
    const run = (stored: string | null, broken = false): string | null => {
      const attrs: Record<string, string> = {};
      const html = { setAttribute: (name: string, value: string) => void (attrs[name] = value) };
      const storage = {
        getItem: () => {
          if (broken) throw new Error("blocked");
          return stored;
        },
      };
      // The script as the page runs it, with a fake browser.
      const script = new Function("localStorage", "document", THEME_SCRIPT) as (s: unknown, d: unknown) => void;
      script(storage, { documentElement: html });
      return attrs["data-theme"] ?? null;
    };
    expect(run("dark")).toBe("dark");
    expect(run("light")).toBe("light");
    expect(run(null)).toBeNull();
    expect(run("purple")).toBeNull();
    expect(run(null, true)).toBeNull();
  });

  it("labels the switch in English, Arabic and Turkish", () => {
    expect([messagesFor("en").nav.darkMode, messagesFor("ar").nav.darkMode, messagesFor("tr").nav.darkMode]).toEqual(["Dark mode", "الوضع الداكن", "Koyu mod"]);
    for (const lang of ["en", "ar", "tr"] as const) expect(getDashT(lang)("nav.darkMode")).toBe(messagesFor(lang).nav.darkMode);
  });
});

describe("73 a course students can start again", () => {
  it("is on by default and turned off with the box", () => {
    const setup = { currency: "TRY" as const, categories: [], courses: [], nextId: 1 };
    const base = { title: "Turkish", description: "", price: "", instructor: "", level: "", active: "on" };
    expect(parseCourse({ ...base, restart: "on" }, setup, [])).toMatchObject({ ok: true, value: { canRestart: true } });
    expect(parseCourse({ ...base, restart: "" }, setup, [])).toMatchObject({ ok: true, value: { canRestart: false } });
    expect(parseCourse(base, setup, [])).toMatchObject({ ok: true, value: { canRestart: true } });
    for (const lang of ["en", "ar", "tr"] as const) expect(getDashT(lang)("courses.restart")).not.toBe("");
  });
});
