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
 * Admin › Demo apps (roadmap 16): create or refresh the demo apps, start a
 * build of one, and choose which ready build /demo offers for download.
 * Permission `demos.manage`; every change is in the audit log.
 */

const back = (query: string) => `/admin/demos?${query}`;

function refresh(): void {
  clearPlatformSettingsCache();
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
}

export async function setupDemosAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("demos.manage");
  const which = String(formData.get("type") ?? "all");
  const types = which === "all" ? ALL_DEMO_TYPES : (ALL_DEMO_TYPES as readonly string[]).includes(which) ? [which as DemoId] : null;
  if (!types) redirect(back("error=unknown_type"));
  const store = await getStore();
  const contact = await getContact();
  let result;
  try {
    result = await setupDemoApps({
      store,
      encryptionKey: encryptionKey(),
      putBlob: (key, data, contentType) => getBlobStore().put(key, data, contentType),
      assetUrl,
      platformUrl: appUrl(),
      contact: { whatsapp: contact.whatsappDisplay, email: contact.email },
      actorEmail: admin.email,
      now: new Date(),
    }, types);
  } catch (error) {
    if (!(error instanceof DemoSetupError)) throw error;
    console.error("[demo]", error.message);
    redirect(back("error=setup"));
  }
  const names = result.apps.map((a) => `${demoKind(a.type).name}${a.created ? " (new)" : ""}`).join(", ");
  await recordAudit({
    actor: admin,
    action: "demo.setup",
    target: { type: "client", id: result.clientId },
    clientId: result.clientId,
    summary: `${result.accountCreated ? "Created the demo account and" : "Refreshed"} the demo apps: ${names}`,
  });
  refresh();
  redirect(back(`done=${which === "all" ? "all" : which}`));
}

/** Starts a build of a demo app through the normal pipeline. */
export async function buildDemoAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("demos.manage");
  const store = await getStore();
  const app = await store.getAppById(String(formData.get("appId") ?? ""));
  if (!app || !(await isDemoApp(store, app))) redirect(back("error=not_demo"));
  const [client, license, builds] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id), store.listBuildsByApp(app.id, 1)]);
  if (!client) redirect(back("error=not_demo"));
  const result = await queueBuild(store, { client, app, license, versionName: suggestedVersion(builds[0]) }, new Date(), assetUrl);
  if (!result.ok) redirect(back(`error=${result.reason}`));
  await startPipeline();
  await recordAudit({
    actor: admin,
    action: "demo.build",
    target: { type: "build", id: result.build.id },
    clientId: app.clientId,
    summary: `Started build #${result.build.number} (${result.build.versionName}) of the demo app ${appLabel(app)}`,
  });
  refresh();
  redirect(back("done=build"));
}

/** Makes a ready build the public download on /demo, or removes the download (empty build). */
export async function setDemoDownloadAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("demos.manage");
  const store = await getStore();
  const app = await store.getAppById(String(formData.get("appId") ?? ""));
  if (!app || !(await isDemoApp(store, app))) redirect(back("error=not_demo"));
  const buildId = String(formData.get("buildId") ?? "");
  const build = buildId ? await store.getBuild(buildId) : null;
  if (buildId && !isDownloadableBuild(app, build)) redirect(back("error=not_downloadable"));
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
  redirect(back(build ? "done=download" : "done=no_download"));
}
