import { addDays, isTimeZone, localToUtc, minutesOf, timeOf, utcToLocal } from "../bookings/time";
import type { App, CatalogCurrency, CatalogFulfilment, FulfilmentSettings, FulfilmentStatus, TimeRange } from "../data/types";
import { centsToDecimal, formatCents, parsePrice } from "./money";

/**
 * 26 Restaurants and cafés: pickup and delivery, opening hours, the times
 * an order can be for, and where an order is in the kitchen. Everything here
 * is computed by the server in the kitchen's time zone; the app only shows it.
 */

const OPEN_ALL_DAY: TimeRange[] = [{ start: "09:00", end: "22:00" }];

export const DEFAULT_FULFILMENT: FulfilmentSettings = {
  pickup: true,
  delivery: true,
  pickupAddress: null,
  minOrderCents: null,
  deliveryFeeCents: 0,
  deliveryAreas: [],
  deliveryNote: null,
  prepMinutes: 20,
  timezone: "Europe/Istanbul",
  hours: [OPEN_ALL_DAY, OPEN_ALL_DAY, OPEN_ALL_DAY, OPEN_ALL_DAY, OPEN_ALL_DAY, OPEN_ALL_DAY, OPEN_ALL_DAY],
  asap: true,
  scheduled: true,
  slotStepMinutes: 15,
  maxDaysAhead: 1,
};

/** The longest a scheduled order can be ahead, in days. */
export const MAX_DAYS_AHEAD = 7;
const SLOTS_MAX = 500;

/** A restaurant's pickup and delivery settings (the defaults until saved); null for every other app. */
export function fulfilmentOf(app: Pick<App, "vertical" | "catalogSettings">): FulfilmentSettings | null {
  if (app.vertical !== "restaurant") return null;
  return { ...DEFAULT_FULFILMENT, ...(app.catalogSettings?.fulfilment ?? {}) };
}

/** `StoreConfig.fulfilment`. */
export function fulfilmentConfigJson(f: FulfilmentSettings, currency: CatalogCurrency) {
  return {
    pickup: f.pickup,
    delivery: f.delivery,
    pickup_address: f.pickupAddress,
    min_order: f.minOrderCents !== null ? centsToDecimal(f.minOrderCents) : null,
    min_order_formatted: f.minOrderCents !== null ? formatCents(f.minOrderCents, currency) : null,
    delivery_fee: f.deliveryFeeCents > 0 ? centsToDecimal(f.deliveryFeeCents) : null,
    delivery_fee_formatted: f.deliveryFeeCents > 0 ? formatCents(f.deliveryFeeCents, currency) : null,
    delivery_areas: f.deliveryAreas,
    delivery_note: f.deliveryNote,
    prep_minutes: f.prepMinutes,
    timezone: f.timezone,
    hours: f.hours.map((day) => day.map((r) => ({ start: r.start, end: r.end }))),
    asap: f.asap,
    scheduled_slots: { enabled: f.scheduled, step_minutes: f.slotStepMinutes, max_days_ahead: f.maxDaysAhead },
  };
}

