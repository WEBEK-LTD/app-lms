"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { KINDS, kindById } from "@/lib/app/kinds";
import { appLabel, MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { newApp } from "@/lib/app/setup";
import { copyApp } from "@/lib/apps/copy";
import { checkMoveCode, closeMove, MOVE_REFUSALS, requestAppMove, requestPlanMove, type MoveDeps } from "@/lib/apps/move";
import { auditBoth, copyBlob, finishMove } from "@/lib/apps/move-finish";
import { sendMoveApproval } from "@/lib/apps/move-notify";
import { requireAdmin, startManaging } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { ALL_DEMO_TYPES, demoKind, type DemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { DEMO_NAME_MAX, makeFromDemo } from "@/lib/demo/start";
import { appPlan } from "@/lib/entitlements";
import { signingSecret } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { getMediaStorage } from "@/lib/media/storage";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { STUDIO_ONLY_KINDS, studioSourcesFor } from "@/lib/studio/section";
import { TEMPLATES } from "@/lib/studio/sections";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { isLang, type Lang } from "@/i18n/config";
import { startDraftIn, startLanguages, wordsLangOf } from "@/lib/app/start-language";
import { appDefaults } from "@/lib/pages/layout";
import { pushSetupForNewApp } from "@/lib/firebase/env";

/**
 * 132.111–132.115 What our team does with a client's apps from the admin:
 * make one for them (and open it as the client), move one to another
 * account, copy one, or move only its plan to another app. A move needs the
 * owner's approval code (lib/apps/move.ts); each step is in the audit log of
 * both accounts.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (formData: FormData, name: string) => {
  const value = String(formData.get(name) ?? "");
  return UUID.test(value) ? value : null;
};

async function ownerName(clientId: string): Promise<string> {
  const store = await getStore();
  const client = await store.getClientById(clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  return user?.name ?? "a client";
}

function revalidateClients(...ids: string[]) {
  revalidatePath("/admin", "layout");
  for (const id of ids) revalidatePath(`/admin/clients/${id}`);
}

/** An app of this client that hasn't moved away. */
async function clientApp(clientId: string, appId: string | null): Promise<App | null> {
  if (!appId) return null;
  const app = await (await getStore()).getAppById(appId);
  return app && app.clientId === clientId && !app.movedAt ? app : null;
}

// 132.111 Making an app for a client

/** What a new app starts from: a demo (`demo:<id>`), an empty app (`kind:<id>`) or an empty Studio project (`studio:<id>`). */
export type AppStart = `demo:${DemoId}` | `kind:${string}` | `studio:${string}`;

/**
 * Makes an app in the client's account as they would (from a demo, or an
 * empty app or Studio project of a kind), then opens it as the client: in
 * the editor, the dashboard working in their account.
 */
export async function createAppForClientAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.edit");
  const clientId = idOf(formData, "clientId");
  const values = { start: String(formData.get("start") ?? ""), name: String(formData.get("name") ?? "").trim().replace(/\s+/g, " ") };
  if (!clientId) redirect("/admin/clients");
  const store = await getStore();
  const client = await store.getClientById(clientId);
  if (!client) redirect("/admin/clients");
  if (!values.name || values.name.length > DEMO_NAME_MAX) return { errors: { name: `Give the app a name of up to ${DEMO_NAME_MAX} characters.` }, values };
  const apps = await store.listAppsByClient(clientId);
  if (apps.length >= MAX_APPS_PER_CLIENT) return { message: `This account has ${MAX_APPS_PER_CLIENT} apps, the most an account can have.`, values };
  const [how, id] = values.start.split(":") as [string, string];
  const switches = await getSwitches(store);
  const now = new Date();
  // 132.40 In the owner's language, as the app they make themselves.
  const owner = await store.getUserById(client.userId);
  const lang: Lang = isLang(owner?.language) ? owner.language : "en";
  const languages = startLanguages(lang, (await appDefaults(store)).languages);
  let made: { app: App; open: string };
  if (how === "demo" && (ALL_DEMO_TYPES as readonly string[]).includes(id)) {
    const demo = id as DemoId;
    // The account's first app may have its plan already; an added app has none until it's paid.
    const license = apps.length ? null : (await store.listLicensesByClient(clientId)).find((l) => l.appId === null) ?? null;
    if (!appTypeOn(switches, demoKind(demo).engine, license?.plan ?? null)) return { errors: { start: "This kind of app is switched off for new apps." }, values };
    made = await makeFromDemo(store, { clientId, plan: await appPlan(store, license, now), lang }, { demo, name: values.name, colour: DEMO_BRANDS[demo].primaryColor, logoAssetId: null, iconAssetId: null }, now);
  } else if (how === "kind" || how === "studio") {
    const kind = kindById(id);
    if (!kind || !KINDS.includes(kind)) return { errors: { start: "Choose what the app starts from." }, values };
    if (!appTypeOn(switches, kind.engine, null)) return { errors: { start: "This kind of app is switched off for new apps." }, values };
    if (how === "studio") {
      const template = TEMPLATES.find((t) => t.id === "blank")!;
      const words = wordsLangOf(languages, "en");
      const app = await makeStudioProject(store, { clientId, name: values.name, kind, source: studioSourcesFor(kind)[0] ?? "catalog", template, words: appWords(words, values.name), lang: words, languages }, now);
      made = { app, open: "/studio/editor" };
    } else {
      if (STUDIO_ONLY_KINDS.has(kind.id)) return { errors: { start: "This kind of app is made in Yallapp Studio." }, values };
      const app: App = { ...newApp(clientId, apps.length ? null : client.siteUrl || null, now, kind.engine, kind.vertical), appName: values.name.slice(0, 60), appTypeDoneAt: now };
      // 136 Yallapp sets up its notifications when its Firebase is set up here and has room.
      if (await pushSetupForNewApp(store, app)) app.pushSetup = "yallapp";
      await store.createApp(app);
      if (lang !== "en") await startDraftIn(store, app, languages, now);
      made = { app, open: "/dashboard/setup?step=website" };
    }
  } else {
    return { errors: { start: "Choose what the app starts from." }, values };
  }
  await recordAudit({
    actor: admin,
    action: "client.app_created",
    target: { type: "app", id: made.app.id },
    clientId,
    summary: `Created ${appLabel(made.app)} for ${await ownerName(clientId)} (${values.start.replace(":", ": ")})`,
  });
  // Opened as the client: their dashboard, working in their account, on the new app.
  await startManaging(clientId, made.app.id);
  await recordAudit({ actor: admin, action: "client.manage_app", target: { type: "client", id: clientId }, clientId, summary: `Opened ${await ownerName(clientId)}'s dashboard (${appLabel(made.app)})` });
  revalidateClients(clientId);
  redirect(made.open);
}

// 132.112 Moving an app, 132.115 or its plan

const moveDeps = (): MoveDeps => ({ store: null as never, now: new Date(), secret: signingSecret() });

const MOVE_PAGE = (clientId: string, appId: string, kind: "move" | "plan" = "move") => `/admin/clients/${clientId}/${kind}?app=${appId}`;

/** Sends the owner the approval code for moving the app to another account, with the two choices. */
export async function requestMoveAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("apps.transfer");
  const clientId = idOf(formData, "clientId");
  const toClientId = idOf(formData, "toClientId");
  if (!clientId) redirect("/admin/clients");
  const app = await clientApp(clientId, idOf(formData, "appId"));
  if (!app) return { message: MOVE_REFUSALS.not_the_account };
  if (!toClientId) return { message: MOVE_REFUSALS.no_account };
  const store = await getStore();
  const moveData = formData.get("moveData") === "on";
  const moveSubscription = formData.get("moveSubscription") === "on";
  const deps = { ...moveDeps(), store };
  const asked = await requestAppMove(deps, { app, toClientId, moveData, moveSubscription, by: admin });
  if (!asked.ok) return { message: MOVE_REFUSALS[asked.reason] };
  const sent = await sendMoveApproval(store, { request: asked.request, app, code: asked.code, now: deps.now });
  const choices = `data ${moveData ? "moves" : "stays"}, subscription ${moveSubscription ? "moves" : "stays"}`;
  await auditBoth(admin, "app.move_requested", [clientId, toClientId], { type: "app", id: app.id }, `Asked ${await ownerName(clientId)} to approve moving ${appLabel(app)} to ${await ownerName(toClientId)}'s account (${choices}); approval code emailed`, {
    moveData,
    moveSubscription,
  });
  revalidateClients(clientId, toClientId);
  if (!sent) return { message: "The request was saved, but the email couldn't be sent. Cancel it and try again, or check the email settings." };
  redirect(`${MOVE_PAGE(clientId, app.id)}&sent=1`);
}

