"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, AppLayoutRecord } from "@/lib/data/types";
import { discardDraft, hasUnpublishedChanges, publishLayout, saveDraft } from "@/lib/pages/layout";
import type { LayoutContent } from "@/lib/pages/types";

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
  const { app, user, staff } = await requireLayoutApp();
  const published = await publishLayout(await getStore(), app, parseJson(json), (staff ?? user).email, new Date());
  if (!published.ok) return published;
  revalidatePath("/dashboard/pages");
  return result(published.value, "Published. Your app shows the new pages the next time it opens.");
}

/** Back to the published layout (or the defaults). */
export async function discardLayoutDraftAction(): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const record = await discardDraft(await getStore(), app, new Date());
  return result(record, record.published ? "Draft discarded. You're back to the published pages." : "Draft discarded. You're back to the starting pages.");
}
