"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelAccountDeletion, requestAccountDeletion, type DeletionDeps } from "@/lib/account/deletion";
import { COUNTRY_MESSAGES, parseCountry } from "@/lib/account/country";
import { clientFor } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import { dashboardLang } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";

/**
 * 66 Dashboard › Your account (and the waiting page): the owner asks to
 * delete their Yallapp account, or cancels the request. The rules are in
 * lib/account/deletion.ts. Pending and suspended accounts can ask too, so
 * this checks the signed-in person, not the account's state.
 */

async function deletionDeps(): Promise<DeletionDeps> {
  return {
    store: await getStore(),
    now: new Date(),
    mail: async (key, to, values, lang) => {
      await sendTemplate(key, to, values, { lang });
    },
    teamEmail: (await getContact()).email,
    baseUrl: appUrl(),
  };
}

/** Where the form was: the waiting page, else Dashboard › Your account. */
const pageOf = (formData: FormData) => (formData.get("from") === "pending" ? "/pending" : "/dashboard/account");

export async function requestAccountDeletionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("dashboard");
  if (!context) redirect("/sign-in");
  const values = { confirmEmail: String(formData.get("confirmEmail") ?? ""), reason: String(formData.get("reason") ?? "") };
  const result = await requestAccountDeletion(await deletionDeps(), context, {
    password: String(formData.get("password") ?? ""),
    confirmEmail: values.confirmEmail,
    reason: values.reason,
    lang: await dashboardLang(),
  });
  if (!result.ok) return { message: result.message, errors: result.errors, values };
  const page = pageOf(formData);
  revalidatePath(page);
  redirect(`${page}?deletion=requested&phones=${result.phonesSignedOut}`);
}

export async function cancelAccountDeletionAction(formData: FormData): Promise<void> {
  const context = await clientFor("dashboard");
  if (!context) redirect("/sign-in");
  const result = await cancelAccountDeletion(await deletionDeps(), context);
  const page = pageOf(formData);
  revalidatePath(page);
  redirect(result.ok ? `${page}?deletion=cancelled` : page);
}

/**
 * 73 Dashboard › Your account › Your country (52.9): the owner (or our team
 * managing the dashboard) sets the account's country, which decides the
 * currency of Yallapp's prices, the WhatsApp number shown and the receipts'
 * time zone (lib/account/country.ts). Team members can't.
 */
export async function saveAccountCountryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("dashboard");
  if (!context) redirect("/sign-in");
  const values = { country: String(formData.get("country") ?? "") };
  if (context.member) return { message: COUNTRY_MESSAGES.owner, values };
  const country = parseCountry(values.country);
  if (!country) return { errors: { country: COUNTRY_MESSAGES.invalid }, values };
  await (await getStore()).updateClient(context.client.id, { country }, new Date());
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: COUNTRY_MESSAGES.saved, values: { country } };
}
