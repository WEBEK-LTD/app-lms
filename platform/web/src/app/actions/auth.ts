"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { completePasswordReset, createPasswordReset } from "@/lib/auth/reset";
import { endSession, homeFor, pendingTwoStep, requestIp, startSession } from "@/lib/auth/session";
import { afterPassword } from "@/lib/auth/sign-in";
import { checkSecondStep } from "@/lib/auth/two-step";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import { appUrl, encryptionKey, superAdminEmails } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { sendTemplate } from "@/lib/email/send";
import { localePath } from "@/i18n/paths";
import { countryFromHeaders } from "@/lib/geo";
import { RATE_LIMITS, hitRateLimit } from "@/lib/rate-limit";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { isLang, LANG_COOKIE, LANG_COOKIE_MAX_AGE, langOf, translateKnown, type Lang } from "@/i18n";
import type { User } from "@/lib/data/types";
import { recordSignUp } from "@/lib/milestones/record";
import { signupSourceFrom } from "@/lib/milestones/source";

/**
 * 55 The sign-in pages in Arabic and Turkish send their language (a hidden
 * `lang` field): the form's errors and messages come back in it, and it is
 * remembered in the `yallapp_lang` cookie for the dashboard (Phase 56).
 */
function formLang(formData: FormData): Lang {
  return langOf(formData.get("lang"));
}

function inLang(lang: Lang, state: FormState): FormState {
  if (lang === "en") return state;
  const t = (text: string) => translateKnown(lang, "formErrors", text);
  return {
    ...state,
    ...(state.message ? { message: t(state.message) } : {}),
    ...(state.errors ? { errors: Object.fromEntries(Object.entries(state.errors).map(([k, v]) => [k, t(v)])) } : {}),
  };
}

async function rememberLang(lang: Lang, user?: Pick<User, "id" | "language">): Promise<void> {
  if (lang === "en") return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax", httpOnly: false });
  // 56 Signing in from an Arabic or Turkish page gives the dashboard that language, unless the person already chose one.
  if (user && !isLang(user.language)) await (await getStore()).updateUser(user.id, { language: lang }, new Date());
}

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const lang = formLang(formData);
  return inLang(lang, await signUp(formData, lang));
}

async function signUp(formData: FormData, lang: Lang): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const store = await getStore();
  const now = new Date();
  const limit = await hitRateLimit(store, RATE_LIMITS.signUpIp, await requestIp(), now);
  if (!limit.allowed) return { message: TOO_MANY, values };

  if (superAdminEmails().includes(parsed.data.email)) {
    return { errors: { email: "This email can't be used for a client account." }, values };
  }
  try {
    // 52 The country the sign-up came from: Yallapp's prices show in its currency.
    const { user, client } = await registerClient(store, { ...parsed.data, country: countryFromHeaders(await headers()) }, now);
    // 78 The sign-up, with where it came from.
    await recordSignUp(store, client, signupSourceFrom(formData));
    await startSession(user);
    await rememberLang(lang, user);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { errors: { email: "An account with this email already exists. Sign in instead." }, values };
    }
    throw error;
  }
  redirect("/pending");
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const lang = formLang(formData);
  return inLang(lang, await signIn(formData, lang));
}

async function signIn(formData: FormData, lang: Lang): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const store = await getStore();
  const now = new Date();
  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(store, RATE_LIMITS.signInIp, await requestIp(), now),
    hitRateLimit(store, RATE_LIMITS.signInEmail, parsed.data.email, now),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { message: TOO_MANY, values };

  const user = await authenticate(store, parsed.data.email, parsed.data.password, now);
  if (!user) return { message: "The email or password is incorrect.", values };
  await rememberLang(lang, user);
  // 70 Signed in now, or first the code from their authenticator app.
  redirect(await afterPassword(user, { lang }));
}

/**
 * 70 The second step: the code from the authenticator app (or a recovery
 * code) of the person whose password was right in the last 10 minutes on
 * this browser. Attempts count per person and per IP.
 */
export async function twoStepSignInAction(_: FormState, formData: FormData): Promise<FormState> {
  const lang = formLang(formData);
  return inLang(lang, await twoStepSignIn(formData));
}

async function twoStepSignIn(formData: FormData): Promise<FormState> {
  const pending = await pendingTwoStep();
  if (!pending) return { message: "Your sign-in waited too long for its code. Sign in again." };
  const store = await getStore();
  const now = new Date();
  const byIp = await hitRateLimit(store, RATE_LIMITS.signInIp, await requestIp(), now);
  if (!byIp.allowed) return { message: TOO_MANY };
  const result = await checkSecondStep(store, pending.user, String(formData.get("code") ?? ""), encryptionKey(), now);
  // Turned off in between (our team reset it): the password was right, so they're in.
  if (!result.ok && result.error !== "off") {
    if (result.error === "rate") return { message: TOO_MANY };
    if (result.error === "format") return { errors: { code: "Enter the 6-digit code from your authenticator app, or a recovery code." } };
    return { errors: { code: "That code isn't right. Try again, or use a recovery code." } };
  }
  await startSession(pending.user, now);
  redirect(pending.next ?? (await homeFor(pending.user)));
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/sign-in");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  return inLang(formLang(formData), await forgotPassword(formData));
}

async function forgotPassword(formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const store = await getStore();
  const now = new Date();
  const sent: FormState = {
    ok: true,
    message: "If there's an account for this email, we've sent a link to reset the password. It expires in 1 hour.",
  };
  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(store, RATE_LIMITS.resetIp, await requestIp(), now),
    hitRateLimit(store, RATE_LIMITS.resetEmail, parsed.data.email, now),
  ]);
  if (!byIp.allowed) return { message: TOO_MANY, values };
  // Same answer whether or not the account exists, and when one email is asked too often.
  if (!byEmail.allowed) return sent;

  const request = await createPasswordReset(store, parsed.data.email, now, { adminEmails: superAdminEmails() });
  if (request) {
    // 56 In the language they chose for the dashboard, else the one of the page they asked on.
    const lang = isLang(request.user.language) ? request.user.language : formLang(formData);
    const link = `${appUrl()}${localePath(lang, `/reset-password?token=${encodeURIComponent(request.token)}`)}`;
    // Answer the same way even if sending fails, so the page doesn't reveal which emails have accounts.
    await sendTemplate(request.isNewAccount ? "password_set" : "password_reset", request.user.email, { name: request.user.name, link }, { lang }).catch((error: unknown) =>
      console.error("[mail] reset email failed", error),
    );
  }
  return sent;
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const lang = formLang(formData);
  return inLang(lang, await resetPassword(formData, lang));
}

async function resetPassword(formData: FormData, lang: Lang): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const store = await getStore();
  const now = new Date();
  const limit = await hitRateLimit(store, RATE_LIMITS.resetIp, await requestIp(), now);
  if (!limit.allowed) return { message: TOO_MANY };

  const result = await completePasswordReset(store, parsed.data.token, await hashPassword(parsed.data.password), now);
  if (!result.ok) {
    return {
      message:
        result.reason === "expired"
          ? "This link has expired. Ask for a new one."
          : "This link has already been used or isn't valid. Ask for a new one.",
    };
  }
  // 70 Every session on the server goes (the new session version already ends them), and the reset link never skips the second step.
  await store.deleteUserSessions(result.user.id);
  await rememberLang(lang, result.user);
  redirect(await afterPassword(result.user, { lang }));
}
