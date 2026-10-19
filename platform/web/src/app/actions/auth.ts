"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { completePasswordReset, createPasswordReset } from "@/lib/auth/reset";
import { endSession, homeFor, requestIp, startSession } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import { appUrl, superAdminEmails } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { sendTemplate } from "@/lib/email/send";
import { countryFromHeaders } from "@/lib/geo";
import { RATE_LIMITS, hitRateLimit } from "@/lib/rate-limit";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validation";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
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
    const { user } = await registerClient(store, { ...parsed.data, country: countryFromHeaders(await headers()) }, now);
    await startSession(user);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { errors: { email: "An account with this email already exists. Sign in instead." }, values };
    }
    throw error;
  }
  redirect("/pending");
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
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
  await startSession(user);
  redirect(await homeFor(user));
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/sign-in");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
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
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(request.token)}`;
    // Answer the same way even if sending fails, so the page doesn't reveal which emails have accounts.
    await sendTemplate(request.isNewAccount ? "password_set" : "password_reset", request.user.email, { name: request.user.name, link }).catch((error: unknown) =>
      console.error("[mail] reset email failed", error),
    );
  }
  return sent;
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
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
  await startSession(result.user);
  redirect(await homeFor(result.user));
}
