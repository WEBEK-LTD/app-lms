import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { Notice, PageHeader, Section, btn } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { wordsOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { DEMO_SIGN_IN } from "@/lib/demo/constants";
import { effectivePlans } from "@/lib/entitlements";
import { appUrl, signingSecret } from "@/lib/env";
import { hostedSettings } from "@/lib/hosted/service";
import { appDefaults, draftLayout, publishedLayout } from "@/lib/pages/layout";
import { LANGUAGE_NAMES } from "@/lib/pages/types";
import { languagesForPlan } from "@/lib/pages/plan";
import { draftPreviewSupported, missingSteps, previewContentSource } from "@/lib/preview/config";
import { createPreviewToken, previewAppPath, previewKey } from "@/lib/preview/token";
import { PreviewPanel } from "./panel";

export const metadata: Metadata = { title: "Preview your app" };
export const dynamic = "force-dynamic";

/** Where each setup step is edited. */
const STEP_HREF: Record<string, string> = {
  "app-type": "/dashboard/app-type",
  website: "/dashboard/setup?step=website",
  branding: "/dashboard/setup?step=branding",
  listing: "/dashboard/setup?step=listing",
  publishing: "/dashboard/setup?step=publishing",
};

/**
 * 17 The live preview: the real app (its web build, public/preview-app) in a
 * phone frame, with the app's current setup and content. A preview link
 * lasts an hour; a new one is made each time this page loads.
 */
export default async function PreviewPage({ searchParams }: PageProps<"/dashboard/preview">) {
  const { app, license } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const draftSupported = draftPreviewSupported(app);
  const draft = draftSupported && (await searchParams).pages === "draft";
  const token = createPreviewToken({ appId: app.id, draft }, previewKey(signingSecret()), now);
  const path = previewAppPath(token);
  const phoneUrl = `${appUrl()}${path}`;
  const missing = missingSteps(app, planId, plans);
  const source = previewContentSource(app);
  const name = appLabel(app);

  // The languages the app offers, as it will get them (draft or published, within the plan).
  const layout = draft ? await draftLayout(store, app, now) : await publishedLayout(store, app.id);
  const languages = languagesForPlan(layout?.languages ?? (await appDefaults(store)).languages, plan);
  const languageOptions = languages.available.map((code) => ({ code, label: LANGUAGE_NAMES[code] }));

  const sourceText: Record<typeof source, string> = {
    wordpress: `Your WordPress site, ${app.siteUrl ?? ""}, through the Yallapp plugin.`,
    custom_api: `Your own API, ${app.apiBaseUrl ?? ""}.`,
    hosted: "Your content in Yallapp, or the platform you connected.",
    none:
      app.backend === "setup_requested"
        ? // 19 Our team is still setting up the WordPress site.
          "Your WordPress site, once our team has set it up. Until then the preview shows your app's look."
        : "Not connected yet. The preview shows your app's look until you choose where its content comes from.",
  };

  const settings = hostedSettings(app);
  const signIn = app.demo ? (
    <>
      Sign in with the demo number {DEMO_SIGN_IN.display} and the code {DEMO_SIGN_IN.code}.
    </>
  ) : app.backend === "hosted" ? (
    settings.reviewPhone && settings.reviewCode ? (
      <>
        Sign in with your store review number, {settings.reviewPhone}, and its code. Change them on <Link href="/dashboard/app-sign-in">App sign-in</Link>.
      </>
    ) : (
      <>
        To try the signed-in screens, add a store review number and code on <Link href="/dashboard/app-sign-in">App sign-in</Link>, then sign in with them here.
      </>
    )
  ) : app.backend === "setup_requested" ? (
    <>
      Signing in works in the preview once our team has set up your WordPress site with the Yallapp plugin: then sign in with the store review number and code
      set in the plugin&apos;s settings. Choose how people sign in now on <Link href="/dashboard/app-sign-in">App sign-in</Link>.
    </>
  ) : app.backend === "wordpress" ? (
    <>
      The preview never sends sign-in codes. Sign in with the store review number and code set in the Yallapp plugin&apos;s settings on your site (Store review
      access)
      {app.siteUrl ? (
        <>
          :{" "}
          <a href={`${app.siteUrl.replace(/\/+$/, "")}/wp-admin/admin.php?page=yallapp`} target="_blank" rel="noreferrer">
            open the plugin&apos;s settings
          </a>
        </>
      ) : null}
      . An older plugin can&apos;t do this: the preview then says sign-in is available in the installed app.
    </>
  ) : (
    <>
      Your API signs people in the preview when it supports preview sign-in. See <Link href="/docs/my-own-api#let-the-app-preview-reach-your-api">Connect your own API</Link>.
    </>
  );

  return (
    <>
      <PageHeader
        title="Preview your app"
        eyebrow={name}
        description={
          <>
            Your real app, running in your browser with your current setup and content. Check the type, content, branding, look, pages, tabs and languages before you
            build. Nothing here is published or sent to your app&apos;s users.
          </>
        }
      />

      {draftSupported ? (
        <nav aria-label="Pages to show" className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">Pages:</span>
          <Link href="/dashboard/preview" aria-current={draft ? undefined : "page"} className={`${draft ? btn.secondary : btn.primary} h-9 px-3.5 text-sm`}>
            Published
          </Link>
          <Link href="/dashboard/preview?pages=draft" aria-current={draft ? "page" : undefined} className={`${draft ? btn.primary : btn.secondary} h-9 px-3.5 text-sm`}>
            Draft from Pages &amp; look
          </Link>
        </nav>
      ) : (
        <Notice icon="info">
          The preview shows your published pages: your {source === "wordpress" || app.backend === "setup_requested" ? "site" : "API"} gets pages from Yallapp only once they&apos;re published. Drafts show in the
          editor on <Link href="/dashboard/pages">Pages &amp; look</Link>.
        </Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PreviewPanel src={path} appName={name} languages={languageOptions} defaultLanguage={languages.default} />

        <div className="flex min-w-0 flex-col gap-4">
          {missing.length ? (
            <Section id="missing" titleId="h-missing" title="What's missing" description="The preview fills these with placeholders until you finish them.">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {missing.map((m) => (
                  <li key={m.step}>
                    <Link href={STEP_HREF[m.step] ?? "/dashboard/setup"} className="flex items-center gap-2 text-[15px] font-semibold">
                      <Icon name="radio_button_unchecked" size={18} className="text-faint" />
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Notice tone="success" icon="check_circle">
              Your setup is complete. If everything looks right, start a build on <Link href="/dashboard/builds">Builds &amp; downloads</Link>.
            </Notice>
          )}

          <Section id="phone" titleId="h-phone" title="Open on your phone" description="Scan the code with your phone's camera. The link works for an hour.">
            <div className="flex flex-wrap items-center gap-4">
              <QrCode value={phoneUrl} label={`QR code that opens the preview of ${name}`} size={152} />
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 text-sm leading-relaxed text-ink-4">
                <span>
                  On a phone the preview fills the screen.{" "}
                  {wordsOf(app).iphone ? `Opened on an iPhone, it follows the iPhone rules. ${wordsOf(app).iphone}` : "Opened on an iPhone, it shows what the iPhone app shows."}
                </span>
                <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold">
                  Open in a new tab
                  <Icon name="open_in_new" size={16} />
                </a>
              </div>
            </div>
          </Section>

          <Section id="about" titleId="h-about" title="About the preview">
            <dl className="m-0 flex flex-col gap-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold">Content</dt>
                <dd className="m-0 text-ink-4">{sourceText[source]}</dd>
              </div>
              <div>
                <dt className="font-semibold">Signing in</dt>
                <dd className="m-0 text-ink-4">{signIn} The preview never sends sign-in codes.</dd>
              </div>
              <div>
                <dt className="font-semibold">Only in the installed app</dt>
                <dd className="m-0 text-ink-4">
                  Push notifications, protected videos, web pages inside the app (such as checkout and payment) and screen capture protection. The preview shows a short note
                  where they would be.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Changes</dt>
                <dd className="m-0 text-ink-4">
                  Saved changes show after <strong>Reload after changes</strong>. A new build is still needed for your name under the icon, the icon and the store listing.
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}
