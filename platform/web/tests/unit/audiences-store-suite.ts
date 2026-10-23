import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedDevice } from "@/lib/data/types";
import { countAudience, EVERYONE, resolveAudience, type Audience } from "@/lib/hosted/audiences";
import { days, NOW } from "./helpers";

/** 85.1 Campaigns' audiences, the same on every store. */
export function audiencesStoreSuite(store: () => DataStore) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Cedar Academy", email: `cedar-${suffix}@audiences.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" } };
    await s.createApp(app);
    let n = 0;
    const user = async (joined: Date = days(-100)) => (await s.createHostedUser({ appId: app.id, phone: `+90532${suffix.replace(/\D/g, "").padEnd(3, "1").slice(0, 3)}${String(n++).padStart(4, "0")}`, name: `Person ${n}`, email: null, city: null, now: joined }))!;
    const phone = async (userId: number, extra: Partial<HostedDevice>) =>
      s.createHostedDevice({
        id: randomUUID(),
        appId: app.id,
        userId,
        deviceId: randomUUID(),
        platform: "android",
        name: "Phone",
        appVersion: "1.0.0",
        pushToken: null,
        pushPreferences: null,
        language: null,
        country: null,
        createdAt: days(-100),
        lastSeenAt: NOW,
        ...extra,
      });
    const order = async (userId: number | null, paid: boolean) =>
      s.createCatalogOrder({
        appId: app.id,
        tokenHash: randomUUID().replace(/-/g, ""),
        userId,
        status: paid ? "completed" : "pending",
        lines: [{ productId: 1, name: "Course", quantity: 1, unitCents: 1000, imageAssetId: null, digital: true }],
        subtotalCents: 1000,
        shippingCents: 0,
        totalCents: 1000,
        currency: "TRY",
        customer: null,
        paymentId: paid ? "pay-1" : null,
        createdAt: NOW,
        paidAt: paid ? NOW : null,
        updatedAt: NOW,
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
      });
    return { app, user, phone, order };
  }

  const audience = (a: Partial<Audience>): Audience => ({ ...EVERYONE, ...a });

  it("finds buyers, students, members and people who haven't opened the app for a while", async () => {
    const s = store();
    const { app, user, phone, order } = await setup(s);
    const [buyer, student, other, member, sleeper, fresh] = [await user(), await user(), await user(), await user(), await user(), await user(days(-2))];
    await order(buyer.id, true);
    await order(other.id, false);
    await order(null, true);
    await s.enrollInCourse({ appId: app.id, userId: student.id, courseId: 1, source: "free", enrolledAt: NOW });
    await s.enrollInCourse({ appId: app.id, userId: buyer.id, courseId: 2, source: "paid", enrolledAt: NOW });
    const membership = { appId: app.id, planId: 1, planName: "Monthly", period: "month" as const, creditsLeft: null, status: "active" as const, startsAt: days(-10), orderId: null, createdAt: NOW, updatedAt: NOW };
    await s.createMembership({ ...membership, userId: member.id, endsAt: days(20) });
    await s.createMembership({ ...membership, userId: other.id, endsAt: days(-1) });
    await s.createMembership({ ...membership, userId: sleeper.id, status: "cancelled", endsAt: null });
    for (const u of [buyer, student, other, member]) await phone(u.id, {});
    await phone(sleeper.id, { lastSeenAt: days(-45) });

    expect(await resolveAudience(s, app, EVERYONE, NOW)).toBeNull();
    expect(await countAudience(s, app, EVERYONE, NOW)).toBe(6);
    expect(await resolveAudience(s, app, audience({ who: "buyers" }), NOW)).toEqual([buyer.id]);
    expect(await resolveAudience(s, app, audience({ who: "students" }), NOW)).toEqual([buyer.id, student.id].sort((a, b) => a - b));
    expect(await resolveAudience(s, app, audience({ who: "students", courseId: 1 }), NOW)).toEqual([student.id]);
    expect(await resolveAudience(s, app, audience({ who: "members" }), NOW)).toEqual([member.id]);
    // Last seen 45 days ago; one who joined 2 days ago without a phone is new, not inactive.
    expect(await resolveAudience(s, app, audience({ who: "inactive", inactiveDays: 30 }), NOW)).toEqual([sleeper.id]);
    expect(await resolveAudience(s, app, audience({ who: "inactive", inactiveDays: 60 }), NOW)).toEqual([]);
    expect(fresh.id).toBeGreaterThan(0);
  });

  it("narrows by the language, platform and country of any of a person's phones", async () => {
    const s = store();
    const { app, user, phone } = await setup(s);
    const [ar, tr, both, unknown] = [await user(), await user(), await user(), await user()];
    await phone(ar.id, { language: "ar", country: "EG", platform: "android" });
    await phone(tr.id, { language: "tr", country: "TR", platform: "ios" });
    await phone(both.id, { language: "en", country: "TR", platform: "android" });
    await phone(both.id, { language: "ar", country: "SA", platform: "ios" });
    // An app from before 85.1 never said its language or country.
    await phone(unknown.id, {});
    const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

    expect(await resolveAudience(s, app, audience({ languages: ["ar"] }), NOW)).toEqual(sorted([ar.id, both.id]));
    expect(await resolveAudience(s, app, audience({ countries: ["TR"] }), NOW)).toEqual(sorted([tr.id, both.id]));
    expect(await resolveAudience(s, app, audience({ platforms: ["ios"] }), NOW)).toEqual(sorted([tr.id, both.id]));
    // All on one phone: Arabic in Saudi Arabia on an iPhone.
    expect(await resolveAudience(s, app, audience({ languages: ["ar"], countries: ["SA"], platforms: ["ios"] }), NOW)).toEqual([both.id]);
    expect(await resolveAudience(s, app, audience({ languages: ["ar"], countries: ["TR"], platforms: ["android"] }), NOW)).toEqual([]);
    expect(await countAudience(s, app, audience({ platforms: ["android"] }), NOW)).toBe(3);
  });
}
