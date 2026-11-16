import "server-only";
import { revalidatePath } from "next/cache";
import { recordAudit } from "../admin/audit";
import { regenerateLicenseKey } from "../admin/clients";
import { appLabel } from "../app/label";
import { getBlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import { getStore } from "../data";
import type { AppMoveRequest, User } from "../data/types";
import { encryptionKey, signingSecret } from "../env";
import { performMove, performPlanMove } from "./move";
import { sendMoveDone } from "./move-notify";

/**
 * 132.112 Finishing an approved move (by the owner on their page, or the
 * code typed by our team): the move or the plan move, the "done" emails to
 * both accounts and an entry in each account's audit log, in the name of
 * the team member who asked (or typed the code).
 */

type Actor = Pick<User, "id" | "email">;

async function ownerName(clientId: string): Promise<string> {
  const store = await getStore();
  const client = await store.getClientById(clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  return user?.name ?? "a client";
}

/** One entry in each account's log (once when it's the same account). */
export async function auditBoth(actor: Actor, action: Parameters<typeof recordAudit>[0]["action"], clients: string[], target: { type: "app" | "client"; id: string }, summary: string, after?: unknown) {
  for (const clientId of [...new Set(clients)]) await recordAudit({ actor, action, target, clientId, summary, ...(after === undefined ? {} : { after }) });
}

function revalidateClients(...ids: string[]) {
  revalidatePath("/admin", "layout");
  for (const id of ids) revalidatePath(`/admin/clients/${id}`);
}

/** An uploaded file copied under a new key in the same store. */
export async function copyBlob(key: string): Promise<string | null> {
  const blobs = getBlobStore();
  const file = await blobs.get(key);
  if (!file) return null;
  const extension = key.match(/\.[^./]+$/)?.[0] ?? "";
  const copy = `${key.slice(0, key.length - extension.length)}-${newId()}${extension}`;
  await blobs.put(copy, file.data, file.contentType);
  return copy;
}

/** Finishes an approved request: the move or the plan move, the emails to both accounts and the log. */
export async function finishMove(admin: Actor | null, request: AppMoveRequest, by: string): Promise<{ ok: true; appId: string } | { ok: false; note: string }> {
  const store = await getStore();
  const now = new Date();
  const actor = admin ?? { id: request.requestedBy, email: request.requestedByEmail };
  const who = by === "owner" ? "approved by the owner on their page" : `the code given by the owner, typed by ${by}`;
  if (request.kind === "plan") {
    const done = await performPlanMove({ store, now, secret: signingSecret(), newLicenseKey: async (clientId, appId) => void (await regenerateLicenseKey(store, clientId, encryptionKey(), now, appId)) }, request);
    if (!done.ok) {
      await auditBoth(actor, "app.moved", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `Moving a plan stopped: ${done.note}`);
      return done;
    }
    await sendMoveDone(store, { request, app: done.from, toApp: done.to, now });
    await auditBoth(actor, "app.moved", [request.fromClientId, request.toClientId], { type: "app", id: done.to.id }, `Moved the plan of ${appLabel(done.from)} to ${appLabel(done.to)} (${who})`, { fromAppId: done.from.id, toAppId: done.to.id });
    revalidateClients(request.fromClientId, request.toClientId);
    return { ok: true, appId: done.to.id };
  }
  const result = await performMove({ store, now, secret: signingSecret(), copyBlob }, request);
  if (!result.ok) {
    await auditBoth(actor, "app.moved", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `Moving the app stopped: ${result.note}`);
    return result;
  }
  await sendMoveDone(store, { request, app: result.done.app, now });
  const choices = `data ${request.moveData ? "moved" : "stayed"}, subscription ${request.moveSubscription ? "moved" : "stayed"}`;
  await auditBoth(
    actor,
    "app.moved",
    [request.fromClientId, request.toClientId],
    { type: "app", id: result.done.app.id },
    `Moved ${appLabel(result.done.app)} from ${await ownerName(request.fromClientId)}'s account to ${await ownerName(request.toClientId)}'s (${choices}; ${who})`,
    { moveData: request.moveData, moveSubscription: request.moveSubscription, archiveAppId: result.done.archive.id },
  );
  revalidateClients(request.fromClientId, request.toClientId);
  return { ok: true, appId: result.done.app.id };
}

