import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/live-activity/route";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { PlanPayment } from "@/lib/data/types";
import { pruneDemoVisits, recordDemoVisit } from "@/lib/live-activity/demo";
import { newEntry, readEntryForm } from "@/lib/live-activity/entries";
import { clearLiveFeedCache, collectLiveEvents, liveFacts, liveFeedOf, liveItems, partsOf } from "@/lib/live-activity/feed";
import { cleanFirstName, maskedName, maskFullName } from "@/lib/live-activity/names";
import { normalizeLiveSetting, readLiveSetting } from "@/lib/live-activity/settings";
import { liveOnPath, relativeTime } from "@/lib/live-activity/time";
import { LIVE_DEFAULTS, LIVE_KINDS, type LiveActivityEntry, type LiveActivitySetting } from "@/lib/live-activity/types";
import { KINDS } from "@/lib/app/kinds";
import { APP_STORES } from "@/lib/stores";
import { PLAN_INFO } from "@/lib/plans";
import { liveStoreSuite } from "./live-activity-store-suite";

/**
 * The website's live activity card: every card is something that really
 * happened, a subscription only with the customer's consent, names masked,
 * nothing private in the public feed, demo sign-ins kept 7 days, and the
 * team's settings followed.
 */

const NOW = new Date("2026-11-10T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
/** The card's text without the direction isolates around names and places. */
const plain = (text: string) => text.replace(/[\u2068\u2069]/g, "");
const ALL: LiveActivitySetting = { ...LIVE_DEFAULTS, kinds: [...LIVE_KINDS] };

describe("the live activity storage in memory", () => {
  const store = new MemoryStore();
  liveStoreSuite(() => store);
});

async function client(store: DataStore, name: string, email: string, country: string | null = "TR") {
  const { user, client } = await registerClient(store, { name, email, whatsapp: "+905446731942", siteUrl: "https://shop.test", password: null }, ago(40));
  if (country) await store.updateClient(client.id, { country }, ago(40));
  return { user, client: (await store.getClientById(client.id))! };
}

async function paid(store: DataStore, clientId: string, patch: Partial<PlanPayment> = {}): Promise<PlanPayment> {
  const p: PlanPayment = {
    id: `p-${Math.random().toString(36).slice(2)}`,
    clientId,
    appId: null,
    plan: "pro",
    months: 1,
    amountCents: 150_000,
    currency: "EGP",
    status: "pending",
    tokenHash: `t-${Math.random()}`,
    paymentId: null,
    createdAt: ago(2),
    paidAt: null,
    purpose: "plan",
    ...patch,
  };
  await store.createPlanPayment(p);
  await store.payPlanPayment(p.id, `pay-${p.id}`, ago(1));
  return p;
}

function entry(patch: Partial<LiveActivityEntry> = {}): LiveActivityEntry {
  return {
    id: `e-${Math.random().toString(36).slice(2)}`,
    firstName: "Selin",
    lastInitial: "K",
    plan: "growth",
    city: "Istanbul",
    country: "TR",
    agreedAt: ago(3),
    clientId: null,
    consent: true,
    hidden: false,
    createdBy: "team@yallapp.test",
    createdAt: ago(3),
    ...patch,
  };
}

const subscriptions = async (store: DataStore, setting = ALL) => (await collectLiveEvents(store, setting, NOW)).filter((e) => e.kind === "subscription");

describe("consent: no consent, no card", () => {
  it("shows a paid plan only when the client ticked the box, and never a storage pack", async () => {
    const store = new MemoryStore();
    const a = await client(store, "Ahmed Mahmoud Saleh", "ahmed@shop.test");
    const b = await client(store, "Burak Yılmaz", "burak@shop.test");
    const c = await client(store, "Can Demir", "can@shop.test");
    await paid(store, a.client.id, { showOnSite: true });
    await paid(store, b.client.id); // never asked
    await paid(store, b.client.id, { showOnSite: null });
    await paid(store, c.client.id, { showOnSite: true, purpose: "storage" });
    const shown = await subscriptions(store);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ name: "Ahmed S.", plan: PLAN_INFO.pro.name, country: "TR" });
  });

  it("the payment form's box is off by default and records the choice on the payment", async () => {
    const { readFileSync } = await import("node:fs");
    const form = readFileSync(new URL("../../src/components/plan-payment-form.tsx", import.meta.url), "utf8");
    expect(form).toMatch(/name="showOnSite" defaultChecked=\{state\.values\?\.showOnSite === "on"\}/);
    const payments = readFileSync(new URL("../../src/lib/billing/plan-payment.ts", import.meta.url), "utf8");
    expect(payments.match(/showOnSite: deps\.showOnSite === true \? true : null/g)).toHaveLength(2);
  });
});