/** Each opening of the days from `fromDate`, as instants, soonest first. */
function openings(f: FulfilmentSettings, fromDate: string, days: number): { date: string; start: Date; end: Date; startMinutes: number; endMinutes: number }[] {
  const out = [];
  for (let d = 0; d < days; d += 1) {
    const date = addDays(fromDate, d);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const range of f.hours[weekday] ?? []) {
      const startMinutes = minutesOf(range.start);
      const endMinutes = minutesOf(range.end);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue;
      out.push({ date, start: localToUtc(date, range.start, f.timezone), end: localToUtc(date, range.end, f.timezone), startMinutes, endMinutes });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface OpenState {
  openNow: boolean;
  /** When closed: the next opening within a week, else null. */
  opensAt: Date | null;
  /** When open: the closing time. */
  closesAt: Date | null;
}

/** Whether the kitchen is open at `now`, and when that changes. */
export function openState(f: FulfilmentSettings, now: Date): OpenState {
  const today = utcToLocal(now, f.timezone).date;
  for (const o of openings(f, today, 8)) {
    if (now >= o.start && now < o.end) return { openNow: true, opensAt: null, closesAt: o.end };
    if (o.start > now) return { openNow: false, opensAt: o.start, closesAt: null };
  }
  return { openNow: false, opensAt: null, closesAt: null };
}

/**
 * The times a scheduled order can be for: every `slotStepMinutes` (from
 * midnight) inside the opening hours, no sooner than the preparation time
 * after opening or after now, for today and `maxDaysAhead` more days.
 */
export function scheduledSlots(f: FulfilmentSettings, now: Date): Date[] {
  if (!f.scheduled) return [];
  const step = Math.max(5, f.slotStepMinutes);
  const earliest = now.getTime() + f.prepMinutes * 60_000;
  const today = utcToLocal(now, f.timezone).date;
  const out: Date[] = [];
  for (const o of openings(f, today, Math.min(f.maxDaysAhead, MAX_DAYS_AHEAD) + 1)) {
    const first = Math.ceil((o.startMinutes + f.prepMinutes) / step) * step;
    for (let m = first; m <= o.endMinutes && out.length < SLOTS_MAX; m += step) {
      const at = localToUtc(o.date, timeOf(m), f.timezone);
      if (at.getTime() >= earliest) out.push(at);
    }
  }
  return out;
}

/** `GET /store/order-times`. */
export function orderTimesJson(f: FulfilmentSettings, now: Date) {
  const state = openState(f, now);
  return {
    open_now: state.openNow,
    opens_at: state.opensAt?.toISOString() ?? null,
    closes_at: state.closesAt?.toISOString() ?? null,
    asap: f.asap && state.openNow,
    ready_in_minutes: f.prepMinutes,
    slots: scheduledSlots(f, now).map((d) => d.toISOString()),
  };
}

/** "at 17:00 today", "on Monday at 09:00": when the kitchen opens, in its time zone. */
export function opensText(opensAt: Date, f: Pick<FulfilmentSettings, "timezone">, now: Date): string {
  const at = utcToLocal(opensAt, f.timezone);
  const today = utcToLocal(now, f.timezone).date;
  if (at.date === today) return `at ${at.time} today`;
  if (at.date === addDays(today, 1)) return `at ${at.time} tomorrow`;
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: f.timezone }).format(opensAt);
  return `on ${weekday} at ${at.time}`;
}

export type FulfilmentCheck =
  | { ok: true; fulfilment: CatalogFulfilment; feeCents: number }
  | { ok: false; status: 400 | 409; code: string; message: string };

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
};

/**
 * Checks how a checkout wants the order (`fulfilment`, `delivery_address`,
 * `scheduled_for`) against the kitchen's settings and hours at `now`, and
 * the delivery minimum against the subtotal the server priced. Returns the
 * order's fulfilment and the delivery fee, or the error to answer.
 */
