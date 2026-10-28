import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { Announcement, App, Build, OwnerNotice, PlanPayment } from "@/lib/data/types";
import { accountItems, BELL_LIMIT, buildUpdates, isUpdateKey, loadUpdates, markRead, summaryOf, type AccountSources, type UpdatesInput } from "@/lib/updates";
import { bellData, readerOf } from "@/lib/updates-view";
import { badgeText, bellLabel, shownLine } from "@/lib/updates-words";
import { days, NOW } from "./helpers";

/** 57 The dashboard's bell: what is in it, what is unread for whom, and marking read. */

let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

function announcement(patch: Partial<Announcement> = {}): Announcement {
  return {
    id: uuid(),
    title: "New: Bookings apps",
    body: "Salons can **take bookings**.\n\n- Staff\n- Hours",
    audience: { kind: "all" },
    severity: "info",
    kind: "announcement",
    showAsBanner: true,
    titleAr: null,
    bodyAr: null,
    titleTr: null,
    bodyTr: null,
    linkUrl: null,
    linkLabel: null,
    startsAt: days(-1),
    endsAt: null,
    emailedAt: null,
    emailedCount: 0,
    createdAt: days(-1),
    updatedAt: days(-1),
    createdBy: "admin@yallapp.test",
    ...patch,
  };
}

const APP_A = { id: "a0000000-0000-4000-8000-00000000000a", appName: "Willow Academy" } as App;
const APP_B = { id: "b0000000-0000-4000-8000-00000000000b", appName: "Willow Shop" } as App;

function notice(patch: Partial<OwnerNotice> = {}): OwnerNotice {
  return {
    id: ++n,
    clientId: "client-1",
    appId: APP_A.id,
    kind: "plan_ends_7",
    dedupeKey: `plan_ends_7:${n}`,
    title: "Your plan ends in 7 days",
    body: "Renew it to keep your app running.",
    linkUrl: "https://yallapp.com.tr/dashboard/open?app=a&to=renew",
    linkLabel: "Renew",
    tone: "warn",
    createdAt: days(-2),
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
    ...patch,
  };
}

function build(patch: Partial<Build> = {}): Build {
  return { id: uuid(), appId: APP_A.id, clientId: "client-1", versionName: "1.2.0", versionCode: 5, status: "ready", finishedAt: days(-1), ...patch } as Build;
}

function payment(patch: Partial<PlanPayment> = {}): PlanPayment {
  return { id: uuid(), clientId: "client-1", appId: APP_A.id, plan: "growth", months: 12, amountCents: 150000, currency: "EGP", status: "paid", tokenHash: "", paymentId: null, paidAt: days(-3), createdAt: days(-3), ...patch };
}

const subject = { state: "active" as const, license: null, app: null, licenses: [{ plan: "starter" as const }], apps: [{ appType: "lms" as const }] };
const none: AccountSources = { apps: [APP_A], notices: [], builds: [], payments: [] };

function input(patch: Partial<UpdatesInput> = {}): UpdatesInput {
  return { announcements: [], subject, account: none, read: [], lang: "en", ...patch };
}

