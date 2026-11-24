import { invalid } from "../api/http";
import { isCommunityLanguage } from "../i18n";
import type { CommunityLanguage, CommunityProfileLink, CommunityTheme } from "../types";
import { COMMUNITY_THEMES } from "../types";

/**
 * 231 Reading what members send. Each problem is a field and a word's key
 * ("field.required"); the dispatcher writes the words in the reader's
 * language.
 */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME = /^[a-z0-9_.]{3,30}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export class Fields {
  readonly errors: Record<string, string> = {};

  add(field: string, word: string): void {
    this.errors[field] ??= word;
  }

  /** 400 invalid_request with the fields, when any. */
  check(): void {
    if (Object.keys(this.errors).length > 0) invalid(this.errors);
  }
}

export function readEmail(value: unknown, fields: Fields, field = "email"): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email) fields.add(field, "field.required");
  else if (email.length > 191 || !EMAIL.test(email)) fields.add(field, "field.email");
  return email;
}

export function readPassword(value: unknown, fields: Fields, field = "password"): string {
  const password = typeof value === "string" ? value : "";
  if (!password) fields.add(field, "field.required");
  else if (password.length < PASSWORD_MIN) fields.add(field, "field.password_short");
  else if (password.length > PASSWORD_MAX) fields.add(field, "field.too_long");
  return password;
}

export function readText(value: unknown, fields: Fields, field: string, max: number, options: { required?: boolean } = {}): string | undefined {
  if (value === undefined || value === null) {
    if (options.required) fields.add(field, "field.required");
    return undefined;
  }
  if (typeof value !== "string") {
    fields.add(field, "field.invalid");
    return undefined;
  }
  const text = value.trim();
  if (options.required && !text) fields.add(field, "field.required");
  else if (text.length > max) fields.add(field, "field.too_long");
  return text;
}

export function readUsername(value: unknown, fields: Fields, field = "username"): string | undefined {
  if (value === undefined) return undefined;
  const username = typeof value === "string" ? value.trim().toLowerCase().replace(/^@/, "") : "";
  if (!USERNAME.test(username)) fields.add(field, "field.username");
  return username;
}

export function readLanguage(value: unknown, fields: Fields, field = "language"): CommunityLanguage | undefined {
  if (value === undefined) return undefined;
  if (!isCommunityLanguage(value)) fields.add(field, "field.invalid");
  return isCommunityLanguage(value) ? value : undefined;
}

export function readTheme(value: unknown, fields: Fields): CommunityTheme | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !(COMMUNITY_THEMES as readonly string[]).includes(value)) {
    fields.add("theme", "field.invalid");
    return undefined;
  }
  return value as CommunityTheme;
}

export function readSkills(value: unknown, fields: Fields): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 15 || value.some((s) => typeof s !== "string" || !s.trim() || s.trim().length > 30)) {
    fields.add("skills", "field.invalid");
    return undefined;
  }
  const seen = new Set<string>();
  return (value as string[]).map((s) => s.trim()).filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function readLinks(value: unknown, fields: Fields): CommunityProfileLink[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 5) {
    fields.add("links", "field.invalid");
    return undefined;
  }
  const links: CommunityProfileLink[] = [];
  value.forEach((raw: unknown, i) => {
    const link = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const label = typeof link.label === "string" ? link.label.trim() : "";
    const url = typeof link.url === "string" ? link.url.trim() : "";
    if (!label || label.length > 40) fields.add(`links.${i}.label`, label ? "field.too_long" : "field.required");
    if (!url || url.length > 300 || !isHttpUrl(url)) fields.add(`links.${i}.url`, "field.url");
    links.push({ label, url });
  });
  return links;
}

/** A username made from a display name ("Mohamed Ali" → "mohamed.ali"); "member" when the name has no Latin letters. */
export function usernameBase(displayName: string): string {
  const latin = displayName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
  return latin.length >= 3 ? latin : "member";
}
