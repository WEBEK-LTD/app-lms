import { PRODUCT_BADGES, PRODUCT_INFO_KINDS, type CatalogProduct, type ProductBadge, type ProductDetails, type ProductInfoKind } from "../data/types";

/**
 * 209 What a product's page tells besides its description, for every store
 * app whose products are kept in Yallapp: its facts (name and value lines:
 * the brand, the skin type, the volume, the material), its parts in its own
 * words (ingredients, how to use it, its safety, its materials, its care,
 * what is in the box, each under the app's own title), the promises shown
 * as badges (genuine, safety tested, organic, handmade, not tested on
 * animals, gift wrapping), the batch's expiry, the ages it is for and a
 * swatch colour for each of its choices that has one (a lipstick's
 * shades). Kept with the product as JSON (`details`); read here, bounded,
 * whatever was saved. An app before 209 shows none of it, as before.
 */

export const DETAILS_LIMITS = { facts: 12, name: 40, value: 120, info: 2000, swatches: 40, value_key: 60, months: 216 } as const;

/** The form's messages, in the dashboard's words (translated as known texts). */
export const DETAILS_FORM_ERRORS = {
  facts: "Write each fact on its own line as Name: value.",
  swatches: "Write each swatch on its own line as Value: #RRGGBB.",
  expiry: "Write the expiry as a year and a month (2027-06).",
  age: "Write the ages in months, 0 to 216, the first not over the second.",
} as const;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const EXPIRY = /^(20\d\d)-(0[1-9]|1[0-2])$/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function line(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(CONTROL, "").replace(/\s+/g, " ").trim();
  return t && t.length <= max ? t : null;
}

function block(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(CONTROL, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t ? t.slice(0, max) : null;
}

const months = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= DETAILS_LIMITS.months ? v : null);

/** A saved product's details as its page may show them; null when there are none. */
export function detailsOf(raw: unknown): ProductDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const out: ProductDetails = {};
  const facts = (Array.isArray(d.facts) ? d.facts : [])
    .map((f) => (f && typeof f === "object" ? { name: line((f as Record<string, unknown>).name, DETAILS_LIMITS.name), value: line((f as Record<string, unknown>).value, DETAILS_LIMITS.value) } : null))
    .filter((f): f is { name: string; value: string } => !!f && !!f.name && !!f.value)
    .slice(0, DETAILS_LIMITS.facts);
  if (facts.length) out.facts = facts;
  const seen = new Set<ProductInfoKind>();
  const info = (Array.isArray(d.info) ? d.info : []).flatMap((x) => {
    const r = x && typeof x === "object" ? (x as Record<string, unknown>) : null;
    const kind = r && (PRODUCT_INFO_KINDS as readonly unknown[]).includes(r.kind) ? (r.kind as ProductInfoKind) : null;
    const text = r ? block(r.text, DETAILS_LIMITS.info) : null;
    if (!kind || !text || seen.has(kind)) return [];
    seen.add(kind);
    return [{ kind, text }];
  });
  if (info.length) out.info = info;
  const badges = [...new Set((Array.isArray(d.badges) ? d.badges : []).filter((b): b is ProductBadge => (PRODUCT_BADGES as readonly unknown[]).includes(b)))];
  if (badges.length) out.badges = PRODUCT_BADGES.filter((b) => badges.includes(b));
  if (typeof d.expiry === "string" && EXPIRY.test(d.expiry)) out.expiry = d.expiry;
  const age = d.ageMonths && typeof d.ageMonths === "object" ? (d.ageMonths as Record<string, unknown>) : null;
  const min = age ? months(age.min) : null;
  const max = age && age.max !== null ? months(age.max) : null;
  if (age && min !== null && (age.max === null || (max !== null && max >= min))) out.ageMonths = { min, max: age.max === null ? null : max };
  if (d.swatches && typeof d.swatches === "object" && !Array.isArray(d.swatches)) {
    const sw = Object.entries(d.swatches as Record<string, unknown>)
      .filter(([k, v]) => line(k, DETAILS_LIMITS.value_key) === k && typeof v === "string" && HEX.test(v))
      .slice(0, DETAILS_LIMITS.swatches)
      .map(([k, v]) => [k, (v as string).toUpperCase()] as const);
    if (sw.length) out.swatches = Object.fromEntries(sw);
  }
  return Object.keys(out).length ? out : null;
}

/** A product's details (none for a product without any). */
export function productDetails(p: Pick<CatalogProduct, "details">): ProductDetails | null {
  return detailsOf(p.details);
}

/** Ages in months as the app's badge reads them ("0–12 months", "3+ years"), in English; the app words its own. */
export function ageLabel(age: NonNullable<ProductDetails["ageMonths"]>): string {
  const part = (m: number) => (m < 24 ? `${m}` : `${Math.floor(m / 12)}`);
  const unit = (m: number) => (m < 24 ? "months" : "years");
  if (age.max === null) return `${part(age.min)}+ ${unit(age.min)}`;
  if (age.min < 24 && age.max >= 24) return `${part(age.min)} months–${part(age.max)} years`;
  return `${part(age.min)}–${part(age.max)} ${unit(age.max)}`;
}