describe("57 the bell's items", () => {
  it("lists the client's announcements with their kinds, newest first, and counts the unread live ones", () => {
    const update = announcement({ kind: "update", title: "Faster builds", startsAt: days(-1) });
    const maintenance = announcement({ kind: "maintenance", showAsBanner: false, severity: "warning", startsAt: days(-0.5), linkUrl: "/dashboard/builds", linkLabel: "Your builds" });
    const offer = announcement({ kind: "offer", startsAt: days(-5), endsAt: days(-2) });
    const otherPlan = announcement({ kind: "update", audience: { kind: "plan", plans: ["pro"] } });
    const shops = announcement({ audience: { kind: "app_type", appTypes: ["store"] } });
    const later = announcement({ startsAt: days(1) });
    const result = buildUpdates(input({ announcements: [update, maintenance, offer, otherPlan, shops, later] }), NOW);
    expect(result.all.map((i) => [i.kind, i.current, i.unread])).toEqual([
      ["maintenance", true, true],
      ["update", true, true],
      // Ended: in the full list, never unread.
      ["offer", false, false],
    ]);
    expect(result.current.map((i) => i.key)).toEqual([`announcement:${maintenance.id}`, `announcement:${update.id}`]);
    expect(result.unread).toBe(2);
    expect(result.all[0]).toMatchObject({ tone: "warn", linkUrl: "/dashboard/builds", linkLabel: "Your builds", topic: null, app: null });
    expect(result.all[1]!.summary).toBe("Salons can take bookings. Staff Hours");

    const read = buildUpdates(input({ announcements: [update, maintenance, offer], read: [`announcement:${update.id}`, `announcement:${offer.id}`] }), NOW);
    expect(read.unread).toBe(1);
    expect(read.current.find((i) => i.kind === "update")!.unread).toBe(false);
  });

  it("shows announcements in the reader's language when written, else English", () => {
    const a = announcement({ title: "Sale", body: "20% off", titleAr: "تخفيض", bodyAr: "خصم", titleTr: "İndirim", bodyTr: null });
    expect(buildUpdates(input({ announcements: [a], lang: "ar" }), NOW).all[0]).toMatchObject({ title: "تخفيض", body: "خصم", lang: "ar" });
    expect(buildUpdates(input({ announcements: [a], lang: "tr" }), NOW).all[0]).toMatchObject({ title: "Sale", lang: "en" });
  });

  it("adds the account's own items: notices still true, finished builds and payments, for a while", () => {
    const sources: AccountSources = {
      apps: [APP_A, APP_B],
      notices: [
        notice({ createdAt: days(-2) }),
        // Closed on the overview: still in the bell.
        notice({ kind: "storage_pack_ended", title: "Storage over", tone: "info", dismissedAt: days(-1), appId: APP_B.id, linkUrl: null, linkLabel: null }),
        // No longer true, or too old: left out.
        notice({ resolvedAt: days(-1) }),
        notice({ createdAt: days(-61) }),
      ],
      builds: [
        build({ finishedAt: days(-1) }),
        build({ status: "failed", finishedAt: days(-2), versionName: "1.1.0", versionCode: 4 }),
        build({ finishedAt: days(-3) }),
        // A fourth for the same app, one still building and one too old: left out.
        build({ finishedAt: days(-4) }),
        build({ status: "building", finishedAt: null }),
        build({ appId: APP_B.id, finishedAt: days(-15) }),
      ],
      payments: [payment({ paidAt: days(-3) }), payment({ status: "pending", paidAt: null }), payment({ paidAt: days(-31) }), payment({ purpose: "storage", storagePacks: [{ offer: "plus25", gb: 25 }] as PlanPayment["storagePacks"], amountCents: 25000 })],
      planNames: { starter: "Starter", growth: "Growth+", pro: "Pro", business: "Business", studio_1: "Studio 1", studio_2: "Studio 2", studio_3: "Studio 3" },
    };
    const items = accountItems(sources, NOW);
    expect(items.map((i) => i.topic)).toEqual(["plan", "storage", "build_ready", "build_failed", "build_ready", "payment", "payment"]);
    expect(items.every((i) => i.kind === "account" && i.current)).toBe(true);
    expect(items[0]).toMatchObject({ linkUrl: "/dashboard/open?app=a&to=renew", linkLabel: "Renew", app: "Willow Academy", tone: "warn" });
    expect(items[1]).toMatchObject({ linkUrl: null, linkLabel: null, app: "Willow Shop" });
    expect(items[2]).toMatchObject({ title: "Your app build is ready", body: "Version 1.2.0 (5) is ready to download and publish.", linkUrl: `/dashboard/open?app=${APP_A.id}&to=builds` });
    expect(items[3]).toMatchObject({ title: "Your app build failed", tone: "warn" });
    expect(items[5]).toMatchObject({ title: "Payment received", body: "Growth+ · 1 year: EGP\u00a01,500." });
    expect(items[5]!.linkUrl).toMatch(/^\/dashboard\/license\/receipts\/[0-9a-f-]{36}$/);
    expect(items[6]!.body).toBe("Storage +25 GB: EGP\u00a0250.");
    // One app: no app name on the items.
    expect(accountItems({ ...sources, apps: [APP_A] }, NOW)[0]!.app).toBeNull();

    const result = buildUpdates(input({ announcements: [announcement({ startsAt: days(-2.5) })], account: sources }), NOW);
    expect(result.unread).toBe(8);
    expect(result.current[0]!.topic).toBe("build_ready");
    expect(bellData(result).items).toHaveLength(BELL_LIMIT);
    expect(bellData(result)).toMatchObject({ unread: 8, total: 8 });
  });

  it("writes the badge, the button's name and the panel's line", () => {
    expect([0, 1, 9, 10, 42].map(badgeText)).toEqual(["", "1", "9", "9+", "9+"]);
    expect(bellLabel(3)).toBe("Notifications from Yallapp, 3 unread");
    expect(bellLabel(0)).toBe("Notifications from Yallapp");
    expect(shownLine(8, 12)).toBe("Showing the newest 8 of 12");
    expect(shownLine(3, 3)).toBe("");
  });

  it("summarizes Markdown on one line, cut at a word", () => {
    expect(summaryOf("## Tonight\n\nBuilds pause from **22:00** to [23:00](https://x.test).\n\n> Plan ahead")).toBe("Tonight Builds pause from 22:00 to 23:00. Plan ahead");
    expect(summaryOf(`${"word ".repeat(60)}end`, 40)).toBe("word word word word word word word word…");
  });

  it("only takes the keys it makes", () => {
    expect(isUpdateKey("announcement:a0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUpdateKey("notice:42")).toBe(true);
    expect(isUpdateKey("build:a0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUpdateKey("payment:a0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUpdateKey("notice:abc")).toBe(false);
    expect(isUpdateKey("announcement:'; drop")).toBe(false);
    expect(isUpdateKey(42)).toBe(false);
  });
});

describe("57 read state, per person", () => {
  it("stores reads per user, keeps the first time, and forgets a deleted announcement's", async () => {
    const store = new MemoryStore();
    const a = announcement();
    await store.createAnnouncement(a);
    const key = `announcement:${a.id}`;
    await store.markUpdatesRead({ userId: "owner", items: [key, "notice:7"], now: NOW });
    await store.markUpdatesRead({ userId: "owner", items: [key], now: days(1) });
    await store.markUpdatesRead({ userId: "owner", items: [], now: NOW });
    expect((await store.listReadUpdates("owner", [key, "notice:7", "notice:8", key])).sort()).toEqual([key, "notice:7"]);
    expect(await store.listReadUpdates("teammate", [key])).toEqual([]);
    expect(await store.listReadUpdates("owner", [])).toEqual([]);
    await store.deleteAnnouncement(a.id);
    expect(await store.listReadUpdates("owner", [key, "notice:7"])).toEqual(["notice:7"]);
  });

  it("marks only well-formed keys", async () => {
    const store = new MemoryStore();
    await markRead(store, "owner", ["notice:1", "nonsense", 5, null, "notice:1"], NOW);
    expect(await store.listReadUpdates("owner", ["notice:1", "nonsense"])).toEqual(["notice:1"]);
  });

  it("loads the bell for each person: the owner's reads aren't our team member's", async () => {
    const store = new MemoryStore();
    const owner = await store.createUser({ email: "owner@a.test", name: "Owner", passwordHash: null, now: NOW });
    const staff = await store.createUser({ email: "staff@yallapp.test", name: "Staff", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: owner.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app = { id: "c0000000-0000-4000-8000-00000000000c", clientId: client.id, appType: "lms", appName: "Willow" } as App;
    const update = announcement({ kind: "update", startsAt: days(-1, new Date()) });
    const bellOnly = announcement({ kind: "maintenance", showAsBanner: false, startsAt: days(-1, new Date()) });
    await store.createAnnouncement(update);
    await store.createAnnouncement(bellOnly);
    await store.createAnnouncement(announcement({ audience: { kind: "plan", plans: ["pro"] } }));
    const context = (by: typeof owner | null) => ({ user: owner, staff: by, client, apps: [app], account: "active" as const, licenses: [{ plan: "starter" } as never] });
    const now = new Date();
    const ownerBell = await loadUpdates(store, readerOf(context(null)), now);
    expect(ownerBell.unread).toBe(2);
    await markRead(
      store,
      readerOf(context(null)).userId,
      ownerBell.current.map((i) => i.key),
      now,
    );
    expect((await loadUpdates(store, readerOf(context(null)), now)).unread).toBe(0);
    // Our team member managing the same dashboard still has both unread.
    expect(readerOf(context(staff)).userId).toBe(staff.id);
    expect((await loadUpdates(store, readerOf(context(staff)), now)).unread).toBe(2);
  });
});
