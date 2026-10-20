import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, PageHeader } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import { appLabel } from "@/lib/app/label";
import { hasStoreKeys, managedPublishing } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { XIAOMI_DEFAULT_RELEASE_NOTES, XIAOMI_RELEASE_NOTES_MAX } from "@/lib/publishing/more-stores";
import { publishingTeamEmail } from "@/lib/publishing/service";
import { GalaxyStoreForm, HuaweiForm, XiaomiForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

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
  const { app, license } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const plans = await effectivePlans(store);
  const plan = license ? currentPlanId(license, new Date()) : null;
  const uploads = managedPublishing(plan, plans);
  const upgrade = lowestPlanWith(plans, (p) => hasFeature(p, "auto_publish"), plan);
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

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/dashboard/publishing">{t("publishing.title")}</Link>}
        title={t("stores.moreTitle")}
        description={t("stores.moreIntro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      {managed ? (
        <Notice tone="success" icon="check_circle">
          {richText(t("stores.moreManaged"), {
            link: (chunk) => <Link href="/dashboard/publishing#h-more-stores">{chunk}</Link>,
            email: () => <bdi dir="ltr">{teamEmail}</bdi>,
          })}
        </Notice>
      ) : null}

      <section aria-labelledby="h-galaxy" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-galaxy" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Samsung Galaxy Store
          </h2>
          <span className="text-sm text-muted">{t("stores.galaxyText")}</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.keyEncrypted")}</p>
      </section>

      <section aria-labelledby="h-huawei" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-huawei" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Huawei AppGallery
          </h2>
          <span className="text-sm text-muted">{t("stores.huaweiText")}</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.secretsEncrypted")}</p>
      </section>

      {/* 42 Xiaomi GetApps */}
      <section aria-labelledby="h-xiaomi" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-xiaomi" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Xiaomi GetApps
          </h2>
          <span className="text-sm text-muted">{t("stores.xiaomiText")}</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.keyEncrypted")}</p>
      </section>
    </>
  );
}
