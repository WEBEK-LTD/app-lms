import { describe, expect, it } from "vitest";
import {
  announcementFormValues,
  announcementsFor,
  announcementText,
  audienceRecipients,
  inAudience,
  isLive,
  readAnnouncementForm,
  sendInBatches,
} from "@/lib/announcements";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { Announcement, App } from "@/lib/data/types";
import { days, KEY, NOW } from "./helpers";

function announcement(patch: Partial<Announcement> = {}): Announcement {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    title: "New: Bookings apps",
    body: "Salons can take bookings.",
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

const academy = { appType: "lms" as const };

describe("announcement audiences", () => {
  it("picks clients by plan, app type or state", () => {
    const pro = { state: "active" as const, license: { plan: "pro" as const }, app: academy };
    const pending = { state: "pending" as const, license: null, app: null };
    expect(inAudience({ kind: "all" }, pending)).toBe(true);
    expect(inAudience({ kind: "plan", plans: ["pro"] }, pro)).toBe(true);
    expect(inAudience({ kind: "plan", plans: ["starter"] }, pro)).toBe(false);
    expect(inAudience({ kind: "plan", plans: ["pro", "starter"] }, pending)).toBe(false);
    expect(inAudience({ kind: "app_type", appTypes: ["lms", "store"] }, pro)).toBe(true);
    expect(inAudience({ kind: "app_type", appTypes: ["booking"] }, pro)).toBe(false);
    expect(inAudience({ kind: "app_type", appTypes: ["lms"] }, pending)).toBe(false);
    expect(inAudience({ kind: "state", states: ["pending", "expired"] }, pending)).toBe(true);
    expect(inAudience({ kind: "state", states: ["expired"] }, pro)).toBe(false);
  });

  it("shows an announcement between its start and end", () => {
    expect(isLive(announcement(), NOW)).toBe(true);
    expect(isLive(announcement({ startsAt: days(1) }), NOW)).toBe(false);
    expect(isLive(announcement({ endsAt: NOW }), NOW)).toBe(false);
    expect(isLive(announcement({ endsAt: days(1) }), NOW)).toBe(true);
  });

  it("keeps dismissed announcements off the banner but in the list, newest first", () => {
    const all = [
      announcement({ id: "old", startsAt: days(-3) }),
      announcement({ id: "new", startsAt: days(-1) }),
      announcement({ id: "store", audience: { kind: "app_type", appTypes: ["store"] } }),
      announcement({ id: "later", startsAt: days(2) }),
    ];
    const subject = { state: "active" as const, license: { plan: "starter" as const }, app: academy };
    const { live, banner } = announcementsFor(all, subject, ["new"], NOW);
    expect(live.map((a) => a.id)).toEqual(["new", "old"]);
    expect(banner.map((a) => a.id)).toEqual(["old"]);
  });

  it("57 keeps bell-only announcements off the banner, and lists ended ones in the history", () => {
    const all = [
      announcement({ id: "banner", startsAt: days(-2) }),
      announcement({ id: "bell", kind: "maintenance", showAsBanner: false, startsAt: days(-1) }),
      announcement({ id: "ended", kind: "offer", startsAt: days(-9), endsAt: days(-3) }),
      announcement({ id: "later", startsAt: days(2) }),
      announcement({ id: "store", kind: "update", audience: { kind: "app_type", appTypes: ["store"] } }),
    ];
    const subject = { state: "active" as const, license: { plan: "starter" as const }, app: academy };
    const { live, banner, history } = announcementsFor(all, subject, [], NOW);
    expect(live.map((a) => a.id)).toEqual(["bell", "banner"]);
    expect(banner.map((a) => a.id)).toEqual(["banner"]);
    expect(history.map((a) => a.id)).toEqual(["bell", "banner", "ended"]);
  });

  it("finds the clients to email", async () => {
    const store = new MemoryStore();
    const add = async (email: string, appType: App["appType"] | null, plan: "starter" | "pro" | null) => {
      const { client } = await registerClient(store, { name: email.split("@")[0]!, email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
      if (plan) await activateClient(store, { clientId: client.id, plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
      if (appType) await store.createApp({ id: `app-${email}`, clientId: client.id, appType } as App);
      return client;
    };
    await add("pro@a.test", "store", "pro");
    await add("starter@a.test", "lms", "starter");
    await add("pending@a.test", null, null);
    const emails = async (audience: Announcement["audience"]) => (await audienceRecipients(store, audience, NOW)).map((r) => r.email).sort();
    expect(await emails({ kind: "all" })).toEqual(["pending@a.test", "pro@a.test", "starter@a.test"]);
    expect(await emails({ kind: "plan", plans: ["pro"] })).toEqual(["pro@a.test"]);
    expect(await emails({ kind: "app_type", appTypes: ["lms"] })).toEqual(["starter@a.test"]);
    expect(await emails({ kind: "state", states: ["pending"] })).toEqual(["pending@a.test"]);
  });

  it("emails in batches and counts what failed", async () => {
    let running = 0;
    let most = 0;
    const result = await sendInBatches(
      [1, 2, 3, 4, 5],
      async (n) => {
        running += 1;
        most = Math.max(most, running);
        await new Promise((resolve) => setTimeout(resolve, 1));
        running -= 1;
        if (n === 4) throw new Error("smtp");
      },
      2,
    );
    expect(result).toEqual({ sent: 4, failed: 1 });
    expect(most).toBe(2);
  });
});

describe("the admin's announcement form", () => {
  const read = (values: Record<string, string>, lists: { plans?: string[]; appTypes?: string[]; states?: string[] } = {}) =>
    readAnnouncementForm({ values, plans: lists.plans ?? [], appTypes: lists.appTypes ?? [], states: lists.states ?? [] }, NOW);

  it("reads an announcement, from now when there's no start", () => {
    expect(read({ title: " Planned  maintenance ", body: "We update **tonight**.", audience: "plan", severity: "warning", linkUrl: "/pricing", linkLabel: "See plans", endsAt: "2026-10-20T06:00" }, { plans: ["pro", "x"] })).toEqual({
      ok: true,
      announcement: {
        title: "Planned maintenance",
        body: "We update **tonight**.",
        audience: { kind: "plan", plans: ["pro"] },
        severity: "warning",
        // 57 Before Phase 57 the form had no kind or placement: an announcement, also a banner.
        kind: "announcement",
        showAsBanner: true,
        titleAr: null,
        bodyAr: null,
        titleTr: null,
        bodyTr: null,
        linkUrl: "/pricing",
        linkLabel: "See plans",
        startsAt: NOW,
        endsAt: new Date("2026-10-20T06:00:00.000Z"),
      },
    });
  });

  it("says what's wrong", () => {
    expect(read({ title: "", body: "<script>x</script>", audience: "app_type", linkUrl: "javascript:alert(1)", startsAt: "2026-10-20T06:00", endsAt: "2026-10-19T06:00" })).toEqual({
      ok: false,
      errors: {
        title: "Enter a title.",
        body: "HTML isn't allowed. Use Markdown for bold text and links.",
        audience: "Choose at least one app type.",
        linkUrl: "Use an https:// address, or a path on yallapp.com.tr like /pricing.",
        endsAt: "Choose a time after the start.",
      },
    });
    expect(read({ title: "T", body: "B" })).toEqual({ ok: false, errors: { audience: "Choose who sees it." } });
  });

  it("shows a saved announcement as it reads it", () => {
    const saved = announcement({ audience: { kind: "state", states: ["expired", "active"] }, endsAt: new Date("2026-11-01T09:30:00.000Z") });
    const values = announcementFormValues(saved);
    expect(values).toMatchObject({ audience: "state", states: "expired,active", startsAt: "2026-10-11T10:00", endsAt: "2026-11-01T09:30" });
    expect(read({ ...values }, { states: values.states.split(",") })).toMatchObject({
      ok: true,
      announcement: { audience: { kind: "state", states: ["active", "expired"] }, startsAt: saved.startsAt, endsAt: saved.endsAt },
    });
  });

  it("57 reads the kind, the placement and the Arabic and Turkish texts", () => {
    const values = { title: "Builds pause tonight", body: "From 22:00.", audience: "all", kind: "maintenance", placement: "bell", titleAr: " توقف  البناء ", bodyAr: "من ٢٢:٠٠.", titleTr: "", bodyTr: "" };
    expect(read(values)).toMatchObject({
      ok: true,
      announcement: { kind: "maintenance", showAsBanner: false, titleAr: "توقف البناء", bodyAr: "من ٢٢:٠٠.", titleTr: null, bodyTr: null },
    });
    // An unknown kind is an announcement; anything but "bell" is a banner too.
    expect(read({ ...values, kind: "promo", placement: "" })).toMatchObject({ ok: true, announcement: { kind: "announcement", showAsBanner: true } });
    expect(read({ ...values, titleAr: "", titleTr: "Bakım", bodyTr: "<b>Gece</b>" })).toEqual({
      ok: false,
      errors: { titleAr: "Enter the title too, or remove the message.", bodyTr: "HTML isn't allowed. Use Markdown for bold text and links." },
    });
    expect(read({ ...values, titleAr: "x".repeat(121) })).toEqual({ ok: false, errors: { titleAr: "Use at most 120 characters." } });
    expect(read({ ...values, titleTr: "Bakım" })).toEqual({ ok: false, errors: { bodyTr: "Enter the message too, or remove the title." } });
    // A saved one shows as it was written.
    expect(announcementFormValues(announcement({ kind: "offer", showAsBanner: false, titleTr: "İndirim", bodyTr: "Yüzde 20" }))).toMatchObject({
      kind: "offer",
      placement: "bell",
      titleTr: "İndirim",
      bodyTr: "Yüzde 20",
      titleAr: "",
    });
    expect(announcementFormValues(null)).toMatchObject({ kind: "announcement", placement: "banner" });
  });

  it("57 gives the text in a language, falling back to English", () => {
    const a = announcement({ title: "Sale", body: "20% off", titleAr: "تخفيض", bodyAr: "خصم ٢٠٪", titleTr: "İndirim", bodyTr: null });
    expect(announcementText(a, "ar")).toEqual({ title: "تخفيض", body: "خصم ٢٠٪", lang: "ar" });
    expect(announcementText(a, "ar-EG")).toMatchObject({ lang: "ar" });
    // Turkish has a title but no message: English, never a mix of the two.
    expect(announcementText(a, "tr")).toEqual({ title: "Sale", body: "20% off", lang: "en" });
    expect(announcementText(a, "en")).toEqual({ title: "Sale", body: "20% off", lang: "en" });
    expect(announcementText(a, "de")).toMatchObject({ lang: "en" });
    expect(announcementText(announcement({ titleTr: "Bakım", bodyTr: "  " }), "TR")).toMatchObject({ lang: "en" });
    expect(announcementText(announcement({ titleTr: "Bakım", bodyTr: "Bu gece" }), "TR")).toEqual({ title: "Bakım", body: "Bu gece", lang: "tr" });
  });

  it("stores who dismissed what", async () => {
    const store = new MemoryStore();
    await store.createAnnouncement(announcement());
    await store.dismissAnnouncement({ announcementId: announcement().id, clientId: "client-1", now: NOW });
    await store.dismissAnnouncement({ announcementId: announcement().id, clientId: "client-1", now: NOW });
    await store.dismissAnnouncement({ announcementId: "missing", clientId: "client-1", now: NOW });
    expect(await store.listDismissedAnnouncementIds("client-1")).toEqual([announcement().id]);
    await store.deleteAnnouncement(announcement().id);
    expect(await store.listDismissedAnnouncementIds("client-1")).toEqual([]);
  });
});
