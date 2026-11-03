import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DetailLayout } from "@/components/page-kit";
import { Notice, PageHeader, Section } from "@/components/ui";
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
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the two settings, and what people see beside them (below them on phones). */}
      <PageHeader
        title={t("health.protection")}
        description={t("health.protectionText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      <DetailLayout
        main={
          <>
            <Section
              titleId="h-protection"
              title={
                <span className="flex items-center gap-2">
                  <Icon name="lock" size={22} />
                  {t("health.screenshots")}
                </span>
              }
            >
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
            </Section>

            {/* 72 The video sites' own players by default; hiding them is the owner's choice, at their own risk. */}
            <Section
              titleId="h-video-branding"
              title={
                <span className="flex items-center gap-2">
                  <Icon name="smart_display" size={22} />
                  {t("health.videoBranding")}
                </span>
              }
              description={t("health.videoBrandingText")}
            >
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
            </Section>
          </>
        }
        side={
          <Section titleId="h-how" title={t("health.whatPeopleSee")}>
            <ul className="m-0 flex flex-col gap-2 ps-5 text-sm leading-relaxed text-ink-4">
              <li>{richText(t("health.android"), b)}</li>
              <li>{richText(t("health.iphone"), b)}</li>
              {academy ? <li>{richText(t("health.attachments"), b)}</li> : null}
              <li>
                {t("health.filming")}
                {academy ? t("health.watermark") : null}
              </li>
            </ul>
            <Notice icon="info">{t("health.previewNote")}</Notice>
          </Section>
        }
      />
    </div>
  );
}
