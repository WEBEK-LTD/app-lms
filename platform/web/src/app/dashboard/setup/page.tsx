import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import { listingLanguages } from "@/lib/app/listing-languages";
import { appLanguageName } from "@/lib/i18n/language-names";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, PageHeader, btn, formatDate } from "@/components/ui";
import { AppDeletion } from "@/components/app-deletion";
import { richText } from "@/i18n/rich";
import { dashboardText } from "@/lib/dashboard-lang";
import { SETUP_STEPS, STEP_LABEL, hasStoreKeys, isSetupStep, managedPublishing, nextStep, stepStatus, type SetupStep } from "@/lib/app/setup";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { appLabel, licensePageName } from "@/lib/app/label";
import { wordsOf } from "@/lib/app/kinds";
import { contextCan, requireClient } from "@/lib/auth/session";
import { OwnerOnly } from "@/components/owner-only";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey } from "@/lib/env";
import { platformValues } from "@/lib/hosted/connectors/platforms";
import { platformDefinitions } from "@/lib/hosted/connectors/registry";
import { chosenSignInMethods, emailOnlyUsersAtRisk } from "@/lib/hosted/sign-in-methods";
import { hostedApiUrl } from "@/lib/hosted/urls";
import { normalizeSiteUrl } from "@/lib/license/site-url";
import { siteMatch } from "@/lib/app/site-match";
import { hasFeature, lowestPlanWith, planName } from "@/lib/plans";
import { FREE_FONT_COUNT } from "@/lib/fonts/catalog";
import { BrandingStep, ListingStep, PublishingStep, WebsiteStep, type BrandingDesigns } from "./steps";
import { CheckLinksPanel } from "../publishing/links/forms";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { designLayout, loadLayout } from "@/lib/pages/layout";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { getSwitches, noWebsiteFor, websiteOf, websiteOn } from "@/lib/switches";
import { designFitsApp, designsForApp, findDesign } from "@/lib/pages/designs/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("setup.title") };
}

const COMING_UP = {
  website: "setup.upWebsite",
  branding: "setup.upBranding",
  listing: "setup.upListing",
  publishing: "setup.upPublishing",
} as const satisfies Record<Exclude<SetupStep, "app-type">, string>;

export default async function SetupPage({ searchParams }: PageProps<"/dashboard/setup">) {
  const context = await requireClient("settings");
  const { client, app, apps, license, state, staff } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang } = await dashboardText();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const store = await getStore();
  const plans = plansIn(lang, await getPlans(store));
  // 13.1 The app's plan as it is now, with the team's edits and switches.
  const effective = plansIn(lang, await effectivePlans(store));
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
  // 88.2 The listing's languages: the app's own.
  const listingLangs = await listingLanguages(store, app);
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
        title={t("setup.title")}
        actions={
          <Link href="/dashboard/preview" className={`${btn.secondary} h-10 px-4 text-sm`}>
            <Icon name="visibility" size={18} />
            {t("setup.preview")}
          </Link>
        }
        description={
          <>
            {t("setup.planLine", { app: name, plan: planName(plan, plans) })} ·{" "}
            {complete ? (builds.length ? t("setup.completeBuilds") : t("setup.complete")) : t("setup.firstBuild")}
          </>
        }
      />

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          {t("setup.ended")}
        </Notice>
      ) : state === "pending" && client.status === "active" ? (
        <Notice tone="warn" icon="hourglass_top">
          {richText(t("setup.waiting", { app: name, page: k(licensePageName(app)) }), { license: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
        </Notice>
      ) : null}

      {/* One row of steps: scrolls sideways on phones, five columns from md up. */}
      <ol
        aria-label={t("setup.steps")}
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
                  {k(STEP_LABEL[s])}
                  {done ? <span className="sr-only">{t("setup.done")}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {step === "website" && websiteSwitchedOff ? (
        <Notice tone="warn" icon="info" role="status">
          {t("setup.switchedOff")}
        </Notice>
      ) : null}
      {/* 60 Where the content comes from is the owner's choice; a manager sees that. */}
      {step === "website" && !contextCan(context, "apps") ? <OwnerOnly id="h-website-owner" title={k(STEP_LABEL.website)} /> : null}
      {step === "website" && contextCan(context, "apps") ? (
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
          setupRequestedAt={app.setupRequestedAt ? formatDate(app.setupRequestedAt, lang) : null}
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
          fontCount={FREE_FONT_COUNT}
          {...await brandingDesigns(store, app)}
        />
      ) : null}
      {step === "listing" ? (
        <ListingStep
          descriptionHint={k(wordsOf(app).storeDescription)}
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
            tablet: (app.tabletScreenshotIds ?? []).map((id) => ({ id, url: `/api/v1/assets/${id}` })),
            ipad: (app.ipadScreenshotIds ?? []).map((id) => ({ id, url: `/api/v1/assets/${id}` })),
          }}
          languages={[listingLangs.main, ...listingLangs.others].map((code) => ({ code, name: appLanguageName(code, lang) }))}
          listing={{
            language: listingLangs.main,
            translations: Object.fromEntries(
              (app.listingTranslations ?? []).map((item) => [
                item.language,
                { storeTitle: item.storeTitle, shortDescription: item.shortDescription, fullDescription: item.fullDescription, captions: item.captions.join("\n") },
              ]),
            ),
            framed: Boolean(app.screenshotFrame),
            captions: (app.screenshotFrame?.captions ?? []).join("\n"),
          }}
        />
      ) : null}
      {step === "publishing" ? (
        <PublishingStep
          autoPublish={managedPublishing(plan, effective)}
          ios={hasFeature(current, "ios")}
          planName={current?.name ?? planName(plan, plans)}
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
              {t("setup.links")}
            </h2>
            <Link href="/dashboard/publishing/links" className="text-sm font-semibold">
              {t("setup.fingerprint")}
            </Link>
          </div>
          <p className="m-0 text-sm leading-relaxed text-ink-4">{app.backend === "wordpress" ? t("setup.linksTextSite") : t("setup.linksText")}</p>
          <CheckLinksPanel last={app.linksCheck ?? null} />
        </section>
      ) : null}

      {/* 73 The danger zone: the owner deletes the app. */}
      <AppDeletion context={context} app={app} name={name} />

      {upcoming.length ? (
        <section aria-labelledby="h-next" className="flex flex-col gap-3">
          <h2 id="h-next" className="m-0 text-lg font-bold">
            {t("setup.comingUp")}
          </h2>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {upcoming.map((s) => (
              <div key={s} className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-sand px-5 py-[18px]">
                <span className="text-[15px] font-bold">{t("setup.stepNumber", { n: editableSteps.indexOf(s) + 1, step: k(STEP_LABEL[s]) })}</span>
                <span className="text-sm leading-relaxed text-ink-4">{t(COMING_UP[s])}</span>
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
  // 84.4 The built-in designs and the team's.
  const chosen = await findDesign(store, app.design);
  return {
    designs: (await designsForApp(store, app)).map((d) => ({ id: d.id, name: d.name, description: d.description, layout: designLayout(app, d, record.draft, now) })),
    current: record.draft,
    design: chosen && (await designFitsApp(store, chosen, app)) ? chosen.id : null,
  };
}
