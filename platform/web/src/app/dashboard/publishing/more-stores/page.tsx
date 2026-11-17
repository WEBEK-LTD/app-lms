import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { hasStoreKeys } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { XIAOMI_DEFAULT_RELEASE_NOTES, XIAOMI_RELEASE_NOTES_MAX } from "@/lib/publishing/more-stores";
import { GalaxyStoreForm, HuaweiForm, XiaomiForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

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

  const saved = (on: boolean) => <Badge tone={on ? "success" : "neutral"}>{t(on ? "integrations.states.connected" : "integrations.states.not_set")}</Badge>;
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: back to Publishing, then one card per store with its state. */}
      <PageHeader
        back={{ href: "/dashboard/publishing", label: t("publishing.title") }}
        title={t("stores.moreTitle")}
        description={t("stores.moreIntro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      {/* 138 A feature of every plan: connected once, every new version goes there by itself. */}
      <Notice tone="success" icon="cloud_upload">
        <span data-more-stores-benefit="">{richText(t("stores.moreYours"), builds)}</span>
      </Notice>

      <section aria-labelledby="h-galaxy" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-midnight">
            <Icon name="storefront" size={22} />
          </span>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <h2 id="h-galaxy" className="m-0 text-lg font-bold">
            Samsung Galaxy Store
          </h2>
          <span className="text-sm text-muted">{t("stores.galaxyText")}</span>
          </div>
          {saved(keys.galaxy)}
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.keyEncrypted")}</p>
      </section>

      <section aria-labelledby="h-huawei" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-midnight">
            <Icon name="storefront" size={22} />
          </span>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <h2 id="h-huawei" className="m-0 text-lg font-bold">
            Huawei AppGallery
          </h2>
          <span className="text-sm text-muted">{t("stores.huaweiText")}</span>
          </div>
          {saved(keys.appGallery)}
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.secretsEncrypted")}</p>
      </section>

      {/* 42 Xiaomi GetApps */}
      <section aria-labelledby="h-xiaomi" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-midnight">
            <Icon name="storefront" size={22} />
          </span>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <h2 id="h-xiaomi" className="m-0 text-lg font-bold">
            Xiaomi GetApps
          </h2>
          <span className="text-sm text-muted">{t("stores.xiaomiText")}</span>
          </div>
          {saved(keys.xiaomi)}
        </div>
        <ol className="m-0 list-decimal space-y-2 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
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
        <p className="m-0 text-sm text-muted">{t("stores.keyEncrypted")}</p>
      </section>
    </div>
  );
}
