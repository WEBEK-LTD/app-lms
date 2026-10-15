"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, AppLayoutRecord } from "@/lib/data/types";
import { designById, designFits } from "@/lib/pages/designs";
import { discardDraft, hasUnpublishedChanges, publishLayout, saveDesignDraft, saveDraft } from "@/lib/pages/layout";
import type { LayoutContent } from "@/lib/pages/types";
import { appPlan } from "@/lib/entitlements";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";

// 10.4 The page and look editor's saves: the draft, publishing and discarding it.

export type LayoutSaveResult =
  | {
      ok: true;
      draft: LayoutContent;
      savedAt: string;
      published: { version: string; at: string } | null;
      changes: boolean;
      message?: string;
    }
  | { ok: false; errors: string[] };

async function requireLayoutApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

function result(record: AppLayoutRecord, message?: string): LayoutSaveResult {
  return {
    ok: true,
    draft: record.draft,
    savedAt: record.draftUpdatedAt.toISOString(),
    published: record.published && record.publishedAt ? { version: record.published.version, at: record.publishedAt.toISOString() } : null,
    changes: hasUnpublishedChanges(record),
    message,
  };
}

function parseJson(json: string): unknown {
  if (json.length > 1_000_000) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

/** Saves the draft; apps don't see it until it's published. */
export async function saveLayoutDraftAction(json: string): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const saved = await saveDraft(await getStore(), app, parseJson(json), new Date());
  return saved.ok ? result(saved.value) : saved;
}

export async function publishLayoutAction(json: string): Promise<LayoutSaveResult> {
  const { app, user, staff, license } = await requireLayoutApp();
  const store = await getStore();
  const now = new Date();
  // 13.1 The published layout keeps to the app's plan (its languages).
  const published = await publishLayout(store, app, parseJson(json), (staff ?? user).email, now, await appPlan(store, license, now));
  if (!published.ok) return published;
  revalidatePath("/dashboard/pages");
  // 31 A WordPress site fetches the layout when asked, instead of within 15 minutes.
  if (app.backend === "wordpress") {
    refreshSitesSoon([app.id]);
    return result(published.value, "Published. Your website gets the new pages within a minute when it can be reached (otherwise within 15 minutes), and your app shows them the next time it opens.");
  }
  return result(published.value, "Published. Your app shows the new pages the next time it opens.");
}

/**
 * 33 Replaces the draft with a ready-made design for the app's kind (the
 * editor asked the owner first). What's published stays until they publish.
 */
export async function applyDesignAction(designId: string): Promise<LayoutSaveResult & { samples?: Record<string, string> }> {
  const { app } = await requireLayoutApp();
  const store = await getStore();
  const design = designById(designId);
  if (!design || !designFits(design, app)) return { ok: false, errors: ["This design isn't available for your app. Choose another one."] };
  const now = new Date();
  const saved = await saveDesignDraft(store, app, design, now);
  if (!saved.ok) return saved;
  revalidatePath("/dashboard/pages");
  return { ...result(saved.value.record, `Your draft now uses the ${design.name} design. Change anything you like, then publish.`), samples: saved.value.samples };
}

/** Back to the published layout (or the defaults). */
export async function discardLayoutDraftAction(): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const record = await discardDraft(await getStore(), app, new Date());
  return result(record, record.published ? "Draft discarded. You're back to the published pages." : "Draft discarded. You're back to the starting pages.");
}
