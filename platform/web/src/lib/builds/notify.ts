import "server-only";
import { appLabel } from "../app/label";
import type { DataStore } from "../data/store";
import type { Build } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { knownTranslator } from "@/i18n/dashboard";
import { appUrl, superAdminEmails } from "../env";
import { BUILD_STATUS_LABEL, failureReason } from "./view";
import { pushBuildFinished } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";

/**
 * A dashboard link that first makes `appId` the current app (an account can
 * have several), then opens the page: /dashboard/open/<app>?to=<page>.
 */
export function dashboardLink(appId: string, to: "builds" | "publishing" | "license" | "setup"): string {
  return `${appUrl()}/dashboard/open/${appId}?to=${to}`;
}

/**
 * A build finished: the client gets "Build ready" or "Build didn't finish";
 * on a failure (or an iOS app that couldn't be built) the team gets "Build
 * problem (team)" too, so the dashboard's "our team has been told" is true. Best effort: a mail problem
 * never fails the pipeline's report.
 */
export async function notifyBuildFinished(store: DataStore, build: Build, options: { team?: boolean } = {}): Promise<void> {
  const [client, app] = await Promise.all([store.getClientById(build.clientId), store.getAppById(build.appId)]);
  const user = client ? await store.getUserById(client.userId) : null;
  const common = {
    app_name: appLabel(app),
    build_number: String(build.number),
    version: build.versionName,
    builds_url: dashboardLink(build.appId, "builds"),
  };
  const sends: Promise<unknown>[] = [];
  if (user) {
    // 56 In the client's language; the team's note stays as the team wrote it.
    const lang = emailLangOf(user);
    sends.push(
      build.status === "ready"
        ? sendTemplate("build_ready", user.email, { ...common, name: user.name, note_line: build.message?.trim() ? `${build.message.trim()}\n\n` : "" }, { lang })
        : sendTemplate("build_failed", user.email, { ...common, name: user.name, reason: knownTranslator(lang)(failureReason(build)) }, { lang }),
    );
  }
  // A failure, or a ready build whose iOS app couldn't be built: someone on the team has to look.
  const problem = build.status === "failed" || build.stages.ios === "failed";
  if (problem && options.team !== false) {
    const values = {
      client_name: user?.name ?? "A client",
      app_name: common.app_name,
      build_number: common.build_number,
      version: common.version,
      status: BUILD_STATUS_LABEL[build.status],
      reason: failureReason(build),
      log_line: build.logUrl ? `Build log: ${build.logUrl}\n` : "",
      admin_url: `${appUrl()}/admin/clients/${build.clientId}#app-${build.appId}`,
    };
    for (const to of superAdminEmails()) sends.push(sendTemplate("build_failed_team", to, values));
  }
  // 58 The owner's phone too (Yallapp Business).
  if (app) sends.push(pushOwnerSafely((d) => pushBuildFinished(d, app, build), store));
  const results = await Promise.allSettled(sends);
  for (const result of results) if (result.status === "rejected") console.error("[builds] an email about build", build.id, "wasn't sent:", result.reason);
}
