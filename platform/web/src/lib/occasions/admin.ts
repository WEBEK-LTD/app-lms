import { recordAudit } from "../admin/audit";
import { normalizeCouponCode } from "../billing/coupons";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { OccasionPlans, OccasionRecord, OccasionTemplate, User } from "../data/types";
import { clearPlatformSettingsCache } from "../settings/platform";
import { isOccasionTemplate, istanbulDay, OCCASION_TEMPLATES, occasionCoupon, occasionDaysLeft, occasionErrors, occasionNextYear, occasionState } from "./index";
import { occasionsOf } from "./store";

/**
 * 124 Admin › Occasions: saving an occasion stores every occasion in the
 * platform setting `occasions` and creates or updates its coupon (Admin ›
 * Coupons) from it, so the discount is the coupon's. A coupon belongs to
 * one occasion at a time (its `couponId`); "Run it again next year" hands
 * it to next year's occasion, and deleting an occasion turns its coupon
 * off, since a used coupon's uses must stay.
 */

/** The fields of the occasion's form. */
export type OccasionFields = Pick<OccasionRecord, "name" | "startsOn" | "endsOn" | "percent" | "couponCode" | "plans" | "active">;

export type OccasionActor = Pick<User, "id" | "email">;

export type OccasionResult = { ok: true; occasion: OccasionRecord } | { ok: false; errors: Record<string, string>; message?: string };