describe("name masking", () => {
  it("keeps the first name and the last name's initial only", () => {
    expect(maskFullName("Ahmed Mahmoud Saleh")).toBe("Ahmed S.");
    expect(maskFullName("  selin   kaya ")).toBe("selin K.");
    expect(maskFullName("أحمد محمود")).toBe("أحمد م.");
    expect(maskFullName("İbrahim Öztürk")).toBe("İbrahim Ö.");
    expect(maskFullName("Madonna")).toBe("Madonna");
    expect(maskedName("Jean-Luc", "picard")).toBe("Jean-Luc P.");
  });

  it("gives no name for what isn't one", () => {
    expect(maskFullName("ahmed@shop.test")).toBeNull();
    expect(maskFullName("+90 544 673 19 42")).toBeNull();
    expect(maskFullName("")).toBeNull();
    expect(maskFullName(null)).toBeNull();
    expect(maskFullName("Acme Ltd.")).toBe("Acme");
    expect(cleanFirstName("A".repeat(21))).toBeNull();
  });

  it("drops a subscription whose account name isn't a name", async () => {
    const store = new MemoryStore();
    const a = await client(store, "info@shop.test", "info@shop.test");
    await paid(store, a.client.id, { showOnSite: true });
    expect(await subscriptions(store)).toEqual([]);
  });
});

describe("manual entries", () => {
  const plans = PLAN_INFO;
  const form = { firstName: "Selin", lastName: "Kaya", plan: "growth", city: "Istanbul", country: "TR", agreedOn: "2026-11-08", client: "", consent: "on" };

  it("need the agreement box", () => {
    const without = readEntryForm({ ...form, consent: "" }, plans, NOW);
    expect(without.ok).toBe(false);
    expect(!without.ok && without.errors.consent).toMatch(/agreed/);
    const ok = readEntryForm(form, plans, NOW);
    expect(ok.ok && ok.form).toMatchObject({ firstName: "Selin", lastInitial: "K", plan: "growth", country: "TR", consent: true });
  });

  it("keep only the last name's initial, and refuse a day in the future or a made-up plan", () => {
    const ok = readEntryForm(form, plans, NOW);
    const saved = ok.ok ? newEntry(ok.form, null, "team@yallapp.test", NOW) : null;
    expect(saved?.lastInitial).toBe("K");
    expect(JSON.stringify(saved)).not.toContain("Kaya");
    const bad = readEntryForm({ ...form, agreedOn: "2026-12-01", plan: "platinum", firstName: "a@b.c" }, plans, NOW);
    expect(bad.ok ? {} : Object.keys(bad.errors).sort()).toEqual(["agreedOn", "firstName", "plan"]);
  });

  it("show like a subscription, but never without consent, hidden, or older than the window", async () => {
    const store = new MemoryStore();
    await store.saveLiveActivityEntry(entry());
    await store.saveLiveActivityEntry(entry({ firstName: "Hidden", hidden: true }));
    await store.saveLiveActivityEntry(entry({ firstName: "Nobody", consent: false }));
    await store.saveLiveActivityEntry(entry({ firstName: "Old", agreedAt: ago(40) }));
    const shown = await subscriptions(store);
    expect(shown.map((e) => e.kind === "subscription" && e.name)).toEqual(["Selin K."]);
    const [item] = liveItems(shown, "en");
    expect(item).toMatchObject({ kind: "subscription", avatar: { letter: "S" }, detail: "Istanbul" });
    expect(item!.text.map((p) => ({ ...p, text: plain(p.text) }))).toEqual([{ text: "Selin K. subscribed to " }, { text: PLAN_INFO.growth.name, em: true }]);
    expect(item!.text[0]!.text).toBe("\u2068Selin K.\u2069 subscribed to ");
    expect(item!.day).toBe(true);
  });
});

describe("hidden entries", () => {
  it("disappear when hidden and come back when shown again", async () => {
    const store = new MemoryStore();
    const e = entry();
    await store.saveLiveActivityEntry(e);
    expect(await subscriptions(store)).toHaveLength(1);
    await store.saveLiveActivityEntry({ ...e, hidden: true });
    expect(await subscriptions(store)).toHaveLength(0);
    await store.saveLiveActivityEntry({ ...e, hidden: false });
    expect(await subscriptions(store)).toHaveLength(1);
  });
});

