import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { approveMove, checkMoveCode, closeMove, MOVE_MAX_ATTEMPTS, moveCodeHash, moveSummary, moveWaiting, newMoveCode, planMoveRefusal, requestAppMove, type MoveDeps } from "@/lib/apps/move";
import { moveMail } from "@/lib/apps/move-mail";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";

/**
 * 132.112 The owner's approval of a move: a 6-digit code kept hashed (for
 * its own request only), 15 minutes, 5 tries, used once; one waiting
 * request per app, cancelled or declined; a pending plan payment stops it;
 * a few codes per account an hour. And its emails, in three languages.
 */

const NOW = new Date("2026-11-16T09:00:00.000Z");
const SECRET = "test-move-secret-0123456789abcdef0123456789";
const by = { id: randomUUID(), email: "selin@yallapp.test", name: "Selin" };

async function setup() {
  const store = new MemoryStore();
  const a = await registerClient(store, { name: "Omar", email: `omar-${randomUUID()}@move.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const b = await registerClient(store, { name: "Lina", email: `lina-${randomUUID()}@move.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(a.client.id, null, NOW, "store"), backend: "hosted", appName: "Petal House" };
  await store.createApp(app);
  const deps = (now = NOW): MoveDeps => ({ store, now, secret: SECRET });
  const ask = async (now = NOW) => {
    const asked = await requestAppMove(deps(now), { app, toClientId: b.client.id, moveData: true, moveSubscription: false, by });
    if (!asked.ok) throw new Error(asked.reason);
    return asked;
  };
  return { store, a, b, app, deps, ask };
}

describe("132.112 the approval code of a move", () => {
  it("makes 6-digit codes and keeps only their hash, for their own request", async () => {
    for (let i = 0; i < 50; i += 1) expect(newMoveCode()).toMatch(/^\d{6}$/);
    const { store, ask } = await setup();
    const { request, code } = await ask();
    const saved = (await store.getAppMoveRequest(request.id))!;
    expect(saved.codeHash).toBe(moveCodeHash(SECRET, request.id, code));
    expect(JSON.stringify(saved)).not.toContain(code);
    expect(moveCodeHash(SECRET, randomUUID(), code)).not.toBe(saved.codeHash);
    expect(moveCodeHash("another-secret-0123456789abcdef0123456789", request.id, code)).not.toBe(saved.codeHash);
    expect(saved).toMatchObject({ status: "waiting", attempts: 0, moveData: true, moveSubscription: false, requestedByEmail: by.email });
    expect(saved.expiresAt.getTime() - NOW.getTime()).toBe(15 * 60_000);
  });

  it("approves with the right code, once", async () => {
    const { deps, ask, store } = await setup();
    const { request, code } = await ask();
    expect(await checkMoveCode(deps(), request.id, ` ${code.slice(0, 3)} ${code.slice(3)} `, "team")).toMatchObject({ ok: true });
    expect((await store.getAppMoveRequest(request.id))!).toMatchObject({ status: "approved", closedBy: "team" });
    expect(await checkMoveCode(deps(), request.id, code, "team")).toEqual({ ok: false, reason: "closed" });
    expect(await approveMove(deps(), request, "owner")).toEqual({ ok: false, reason: "closed" });
  });

  it("counts wrong codes and closes the request after five", async () => {
    const { deps, ask, store } = await setup();
    const { request, code } = await ask();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 1; i < MOVE_MAX_ATTEMPTS; i += 1) expect(await checkMoveCode(deps(), request.id, wrong, "team")).toEqual({ ok: false, reason: "wrong", left: MOVE_MAX_ATTEMPTS - i });
    expect(await checkMoveCode(deps(), request.id, wrong, "team")).toEqual({ ok: false, reason: "attempts" });
    expect((await store.getAppMoveRequest(request.id))!).toMatchObject({ status: "expired", attempts: 5 });
    // Not even the right code after that.
    expect(await checkMoveCode(deps(), request.id, code, "team")).toEqual({ ok: false, reason: "closed" });
  });

  it("expires after 15 minutes", async () => {
    const { deps, ask, store } = await setup();
    const { request, code } = await ask();
    const later = new Date(NOW.getTime() + 15 * 60_000 + 1);
    expect(moveWaiting(request, later)).toBe(false);
    expect(await checkMoveCode(deps(later), request.id, code, "team")).toEqual({ ok: false, reason: "expired" });
    expect((await store.getAppMoveRequest(request.id))!.status).toBe("expired");
    expect(await approveMove(deps(later), { ...request }, "owner")).toEqual({ ok: false, reason: "expired" });
  });

  it("keeps one waiting request per app, cancelled or declined", async () => {
    const { deps, ask, store, app, b } = await setup();
    const { request, code } = await ask();
    expect(await requestAppMove(deps(), { app, toClientId: b.client.id, moveData: true, moveSubscription: true, by })).toEqual({ ok: false, reason: "waiting" });
    expect(await closeMove(deps(), request, "cancelled", by.email)).toBe(true);
    expect(await closeMove(deps(), request, "declined", "owner")).toBe(false);
    expect(await checkMoveCode(deps(), request.id, code, "team")).toEqual({ ok: false, reason: "closed" });
    const again = await ask();
    expect(await closeMove(deps(), again.request, "declined", "owner")).toBe(true);
    expect((await store.getAppMoveRequest(again.request.id))!).toMatchObject({ status: "declined", closedBy: "owner" });
  });

  it("refuses the same account, a moved app, a pending plan payment, and too many codes", async () => {
    const { deps, store, app, a, b, ask } = await setup();
    expect(await requestAppMove(deps(), { app, toClientId: a.client.id, moveData: true, moveSubscription: true, by })).toEqual({ ok: false, reason: "same_account" });
    expect(await requestAppMove(deps(), { app: { ...app, movedAt: NOW }, toClientId: b.client.id, moveData: true, moveSubscription: true, by })).toEqual({ ok: false, reason: "moved" });
    await store.createPlanPayment({ id: randomUUID(), clientId: a.client.id, appId: app.id, plan: "growth", months: 1, amountCents: 1000, currency: "EGP", status: "pending", tokenHash: randomUUID(), paymentId: null, createdAt: NOW, paidAt: null });
    expect(await requestAppMove(deps(), { app, toClientId: b.client.id, moveData: true, moveSubscription: true, by })).toEqual({ ok: false, reason: "payment_pending" });
    const fresh = await setup();
    for (let i = 0; i < 5; i += 1) {
      const { request } = await fresh.ask();
      await closeMove(fresh.deps(), request, "cancelled", by.email);
    }
    expect(await requestAppMove(fresh.deps(), { app: fresh.app, toClientId: fresh.b.client.id, moveData: true, moveSubscription: true, by })).toEqual({ ok: false, reason: "too_many" });
    void ask;
  });

  it("132.115 refuses moving a plan from an app without one, onto an app of the other product, or onto itself", async () => {
    const { store, app, b } = await setup();
    const studio: App = { ...newApp(b.client.id, null, NOW, "store"), section: "studio", backend: "hosted" };
    await store.createApp(studio);
    expect(await planMoveRefusal(store, app, studio)).toBe("no_plan");
    expect(await planMoveRefusal(store, app, app)).toBe("same_app");
    expect(await planMoveRefusal(store, app, null)).toBe("no_app");
    const { activateClient } = await import("@/lib/admin/clients");
    await activateClient(store, { clientId: app.clientId, appId: app.id, plan: "growth", activeUntil: new Date(NOW.getTime() + 86_400_000), paymentNote: "test" }, Buffer.alloc(32, 7), NOW);
    expect(await planMoveRefusal(store, app, studio)).toBe("plan_section");
    const regular: App = { ...newApp(b.client.id, null, NOW, "lms"), backend: "hosted" };
    await store.createApp(regular);
    expect(await planMoveRefusal(store, app, regular)).toBeNull();
  });

  it("says what moves and what stays", () => {
    expect(moveSummary({ moveData: true, moveSubscription: false })).toMatchObject({
      moves: expect.arrayContaining([expect.stringMatching(/^Its data/)]),
      stays: expect.arrayContaining([expect.stringMatching(/^Past invoices/), expect.stringMatching(/^Its subscription/)]),
    });
  });
});

