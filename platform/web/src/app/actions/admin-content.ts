"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { contentPage, readContentForm, type ContentPage } from "@/lib/content/site";
import { langContentKey } from "@/lib/content/site-lang";
import { BASE_FIELD, baseToRecord } from "@/lib/content/legal-updates";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { isPrefixedLang, LANG_INFO, type PrefixedLang } from "@/i18n/config";

/** Rebuilds the pages that show this content, so the change is on yallapp.com.tr at once (55 in every language: English texts show where a translation has none). */
function rebuild(page: ContentPage) {
  revalidatePath(page.revalidate.path, page.revalidate.type);
  // 55 The Arabic and Turkish pages: /[lang] and the same path below it.
  const path = page.revalidate.path === "/" ? "/[lang]" : `/[lang]${page.revalidate.path}`;
  revalidatePath(path, page.revalidate.type ?? "page");
  revalidatePath("/admin/content", "layout");
}

/** 55 The language a form edits: English (the page's own texts) or a translation. */
function formLang(formData: FormData): PrefixedLang | null {
  const lang = formData.get("lang");
  return isPrefixedLang(lang) ? lang : null;
}

export async function saveSiteContentAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) return { message: "This page can't be edited." };
  const lang = formLang(formData);
  const values: Record<string, string> = {};
  for (const field of page.fields) values[field.name] = String(formData.get(field.name) ?? "");
  const read = readContentForm(page, values, { translation: lang !== null });
  if (!read.ok) return { errors: read.errors, values };
  const store = await getStore();
  const key = lang ? langContentKey(page.key, lang) : page.key;
  const before = (await store.getSiteContent(key))?.fields ?? null;
  const name = lang ? `${page.title} (${LANG_INFO[lang].name})` : page.title;
  // 172 A legal page's text keeps the version of the default it's based on (sent by the form), so a later change to the default is noticed.
  const fields: Record<string, string> = { ...read.fields };
  const base = page.group === "Legal pages" && fields.body !== undefined ? baseToRecord(page.key, lang ?? "en", formData.get("base")) : null;
  if (base) fields[BASE_FIELD] = base;
  await store.setSiteContent(key, Object.keys(read.fields).length ? fields : null, admin.email, new Date());
  await recordAudit({ actor: admin, action: "content.update", target: { type: "content", id: key }, summary: `Saved ${name}`, before, after: fields });
  rebuild(page);
  return { ok: true, message: `${name} saved. It shows on the website now.`, values: read.fields };
}

export async function resetSiteContentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const page = contentPage(String(formData.get("key") ?? ""));
  if (!page) redirect("/admin/content");
  const lang = formLang(formData);
  const store = await getStore();
  const key = lang ? langContentKey(page.key, lang) : page.key;
  const before = (await store.getSiteContent(key))?.fields ?? null;
  await store.setSiteContent(key, null, admin.email, new Date());
  const name = lang ? `${page.title} (${LANG_INFO[lang].name})` : page.title;
  await recordAudit({ actor: admin, action: "content.reset", target: { type: "content", id: key }, summary: `Put ${name} back to the default text`, before });
  rebuild(page);
  redirect(`/admin/content/${page.key}?done=reset${lang ? `&lang=${lang}` : ""}`);
}
