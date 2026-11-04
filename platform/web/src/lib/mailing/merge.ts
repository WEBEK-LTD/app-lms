/**
 * 114 Merge tags: {{first_name}} or, with what to write when it's empty,
 * {{first_name|there}}. Filled per recipient when the email is sent; the
 * preview fills them with an example person.
 */

import { escapeHtml } from "./sanitize";

export const MERGE_TAGS = [
  { tag: "first_name", label: "First name", example: "Mona" },
  { tag: "name", label: "Full name", example: "Mona Hassan" },
  { tag: "email", label: "Email", example: "mona@example.com" },
  { tag: "business_name", label: "Business name", example: "Mona's Bakery" },
  { tag: "app_name", label: "App name", example: "Mona's Bakery" },
  { tag: "plan", label: "Plan", example: "Growth" },
  { tag: "expiry_date", label: "Plan end date", example: "15 December 2026" },
  { tag: "sign_in_link", label: "Sign-in link", example: "https://yallapp.com.tr/sign-in" },
  { tag: "unsubscribe_link", label: "Unsubscribe link", example: "https://yallapp.com.tr/unsubscribe/example" },
] as const;

export type MergeTag = (typeof MERGE_TAGS)[number]["tag"];
export type MergeValues = Partial<Record<MergeTag, string | null>>;

const KNOWN = new Set<string>(MERGE_TAGS.map((t) => t.tag));
const PATTERN = /\{\{\s*([a-z_][a-z0-9_]*)\s*(?:\|([^{}]*))?\}\}/gi;

/** Fills the known tags; unknown ones stay as written (`unknownMergeTags` stops a send that has any). */
export function applyMergeTags(text: string, values: MergeValues, options: { html: boolean }): string {
  return text.replace(PATTERN, (whole, raw: string, fallback: string | undefined) => {
    const tag = raw.toLowerCase();
    if (!KNOWN.has(tag)) return whole;
    const value = values[tag as MergeTag]?.trim() || fallback?.trim() || "";
    return options.html ? escapeHtml(value) : value;
  });
}

/** The tags the email uses that Yallapp can't fill: a placeholder left to replace ({{discount}}). */
export function unknownMergeTags(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PATTERN)) {
    const tag = match[1]!.toLowerCase();
    if (!KNOWN.has(tag)) found.add(tag);
  }
  return [...found];
}

export function exampleMergeValues(): MergeValues {
  return Object.fromEntries(MERGE_TAGS.map((t) => [t.tag, t.example])) as MergeValues;
}

/** The person's first name from their full name. */
export function firstNameOf(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean || clean.includes("@")) return "";
  return clean.split(/\s+/)[0]!.slice(0, 60);
}
