"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { notifyBuildFinished } from "@/lib/builds/notify";
import { STALLED_MESSAGE } from "@/lib/builds/view";
import { getStore } from "@/lib/data";

/**
 * The build queue's "Mark as not finished": closes a queued or building build
 * that stopped (a cancelled or crashed run never reports back), so the
 * client can start a new one. The client gets the "Build didn't finish" email.
 */
export async function markBuildFailedAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("builds.manage");
  const store = await getStore();
  const id = String(formData.get("buildId") ?? "");
  const build = /^[0-9a-f-]{36}$/i.test(id) ? await store.getBuild(id) : null;
  const back = String(formData.get("back") ?? "") === "client" && build ? `/admin/clients/${build.clientId}` : "/admin/builds?status=failed";
  if (!build || (build.status !== "queued" && build.status !== "building")) redirect(back);
  const now = new Date();
  const closed = { ...build, status: "failed" as const, message: STALLED_MESSAGE, finishedAt: now, updatedAt: now };
  await store.updateBuild(build.id, { status: "failed", message: STALLED_MESSAGE, finishedAt: now }, now);
  const app = await store.getAppById(build.appId);
  await recordAudit({
    actor: admin,
    action: "build.mark_failed",
    target: { type: "build", id: build.id },
    clientId: build.clientId,
    summary: `Marked build #${build.number} (${build.versionName}) of ${appLabel(app)} as not finished; it was ${build.status}`,
    before: { status: build.status },
    after: { status: "failed" },
  });
  // The team closed it themselves: only the client is emailed.
  await notifyBuildFinished(store, closed, { team: false }).catch(() => undefined);
  revalidatePath("/admin/builds");
  revalidatePath(`/admin/clients/${build.clientId}`);
  redirect(back);
}
