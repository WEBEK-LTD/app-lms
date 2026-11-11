import { ENGINES, isAppType, isOwnContent } from "../app/kinds";
import type { App, PasswordSignInSettings, PasswordWay, SignInMethod } from "../data/types";

/**
 * 18 How people sign in to an app: by phone (a code on WhatsApp), by email,
 * or both, as the owner chose on the dashboard's App sign-in page.
 *
 * - The hosted API sends email codes. Email is offered where the app's
 *   content is managed in Yallapp (or there's none yet), and (19) for the
 *   course platforms (Teachable, Thinkific), which know students by email:
 *   someone who signs in by email is the school's student with that address.
 *   Shops and booking platforms (Shopify, ikas, SimplyBook, …) find each
 *   customer's orders and bookings by their phone number, so those apps stay
 *   on phone sign-in.
 * - A WordPress site signs people in with their WordPress email and password,
 *   or (24) with a code by email that also signs new people up; the plugin
 *   gets the owner's choices through the license API.
 */

export const SIGN_IN_METHODS: readonly SignInMethod[] = ["phone", "email"];


/** 19 Connected platforms that find each student by their email address. */
export const EMAIL_PLATFORMS = new Set(["teachable", "thinkific"]);

/** 23 Connected sources that know nothing about readers (a news feed): accounts are the app's own, so email works. */
export const OWN_ACCOUNT_PLATFORMS = new Set(["rss"]);

/** 23 Whether an app connected to this platform can still offer email sign-in. */
export function platformKeepsEmail(platform: string): boolean {
  return EMAIL_PLATFORMS.has(platform) || OWN_ACCOUNT_PLATFORMS.has(platform);
}

/**
 * 34 Whether Yallapp signs people in to this app: an app on its own API whose
 * owner chose "Yallapp signs people in" on App sign-in (lib/hosted/app-auth.ts).
 */
export function yallappSignsIn(app: Pick<App, "backend"> & { hostedSettings?: App["hostedSettings"] }): boolean {
  return app.backend === "custom_api" && app.hostedSettings?.signInBy === "yallapp";
}

/** Whether this app can offer email sign-in at all. */
export function emailSignInPossible(app: Pick<App, "backend" | "connector" | "demo"> & { hostedSettings?: App["hostedSettings"] }): boolean {
  // 19 Also a WordPress site our team is still setting up.
  if (app.backend === "wordpress" || app.backend === "setup_requested") return true;
  // 34 An own API app Yallapp signs people in to: the accounts are Yallapp's, so email works.
  if (app.backend === "custom_api") return yallappSignsIn(app);
  if (app.backend !== "hosted" || app.demo) return false;
  if (app.connector?.kind === "platform") return platformKeepsEmail(app.connector.platform);
  // Content managed in Yallapp (lib/app/kinds.ts): accounts are the hosted API's own, so email works.
  return !app.connector || isOwnContent(app.connector.kind);
}

/**
 * 19 What the dashboard says about email sign-in for the app's content: why
 * it isn't offered (a connected shop or booking platform finds customers by
 * phone), or how it works with a course platform. Null when there's nothing
 * to explain.
 */
export function emailSignInNote(app: Pick<App, "backend" | "connector" | "demo" | "appType">): string | null {
  if (app.backend !== "hosted") return null;
  const connector = app.connector;
  if (connector?.kind === "platform" && EMAIL_PLATFORMS.has(connector.platform)) {
    return "Your course platform knows students by email: someone who signs in by email sees the courses of their school account with that address, including those bought on your website. Someone who signs in by phone gets their own account in the app.";
  }
  if (emailSignInPossible(app)) return null;
  if (app.demo) return "Demo apps sign in with the demo number only.";
  // 20 Each engine words it for its platforms (lib/app/kinds.ts); Shopify is a shop.
  const note = connector?.kind === "shopify" ? ENGINES.store.platformPhoneNote : connector?.kind === "platform" && isAppType(app.appType) ? ENGINES[app.appType].platformPhoneNote : null;
  return note ?? "Your connected platform finds each customer by their phone number, so this app signs in by phone.";
}

/** The owner's choice as saved, or null when they haven't chosen. */
export function chosenSignInMethods(app: Pick<App, "hostedSettings">): SignInMethod[] | null {
  const saved = (app.hostedSettings?.signInMethods ?? []).filter((m): m is SignInMethod => SIGN_IN_METHODS.includes(m));
  return saved.length ? [...new Set(saved)] : null;
}

/** 24 WordPress: how email sign-in works, as the owner chose (null: the plugin's own setting, password by default). */
export function chosenEmailSignIn(app: Pick<App, "hostedSettings">): "code" | "password" | null {
  const saved = app.hostedSettings?.emailSignIn;
  return saved === "code" || saved === "password" ? saved : null;
}

/** 24 The form's email sign-in choice, or null when it isn't one. */
export function parseEmailSignInChoice(value: string): "code" | "password" | null {
  return value === "code" || value === "password" ? value : null;
}

/** The methods the hosted API offers: the owner's choice where email is possible, else phone. */
export function hostedSignInMethods(app: Pick<App, "backend" | "connector" | "demo" | "hostedSettings"> & { section?: App["section"] }): SignInMethod[] {
  // 118 With passwords, the channels their accounts are verified and reset on, and where codes still sign in.
  const passwords = passwordSignIn(app);
  if (passwords) return passwordChannels(passwords);
  const chosen = chosenSignInMethods(app) ?? ["phone"];
  return emailSignInPossible(app) ? chosen : ["phone"];
}

/** The form's choice ("phone", "email" or "both") as a list, or null when it isn't one of them. */
export function parseSignInMethodsChoice(value: string): SignInMethod[] | null {
  if (value === "phone") return ["phone"];
  if (value === "email") return ["email"];
  if (value === "both") return ["phone", "email"];
  return null;
}