/** Sends the owner the approval code for moving only the app's plan to another app. */
export async function requestPlanMoveAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("apps.transfer");
  const clientId = idOf(formData, "clientId");
  if (!clientId) redirect("/admin/clients");
  const app = await clientApp(clientId, idOf(formData, "appId"));
  if (!app) return { message: MOVE_REFUSALS.not_the_account };
  const store = await getStore();
  const toAppId = idOf(formData, "toAppId");
  const toApp = toAppId ? await store.getAppById(toAppId) : null;
  if (!toApp) return { message: MOVE_REFUSALS.no_app };
  const deps = { ...moveDeps(), store };
  const asked = await requestPlanMove(deps, { app, toApp, by: admin });
  if (!asked.ok) return { message: MOVE_REFUSALS[asked.reason] };
  const sent = await sendMoveApproval(store, { request: asked.request, app, toApp, code: asked.code, now: deps.now });
  await auditBoth(admin, "app.move_requested", [clientId, toApp.clientId], { type: "app", id: app.id }, `Asked ${await ownerName(clientId)} to approve moving the plan of ${appLabel(app)} to ${appLabel(toApp)} (${await ownerName(toApp.clientId)}); approval code emailed`, { toAppId: toApp.id });
  revalidateClients(clientId, toApp.clientId);
  if (!sent) return { message: "The request was saved, but the email couldn't be sent. Cancel it and try again, or check the email settings." };
  redirect(`${MOVE_PAGE(clientId, app.id, "plan")}&sent=1`);
}

