"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { isSetupComplete, queueBuild } from "@/lib/app/setup";
import { assetUrl } from "@/lib/assets";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { startPipeline } from "@/lib/builds/dispatch";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import type { DataStore } from "@/lib/data/store";
import type { App, PublishingRequest } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { notifyPublishingTeam } from "@/lib/publishing/service";
import {
  APP_STORE_CATEGORIES,
  applyChecklist,
  canUseManagedPublishing,
  checklistProgress,
  newPublishingRequest,
  PLAY_CATEGORIES,
} from "@/lib/publishing/steps";

/** The dashboard's current app, for an active client (or our team managing them). */
async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

const PAGE = "/dashboard/publishing";

/**
 * Marks the request ready when every step is done and the listing is
 * complete (and tells the team the first time), or not ready again when a
 * step was unticked. Saves it.
 */
async function saveWithReadiness(store: DataStore, context: ClientContext & { app: App }, request: PublishingRequest, now: Date): Promise<PublishingRequest> {
  const app = (await store.getAppById(context.app.id)) ?? context.app;
  const { complete } = checklistProgress(request, app);
  const becameReady = complete && request.readyAt === null;
  const next: PublishingRequest = { ...request, readyAt: complete ? (request.readyAt ?? now) : null, updatedAt: now };
  await store.savePublishingRequest(next);
  if (becameReady && next.mode === "managed") {
    await notifyPublishingTeam(store, { user: context.user, client: context.client, app, event: "finished the publishing checklist" });
  }
  return next;
}

/** "I'll publish it myself" or "Publish it for me", for the current app. */
export async function choosePublishingModeAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const mode = formData.get("mode");
  if (mode !== "self" && mode !== "managed") redirect(PAGE);
  const store = await getStore();
  const now = new Date();
  if (mode === "managed" && !canUseManagedPublishing(await appPlan(store, context.license, now))) redirect(`${PAGE}?error=not-included`);
  const existing = await store.getPublishingRequest(context.app.id);
  const request: PublishingRequest = existing
    ? { ...existing, mode, requestedAt: mode === "managed" ? (existing.requestedAt ?? now) : existing.requestedAt, updatedAt: now }
    : newPublishingRequest(context.app, mode, now);
  await store.savePublishingRequest(request);
  // Managed: our team publishes through invitations, so the setup's Publishing step (store keys) is done for them.
  await store.updateApp(context.app.id, { publishingMode: mode, ...(mode === "managed" && !context.app.publishingDoneAt ? { publishingDoneAt: now } : {}) }, now);
  await recordStaffChange(context, mode === "managed" ? "Chose “Publish it for me”" : "Chose “I'll publish it myself”", { publishingMode: context.app.publishingMode }, { publishingMode: mode });
  if (mode === "managed" && existing?.mode !== "managed") {
    await notifyPublishingTeam(store, { user: context.user, client: context.client, app: context.app, event: "asked us to publish their app" });
  }

  // That may have completed the setup: the first build starts, as when the last setup step is saved.
  const app = (await store.getAppById(context.app.id))!;
  if (mode === "managed" && isSetupComplete(app, context.license?.plan ?? null) && (await store.listBuildsByApp(app.id, 1)).length === 0) {
    const result = await queueBuild(store, { client: context.client, app, license: context.license, versionName: "1.0.0" }, now, assetUrl);
    if (result.ok) await startPipeline();
  }
  revalidatePath("/dashboard", "layout");
  redirect(`${PAGE}?chosen=${mode}`);
}

/** The client's checklist: which steps are done, and who creates the Firebase project. */
export async function savePublishingChecklistAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const store = await getStore();
  const request = await store.getPublishingRequest(context.app.id);
  if (!request || request.mode !== "managed") return { message: "Choose “Publish it for me” first." };
  const now = new Date();
  const firebaseBy = formData.get("firebaseBy") === "team" ? "team" : "client";
  const saved = await saveWithReadiness(
    store,
    context,
    { ...request, firebaseBy, checklist: applyChecklist(request.checklist, formData.getAll("done").map(String), now) },
    now,
  );
  await recordStaffChange(context, "Saved the publishing checklist", { checklist: request.checklist, firebaseBy: request.firebaseBy }, { checklist: saved.checklist, firebaseBy });
  revalidatePath(PAGE);
  return {
    ok: true,
    message: saved.readyAt ? "Saved. Everything is ready: our team takes it from here." : "Saved. Tick the other steps when they're done.",
  };
}

const TEXT_MAX = 2000;

/** The listing details the setup doesn't ask for: categories, content rating notes, notes for the reviewers. */
export async function savePublishingListingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const store = await getStore();
  const request = await store.getPublishingRequest(context.app.id);
  if (!request || request.mode !== "managed") return { message: "Choose “Publish it for me” first." };
  const values = {
    playCategory: String(formData.get("playCategory") ?? ""),
    appStoreCategory: String(formData.get("appStoreCategory") ?? ""),
    contentRatingNotes: String(formData.get("contentRatingNotes") ?? "").trim(),
    reviewNotes: String(formData.get("reviewNotes") ?? "").trim(),
  };
  const errors: Record<string, string> = {};
  if (!(PLAY_CATEGORIES as readonly string[]).includes(values.playCategory)) errors.playCategory = "Choose a Google Play category.";
  if (!(APP_STORE_CATEGORIES as readonly string[]).includes(values.appStoreCategory)) errors.appStoreCategory = "Choose an App Store category.";
  if (!values.contentRatingNotes) errors.contentRatingNotes = "Tell us a little about what's in your app, even “Courses only, nothing for adults”.";
  if (values.contentRatingNotes.length > TEXT_MAX) errors.contentRatingNotes = "Keep it under 2,000 characters.";
  if (values.reviewNotes.length > TEXT_MAX) errors.reviewNotes = "Keep it under 2,000 characters.";
  if (Object.keys(errors).length) return { errors, values };
  const now = new Date();
  const listing = { ...values, reviewNotes: values.reviewNotes || null };
  const saved = await saveWithReadiness(store, context, { ...request, listing }, now);
  await recordStaffChange(context, "Saved the publishing listing details", request.listing, listing);
  revalidatePath(PAGE);
  return { ok: true, message: saved.readyAt ? "Saved. Everything is ready: our team takes it from here." : "Saved.", values };
}
