import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KitBar, KitCallout, KitHeader, KitPage, KitSection, KitStatus } from "@/components/studio-page";
import { appLabel } from "@/lib/app/label";
import { hasStoreKeys } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { XIAOMI_DEFAULT_RELEASE_NOTES, XIAOMI_RELEASE_NOTES_MAX } from "@/lib/publishing/more-stores";
import { GalaxyStoreForm, HuaweiForm, XiaomiForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { PublishingTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("stores.moreTitle") };
}

/**
 * 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps: 138
 * the client's own stores, on every plan. They publish there themselves:
 * connected once with their keys, every new build is uploaded there by
 * itself; else they upload the APK from Builds with the guides. Huawei push
 * for phones without Google Play, as before. Our team publishes on Google
 * Play and the App Store only (the Publishing page).
 */
export default async function MoreStoresPage() {
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const keys = hasStoreKeys(app);
  const { t, k, lang } = await dashboardText();
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
      {/* 138 A feature of every plan: connected once, every new version goes there by itself. */}
      <KitCallout tone="success" icon="cloud_upload">
        <span data-more-stores-benefit="">{richText(t("stores.moreYours"), builds)}</span>
      </KitCallout>

      <KitSection titleId="h-galaxy" title="Samsung Galaxy Store" description={t("stores.galaxyText")} actions={saved(keys.galaxy)}>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-(--sp-ink) marker:font-bold">
          <li>{richText(t("stores.galaxyStep1"), external("https://seller.samsungapps.com/"))}</li>
          <li>{richText(t("stores.galaxyStep2"), builds)}</li>
          <li>{t("stores.galaxyStep3")}</li>
        </ol>
        <p className="m-0 text-sm">
          <Link href={localePath(lang, "/docs/galaxy-store")}>{t("stores.galaxyGuide")}</Link>
        </p>
        <GalaxyStoreForm
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
        <HuaweiForm
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
        <XiaomiForm
          saved={keys.xiaomi ? { userName: app.xiaomiUserName ?? "" } : null}
          notes={{ current: app.xiaomiReleaseNotes ?? "", fallback: XIAOMI_DEFAULT_RELEASE_NOTES, max: XIAOMI_RELEASE_NOTES_MAX }}
        />
        <p className="m-0 text-sm text-(--sp-muted)">{t("stores.keyEncrypted")}</p>
      </KitSection>
    </KitPage>
  );
}
