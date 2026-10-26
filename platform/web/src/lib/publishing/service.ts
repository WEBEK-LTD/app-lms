import "server-only";
import { recordStaffChange } from "../admin/audit";
import { appLabel } from "../app/label";
import { dashboardLink } from "../builds/notify";
import { DEFAULT_CONTACT } from "../contact";
import type { DataStore } from "../data/store";
import type { App, Client, PublishingMode, PublishingRequest, PublishingStore, PublishingTrack, User } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { getDashT, type DashT } from "@/i18n/dashboard";
import { publishingStatusIn } from "./status-lang";
import { appUrl } from "../env";
import { mailDelivered } from "../mail";
import { platformSetting } from "../settings/platform";
import { newPublishingRequest, STORE_TITLE, trackOf } from "./steps";

/**
 * The address clients invite to their store and Firebase accounts, and where
 * new requests are sent: the admin's "Publishing team email" setting, else
 * Yallapp's contact email.
 */
export async function publishingTeamEmail(store: DataStore): Promise<string> {
  const saved = await platformSetting(store, "publishing");
  if (saved?.value.teamEmail) return saved.value.teamEmail;
  return (await platformSetting(store, "contact"))?.value.email ?? DEFAULT_CONTACT.email;
}

type Send = typeof sendTemplate;

/**
 * Tells the publishing team about a new request, a finished checklist or a
 * client who publishes themselves. Best effort, but never silent (19): when
 * the email isn't sent (SMTP missing in production, or failing) it's logged
 * and the request is flagged for the admin's Publishing page; the next email
 * that goes out clears the flag. True when it was sent.
 */
export async function notifyPublishingTeam(
  store: DataStore,
  input: { user: Pick<User, "name" | "email">; client: Pick<Client, "whatsapp">; app: Pick<App, "id" | "appName">; event: string },
  send: Send = sendTemplate,
): Promise<boolean> {
  let failure: string | null = null;
  try {
    if (!(await mailDelivered(store))) {
      failure = "SMTP isn't set up";
    } else {
      await send("publishing_request", await publishingTeamEmail(store), {
        client_name: input.user.name,
        app_name: appLabel(input.app),
        event: input.event,
        email: input.user.email,
        whatsapp: input.client.whatsapp,
        admin_url: `${appUrl()}/admin/publishing`,
      });
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (failure) console.error(`[publishing] the team email wasn't sent (${input.event}):`, failure);
  try {
    const request = await store.getPublishingRequest(input.app.id);
    if (request && (failure || request.teamEmailFailedAt)) {
      await store.savePublishingRequest({ ...request, teamEmailFailedAt: failure ? new Date() : null });
    }
  } catch (error) {
    console.error("[publishing] the email flag wasn't saved:", error instanceof Error ? error.message : error);
  }
  return failure === null;
}

/**
 * 14.1 and 19 The client chooses who publishes the app: "Publish it for me"
 * (managed) or "I'll publish it myself" (self), on the Publishing page or in
 * the setup's Publishing step. Saves the request (a new request starts the
 * queue again from now), the app's mode, a history event and the team's
 * email when it concerns them. The caller checks the plan allows "managed".
 */
export async function choosePublishingMode(
  store: DataStore,
  context: {
    user: Pick<User, "name" | "email">;
    staff: Pick<User, "id" | "email"> | null;
    /** 60 The team member who chose, if it wasn't the owner. */
    member?: Pick<User, "email"> | null;
    client: Pick<Client, "id" | "whatsapp">;
    app: App;
  },
  mode: PublishingMode,
  now: Date,
): Promise<PublishingRequest> {
  const { app } = context;
  const existing = await store.getPublishingRequest(app.id);
  const before = app.publishingMode ?? existing?.mode ?? null;
  const newRequest = mode === "managed" && existing?.mode !== "managed";
  const request: PublishingRequest = existing
    ? { ...existing, mode, requestedAt: newRequest ? now : existing.requestedAt, updatedAt: now }
    : newPublishingRequest(app, mode, now);
  await store.savePublishingRequest(request);
  // Managed: our team publishes through invitations, so the setup's Publishing step (store keys) is done for them.
  await store.updateApp(app.id, { publishingMode: mode, ...(mode === "managed" && !app.publishingDoneAt ? { publishingDoneAt: now } : {}) }, now);
  if (before !== mode) {
    await store.addPublishingEvent({ appId: app.id, store: "mode", status: mode, note: null, actorEmail: (context.staff ?? context.member ?? context.user).email, at: now });
    await recordStaffChange(context, mode === "managed" ? "Chose “Publish it for me”" : "Chose “I'll publish it myself”", { publishingMode: before }, { publishingMode: mode });
  }
  if (newRequest) {
    await notifyPublishingTeam(store, { user: context.user, client: context.client, app, event: "asked us to publish their app" });
  } else if (mode === "self" && before === "managed") {
    await notifyPublishingTeam(store, { user: context.user, client: context.client, app, event: "will publish their app themselves" });
  }
  return (await store.getPublishingRequest(app.id)) ?? request;
}

/** Emails the client that publishing on one store moved to a new status. Best effort. */
export async function notifyPublishingStatus(store: DataStore, request: PublishingRequest, which: PublishingStore): Promise<void> {
  try {
    const [client, app] = await Promise.all([store.getClientById(request.clientId), store.getAppById(request.appId)]);
    const user = client ? await store.getUserById(client.userId) : null;
    if (!user) return;
    const track = trackOf(request, which);
    // 56 In the client's language; the team's note stays as the team wrote it.
    const lang = emailLangOf(user);
    const t = getDashT(lang);
    const status = publishingStatusIn(lang, which, track.status);
    await sendTemplate(
      "publishing_status",
      user.email,
      {
        name: user.name,
        app_name: appLabel(app),
        store: STORE_TITLE[which],
        status: status.label,
        status_text: status.text,
        // 88.3 Why the store turned it down and what to do, then the team's note.
        note_line: `${rejectionLines(track, t)}${track.note?.trim() ? `${t("emails.note", { note: track.note.trim() })}\n\n` : ""}`,
        store_link_line: track.status === "live" && track.storeUrl ? `${t("emails.yourApp", { url: track.storeUrl })}\n\n` : "",
        publishing_url: dashboardLink(request.appId, "publishing"),
      },
      { lang },
    );
  } catch (error) {
    console.error("[publishing] the status email wasn't sent:", error instanceof Error ? error.message : error);
  }
}

/** 88.3 A rejection's reason and what to do, for the status email. */
function rejectionLines(track: PublishingTrack, t: DashT): string {
  if (track.status !== "rejected" || !track.rejection) return "";
  const reason = track.rejection;
  return `${t("publishing.reject.why", { reason: t(`publishing.reject.${reason}`) })}\n${t("publishing.reject.whatToDo", { fix: t(`publishing.reject.${reason}Fix`) })}\n\n`;
}