export function checkFulfilment(f: FulfilmentSettings, body: unknown, subtotalCents: number, currency: CatalogCurrency, now: Date): FulfilmentCheck {
  const input = (body ?? {}) as Record<string, unknown>;
  const bad = (message: string, code = "invalid_request"): FulfilmentCheck => ({ ok: false, status: 400, code, message });
  const type = input.fulfilment;
  if (type !== "pickup" && type !== "delivery") return bad("Choose pickup or delivery.");
  if (type === "pickup" && !f.pickup) return bad("We don't offer pickup. Please choose delivery.");
  if (type === "delivery" && !f.delivery) return bad("We don't deliver. Please choose pickup.");

  let address: CatalogFulfilment["address"] = null;
  if (type === "delivery") {
    const raw = (input.delivery_address ?? {}) as Record<string, unknown>;
    const street = text(raw.address, 300);
    if (!street || street.length < 5) return bad("Enter your delivery address.");
    let district = text(raw.district, 80);
    if (f.deliveryAreas.length > 0) {
      const match = f.deliveryAreas.find((a) => a.toLocaleLowerCase("tr") === (district ?? "").toLocaleLowerCase("tr"));
      if (!match) return bad(`We don't deliver there. We deliver to ${f.deliveryAreas.join(", ")}.`, "outside_delivery_area");
      district = match;
    }
    address = { address: street, district, notes: text(raw.notes, 300) };
    if (f.minOrderCents !== null && subtotalCents < f.minOrderCents) {
      return { ok: false, status: 409, code: "below_minimum", message: `The minimum order for delivery is ${formatCents(f.minOrderCents, currency)}.` };
    }
  }

  let scheduledFor: string | null = null;
  if (input.scheduled_for === undefined || input.scheduled_for === null) {
    if (!f.asap) return bad("Choose a time for your order.");
    const state = openState(f, now);
    if (!state.openNow) {
      const when = state.opensAt ? ` We open ${opensText(state.opensAt, f, now)}.` : "";
      const later = f.scheduled && scheduledSlots(f, now).length > 0 ? " You can order for later." : "";
      return { ok: false, status: 409, code: "kitchen_closed", message: `We're closed now.${when}${later}` };
    }
  } else {
    const at = typeof input.scheduled_for === "string" ? new Date(input.scheduled_for) : null;
    if (!f.scheduled || !at || Number.isNaN(at.getTime()) || !scheduledSlots(f, now).some((s) => s.getTime() === at.getTime())) {
      return bad("This time isn't available anymore. Please choose another.");
    }
    scheduledFor = at.toISOString();
  }
  return { ok: true, fulfilment: { type, scheduledFor, address }, feeCents: type === "delivery" ? f.deliveryFeeCents : 0 };
}

// Where an order is in the kitchen.

export const FULFILMENT_FLOW: FulfilmentStatus[] = ["received", "preparing", "ready", "out_for_delivery", "completed"];

export const FULFILMENT_LABELS: Record<FulfilmentStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Whether an order can move from `current` to `next`: only forward (deliveries only go out), or cancelled while not finished. */
export function canMoveTo(current: FulfilmentStatus, next: FulfilmentStatus, type: CatalogFulfilment["type"]): boolean {
  if (current === "completed" || current === "cancelled") return false;
  if (next === "cancelled") return true;
  if (next === "out_for_delivery" && type !== "delivery") return false;
  return FULFILMENT_FLOW.indexOf(next) > FULFILMENT_FLOW.indexOf(current);
}

/** The kitchen's next step for an order (its button), or null when it's finished. */
export function nextStep(current: FulfilmentStatus, type: CatalogFulfilment["type"]): FulfilmentStatus | null {
  switch (current) {
    case "received":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return type === "delivery" ? "out_for_delivery" : "completed";
    case "out_for_delivery":
      return "completed";
    default:
      return null;
  }
}

/** The customer's notification when their order moves on. */
export function fulfilmentMessage(status: FulfilmentStatus, type: CatalogFulfilment["type"], number: string): { title: string; body: string } {
  switch (status) {
    case "received":
      return { title: `Order ${number} received`, body: "We've got your order." };
    case "preparing":
      return { title: `Order ${number} is being prepared`, body: "The kitchen is preparing your order." };
    case "ready":
      return type === "delivery"
        ? { title: `Order ${number} is ready`, body: "Your order is ready and leaves with the courier soon." }
        : { title: `Order ${number} is ready`, body: "Your order is ready for pickup." };
    case "out_for_delivery":
      return { title: `Order ${number} is on its way`, body: "Your order is out for delivery." };
    case "completed":
      return { title: `Order ${number} is complete`, body: "Enjoy your meal, and thank you for your order." };
    case "cancelled":
      return { title: `Order ${number} was cancelled`, body: "Your order was cancelled. Please contact us if you have any questions." };
  }
}

