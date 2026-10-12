import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, formatDate } from "@/components/ui";
import { SETUP_STEPS, STEP_LABEL, hasStoreKeys, isSetupStep, nextStep, stepStatus, type SetupStep } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { normalizeSiteUrl } from "@/lib/license/site-url";
import { planName } from "@/lib/plans";
import { BrandingStep, ListingStep, PublishingStep, WebsiteStep } from "./steps";

export const metadata: Metadata = { title: "App setup" };

const COMING_UP: Record<Exclude<SetupStep, "app-type">, string> = {
  website: "Where your app gets its content: your WordPress site and the plugin, your own API, or a WordPress site we set up for you.",
  branding: "App name, name under the icon, icon, logo, colors, template and font.",
  listing:
    "Android package name, iOS bundle ID, store title, short and full description, support email, privacy policy URL, and optionally your store screenshots.",
  publishing:
    "Pro: Google Play service account JSON and App Store Connect API key (Issuer ID, Key ID, .p8 file). Starter: optionally the App Store Connect API key to sign your iOS app, then publish with our guides. Optional on every plan: Firebase files for push notifications.",
};

export default async function SetupPage({ searchParams }: PageProps<"/dashboard/setup">) {
  const { client, app, license, state } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const plan = license?.plan ?? null;
  const status = stepStatus(app, plan);
  const requested = (await searchParams).step;
  const step: SetupStep = isSetupStep(requested) && requested !== "app-type" ? requested : (nextStep(app, plan) ?? "website");
  const complete = Object.values(status).every(Boolean);

  const store = await getStore();
  const activation = license ? await store.getActivation(license.id) : null;
  const icon = app.iconAssetId ? await store.getAsset(app.iconAssetId) : null;
  const logo = app.logoAssetId ? await store.getAsset(app.logoAssetId) : null;
  const builds = await store.listBuildsByClient(client.id, 1);
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
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">App setup</h1>
        <span className="text-[15px] text-muted">
          Plan: {planName(plan)} ·{" "}
          {complete
            ? builds.length
              ? "Setup is complete. Changes apply to your next build."
              : "Setup is complete."
            : "Your first build starts when all steps are complete."}
        </span>
      </div>

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan has ended. You can still edit your app, but new builds need an active plan. Message us on WhatsApp to renew.
        </Notice>
      ) : null}

      <ol aria-label="Setup steps" className="m-0 grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {SETUP_STEPS.map((s, i) => {
          const current = s === step;
          const done = status[s];
          const href = s === "app-type" ? "/dashboard/app-type" : `/dashboard/setup?step=${s}`;
          return (
            <li key={s}>
              <Link
                href={href}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-xl bg-white text-midnight no-underline hover:text-midnight ${
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

      {step === "website" ? (
        <WebsiteStep
          siteUrl={app.siteUrl ?? client.siteUrl}
          plugin={pluginState}
          activatedSite={activation?.siteUrl ?? null}
          pluginVersion={activation?.pluginVersion ?? null}
          backend={app.backend}
          apiBaseUrl={app.apiBaseUrl ?? ""}
          setupNote={app.setupNote ?? ""}
          setupRequestedAt={app.setupRequestedAt ? formatDate(app.setupRequestedAt) : null}
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
        />
      ) : null}
      {step === "listing" ? (
        <ListingStep
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
          plan={plan}
          saved={{
            play: hasStoreKeys(app).play ? { clientEmail: app.googlePlayClientEmail } : null,
            appStore: hasStoreKeys(app).appStore ? { issuerId: app.ascIssuerId, keyId: app.ascKeyId } : null,
            firebase: { android: Boolean(app.firebaseAndroidAssetId), ios: Boolean(app.firebaseIosAssetId) },
          }}
        />
      ) : null}

      {upcoming.length ? (
        <section aria-labelledby="h-next" className="flex flex-col gap-3">
          <h2 id="h-next" className="m-0 text-base font-bold text-muted">
            Coming up
          </h2>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {upcoming.map((s) => (
              <div key={s} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white px-5 py-[18px]">
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
