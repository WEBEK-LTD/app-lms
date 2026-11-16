import { randomInt } from "node:crypto";
import { hmacSha256, newId, safeEqual } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppMoveRequest, Asset, User } from "../data/types";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { copiedAppRow } from "./copy";

/**
 * 132.112 Moving an app to another account, with the approval of the owner
 * of the account it leaves. Our team chooses the account it goes to and two
 * things: whether its data goes with it (its people, orders, bookings,
 * messages and activity) and whether its subscription does (its license,
 * storage packs and renewal). A 6-digit code is emailed to the owner (kept
 * hashed, 15 minutes, 5 tries, one waiting request per app); the move
 * happens when the owner approves on their page, or gives the code to the
 * team member, who types it in the admin.
 *
 * The app itself (its ID, design, content, keys, integrations, builds and
 * store listing) always moves. The account it leaves keeps a read-only
 * record of it ("Moved", lib/data/types.ts App.movedAt) with what stays:
 * the invoices it paid (always), the data when it doesn't move (archived,
 * readable, never deleted) and the subscription when it doesn't move.
 * Nothing is charged, refunded or changed at a payment gateway: a move
 * waits while a payment of the app's plan is still pending.
 */

export const MOVE_CODE_MINUTES = 15;
export const MOVE_MAX_ATTEMPTS = 5;

/** A 6-digit code. */
export function newMoveCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The code as kept: its HMAC with the request's ID, so a code works for its own request only. */
export function moveCodeHash(secret: string, requestId: string, code: string): string {
  return hmacSha256(secret, `app-move:${requestId}:${code}`);
}

/** Whether the request still waits at `now` (a waiting one past its 15 minutes has expired). */
export function moveWaiting(request: Pick<AppMoveRequest, "status" | "expiresAt">, now: Date): boolean {
  return request.status === "waiting" && request.expiresAt.getTime() > now.getTime();
}

export type MoveRefusal = "same_account" | "no_account" | "not_the_account" | "moved" | "waiting" | "payment_pending" | "too_many";

export const MOVE_REFUSALS: Record<MoveRefusal, string> = {
  same_account: "The app is already in that account. Choose another account.",
  no_account: "That account wasn't found. Search for the client again.",
  not_the_account: "That app isn't in this client's account.",
  moved: "This app has moved to another account already; what stayed here is kept to read.",
  waiting: "A move of this app is already waiting for the owner's approval. Cancel it first, or enter its code.",
  payment_pending:
    "A payment of this app's plan is still pending. Moving it now could put that payment on the wrong account, so nothing was sent. Wait until the payment is paid or has failed, then try again.",
  too_many: "Too many approval codes for this account in the last hour. Try again later.",
};

export interface MoveDeps {
  store: DataStore;
  now: Date;
  /** The secret the codes are hashed with (SIGNING_SECRET). */
  secret: string;
}

/**
 * Starts a move: checks it can be done, saves the waiting request and
 * returns it with its code (to email; it isn't kept).
 */
export async function requestAppMove(
  deps: MoveDeps,
  input: { app: App; toClientId: string; moveData: boolean; moveSubscription: boolean; by: Pick<User, "id" | "email" | "name"> },
): Promise<{ ok: true; request: AppMoveRequest; code: string } | { ok: false; reason: MoveRefusal }> {
  const { store, now } = deps;
  const { app } = input;
  if (app.movedAt) return { ok: false, reason: "moved" };
  if (app.clientId === input.toClientId) return { ok: false, reason: "same_account" };
  if (!(await store.getClientById(input.toClientId))) return { ok: false, reason: "no_account" };
  if (await store.getOpenAppMoveRequest(app.id)) return { ok: false, reason: "waiting" };
  if ((await store.listPlanPayments({ appId: app.id, status: "pending", limit: 1 })).length) return { ok: false, reason: "payment_pending" };
  if (!(await hitRateLimit(store, RATE_LIMITS.appMoveCode, app.clientId, now)).allowed) return { ok: false, reason: "too_many" };
  const id = newId();
  const code = newMoveCode();
  const request: AppMoveRequest = {
    id,
    appId: app.id,
    fromClientId: app.clientId,
    toClientId: input.toClientId,
    moveData: input.moveData,
    moveSubscription: input.moveSubscription,
    codeHash: moveCodeHash(deps.secret, id, code),
    attempts: 0,
    status: "waiting",
    requestedBy: input.by.id,
    requestedByEmail: input.by.email,
    requestedByName: input.by.name,
    createdAt: now,
    expiresAt: new Date(now.getTime() + MOVE_CODE_MINUTES * 60_000),
    closedAt: null,
    closedBy: null,
    resultAppId: null,
    note: null,
  };
  if (!(await store.createAppMoveRequest(request))) return { ok: false, reason: "waiting" };
  return { ok: true, request, code };
}

