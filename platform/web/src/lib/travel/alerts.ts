import { centsToDecimal, formatCents } from "../catalog/money";
import type { TravelAlert, TravelBooking, TravelFlight } from "../data/types";
import { allHolds, cheapestOn, onSale, type TravelDeps } from "./catalog";
import type { DeliveryNotifyDeps } from "../delivery/notify";
import { tellAlert } from "./notify";
import { addDays, fromNightly, stayPrice, today } from "./pricing";

/**
 * 126 Price alerts: a route (`flight`), a stay and flight to a city
 * (`trip`), or anywhere under a price. Each is priced now from the
 * company's flights and hotels; the person is told on their phone when the
 * price goes below what they were last told.
 */

const code = (value: string) => value.trim().toUpperCase();
const DEFAULT_NIGHTS = 7;

/** The days an alert looks at: its month, else the next 90 days. */
function alertDays(alert: Pick<TravelAlert, "month">, now: Date): string[] {
  const first = today(now);
  const days: string[] = [];
  if (alert.month) {
    for (let d = `${alert.month}-01`; d.slice(0, 7) === alert.month; d = addDays(d, 1)) if (d >= first) days.push(d);
  } else for (let i = 0; i <= 90; i++) days.push(addDays(first, i));
  return days;
}

export interface AlertPrice {
  cents: number | null;
  /** Seats left at it. */
  left: number | null;
  /** For `anywhere`: destinations under the price. */
  matches: number | null;
  photoAssetId: string | null;
}

async function cheapestRoute(deps: TravelDeps, flights: readonly TravelFlight[], holds: readonly TravelBooking[], alert: TravelAlert, to: string) {
  const nights = alert.roundTrip ? (alert.nights ?? DEFAULT_NIGHTS) : null;
  const days = new Set(flights.filter((f) => code(f.from.code) === code(alert.from) && code(f.to.code) === to && onSale(f, deps.now)).map((f) => f.departs.slice(0, 10)));
  let best: { cents: number; left: number } | null = null;
  for (const day of alertDays(alert, deps.now)) {
    if (!days.has(day)) continue;
    const c = await cheapestOn(deps, flights, code(alert.from), to, day, nights, alert.travellers, holds);
    if (c && (!best || c.cents < best.cents)) best = c;
  }
  return best;
}

/** The stay part of a trip alert: the cheapest night in the city, for its nights, for two. */
async function stayFrom(deps: TravelDeps, city: string, nights: number): Promise<{ cents: number; photo: string | null } | null> {
  const hotels = (await deps.hotels.hotels()).filter((h) => h.active && h.city.trim().toLowerCase() === city.trim().toLowerCase());
  if (!hotels.length) return null;
  const nightly = fromNightly((await deps.hotels.rooms()).filter((r) => hotels.some((h) => h.id === r.hotelId)));
  if (nightly === null) return null;
  const tax = Math.min(...hotels.map((h) => h.taxBp));
  const p = stayPrice(Array.from({ length: nights }, () => ({ cents: nightly })), 1, { taxBp: tax }, { member: false, bundle: true }, deps.settings);
  return { cents: p.totalCents, photo: hotels.find((h) => h.photos.length)?.photos[0] ?? null };
}

