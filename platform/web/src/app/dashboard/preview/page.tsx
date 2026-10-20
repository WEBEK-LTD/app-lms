import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
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
import { yallappSignsIn } from "@/lib/hosted/sign-in-methods";
import { appDefaults, draftLayout, publishedLayout } from "@/lib/pages/layout";
import { appLanguageName } from "@/lib/i18n/language-names";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { languagesForPlan } from "@/lib/pages/plan";
import { draftPreviewSupported, missingSteps, previewContentSource } from "@/lib/preview/config";
import { createPreviewToken, previewAppPath, previewKey } from "@/lib/preview/token";
import { PreviewPanel } from "./panel";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("preview.title") };
}
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
  const { app, license } = await requireClient("dashboard");
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const draftSupported = draftPreviewSupported(app);
  const params = await searchParams;
  const draft = draftSupported && params.pages === "draft";
  const token = createPreviewToken({ appId: app.id, draft }, previewKey(signingSecret()), now);
  const path = previewAppPath(token);
  const phoneUrl = `${appUrl()}${path}`;
  const missing = missingSteps(app, planId, plans);
  const source = previewContentSource(app);
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);

  // The languages the app offers, as it will get them (draft or published, within the plan).
  const layout = draft ? await draftLayout(store, app, now) : await publishedLayout(store, app.id);
  const languages = languagesForPlan(layout?.languages ?? (await appDefaults(store)).languages, plan);
  const languageOptions = languages.available.map((code) => ({ code, label: appLanguageName(code, lang) }));
  // 43 The Languages page opens the preview in the language being translated.
  const startLanguage = typeof params.lang === "string" && languages.available.includes(params.lang) ? params.lang : languages.default;

  const site = (address: string) => ({ site: () => <bdi dir="ltr">{address}</bdi> });
  const sourceText: Record<typeof source, ReactNode> = {
    wordpress: richText(t("preview.sourceWordpress"), site(app.siteUrl ?? "")),
    custom_api: richText(t("preview.sourceApi"), site(app.apiBaseUrl ?? "")),
    hosted: t("preview.sourceHosted"),
    // 19 Our team is still setting up the WordPress site.
    none: app.backend === "setup_requested" ? t("preview.sourceSetup") : t("preview.sourceNone"),
  };

  const settings = hostedSettings(app);
  const linkTo = (href: string) => ({ link: (chunk: string) => <Link href={href}>{chunk}</Link> });
  const signInLink = linkTo("/dashboard/app-sign-in");
  const ltr = (text: string) =>
    function LtrText() {
      return <bdi dir="ltr">{text}</bdi>;
    };
  const signIn = app.demo
    ? richText(t("preview.demoSignIn"), { phone: ltr(DEMO_SIGN_IN.display), code: ltr(DEMO_SIGN_IN.code) })
    : app.backend === "hosted" || yallappSignsIn(app)
      ? settings.reviewPhone && settings.reviewCode
        ? richText(t("preview.reviewSignIn"), { ...signInLink, phone: ltr(settings.reviewPhone) })
        : richText(t("preview.addReview"), signInLink)
      : app.backend === "setup_requested"
        ? richText(t("preview.setupSignIn"), signInLink)
        : app.backend === "wordpress"
          ? app.siteUrl
            ? richText(t("preview.wpSignInLink"), {
                link: (chunk: string) => (
                  <a href={`${app.siteUrl!.replace(/\/+$/, "")}/wp-admin/admin.php?page=yallapp`} target="_blank" rel="noreferrer">
                    {chunk}
                  </a>
                ),
              })
            : t("preview.wpSignIn")
          : richText(t("preview.apiSignIn"), linkTo(localePath(lang, "/docs/my-own-api") + "#let-the-app-preview-reach-your-api"));

  return (
    <>
      <PageHeader
        title={t("preview.title")}
        eyebrow={name}
        description={t("preview.intro")}
      />

      {draftSupported ? (
        <nav aria-label={t("preview.pagesToShow")} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">{t("preview.pages")}</span>
          <Link href="/dashboard/preview" aria-current={draft ? undefined : "page"} className={`${draft ? btn.secondary : btn.primary} h-9 px-3.5 text-sm`}>
            {t("preview.published")}
          </Link>
          <Link href="/dashboard/preview?pages=draft" aria-current={draft ? "page" : undefined} className={`${draft ? btn.primary : btn.secondary} h-9 px-3.5 text-sm`}>
            {t("preview.draft")}
          </Link>
        </nav>
      ) : (
        <Notice icon="info">
          {richText(source === "wordpress" || app.backend === "setup_requested" ? t("preview.publishedOnlySite") : t("preview.publishedOnlyApi"), linkTo("/dashboard/pages"))}
        </Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PreviewPanel src={path} appName={name} languages={languageOptions} defaultLanguage={startLanguage} />

        <div className="flex min-w-0 flex-col gap-4">
          {missing.length ? (
            <Section id="missing" titleId="h-missing" title={t("preview.missing")} description={t("preview.missingText")}>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {missing.map((m) => (
                  <li key={m.step}>
                    <Link href={STEP_HREF[m.step] ?? "/dashboard/setup"} className="flex items-center gap-2 text-[15px] font-semibold">
                      <Icon name="radio_button_unchecked" size={18} className="text-faint" />
                      {k(m.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Notice tone="success" icon="check_circle">
              {richText(t("preview.complete"), linkTo("/dashboard/builds"))}
            </Notice>
          )}

          <Section id="phone" titleId="h-phone" title={t("preview.phone")} description={t("preview.phoneText")}>
            <div className="flex flex-wrap items-center gap-4">
              <QrCode value={phoneUrl} label={t("preview.qr", { app: name })} size={152} />
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 text-sm leading-relaxed text-ink-4">
                <span>
                  {t("preview.fillsScreen")}{" "}
                  {wordsOf(app).iphone ? t("preview.iphoneRules", { rule: k(wordsOf(app).iphone!) }) : t("preview.iphoneSame")}
                </span>
                <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold">
                  {t("preview.newTab")}
                  <Icon name="open_in_new" size={16} />
                </a>
              </div>
            </div>
          </Section>

          <Section id="about" titleId="h-about" title={t("preview.about")}>
            <dl className="m-0 flex flex-col gap-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold">{t("preview.content")}</dt>
                <dd className="m-0 text-ink-4">{sourceText[source]}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t("preview.signingIn")}</dt>
                <dd className="m-0 text-ink-4">
                  {signIn} {app.backend === "wordpress" && !app.demo ? null : t("preview.neverCodes")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{t("preview.installedOnly")}</dt>
                <dd className="m-0 text-ink-4">{t("preview.installedOnlyText")}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t("preview.changes")}</dt>
                <dd className="m-0 text-ink-4">{richText(t("preview.changesText"), { b: (chunk: string) => <strong>{chunk}</strong> })}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}