export type CodeCheck = { ok: true; request: AppMoveRequest } | { ok: false; reason: "closed" | "expired" | "wrong" | "attempts"; left?: number };

/** Closes a waiting request whose time ran out; true when its time is out. */
async function expireIfDue(deps: MoveDeps, request: AppMoveRequest): Promise<boolean> {
  if (request.status !== "waiting" || request.expiresAt.getTime() > deps.now.getTime()) return false;
  await deps.store.updateAppMoveRequest(request.id, "waiting", { status: "expired", closedAt: deps.now, note: "The code's 15 minutes ran out." });
  return true;
}

/**
 * The code given by the owner (typed by the team member, or by the owner on
 * their page): right, it approves the request (once); wrong, a try is used,
 * and the fifth wrong one closes it.
 */
export async function checkMoveCode(deps: MoveDeps, requestId: string, code: string, by: string): Promise<CodeCheck> {
  const request = await deps.store.getAppMoveRequest(requestId);
  if (!request || request.status !== "waiting") return { ok: false, reason: "closed" };
  if (await expireIfDue(deps, request)) return { ok: false, reason: "expired" };
  const attempts = await deps.store.addAppMoveAttempt(requestId);
  if (attempts === null) return { ok: false, reason: "closed" };
  if (attempts > MOVE_MAX_ATTEMPTS) return { ok: false, reason: "attempts" };
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean) || !safeEqual(moveCodeHash(deps.secret, requestId, clean), request.codeHash)) {
    if (attempts >= MOVE_MAX_ATTEMPTS) {
      await deps.store.updateAppMoveRequest(requestId, "waiting", { status: "expired", closedAt: deps.now, note: `${MOVE_MAX_ATTEMPTS} wrong codes.` });
      return { ok: false, reason: "attempts" };
    }
    return { ok: false, reason: "wrong", left: MOVE_MAX_ATTEMPTS - attempts };
  }
  return approveMove(deps, request, by);
}

/** The owner approves on their own page (signed in, from the email's signed link): once, while it waits. */
export async function approveMove(deps: MoveDeps, request: AppMoveRequest, by: string): Promise<CodeCheck> {
  if (await expireIfDue(deps, request)) return { ok: false, reason: "expired" };
  if (!(await deps.store.updateAppMoveRequest(request.id, "waiting", { status: "approved", closedAt: deps.now, closedBy: by }))) return { ok: false, reason: "closed" };
  return { ok: true, request: { ...request, status: "approved", closedAt: deps.now, closedBy: by } };
}

/** The owner says no, or our team cancels it: false when it wasn't waiting any more. */
export async function closeMove(deps: MoveDeps, request: AppMoveRequest, status: "declined" | "cancelled", by: string): Promise<boolean> {
  return deps.store.updateAppMoveRequest(request.id, "waiting", { status, closedAt: deps.now, closedBy: by });
}

export interface PerformDeps extends MoveDeps {
  /** Duplicates an uploaded file under a new key (an asset another app of the account still uses). */
  copyBlob: ((key: string) => Promise<string | null>) | null;
}

export interface MoveDone {
  /** The app, now in the other account. */
  app: App;
  /** The record left in the account it left: its invoices, and the data or plan that stayed. */
  archive: App;
}

/**
 * Moves the app of an approved request. The record left behind is made
 * first (a new app of the account, read-only, without the app's pictures
 * or listing), then what stays is given to it, then the app moves.
 */
