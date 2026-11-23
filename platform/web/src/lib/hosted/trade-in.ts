import { catalogSettings } from "../catalog/settings";
import type { HostedUser, TradeInGrade } from "../data/types";
import { TRADE_IN_GRADES } from "../data/types";
import { requestLanguage, serverMessage } from "../i18n/builtin";
import { formatCents } from "../catalog/money";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { techOf, tradeInEstimate } from "../selling/tech";
import type { HostedContext, HostedRequest, HostedResult } from "./service";

/**
 * 211 POST /store/trade-in on the hosted API: a customer's old device (one
 * of the models the shop takes, its storage and its grade) with their name
 * and phone. The estimate is worked out here again from the shop's settings
 * (`TechSettings.tradeIn`), never taken from the app, and the request is
 * saved for the owner (Dashboard › Store › Trade-in), signed in or not.
 */

export const TRADE_IN_LIMITS = {
  minute: { name: "hosted-trade-in:minute", limit: 3, windowSeconds: 60 },
  day: { name: "hosted-trade-in:day", limit: 20, windowSeconds: 86_400 },
} satisfies Record<string, RateLimitRule>;

const PHONE = /^\+?[0-9 ()-]{6,30}$/;
const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}): HostedResult => ({ status, body: { code, message, ...extra } });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function handleTradeIn(ctx: HostedContext, req: HostedRequest, user: HostedUser | null): Promise<HostedResult | null> {
  if (req.path[0] !== "store" || req.path[1] !== "trade-in" || req.path.length !== 2) return null;
  if (req.method !== "POST") return error(405, "method_not_allowed", "Use POST.");
  const settings = techOf(ctx.app)?.tradeIn ?? null;
  if (!settings) return error(404, "not_found", "This shop doesn't take trade-ins.");
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const model = str(body.model);
  const storage = str(body.storage);
  const grade = str(body.grade) as TradeInGrade;
  const name = str(body.name);
  const phone = str(body.phone);
  const note = str(body.note);
  const fields: Record<string, string> = {};
  const m = settings.models.find((x) => x.name === model);
  if (!m) fields.model = "Choose one of the devices.";
  else if (!m.storages.some((s) => s.label === storage)) fields.storage = "Choose one of the storages.";
  if (!(TRADE_IN_GRADES as readonly string[]).includes(grade)) fields.grade = "Choose one of the options.";
  if (!name) fields.name = "Fill this in.";
  else if (name.length > 80) fields.name = "Keep it under 80 characters.";
  const digits = phone.replace(/\D/g, "").length;
  if (!phone) fields.phone = "Fill this in.";
  else if (!PHONE.test(phone) || digits < 6 || digits > 20) fields.phone = "Enter a valid phone number.";
  if (note.length > 500) fields.note = "Keep it under 500 characters.";
  if (Object.keys(fields).length) {
    const lang = requestLanguage(req.headers?.get("accept-language"));
    return error(400, "invalid_answers", "Please check the answers marked.", { details: { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, (lang && serverMessage(v, lang)) || v])) } });
  }
  const estimate = tradeInEstimate(settings, model, storage, grade);
  if (estimate === null) return error(400, "invalid_request", "Choose one of the devices.");
  // Requests that pass count against the limits, so fixing a mistake doesn't use them up.
  for (const rule of [TRADE_IN_LIMITS.minute, TRADE_IN_LIMITS.day]) {
    const hit = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${ctx.ip}`, ctx.now);
    if (!hit.allowed) return error(429, "rate_limited", "Please wait a moment before trying again.", { retry_after_seconds: hit.retryAfter });
  }
  const currency = catalogSettings(ctx.app).currency;
  const saved = await ctx.store.createTradeInRequest({
    appId: ctx.app.id,
    userId: user?.id ?? null,
    name,
    phone,
    model,
    storage,
    grade,
    estimateCents: estimate,
    currency,
    note: note || null,
    status: "new",
    createdAt: ctx.now,
    updatedAt: ctx.now,
  });
  return { status: 201, body: { id: saved.id, estimate_cents: estimate, estimate: formatCents(estimate, currency, requestLanguage(req.headers?.get("accept-language"))) } };
}
