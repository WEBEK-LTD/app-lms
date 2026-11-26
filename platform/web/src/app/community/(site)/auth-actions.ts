"use server";

import { redirect } from "next/navigation";
import { cmTarget } from "@/components/community/site/redirect";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";

/** 231 Joining and logging in: email and password, Apple, Google. Area A's module makes the session and sets its cookies. */

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Only this site's own pages are gone back to after signing in. */
function safeNext(value: string): string {
  return value.startsWith(cmLinks.home()) && !value.startsWith("//") ? value : cmLinks.home();
}

type W = Awaited<ReturnType<typeof siteContext>>["w"];

function authError(w: W, code: string): FormState {
  const error =
    code === "invalid_credentials" ? w.errorCredentials
    : code === "email_taken" ? w.errorEmailTaken
    : code === "account_suspended" ? w.errorSuspended
    : code === "provider_not_configured" || code === "not_ready" ? w.errorNotReady
    : code === "invalid_token" ? w.errorProvider
    : code === "rate_limited" ? w.errorRate
    : w.errorGeneric;
  return { error, at: Date.now() };
}

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w, lang } = await siteContext();
  const name = text(form, "name").slice(0, 80);
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (name.length < 1) return { error: w.errorName, at: Date.now() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: w.errorEmail, at: Date.now() };
  if (password.length < 8) return { error: w.errorPassword, at: Date.now() };
  const r = await source.signUpEmail({ email, password, name, lang });
  if (!r.ok) return authError(w, r.code);
  redirect(await cmTarget(safeNext(text(form, "next"))));
}

export async function logInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await siteContext();
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: w.errorCredentials, at: Date.now() };
  const r = await source.logInEmail({ email, password });
  if (!r.ok) return authError(w, r.code);
  redirect(await cmTarget(safeNext(text(form, "next"))));
}

/** Apple's or Google's identity token, from their sign-in on this page. */
export async function continueAction(provider: "apple" | "google", input: { idToken: string; nonce?: string; name?: string; next: string }): Promise<FormState> {
  const { w, lang } = await siteContext();
  if (!input.idToken) return { error: w.errorProvider, at: Date.now() };
  const r = await source.continueWith(provider, { idToken: input.idToken, nonce: input.nonce, name: input.name?.slice(0, 80), lang });
  if (!r.ok) return authError(w, r.code);
  redirect(await cmTarget(safeNext(input.next)));
}

export async function signOutAction(): Promise<void> {
  await source.signOut();
  redirect(await cmTarget(cmLinks.welcome()));
}

export async function newPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await siteContext();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: w.errorPassword, at: Date.now() };
  const r = await source.confirmPasswordReset(text(form, "token"), password);
  if (!r.ok) return { error: r.code === "invalid_token" ? w.errorResetLink : w.errorGeneric, at: Date.now() };
  redirect(await cmTarget(`${cmLinks.signIn()}?reset=1`));
}

export async function resetAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await siteContext();
  const email = text(form, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: w.errorEmail, at: Date.now() };
  await source.requestPasswordReset(email);
  // The same answer whether or not the email is a member's.
  return { ok: w.resetSent, at: Date.now() };
}
