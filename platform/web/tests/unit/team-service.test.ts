import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Client, User } from "@/lib/data/types";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import * as teamWords from "@/i18n/dashboard/team";
import { formatMessage } from "@/i18n/format";
import { recordOrderStatus, recordRefund } from "@/lib/team/activity";
import { OWNER_ACCESS } from "@/lib/team/permissions";
import {
  acceptInvitation,
  businessesOf,
  businessFor,
  businessName,
  cancelInvitation,
  invitationForToken,
  INVITATION_DAYS,
  inviteMember,
  memberAccess,
  removeMember,
  resendInvitation,
  updateMember,
  type TeamDeps,
} from "@/lib/team/service";
import { teamInviteSchema } from "@/lib/validation";
import { KEY, NOW, days } from "./helpers";

/** 60 Invitations (7 days, once), joining, changing access, removing (signed out everywhere), businesses and the activity. */

interface Sent {
  to: string;
  values: Record<string, string>;
  lang: string;
}

describe("60 team members", () => {
  let store: MemoryStore;
  let owner: User;
  let client: Client;
  let apps: App[];
  let sent: Sent[];

  const deps = (now = NOW): TeamDeps => ({
    store,
    now,
    baseUrl: "https://yallapp.test",
    mail: async (to, values, lang) => void sent.push({ to, values, lang }),
    words: (lang) => ({ role: (role) => getDashT(lang)(`team.roles.${role}`), date: (date) => date.toISOString().slice(0, 10) }),
  });
  const parse = (input: { name: unknown; email: unknown }) => {
    const parsed = teamInviteSchema.safeParse(input);
    return parsed.success ? ({ ok: true, name: parsed.data.name, email: parsed.data.email } as const) : ({ ok: false, errors: { email: parsed.error.issues[0]!.message } } as const);
  };
  const invite = (values: Partial<{ name: string; email: string; role: string; areas: string[]; appIds: string[] | null }>, now = NOW) =>
    inviteMember(deps(now), {
      client,
      owner,
      apps,
      inviter: owner,
      lang: "tr",
      values: { name: "Kerem", email: "kerem@cafe.test", role: "staff", areas: ["orders"], appIds: null, ...values },
      parse,
    });
  const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;
  async function newUser(email: string, name = "Kerem"): Promise<User> {
    return store.createUser({ email, name, passwordHash: "x", now: NOW });
  }

  beforeEach(async () => {
    store = new MemoryStore();
    sent = [];
    ({ user: owner, client } = await registerClient(store, { name: "Leyla Kaya", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    client = (await store.getClientById(client.id))!;
    const cafe = { ...newApp(client.id, null, NOW, "store", "restaurant"), appName: "Moda Café" };
    const shop = { ...newApp(client.id, null, NOW, "store", null), appName: "Leyla Shop" };
    await store.createApp(cafe);
    await store.createApp(shop);
    apps = [cafe, shop];
  });

  it("invites by email in the inviter's language, with a link for 7 days kept only as a hash", async () => {
    const result = await invite({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.link).toMatch(/^https:\/\/yallapp\.test\/team\/join\?token=/);
    expect(result.invitation).toMatchObject({ email: "kerem@cafe.test", role: "staff", areas: ["orders"], appIds: null, lang: "tr" });
    expect(result.invitation.tokenHash).toBe(sha256Hex(tokenOf(result.link)));
    expect(JSON.stringify(await store.listOpenTeamInvitations(client.id))).not.toContain(tokenOf(result.link));
    expect(result.invitation.expiresAt.getTime() - NOW.getTime()).toBe(INVITATION_DAYS * 86_400_000);
    expect(sent).toEqual([{ to: "kerem@cafe.test", lang: "tr", values: expect.objectContaining({ name: "Kerem", inviter: "Leyla Kaya", business: "Moda Café", role: "Personel", link: result.link }) }]);
    // An invitee who already chose a language gets it in theirs.
    const ar = await newUser("ar@cafe.test");
    await store.updateUser(ar.id, { language: "ar" }, NOW);
    const second = await invite({ email: "ar@cafe.test" });
    expect(second.ok && second.invitation.lang).toBe("ar");
    expect(sent[1]!.values.role).toBe("موظف");
  });

  it("refuses the owner's email, someone on the team, Yallapp's team, an address invited already and bad access", async () => {
    expect(await invite({ email: "leyla@cafe.test" })).toMatchObject({ ok: false, errors: { email: "That's the owner's own email." } });
    expect(await invite({ email: "not-an-email" })).toMatchObject({ ok: false, errors: { email: expect.any(String) } });
    expect(await invite({ areas: [] })).toMatchObject({ ok: false, errors: { areas: "Choose at least one thing Staff can work on." } });
    expect(await invite({ appIds: ["not-theirs"] })).toMatchObject({ ok: false, errors: { appIds: "Choose at least one of your apps." } });
    const admin = await newUser("support@yallapp.test");
    await store.saveAdminMember({ userId: admin.id, role: "support", addedBy: "x", addedAt: NOW, updatedAt: NOW });
    expect(await invite({ email: "support@yallapp.test" })).toMatchObject({ ok: false, errors: { email: "This email is on Yallapp's team. Use another email." } });
    expect((await invite({})).ok).toBe(true);
    expect(await invite({})).toMatchObject({ ok: false, errors: { email: "This email has an invitation already. Send it again from the list." } });
    const member = await newUser("member@cafe.test");
    await store.saveTeamMember({ clientId: client.id, userId: member.id, role: "staff", areas: ["orders"], appIds: null, addedBy: "x", createdAt: NOW, updatedAt: NOW });
    expect(await invite({ email: "member@cafe.test" })).toMatchObject({ ok: false, errors: { email: "This person is on your team already." } });
  });

  it("limits invitations per business and per address", async () => {
    for (let i = 0; i < 20; i += 1) expect((await invite({ email: `p${i}@cafe.test` })).ok).toBe(true);
    expect(await invite({ email: "one-more@cafe.test" })).toMatchObject({ ok: false, message: "You've sent many invitations. Try again later.", retryAfter: expect.any(Number) });
  });

  it("joins once with a new account, as Staff with the chosen areas", async () => {
    const result = await invite({ areas: ["orders", "media"], appIds: [apps[0]!.id] });
    if (!result.ok) throw new Error("invite");
    const token = tokenOf(result.link);
    const check = await invitationForToken(store, token, NOW);
    expect(check).toMatchObject({ ok: true, existing: null, invitation: { email: "kerem@cafe.test" } });
    const kerem = await newUser("kerem@cafe.test");
    expect(await acceptInvitation(store, token, kerem, NOW)).toMatchObject({ ok: true, client: { id: client.id } });
    const member = await store.getTeamMember(client.id, kerem.id);
    expect(member).toMatchObject({ role: "staff", areas: ["orders", "media"], appIds: [apps[0]!.id], addedBy: "leyla@cafe.test" });
    // Single use.
    expect(await acceptInvitation(store, token, kerem, NOW)).toEqual({ ok: false, reason: "used" });
    expect(await invitationForToken(store, token, NOW)).toEqual({ ok: false, reason: "used" });
    expect((await store.listTeamActivity(client.id, { limit: 10 })).items.map((a) => a.summary)).toEqual(["kerem@cafe.test joined the team", "Invited kerem@cafe.test as Staff"]);
  });

  it("refuses an expired link, another account's, the owner and Yallapp's team", async () => {
    const result = await invite({});
    if (!result.ok) throw new Error("invite");
    const token = tokenOf(result.link);
    const someoneElse = await newUser("other@cafe.test");
    expect(await acceptInvitation(store, token, someoneElse, NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(await acceptInvitation(store, token, await newUser("kerem@cafe.test"), days(INVITATION_DAYS))).toEqual({ ok: false, reason: "expired" });
    expect(await invitationForToken(store, "x".repeat(43), NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(await invitationForToken(store, "short", NOW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("sends again with a new link (the old one stops), and cancels", async () => {
    const first = await invite({});
    if (!first.ok) throw new Error("invite");
    const again = await resendInvitation(deps(days(3)), { client, owner, apps, inviter: owner, id: first.invitation.id });
    if (!again.ok) throw new Error("resend");
    expect(again.link).not.toBe(first.link);
    expect(again.invitation.expiresAt.getTime()).toBe(days(3 + INVITATION_DAYS).getTime());
    expect(await invitationForToken(store, tokenOf(first.link), days(3))).toEqual({ ok: false, reason: "invalid" });
    expect((await invitationForToken(store, tokenOf(again.link), days(3))).ok).toBe(true);
    expect(sent).toHaveLength(2);
    expect(await cancelInvitation(store, { client, actor: owner, id: first.invitation.id }, days(3))).toBe(true);
    expect(await invitationForToken(store, tokenOf(again.link), days(3))).toEqual({ ok: false, reason: "used" });
    expect(await cancelInvitation(store, { client, actor: owner, id: first.invitation.id }, days(3))).toBe(false);
    expect(await store.listOpenTeamInvitations(client.id)).toEqual([]);
    // Another business can't touch it.
    const other = await registerClient(store, { name: "Other", email: "o@other.test", whatsapp: "+905446731943", siteUrl: "", password: null }, NOW);
    const theirs = await invite({ email: "x@cafe.test" });
    if (!theirs.ok) throw new Error("invite");
    expect(await cancelInvitation(store, { client: other.client, actor: other.user, id: theirs.invitation.id }, NOW)).toBe(false);
    expect((await resendInvitation(deps(), { client: other.client, owner: other.user, apps: [], inviter: other.user, id: theirs.invitation.id })).ok).toBe(false);
  });

  it("changes what someone can do, and removing them signs them out everywhere", async () => {
    const kerem = await newUser("kerem@cafe.test");
    await store.saveTeamMember({ clientId: client.id, userId: kerem.id, role: "staff", areas: ["orders"], appIds: null, addedBy: "x", createdAt: NOW, updatedAt: NOW });
    const changed = await updateMember(store, { client, apps, actor: owner, userId: kerem.id, values: { role: "manager", areas: [], appIds: [apps[1]!.id] } }, NOW);
    expect(changed).toMatchObject({ ok: true, member: { role: "manager", appIds: [apps[1]!.id], addedBy: "leyla@cafe.test" } });
    expect(await updateMember(store, { client, apps, actor: owner, userId: owner.id, values: { role: "staff", areas: ["orders"], appIds: null } }, NOW)).toEqual({ ok: false, notFound: true });
    await store.createOwnerDevice({
      id: "d1",
      userId: kerem.id,
      clientId: client.id,
      name: "Pixel",
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: "h1",
      refreshExpiresAt: days(60),
      sessionVersion: kerem.sessionVersion,
      pushToken: "t",
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    expect(await removeMember(store, { client, actor: owner, userId: kerem.id }, NOW)).toBe(true);
    expect(await store.getTeamMember(client.id, kerem.id)).toBeNull();
    expect((await store.getUserById(kerem.id))!.sessionVersion).toBe(kerem.sessionVersion + 1);
    expect(await store.listOwnerDevices(kerem.id)).toEqual([]);
    expect(await removeMember(store, { client, actor: owner, userId: kerem.id }, NOW)).toBe(false);
    const lines = (await store.listTeamActivity(client.id, { limit: 10 })).items.map((a) => a.summary);
    expect(lines).toEqual(["Removed kerem@cafe.test from the team", "Changed what kerem@cafe.test can do"]);
  });

  it("lists a person's businesses: their own first, then the teams they joined", async () => {
    const other = await registerClient(store, { name: "Omar", email: "omar@bakery.test", whatsapp: "+905446731944", siteUrl: "", password: null }, NOW);
    await store.saveTeamMember({ clientId: client.id, userId: other.user.id, role: "staff", areas: ["orders"], appIds: [apps[0]!.id], addedBy: "x", createdAt: NOW, updatedAt: NOW });
    const list = await businessesOf(store, other.user);
    expect(list.map((b) => [b.client.id, b.access.role])).toEqual([
      [other.client.id, "owner"],
      [client.id, "staff"],
    ]);
    expect(list[0]!.access).toEqual(OWNER_ACCESS);
    expect(memberAccess(list[1]!.member!)).toEqual({ role: "staff", areas: ["orders"], appIds: [apps[0]!.id] });
    expect((await businessFor(store, other.user, client.id))?.access.role).toBe("staff");
    expect(await businessFor(store, owner, other.client.id)).toBeNull();
    expect(businessName(owner, apps)).toBe("Moda Café");
    expect(businessName(owner, [])).toBe("Leyla Kaya");
  });

  it("records order steps and refunds with who did them, worded for every language", async () => {
    await recordOrderStatus(store, { clientId: client.id, appId: apps[0]!.id, actor: owner, orderId: 42, to: "completed" }, NOW);
    await recordRefund(store, { clientId: client.id, appId: apps[0]!.id, actor: owner, kind: "order", id: 42, amount: "₺120.00" }, NOW);
    const { items, total } = await store.listTeamActivity(client.id, { limit: 10 });
    expect(total).toBe(2);
    expect(items.map((a) => [a.action, a.summary, a.actorName])).toEqual([
      ["order.refund", "Refund of ₺120.00 for order 1042", "Leyla Kaya"],
      ["order.status", "Order 1042: Completed", "Leyla Kaya"],
    ]);
    expect(knownTranslator("tr")("Order 1042: Completed")).toBe("Sipariş 1042: Tamamlandı");
    expect(knownTranslator("ar")("Refund of ₺120.00 for order 1042")).toBe("استرداد ₺120.00 من الطلب 1042");
    expect(knownTranslator("tr")("Invited kerem@cafe.test as Staff")).toBe("kerem@cafe.test Personel olarak davet edildi");
  });

  it("translates every activity line the Team page shows, never by another area's words", () => {
    const sample = { number: "1042", amount: "₺120.00", title: "Fresh bread", email: "kerem@cafe.test" };
    for (const lang of ["ar", "tr"] as const) {
      const k = knownTranslator(lang);
      for (const [key, english] of Object.entries(teamWords.en.known.activity)) {
        const line = formatMessage("en", english, sample);
        expect(k(line), `${lang} ${key}`).toBe(formatMessage(lang, teamWords[lang].known.activity[key as keyof typeof teamWords.en.known.activity], sample));
      }
    }
  });
});