export async function performMove(deps: PerformDeps, request: AppMoveRequest): Promise<{ ok: true; done: MoveDone } | { ok: false; note: string }> {
  const { store, now } = deps;
  const fail = async (note: string) => {
    await store.updateAppMoveRequest(request.id, "approved", { status: "failed", note });
    return { ok: false as const, note };
  };
  if (request.status !== "approved") return { ok: false, note: "The request isn't approved." };
  const app = await store.getAppById(request.appId);
  if (!app || app.clientId !== request.fromClientId || app.movedAt) return fail("The app isn't in the account it was asked from any more.");
  if (!(await store.getClientById(request.toClientId))) return fail("The account it goes to no longer exists.");
  // Nothing is charged or changed at a gateway: a payment still pending stops it here too.
  if ((await store.listPlanPayments({ appId: app.id, status: "pending", limit: 1 })).length) return fail(MOVE_REFUSALS.payment_pending);

  // The pictures the app uses: those only it uses go with it; one another app of the account uses too is copied for it.
  const mine = await store.listAppAssetReferences(app.id);
  const others = new Set<string>();
  for (const other of await store.listAppsByClientIncludingDeleted(app.clientId)) {
    if (other.id === app.id) continue;
    for (const id of await store.listAppAssetReferences(other.id)) others.add(id);
  }
  const own: string[] = [];
  const copies: Record<string, string> = {};
  for (const id of mine) {
    const asset: Asset | null = await store.getAsset(id);
    if (!asset || asset.clientId !== app.clientId) continue;
    if (!others.has(id)) {
      own.push(asset.id);
      continue;
    }
    const blobKey = deps.copyBlob ? await deps.copyBlob(asset.blobKey) : null;
    if (!blobKey) continue;
    const copy: Asset = { ...asset, id: newId(), clientId: request.toClientId, blobKey, createdAt: now };
    await store.createAsset(copy);
    copies[asset.id] = copy.id;
  }

  // The record left behind: read-only, named as the app, without its pictures, listing or keys.
  const archive: App = {
    ...copiedAppRow(app, { id: newId(), clientId: app.clientId, name: app.appName ?? "" }, new Map(), now),
    appName: app.appName,
    iconAssetId: null,
    logoAssetId: null,
    movedAt: now,
    movedToClientId: request.toClientId,
    createdAt: app.createdAt,
  };
  try {
    await store.createApp(archive);
    // Invoices stay with whoever paid them.
    await store.repointAppRows(app.id, archive.id, "payments", now);
    if (!request.moveSubscription) await store.repointAppRows(app.id, archive.id, "plan", now);
    if (!request.moveData) await store.repointAppRows(app.id, archive.id, "data", now);
    await store.reassignAssets(own, request.toClientId);
    await store.replaceAssetIds(app.id, copies);
    await store.moveAppToClient(app.id, request.toClientId, now);
  } catch (e) {
    console.error(`[app move] ${request.id}: ${e instanceof Error ? e.message : String(e)}`);
    return fail("The move stopped part way. Nothing was deleted; check both accounts in the admin.");
  }
  await store.updateAppMoveRequest(request.id, "approved", { status: "moved", resultAppId: app.id, note: null });
  const moved = (await store.getAppById(app.id)) ?? { ...app, clientId: request.toClientId };
  return { ok: true, done: { app: moved, archive } };
}

/** What a move takes and leaves, for the dialog, the summary and the emails. */
export function moveSummary(options: { moveData: boolean; moveSubscription: boolean }): { moves: string[]; stays: string[] } {
  const moves = [
    "The app: its design, Studio project, pages and screens",
    "Its content, media, settings and languages",
    "Its builds and store listings",
    "Its integrations and keys (website, payments, push, stores)",
  ];
  const stays = ["Past invoices, with the account that paid them"];
  (options.moveData ? moves : stays).push(options.moveData ? "Its data: customers and users, orders, bookings, payments, messages and activity" : "Its data: customers and users, orders, bookings, payments, messages and activity, archived and readable");
  (options.moveSubscription ? moves : stays).push(options.moveSubscription ? "Its subscription: the plan or license, storage packs and renewal" : "Its subscription: the plan or license, storage packs and renewal (the app starts in the new account without a plan)");
  return { moves, stays };
}
