import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KitBar, KitCallout, KitHeader, KitPage, KitSection, KitStatus } from "@/components/studio-page";
import { UpgradeHint } from "@/components/upgrade";
import { appLabel } from "@/lib/app/label";
import { hasStoreKeys, managedPublishing } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { isStudioProject } from "@/lib/studio/section";
import { XIAOMI_DEFAULT_RELEASE_NOTES, XIAOMI_RELEASE_NOTES_MAX } from "@/lib/publishing/more-stores";
import { publishingTeamEmail } from "@/lib/publishing/service";
import { GalaxyStoreForm, HuaweiForm, XiaomiForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { PublishingTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("stores.moreTitle") };
}

/**
 * 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps: the
 * keys we upload each build with ("We publish for you"), and Huawei push for
 * phones without Google Play (every plan). With "Publish it for me" our team
 * works through the client's invitations instead (the Publishing page).
 */
export default async function MoreStoresPage() {
  const { app, license } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const plans = plansIn((await dashboardText()).lang, await effectivePlans(store));
  const plan = license ? currentPlanId(license, new Date()) : null;
  const uploads = managedPublishing(plan, plans);
  // 132.59 A Studio project is offered Studio's plans, never the regular ones.
  const upgrade = lowestPlanWith(plans, (p) => hasFeature(p, "auto_publish"), plan, isStudioProject(app) ? "studio" : undefined);
  const keys = hasStoreKeys(app);
  const managed = app.publishingMode === "managed";
  const teamEmail = await publishingTeamEmail(store);
  const { t, k, lang } = await dashboardText();
  const cta = upgrade ? t("overview.upgradeTo", { plan: upgrade.name }) : undefined;
  const builds = { link: (chunk: string) => <Link href="/dashboard/builds">{chunk}</Link> };
  const external = (href: string) => ({
    link: (chunk: string) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {chunk}
      </a>
    ),
  });
  const bold = { b: (chunk: string) => <b>{chunk}</b> };

  const saved = (on: boolean) => <KitStatus tone={on ? "success" : "neutral"}>{t(on ? "integrations.states.connected" : "integrations.states.not_set")}</KitStatus>;
  // 132.171 The console's look: Publishing's tabs under the title, then one card per store with its state.
  return (
    <KitPage>
      <KitHeader title={t("stores.moreTitle")} description={t("stores.moreIntro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <KitBar>
        <PublishingTabs more />
      </KitBar>
      {managed ? (
        <KitCallout tone="success" icon="check_circle">
          {richText(t("stores.moreManaged"), {
            link: (chunk) => <Link href="/dashboard/publishing#h-more-stores">{chunk}</Link>,
            email: () => <bdi dir="ltr">{teamEmail}</bdi>,
          })}
        </KitCallout>
      ) : null}

      <KitSection titleId="h-galaxy" title="Samsung Galaxy Store" description={t("stores.galaxyText")} actions={saved(keys.galaxy)}>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-(--sp-ink) marker:font-bold">
          <li>{richText(t("stores.galaxyStep1"), external("https://seller.samsungapps.com/"))}</li>
          <li>{richText(t("stores.galaxyStep2"), builds)}</li>
          <li>{t("stores.galaxyStep3")}</li>
        </ol>
        <p className="m-0 text-sm">
          <Link href={localePath(lang, "/docs/galaxy-store")}>{t("stores.galaxyGuide")}</Link>
        </p>
        {uploads ? null : (
          <UpgradeHint title={t("stores.galaxyUploads")} to={upgrade} cta={cta}>
            {t("stores.galaxyUpgrade")}
          </UpgradeHint>
        )}
        <GalaxyStoreForm
          uploads={uploads}
          saved={keys.galaxy ? { contentId: app.galaxyContentId ?? "", serviceAccountId: app.galaxyServiceAccountId ?? "" } : null}
        />
        <p className="m-0 text-sm text-(--sp-muted)">{t("stores.keyEncrypted")}</p>
      </KitSection>

      <KitSection titleId="h-huawei" title="Huawei AppGallery" description={t("stores.huaweiText")} actions={saved(keys.appGallery)}>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-(--sp-ink) marker:font-bold">
          <li>{richText(t("stores.huaweiStep1"), external("https://developer.huawei.com/consumer/en/"))}</li>
          <li>
            {richText(app.androidPackage ? t("stores.huaweiStep2", { package: app.androidPackage }) : t("stores.huaweiStep2NoPackage"), bold)}
          </li>
          <li>{richText(t("stores.huaweiStep3"), builds)}</li>
        </ol>
        {uploads ? null : (
          <UpgradeHint title={t("stores.huaweiUploads")} to={upgrade} cta={cta}>
            {t("stores.huaweiUpgrade")}
          </UpgradeHint>
        )}
        <HuaweiForm
          uploads={uploads}
          saved={{
            appId: app.huaweiAppId ?? null,
            agconnect: Boolean(app.huaweiAgconnectAssetId),
            push: Boolean(app.huaweiPushSecretEncrypted),
            clientId: keys.appGallery ? (app.huaweiClientId ?? null) : null,
          }}
        />
        <p className="m-0 text-sm text-(--sp-muted)">{t("stores.secretsEncrypted")}</p>
      </KitSection>

      {/* 42 Xiaomi GetApps */}
      <KitSection titleId="h-xiaomi" title="Xiaomi GetApps" description={t("stores.xiaomiText")} actions={saved(keys.xiaomi)}>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-(--sp-ink) marker:font-bold">
          <li>{richText(t("stores.xiaomiStep1"), external("https://dev.mi.com/"))}</li>
          <li>
            {richText(app.androidPackage ? t("stores.xiaomiStep2", { package: app.androidPackage }) : t("stores.xiaomiStep2NoPackage"), { ...bold, ...builds })}
          </li>
          <li>{t("stores.xiaomiStep3")}</li>
        </ol>
        {uploads ? null : (
          <UpgradeHint title={t("stores.xiaomiUploads")} to={upgrade} cta={cta}>
            {t("stores.xiaomiUpgrade")}
          </UpgradeHint>
        )}
        <XiaomiForm
          uploads={uploads}
          saved={keys.xiaomi ? { userName: app.xiaomiUserName ?? "" } : null}
          notes={{ current: app.xiaomiReleaseNotes ?? "", fallback: XIAOMI_DEFAULT_RELEASE_NOTES, max: XIAOMI_RELEASE_NOTES_MAX }}
        />
        <p className="m-0 text-sm text-(--sp-muted)">{t("stores.keyEncrypted")}</p>
      </KitSection>
    </KitPage>
  );
}
