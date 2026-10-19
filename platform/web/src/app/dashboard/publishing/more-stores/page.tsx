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

export const metadata: Metadata = { title: "More Android stores" };

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

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/dashboard/publishing">Publishing</Link>}
        title="More Android stores"
        description={<>{appLabel(app)} on Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, beside Google Play.</>}
      />
      {managed ? (
        <Notice tone="success" icon="check_circle">
          Our team publishes your app. To have it on these stores too, tick them on the <Link href="/dashboard/publishing#h-more-stores">Publishing</Link> page and
          invite {teamEmail}: you don&apos;t need to add anything here.
        </Notice>
      ) : null}

      <section aria-labelledby="h-galaxy" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-galaxy" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Samsung Galaxy Store
          </h2>
          <span className="text-sm text-muted">On every Samsung Galaxy phone and tablet. Uses the same Android app as Google Play.</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
          <li>
            Create your seller account in <a href="https://seller.samsungapps.com/" target="_blank" rel="noopener noreferrer">Galaxy Store Seller Portal</a>.
          </li>
          <li>
            Add your app in Seller Portal and upload the first version by hand: the APK from <Link href="/dashboard/builds">Builds &amp; downloads</Link>. Samsung
            doesn&apos;t let any tool register a new app; once it&apos;s on sale, every new build is uploaded for you.
          </li>
          <li>
            In Seller Portal › Assistance › API Service, create a service account with the Publishing scope. Copy its ID and private key, and your app&apos;s content
            ID, into the form below.
          </li>
        </ol>
        <p className="m-0 text-sm">
          <Link href="/docs/galaxy-store">Publish on Samsung Galaxy Store: the full guide</Link>
        </p>
        {uploads ? null : (
          <UpgradeHint title="Uploads to Galaxy Store" to={upgrade}>
            Your plan gives you the APK to upload yourself. Upgrade and we upload every new build to Galaxy Store for you.
          </UpgradeHint>
        )}
        <GalaxyStoreForm
          uploads={uploads}
          saved={keys.galaxy ? { contentId: app.galaxyContentId ?? "", serviceAccountId: app.galaxyServiceAccountId ?? "" } : null}
        />
        <p className="m-0 text-sm text-muted">The private key is encrypted and never shown again. We use it only to upload the builds you start.</p>
      </section>

      <section aria-labelledby="h-huawei" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-huawei" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Huawei AppGallery
          </h2>
          <span className="text-sm text-muted">For Huawei phones, which come without Google Play.</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
          <li>
            Register on <a href="https://developer.huawei.com/consumer/en/" target="_blank" rel="noopener noreferrer">HUAWEI Developers</a> and complete the
            identity verification.
          </li>
          <li>
            In AppGallery Connect, create a project and add your app with the package name <b>{app.androidPackage ?? "from your store listing"}</b>. Turn on Push
            Kit, then upload agconnect-services.json and the app secret below: the next build gets Huawei push.
          </li>
          <li>
            Submit the first version by hand with the APK from <Link href="/dashboard/builds">Builds &amp; downloads</Link>. After that, with an API client
            below, every new build is uploaded and submitted for you.
          </li>
        </ol>
        {uploads ? null : (
          <UpgradeHint title="Uploads to AppGallery" to={upgrade}>
            Huawei push works on your plan. Upgrade and we also upload every new build to AppGallery for you.
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
        <p className="m-0 text-sm text-muted">Secrets are encrypted and never shown again. You can remove them at any time.</p>
      </section>

      {/* 42 Xiaomi GetApps */}
      <section aria-labelledby="h-xiaomi" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-xiaomi" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="storefront" size={22} />
            Xiaomi GetApps
          </h2>
          <span className="text-sm text-muted">On Xiaomi, Redmi and POCO phones. Uses the same Android app as Google Play.</span>
        </div>
        <ol className="m-0 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
          <li>
            Register as a developer on the <a href="https://dev.mi.com/" target="_blank" rel="noopener noreferrer">Xiaomi developer platform</a> and complete
            Xiaomi&apos;s identity check.
          </li>
          <li>
            Add your app with the package name <b>{app.androidPackage ?? "from your store listing"}</b> and submit the first version by hand: the APK from{" "}
            <Link href="/dashboard/builds">Builds &amp; downloads</Link>. Once it&apos;s on the store, every new build is uploaded for you.
          </li>
          <li>
            On the developer platform&apos;s automatic publishing page, copy the API private key and download Xiaomi&apos;s public certificate. Enter them below
            with the email you sign in with.
          </li>
        </ol>
        {uploads ? null : (
          <UpgradeHint title="Uploads to Xiaomi GetApps" to={upgrade}>
            Your plan gives you the APK to upload yourself. Upgrade and we upload every new build to Xiaomi GetApps for you.
          </UpgradeHint>
        )}
        <XiaomiForm
          uploads={uploads}
          saved={keys.xiaomi ? { userName: app.xiaomiUserName ?? "" } : null}
          notes={{ current: app.xiaomiReleaseNotes ?? "", fallback: XIAOMI_DEFAULT_RELEASE_NOTES, max: XIAOMI_RELEASE_NOTES_MAX }}
        />
        <p className="m-0 text-sm text-muted">The private key is encrypted and never shown again. We use it only to upload the builds you start.</p>
      </section>
    </>
  );
}
