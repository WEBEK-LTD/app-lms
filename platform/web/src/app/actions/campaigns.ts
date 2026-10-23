"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { appUrl, encryptionKey, licenseRefreshTestUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { countAudience, parseAudience } from "@/lib/hosted/audiences";
import { autoKindsFor } from "@/lib/hosted/auto-notifications";
import { hostedSettings } from "@/lib/hosted/service";
import { deleteCampaign, saveCampaign, sendCampaignNow, stopCampaign, type CampaignInput } from "@/lib/hosted/campaigns";
import type { TeamPermission } from "@/lib/team/permissions";

/** An active client whose app sends notifications from Yallapp: on the hosted API, or 85.4 through its WordPress site. */
async function requireHostedApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || (context.app.backend !== "hosted" && context.app.backend !== "wordpress")) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

/** 85.4 How WordPress sites are reached (local tests: LICENSE_REFRESH_TEST_URL). */
const site = () => ({ testSiteUrl: licenseRefreshTestUrl() });

/** The app's pages a campaign can open: the published ones, else the draft's. */
async function pageSlugs(app: App): Promise<string[]> {
  const layout = await (await getStore()).getAppLayout(app.id);
  return (layout?.published?.pages ?? layout?.draft.pages ?? []).map((p) => p.slug);
}

function audienceOf(formData: FormData) {
  return {
    who: String(formData.get("who") ?? "everyone"),
    courseId: String(formData.get("courseId") ?? ""),
    inactiveDays: String(formData.get("inactiveDays") ?? "30"),
    languages: formData.getAll("languages").map(String),
    platforms: formData.getAll("platforms").map(String),
    countries: formData.getAll("countries").map(String),
  };
}

const FIELDS = ["title", "body", "open", "page", "url", "imageUrl", "when", "date", "time", "weekday", "who", "courseId", "inactiveDays"] as const;

/** 85.2 Saves a campaign (new, or one not sent yet), and sends it when asked. */
export async function saveCampaignAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id") ?? 0) || undefined;
  const values: Record<(typeof FIELDS)[number], string> = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<(typeof FIELDS)[number], string>;
  const input: CampaignInput = { ...values, audience: audienceOf(formData) };
  const store = await getStore();
  const now = new Date();
  const result = await saveCampaign({ store, key: encryptionKey(), now, platformUrl: appUrl(), site: site() }, context.app, context.license, input, {
    id,
    by: actorOf(context).email,
    pages: await pageSlugs(context.app),
  });
  if (!result.ok) {
    // Saved before sending failed (the hour's limit, nobody in the audience): the draft is kept.
    if (result.campaign && !id) redirect(`/dashboard/notifications/campaigns/${result.campaign.id}?notice=${encodeURIComponent(result.message ?? "")}`);
    return result.errors ? { errors: result.errors, values } : { message: result.message, values };
  }
  await recordStaffChange(context, `${values.when === "now" ? "Sent" : "Saved"} the campaign "${result.campaign.title}"`);
  revalidatePath("/dashboard/notifications/campaigns");
  redirect(`/dashboard/notifications/campaigns/${result.campaign.id}?notice=${encodeURIComponent(result.message)}`);
}

/** 85.2 Sends a draft now. */
export async function sendCampaignNowAction(formData: FormData): Promise<void> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id") ?? 0);
  const store = await getStore();
  const campaign = Number.isSafeInteger(id) ? await store.getNotificationCampaign(context.app.id, id) : null;
  if (!campaign) redirect("/dashboard/notifications/campaigns");
  const result = await sendCampaignNow({ store, key: encryptionKey(), now: new Date(), platformUrl: appUrl(), site: site() }, context.app, context.license, campaign);
  if (result.ok) await recordStaffChange(context, `Sent the campaign "${campaign.title}"`);
  revalidatePath("/dashboard/notifications/campaigns");
  redirect(`/dashboard/notifications/campaigns/${id}?notice=${encodeURIComponent(result.message ?? "")}`);
}

/** 85.2 Stops a weekly campaign, or takes one waiting back to a draft. */
export async function stopCampaignAction(formData: FormData): Promise<void> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id") ?? 0);
  const stopped = Number.isSafeInteger(id) && (await stopCampaign(await getStore(), context.app, id, new Date()));
  if (stopped) await recordStaffChange(context, `Stopped campaign ${id}`);
  revalidatePath("/dashboard/notifications/campaigns");
  redirect(`/dashboard/notifications/campaigns/${id}?notice=${encodeURIComponent(stopped ? "Stopped. Nothing more goes out." : "This campaign was already sent, stopped or changed. Open it again to see where it is.")}`);
}

/** 85.2 Deletes a campaign that isn't going out right now. */
export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id") ?? 0);
  if (Number.isSafeInteger(id) && (await deleteCampaign(await getStore(), context.app, id))) await recordStaffChange(context, `Deleted campaign ${id}`);
  revalidatePath("/dashboard/notifications/campaigns");
  redirect("/dashboard/notifications/campaigns?deleted=1");
}

/** 85.1 How many people an audience is now, as the owner chooses it. */
export async function countAudienceAction(audience: unknown): Promise<{ count: number | null }> {
  const context = await requireHostedApp("notifications");
  const parsed = parseAudience(audience, context.app);
  if (!parsed.ok) return { count: null };
  return { count: await countAudience(await getStore(), context.app, parsed.audience, new Date()) };
}

/** 85.3 Which automatic notifications the app sends (the boxes left ticked). */
export async function saveAutoNotificationsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireHostedApp("notifications");
  const { app } = context;
  const on = new Set(formData.getAll("auto").map(String));
  const autoNotifications = Object.fromEntries(autoKindsFor(app).map((kind) => [kind, on.has(kind)]));
  const now = new Date();
  await (await getStore()).updateApp(app.id, { hostedSettings: { ...hostedSettings(app), autoNotifications } }, now);
  await recordStaffChange(context, `Automatic notifications: ${autoKindsFor(app).filter((k) => on.has(k)).join(", ") || "none"} on`);
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: "Saved. Your app sends the ones that are on." };
}
