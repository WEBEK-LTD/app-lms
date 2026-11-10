import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";
import type { LiveActivityEntry } from "@/lib/live-activity/types";
import type { SiteReview } from "@/lib/reviews/types";
import { NOW } from "./helpers";

/**
 * The website's live activity card and the home page's reviews, the same on
 * every store (MemoryStore, and MySQL or MariaDB with migration 0122): the
 * team's entries, demo sign-ins, the consent on a plan payment, the reviews.
 */
export function liveStoreSuite(store: () => DataStore) {
  const entry = (patch: Partial<LiveActivityEntry> = {}): LiveActivityEntry => ({
    id: randomUUID(),
    firstName: "Selin",
    lastInitial: "K",
    plan: "growth",
    city: "İstanbul",
    country: "TR",
    agreedAt: new Date(NOW.getTime() - 86_400_000),
    clientId: null,
    consent: true,
    hidden: false,
    createdBy: "team@yallapp.test",
    createdAt: NOW,
    ...patch,
  });

  it("keeps the team's entries, the latest agreement first, and hides and deletes them", async () => {
    const s = store();
    const older = entry({ firstName: "أحمد", lastInitial: "م", city: null, country: null, agreedAt: new Date(NOW.getTime() - 5 * 86_400_000) });
    const newer = entry();
    await s.saveLiveActivityEntry(older);
    await s.saveLiveActivityEntry(newer);
    const mine = (await s.listLiveActivityEntries()).filter((e) => e.id === older.id || e.id === newer.id);
    expect(mine).toEqual([newer, older]);
    await s.saveLiveActivityEntry({ ...newer, hidden: true });
    expect((await s.getLiveActivityEntry(newer.id))?.hidden).toBe(true);
    expect(await s.deleteLiveActivityEntry(older.id)).toBe(true);
    expect(await s.deleteLiveActivityEntry(older.id)).toBe(false);
    expect(await s.getLiveActivityEntry(older.id)).toBeNull();
  });

  it("keeps demo sign-ins with the demo and country only, the latest first, and deletes old ones", async () => {
    const s = store();
    const base = NOW.getTime() + 365 * 86_400_000;
    const at = (days: number) => new Date(base - days * 86_400_000);
    const old = await s.addDemoVisit({ demo: "marketplace", country: "TR", at: at(8) });
    const recent = await s.addDemoVisit({ demo: "school", country: null, at: at(1) });
    expect(recent).toBeGreaterThan(old);
    const since = (await s.listDemoVisitsSince(at(10), 50)).filter((v) => v.id === old || v.id === recent);
    expect(since).toEqual([
      { id: recent, demo: "school", country: null, at: at(1) },
      { id: old, demo: "marketplace", country: "TR", at: at(8) },
    ]);
    expect(await s.deleteDemoVisitsBefore(at(7))).toBeGreaterThanOrEqual(1);
    expect((await s.listDemoVisitsSince(at(10), 50)).map((v) => v.id)).toContain(recent);
    expect((await s.listDemoVisitsSince(at(10), 50)).map((v) => v.id)).not.toContain(old);
  });

  it("keeps the client's consent on a plan payment", async () => {
    const s = store();
    const user = await s.createUser({ email: `live-${randomUUID()}@shop.test`, name: "Ada Lovelace", passwordHash: null, now: NOW });
    const client = await s.createClient({ userId: user.id, whatsapp: "905446731942", siteUrl: "", now: NOW });
    const base = { clientId: client.id, appId: null, plan: "pro" as const, months: 1 as const, amountCents: 1000, currency: "EGP" as const, status: "pending" as const, paymentId: null, createdAt: NOW, paidAt: null };
    await s.createPlanPayment({ ...base, id: randomUUID(), tokenHash: randomUUID().replace(/-/g, ""), showOnSite: true });
    await s.createPlanPayment({ ...base, id: randomUUID(), tokenHash: randomUUID().replace(/-/g, "") });
    const consents = (await s.listPlanPayments({ clientId: client.id, limit: 10 })).map((p) => p.showOnSite ?? null).sort();
    expect(consents).toEqual([null, true]);
  });

  it("keeps the home page's reviews in the team's order, with their translations, source and photo", async () => {
    const s = store();
    const review = (patch: Partial<SiteReview> = {}): SiteReview => ({
      id: randomUUID(),
      name: "Selin Kaya",
      role: "Owner, Lale Flowers",
      city: "İstanbul",
      appName: "Lale",
      plan: null,
      clientId: null,
      rating: 5,
      lang: "tr",
      text: "Uygulamamız bir haftada yayındaydı.",
      translations: { en: "Our app was live in a week.", ar: "كان تطبيقنا متاحًا خلال أسبوع." },
      photo: null,
      source: "google",
      sourceUrl: "https://g.page/r/abc",
      reviewedAt: NOW,
      consent: true,
      hidden: false,
      position: 1_000_001,
      createdBy: "team@yallapp.test",
      createdAt: NOW,
      ...patch,
    });
    const first = review();
    const second = review({ position: 1_000_002, rating: 4, source: "direct", sourceUrl: null, translations: {}, photo: `${randomUUID()}.jpg`, role: null, city: null, appName: null });
    await s.saveSiteReview(second);
    await s.saveSiteReview(first);
    const mine = (await s.listSiteReviews()).filter((r) => r.id === first.id || r.id === second.id);
    expect(mine).toEqual([first, second]);
    await s.saveSiteReview({ ...first, hidden: true, position: 1_000_003 });
    expect((await s.listSiteReviews()).filter((r) => r.id === first.id || r.id === second.id).map((r) => r.id)).toEqual([second.id, first.id]);
    expect((await s.getSiteReview(first.id))?.hidden).toBe(true);
    expect(await s.deleteSiteReview(first.id)).toBe(true);
    expect(await s.deleteSiteReview(first.id)).toBe(false);
    await s.deleteSiteReview(second.id);
  });
}