describe("132.113 the emails of a move", () => {
  const input = {
    assetBase: "https://yallapp.com.tr",
    app: { name: "Petal House", iconUrl: null, colour: "#B4475E" },
    from: { name: "Omar Haddad", email: "omar@example.com" },
    to: { name: "Lina Farouk", email: "lina@example.com" },
    data: false,
    subscription: true,
    member: "Selin",
    code: "482913",
    reviewUrl: "https://yallapp.com.tr/dashboard/app-moves/x?expires=1&sig=y",
    minutes: 15,
    at: NOW,
    dashboardUrl: "https://yallapp.com.tr/dashboard",
  };

  it("gives the code, both accounts, the choices and one button, for real inboxes", () => {
    const mail = moveMail({ ...input, kind: "approval", lang: "en" });
    expect(mail.subject).toBe("Approve moving Petal House to another account");
    expect(mail.html).toContain('<meta name="color-scheme" content="light dark" />');
    expect(mail.html).toContain("max-width:600px");
    expect(mail.html).toContain("482913");
    expect(mail.html).toContain("Data: Stays");
    expect(mail.html).toContain("Subscription: Moves");
    expect(mail.html).toContain("Expires in 15 minutes");
    expect(mail.html).toContain("Only give this code to the Yallapp team member who is moving your app with you.");
    expect(mail.html).toContain('alt="Yallapp"');
    expect(mail.html.match(/<a href=[^>]*>Review and approve<\/a>/g)).toHaveLength(1);
    expect(mail.text).toContain("Your approval code: 482913");
    // No link or picture but yallapp.com.tr's (the namespaces Outlook reads aren't addresses).
    const hosts = [...mail.html.matchAll(/(?:href|src)="https?:\/\/([^/"]+)/g)].map((m) => m[1]);
    expect(hosts.length).toBeGreaterThan(2);
    expect(new Set(hosts)).toEqual(new Set(["yallapp.com.tr"]));
    expect(mail.html).not.toMatch(/WEBEK/i);
  });

  it("reads right to left in Arabic and in Turkish, the code and emails left to right", () => {
    const ar = moveMail({ ...input, kind: "approval", lang: "ar" });
    expect(ar.html).toContain('<html lang="ar" dir="rtl"');
    expect(ar.html).toContain("وافِق على نقل تطبيقك");
    expect(ar.html).toMatch(/dir="ltr"[^>]*>482913</);
    expect(ar.html).toContain("&larr;");
    const tr = moveMail({ ...input, kind: "approval", lang: "tr" });
    expect(tr.subject).toBe("Petal House uygulamasının başka bir hesaba taşınmasını onaylayın");
    expect(tr.html).toContain('dir="ltr"');
  });

  it("132.115 names the plan and both apps when only a plan moves", () => {
    const mail = moveMail({ ...input, kind: "approval", lang: "en", plan: { toApp: "Petal Kids", name: "Growth", until: "16 December 2026", next: null } });
    expect(mail.subject).toBe("Move your plan from Petal House to Petal Kids");
    expect(mail.html).toContain("Plan: Growth");
    expect(mail.html).toContain("Petal House goes back to having no plan, like a new app.");
    expect(mail.html).toContain("Past invoices stay where they are.");
    expect(mail.html).not.toContain("Data: ");
    expect(moveMail({ ...input, kind: "approval", lang: "ar", plan: { toApp: "Petal Kids" } }).subject).toBe("انقل خطتك من Petal House إلى Petal Kids");
  });

  it("says it's done to both accounts, without a code", () => {
    const out = moveMail({ ...input, kind: "moved_out", lang: "en" });
    const added = moveMail({ ...input, kind: "added", lang: "en" });
    expect(out.subject).toBe("Petal House moved to another account");
    expect(added.subject).toBe("Petal House was added to your Yallapp account");
    for (const mail of [out, added]) expect(mail.html).not.toContain("482913");
  });
});