describe("GET /api/live-activity never leaks private fields", () => {
  beforeEach(() => clearLiveFeedCache());

  it("sends masked names, plan names, places and times only, cached for a minute", async () => {
    const store = await getStore();
    const a = await client(store, "Zeynep Arslanoğlu", "zeynep.private@shop.test", "AE");
    await paid(store, a.client.id, { showOnSite: true, paidAt: null });
    await store.saveLiveActivityEntry(entry({ firstName: "Mona", lastInitial: "H", clientId: a.client.id, createdBy: "secret-admin@yallapp.test", city: null, country: "EG" }));
    const app = { ...newApp(a.client.id, "https://shop.test", ago(5)), appName: "Zeynep Secret Shop" };
    await store.createApp(app);
    await store.addPublishingEvent({ appId: app.id, store: "android", status: "live", note: "private note", actorEmail: "publisher@yallapp.test", at: ago(2) });
    await store.addClientMilestones([
      { clientId: a.client.id, kind: "store_live", ref: app.id, appId: app.id, at: ago(2), source: null },
      { clientId: a.client.id, kind: "signed_up", ref: "", appId: null, at: ago(4), source: null },
    ]);
    await recordDemoVisit(store, { appType: "store", vertical: null, demo: true }, "DE", ago(0.1));

    for (const lang of ["en", "ar", "tr"] as const) {
      clearLiveFeedCache();
      const response = await GET(new Request(`https://yallapp.test/api/live-activity?lang=${lang}`));
      expect(response.headers.get("cache-control")).toContain("max-age=60");
      const text = await response.text();
      for (const secret of ["zeynep.private@shop.test", "+905446731942", "905446731942", "Arslanoğlu", "Zeynep Secret Shop", "secret-admin", "publisher@", "private note", a.client.id, a.user.id, app.id]) {
        expect(text, `${lang}: ${secret}`).not.toContain(secret);
      }
      const feed = JSON.parse(text) as ReturnType<typeof liveFeedOf>;
      expect(feed.items.length).toBeGreaterThan(0);
      expect(feed.items.length).toBeLessThanOrEqual(10);
      const kinds = new Set(feed.items.map((i) => i.kind));
      expect([...kinds].sort()).toEqual(["account", "demo", "published", "subscription"]);
      // Only these keys, on every card.
      for (const item of feed.items) expect(Object.keys(item).sort()).toEqual(["at", "avatar", "detail", "key", "kind", "text", "tone"]);
      expect(text).toContain(lang === "en" ? "Zeynep A." : "Zeynep A.");
    }
  });
});

describe("demo sign-ins", () => {
  it("keep the demo, the country and the time only, and go after 7 days", async () => {
    const store = new MemoryStore();
    await recordDemoVisit(store, { appType: "food", vertical: "marketplace", demo: true }, "TR", ago(8));
    await recordDemoVisit(store, { appType: "food", vertical: "marketplace", demo: true }, "TR", ago(6.9));
    await recordDemoVisit(store, { appType: "store", vertical: null, demo: true }, "not-a-country", ago(1));
    // A client's own app is never recorded.
    await recordDemoVisit(store, { appType: "store", vertical: null, demo: false }, "EG", ago(1));
    expect(await store.listDemoVisitsSince(ago(30), 10)).toHaveLength(3);
    expect(await pruneDemoVisits(store, NOW)).toBe(1);
    const left = await store.listDemoVisitsSince(ago(30), 10);
    expect(left.map((v) => [v.demo, v.country])).toEqual([
      ["store", null],
      ["marketplace", "TR"],
    ]);
    expect(Object.keys(left[0]!).sort()).toEqual(["at", "country", "demo", "id"]);
    const items = liveItems((await collectLiveEvents(store, { ...ALL, kinds: ["demo"] }, NOW)), "en");
    expect(items.map((i) => plain(i.text.map((p) => p.text).join("")))).toEqual(["Someone is trying the Lale Flowers demo", "Someone from Türkiye is trying the Zad demo"]);
  });
});

