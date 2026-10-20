"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, AppLayoutRecord } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { isLanguageCode } from "@/lib/i18n/locales";
import { applyTranslations } from "@/lib/i18n/translations";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { hasUnpublishedChanges, loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import { switchDefaultLanguage } from "@/lib/pages/model";

// 43 The Languages page: the app's languages, and every text in each of them, saved to the Pages & look draft.

export type TranslationsResult = { ok: true; message: string; savedAt: string; changes: boolean; published: string | null } | { ok: false; errors: string[] };

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

function done(record: AppLayoutRecord, message: string): TranslationsResult {
  return { ok: true, message, savedAt: record.draftUpdatedAt.toISOString(), changes: hasUnpublishedChanges(record), published: record.published?.version ?? null };
}

/** The languages in the app's order, and the default; a new default takes its translations as the main texts. */
export async function saveLanguagesAction(input: { available: string[]; default: string }): Promise<TranslationsResult> {
  const { app } = await requireApp();
  const available = Array.isArray(input?.available) ? input.available.filter(isLanguageCode) : [];
  if (!isLanguageCode(input?.default) || !available.includes(input.default)) return { ok: false, errors: ["Choose the default language from the app's languages."] };
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const switched = input.default === record.draft.languages.default ? record.draft : switchDefaultLanguage(record.draft, input.default);
  const saved = await saveDraft(store, app, { ...switched, strings: switched.strings ?? {}, languages: { default: input.default, available } }, now);
  if (!saved.ok) return saved;
  revalidatePath("/dashboard/languages");
  return done(saved.value, "Languages saved to your draft. Publish to send them to your app.");
}

/** The owner's texts in one language: row ID, then text (empty brings back Yallapp's or the default text). */
export async function saveTranslationsAction(lang: string, changes: Record<string, string>): Promise<TranslationsResult> {
  const { app } = await requireApp();
  if (!isLanguageCode(lang)) return { ok: false, errors: ["Choose a language."] };
  if (!changes || typeof changes !== "object" || Object.keys(changes).length > 5000) return { ok: false, errors: ["Nothing to save."] };
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  if (!record.draft.languages.available.includes(lang)) return { ok: false, errors: ["Add this language to the app first."] };
  const next = applyTranslations(record.draft, lang, changes);
  const saved = await saveDraft(store, app, { ...next, strings: next.strings ?? {} }, now);
  if (!saved.ok) return saved;
  revalidatePath("/dashboard/languages");
  return done(saved.value, "Saved to your draft. Publish to send your translations to your app.");
}

/** Publishes the draft, with the pages, as Pages & look does. */
export async function publishTranslationsAction(): Promise<TranslationsResult> {
  const { app, user, staff, license } = await requireApp();
  const store = await getStore();
  const now = new Date();
  const published = await publishLayout(store, app, undefined, (staff ?? user).email, now, await appPlan(store, license, now));
  if (!published.ok) return published;
  revalidatePath("/dashboard/languages");
  revalidatePath("/dashboard/pages");
  if (app.backend === "wordpress") {
    refreshSitesSoon([app.id]);
    return done(published.value, "Published. Your website gets it within a minute when it can be reached, and your app shows it the next time it opens.");
  }
  return done(published.value, "Published. Your app shows your languages and translations the next time it opens.");
}