// The dashboard's settings form.

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/**
 * The Menu page's "Pickup and delivery" form: `pickup`, `delivery`, prices,
 * `prepMinutes`, the time zone, one opening range per weekday (`open<d>`,
 * `start<d>`, `end<d>`, 0 is Sunday) and the order times.
 */
export function parseFulfilmentForm(v: Record<string, string>): Parsed<FulfilmentSettings> {
  const errors: Record<string, string> = {};
  const pickup = v.pickup === "on";
  const delivery = v.delivery === "on";
  if (!pickup && !delivery) errors.pickup = "Offer pickup, delivery or both.";
  const fee = (v.deliveryFee ?? "").trim() === "" ? 0 : parsePrice(v.deliveryFee!);
  if (fee === null) errors.deliveryFee = "Enter an amount, like 30, or leave it empty for free delivery.";
  const min = (v.minOrder ?? "").trim() === "" ? null : parsePrice(v.minOrder!);
  if ((v.minOrder ?? "").trim() !== "" && min === null) errors.minOrder = "Enter an amount, like 150, or leave it empty.";
  const prep = Number(v.prepMinutes);
  if (!/^\d{1,3}$/.test(v.prepMinutes ?? "") || prep > 240) errors.prepMinutes = "Enter 0 to 240 minutes.";
  const timezone = (v.timezone ?? "").trim();
  if (!isTimeZone(timezone) || !timezone.includes("/")) errors.timezone = "Choose a time zone, like Europe/Istanbul.";
  const hours: TimeRange[][] = [];
  for (let d = 0; d < 7; d += 1) {
    if (v[`open${d}`] !== "on") {
      hours.push([]);
      continue;
    }
    const start = v[`start${d}`] ?? "";
    const end = v[`end${d}`] ?? "";
    const from = minutesOf(start);
    const to = minutesOf(end);
    if (from === null || to === null || to <= from) errors.hours = "Each open day needs an opening time before its closing time, like 09:00 to 22:00.";
    hours.push([{ start, end }]);
  }
  if (!errors.hours && hours.every((h) => h.length === 0)) errors.hours = "Open at least one day.";
  const asap = v.asap === "on";
  const scheduled = v.scheduled === "on";
  if (!asap && !scheduled) errors.asap = "Take orders as soon as possible, for later, or both.";
  const step = Number(v.slotStep);
  if (![10, 15, 20, 30, 60].includes(step)) errors.slotStep = "Choose how often times start.";
  const days = Number(v.maxDaysAhead);
  if (!/^\d$/.test(v.maxDaysAhead ?? "") || days > MAX_DAYS_AHEAD) errors.maxDaysAhead = `Enter 0 (today only) to ${MAX_DAYS_AHEAD} days.`;
  const areas = [
    ...new Set(
      (v.deliveryAreas ?? "")
        .split(/[\n,]+/)
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
  if (areas.length > 100 || areas.some((a) => a.length > 80)) errors.deliveryAreas = "Write up to 100 districts or postcodes, one per line.";
  const note = (v.deliveryNote ?? "").trim();
  if (note.length > 200) errors.deliveryNote = "Use at most 200 characters.";
  const pickupAddress = (v.pickupAddress ?? "").trim();
  if (pickupAddress.length > 200) errors.pickupAddress = "Use at most 200 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      pickup,
      delivery,
      pickupAddress: pickupAddress || null,
      minOrderCents: min,
      deliveryFeeCents: fee!,
      deliveryAreas: areas,
      deliveryNote: note || null,
      prepMinutes: prep,
      timezone,
      hours,
      asap,
      scheduled,
      slotStepMinutes: step,
      maxDaysAhead: days,
    },
  };
}
