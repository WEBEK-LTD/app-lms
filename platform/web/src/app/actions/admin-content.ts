"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { contentPage, readContentForm, type ContentPage } from "@/lib/content/site";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";

/** Rebuilds the pages that show this content, so the change is on yallapp.com.tr at once. */
function rebuild(page: ContentPage) {
  revalidatePath(page.revalidate.path, page.revalidate.type);
  revalidatePath("/admin/content", "layout");
}

export async function saveSiteContentAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) return { message: "This page can't be edited." };
  const values: Record<string, string> = {};
  for (const field of page.fields) values[field.name] = String(formData.get(field.name) ?? "");
  const read = readContentForm(page, values);
  if (!read.ok) return { errors: read.errors, values };
  const store = await getStore();
  const before = (await store.getSiteContent(page.key))?.fields ?? null;
  await store.setSiteContent(page.key, read.fields, admin.email, new Date());
  await recordAudit({ actor: admin, action: "content.update", target: { type: "content", id: page.key }, summary: `Saved ${page.title}`, before, after: read.fields });
  rebuild(page);
  return { ok: true, message: `${page.title} saved. It shows on the website now.`, values: read.fields };
}

export async function resetSiteContentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) redirect("/admin/content");
  const store = await getStore();
  const before = (await store.getSiteContent(page.key))?.fields ?? null;
  await store.setSiteContent(page.key, null, admin.email, new Date());
  await recordAudit({ actor: admin, action: "content.reset", target: { type: "content", id: page.key }, summary: `Put ${page.title} back to the default text`, before });
  rebuild(page);
  redirect(`/admin/content/${page.key}?done=reset`);
}
