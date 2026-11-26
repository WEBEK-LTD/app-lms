"use server";

import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { checkDelete } from "@/components/community/site/delete-check";
import { cmLinks } from "@/components/community/site/links";
import { CM_DELETE } from "@/components/community/site/privacy-words";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";

/** 231 Deleting the account on the website: the typed DELETE, then the password or a fresh Apple/Google sign-in, then area A's DELETE /me. */
export async function deleteAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { lang, viewer } = await siteContext();
  const d = CM_DELETE[lang];
  if (!viewer) redirect(cmLinks.signIn(cmLinks.deleteAccountForm()));
  const info = await source.deletionInfo();
  if (!info) return { error: d.errorGeneric, at: Date.now() };
  const check = checkDelete({
    hasPassword: info.hasPassword,
    password: String(form.get("password") ?? ""),
    confirm: String(form.get("confirm") ?? ""),
    signedInAt: info.signedInAt,
    now: new Date(),
  });
  if (!check.ok) return { error: check.error === "confirm" ? d.errorConfirm : check.error === "password" ? d.errorPassword : d.errorFresh, at: Date.now() };
  const r = await source.deleteAccount(check.body);
  if (!r.ok) return { error: r.code === "invalid_credentials" ? d.errorPassword : d.errorGeneric, at: Date.now() };
  redirect(cmLinks.deleteAccount(true));
}

/** An Apple or Google member signs in again, then comes back to the form. */
export async function signInAgainAction(): Promise<void> {
  await source.signOut();
  redirect(cmLinks.signIn(cmLinks.deleteAccountForm()));
}
