import "server-only";
import { appLabel } from "../app/label";
import { dashboardLink } from "../builds/notify";
import { DEFAULT_CONTACT } from "../contact";
import type { DataStore } from "../data/store";
import type { App, Client, PublishingRequest, PublishingStore, User } from "../data/types";
import { sendTemplate } from "../email/send";
import { appUrl } from "../env";
import { platformSetting } from "../settings/platform";
import { CLIENT_STATUS_LABEL, STORE_TITLE, statusText } from "./steps";

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

/** Tells the publishing team about a new request, or a finished checklist. Best effort. */
export async function notifyPublishingTeam(
  store: DataStore,
  input: { user: Pick<User, "name" | "email">; client: Pick<Client, "whatsapp">; app: Pick<App, "appName">; event: string },
): Promise<void> {
  try {
    await sendTemplate("publishing_request", await publishingTeamEmail(store), {
      client_name: input.user.name,
      app_name: appLabel(input.app),
      event: input.event,
      email: input.user.email,
      whatsapp: input.client.whatsapp,
      admin_url: `${appUrl()}/admin/publishing`,
    });
  } catch (error) {
    console.error("[publishing] the team email wasn't sent:", error instanceof Error ? error.message : error);
  }
}

/** Emails the client that publishing on one store moved to a new status. Best effort. */
export async function notifyPublishingStatus(store: DataStore, request: PublishingRequest, which: PublishingStore): Promise<void> {
  try {
    const [client, app] = await Promise.all([store.getClientById(request.clientId), store.getAppById(request.appId)]);
    const user = client ? await store.getUserById(client.userId) : null;
    if (!user) return;
    const track = request[which];
    await sendTemplate("publishing_status", user.email, {
      name: user.name,
      app_name: appLabel(app),
      store: STORE_TITLE[which],
      status: CLIENT_STATUS_LABEL[track.status],
      status_text: statusText(which, track.status),
      note_line: track.note?.trim() ? `Note: ${track.note.trim()}\n\n` : "",
      store_link_line: track.status === "live" && track.storeUrl ? `Your app: ${track.storeUrl}\n\n` : "",
      publishing_url: dashboardLink(request.appId, "publishing"),
    });
  } catch (error) {
    console.error("[publishing] the status email wasn't sent:", error instanceof Error ? error.message : error);
  }
}