/**
 * The product's details in the app's contract (`ProductDetail`): the facts
 * as attributes not chosen (as WooCommerce's), `info`, `badges`, `expiry`
 * and `age_months`; the swatches go on the choices' options
 * (`swatchFor`). Missing fields: none.
 */
export function detailsJson(details: ProductDetails | null) {
  if (!details) return {};
  return {
    ...(details.info?.length ? { info: details.info.map((i) => ({ kind: i.kind, text: i.text })) } : {}),
    ...(details.badges?.length ? { badges: [...details.badges] } : {}),
    ...(details.expiry ? { expiry: details.expiry } : {}),
    ...(details.ageMonths ? { age_months: { min: details.ageMonths.min, max: details.ageMonths.max } } : {}),
  };
}

/** The facts as attributes the customer doesn't choose (`variation: false`), after the choices. */
export function factAttributesJson(details: ProductDetails | null) {
  return (details?.facts ?? []).map((f, i) => ({ slug: `f${i + 1}`, name: f.name, variation: false, options: [{ value: f.value, label: f.value }] }));
}

/** An option's swatch colour, when it has one. */
export function swatchFor(details: ProductDetails | null, value: string): string | null {
  return details?.swatches?.[value] ?? null;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

function pairs(text: string): [string, string][] | null {
  const out: [string, string][] = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    const at = l.indexOf(":");
    if (at <= 0) return null;
    out.push([l.slice(0, at).trim(), l.slice(at + 1).trim()]);
  }
  return out;
}

/**
 * The dashboard's form: `detailFacts` (Name: value lines), `detailInfo_<kind>`
 * (each part's words), `detailBadge_<badge>` (on), `detailExpiry`
 * (YYYY-MM), `detailAgeMin` / `detailAgeMax` (months; the second empty: and
 * up) and `detailSwatches` (Value: #RRGGBB lines).
 */
export function parseDetailsForm(v: Record<string, string | undefined>): Parsed<ProductDetails | null> {
  const errors: Record<string, string> = {};
  const raw: Record<string, unknown> = {};
  const facts = pairs(v.detailFacts ?? "");
  if (!facts || facts.length > DETAILS_LIMITS.facts || facts.some(([n, x]) => !n || !x || n.length > DETAILS_LIMITS.name || x.length > DETAILS_LIMITS.value)) errors.detailFacts = DETAILS_FORM_ERRORS.facts;
  else raw.facts = facts.map(([name, value]) => ({ name, value }));
  raw.info = PRODUCT_INFO_KINDS.map((kind) => ({ kind, text: v[`detailInfo_${kind}`] ?? "" }));
  raw.badges = PRODUCT_BADGES.filter((b) => v[`detailBadge_${b}`] === "on");
  const expiry = (v.detailExpiry ?? "").trim();
  if (expiry && !EXPIRY.test(expiry)) errors.detailExpiry = DETAILS_FORM_ERRORS.expiry;
  else if (expiry) raw.expiry = expiry;
  const min = (v.detailAgeMin ?? "").trim();
  const max = (v.detailAgeMax ?? "").trim();
  if (min || max) {
    const a = Number(min);
    const b = max ? Number(max) : null;
    if (!min || months(a) === null || (b !== null && (months(b) === null || b < a))) errors.detailAge = DETAILS_FORM_ERRORS.age;
    else raw.ageMonths = { min: a, max: b };
  }
  const swatches = pairs(v.detailSwatches ?? "");
  if (!swatches || swatches.length > DETAILS_LIMITS.swatches || swatches.some(([k, c]) => !k || k.length > DETAILS_LIMITS.value_key || !HEX.test(c))) errors.detailSwatches = DETAILS_FORM_ERRORS.swatches;
  else if (swatches.length) raw.swatches = Object.fromEntries(swatches);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: detailsOf(raw) };
}

/** The form's text for saved details. */
export function detailsFormText(details: ProductDetails | null) {
  return {
    facts: (details?.facts ?? []).map((f) => `${f.name}: ${f.value}`).join("\n"),
    info: Object.fromEntries((details?.info ?? []).map((i) => [i.kind, i.text])) as Partial<Record<ProductInfoKind, string>>,
    badges: new Set(details?.badges ?? []),
    expiry: details?.expiry ?? "",
    ageMin: details?.ageMonths ? String(details.ageMonths.min) : "",
    ageMax: details?.ageMonths?.max != null ? String(details.ageMonths.max) : "",
    swatches: Object.entries(details?.swatches ?? {})
      .map(([k, c]) => `${k}: ${c}`)
      .join("\n"),
  };
}
