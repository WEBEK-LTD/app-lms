import type { HostedUser } from "../../data/types";
import { serverMessage } from "../../i18n/builtin";
import { servedLayout } from "../../pages/layout";
import { pickLanguage, translatedBlock } from "../../pages/translate";
import type { FormField, LayoutBlock } from "../../pages/types";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import type { HostedContext, HostedRequest, HostedResult } from "../service";

/**
 * 99.4 POST /forms/{slug}/{block_id} on the hosted API: the answers to a
 * form block whose `send_to` is `email`, checked against the published
 * block and emailed to the business (`HostedContext.onFormAnswers`).
 */

export const FORM_LIMITS = {
  minute: { name: "hosted-form:minute", limit: 5, windowSeconds: 60 },
  day: { name: "hosted-form:day", limit: 30, windowSeconds: 86_400 },
} satisfies Record<string, RateLimitRule>;

export const FORM_ANSWER_MAX = 2000;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{6,30}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const SLUG = /^[a-z0-9-]{1,64}$/;

/** One answered field, as the email lists it. */
export interface FormLine {
  label: string;
  value: string;
}

/** The answers checked against the form's fields: the lines to send, or what needs a change (field ID, then an English message). */
export function checkFormAnswers(fields: readonly FormField[], answers: unknown): { ok: true; lines: FormLine[] } | { ok: false; fields: Record<string, string> } {
  const given = answers && typeof answers === "object" && !Array.isArray(answers) ? (answers as Record<string, unknown>) : {};
  const problems: Record<string, string> = {};
  const lines: FormLine[] = [];
  for (const field of fields) {
    const raw = given[field.id];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) problems[field.id] = "Fill this in.";
      continue;
    }
    if (value.length > FORM_ANSWER_MAX) problems[field.id] = "Keep it under 2,000 characters.";
    else if (field.kind === "email" && !EMAIL.test(value)) problems[field.id] = "Enter a valid email address.";
    else if (field.kind === "phone" && (!PHONE.test(value) || value.replace(/\D/g, "").length < 6 || value.replace(/\D/g, "").length > 20)) problems[field.id] = "Enter a valid phone number.";
    else if (field.kind === "number" && !Number.isFinite(Number(value.replace(",", ".")))) problems[field.id] = "Enter a number.";
    else if (field.kind === "choice" && !(field.options ?? []).includes(value)) problems[field.id] = "Choose one of the options.";
    else lines.push({ label: field.label, value });
  }
  return Object.keys(problems).length ? { ok: false, fields: problems } : { ok: true, lines };
}

const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}): HostedResult => ({ status, body: { code, message, ...extra } });

export async function handleFormAnswers(ctx: HostedContext, req: HostedRequest, user: HostedUser | null): Promise<HostedResult | null> {
  if (req.path[0] !== "forms") return null;
  const [, slug, blockId] = req.path;
  if (req.method !== "POST" || req.path.length !== 3 || !slug || !blockId || !SLUG.test(slug) || !ID.test(blockId)) return error(404, "not_found", "This form isn't available anymore.");
  // The published form (the preview's draft for the owner trying it).
  const layout = await servedLayout(ctx.store, ctx.app, ctx.plan ?? null, { draft: Boolean(ctx.preview?.draft), now: ctx.now });
  const page = layout.pages.find((p) => p.slug === slug);
  const block: LayoutBlock | undefined = page?.blocks.find((b) => b.id === blockId);
  if (!page || !block || block.type !== "form" || !block.fields?.length) return error(404, "not_found", "This form isn't available anymore.");
  if (block.send_to !== "email") return error(400, "invalid_request", "This form can't be sent this way.");
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const checked = checkFormAnswers(block.fields, body.answers);
  if (!checked.ok) {
    const lang = pickLanguage(req.headers?.get("accept-language"), layout.languages);
    const fields = Object.fromEntries(Object.entries(checked.fields).map(([id, message]) => [id, serverMessage(message, lang) ?? message]));
    return error(400, "invalid_answers", "Please check the answers marked.", { details: { fields } });
  }
  // Answers that pass count against the limits, so fixing a mistake doesn't use them up.
  for (const rule of [FORM_LIMITS.minute, FORM_LIMITS.day]) {
    const hit = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${ctx.ip}`, ctx.now);
    if (!hit.allowed) return error(429, "rate_limited", "Please wait a moment before trying again.", { retry_after_seconds: hit.retryAfter });
  }
  // The email in the app's default language, as the owner wrote the form.
  const shown = translatedBlock(block, layout.languages.default, layout.languages.default);
  const replyTo = block.fields.find((f) => f.kind === "email" && checked.lines.some((l) => l.label === f.label));
  try {
    await ctx.onFormAnswers?.({
      title: shown.title?.trim() || page.title,
      lines: checked.lines,
      user,
      replyTo: replyTo ? (checked.lines.find((l) => l.label === replyTo.label)?.value ?? null) : null,
    });
  } catch {
    return error(503, "send_failed", "The answers couldn't be sent. Please try again.");
  }
  return { status: 202 };
}
