import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { DashboardLanguage } from "@/components/dashboard-language";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/dashboard-nav";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { DesignerAvatar } from "@/components/studio-market/parts";
import { ThemeSwitch } from "@/components/theme-switch";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { designerChip } from "@/lib/studio-market/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: { default: t("studioMarket.designerArea"), template: "%s · Yallapp" }, robots: { index: false } };
}

/**
 * 106.1 The designer area, in the dashboard's own shell: the designer's
 * card in place of the app switcher, their templates and publishing one,
 * Studio, and their account; the dark bar switches between Studio, Studio
 * Market and this area. The account's owner only (the owner-only
 * `billing`), once they joined (else "Become a designer").
 */
export default async function DesignerLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient("billing");
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const { t, lang, dir } = await dashboardText();
  const contact = await getVisitorContact();
  const me = context.member ?? context.user;
  const notes = (await store.listMarketTemplates({ designerId: designer.id, statuses: ["changes_requested"] })).length;
  const chip = designerChip(designer);
  const groups: DashboardNavGroup[] = [
    {
      items: [
        {
          href: "/designer/templates",
          label: t("studioMarket.navTemplates"),
          icon: "dashboard_customize",
          ...(notes ? { badge: { count: notes, label: t("studioMarket.waitingNotes", { count: notes }) } } : {}),
        },
        { href: "/designer/publish", label: t("studioMarket.navPublish"), icon: "add_circle" },
      ],
    },
    {
      label: t("studioMarket.groupStudio"),
      items: [
        { href: "/studio/editor", label: t("studioMarket.navOpenStudio"), icon: "draw" },
        { href: "/studio", label: t("studioMarket.navProjects"), icon: "folder", exact: true },
      ],
    },
    {
      label: t("studioMarket.groupAccount"),
      items: [
        { href: "/designer/join", label: t("studioMarket.profileStep"), icon: "person" },
        { href: "/dashboard/account", label: t("studioMarket.navAccount"), icon: "account_circle" },
        { href: contact.whatsappUrl, label: t("studioMarket.navSupport"), icon: "support_agent", external: true },
      ],
    },
  ];
  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <div lang={lang} dir={dir} data-site-theme="" className="flex min-h-screen flex-col bg-ivory md:flex-row">
        <a href="#main" className="sr-only z-50 rounded-[10px] bg-midnight px-4 py-2.5 font-semibold text-white focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:text-white">
          {t("nav.skip")}
        </a>
        <DashboardSidebar
          logo={
            <Link href="/designer/templates" className="flex rounded-md">
              <Logo height={28} adaptive alt={t("nav.logoAlt")} />
            </Link>
          }
          switcher={
            <div className="flex items-center gap-3 rounded-xl border border-line bg-sand p-2.5">
              <DesignerAvatar designer={chip} size="md" square />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{designer.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${designer.status === "active" ? "bg-success" : "bg-warn"}`} />
                  <span className="truncate">{t(designer.status === "active" ? "studioMarket.designerStatus" : "studioMarket.designerPaused")}</span>
                </span>
              </span>
            </div>
          }
          groups={groups}
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
                </span>
              </div>
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
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 bg-midnight px-4 py-2.5 sm:px-8 lg:px-10">
            <nav aria-label={t("studio.section")} className="flex items-center gap-1 overflow-x-auto rounded-[10px] bg-night-2 p-1">
              <Link href="/studio" className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] whitespace-nowrap text-night-text no-underline hover:bg-night-line hover:text-white">
                <Icon name="draw" size={18} />
                {t("studio.title")}
              </Link>
              <Link href="/dashboard/studio-market" className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] whitespace-nowrap text-night-text no-underline hover:bg-night-line hover:text-white">
                <Icon name="storefront" size={18} />
                {t("studioMarket.nav")}
              </Link>
              <Link href="/designer/templates" aria-current="page" className="flex h-8 items-center gap-1.5 rounded-lg bg-ivory px-3 text-[13px] font-bold whitespace-nowrap text-midnight no-underline hover:text-midnight">
                <Icon name="palette" size={18} />
                {t("studioMarket.designerArea")}
              </Link>
            </nav>
          </header>
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-8 sm:pt-8 lg:px-10">
            <div className="mx-auto flex max-w-[1120px] flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </DashboardI18n>
  );
}
