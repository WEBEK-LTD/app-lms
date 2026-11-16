import "server-only";
import { appLabel } from "../app/label";
import { signUrl } from "../crypto/signed-url";
import type { DataStore } from "../data/store";
import type { App, AppMoveRequest, User } from "../data/types";
import { emailLangOf } from "../email/send";
import { appUrl, signingSecret } from "../env";
import { sendMail } from "../mail";
import { getPlans } from "../settings/platform";
import { LANG_INFO, type Lang } from "@/i18n/config";
import { moveMail, type MoveMailKind } from "./move-mail";
import { MOVE_CODE_MINUTES } from "./move";

/**
 * 132.113 Sends the emails of a move (lib/apps/move-mail.ts), each in its
 * owner's language: the approval code to the owner of the account the app
 * leaves, and once moved, "done" to that owner and "added" to the other
 * account's. A failed email is logged; the move itself already happened.
 */

/** The owner's page for a request in their dashboard, signed for the code's 15 minutes (they sign in first when they must). */
export function moveReviewUrl(requestId: string, now: Date = new Date()): string {
  return signUrl(appUrl(), movePagePath(requestId), {}, signingSecret(), MOVE_CODE_MINUTES * 60, now);
}

export const movePagePath = (requestId: string) => `/dashboard/app-moves/${requestId}`;

async function ownerOf(store: DataStore, clientId: string): Promise<User | null> {
  const client = await store.getClientById(clientId);
  return client ? store.getUserById(client.userId) : null;
}

export interface MoveParties {
  from: User;
  to: User;
}

export async function moveParties(store: DataStore, request: Pick<AppMoveRequest, "fromClientId" | "toClientId">): Promise<MoveParties | null> {
  const [from, to] = await Promise.all([ownerOf(store, request.fromClientId), ownerOf(store, request.toClientId)]);
  return from && to ? { from, to } : null;
}

/** 132.115 The plan that moves: its name, end and scheduled change, in the email's language. */
async function planWords(store: DataStore, request: AppMoveRequest, lang: Lang): Promise<{ name?: string; until?: string; next?: string | null }> {
  const license = (await store.getLicenseForApp(request.fromClientId, request.appId)) ?? (request.toAppId ? await store.getLicenseForApp(request.toClientId, request.toAppId) : null);
  if (!license) return {};
  const plans = await getPlans(store);
  const day = (d: Date) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : LANG_INFO[lang].intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  const name = (id: string) => (plans as Record<string, { name: string } | undefined>)[id]?.name ?? id;
  const next = license.nextPlan && license.nextPlanAt ? `${name(license.nextPlan)} · ${day(license.nextPlanAt)}` : null;
  return { name: name(license.plan), until: day(license.expiresAt), next };
}

async function send(kind: MoveMailKind, to: User, input: { request: AppMoveRequest; app: App; toApp?: App | null; parties: MoveParties; code?: string; now: Date; store: DataStore }): Promise<boolean> {
  const { request, app, parties } = input;
  const plan = request.kind === "plan";
  const lang = emailLangOf(to);
  const mail = moveMail({
    kind,
    lang,
    assetBase: appUrl(),
    app: { name: appLabel(app), iconUrl: app.iconAssetId ? `${appUrl()}/api/v1/assets/${app.iconAssetId}` : null, colour: app.primaryColor },
    from: { name: parties.from.name, email: parties.from.email },
    to: { name: parties.to.name, email: parties.to.email },
    data: request.moveData,
    subscription: request.moveSubscription,
    member: request.requestedByName,
    ...(plan && input.toApp ? { plan: { toApp: appLabel(input.toApp), ...(await planWords(input.store, request, lang)) } } : {}),
    code: input.code,
    reviewUrl: kind === "approval" ? moveReviewUrl(request.id, input.now) : undefined,
    minutes: MOVE_CODE_MINUTES,
    at: input.now,
    dashboardUrl: `${appUrl()}/dashboard`,
  });
  try {
    await sendMail({ to: to.email, subject: mail.subject, text: mail.text, html: mail.html });
    return true;
  } catch (e) {
    console.error(`[app move] email ${kind} for ${request.id}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** The code, to the owner of the account the app (or plan) leaves. */
export async function sendMoveApproval(store: DataStore, input: { request: AppMoveRequest; app: App; toApp?: App | null; code: string; now: Date }): Promise<boolean> {
  const parties = await moveParties(store, input.request);
  if (!parties) return false;
  return send("approval", parties.from, { ...input, parties, store });
}

/** Done: to the owner of the account it left, and (another person) the owner of the account it went to. */
export async function sendMoveDone(store: DataStore, input: { request: AppMoveRequest; app: App; toApp?: App | null; now: Date }): Promise<void> {
  const parties = await moveParties(store, input.request);
  if (!parties) return;
  await send("moved_out", parties.from, { ...input, parties, store });
  if (parties.to.id !== parties.from.id) await send("added", parties.to, { ...input, parties, store });
}