/** The list as the form's choice. */
export function signInMethodsChoice(methods: readonly SignInMethod[]): "phone" | "email" | "both" {
  if (methods.includes("phone") && methods.includes("email")) return "both";
  return methods.includes("email") ? "email" : "phone";
}

/** 19 How customers get their code, for the setup copy: "a code we send to their phone", "… email address" or "… phone or email address". */
export function codeDeliveryText(methods: readonly SignInMethod[]): string {
  const phone = methods.includes("phone") || !methods.includes("email");
  if (phone && methods.includes("email")) return "a code we send to their phone or email address";
  return phone ? "a code we send to their phone" : "a code we send to their email address";
}

/**
 * 19 Customers who signed up by email (no phone number) and couldn't sign in
 * if the app's content moved to a connected platform, which signs in by phone
 * only. Zero when email sign-in isn't possible now anyway.
 */
export async function emailOnlyUsersAtRisk(
  store: { countHostedEmailOnlyUsers(appId: string): Promise<number> },
  app: Pick<App, "id" | "backend" | "connector" | "demo">,
): Promise<number> {
  if (app.backend !== "hosted" || !emailSignInPossible(app)) return 0;
  return store.countHostedEmailOnlyUsers(app.id);
}

/** 19 The Website step's warning before such a switch. */
export function emailOffWarning(count: number): string {
  const who = count === 1 ? "1 customer signed up" : `${count.toLocaleString("en-GB")} customers signed up`;
  return `${who} with their email address. A connected platform finds customers by their phone number, so this app would sign in by phone only, and they couldn't sign in any more.`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A sign-in email address, trimmed and lowercase, or null when it isn't one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 191 && EMAIL.test(email) ? email : null;
}

// 118 Password sign-in (Yallapp Studio apps)

/** 118 What a password signs in with, in the dashboard's order. */
export const PASSWORD_WAYS: readonly PasswordWay[] = ["email", "phone", "username"];
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
/** 118 3 to 30 characters: lowercase letters, digits, dots and underscores, starting with a letter. */
const USERNAME = /^[a-z][a-z0-9._]{2,29}$/;

/**
 * 118 Whether the app may offer password sign-in: a Yallapp Studio project
 * whose accounts are Yallapp's (the hosted API, or an own API Yallapp signs
 * people in to). Demo apps keep their demo number.
 */
export function passwordSignInPossible(app: Pick<App, "backend" | "section" | "demo"> & { hostedSettings?: App["hostedSettings"] }): boolean {
  if (app.section !== "studio" || app.demo) return false;
  return app.backend === "hosted" || yallappSignsIn(app);
}

/**
 * 118 The app's password sign-in as it works now: the owner's choice, less
 * what the app can't offer (email, where its content finds people by phone).
 * Null: codes only.
 */
export function passwordSignIn(app: Pick<App, "backend" | "connector" | "demo" | "section"> & { hostedSettings?: App["hostedSettings"] }): PasswordSignInSettings | null {
  const saved = app.hostedSettings?.passwordSignIn;
  if (!saved || !passwordSignInPossible(app)) return null;
  const email = emailSignInPossible(app);
  const by = PASSWORD_WAYS.filter((w) => saved.by.includes(w) && (w !== "email" || email));
  if (!by.length) return null;
  const codes = SIGN_IN_METHODS.filter((m) => saved.codes.includes(m) && (m !== "email" || email));
  const recovery: SignInMethod = saved.recovery === "email" && email ? "email" : "phone";
  return { by, codes, recovery };
}

/** 118 The channels codes go to: where they sign in, and where passwords' accounts are verified and reset. */
export function passwordChannels(settings: PasswordSignInSettings): SignInMethod[] {
  const used = new Set<SignInMethod>(settings.codes);
  if (settings.by.includes("email")) used.add("email");
  if (settings.by.includes("phone")) used.add("phone");
  if (settings.by.includes("username")) used.add(settings.recovery);
  return SIGN_IN_METHODS.filter((m) => used.has(m));
}

/** 118 A username as typed, lowercase, or null when it isn't a valid one. */
export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase();
  return USERNAME.test(name) ? name : null;
}

/** 118 Passwords too common to protect anything. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000",
  "88888888", "87654321", "987654321", "123123123", "qwertyui", "qwerty12", "qwerty123", "qwertyuiop", "1q2w3e4r", "1qaz2wsx",
  "asdfghjk", "asdfasdf", "zxcvbnm1", "iloveyou", "abc12345", "abcd1234", "aaaaaaaa", "admin123", "welcome1", "letmein1",
  "sunshine", "football", "princess", "baseball", "superman", "trustno1", "yallapp1", "yallapp123",
]);

/**
 * 118 Why a new password isn't good enough (an English message the hosted API
 * localizes), or null when it is: 8 to 128 characters, not one repeated
 * character, not a common password, not the person's own email, phone or username.
 */
export function passwordProblem(password: string, own: (string | null | undefined)[] = []): string | null {
  const length = [...password].length;
  if (length < PASSWORD_MIN_LENGTH) return "Your password needs at least 8 characters.";
  if (length > PASSWORD_MAX_LENGTH) return "Your password can have up to 128 characters.";
  const lower = password.toLowerCase();
  if (new Set(lower).size === 1 || COMMON_PASSWORDS.has(lower)) return "This password is too easy to guess. Please choose another one.";
  if (own.some((v) => v && v.toLowerCase().replace(/^\+/, "") === lower.replace(/^\+/, ""))) return "Your password can't be your email, phone number or username.";
  return null;
}
