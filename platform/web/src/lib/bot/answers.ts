import { hostedOnly, kindById, type KindInfo } from "../app/kinds";
import { isHttpUrl } from "../license/site-url";
import { LOCALES, MAX_LANGUAGES } from "../i18n/locales";
import { STUDIO_ONLY_KINDS } from "../studio/section";
import { featuresFor } from "./features";
import { FEATURES, type BotFeature } from "./intents";

/** What the owner answered, as the bot sends it to be made. */
export interface BotAnswers {
  kind: string;
  /** A school in university mode (the school's university template). */
  university: boolean;
  name: string;
  /** The main colour, or null for the demo's colours. */
  colour: string | null;
  logoAssetId: string | null;
  /** The first is the main language. */
  languages: string[];
  features: BotFeature[];
  /** The website's address, or null: the content is kept in Yallapp. */
  website: string | null;
}

export const BOT_NAME_MAX = 30;

export type AnswerError = "kind" | "name" | "colour" | "logo" | "languages" | "website";

/** Whether the bot asks this kind about a website: a Studio-only kind and real estate keep their content in Yallapp. */
export function asksForWebsite(kind: Pick<KindInfo, "id" | "engine">): boolean {
  return !STUDIO_ONLY_KINDS.has(kind.id) && !hostedOnly(kind.engine);
}

/** The address typed as a website's, with https:// when it has none; null when it isn't one. */
export function websiteAddress(typed: string): string | null {
  const value = typed.trim();
  if (!value || value.length > 255 || /\s/.test(value)) return null;
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!isHttpUrl(url)) return null;
  const host = new URL(url).hostname;
  const top = host.split(".").pop() ?? "";
  return /^[^.]+(\.[^.]+)+$/.test(host) && top.length >= 2 && /[a-z]/i.test(top) ? url.replace(/\/+$/, "") : null;
}

/** The answers, checked and tidied; or the first one to answer again. */
export function readAnswers(input: unknown): { ok: true; value: BotAnswers; kind: KindInfo } | { ok: false; error: AnswerError } {
  const raw = (typeof input === "object" && input ? input : {}) as Record<string, unknown>;
  const kind = kindById(raw.kind);
  if (!kind) return { ok: false, error: "kind" };
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > BOT_NAME_MAX) return { ok: false, error: "name" };
  let colour: string | null = null;
  if (raw.colour !== null && raw.colour !== undefined) {
    if (typeof raw.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(raw.colour)) return { ok: false, error: "colour" };
    colour = raw.colour.toUpperCase();
  }
  let logoAssetId: string | null = null;
  if (raw.logoAssetId !== null && raw.logoAssetId !== undefined) {
    if (typeof raw.logoAssetId !== "string" || !/^[\w-]{1,64}$/.test(raw.logoAssetId)) return { ok: false, error: "logo" };
    logoAssetId = raw.logoAssetId;
  }
  const codes = Array.isArray(raw.languages) ? raw.languages.filter((c): c is string => typeof c === "string" && LOCALES.some((l) => l.code === c)) : [];
  const languages = [...new Set(codes)].slice(0, MAX_LANGUAGES);
  if (!languages.length) return { ok: false, error: "languages" };
  const offered = featuresFor(kind);
  const features = FEATURES.filter((f) => offered.includes(f) && Array.isArray(raw.features) && raw.features.includes(f));
  let website: string | null = null;
  if (typeof raw.website === "string" && raw.website.trim() && asksForWebsite(kind)) {
    website = websiteAddress(raw.website);
    if (!website) return { ok: false, error: "website" };
  }
  return { ok: true, kind, value: { kind: kind.id, university: kind.id === "school" && raw.university === true, name, colour, logoAssetId, languages, features, website } };
}
