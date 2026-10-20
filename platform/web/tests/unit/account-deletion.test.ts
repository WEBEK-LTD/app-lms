import { beforeEach, describe, expect, it } from "vitest";
import { cancelAccountDeletion, closeAccountDeletion, DELETION_DAYS, deletionRefusal, MESSAGES, requestAccountDeletion, runningPlans, type DeletionAsker, type DeletionDeps } from "@/lib/account/deletion";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { App, License, OwnerDevice, User } from "@/lib/data/types";
import { renderEmail } from "@/lib/email/send";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { getDashT } from "@/i18n/dashboard";
import { messagesFor } from "@/i18n";
import { isLocalizedPath, localePath } from "@/i18n/paths";
import { pathPermission } from "@/lib/team/permissions";
import { days, KEY, NOW } from "./helpers";

/**
 * 66 Deleting a Yallapp account: the owner asks with their password and their
 * email typed again; team members and our team managing the dashboard are
 * refused; one open request per account (a second returns the first); the
 * owner cancels; our team marks it done, which emails them.
 */

const PASSWORD = "a long enough password 42";

interface Sent {
  key: string;
  to: string;
  values: Record<string, string>;
  lang: string;
}

describe("66 asking to delete a Yallapp account", () => {
  let store: MemoryStore;
  let sent: Sent[];
  let asker: DeletionAsker;
  let owner: User;

  const deps = (now: Date = NOW): DeletionDeps => ({
    store,
    now,
    mail: async (key, to, values, lang) => {
      sent.push({ key, to, values, lang });
    },
    teamEmail: "info@yallapp.test",
    baseUrl: "https://yallapp.test",
  });

  async function phone(id: string): Promise<void> {
    const device: OwnerDevice = {
      id,
      userId: owner.id,
      clientId: asker.client.id,
      name: id,
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: sha256Hex(id),
      refreshExpiresAt: days(60),
      sessionVersion: owner.sessionVersion,
      pushToken: null,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    };
    await store.createOwnerDevice(device);
  }

  beforeEach(async () => {
    store = new MemoryStore();
    sent = [];
    const { user, client } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "", password: PASSWORD }, NOW);
    await activateClient(store, { clientId: client.id, plan: "growth", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    owner = user;
    // One app, on the plan just activated (still running for 30 days).
    const app = { ...newApp(client.id, null, NOW, "lms"), appName: "Ada Academy" };
    await store.createApp(app);
    const licenses = (await store.listLicensesByClient(client.id)).map((l) => ({ ...l, appId: app.id }));
    asker = { user, staff: null, member: null, client: (await store.getClientById(client.id))!, apps: [app], licenses };
  });

  it("saves the request with the password and the email typed again, signs out the phones and emails the team and the owner", async () => {
    await phone("pixel");
    await phone("iphone");
    const result = await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: " ADA@academy.test ", reason: " Closing the academy. ", lang: "ar" });
    expect(result).toMatchObject({ ok: true, created: true, phonesSignedOut: 2 });
    if (!result.ok) throw new Error("not saved");
    expect(result.request).toMatchObject({ clientId: asker.client.id, userId: owner.id, email: "ada@academy.test", name: "Ada", lang: "ar", reason: "Closing the academy.", status: "pending", requestedAt: NOW });
    expect(await store.getOpenAccountDeletionRequest(asker.client.id)).toEqual(result.request);
    expect(await store.listOwnerDevices(owner.id)).toEqual([]);
    expect(sent.map((m) => [m.key, m.to, m.lang])).toEqual([
      ["account_deletion_request", "info@yallapp.test", "en"],
      ["account_deletion_received", "ada@academy.test", "ar"],
    ]);
    expect(sent[0]!.values).toMatchObject({ client_name: "Ada", event: "asked us to delete their Yallapp account", reason_line: "Reason: Closing the academy.\n", admin_url: "https://yallapp.test/admin/account-deletion" });
    expect(sent[0]!.values).toMatchObject({ apps: "Ada Academy", plans_line: `Plans still running: Ada Academy (growth, until ${days(30).toISOString().slice(0, 10)})\n` });
    expect(sent[1]!.values).toEqual({ name: "Ada", days: String(DELETION_DAYS), dashboard_url: "https://yallapp.test/dashboard/account" });
    // The account itself stays until our team deletes it.
    expect(await store.getUserById(owner.id)).not.toBeNull();
  });

  it("refuses a wrong password, a mistyped email, an empty password and a long reason, saving nothing", async () => {
    expect(await requestAccountDeletion(deps(), asker, { password: "wrong password", confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toEqual({
      ok: false,
      errors: { password: MESSAGES.wrongPassword },
    });
    expect(await requestAccountDeletion(deps(), asker, { password: "", confirmEmail: "someone@else.test", reason: "x".repeat(1001), lang: "en" })).toEqual({
      ok: false,
      errors: { confirmEmail: MESSAGES.confirm, password: MESSAGES.password, reason: MESSAGES.reason },
    });
    expect(await store.getOpenAccountDeletionRequest(asker.client.id)).toBeNull();
    expect(sent).toEqual([]);
  });

  it("counts the password with the sign-in attempts for the address", async () => {
    for (let i = 0; i < 8; i++) {
      expect(await requestAccountDeletion(deps(), asker, { password: `guess ${i}`, confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toMatchObject({ ok: false });
    }
    expect(await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toEqual({ ok: false, message: MESSAGES.tooMany });
    // Fifteen minutes later the right password works.
    expect(await requestAccountDeletion(deps(new Date(NOW.getTime() + 15 * 60_000)), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toMatchObject({
      ok: true,
      created: true,
    });
  });

  it("is only for the owner: a team member and our team managing the dashboard are refused", async () => {
    const member = { id: "member-id", email: "kerem@cafe.test" };
    const staff = { id: "staff-id", email: "admin@yallapp.test" };
    expect(deletionRefusal({ staff: null, member: null })).toBeNull();
    expect(await requestAccountDeletion(deps(), { ...asker, member }, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toEqual({ ok: false, message: MESSAGES.member });
    expect(await requestAccountDeletion(deps(), { ...asker, staff }, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" })).toEqual({ ok: false, message: MESSAGES.staff });
    expect(await store.getOpenAccountDeletionRequest(asker.client.id)).toBeNull();
    // Nor can they cancel the owner's request.
    await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" });
    expect(await cancelAccountDeletion(deps(), { ...asker, member })).toEqual({ ok: false, message: MESSAGES.member });
    expect((await store.getOpenAccountDeletionRequest(asker.client.id))?.status).toBe("pending");
  });

  it("keeps one open request per account: asking again returns it, without new emails", async () => {
    const first = await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" });
    const again = await requestAccountDeletion(deps(days(1)), asker, { password: "", confirmEmail: "", reason: "", lang: "tr" });
    if (!first.ok || !again.ok) throw new Error("refused");
    expect(again).toMatchObject({ created: false, phonesSignedOut: 0 });
    expect(again.request.id).toBe(first.request.id);
    expect(sent).toHaveLength(2);
    expect(await store.listAccountDeletionRequests([], 10)).toHaveLength(1);
    // The store itself refuses a second open one (of two at the same moment, one wins).
    expect(await store.createAccountDeletionRequest({ ...first.request, id: "another" })).toBe(false);
  });

  it("lets the owner cancel, tells the team, and then ask again", async () => {
    expect(await cancelAccountDeletion(deps(), asker)).toEqual({ ok: false, message: MESSAGES.noRequest });
    const first = await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" });
    if (!first.ok) throw new Error("refused");
    expect(await cancelAccountDeletion(deps(days(1)), asker)).toEqual({ ok: true });
    expect(await store.getAccountDeletionRequest(first.request.id)).toMatchObject({ status: "cancelled", closedAt: days(1), closedBy: "ada@academy.test" });
    expect(sent.at(-1)).toMatchObject({ key: "account_deletion_request", to: "info@yallapp.test", values: { event: "cancelled their request to delete their Yallapp account" } });
    const second = await requestAccountDeletion(deps(days(2)), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "en" });
    expect(second).toMatchObject({ ok: true, created: true });
    expect((await store.listAccountDeletionRequests([], 10)).map((r) => r.status)).toEqual(["pending", "cancelled"]);
  });

  it("is closed by our team: done emails the person who asked in their language, once", async () => {
    const asked = await requestAccountDeletion(deps(), asker, { password: PASSWORD, confirmEmail: "ada@academy.test", reason: "", lang: "tr" });
    if (!asked.ok) throw new Error("refused");
    sent = [];
    const done = await closeAccountDeletion(deps(days(3)), { id: asked.request.id, status: "done", by: "admin@yallapp.test", note: " Deleted by hand. " });
    expect(done).toMatchObject({ ok: true, request: { status: "done", closedBy: "admin@yallapp.test", teamNote: "Deleted by hand." } });
    expect(sent).toEqual([{ key: "account_deletion_done", to: "ada@academy.test", values: { name: "Ada" }, lang: "tr" }]);
    expect(await closeAccountDeletion(deps(days(3)), { id: asked.request.id, status: "cancelled", by: "admin@yallapp.test", note: "" })).toEqual({
      ok: false,
      message: "This request isn't open any more.",
    });
    expect(await store.listAccountDeletionRequests(["pending"], 10)).toEqual([]);
    expect(await store.listAccountDeletionRequests(["done"], 10)).toHaveLength(1);
  });

  it("lists the apps whose plan is still running", () => {
    const app = (id: string) => ({ id }) as App;
    const license = (appId: string, expiresAt: Date) => ({ appId, expiresAt, plan: "pro" }) as License;
    const plans = runningPlans({ apps: [app("a"), app("b"), app("c")], licenses: [license("a", days(5)), license("b", days(-1))] }, NOW);
    expect(plans.map((p) => p.app.id)).toEqual(["a"]);
  });
});

describe("66 the deletion pages and emails", () => {
  it("are on the website in every language, and Your account is open to everyone on the dashboard", () => {
    expect(isLocalizedPath("/delete-account")).toBe(true);
    expect(localePath("ar", "/delete-account")).toBe("/ar/delete-account");
    expect(localePath("tr", "/delete-account")).toBe("/tr/delete-account");
    expect(pathPermission("/dashboard/account")).toBe("dashboard");
    for (const lang of ["en", "ar", "tr"] as const) {
      expect(messagesFor(lang).deleteAccount.howEmail).toContain("{email}");
      expect(getDashT(lang)("account.when", { days: DELETION_DAYS })).toContain(String(DELETION_DAYS));
    }
    expect(getDashT("en")("account.requested", { count: 0 })).toBe("Your request was sent.");
    expect(getDashT("en")("account.requested", { count: 2 })).toBe("Your request was sent, and 2 phones were signed out of Yallapp Business.");
    expect(getDashT("en")("account.plans", { count: 1 })).toMatch(/^1 of your apps has a plan that is still running\./);
  });

  it("send the owner's emails in their language", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    const values = { name: "Ada", days: "30", dashboard_url: "https://yallapp.test/dashboard/account" };
    const en = await renderEmail(store, "account_deletion_received", values);
    expect(en.subject).toBe("We received your request to delete your Yallapp account");
    expect(en.text).toContain("within 30 days");
    expect(en.text).toContain("https://yallapp.test/dashboard/account");
    const ar = await renderEmail(store, "account_deletion_received", values, undefined, "ar");
    expect(ar.text).toContain("خلال 30 يومًا");
    const done = await renderEmail(store, "account_deletion_done", { name: "Ada" }, undefined, "tr");
    expect(done.subject).toBe("Yallapp hesabınız silindi");
  });
});
