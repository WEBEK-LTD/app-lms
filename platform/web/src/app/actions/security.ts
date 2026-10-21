"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, getCurrentUser, signInPath, signOutEverywhere } from "@/lib/auth/session";
import { beginTwoStepSetup, confirmTwoStepSetup, hasTwoStep, renewRecoveryCodes, turnOffTwoStep } from "@/lib/auth/two-step";
import { getStore } from "@/lib/data";
import type { User } from "@/lib/data/types";
import { mailTwoStepChange } from "@/lib/auth/two-step-mail";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";

/**
 * 70 Two-step sign-in and "Sign out of all devices", from Dashboard › Your
 * account (clients and their team members) and Admin › Your account (our
 * team). Each action works on the signed-in person's own account, whoever
 * they are and whichever business or client they have open; the forms say
 * which page they're on (`from`) to come back to it. Messages are the
 * catalogs' English (src/i18n/dashboard/security.ts), translated in the
 * dashboard by the form components.
 */

export interface TwoStepState extends FormState {
  /** The recovery codes, shown once. */
  codes?: string[];
}

const pageOf = (formData: FormData) => (formData.get("from") === "admin" ? "/admin/account" : "/dashboard/account");

async function me(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  return user;
}

const CODE_ERRORS = {
  format: "Enter the 6-digit code from your authenticator app.",
  wrong: "That code isn't right. Check that your phone's time is set automatically and try again.",
  rate: "Too many attempts. Please wait a few minutes and try again.",
} as const;

/** Starts a setup: a new secret, shown as a QR code on the page. */
export async function startTwoStepSetupAction(formData: FormData): Promise<void> {
  const user = await me();
  const page = pageOf(formData);
  await beginTwoStepSetup(await getStore(), user, encryptionKey(), new Date());
  redirect(`${page}?setup=1#two-step`);
}

/** Leaves a setup that waits for its first code. */
export async function cancelTwoStepSetupAction(formData: FormData): Promise<void> {
  const user = await me();
  const store = await getStore();
  if (!(await hasTwoStep(store, user.id))) await store.deleteTwoFactor(user.id);
  redirect(`${pageOf(formData)}#two-step`);
}

/** The first code turns it on; the recovery codes come back to show once. */
export async function confirmTwoStepSetupAction(_: TwoStepState, formData: FormData): Promise<TwoStepState> {
  const user = await me();
  const result = await confirmTwoStepSetup(await getStore(), user, String(formData.get("code") ?? ""), encryptionKey(), new Date());
  if (!result.ok) {
    if (result.error === "on") return { message: "Two-step sign-in is already on." };
    if (result.error === "none") return { message: "Start the setup again." };
    return { errors: { code: CODE_ERRORS[result.error] } };
  }
  await mailTwoStepChange(user, true, { admin: formData.get("from") === "admin" });
  // The page isn't refreshed here: the codes stay on screen until "I've saved them" opens it again.
  return { ok: true, message: "Two-step sign-in is on. Next time you sign in, Yallapp asks for a code from your app.", codes: result.recoveryCodes };
}

/** Ten new recovery codes for a current code. */
export async function renewRecoveryCodesAction(_: TwoStepState, formData: FormData): Promise<TwoStepState> {
  const user = await me();
  const result = await renewRecoveryCodes(await getStore(), user, String(formData.get("code") ?? ""), encryptionKey(), new Date());
  if (!result.ok) {
    if (result.error === "off") return { message: "Two-step sign-in isn't on." };
    return { errors: { code: CODE_ERRORS[result.error] } };
  }
  return { ok: true, message: "Your new recovery codes are below. The old ones no longer work.", codes: result.recoveryCodes };
}

/** Turns it off with the password and a current code (or a recovery code). */
export async function turnOffTwoStepAction(_: TwoStepState, formData: FormData): Promise<TwoStepState> {
  const user = await me();
  const password = String(formData.get("currentPassword") ?? "");
  if (!password) return { errors: { currentPassword: "Enter your password." } };
  const result = await turnOffTwoStep(await getStore(), user, { password, code: String(formData.get("code") ?? "") }, encryptionKey(), new Date());
  if (!result.ok) {
    if (result.error === "off") return { message: "Two-step sign-in isn't on." };
    if (result.error === "password") return { errors: { currentPassword: "The password is incorrect." } };
    if (result.error === "rate") return { message: CODE_ERRORS.rate };
    if (result.error === "format") return { errors: { code: "Enter the 6-digit code from your authenticator app, or a recovery code." } };
    return { errors: { code: "That code isn't right. Try again, or use a recovery code." } };
  }
  await mailTwoStepChange(user, false, { admin: formData.get("from") === "admin" });
  const page = pageOf(formData);
  revalidatePath(page);
  redirect(`${page}?twostep=off#two-step`);
}

/** Every website session (this one too) and every Yallapp Business phone signed out. */
export async function signOutEverywhereAction(): Promise<void> {
  const user = await me();
  await signOutEverywhere(user);
  await endSession();
  redirect("/sign-in");
}
