/**
 * 114 Merge tags: {{first_name}} or, with what to write when it's empty,
 * {{first_name|there}}. Filled per recipient when the email is sent; the
 * preview fills them with an example person.
 *
 * The admin's contacts have no account: `contact` says what each tag is for
 * them (lib/mailing/audience.ts contactValues). The tags only an account has
 * are empty for a contact, so give them a default ({{plan|your plan}}) or
 * keep them out of an email that goes to contacts.
 */

import { escapeHtml } from "./sanitize";

export const MERGE_TAGS = [
  { tag: "first_name", label: "First name", example: "Mona", contact: "The first word of the contact's name" },
  { tag: "name", label: "Full name", example: "Mona Hassan", contact: "The contact's name" },
  { tag: "email", label: "Email", example: "mona@example.com", contact: "The contact's address" },
  { tag: "business_name", label: "Business name", example: "Mona's Bakery", contact: "The contact's company" },
  { tag: "app_name", label: "App name", example: "Mona's Bakery", contact: null },
  { tag: "plan", label: "Plan", example: "Growth", contact: null },
  { tag: "expiry_date", label: "Plan end date", example: "15 December 2026", contact: null },
  { tag: "sign_in_link", label: "Sign-in link", example: "https://yallapp.com.tr/sign-in", contact: "The sign-up page (they have no account yet)" },
  { tag: "unsubscribe_link", label: "Unsubscribe link", example: "https://yallapp.com.tr/unsubscribe/example", contact: "Their own unsubscribe link" },
] as const;

/** The tags a contact has no value for (they're empty, or show the tag's default). */
export const ACCOUNT_ONLY_TAGS: readonly MergeTag[] = MERGE_TAGS.filter((t) => t.contact === null).map((t) => t.tag);

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

/** The account-only tags the text uses without a default: empty for a contact (the review step warns when contacts get the email). */
export function accountOnlyTagsWithoutDefault(text: string): MergeTag[] {
  const found = new Set<MergeTag>();
  for (const match of text.matchAll(PATTERN)) {
    const tag = match[1]!.toLowerCase() as MergeTag;
    if (ACCOUNT_ONLY_TAGS.includes(tag) && !match[2]?.trim()) found.add(tag);
  }
  return [...found];
}
