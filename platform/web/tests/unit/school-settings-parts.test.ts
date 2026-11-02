import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { SchoolSettings } from "@/lib/data/types";
import { DEFAULT_BUS_SETTINGS } from "@/lib/school/bus";
import { checkinSettingsOf } from "@/lib/school/checkin";
import { parseSchoolSettings, schoolSettingsFormValues } from "@/lib/school/forms";
import { DEFAULT_LIBRARY_SETTINGS } from "@/lib/school/library";
import { DEFAULT_SCHOOL_MESSAGES } from "@/lib/school/messages";
import { DEFAULT_SALARY_SETTINGS } from "@/lib/school/salaries";
import { schoolSettingsOf, withMainSettings } from "@/lib/school/settings";
import { loadUniSettings, uniSettingsOf } from "@/lib/university/settings";
import { NOW } from "./helpers";

/**
 * 113 The School settings page and the parts that keep their own settings
 * beside it (113.2 check-in, 113.6 messages, 113.8 behaviour, 113.10 the
 * bus, 113.11 the library, 113.12 the salaries' rules; 113.9 the university's
 * own settings): saving one form never drops another's.
 */
const SAVED: SchoolSettings = {
  timezone: "Africa/Cairo",
  currency: "EGP",
  term: { name: "First term 2026", startsOn: "2026-09-20", endsOn: "2027-01-20" },
  absenceAlerts: true,
  feesByCard: false,
  checkin: { ...checkinSettingsOf(schoolSettingsOf(null)), on: true, methods: "both", gateKey: 3 },
  messages: { ...DEFAULT_SCHOOL_MESSAGES, with: "parents", adminReads: true },
  bus: { ...DEFAULT_BUS_SETTINGS, nearBy: "distance", nearMeters: 800 },
  library: { ...DEFAULT_LIBRARY_SETTINGS, loanDays: 21 },
  salaries: { ...DEFAULT_SALARY_SETTINGS, absence: { on: true, days: 1 } },
  behaviourAlerts: "negative",
  behaviourCategoriesSet: true,
};

describe("113 the school's settings, part by part", () => {
  it("the School settings form changes its own fields and keeps every other part's", () => {
    const form = { ...schoolSettingsFormValues(SAVED), timezone: "Europe/Istanbul", currency: "TRY", termName: "", termStarts: "", termEnds: "", absenceAlerts: "", feesByCard: "on" };
    const parsed = parseSchoolSettings(form);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const saved = withMainSettings(SAVED, parsed.value);
    expect(saved).toEqual({ ...SAVED, timezone: "Europe/Istanbul", currency: "TRY", term: null, absenceAlerts: false, feesByCard: true });
    // Every part another page keeps is as it was.
    for (const part of ["checkin", "messages", "bus", "library", "salaries", "behaviourAlerts", "behaviourCategoriesSet"] as const) expect(saved[part]).toEqual(SAVED[part]);
  });

  it("before anything was saved, the form's fields are all there is", () => {
    const parsed = parseSchoolSettings({ timezone: "Africa/Cairo", currency: "EGP", absenceAlerts: "on" });
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    expect(withMainSettings(null, parsed.value)).toEqual({ timezone: "Africa/Cairo", currency: "EGP", term: null, absenceAlerts: true, feesByCard: false });
  });

  it("saved one after another, the forms keep each other's parts in the store", async () => {
    const store: DataStore = new MemoryStore();
    const appId = "school-app";
    await store.saveSchoolSettings(appId, SAVED, NOW);
    // 113.9 University › Settings keeps its own, beside the school's.
    const uni = { ...uniSettingsOf(null), enabled: true, waitlist: false };
    await store.saveUniSettings(appId, uni, NOW);
    // The way each part's own form saves: what is saved, with its part.
    const save = async (patch: Partial<SchoolSettings>) => store.saveSchoolSettings(appId, { ...schoolSettingsOf(await store.getSchoolSettings(appId)), ...patch }, NOW);
    await save({ bus: { ...DEFAULT_BUS_SETTINGS, nearMinutes: 10 } });
    await save({ library: { ...DEFAULT_LIBRARY_SETTINGS, maxLoans: 5 } });
    await save({ messages: { ...DEFAULT_SCHOOL_MESSAGES, with: "parents_students" } });
    await save({ behaviourAlerts: "all" });
    await save({ salaries: { ...DEFAULT_SALARY_SETTINGS, lateness: { on: true, every: 2, days: 1, countEarly: true } } });
    const parsed = parseSchoolSettings({ ...schoolSettingsFormValues(SAVED), currency: "USD" });
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    await store.saveSchoolSettings(appId, withMainSettings(await store.getSchoolSettings(appId), parsed.value), NOW);
    const after = (await store.getSchoolSettings(appId))!;
    expect(after.currency).toBe("USD");
    expect(after.checkin).toEqual(SAVED.checkin);
    expect(after.bus?.nearMinutes).toBe(10);
    expect(after.library?.maxLoans).toBe(5);
    expect(after.messages?.with).toBe("parents_students");
    expect(after.behaviourAlerts).toBe("all");
    expect(after.behaviourCategoriesSet).toBe(true);
    expect(after.salaries?.lateness).toEqual({ on: true, every: 2, days: 1, countEarly: true });
    expect(await loadUniSettings(store, appId)).toEqual(uni);
  });
});
