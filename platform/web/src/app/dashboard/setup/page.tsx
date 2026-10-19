import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, PageHeader, btn, formatDate } from "@/components/ui";
import { SETUP_STEPS, STEP_LABEL, hasStoreKeys, isSetupStep, managedPublishing, nextStep, stepStatus, type SetupStep } from "@/lib/app/setup";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { appLabel, licensePageName } from "@/lib/app/label";
import { wordsOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey } from "@/lib/env";
import { platformValues } from "@/lib/hosted/connectors/platforms";
import { platformDefinitions } from "@/lib/hosted/connectors/registry";
import { chosenSignInMethods, emailOnlyUsersAtRisk } from "@/lib/hosted/sign-in-methods";
import { hostedApiUrl } from "@/lib/hosted/urls";
import { normalizeSiteUrl } from "@/lib/license/site-url";
import { siteMatch } from "@/lib/app/site-match";
import { hasFeature, lowestPlanWith, planName } from "@/lib/plans";
import { BrandingStep, ListingStep, PublishingStep, WebsiteStep, type BrandingDesigns } from "./steps";
import { CheckLinksPanel } from "../publishing/links/forms";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { designById, designFits, designsFor } from "@/lib/pages/designs";
import { designLayout, loadLayout } from "@/lib/pages/layout";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { getSwitches, noWebsiteFor, websiteOf, websiteOn } from "@/lib/switches";

export const metadata: Metadata = { title: "App setup" };

const COMING_UP: Record<Exclude<SetupStep, "app-type">, string> = {
  website: "Where your app gets its content: your WordPress site and the plugin, your own API, or a WordPress site we set up for you.",
  branding: "App name, name under the icon, icon, logo, colors, template and font.",
  listing:
    "Android package name, iOS bundle ID, store title, short and full description, support email, privacy policy URL, and optionally your store screenshots.",
  publishing:
    "When we publish for you: Google Play service account JSON and App Store Connect API key (Issuer ID, Key ID, .p8 file). When you publish yourself: optionally the App Store Connect API key to sign your iOS app, then publish with our guides. Optional on every plan: Firebase files for push notifications. Or choose “Publish it for me” and our team publishes it.",
};

