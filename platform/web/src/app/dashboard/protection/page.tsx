import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KitCallout, KitFold, KitHeader, KitPage, KitSettingRow, KitSettings, KitStatus } from "@/components/studio-page";
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
 * 132.139 The premium kit: the two settings in one card, each with its
 * state as a pill; what people see folded under them, the preview's note
 * in sight.
 */
export default async function ScreenProtectionPage() {
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const academy = offersContentScope(app);
  const { t, k } = await dashboardText();
  const b = { b: (chunk: string) => <strong className="text-(--sp-ink)">{chunk}</strong> };
  const current = screenProtectionFormValue(app);
  const chooses = choosesScreenProtection(app);
  const protectionState = { off: t("health.off"), content: t("health.content"), app: t("health.app"), plugin: t("health.plugin") }[current] ?? current;
  const hidden = hidesVideoBranding(app);
  return (
    <KitPage>
      <KitHeader icon="shield" title={t("health.protection")} description={t("health.protectionText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <KitSettings>
        <KitSettingRow
          titleId="h-protection"
          icon="lock"
          title={t("health.screenshots")}
          status={chooses ? <KitStatus tone={current === "off" ? "neutral" : "success"}>{protectionState}</KitStatus> : null}
        >
          {chooses ? (
            <ScreenProtectionForm current={current} academy={academy} wordpress={app.backend === "wordpress" || app.backend === "setup_requested"} />
          ) : (
            <p className="m-0 text-[15px] leading-relaxed text-(--sp-muted)" data-own-api="">
              {richText(t("health.ownApi"), {
                code: () => <code>/config</code>,
                code2: () => <code>app.screen_protection</code>,
                off: () => <code>off</code>, // i18n-ok: values
                content: () => <code>content</code>, // i18n-ok: values
                app: () => <code>app</code>, // i18n-ok: values
              })}
            </p>
          )}
        </KitSettingRow>

        {/* 72 The video sites' own players by default; hiding them is the owner's choice, at their own risk. */}
        <KitSettingRow
          titleId="h-video-branding"
          icon="smart_display"
          title={t("health.videoBranding")}
          status={choosesVideoBranding(app) ? <KitStatus tone={hidden ? "warn" : "neutral"}>{hidden ? t("common.hidden") : t("health.shownState")}</KitStatus> : null}
          help={t("health.videoBrandingText")}
          helpLabel={t("studioPage.helpSection")}
        >
          {choosesVideoBranding(app) ? (
            <VideoBrandingForm hide={hidden} />
          ) : (
            <p className="m-0 text-[15px] leading-relaxed text-(--sp-muted)" data-own-api="">
              {richText(t("health.videoOwnApi"), {
                code: () => <code>/config</code>,
                code2: () => <code>app.hide_video_branding</code>,
              })}
            </p>
          )}
        </KitSettingRow>
      </KitSettings>

      <KitCallout icon="info">{t("health.previewNote")}</KitCallout>
      <KitFold icon="visibility" summary={<span id="h-how">{t("health.whatPeopleSee")}</span>}>
        <ul className="m-0 flex flex-col gap-2 ps-5 text-sm leading-relaxed text-(--sp-ink)">
          <li>{richText(t("health.android"), b)}</li>
          <li>{richText(t("health.iphone"), b)}</li>
          {academy ? <li>{richText(t("health.attachments"), b)}</li> : null}
          <li>
            {t("health.filming")}
            {academy ? t("health.watermark") : null}
          </li>
        </ul>
      </KitFold>
    </KitPage>
  );
}
