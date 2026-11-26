"use server";

import { redirect } from "next/navigation";
import { confirmEmail, emailConfirmMail } from "@/lib/auth/email-confirm";
import { getCurrentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { sendMail } from "@/lib/mail";

/** 231 Confirm (on /confirm-email): the link's email is recorded as the person's. */
export async function confirmEmailAction(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  const result = await confirmEmail(await getStore(), token, new Date());
  redirect(`/confirm-email?${result.ok ? "done=1" : `error=${result.reason}`}`);
}

/** 231 "Send me a confirmation email", for the signed-in Yallapp user (from the community's sign-in page). */
export async function sendEmailConfirmationAction(form: FormData): Promise<void> {
  const back = String(form.get("back") ?? "");
  const user = await getCurrentUser();
  if (user) {
    const mail = await emailConfirmMail(await getStore(), user, new Date());
    if (mail) await sendMail(mail);
  }
  redirect(back.startsWith("/link-community?") ? `${back}&sent=1` : "/");
}
