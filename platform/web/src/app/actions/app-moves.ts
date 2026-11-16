"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveMove, closeMove } from "@/lib/apps/move";
import { auditBoth, finishMove } from "@/lib/apps/move-finish";
import { checkMoveLink } from "@/lib/apps/move-link";
import { getAdminRole, getCurrentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";

/**
 * 132.113 The owner of the account an app (or its plan) leaves approves or
 * declines the move on their page, opened from the email's signed link:
 * only the owner themselves, signed in (not their team, not ours), while
 * the request waits. Approving moves it at once.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownersRequest(formData: FormData) {
  const id = String(formData.get("requestId") ?? "");
  const back = (query: string) => redirect(`/dashboard/app-moves/${UUID.test(id) ? id : "x"}?${query}`);
  if (!UUID.test(id)) back("link=bad");
  const link = { expires: formData.get("expires"), sig: formData.get("sig") };
  const page = `expires=${encodeURIComponent(String(link.expires ?? ""))}&sig=${encodeURIComponent(String(link.sig ?? ""))}`;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const store = await getStore();
  const request = await store.getAppMoveRequest(id);
  // The account's own user only: not someone on its team, not ours.
  const from = request ? await store.getClientById(request.fromClientId) : null;
  if (!request || !from || from.userId !== user.id || (await getAdminRole())) back(`${page}&owner=no`);
  if (checkMoveLink(id, link) !== "valid") back(`${page}&link=bad`);
  return { request: request!, store, page, owner: user, back };
}

export async function approveMoveAction(formData: FormData): Promise<void> {
  const { request, store, page, owner, back } = await ownersRequest(formData);
  const now = new Date();
  const approved = await approveMove({ store, now, secret: signingSecret() }, request, "owner");
  if (!approved.ok) {
    if (approved.reason === "expired") await auditBoth(owner, "app.move_expired", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, "The move's code expired after 15 minutes");
    back(`${page}&state=${approved.reason}`);
    return;
  }
  await auditBoth(owner, "app.move_approved", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `${owner.name} approved the move on their page`);
  const done = await finishMove(null, approved.request, "owner");
  revalidatePath("/dashboard", "layout");
  back(`${page}&state=${done.ok ? "approved" : "failed"}`);
}

export async function declineMoveAction(formData: FormData): Promise<void> {
  const { request, store, page, owner, back } = await ownersRequest(formData);
  if (await closeMove({ store, now: new Date(), secret: signingSecret() }, request, "declined", "owner")) {
    await auditBoth(owner, "app.move_declined", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `${owner.name} declined the move on their page: nothing moved`);
  }
  back(`${page}&state=declined`);
}