export async function priceAlert(deps: TravelDeps, alert: TravelAlert, flights?: readonly TravelFlight[], holds?: readonly TravelBooking[]): Promise<AlertPrice> {
  const all = flights ?? (await deps.flights.flights());
  const held = holds ?? (await allHolds(deps, all));
  if (alert.kind === "anywhere") {
    const tos = [...new Set(all.filter((f) => code(f.from.code) === code(alert.from) && onSale(f, deps.now)).map((f) => code(f.to.code)))];
    let matches = 0;
    let best: { cents: number; left: number } | null = null;
    let photo: string | null = null;
    for (const to of tos) {
      const c = await cheapestRoute(deps, all, held, alert, to);
      if (!c) continue;
      const total = c.cents * alert.travellers;
      if (alert.maxCents === null || total <= alert.maxCents) {
        matches++;
        if (!best || c.cents < best.cents) {
          best = c;
          const city = all.find((f) => code(f.to.code) === to)?.to.city;
          photo = city ? ((await stayFrom(deps, city, 1))?.photo ?? photo) : photo;
        }
      }
    }
    return { cents: best ? best.cents * alert.travellers : null, left: best?.left ?? null, matches, photoAssetId: photo };
  }
  const to = code(alert.to ?? "");
  const route = await cheapestRoute(deps, all, held, alert, to);
  if (!route) return { cents: null, left: null, matches: null, photoAssetId: null };
  let cents = route.cents * alert.travellers;
  let photo: string | null = null;
  const city = all.find((f) => code(f.to.code) === to)?.to.city ?? null;
  if (city) {
    const stay = await stayFrom(deps, city, alert.nights ?? DEFAULT_NIGHTS);
    photo = stay?.photo ?? null;
    if (alert.kind === "trip" && stay) cents += stay.cents;
  }
  return { cents, left: route.left, matches: null, photoAssetId: photo };
}

function airportOf(all: readonly TravelFlight[], c: string) {
  const f = all.find((x) => code(x.from.code) === code(c)) ?? all.find((x) => code(x.to.code) === code(c));
  const p = f ? (code(f.from.code) === code(c) ? f.from : f.to) : null;
  return { code: code(c), city: p?.city ?? code(c), airport: p?.airport ?? null };
}

export function alertJson(deps: TravelDeps, alert: TravelAlert, price: AlertPrice, all: readonly TravelFlight[]) {
  const fm = (cents: number) => formatCents(cents, deps.settings.currency);
  const change = price.cents !== null && alert.firstCents !== null ? price.cents - alert.firstCents : null;
  return {
    id: alert.id,
    kind: alert.kind,
    from: airportOf(all, alert.from),
    to: alert.to ? airportOf(all, alert.to) : null,
    month: alert.month,
    return: alert.roundTrip,
    nights: alert.nights,
    travellers: alert.travellers,
    price: price.cents === null ? null : centsToDecimal(price.cents),
    price_formatted: price.cents === null ? null : fm(price.cents),
    change_formatted: change === null || change === 0 ? null : `${change < 0 ? "−" : "+"}${fm(Math.abs(change))}`,
    direction: change === null ? null : change < 0 ? ("down" as const) : change > 0 ? ("up" as const) : ("same" as const),
    advice: price.left !== null && price.left <= 5 ? ("book_now" as const) : null,
    max_price_formatted: alert.maxCents === null ? null : fm(alert.maxCents),
    matches: alert.kind === "anywhere" ? price.matches : null,
    photo_url: price.photoAssetId ? deps.assetUrl(price.photoAssetId) : null,
  };
}

/** Prices every alert of the app again and tells each person whose price went below the one they were last told. */
export async function checkAlerts(deps: TravelDeps, notify: DeliveryNotifyDeps): Promise<number> {
  const alerts = await deps.store.listTravelAlerts(deps.app.id);
  if (!alerts.length) return 0;
  const all = await deps.flights.flights();
  const holds = await allHolds(deps, all);
  let told = 0;
  for (const alert of alerts) {
    const price = await priceAlert(deps, alert, all, holds);
    if (price.cents === null) continue;
    const before = alert.lastCents;
    if (before !== null && price.cents < before) {
      const route = alert.kind === "anywhere" ? `${code(alert.from)} → *` : `${code(alert.from)} → ${code(alert.to ?? "")}`;
      told += await tellAlert(notify, alert, route, before, price.cents, deps.settings.currency);
    }
    if (before === null || price.cents !== before) await deps.store.updateTravelAlert(deps.app.id, alert.id, { lastCents: price.cents, updatedAt: deps.now });
  }
  return told;
}
