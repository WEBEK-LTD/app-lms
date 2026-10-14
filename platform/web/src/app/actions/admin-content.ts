"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const admin = await requireAdmin();
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) return { message: "This page can't be edited." };
  const values: Record<string, string> = {};
  for (const field of page.fields) values[field.name] = String(formData.get(field.name) ?? "");
  const read = readContentForm(page, values);
  if (!read.ok) return { errors: read.errors, values };
  // audit: content.update
  await (await getStore()).setSiteContent(page.key, read.fields, admin.email, new Date());
  rebuild(page);
  return { ok: true, message: `${page.title} saved. It shows on the website now.`, values: read.fields };
}

export async function resetSiteContentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) redirect("/admin/content");
  // audit: content.reset
  await (await getStore()).setSiteContent(page.key, null, admin.email, new Date());
  rebuild(page);
  redirect(`/admin/content/${page.key}?done=reset`);
}
