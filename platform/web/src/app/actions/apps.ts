"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appLabel } from "@/lib/app/label";
import { APP_DELETION_MESSAGES, deleteApp } from "@/lib/apps/deletion";
import { APP_COOKIE, clientFor } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { encryptionKey, licenseRefreshTestUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { refreshSiteOf } from "@/lib/license/refresh";
import { isStudioProject } from "@/lib/studio/section";

/**
 * 73 Setup › Delete this app (lib/apps/deletion.ts): the owner only (the
 * `apps` permission, which team members never have; our team managing the
 * dashboard is refused too), with the app's name typed again and their
 * password. The app is gone at once; a WordPress site is asked to check its
 * license now, so its app pauses within moments.
 */
export async function deleteAppAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("apps");
  if (!context) redirect("/sign-in");
  const values = { name: String(formData.get("name") ?? "") };
  const store = await getStore();
  const id = String(formData.get("appId") ?? "");
  const app = context.apps.find((a) => a.id === id) ?? null;
  if (!app) return { message: APP_DELETION_MESSAGES.gone, values };
  const { k } = await dashboardText();
  const shownName = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  // What the plugin's site needs to hear of it, read while the license can still be read.
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await store.getActivation(license.id) : null;
  const result = await deleteApp({ store, now: new Date() }, context, { app, shownName, name: values.name, password: String(formData.get("password") ?? "") });
  if (!result.ok) return { message: result.message, errors: result.errors, values };
  after(async () => {
    await refreshSiteOf({ store, key: encryptionKey(), testSiteUrl: licenseRefreshTestUrl() }, app, license, activation);
  });
  (await cookies()).delete(APP_COOKIE);
  revalidatePath("/dashboard", "layout");
  // 111 A Studio project's owner goes back to Studio's projects, not the regular dashboard.
  if (isStudioProject(app)) {
    revalidatePath("/studio", "layout");
    redirect("/studio");
  }
  redirect(`/dashboard?deleted=${encodeURIComponent(result.deletion.id)}`);
}
