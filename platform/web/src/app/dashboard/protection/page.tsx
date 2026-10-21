import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, PageHeader } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { choosesScreenProtection, offersContentScope, screenProtectionFormValue } from "@/lib/app/screen-protection";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { choosesVideoBranding, hidesVideoBranding } from "@/lib/app/video-branding";
import { ScreenProtectionForm, VideoBrandingForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("health.protection") };
}

/**
 * 53 Screenshots and screen recording in the app, for every app type: off,
 * course content only (academies) or the whole app; on WordPress also the
 * plugin's own setting. An app on its own API gets it from that API.
 */
export default async function ScreenProtectionPage() {
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const academy = offersContentScope(app);
  const { t, k } = await dashboardText();
  const b = { b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong> };
  return (
    <>
      <PageHeader
        title={t("health.protection")}
        description={t("health.protectionText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      <section aria-labelledby="h-protection" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-protection" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="lock" size={22} />
          {t("health.screenshots")}
        </h2>
        {choosesScreenProtection(app) ? (
          <ScreenProtectionForm
            current={screenProtectionFormValue(app)}
            academy={academy}
            wordpress={app.backend === "wordpress" || app.backend === "setup_requested"}
          />
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-ink-4" data-own-api="">
            {richText(t("health.ownApi"), {
              code: () => <code>/config</code>,
              code2: () => <code>app.screen_protection</code>,
              off: () => <code>off</code>, // i18n-ok: values
              content: () => <code>content</code>, // i18n-ok: values
              app: () => <code>app</code>, // i18n-ok: values
            })}
          </p>
        )}
      </section>

      {/* 72 The video sites' own players by default; hiding them is the owner's choice, at their own risk. */}
      <section aria-labelledby="h-video-branding" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-video-branding" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="smart_display" size={22} />
          {t("health.videoBranding")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("health.videoBrandingText")}</p>
        {choosesVideoBranding(app) ? (
          <VideoBrandingForm hide={hidesVideoBranding(app)} />
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-ink-4" data-own-api="">
            {richText(t("health.videoOwnApi"), {
              code: () => <code>/config</code>,
              code2: () => <code>app.hide_video_branding</code>,
            })}
          </p>
        )}
      </section>

      <section aria-labelledby="h-how" className="flex max-w-[720px] flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-how" className="m-0 text-lg font-bold">
          {t("health.whatPeopleSee")}
        </h2>
        <ul className="m-0 flex flex-col gap-2 ps-5 text-[15px] leading-relaxed text-ink-4">
          <li>{richText(t("health.android"), b)}</li>
          <li>{richText(t("health.iphone"), b)}</li>
          {academy ? <li>{richText(t("health.attachments"), b)}</li> : null}
          <li>
            {t("health.filming")}
            {academy ? t("health.watermark") : null}
          </li>
        </ul>
        <Notice icon="info">{t("health.previewNote")}</Notice>
      </section>
    </>
  );
}
