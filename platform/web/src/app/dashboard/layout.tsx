import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { stopManagingAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/dashboard-nav";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { DashboardLanguage } from "@/components/dashboard-language";
import { SignOutButton } from "@/components/sign-out";
import { AppSwitcher } from "@/components/app-switcher";
import { UpdatesBell } from "@/components/updates-bell";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { appLabel, licensePageName, MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { appTypeName, contentNavOf, kindOf, usersLabelOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import { bellWords, dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { ACCOUNT_STATE_LABEL, appState } from "@/lib/license/status";
import { loadUpdates } from "@/lib/updates";
import { bellData, readerOf } from "@/lib/updates-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: { default: t("nav.title"), template: "%s · Yallapp" }, robots: { index: false } };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const contact = await getContact();
  const context = await requireClient();
  const { user, staff, app, apps, client, licenses, state } = context;
  // 56 The signed-in person's language (our team member managing a dashboard sees it in their own).
  const text = await dashboardText();
  const { t, k, lang, dir } = text;
  const now = new Date();
  // 57 The bell: counted on each load of the dashboard, for whoever is reading (our team member managing it has their own).
  const bell = bellData(await loadUpdates(await getStore(), readerOf(context, lang), now), bellWords(text));
  // Every app of the account, each on its own plan: the switcher shows which one the dashboard works on.
  const switcherApps = apps.map((a) => ({
    id: a.id,
    label: appLabel(a) === "Untitled app" ? k("Untitled app") : appLabel(a),
    detail: t("nav.switcherDetail", { type: k(appTypeName(a)), state: k(ACCOUNT_STATE_LABEL[appState(client, licenses.find((l) => l.appId === a.id) ?? null, now)]) }),
  }));
  const currentApp = app
    ? {
        label: switcherApps.find((a) => a.id === app.id)?.label ?? appLabel(app),
        typeName: k(kindOf(app).name),
        typeIcon: kindOf(app).icon,
        iconUrl: app.iconAssetId ? `/api/v1/assets/${app.iconAssetId}` : null,
        state,
        // An app whose plan ended is paused for its users.
        stateLabel: state === "expired" ? t("nav.paused") : k(ACCOUNT_STATE_LABEL[state]),
      }
    : null;

  // Only what the current app uses: its content pages, and the app users pages on the hosted API (21 in the kind's words).
  const content = app ? contentNavOf(app) : null;
  const groups: DashboardNavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: t("nav.overview"), icon: "dashboard", exact: true },
        { href: "/dashboard/setup", label: t("nav.setup"), icon: "tune", prefix: "/dashboard/app-type" },
        { href: "/dashboard/pages", label: t("nav.pages"), icon: "palette" },
        // 51 The app's videos, pictures and PDFs, kept by Yallapp.
        ...(app ? [{ href: "/dashboard/media", label: t("nav.media"), icon: "photo_library" as const }] : []),
        // 43 The app's languages and every text in them.
        { href: "/dashboard/languages", label: t("nav.languages"), icon: "language" },
        // 53 Screenshots and screen recording in the app.
        { href: "/dashboard/protection", label: t("nav.protection"), icon: "lock" },
        { href: "/dashboard/preview", label: t("nav.preview"), icon: "visibility" },
        // 44 How people use the app.
        { href: "/dashboard/analytics", label: t("nav.analytics"), icon: "monitoring" },
      ],
    },
    ...(content ? [{ label: k(content.label), items: content.items.map((item) => ({ ...item, label: k(item.label) })) }] : []),
    ...(app?.backend === "hosted"
      ? [
          {
            label: k(usersLabelOf(app)),
            items: [
              { href: "/dashboard/notifications", label: t("nav.appNotifications"), icon: "notifications" as const },
              { href: "/dashboard/app-sign-in", label: t("nav.appSignIn"), icon: "login" as const },
            ],
          },
        ]
      : app?.backend === "wordpress" || app?.backend === "setup_requested" || app?.backend === "custom_api"
        ? // 18 WordPress apps choose how people sign in, and the WhatsApp number that sends their codes (19: also while our team sets up the site).
          // 19 Own API apps see how their API signs people in.
          [{ label: k(usersLabelOf(app)), items: [{ href: "/dashboard/app-sign-in", label: t("nav.appSignIn"), icon: "login" as const }] }]
        : []),
    {
      label: t("nav.publish"),
      items: [
        { href: "/dashboard/builds", label: t("nav.builds"), icon: "build" },
        { href: "/dashboard/publishing", label: t("nav.publishing"), icon: "publish" },
        // 46 Crash-free sessions, the rating prompt and crash reports.
        { href: "/dashboard/stability", label: t("nav.stability"), icon: "monitoring" },
      ],
    },
    {
      label: t("nav.account"),
      items: [
        { href: "/dashboard/license", label: k(licensePageName(app)), icon: "workspace_premium" },
        // 57 The full list behind the bell (the address stays).
        { href: "/dashboard/announcements", label: t("nav.updates"), icon: "campaign" },
        // 58 Phones signed in to Yallapp Business with this account.
        { href: "/dashboard/phones", label: t("owner.nav"), icon: "smartphone" },
        { href: contact.whatsappUrl, label: t("nav.support"), icon: "support_agent", external: true },
      ],
    },
  ];
  const bold = { b: (chunk: string) => <strong>{chunk}</strong> };

  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <div lang={lang} dir={dir} className="flex min-h-screen flex-col bg-ivory md:flex-row">
        <a
          href="#main"
          className="sr-only z-50 rounded-[10px] bg-midnight px-4 py-2.5 font-semibold text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:text-white"
        >
          {t("nav.skip")}
        </a>
        <DashboardSidebar
          logo={
            <Link href="/dashboard" className="flex rounded-md">
              <Logo height={28} alt={t("nav.logoAlt")} />
            </Link>
          }
          actions={<UpdatesBell initial={bell} />}
          switcher={
            apps.length ? (
              <AppSwitcher apps={switcherApps} current={app?.id ?? null} currentApp={currentApp} canAdd={apps.length < MAX_APPS_PER_CLIENT} />
            ) : null
          }
          groups={groups}
          footer={
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ivory text-sm font-bold text-ink-3" aria-hidden="true">
                  {(user.name.trim()[0] ?? "?").toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted" title={user.email} dir="ltr">
                    {user.email}
                  </span>
                </span>
              </div>
              {/* 56 The dashboard's language, saved for whoever is signed in. */}
              <DashboardLanguage lang={lang} label={t("nav.languageList")} />
              <SignOutButton className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-midnight hover:border-midnight">
                <Icon name="logout" size={18} />
                {t("nav.signOut")}
              </SignOutButton>
            </div>
          }
        />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-8 sm:pt-8 lg:px-10">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
            {staff ? (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-midnight px-4 py-3 text-sm text-white">
                <span className="flex items-center gap-2">
                  <Icon name="key" size={20} />
                  <span>
                    {app && apps.length > 1
                      ? richText(t("nav.staffApp", { name: user.name, app: appLabel(app) }), bold)
                      : richText(t("nav.staff", { name: user.name }), bold)}
                  </span>
                </span>
                <form action={stopManagingAction}>
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    {t("nav.backToAdmin")}
                  </SubmitButton>
                </form>
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </DashboardI18n>
  );
}
