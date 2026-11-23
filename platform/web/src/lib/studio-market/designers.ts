import { parseCountry } from "../account/country";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { designerPageDefaults, type Client, type TemplateDesigner } from "../data/types";

/**
 * 106.1 Becoming a designer on Studio Market: a name, a public address
 * (yallapp.com.tr/designers/<slug>), the country they are paid in and the
 * designer terms, Yallapp's 25% share included. Any account can: no app of
 * its own and no plan are needed to design templates in Studio. Their ID
 * and bank details are checked later, before their first payout.
 */

export const DESIGNER_LIMITS = { name: 60, slugMin: 3, slug: 40, bio: 400 } as const;

/** English texts the dashboard translates (studioMarket.known). */
export const DESIGNER_MESSAGES = {
  name: "Enter the name buyers will see, up to 60 characters.",
  slug: "Use 3 to 40 small letters, numbers or dashes for your address.",
  slugTaken: "Another designer has this address. Choose another one.",
  slugReserved: "This address is kept for Yallapp. Choose another one.",
  country: "Choose your country from the list.",
  bio: "Keep the line about you to 400 characters.",
  terms: "Tick the box to agree to the designer terms.",
  saved: "Saved.",
  already: "This account is a designer already.",
} as const;

/**
 * 106.14 Addresses a designer can't take: the website's and the dashboard's
 * own words, and names that would pass for Yallapp's team. A designer who
 * has one already (made before this list) keeps it.
 */
export const RESERVED_DESIGNER_SLUGS: ReadonlySet<string> = new Set([
  "about", "account", "accounts", "admin", "administrator", "api", "app", "apps", "billing", "blog", "contact", "dashboard", "demo", "designer", "designers", "docs",
  "faq", "features", "help", "home", "join", "login", "logout", "market", "marketplace", "me", "moderator", "new", "null", "official", "owner", "pay", "payments",
  "pricing", "privacy", "profile", "publish", "refund", "root", "security", "settings", "shop", "sign-in", "sign-out", "sign-up", "signin", "signup", "staff", "store",
  "studio", "studio-market", "support", "system", "team", "templates", "terms", "undefined", "webek", "www", "yallapp", "yallapp-studio", "yallapp-team", "yallapp-support",
]);

/** 106.14 An address kept for Yallapp: the list, or one that starts with "yallapp" (Yallapp's own designs keep theirs). */
export function isReservedDesignerSlug(slug: string): boolean {
  return RESERVED_DESIGNER_SLUGS.has(slug) || slug.startsWith("yallapp");
}

/** "Studio Nūr" → "studio-nur". */
export function designerSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, DESIGNER_LIMITS.slug)
    .replace(/-+$/g, "");
}

export interface DesignerInput {
  name: string;
  slug: string;
  country: string;
  bio: string;
}

export type DesignerProfile = Pick<TemplateDesigner, "name" | "slug" | "country" | "bio">;

/** The profile as sent, checked; an error per field otherwise (English, studioMarket.known). `currentSlug`: the address they have (kept even if it is reserved now). */
export function readDesignerProfile(input: DesignerInput, currentSlug: string | null = null): { ok: true; value: DesignerProfile } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name || name.length > DESIGNER_LIMITS.name) errors.name = DESIGNER_MESSAGES.name;
  const slug = (input.slug.trim() || designerSlug(name)).toLowerCase();
  if (slug.length < DESIGNER_LIMITS.slugMin || slug.length > DESIGNER_LIMITS.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = DESIGNER_MESSAGES.slug;
  else if (slug !== currentSlug && isReservedDesignerSlug(slug)) errors.slug = DESIGNER_MESSAGES.slugReserved;
  const country = parseCountry(input.country);
  if (!country) errors.country = DESIGNER_MESSAGES.country;
  const bio = input.bio.replace(/\s+/g, " ").trim();
  if (bio.length > DESIGNER_LIMITS.bio) errors.bio = DESIGNER_MESSAGES.bio;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, slug, country: country!, bio: bio || null } };
}

export type JoinResult = { ok: true; designer: TemplateDesigner } | { ok: false; errors: Record<string, string> };

/** Makes the account a designer, with the terms agreed to now. */
export async function joinAsDesigner(store: DataStore, client: Pick<Client, "id">, input: DesignerInput & { terms: boolean }, now: Date): Promise<JoinResult> {
  const read = readDesignerProfile(input);
  const errors = read.ok ? {} : { ...read.errors };
  if (!input.terms) errors.terms = DESIGNER_MESSAGES.terms;
  if (!read.ok || Object.keys(errors).length) return { ok: false, errors };
  if (await store.getTemplateDesignerByClient(client.id)) return { ok: false, errors: { form: DESIGNER_MESSAGES.already } };
  const designer: TemplateDesigner = { id: newId(), clientId: client.id, ...read.value, status: "active", termsAcceptedAt: now, createdAt: now, updatedAt: now, ...designerPageDefaults(), profileReview: read.value.bio ? "pending" : "none" };
  const created = await store.createTemplateDesigner(designer);
  if (!created) return { ok: false, errors: { slug: DESIGNER_MESSAGES.slugTaken } };
  return { ok: true, designer: created };
}

/** A designer's own profile changed (their name, address, country or line). */
export async function updateDesignerProfile(store: DataStore, designer: TemplateDesigner, input: DesignerInput, now: Date): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> {
  const read = readDesignerProfile(input, designer.slug);
  if (!read.ok) return read;
  // 106.14 A new line about them waits for the team's first look (once approved, a change goes live).
  const profileReview = nextProfileReview(designer, { bio: read.value.bio, photoAssetId: designer.photoAssetId, changed: read.value.bio !== designer.bio });
  if (!(await store.updateTemplateDesigner(designer.id, { ...read.value, profileReview }, now))) return { ok: false, errors: { slug: DESIGNER_MESSAGES.slugTaken } };
  return { ok: true };
}

/**
 * 106.14 The team looks at a designer's photo and line about them the first
 * time (like a template's first publish): a new one is "pending" until
 * approved, and neither shows on the public pages meanwhile. Once approved,
 * changes go live (the team can still lock the page). Declined, the next
 * change is looked at again. With neither, there is nothing to look at.
 */
export function nextProfileReview(designer: Pick<TemplateDesigner, "profileReview">, next: { bio: string | null; photoAssetId: string | null; changed: boolean }): TemplateDesigner["profileReview"] {
  const something = Boolean(next.bio || next.photoAssetId);
  if (designer.profileReview === "approved") return "approved";
  if (!something) return "none";
  if (designer.profileReview === "declined" && !next.changed) return "declined";
  return "pending";
}

/** Two letters for a designer's round picture: "Studio Nūr" → "SN". */
export function designerInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length >= 2 ? [words[0]![0], words[1]![0]] : [...(words[0] ?? "?").slice(0, 2)];
  return letters.join("").toUpperCase();
}

/** The designer's picture colours, the same each time (the dashboard's soft tiles). */
const TINTS = [
  { bg: "#f6e0d2", fg: "#8a3a12" },
  { bg: "#d7ebe2", fg: "#1f5a3e" },
  { bg: "#e6e3ef", fg: "#3c3470" },
  { bg: "#eedde8", fg: "#6b2a55" },
  { bg: "#f2e3c9", fg: "#6e4a0e" },
  { bg: "#fbe4e2", fg: "#8c2a22" },
] as const;

export function designerTint(slug: string): { bg: string; fg: string } {
  let sum = 0;
  for (const ch of slug) sum = (sum * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[sum % TINTS.length]!;
}
