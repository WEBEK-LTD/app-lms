import Link from "next/link";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { APP_RESTORE_DAYS, appDeletionRefusal } from "@/lib/apps/deletion";
import type { ClientContext } from "@/lib/auth/session";
import { contextCan } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { AppDeletionForm } from "./app-deletion-form";
import { Icon } from "./icon";
import { isStudioProject } from "@/lib/studio/section";
import { Notice } from "./ui";

/**
 * 73 Setup's danger zone, "Delete this app" (lib/apps/deletion.ts): what
 * is deleted, what stays, that our team can restore it for 7 days, and the
 * form. Shown to the owner only; a team member or our team managing the
 * dashboard sees why they can't.
 */
export async function AppDeletion({ context, app, name }: { context: ClientContext; app: App; name: string }) {
  if (!contextCan(context, "apps")) return null;
  const { t, k, lang } = await dashboardText();
  const refusal = appDeletionRefusal(context);
  const link = (href: string) =>
    function LinkedWords(chunk: string) {
      return (
        <Link href={href} className="font-semibold">
          {chunk}
        </Link>
      );
    };
  return (
    <section aria-labelledby="h-delete-app" className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-white p-5 sm:p-6">
      <details className="group flex flex-col gap-3">
        <summary className="flex items-center justify-between gap-3">
          <h2 id="h-delete-app" className="m-0 text-lg font-bold text-danger">
            {t("apps.deleteTitle")}
          </h2>
          <Icon name="expand_more" size={24} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <p className="m-0 text-[15px] font-semibold text-ink-2">{t("apps.deleteIntro", { app: name })}</p>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[15px] font-bold">{t("apps.whatGoes")}</h3>
            <ul className="m-0 flex flex-col gap-2 ps-5 text-[15px] leading-relaxed text-ink-3">
              <li>{t("apps.goesNow")}</li>
              <li>{t("apps.goesData")}</li>
              <li>{richText(t("apps.goesPlan"), { refund: link(localePath(lang, "/refund")) })}</li>
            </ul>
            <h3 className="m-0 mt-1 text-[15px] font-bold">{t("apps.whatStays")}</h3>
            <ul className="m-0 flex flex-col gap-2 ps-5 text-[15px] leading-relaxed text-ink-3">
              <li>{t("apps.staysStores")}</li>
              <li>{richText(t("apps.staysKey"), { builds: link(isStudioProject(app) ? "/studio/project/builds" : "/dashboard/builds") })}</li>
            </ul>
            <p className="m-0 text-[15px] text-ink-3">{t("apps.restore", { days: APP_RESTORE_DAYS })}</p>
          </div>
          {refusal ? <Notice icon="lock">{k(refusal)}</Notice> : <AppDeletionForm appId={app.id} name={name} />}
        </div>
      </details>
    </section>
  );
}

/** 73 After an app was deleted: which one, and that our team can restore it for 7 days. */
export async function AppDeletedNotice({ context, id }: { context: ClientContext; id: string | null }) {
  if (!id) return null;
  const deletion = await (await getStore()).getAppDeletion(id);
  if (!deletion || deletion.clientId !== context.client.id || deletion.status !== "waiting") return null;
  const { t } = await dashboardText();
  return (
    <Notice tone="success" icon="check_circle" role="status">
      {t("apps.deleted", { app: deletion.appName, days: APP_RESTORE_DAYS })}
    </Notice>
  );
}
