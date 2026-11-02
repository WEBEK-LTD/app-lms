import type { App, UniSettings, UniTerm } from "../data/types";
import type { DataStore } from "../data/store";
import { hasFeature, type PlanInfo } from "../plans";
import { schoolOn } from "../school/settings";
import { DEFAULT_SCALE } from "./rules";

/**
 * 113.9 A school in university mode: the school turns it on in University ›
 * Settings (its plan has `university`); its students then register in each
 * term's sections, its lecturers grade them and the app shows the GPA and
 * the transcript. The school's other parts (fees, news, people) stay.
 */

export function uniSettingsOf(saved: UniSettings | null): UniSettings {
  return { enabled: false, scale: DEFAULT_SCALE.map((g) => ({ ...g })), currentTermId: null, waitlist: true, ...(saved ?? {}) };
}

/** Whether the plan has universities (Yallapp's own demo apps always do). */
export function universityInPlan(app: Pick<App, "demo">, plan: PlanInfo | null | undefined): boolean {
  return plan === undefined || hasFeature(plan, "university") || app.demo === true;
}

/** Whether the app is a school in university mode whose plan has schools and universities. */
export function universityOn(app: Pick<App, "connector" | "demo">, plan: PlanInfo | null | undefined, settings: UniSettings): boolean {
  return settings.enabled && schoolOn(app, plan) && universityInPlan(app, plan);
}

export async function loadUniSettings(store: DataStore, appId: string): Promise<UniSettings> {
  return uniSettingsOf(await store.getUniSettings(appId));
}

/**
 * The term things open on: the one the university chose, else the term of
 * today, else the one whose registration is open, else the next, else the
 * latest. `terms` are the store's (the latest first).
 */
export function currentTerm(terms: readonly UniTerm[], settings: Pick<UniSettings, "currentTermId">, today: string): UniTerm | null {
  const chosen = terms.find((t) => t.id === settings.currentTermId);
  if (chosen) return chosen;
  const running = terms.find((t) => t.startsOn <= today && today <= t.endsOn);
  if (running) return running;
  const registering = terms.find((t) => t.registrationOpens <= today && today <= t.dropUntil);
  if (registering) return registering;
  const next = [...terms].filter((t) => t.startsOn > today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  return next ?? terms[0] ?? null;
}

/**
 * The term a student registers for: one whose registration runs today (the
 * soonest), else the current term.
 */
export function registrationTerm(terms: readonly UniTerm[], settings: Pick<UniSettings, "currentTermId">, today: string): UniTerm | null {
  const open = [...terms].filter((t) => t.registrationOpens <= today && today <= t.dropUntil).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  return open ?? currentTerm(terms, settings, today);
}
