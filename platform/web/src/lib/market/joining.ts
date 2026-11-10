import { randomBytes } from "node:crypto";
import type { DataStore } from "../data/store";
import type { ApplicationField, MarketApplication, MarketApplicationForm, OpeningPeriod, Restaurant, ShipmentPlace, VendorKind } from "../data/types";
import { APPLICATION_FIELD_KINDS } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import type { RateLimitRule } from "../rate-limit";
import { siteUrl } from "../seo";

/**
 * 115.6 Vendors joining a marketplace. The app owner builds the form (the
 * fields, in order, of the kinds below) and shares its link, which is on
 * Yallapp's site only. A vendor fills it in; the owner's team reads it,
 * asks for more, accepts or turns it down with a reason, and the vendor is
 * emailed each time. Accepting makes the vendor from the answers (hidden
 * until it's ready) and invites its first staff member, who signs in to the
 * vendors' panel with the email given.
 */

export const FORM_MAX_FIELDS = 40;
export const VENDOR_KINDS: VendorKind[] = ["restaurant", "grocery", "shop"];

/** Against abuse: per address and per form. */
export const JOINING_LIMITS = {
  ip: { name: "join:ip", limit: 5, windowSeconds: 3600 },
  form: { name: "join:form", limit: 200, windowSeconds: 86_400 },
} satisfies Record<string, RateLimitRule>;

export function newFormToken(): string {
  return randomBytes(18).toString("base64url");
}

/** The form's public link, on Yallapp's site. */
export function joinFormUrl(token: string): string {
  return `${siteUrl()}/join/${encodeURIComponent(token)}`;
}

