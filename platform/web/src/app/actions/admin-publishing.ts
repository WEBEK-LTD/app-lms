"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PublishingRequest, PublishingStatus, PublishingStore } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { notifyPublishingStatus } from "@/lib/publishing/service";
import { PUBLISHING_STATUS_LABEL, requestStores, STORE_TITLE, trackChangeProblems, trackOf } from "@/lib/publishing/steps";

const ID = /^[0-9a-f-]{36}$/i;

async function requestFrom(formData: FormData) {
  const admin = await requireAdmin("publishing.manage");
  const store = await getStore();
  const appId = String(formData.get("appId") ?? "");
  const request = ID.test(appId) ? await store.getPublishingRequest(appId) : null;
  return { admin, store, request };
}

/**
 * The team moves one store's publishing to a new status, with a note to the
 * client and, once live, the store link. A new status is recorded in the
 * history and emailed to the client (the "Publishing status changed" email).
 */
export async function updatePublishingTrackAction(_: FormState, formData: FormData): Promise<FormState> {
  const { admin, store, request } = await requestFrom(formData);
  const asked = String(formData.get("store") ?? "");
  // 35, 36 Also Galaxy Store and AppGallery, when the request covers them.
  const which: PublishingStore = asked === "ios" || asked === "galaxy" || asked === "huawei" ? asked : "android";
  const values = {
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? "").trim(),
    storeUrl: String(formData.get("storeUrl") ?? "").trim(),
  };
  if (!request || request.mode !== "managed") return { message: "This app's publishing request isn't open any more.", values };
  if (!requestStores(request).includes(which)) return { message: `The client no longer wants the app on ${STORE_TITLE[which]}.`, values };
  const errors = trackChangeProblems(which, values);
  if (Object.keys(errors).length) return { errors, values };

  const now = new Date();
  const before = trackOf(request, which);
  const status = values.status as PublishingStatus;
  const changed = status !== before.status;
  const track = { status, note: values.note || null, storeUrl: values.storeUrl || null, updatedAt: changed ? now : before.updatedAt };
  if (!changed && track.note === before.note && track.storeUrl === before.storeUrl) return { ok: true, message: "Nothing changed.", values };
  const next: PublishingRequest = { ...request, [which]: track, updatedAt: now };
  await store.savePublishingRequest(next);
  if (changed) await store.addPublishingEvent({ appId: request.appId, store: which, status, note: track.note, actorEmail: admin.email, at: now });

  const app = await store.getAppById(request.appId);
  await recordAudit({
    actor: admin,
    action: "publishing.status",
    target: { type: "app", id: request.appId },
    clientId: request.clientId,
    summary: changed
      ? `${STORE_TITLE[which]}: ${PUBLISHING_STATUS_LABEL[before.status]} → ${PUBLISHING_STATUS_LABEL[status]} (${appLabel(app)})`
      : `${STORE_TITLE[which]}: changed the note or store link (${appLabel(app)})`,
    before,
    after: track,
  });
  // Only a new status is emailed; a corrected note or link shows on the dashboard.
  if (changed) await notifyPublishingStatus(store, next, which);
  revalidatePath("/admin/publishing");
  revalidatePath("/dashboard/publishing");
  return {
    ok: true,
    message: changed ? `${STORE_TITLE[which]} is now “${PUBLISHING_STATUS_LABEL[status]}”. The client has been emailed.` : "Saved.",
    values,
  };
}

/** The team's own notes on a request: never shown to the client. */
export async function savePublishingTeamNotesAction(_: FormState, formData: FormData): Promise<FormState> {
  const { admin, store, request } = await requestFrom(formData);
  const teamNotes = String(formData.get("teamNotes") ?? "").trim();
  if (!request) return { message: "This app's publishing request couldn't be found.", values: { teamNotes } };
  if (teamNotes.length > 5000) return { errors: { teamNotes: "Keep the notes under 5,000 characters." }, values: { teamNotes } };
  await store.savePublishingRequest({ ...request, teamNotes: teamNotes || null, updatedAt: new Date() });
  const app = await store.getAppById(request.appId);
  await recordAudit({
    actor: admin,
    action: "publishing.notes",
    target: { type: "app", id: request.appId },
    clientId: request.clientId,
    summary: `Saved the publishing notes (${appLabel(app)})`,
    before: { teamNotes: request.teamNotes },
    after: { teamNotes: teamNotes || null },
  });
  revalidatePath("/admin/publishing");
  return { ok: true, message: "Notes saved.", values: { teamNotes } };
}
