"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { renderEmail } from "@/lib/email/send";
import { emailTemplate, readTemplateForm, sampleValues } from "@/lib/email/templates";
import type { FormState } from "@/lib/forms";
import { sendMail } from "@/lib/mail";

export async function saveEmailTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const template = emailTemplate(String(formData.get("key") ?? ""));
  if (!template) return { message: "This email can't be edited." };
  const values = { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") };
  const read = readTemplateForm(template, values);
  if (!read.ok) return { errors: read.errors, values };
  // audit: email_template.update
  await (await getStore()).setEmailTemplate(template.key, read.text, admin.email, new Date());
  revalidatePath("/admin/emails", "layout");
  return { ok: true, message: `${template.name} saved. The next ${template.name.toLowerCase()} email uses it.`, values: { ...read.text } };
}

export async function resetEmailTemplateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const template = emailTemplate(String(formData.get("key") ?? ""));
  if (!template) redirect("/admin/emails");
  // audit: email_template.reset
  await (await getStore()).setEmailTemplate(template.key, null, admin.email, new Date());
  revalidatePath("/admin/emails", "layout");
  redirect(`/admin/emails/${template.key}?done=reset`);
}

/** Sends the saved template, with sample values, to the admin who asks. */
export async function sendTestTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const template = emailTemplate(String(formData.get("key") ?? ""));
  if (!template) return { message: "This email doesn't exist." };
  try {
    const email = await renderEmail(await getStore(), template.key, sampleValues(template));
    await sendMail({ to: admin.email, subject: `[Test] ${email.subject}`, text: email.text, html: email.html });
  } catch (e) {
    return { message: `The email couldn't be sent: ${e instanceof Error ? e.message : "unknown error"}.` };
  }
  return { ok: true, message: `Test email sent to ${admin.email}, with sample values.` };
}