/** The owner's fields, checked: known kinds, labels, unique keys, a list's options. */
export function checkFormFields(fields: ApplicationField[]): { ok: true; fields: ApplicationField[] } | { ok: false; error: string; index: number | null } {
  if (fields.length > FORM_MAX_FIELDS) return { ok: false, error: `A form can have up to ${FORM_MAX_FIELDS} questions.`, index: null };
  const keys = new Set<string>();
  const out: ApplicationField[] = [];
  for (const [i, f] of fields.entries()) {
    if (!(APPLICATION_FIELD_KINDS as readonly string[]).includes(f.kind)) return { ok: false, error: "Choose what kind of question it is.", index: i };
    const label = f.label.trim().slice(0, 120);
    if (!label) return { ok: false, error: "Every question needs its words.", index: i };
    const key = (f.key.trim() || label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_")).slice(0, 40);
    if (keys.has(key) || ["business_name", "email", "kind"].includes(key)) return { ok: false, error: "Two questions can't be the same.", index: i };
    keys.add(key);
    const options = f.kind === "list" ? [...new Set(f.options.map((o) => o.trim().slice(0, 80)).filter(Boolean))].slice(0, 50) : [];
    if (f.kind === "list" && options.length < 2) return { ok: false, error: "A list needs at least two choices.", index: i };
    out.push({ key, kind: f.kind, label, help: f.help?.trim().slice(0, 300) || null, required: f.required, options });
  }
  return { ok: true, fields: out };
}

export interface ApplicationRequest {
  businessName: string;
  email: string;
  kind: string;
  /** By field key, as the form sent them (files already uploaded: their asset ids). */
  answers: Record<string, unknown>;
}

export type ApplicationCheck =
  | { ok: true; value: Pick<MarketApplication, "businessName" | "email" | "kind" | "answers" | "fileAssetIds"> }
  | { ok: false; field: string; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAYS: OpeningPeriod["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The vendor's answers, checked against the form. */
export function checkApplication(form: MarketApplicationForm, request: ApplicationRequest, defaultCountryCode = "20"): ApplicationCheck {
  const businessName = request.businessName.trim().slice(0, 120);
  if (!businessName) return { ok: false, field: "business_name", error: "Enter your business's name." };
  const email = request.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 191) return { ok: false, field: "email", error: "Enter a valid email address." };
  const kinds = form.kinds.length ? form.kinds : VENDOR_KINDS;
  const kind = (kinds as string[]).includes(request.kind) ? (request.kind as VendorKind) : kinds.length === 1 ? kinds[0]! : null;
  if (!kind) return { ok: false, field: "kind", error: "Choose what kind of business it is." };
  const answers: Record<string, unknown> = {};
  const files: string[] = [];
  for (const f of form.fields) {
    const raw = request.answers[f.key];
    const empty = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
    if (empty) {
      if (f.required) return { ok: false, field: f.key, error: `"${f.label}" is needed.` };
      continue;
    }
    switch (f.kind) {
      case "text":
      case "long_text": {
        const text = String(raw).trim().slice(0, f.kind === "text" ? 200 : 4000);
        if (f.required && !text) return { ok: false, field: f.key, error: `"${f.label}" is needed.` };
        if (text) answers[f.key] = text;
        break;
      }
      case "phone": {
        const phone = parseAnyPhone(String(raw), defaultCountryCode);
        if (!phone) return { ok: false, field: f.key, error: "Enter a valid phone number with its country code." };
        answers[f.key] = phone.e164;
        break;
      }
      case "email": {
        const value = String(raw).trim().toLowerCase();
        if (!EMAIL.test(value)) return { ok: false, field: f.key, error: "Enter a valid email address." };
        answers[f.key] = value;
        break;
      }
      case "number": {
        const n = Number(String(raw).replace(",", "."));
        if (!Number.isFinite(n)) return { ok: false, field: f.key, error: `"${f.label}" should be a number.` };
        answers[f.key] = n;
        break;
      }
      case "list":
        if (!f.options.includes(String(raw))) return { ok: false, field: f.key, error: `Choose one of the choices for "${f.label}".` };
        answers[f.key] = String(raw);
        break;
      case "yes_no":
        answers[f.key] = raw === true || raw === "yes" || raw === "true" || raw === "on";
        break;
      case "file":
      case "logo":
      case "documents": {
        const ids = (Array.isArray(raw) ? raw : [raw]).map(String).filter((id) => /^[\w-]{6,64}$/.test(id));
        const max = f.kind === "documents" ? 10 : 1;
        if (!ids.length || ids.length > max) return { ok: false, field: f.key, error: f.kind === "documents" ? "Add up to 10 files." : "Add one file." };
        answers[f.key] = f.kind === "documents" ? ids : ids[0];
        files.push(...ids);
        break;
      }
      case "place": {
        const p = raw as Partial<ShipmentPlace>;
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (typeof p !== "object" || !String(p.address ?? "").trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          return { ok: false, field: f.key, error: "Set your place on the map." };
        }
        answers[f.key] = { address: String(p.address).trim().slice(0, 200), details: p.details ? String(p.details).trim().slice(0, 200) : null, lat, lng } satisfies ShipmentPlace;
        break;
      }
      case "hours": {
        const periods = Array.isArray(raw) ? (raw as Partial<OpeningPeriod>[]) : [];
        const ok = periods.length > 0 && periods.length <= 21 && periods.every((h) => DAYS.includes(h.day as OpeningPeriod["day"]) && TIME.test(String(h.opens)) && TIME.test(String(h.closes)) && h.opens !== h.closes);
        if (!ok) return { ok: false, field: f.key, error: "Set your opening hours." };
        answers[f.key] = periods.map((h) => ({ day: h.day, opens: h.opens, closes: h.closes }));
        break;
      }
    }
  }
  return { ok: true, value: { businessName, email, kind, answers, fileAssetIds: [...new Set(files)] } };
}

export type SubmitResult = { ok: true; application: MarketApplication } | { ok: false; code: "closed" | "already_applied" | "invalid"; field: string | null; error: string };

/** A vendor sends the form (its link's token). One waiting application per email and form. */
export async function submitApplication(store: DataStore, form: MarketApplicationForm, request: ApplicationRequest, now: Date): Promise<SubmitResult> {
  if (!form.open) return { ok: false, code: "closed", field: null, error: "This form isn't taking applications now." };
  const checked = checkApplication(form, request);
  if (!checked.ok) return { ok: false, code: "invalid", field: checked.field, error: checked.error };
  const waiting = await store.listMarketApplications(form.appId, { formId: form.id, email: checked.value.email, statuses: ["new", "more_info"], limit: 1, offset: 0 });
  if (waiting.total > 0) return { ok: false, code: "already_applied", field: "email", error: "You've applied already. We'll email you about it." };
  const application = await store.createMarketApplication({ appId: form.appId, formId: form.id, status: "new", ...checked.value, message: null, vendorId: null, decidedBy: null, decidedAt: null, createdAt: now, updatedAt: now });
  return { ok: true, application };
}

/** The answers that make the vendor: its logo, place and hours when the form asked for them; (115) where it delivers, as the owner set it on accepting. */
export function vendorFromApplication(
  form: MarketApplicationForm,
  application: MarketApplication,
  appId: string,
  area: Pick<Restaurant, "maxKm" | "deliveryAreas"> = { maxKm: null, deliveryAreas: null },
): Omit<Restaurant, "id" | "busyUntil" | "ratingSum" | "ratingCount" | "createdAt" | "updatedAt"> {
  const answerOf = (kind: ApplicationField["kind"]) => {
    const field = form.fields.find((f) => f.kind === kind);
    return field ? application.answers[field.key] : undefined;
  };
  const place = answerOf("place") as ShipmentPlace | undefined;
  const hours = answerOf("hours") as OpeningPeriod[] | undefined;
  const description = form.fields.find((f) => f.kind === "long_text");
  return {
    appId,
    name: application.businessName,
    description: description ? ((application.answers[description.key] as string | undefined) ?? null) : null,
    logoAssetId: (answerOf("logo") as string | undefined) ?? null,
    coverAssetId: null,
    cuisines: [],
    address: place ?? { address: "", details: null, lat: null, lng: null },
    // Customers never reach vendors: no number is shown.
    phone: null,
    hours: hours ?? [],
    prepMinutes: 20,
    minOrderCents: 0,
    maxKm: area.maxKm,
    deliveryAreas: area.deliveryAreas ?? null,
    commissionBp: 0,
    // Hidden until the owner or the vendor makes it ready.
    active: false,
    position: 0,
    kind: application.kind,
  };
}

export type DecisionResult = { ok: true; application: MarketApplication; vendorId?: number } | { ok: false; error: string };

export interface JoiningMail {
  to: string;
  subject: string;
  text: string;
}

/** The emails a vendor gets about its application. */
export function joiningMail(kind: "more_info" | "rejected" | "accepted", input: { appName: string; businessName: string; email: string; message: string | null; panelUrl: string }): JoiningMail {
  const hello = `Hello ${input.businessName},`;
  switch (kind) {
    case "more_info":
      return { to: input.email, subject: `${input.appName}: we need a little more about ${input.businessName}`, text: `${hello}\n\nThank you for applying to join ${input.appName}. Before we decide, we need a little more:\n\n${input.message ?? ""}\n\nAnswer by replying to this email.\n` };
    case "rejected":
      return { to: input.email, subject: `${input.appName}: your application`, text: `${hello}\n\nThank you for applying to join ${input.appName}. We can't take ${input.businessName} on for now.${input.message ? `\n\n${input.message}` : ""}\n` };
    case "accepted":
      return { to: input.email, subject: `Welcome to ${input.appName}`, text: `${hello}\n\n${input.businessName} can now join ${input.appName}. Sign in to your panel with this email to add your menu or products, your hours and how you deliver:\n\n${input.panelUrl}\n\nYour place shows in the app once it's ready.\n` };
  }
}

/** Asking for more, or turning it down: once, from new or more info. */
export async function answerApplication(store: DataStore, application: MarketApplication, decision: { status: "more_info" | "rejected"; message: string | null; by: string }, now: Date): Promise<DecisionResult> {
  const message = decision.message?.trim().slice(0, 2000) || null;
  if (decision.status === "more_info" && !message) return { ok: false, error: "Write what you need from them." };
  const updated = await store.updateMarketApplication(
    application.appId,
    application.id,
    { status: decision.status, message, decidedBy: decision.status === "rejected" ? decision.by : null, decidedAt: decision.status === "rejected" ? now : null, updatedAt: now },
    { statuses: ["new", "more_info"] },
  );
  if (!updated) return { ok: false, error: "Someone answered this application already." };
  return { ok: true, application: { ...application, status: decision.status, message, updatedAt: now } };
}

/** Accepting: the vendor made from the answers, its first staff member invited. Once. */
export async function acceptApplication(store: DataStore, form: MarketApplicationForm, application: MarketApplication, by: string, now: Date, area?: Pick<Restaurant, "maxKm" | "deliveryAreas">): Promise<DecisionResult> {
  const claimed = await store.updateMarketApplication(application.appId, application.id, { status: "accepted", decidedBy: by, decidedAt: now, updatedAt: now }, { statuses: ["new", "more_info"] });
  if (!claimed) return { ok: false, error: "Someone answered this application already." };
  const vendor = await store.createRestaurant(vendorFromApplication(form, application, application.appId, area), { sections: [], nextId: 1 }, now);
  const staff = await store.createRestaurantStaff({ appId: application.appId, restaurantId: vendor.id, name: application.businessName, phone: null, email: application.email, active: true, role: "owner" }, now);
  await store.updateMarketApplication(application.appId, application.id, { vendorId: vendor.id, updatedAt: now });
  // A staff member with this email already (another vendor's): the team adds one from the vendor's page.
  void staff;
  return { ok: true, application: { ...application, status: "accepted", vendorId: vendor.id, decidedBy: by, decidedAt: now }, vendorId: vendor.id };
}
