"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { queueBuild } from "@/lib/app/setup";
import { assetUrl } from "@/lib/assets";
import { requireAdmin } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { startPipeline } from "@/lib/builds/dispatch";
import { suggestedVersion } from "@/lib/builds/view";
import { getContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { isDemoApp, isDownloadableBuild } from "@/lib/demo/apps";
import { ALL_DEMO_TYPES, demoKind, type DemoId } from "@/lib/demo/constants";
import { DemoSetupError, setupDemoApps } from "@/lib/demo/setup";
import { appUrl, encryptionKey } from "@/lib/env";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/**
 * Admin › Demo apps (roadmap 16): create or refresh the demo apps (one per
 * request), start a build of one, and choose which ready build /demo offers
 * for download.
 * Permission `demos.manage`; every change is in the audit log.
 */

/** Back to the tab the form was on: regular apps' demos, or Studio's. */
const back = (query: string, formData: FormData) => `/admin/demos?${formData.get("family") === "studio" ? "family=studio&" : ""}${query}`;

function refresh(): void {
  clearPlatformSettingsCache();
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
  revalidatePath("/demo/studio");
}

/** What refreshing one demo app came to, for the page to show. */
export type DemoRefreshOutcome = { ok: true; created: boolean } | { ok: false; error: string };

/**
 * Creates or refreshes one demo app. "Refresh all" on Admin › Demo apps
 * asks for one demo per request, in order (app/admin/demos/refresh.tsx),
 * so no request has to do them all; the page's own data is brought up to
 * date once at the end (demosRefreshedAction). A demo that fails says why.
 */
export async function refreshDemoAction(type: string): Promise<DemoRefreshOutcome> {
  const admin = await requireAdmin("demos.manage");
  if (!(ALL_DEMO_TYPES as readonly string[]).includes(type)) return { ok: false, error: "That isn't one of the demo app types." };
  try {
    const store = await getStore();
    const contact = await getContact();
    const result = await setupDemoApps(
      {
        store,
        encryptionKey: encryptionKey(),
        putBlob: (key, data, contentType) => getBlobStore().put(key, data, contentType),
        assetUrl,
        platformUrl: appUrl(),
        contact: { whatsapp: contact.whatsappDisplay, email: contact.email },
        actorEmail: admin.email,
        now: new Date(),
      },
      [type as DemoId],
    );
    clearPlatformSettingsCache();
    const app = result.apps[0];
    const name = `${demoKind(type as DemoId).name}${app?.created ? " (new)" : ""}`;
    await recordAudit({
      actor: admin,
      action: "demo.setup",
      target: { type: "client", id: result.clientId },
      clientId: result.clientId,
      summary: `${result.accountCreated ? "Created the demo account and" : "Refreshed"} the demo apps: ${name}`,
    });
    return { ok: true, created: app?.created ?? false };
  } catch (error) {
    console.error(`[demo] ${type}:`, error);
    if (error instanceof DemoSetupError) return { ok: false, error: error.message };
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `It stopped with an error: ${message.length > 300 ? `${message.slice(0, 300)}…` : message}` };
  }
}

/** After the demos were refreshed: the demo pages and this page show what they are now. */
export async function demosRefreshedAction(): Promise<void> {
  await requireAdmin("demos.manage");
  refresh();
}

/** Starts a build of a demo app through the normal pipeline; 112.3 `variant` courier: a Studio demo's couriers' or drivers' app; 116 staff: its staff app. */
export async function buildDemoAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("demos.manage");
  const store = await getStore();
  const app = await store.getAppById(String(formData.get("appId") ?? ""));
  if (!app || !(await isDemoApp(store, app))) redirect(back("error=not_demo", formData));
  const asked = formData.get("variant");
  const variant = asked === "courier" || asked === "staff" ? asked : "app";
  const [client, license, builds] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id), store.listBuildsByApp(app.id, 1, variant)]);
  if (!client) redirect(back("error=not_demo", formData));
  const result = await queueBuild(store, { client, app, license, versionName: suggestedVersion(builds[0]), variant }, new Date(), assetUrl);
  if (!result.ok) redirect(back(`error=${result.reason}`, formData));
  await startPipeline();
  await recordAudit({
    actor: admin,
    action: "demo.build",
    target: { type: "build", id: result.build.id },
    clientId: app.clientId,
    summary: `Started build #${result.build.number} (${result.build.versionName}) of the demo app ${appLabel(app)}${variant === "courier" ? "'s second app" : variant === "staff" ? "'s staff app" : ""}`,
  });
  refresh();
  redirect(back("done=build", formData));
}

/** Makes a ready build the public download on /demo, or removes the download (empty build). */
export async function setDemoDownloadAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("demos.manage");
  const store = await getStore();
  const app = await store.getAppById(String(formData.get("appId") ?? ""));
  if (!app || !(await isDemoApp(store, app))) redirect(back("error=not_demo", formData));
  const buildId = String(formData.get("buildId") ?? "");
  const build = buildId ? await store.getBuild(buildId) : null;
  if (buildId && !isDownloadableBuild(app, build)) redirect(back("error=not_downloadable", formData));
  await store.updateApp(app.id, { demoBuildId: build?.id ?? null }, new Date());
  await recordAudit({
    actor: admin,
    action: "demo.download",
    target: { type: "app", id: app.id },
    clientId: app.clientId,
    summary: build
      ? `${appLabel(app)} on /demo now downloads build #${build.number} (${build.versionName})`
      : `${appLabel(app)} on /demo shows "Coming soon" again`,
    before: { demoBuildId: app.demoBuildId ?? null },
    after: { demoBuildId: build?.id ?? null },
  });
  refresh();
  redirect(back(build ? "done=download" : "done=no_download", formData));
}
