import { parseCountry } from "../account/country";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { isPlan, type Plan, type PlanInfo } from "../plans";
import { cleanFirstName, initialOf } from "./names";
import type { LiveActivityEntry } from "./types";

/**
 * Admin › Live activity: customers the team adds by hand (signed up
 * offline, after a meeting, paying later). The form needs the box "This
 * customer agreed to be shown on the website": without it nothing is saved.
 */

const CITY = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export interface EntryForm {
  firstName: string;
  lastInitial: string | null;
  plan: Plan;
  city: string | null;
  country: string | null;
  agreedAt: Date;
  /** What the team typed to link a client (their account's email or id), resolved by the action. */
  client: string;
  consent: true;
}

/** "2026-11-10" as that day at noon UTC (so every time zone shows the same day), or null. */
export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value ? null : at;
}

/** The form, checked. `now` decides "not in the future". */
export function readEntryForm(
  input: Record<string, unknown>,
  plans: Record<Plan, PlanInfo>,
  now: Date,
): { ok: true; form: EntryForm } | { ok: false; errors: Record<string, string> } {
  const text = (name: string, max: number) => (typeof input[name] === "string" ? (input[name] as string).trim().slice(0, max) : "");
  const errors: Record<string, string> = {};
  const firstName = cleanFirstName(text("firstName", 40));
  if (!firstName) errors.firstName = "Enter the first name: one word, letters only, up to 20.";
  const last = text("lastName", 40);
  const lastInitial = last ? initialOf(last) : null;
  if (last && !lastInitial) errors.lastName = "The last name or its initial starts with a letter.";
  const planId = text("plan", 16);
  const plan = isPlan(planId) && plans[planId] ? planId : null;
  if (!plan) errors.plan = "Choose the plan.";
  const city = text("city", 60) || null;
  if (city && !CITY.test(city)) errors.city = "A city's name, in letters.";
  const countryText = text("country", 2);
  const country = countryText ? parseCountry(countryText) : null;
  if (countryText && !country) errors.country = "Choose a country from the list.";
  const agreedAt = parseDay(text("agreedOn", 10));
  if (!agreedAt) errors.agreedOn = "Enter the day they subscribed or agreed.";
  else if (agreedAt.getTime() > now.getTime() + 12 * 3_600_000) errors.agreedOn = "The day can't be in the future.";
  // The rule: a customer is shown only when they agreed to it.
  const consent = input.consent === "on" || input.consent === true;
  if (!consent) errors.consent = "Tick the box: a customer is shown on the website only when they agreed to it.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, form: { firstName: firstName!, lastInitial, plan: plan!, city, country, agreedAt: agreedAt!, client: text("client", 191), consent: true } };
}

/** The client the team named by their account's email or the client's id; null for none or not found. */
export async function findClient(store: DataStore, value: string): Promise<{ id: string } | null> {
  const wanted = value.trim();
  if (!wanted) return null;
  if (wanted.includes("@")) {
    const user = await store.getUserByEmail(wanted.toLowerCase());
    return user ? await store.getClientByUserId(user.id) : null;
  }
  return store.getClientById(wanted);
}

/** A new entry from the checked form. */
export function newEntry(form: EntryForm, clientId: string | null, createdBy: string, now: Date): LiveActivityEntry {
  return {
    id: newId(),
    firstName: form.firstName,
    lastInitial: form.lastInitial,
    plan: form.plan,
    city: form.city,
    country: form.country,
    agreedAt: form.agreedAt,
    clientId,
    consent: form.consent,
    hidden: false,
    createdBy,
    createdAt: now,
  };
}
