import type { App, SignInMethod } from "../data/types";

/**
 * 18 How people sign in to an app: by phone (a code on WhatsApp), by email,
 * or both, as the owner chose on the dashboard's App sign-in page.
 *
 * - The hosted API sends email codes. Email is offered only where the app's
 *   content is managed in Yallapp (or there's none yet): a connected platform
 *   (Shopify, ikas, Teachable, …) finds each customer's orders and bookings by
 *   their phone number, so those apps stay on phone sign-in.
 * - A WordPress site signs people in with their WordPress email and password;
 *   the plugin gets the owner's choice through the license API.
 */

export const SIGN_IN_METHODS: readonly SignInMethod[] = ["phone", "email"];

/** Content managed in Yallapp: accounts are the hosted API's own, so email works. */
const OWN_CONTENT = new Set(["catalog", "bookings", "courses", "listings"]);

/** Whether this app can offer email sign-in at all. */
export function emailSignInPossible(app: Pick<App, "backend" | "connector" | "demo">): boolean {
  if (app.backend === "wordpress") return true;
  if (app.backend !== "hosted" || app.demo) return false;
  return !app.connector || OWN_CONTENT.has(app.connector.kind);
}

/** The owner's choice as saved, or null when they haven't chosen. */
export function chosenSignInMethods(app: Pick<App, "hostedSettings">): SignInMethod[] | null {
  const saved = (app.hostedSettings?.signInMethods ?? []).filter((m): m is SignInMethod => SIGN_IN_METHODS.includes(m));
  return saved.length ? [...new Set(saved)] : null;
}

/** The methods the hosted API offers: the owner's choice where email is possible, else phone. */
export function hostedSignInMethods(app: Pick<App, "backend" | "connector" | "demo" | "hostedSettings">): SignInMethod[] {
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
