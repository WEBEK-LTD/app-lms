import { decrypt, encrypt } from "../crypto/encryption";
import type { App, ReviewAccount } from "../data/types";
import { hostedSignInMethods, yallappSignsIn } from "../hosted/sign-in-methods";

/**
 * 102 The sign-in Google Play (App content › App access) and the App Store
 * (App Review Information) give their reviewers. Every app needs one before
 * a store build: apps whose reviewers can't sign in are turned down.
 *
 * Apps whose sign-in Yallapp runs (the hosted API, or an own API with
 * Yallapp sign-in) use the fixed review number or email with its fixed code
 * from App sign-in. WordPress sites and own APIs keep their own accounts:
 * the owner makes one for the reviewers and enters its user name and
 * password here, kept encrypted.
 */

export const REVIEW_ACCOUNT_LIMITS = { username: 200, password: 200, notes: 1000 } as const;

/** How this app's reviewers sign in: a fixed code (App sign-in) or an account of the site or API. */
export function reviewSignInKind(app: Pick<App, "backend" | "hostedSettings">): "code" | "account" {
  return app.backend === "hosted" || yallappSignsIn(app) ? "code" : "account";
}

/** The fixed review number or email that signs in with the fixed code, when App sign-in has both. */
export function reviewCodeWho(app: Pick<App, "backend" | "connector" | "demo" | "hostedSettings">): string | null {
  const settings = app.hostedSettings;
  if (!settings?.reviewCode) return null;
  const methods = hostedSignInMethods(app);
  return (methods.includes("phone") && settings.reviewPhone) || (methods.includes("email") && settings.reviewEmail) || null;
}

/** The reviewers' sign-in as they type it: who (number, email or user name) and the code or password; null when it's missing. */
export function reviewSignIn(app: App, key: Buffer): { kind: "code" | "account"; who: string; secret: string; notes: string | null } | null {
  if (reviewSignInKind(app) === "code") {
    const who = reviewCodeWho(app);
    return who ? { kind: "code", who, secret: app.hostedSettings!.reviewCode!, notes: null } : null;
  }
  const account = app.hostedSettings?.reviewAccount;
  if (!account) return null;
  const password = reviewAccountPassword(app.id, account, key);
  return password === null ? null : { kind: "account", who: account.username, secret: password, notes: account.notes };
}

/** Whether the reviewers have a sign-in, without reading the password. */
export function hasReviewSignIn(app: Pick<App, "backend" | "connector" | "demo" | "hostedSettings">): boolean {
  return reviewSignInKind(app) === "code" ? reviewCodeWho(app) !== null : Boolean(app.hostedSettings?.reviewAccount);
}

/** The context the password is sealed with (lib/jobs/rekey.ts moves it to a new key). */
export const reviewAccountContext = (appId: string) => `review-account:${appId}`;

export function encryptReviewAccount(appId: string, input: { username: string; password: string; notes: string | null }, key: Buffer, now: Date): ReviewAccount {
  return { username: input.username, passwordEncrypted: encrypt(input.password, key, reviewAccountContext(appId)), notes: input.notes, savedAt: now.toISOString() };
}

/** The password, or null when it can't be read (a key that changed without the old one). */
export function reviewAccountPassword(appId: string, account: ReviewAccount, key: Buffer): string | null {
  try {
    return decrypt(account.passwordEncrypted, key, reviewAccountContext(appId));
  } catch {
    return null;
  }
}

/** The form's values, checked; an empty password keeps the saved one. */
export function parseReviewAccountForm(
  values: { username: string; password: string; notes: string },
  saved: boolean,
): { ok: true; value: { username: string; password: string | null; notes: string | null } } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const username = values.username.trim();
  const notes = values.notes.trim();
  if (!username) errors.username = "Enter the user name or email the reviewers sign in with.";
  else if (username.length > REVIEW_ACCOUNT_LIMITS.username || /[\r\n]/.test(username)) errors.username = "Enter a user name or email under 200 characters, on one line.";
  if (!values.password && !saved) errors.password = "Enter the password of this account.";
  else if (values.password.length > REVIEW_ACCOUNT_LIMITS.password) errors.password = "Enter a password under 200 characters.";
  if (notes.length > REVIEW_ACCOUNT_LIMITS.notes) errors.notes = "Keep the notes under 1,000 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { username, password: values.password || null, notes: notes || null } };
}