export const OCCASION_PLANS_LABELS: Record<OccasionPlans, string> = {
  all: "All plans",
  regular: "Regular apps' plans",
  studio: "Yallapp Studio's plans",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "1–30 November 2026", "20 November – 2 December 2026", "28 December 2026 – 3 January 2027". */
export function occasionDaysText(o: Pick<OccasionRecord, "startsOn" | "endsOn">): string {
  const [y1, m1, d1] = o.startsOn.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = o.endsOn.split("-").map(Number) as [number, number, number];
  const month = (m: number) => MONTHS[m - 1] ?? "";
  if (y1 === y2 && m1 === m2) return d1 === d2 ? `${d1} ${month(m1)} ${y1}` : `${d1}–${d2} ${month(m1)} ${y1}`;
  if (y1 === y2) return `${d1} ${month(m1)} – ${d2} ${month(m2)} ${y1}`;
  return `${d1} ${month(m1)} ${y1} – ${d2} ${month(m2)} ${y2}`;
}

/** For the admin's list: "Upcoming", "On now, 19 days left", "Ended" or "Off". */
export function occasionStateLabel(o: OccasionRecord, now: Date): { label: string; tone: "success" | "warn" | "neutral" } {
  const state = occasionState(o, now);
  if (state === "live") {
    const left = occasionDaysLeft(o, now);
    return { label: `On now, ${left} ${left === 1 ? "day" : "days"} left`, tone: "success" };
  }
  if (state === "upcoming") return { label: "Upcoming", tone: "warn" };
  return { label: state === "ended" ? "Ended" : "Off", tone: "neutral" };
}

/** The form's values, read; occasionErrors checks them. */
export function readOccasionForm(values: Record<string, string>): OccasionFields {
  const percent = (values.percent ?? "").trim();
  return {
    name: (values.name ?? "").trim(),
    startsOn: (values.startsOn ?? "").trim(),
    endsOn: (values.endsOn ?? "").trim(),
    percent: /^\d+$/.test(percent) ? Number(percent) : Number.NaN,
    couponCode: normalizeCouponCode(values.couponCode ?? ""),
    plans: (values.plans ?? "") as OccasionPlans,
    active: values.active === "on",
  };
}

/** occasionErrors, and no two occasions of a kind on the same days. */
export function occasionErrorsAmong(items: readonly OccasionRecord[], o: OccasionRecord): Record<string, string> {
  const errors = occasionErrors(o);
  if (errors.startsOn || errors.endsOn) return errors;
  const overlap = items.find((x) => x.id !== o.id && x.template === o.template && x.startsOn <= o.endsOn && o.startsOn <= x.endsOn);
  if (overlap) errors.startsOn = `These days overlap ${overlap.name} (${occasionDaysText(overlap)}). Two occasions of a kind can't be on the same days.`;
  return errors;
}

/**
 * Creates or updates the occasion's coupon: its own coupon when it has one;
 * else the coupon with its code, taken over unless another occasion has it;
 * else a new coupon. Returns the coupon's id, or the form's error.
 */
async function syncCoupon(
  store: DataStore,
  items: readonly OccasionRecord[],
  o: OccasionRecord,
  by: OccasionActor,
  now: Date,
): Promise<{ ok: true; couponId: string } | { ok: false; errors: Record<string, string> }> {
  const settings = occasionCoupon(o);
  const ownerOf = (couponId: string) => items.find((x) => x.id !== o.id && x.couponId === couponId);
  const taken = async (): Promise<Record<string, string>> => {
    const other = await store.getCouponByCode(o.couponCode);
    const owner = other ? ownerOf(other.id) : undefined;
    return {
      couponCode: owner
        ? `${o.couponCode} is the coupon of ${owner.name}. Choose another code.`
        : `Another coupon has the code ${o.couponCode} (Admin › Coupons). Choose another code.`,
    };
  };

  const own = o.couponId ? await store.getCoupon(o.couponId) : null;
  if (own) {
    if (!(await store.updateCoupon(own.id, settings, now))) return { ok: false, errors: await taken() };
    return { ok: true, couponId: own.id };
  }
  const byCode = await store.getCouponByCode(o.couponCode);
  if (byCode) {
    if (ownerOf(byCode.id)) return { ok: false, errors: await taken() };
    if (!(await store.updateCoupon(byCode.id, settings, now))) return { ok: false, errors: await taken() };
    return { ok: true, couponId: byCode.id };
  }
  const id = newId();
  if (!(await store.createCoupon({ id, ...settings, createdAt: now, updatedAt: now, createdBy: by.email }))) return { ok: false, errors: await taken() };
  return { ok: true, couponId: id };
}

async function saveOccasions(store: DataStore, items: OccasionRecord[], by: OccasionActor, now: Date): Promise<void> {
  await store.setPlatformSetting("occasions", { items }, by.email, now);
  clearPlatformSettingsCache();
}

function summaryOf(o: OccasionRecord): string {
  return `${o.name}: ${o.percent}% off with ${o.couponCode}, ${occasionDaysText(o)}${o.active ? "" : " (off)"}`;
}

/** A new occasion of a kind, with its coupon. */
export async function createOccasion(store: DataStore, input: { template: unknown; fields: OccasionFields }, by: OccasionActor, now: Date): Promise<OccasionResult> {
  if (!isOccasionTemplate(input.template)) return { ok: false, errors: { template: "Choose the kind of occasion." } };
  const items = await occasionsOf(store, { fresh: true });
  const draft: OccasionRecord = { id: newId(), template: input.template, ...input.fields, couponId: null, updatedAt: now.toISOString(), updatedBy: by.email };
  const errors = occasionErrorsAmong(items, draft);
  if (Object.keys(errors).length) return { ok: false, errors };
  const coupon = await syncCoupon(store, items, draft, by, now);
  if (!coupon.ok) return coupon;
  const occasion = { ...draft, couponId: coupon.couponId };
  await saveOccasions(store, [...items, occasion], by, now);
  await recordAudit({ actor: by, action: "occasion.create", target: { type: "occasion", id: occasion.id }, summary: `Created the occasion ${summaryOf(occasion)}`, after: occasion }, { store, now });
  return { ok: true, occasion };
}

/** Saves an occasion's form (extending it is a later last day; turning it off turns its coupon off). */
export async function updateOccasion(store: DataStore, id: string, fields: OccasionFields, by: OccasionActor, now: Date): Promise<OccasionResult> {
  const items = await occasionsOf(store, { fresh: true });
  const saved = items.find((o) => o.id === id);
  if (!saved) return { ok: false, errors: {}, message: "This occasion no longer exists." };
  const draft: OccasionRecord = { ...saved, ...fields, updatedAt: now.toISOString(), updatedBy: by.email };
  const errors = occasionErrorsAmong(items, draft);
  if (Object.keys(errors).length) return { ok: false, errors };
  const coupon = await syncCoupon(store, items, draft, by, now);
  if (!coupon.ok) return coupon;
  const occasion = { ...draft, couponId: coupon.couponId };
  await saveOccasions(store, items.map((o) => (o.id === id ? occasion : o)), by, now);
  await recordAudit({ actor: by, action: "occasion.update", target: { type: "occasion", id }, summary: `Saved the occasion ${summaryOf(occasion)}`, before: saved, after: occasion }, { store, now });
  return { ok: true, occasion };
}

/** "Black Friday 2026" becomes "Black Friday 2027"; a name without the year gets it. */
function nameNextYear(name: string, year: number): string {
  return name.includes(String(year)) ? name.replace(String(year), String(year + 1)) : `${name} ${year + 1}`;
}

/**
 * "Run it again next year": a new occasion on the same days a year on,
 * copying this one, which stays as the record of its year. Its coupon
 * moves to the new one (same code, next year's days), so it is refused
 * while this one is still on or yet to come: the code keeps working to
 * its last day.
 */
export async function runOccasionNextYear(store: DataStore, id: string, by: OccasionActor, now: Date): Promise<OccasionResult> {
  const items = await occasionsOf(store, { fresh: true });
  const saved = items.find((o) => o.id === id);
  if (!saved) return { ok: false, errors: {}, message: "This occasion no longer exists." };
  const state = occasionState(saved, now);
  if (state === "live" || state === "upcoming") {
    return {
      ok: false,
      errors: {},
      message: `${saved.name} is ${state === "live" ? "on now" : "still to come"}. Run it again once it has ended (or after turning it off): next year's gets a coupon ${saved.couponCode} of its own, and this one's is kept, off, as ${saved.couponCode.slice(0, 34)}-${saved.startsOn.slice(0, 4)}.`,
    };
  }
  const year = Number(saved.startsOn.slice(0, 4));
  const draft: OccasionRecord = {
    ...saved,
    ...occasionNextYear(saved),
    id: newId(),
    name: nameNextYear(saved.name, year),
    updatedAt: now.toISOString(),
    updatedBy: by.email,
  };
  // Next year's gets a coupon of its own with the same code, so an account that used it this year may use it again;
  // this year's coupon keeps its uses under the code with the year (BLACKFRIDAY50-2026), turned off.
  const archived = `${saved.couponCode.slice(0, 34)}-${year}`;
  const others = items.map((o) => (o.id === id ? { ...o, couponCode: archived } : o));
  const fresh: OccasionRecord = { ...draft, couponId: null };
  const errors = occasionErrorsAmong(others, fresh);
  if (Object.keys(errors).length) return { ok: false, errors, message: Object.values(errors)[0] };
  const old = saved.couponId ? await store.getCoupon(saved.couponId) : null;
  if (old && old.code !== archived && !(await store.updateCoupon(old.id, { code: archived, active: false }, now))) {
    const message = `Another coupon has the code ${archived} (Admin › Coupons), which this year's coupon is kept under. Rename that one first.`;
    return { ok: false, errors: { couponCode: message }, message };
  }
  const coupon = await syncCoupon(store, others, fresh, by, now);
  if (!coupon.ok) {
    if (old && old.code !== archived) await store.updateCoupon(old.id, { code: old.code, active: old.active }, now);
    return { ...coupon, message: Object.values(coupon.errors)[0] };
  }
  const occasion = { ...fresh, couponId: coupon.couponId };
  await saveOccasions(store, [...others, occasion], by, now);
  await recordAudit(
    { actor: by, action: "occasion.next_year", target: { type: "occasion", id: occasion.id }, summary: `Ran ${saved.name} again as ${summaryOf(occasion)}`, after: occasion },
    { store, now },
  );
  return { ok: true, occasion };
}

/** Deletes an occasion; its coupon is turned off, not deleted (its uses stay). */
export async function deleteOccasion(store: DataStore, id: string, by: OccasionActor, now: Date): Promise<{ ok: boolean }> {
  const items = await occasionsOf(store, { fresh: true });
  const saved = items.find((o) => o.id === id);
  if (!saved) return { ok: false };
  if (saved.couponId && (await store.getCoupon(saved.couponId))) await store.updateCoupon(saved.couponId, { active: false }, now);
  await saveOccasions(store, items.filter((o) => o.id !== id), by, now);
  await recordAudit({ actor: by, action: "occasion.delete", target: { type: "occasion", id }, summary: `Deleted the occasion ${saved.name}; its coupon ${saved.couponCode} is off`, before: saved }, { store, now });
  return { ok: true };
}

/** The year a new occasion of the kind is for by default: this year's, unless its days are over (in Istanbul). */
export function defaultOccasionYear(template: OccasionTemplate, now: Date): number {
  const t = OCCASION_TEMPLATES[template];
  const today = istanbulDay(now);
  const year = Number(today.slice(0, 4));
  return today > `${year}-${String(t.month).padStart(2, "0")}-${String(t.lastDay).padStart(2, "0")}` ? year + 1 : year;
}