/** The code the owner gave the team member, typed in the admin: right, the move happens now. */
export async function confirmMoveCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("apps.transfer");
  const requestId = idOf(formData, "requestId");
  const store = await getStore();
  const request = requestId ? await store.getAppMoveRequest(requestId) : null;
  if (!request) return { message: "That request wasn't found." };
  const values = { code: String(formData.get("code") ?? "") };
  const deps = { ...moveDeps(), store };
  const check = await checkMoveCode(deps, request.id, values.code, admin.email);
  if (!check.ok) {
    const page = request.kind === "plan" ? "plan" : "move";
    if (check.reason === "wrong") {
      await auditBoth(admin, "app.move_code_failed", [request.fromClientId], { type: "app", id: request.appId }, `A wrong approval code was typed (${check.left} tries left)`);
      return { errors: { code: `That code isn't right. ${check.left} ${check.left === 1 ? "try" : "tries"} left.` }, values };
    }
    if (check.reason === "attempts") {
      await auditBoth(admin, "app.move_expired", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, "The move was closed after 5 wrong codes");
      redirect(`${MOVE_PAGE(request.fromClientId, request.appId, page)}&closed=attempts`);
    }
    if (check.reason === "expired") {
      await auditBoth(admin, "app.move_expired", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, "The move's code expired after 15 minutes");
      redirect(`${MOVE_PAGE(request.fromClientId, request.appId, page)}&closed=expired`);
    }
    redirect(`${MOVE_PAGE(request.fromClientId, request.appId, page)}&closed=closed`);
  }
  await auditBoth(admin, "app.move_approved", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `The owner's code was typed by ${admin.email}: the move is approved`);
  const done = await finishMove(admin, check.request, admin.email);
  if (!done.ok) return { message: done.note, values };
  redirect(`/admin/clients/${request.toClientId}?done=${request.kind === "plan" ? "plan-moved" : "moved"}`);
}

/** Our team cancels a waiting request (the owner's code stops working). */
export async function cancelMoveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("apps.transfer");
  const requestId = idOf(formData, "requestId");
  const store = await getStore();
  const request = requestId ? await store.getAppMoveRequest(requestId) : null;
  if (!request) redirect("/admin/clients");
  if (await closeMove({ ...moveDeps(), store }, request, "cancelled", admin.email)) {
    await auditBoth(admin, "app.move_cancelled", [request.fromClientId, request.toClientId], { type: "app", id: request.appId }, `Cancelled the request to move ${request.kind === "plan" ? "the plan of an app" : "an app"} (the code stopped working)`);
  }
  revalidateClients(request.fromClientId, request.toClientId);
  redirect(`${MOVE_PAGE(request.fromClientId, request.appId, request.kind === "plan" ? "plan" : "move")}&closed=cancelled`);
}

// 132.114 Copying an app

/** A copy of the app in the account chosen (this one or another), without its secrets, people, orders, builds, listing or plan. */
export async function copyAppAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("apps.copy");
  const clientId = idOf(formData, "clientId");
  if (!clientId) redirect("/admin/clients");
  const app = await clientApp(clientId, idOf(formData, "appId"));
  const values = { name: String(formData.get("name") ?? "").trim().replace(/\s+/g, " ") };
  if (!app) return { message: MOVE_REFUSALS.not_the_account, values };
  const toClientId = idOf(formData, "toClientId") ?? clientId;
  const store = await getStore();
  if (!(await store.getClientById(toClientId))) return { message: MOVE_REFUSALS.no_account, values };
  if (!values.name || values.name.length > 60) return { errors: { name: "Give the copy a name of up to 60 characters." }, values };
  if ((await store.listAppsByClient(toClientId)).length >= MAX_APPS_PER_CLIENT) return { message: `That account has ${MAX_APPS_PER_CLIENT} apps, the most an account can have.`, values };
  const result = await copyApp({ store, now: new Date(), copyBlob, media: getMediaStorage() }, app, { clientId: toClientId, name: values.name });
  const rows = Object.values(result.copied).reduce((a, b) => a + b, 0);
  await auditBoth(
    admin,
    "app.copied",
    [clientId, toClientId],
    { type: "app", id: result.app.id },
    `Copied ${appLabel(app)} (${await ownerName(clientId)}) as ${appLabel(result.app)} into ${toClientId === clientId ? "the same account" : `${await ownerName(toClientId)}'s account`}: ${rows} content rows${result.mediaFailed.length ? `; ${result.mediaFailed.length} media files couldn't be copied` : ""}`,
    { fromAppId: app.id, copied: result.copied, mediaFailed: result.mediaFailed },
  );
  revalidateClients(clientId, toClientId);
  redirect(`/admin/clients/${toClientId}?done=${result.mediaFailed.length ? "copied-media" : "copied"}`);
}
