import type { Metadata } from "next";
import { PageHelp } from "@/components/page-help";
import { helpLinks } from "@/lib/docs/help";
import { appProblems } from "@/lib/app/problems-load";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { stopManagingAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/dashboard-nav";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { DashboardLanguage } from "@/components/dashboard-language";
import { ThemeSwitch } from "@/components/theme-switch";
import { SignOutButton } from "@/components/sign-out";
import { AppSwitcher } from "@/components/app-switcher";
import { BusinessSwitcher } from "@/components/business-switcher";
import { UpdatesBell } from "@/components/updates-bell";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { appLabel, licensePageName, MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { appTypeName, contentNavOf, kindOf, usersLabelOf } from "@/lib/app/kinds";
import { chatSessionKind } from "@/lib/chat/access";
import { contextCan, requireClient } from "@/lib/auth/session";
import { needsYallappSignIn, storeBillingSource } from "@/lib/store-billing/access";
import { pathPermission } from "@/lib/team/permissions";
import type { DashKey } from "@/i18n/dashboard";
import { getVisitorContact } from "@/lib/contact";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { studioPathFor } from "@/lib/studio/section";
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
  const contact = await getVisitorContact();
  const context = await requireClient();
  const { user, staff, member, app, client, licenses, state, businesses } = context;
  // 103R A Yallapp Studio project lives in Studio: its pages open there (the same page in Studio's frame).
  if (app?.section === "studio") {
    const target = studioPathFor((await headers()).get("x-yallapp-path") ?? "");
    if (target) redirect(target);
  }
  // 103R The regular apps only: Studio projects have their own home.
  const apps = context.apps.filter((a) => a.section !== "studio");
  // 60 The person signed in: a team member shows as themselves.
  const me = member ?? user;
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
  const problems = app && contextCan(context, "settings") ? await appProblems(app) : [];
  const groups: DashboardNavGroup[] = [
    {
      items: [
        {
          href: "/dashboard",
          label: t("nav.overview"),
          icon: "dashboard",
          exact: true,
          // 93.3 The app's problems, for whoever may fix them.
          ...(problems.length ? { badge: { count: problems.length, label: t("nav.problems", { count: problems.length }) } } : {}),
        },
        { href: "/dashboard/setup", label: t("nav.setup"), icon: "tune", prefix: "/dashboard/app-type" },
        { href: "/dashboard/pages", label: t("nav.pages"), icon: "palette" },
        // 103R.3 Yallapp Studio, the account's own section for apps designed screen by screen.
        { href: "/studio", label: t("studio.title"), icon: "draw" },
        // 51 The app's videos, pictures and PDFs, kept by Yallapp.
        ...(app ? [{ href: "/dashboard/media", label: t("nav.media"), icon: "photo_library" as const }] : []),
        // 77 The people using the app write to the business (apps whose people Yallapp knows).
        ...(app && chatSessionKind(app) ? [{ href: "/dashboard/chat", label: t("chat.nav"), icon: "forum" as const }] : []),
        // 43 The app's languages and every text in them.
        { href: "/dashboard/languages", label: t("nav.languages"), icon: "language" },
        // 53 Screenshots and screen recording in the app.
        { href: "/dashboard/protection", label: t("nav.protection"), icon: "lock" },
        { href: "/dashboard/preview", label: t("nav.preview"), icon: "visibility" },
        // 44 How people use the app.
        { href: "/dashboard/analytics", label: t("nav.analytics"), icon: "monitoring" },
        // 80.1 Everything the app is connected to, with its state and a test.
        ...(app ? [{ href: "/dashboard/integrations", label: t("integrations.title"), icon: "link" as const }] : []),
        // 100.2 Courses and memberships sold through Google Play and the App Store (academies on the dashboard's courses or WordPress;
        // 100.7 also Teachable, Thinkific and their own API, which first needs Yallapp's sign-in).
        ...(app && (storeBillingSource(app) || needsYallappSignIn(app)) && contextCan(context, "settings") ? [{ href: "/dashboard/in-app-purchases", label: t("inapp.nav"), icon: "shopping_bag" as const }] : []),
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
          // 85.4 WordPress apps send campaigns through their site.
          [
            {
              label: k(usersLabelOf(app)),
              items: [
                ...(app.backend === "wordpress" ? [{ href: "/dashboard/notifications/campaigns", label: t("campaigns.title"), icon: "campaign" as const }] : []),
                { href: "/dashboard/app-sign-in", label: t("nav.appSignIn"), icon: "login" as const },
              ],
            },
          ]
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
        // 60 The people who work with the owner.
        { href: "/dashboard/team", label: t("team.nav"), icon: "groups" },
        // 57 The full list behind the bell (the address stays).
        { href: "/dashboard/announcements", label: t("nav.updates"), icon: "campaign" },
        // 58 Phones signed in to Yallapp Business with this account.
        { href: "/dashboard/phones", label: t("owner.nav"), icon: "smartphone" },
        // 66 Who is signed in, and deleting the Yallapp account.
        { href: "/dashboard/account", label: t("account.nav"), icon: "account_circle" },
        { href: contact.whatsappUrl, label: t("nav.support"), icon: "support_agent", external: true },
      ],
    },
  ];
  // 60 Only what the signed-in person may open (lib/team/permissions.ts); a group left empty goes.
  const allowed = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.external || contextCan(context, pathPermission(item.href))) }))
    .filter((group) => group.items.length);
  const bold = { b: (chunk: string) => <strong>{chunk}</strong> };

  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      {/* 73 Light or dark like the website (globals.css). */}
      <div lang={lang} dir={dir} data-site-theme="" className="flex min-h-screen flex-col bg-ivory md:flex-row">
        <a
          href="#main"
          className="sr-only z-50 rounded-[10px] bg-midnight px-4 py-2.5 font-semibold text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:text-white"
        >
          {t("nav.skip")}
        </a>
        <DashboardSidebar
          logo={
            <Link href="/dashboard" className="flex rounded-md">
              <Logo height={28} adaptive alt={t("nav.logoAlt")} />
            </Link>
          }
          actions={<UpdatesBell initial={bell} />}
          switcher={
            apps.length || businesses.length ? (
              <div className="flex flex-col gap-2.5">
                {/* 60 Someone on several businesses picks which one. */}
                {businesses.length ? (
                  <BusinessSwitcher
                    current={client.id}
                    businesses={businesses.map((b) => ({ clientId: b.clientId, name: b.name === "Untitled app" ? k("Untitled app") : b.name, role: t(`team.roles.${b.role}` as DashKey) }))}
                  />
                ) : null}
                {apps.length ? (
                  <AppSwitcher apps={switcherApps} current={app?.id ?? null} currentApp={currentApp} canAdd={context.apps.length < MAX_APPS_PER_CLIENT && contextCan(context, "apps")} />
                ) : null}
              </div>
            ) : null
          }
          groups={allowed}
          footer={
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ivory text-sm font-bold text-ink-3" aria-hidden="true">
                  {(me.name.trim()[0] ?? "?").toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{me.name}</span>
                  <span className="truncate text-xs text-muted" title={me.email} dir="ltr">
                    {me.email}
                  </span>
                  {member ? <span className="truncate text-xs text-muted">{t(`team.roles.${context.access.role}` as DashKey)}</span> : null}
                </span>
              </div>
              {/* 56 The dashboard's language, saved for whoever is signed in; 73 light or dark. */}
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DashboardLanguage lang={lang} label={t("nav.languageList")} />
                </div>
                <ThemeSwitch label={t("nav.darkMode")} className="h-9 w-9" />
              </div>
              <SignOutButton className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold text-midnight hover:border-midnight">
                <Icon name="logout" size={18} />
                {t("nav.signOut")}
              </SignOutButton>
            </div>
          }
        />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-8 sm:pt-8 lg:px-10">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
            {/* 93.2 Help with this page. */}
            <PageHelp links={helpLinks(lang)} label={t("nav.pageHelp")} />
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