describe("the settings are respected", () => {
  it("off shows nothing; only the chosen kinds show; facts only when there is nothing else", async () => {
    const store = new MemoryStore();
    await store.saveLiveActivityEntry(entry());
    expect(await collectLiveEvents(store, { ...ALL, on: false }, NOW)).toEqual([]);
    expect((await collectLiveEvents(store, { ...ALL, kinds: ["subscription"] }, NOW)).map((e) => e.kind)).toEqual(["subscription"]);
    // Subscriptions not chosen: the facts, which are counted from the code.
    const facts = await collectLiveEvents(store, { ...ALL, kinds: ["demo", "fact"] }, NOW);
    expect(facts).toEqual(liveFacts());
    expect(facts.map((f) => f.kind === "fact" && f.count)).toEqual([KINDS.length, APP_STORES.length]);
    expect(await collectLiveEvents(store, { ...ALL, kinds: ["demo"] }, NOW)).toEqual([]);
  });

  it("sends the timings, pages and visit limit, and the card follows the pages setting", () => {
    const setting = { ...ALL, firstDelaySeconds: 3, gapSeconds: 30, maxPerVisit: 2, pages: "home_pricing" as const };
    const feed = liveFeedOf(setting, liveFacts(), "tr");
    expect(feed).toMatchObject({ on: true, firstDelayMs: 3000, gapMs: 30_000, showMs: 6000, maxPerVisit: 2, pages: "home_pricing" });
    expect(liveFeedOf({ ...setting, on: false }, liveFacts(), "tr")).toMatchObject({ on: false, items: [] });
    expect(liveFeedOf(setting, [], "en").on).toBe(false);
    expect(["/", "/ar", "/tr/", "/pricing", "/ar/pricing"].every((p) => liveOnPath("home_pricing", p))).toBe(true);
    expect(["/features", "/ar/demo", "/tr/solutions/school"].some((p) => liveOnPath("home_pricing", p))).toBe(false);
    expect(liveOnPath("all", "/features")).toBe(true);
  });

  it("checks the admin's form and fills in a setting saved before with the defaults", () => {
    expect(readLiveSetting({ on: "on", kinds: [], pages: "all", firstDelaySeconds: "8", gapSeconds: "20", maxPerVisit: "5" })).toMatchObject({ ok: false, errors: { kinds: expect.any(String) } });
    expect(readLiveSetting({ on: "on", kinds: ["demo", "nope"], pages: "elsewhere", firstDelaySeconds: "-1", gapSeconds: "2", maxPerVisit: "99" })).toMatchObject({
      ok: false,
      errors: { pages: expect.any(String), firstDelaySeconds: expect.any(String), gapSeconds: expect.any(String), maxPerVisit: expect.any(String) },
    });
    expect(readLiveSetting({ on: "", kinds: ["account", "demo"], pages: "home_pricing", firstDelaySeconds: "0", gapSeconds: "45", maxPerVisit: "3" })).toEqual({
      ok: true,
      setting: { on: false, kinds: ["demo", "account"], pages: "home_pricing", firstDelaySeconds: 0, gapSeconds: 45, maxPerVisit: 3 },
    });
    expect(normalizeLiveSetting(null)).toEqual(LIVE_DEFAULTS);
    expect(LIVE_DEFAULTS).toMatchObject({ on: true, kinds: [...LIVE_KINDS], pages: "all" });
    expect(normalizeLiveSetting({ on: false, gapSeconds: 9999 } as Partial<LiveActivitySetting>)).toMatchObject({ on: false, gapSeconds: LIVE_DEFAULTS.gapSeconds, kinds: [...LIVE_KINDS] });
  });
});

describe("the card's words", () => {
  it("draws the emphasised parts and never reads values as markup", () => {
    expect(partsOf("en", "{name} subscribed to <em>{plan}</em>", { name: "<em>x</em>", plan: "Pro" })).toEqual([{ text: "<em>x</em> subscribed to " }, { text: "Pro", em: true }]);
  });

  it("writes the time in the visitor's language", () => {
    expect(relativeTime("en", ago(2 / 24), NOW)).toBe("2 hours ago");
    expect(relativeTime("en", ago(1), NOW)).toBe("yesterday");
    expect(relativeTime("tr", ago(2 / 24), NOW)).toBe("2 saat önce");
    expect(relativeTime("ar", ago(2 / 24), NOW)).toMatch(/ساعتين/);
    expect(relativeTime("en", new Date(NOW.getTime() + 5000), NOW)).toBe("now");
    // A day the team entered: never hours.
    expect(relativeTime("en", new Date("2026-11-10T12:00:00Z"), new Date("2026-11-10T21:00:00Z"), { day: true })).toBe("today");
    expect(relativeTime("en", new Date("2026-11-07T12:00:00Z"), NOW, { day: true })).toBe("3 days ago");
    expect(relativeTime("ar", new Date("2026-11-09T12:00:00Z"), NOW, { day: true })).toBe("أمس");
  });

  it("says the facts in every language", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const [kinds, stores] = liveItems(liveFacts(), lang);
      expect(kinds!.text.map((p) => p.text).join("")).toContain(String(KINDS.length));
      expect(stores!.text.map((p) => p.text).join("")).toContain(String(APP_STORES.length));
    }
  });
});