export default async function SetupPage({ searchParams }: PageProps<"/dashboard/setup">) {
  const { client, app, apps, license, state, staff } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const plans = await getPlans(store);
  // 13.1 The app's plan as it is now, with the team's edits and switches.
  const effective = await effectivePlans(store);
  const plan = license ? currentPlanId(license, new Date()) : null;
  const status = stepStatus(app, plan, effective);
  const requested = (await searchParams).step;
  const step: SetupStep = isSetupStep(requested) && requested !== "app-type" ? requested : (nextStep(app, plan, effective) ?? "website");
  const complete = Object.values(status).every(Boolean);
  const current = plan ? effective[plan] : null;
  // 11.5 Switches: switched-off websites and platforms aren't offered; the app's own stays, with a notice.
  const switches = await getSwitches(store);
  const currentWebsite = websiteOf(app);
  // 19 An app waiting for the WordPress site our team sets up can always move to it.
  const offered = (website: string) =>
    (app.websiteDoneAt !== null && website === currentWebsite) ||
    (website === "wordpress" && app.backend === "setup_requested") ||
    websiteOn(switches, website, plan);
  const websiteSwitchedOff = app.websiteDoneAt !== null && !websiteOn(switches, currentWebsite, plan);
  const activation = license ? await store.getActivation(license.id) : null;
  const icon = app.iconAssetId ? await store.getAsset(app.iconAssetId) : null;
  const logo = app.logoAssetId ? await store.getAsset(app.logoAssetId) : null;
  const builds = await store.listBuildsByApp(app.id, 1);
  const pluginState = !activation
    ? "none"
    : app.siteUrl && normalizeSiteUrl(app.siteUrl) === activation.siteUrl
      ? "connected"
      : "other";

  const editableSteps = SETUP_STEPS.filter((s) => s !== "app-type") as Exclude<SetupStep, "app-type">[];
  const index = editableSteps.indexOf(step as Exclude<SetupStep, "app-type">);
  const upcoming = editableSteps.slice(index + 1);

  return (
    <>
      <PageHeader
        title="App setup"
        actions={
          <Link href="/dashboard/preview" className={`${btn.secondary} h-10 px-4 text-sm`}>
            <Icon name="visibility" size={18} />
            Preview your app
          </Link>
        }
        description={
          <>
            {appLabel(app)} · Plan: {planName(plan, plans)} ·{" "}
            {complete
              ? builds.length
                ? "Setup is complete. Changes apply to your next build."
                : "Setup is complete."
              : "Your first build starts when all steps are complete."}
          </>
        }
      />

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan has ended. You can still edit your app, but new builds need an active plan. Message us on WhatsApp to renew.
        </Notice>
      ) : state === "pending" && client.status === "active" ? (
        <Notice tone="warn" icon="hourglass_top">
          {appLabel(app)} is waiting for activation. Set it up now; its first build starts once it&apos;s active. Each app has its own plan:{" "}
          <Link href="/dashboard/license">pay it on {licensePageName(app)}</Link> or message us on WhatsApp.
        </Notice>
      ) : null}

      {/* One row of steps: scrolls sideways on phones, five columns from md up. */}
      <ol
        aria-label="Setup steps"
        className="relative -mx-4 my-0 flex list-none gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-5 md:gap-2.5 md:overflow-visible md:px-0 md:pb-0"
      >
        {SETUP_STEPS.map((s, i) => {
          const current = s === step;
          const done = status[s];
          const href = s === "app-type" ? "/dashboard/app-type" : `/dashboard/setup?step=${s}`;
          return (
            <li key={s} className="flex-none md:min-w-0">
              <Link
                href={href}
                aria-current={current ? "step" : undefined}
                className={`flex h-full items-center gap-2.5 rounded-xl bg-white text-midnight no-underline hover:text-midnight ${
                  current ? "border-2 border-midnight px-[13px] py-[11px]" : "border border-line px-3.5 py-3 hover:border-midnight"
                }`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                    done && !current ? "bg-success text-white" : current ? "bg-midnight text-white" : "bg-step text-muted"
                  }`}
                >
                  {done && !current ? <Icon name="check" size={14} /> : i === 0 ? <Icon name="check" size={14} /> : i}
                </span>
                <span className={`text-sm ${current ? "font-bold" : done ? "font-semibold" : "text-muted"}`}>
                  {STEP_LABEL[s]}
                  {done ? <span className="sr-only"> (done)</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {step === "website" && websiteSwitchedOff ? (
        <Notice tone="warn" icon="info" role="status">
          What your app is connected to isn&apos;t offered to new apps anymore. Your app keeps working with it.
        </Notice>
      ) : null}
      {step === "website" ? (
        <WebsiteStep
          hostedWithoutSource={app.backend === "hosted" && !app.connector}
          hidden={(["wordpress", "custom_api", "setup_requested", "shopify", "catalog"] as const).filter(
            (b) => !offered(b === "catalog" ? noWebsiteFor(app.appType) : b),
          )}
          siteUrl={app.siteUrl ?? (apps[0]?.id === app.id ? client.siteUrl : "")}
          plugin={pluginState}
          activatedSite={activation?.siteUrl ?? null}
          pluginVersion={activation?.pluginVersion ?? null}
          site={activation && pluginState === "connected" ? siteMatch(app, activation) : null}
          backend={
            app.backend === "hosted" ? (app.connector?.kind === "shopify" ? "shopify" : app.connector?.kind === "platform" ? "platform" : "catalog") : app.backend
          }
          platforms={await Promise.all(
            platformDefinitions()
              .filter((p) => p.appType === app.appType && offered(p.id))
              .map(async (p) => ({
                id: p.id,
                name: p.name,
                summary: p.summary,
                fields: p.fields,
                // 25 Platforms connected through Yallapp's partner app: whether the team set it, and the connected store.
                ...(p.oauth
                  ? {
                      oauth: {
                        available: (await platformSetting(store, p.oauth.settingKey)) !== null,
                        connectedStore:
                          app.connector?.kind === "platform" && app.connector.platform === p.id
                            ? p.oauth.storeName(platformValues(app, encryptionKey()) ?? {})
                            : null,
                      },
                    }
                  : {}),
              })),
          )}
          staff={staff !== null}
          platformSaved={
            app.connector?.kind === "platform"
              ? {
                  platform: app.connector.platform,
                  settings: app.connector.settings,
                  // Which secrets are saved (never their values).
                  secrets: Object.entries(platformValues(app, encryptionKey()) ?? {})
                    .filter(([name, value]) => value !== "" && !(name in (app.connector as { settings: Record<string, string> }).settings))
                    .map(([name]) => name),
                }
              : null
          }
          appType={app.appType}
          vertical={app.vertical ?? null}
          shopDomain={app.connector?.kind === "shopify" ? app.connector.shopDomain : ""}
          shopifyConnected={app.connector?.kind === "shopify"}
          shopifyAdmin={app.connector?.kind === "shopify" && Boolean(app.connector.adminTokenEncrypted)}
          hostedApiUrl={app.backend === "hosted" ? hostedApiUrl(appUrl(), app.id) : null}
          apiBaseUrl={app.apiBaseUrl ?? ""}
          setupNote={app.setupNote ?? ""}
          setupRequestedAt={app.setupRequestedAt ? formatDate(app.setupRequestedAt) : null}
          signInMethods={chosenSignInMethods(app) ?? ["phone"]}
          emailOnlyUsers={await emailOnlyUsersAtRisk(store, app)}
        />
      ) : null}
      {step === "branding" ? (
        <BrandingStep
          values={{
            appName: app.appName ?? "",
            shortName: app.shortName ?? "",
            primaryColor: app.primaryColor,
            splashColor: app.splashColor,
            template: app.template,
            font: app.font,
          }}
          icon={icon ? { id: icon.id, url: `/api/v1/assets/${icon.id}` } : null}
          logo={logo ? { id: logo.id, url: `/api/v1/assets/${logo.id}` } : null}
          {...await brandingDesigns(store, app)}
        />
      ) : null}
      {step === "listing" ? (
        <ListingStep
          descriptionHint={wordsOf(app).storeDescription}
          values={{
            androidPackage: app.androidPackage ?? "",
            iosBundleId: app.iosBundleId ?? "",
            storeTitle: app.storeTitle ?? app.appName ?? "",
            shortDescription: app.shortDescription ?? "",
            fullDescription: app.fullDescription ?? "",
            supportEmail: app.supportEmail ?? "",
            privacyUrl: app.privacyUrl ?? "",
          }}
          screenshots={{
            phone: app.phoneScreenshotIds.map((id) => ({ id, url: `/api/v1/assets/${id}` })),
            iphone: app.iphoneScreenshotIds.map((id) => ({ id, url: `/api/v1/assets/${id}` })),
          }}
        />
      ) : null}
      {step === "publishing" ? (
        <PublishingStep
          autoPublish={managedPublishing(plan, effective)}
          ios={hasFeature(current, "ios")}
          planName={current?.name ?? "current"}
          upgrade={{
            managed: lowestPlanWith(effective, (p) => hasFeature(p, "auto_publish"), plan),
            ios: lowestPlanWith(effective, (p) => hasFeature(p, "ios"), plan),
          }}
          teamPublishes={app.publishingMode === "managed"}
          saved={{
            play: hasStoreKeys(app).play ? { clientEmail: app.googlePlayClientEmail } : null,
            appStore: hasStoreKeys(app).appStore ? { issuerId: app.ascIssuerId, keyId: app.ascKeyId } : null,
            firebase: { android: Boolean(app.firebaseAndroidAssetId), ios: Boolean(app.firebaseIosAssetId) },
          }}
        />
      ) : null}

      {/* 46 Links that open the app: the link files' status, with "Check links". */}
      {step === "publishing" || complete ? (
        <section aria-labelledby="h-links" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="h-links" className="m-0 flex items-center gap-2 text-lg font-bold">
              <Icon name="link" size={22} />
              Links to your app
            </h2>
            <Link href="/dashboard/publishing/links" className="text-sm font-semibold">
              Fingerprint and Team ID
            </Link>
          </div>
          <p className="m-0 text-sm leading-relaxed text-ink-4">
            Shared links open your app when it&apos;s installed. Check that the files phones read are in place
            {app.backend === "wordpress" ? ", on your website too" : ""}.
          </p>
          <CheckLinksPanel last={app.linksCheck ?? null} />
        </section>
      ) : null}

      {upcoming.length ? (
        <section aria-labelledby="h-next" className="flex flex-col gap-3">
          <h2 id="h-next" className="m-0 text-lg font-bold">
            Coming up
          </h2>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {upcoming.map((s) => (
              <div key={s} className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-sand px-5 py-[18px]">
                <span className="text-[15px] font-bold">
                  {editableSteps.indexOf(s) + 1} · {STEP_LABEL[s]}
                </span>
                <span className="text-sm leading-relaxed text-ink-4">{COMING_UP[s]}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** 33 The Branding step's designs for the app's kind, each as the draft it makes, and the draft as it is for "Keep my pages". */
async function brandingDesigns(store: DataStore, app: App): Promise<Pick<BrandingDesigns, "designs" | "current" | "design">> {
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const chosen = designById(app.design);
  return {
    designs: designsFor(app).map((d) => ({ id: d.id, name: d.name, description: d.description, layout: designLayout(app, d, record.draft, now) })),
    current: record.draft,
    design: chosen && designFits(chosen, app) ? chosen.id : null,
  };
}
