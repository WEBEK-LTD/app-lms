import Link from "next/link";
import { openRegularAppsAction } from "@/app/actions/studio-projects";
import { DashboardLanguage } from "@/components/dashboard-language";
import { SignOutButton } from "@/components/sign-out";
import { ThemeSwitch } from "@/components/theme-switch";
import { BUSINESS_APP_LINKS } from "@/lib/business-app";
import { StoreMark } from "@/components/brand-marks";
import { isStudioProject } from "@/lib/studio/section";
import { pathPermission } from "@/lib/team/permissions";
import { CloseOnNavigate } from "./close-on-navigate";
import { localePath } from "@/i18n/paths";
import { contextCan, getClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { Glyph, STUDIO_COLORS as C } from "./editor/shared";

/**
 * 132.51 The signed-in person's menu on Studio's dark bar, as the regular
 * dashboard has it in its side menu: who is signed in, the dashboard's
 * language, Your account and Team (in Studio's own frame), the regular apps,
 * help, and signing out. A `<details>`, so it opens before the page's
 * scripts load; the language and signing out are forms. 132.3 In a
 * project, the account's other pages too (the plan, invoices, the phones
 * signed in to Yallapp Business, updates from Yallapp), and dark mode beside
 * the language; it closes when a page opens; light or dark with the frame.
 */
export async function StudioAccountMenu({ look = "bar" }: { look?: "bar" | "avatar" } = {}) {
  const context = await getClientContext();
  if (!context) return null;
  const { t, lang } = await dashboardText();
  const me = context.member ?? context.user;
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm no-underline hover:bg-[var(--sf-soft,#F4EFE6)]";
  // 132.3 The account's pages that are a project's (its plan and invoices) or shown in its frame.
  const project = context.app && isStudioProject(context.app);
  const more = project
    ? [
        { href: "/studio/project/license", dashboard: "/dashboard/license", label: t("studio.navPlan"), icon: "workspace_premium" },
        { href: "/studio/project/invoices", dashboard: "/dashboard/invoices", label: t("studio.navInvoices"), icon: "receipt_long" },
        { href: "/studio/project/phones", dashboard: "/dashboard/phones", label: t("owner.nav"), icon: "smartphone" },
        { href: "/studio/project/announcements", dashboard: "/dashboard/announcements", label: t("nav.updates"), icon: "campaign" },
      ].filter((m) => contextCan(context, pathPermission(m.dashboard)))
    : [];
  // 132.4 132.70 Light or dark with the frame: Studio's colours are its tokens (`--sf-…`).
  const ink = C.ink;
  const line = `1px solid ${C.line}`;
  return (
    <details className="relative" data-studio-account="">
      <CloseOnNavigate selector="[data-studio-account]" />
      {look === "avatar" ? (
        // 132.150 On the console's bar: the person's initial in a round avatar.
        <summary aria-label={t("studioKit.accountMenu")} title={t("studioKit.accountMenu")} className="ms-1 flex cursor-pointer list-none rounded-full">
          <span className="sc-av" aria-hidden="true">
            {(me.name.trim()[0] ?? "?").toUpperCase()}
          </span>
        </summary>
      ) : (
        <summary
          aria-label={t("studioKit.accountMenu")}
          title={t("studioKit.accountMenu")}
          className="flex h-[38px] cursor-pointer list-none items-center gap-2 rounded-[10px] ps-1 pe-2 text-sm"
          style={{ color: C.barText }}
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-bold" style={{ background: C.barLine }} aria-hidden="true">
            {(me.name.trim()[0] ?? "?").toUpperCase()}
          </span>
          <span className="max-w-[160px] truncate max-md:sr-only">{me.name}</span>
          <Glyph name="expand_more" size={18} className="max-md:hidden" />
        </summary>
      )}
      <div
        // On phones the bar wraps: the menu spans the screen under its button instead of running off one side.
        className="absolute end-0 top-[calc(100%+6px)] z-30 flex w-[280px] max-w-[calc(100vw-24px)] flex-col gap-0.5 rounded-xl p-1.5 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:mt-1.5 max-sm:w-auto max-sm:max-w-none"
        style={{ border: line, background: C.surface, color: ink }}
      >
        <div className="flex flex-col px-3 pt-2 pb-2.5" style={{ borderBottom: line }}>
          <span className="truncate text-sm font-bold">{me.name}</span>
          <span className="truncate text-xs" style={{ color: C.muted }} dir="ltr" title={me.email}>
            {me.email}
          </span>
        </div>
        <div className="flex items-center gap-2 px-1.5 py-1.5" style={{ borderBottom: line }}>
          <div className="min-w-0 flex-1">
            <DashboardLanguage lang={lang} label={t("nav.languageList")} />
          </div>
          {/* 132.4 132.70 Light or dark, as on the dashboard (its switch, remembered in this browser). */}
          <ThemeSwitch label={t("nav.darkMode")} className="h-9 w-9" />
        </div>
        <Link href="/studio/account" className={item} style={{ color: ink }}>
          <Glyph name="person" size={18} />
          {t("account.nav")}
        </Link>
        {contextCan(context, "team") ? (
          <Link href="/studio/team" className={item} style={{ color: ink }}>
            <Glyph name="group" size={18} />
            {t("team.nav")}
          </Link>
        ) : null}
        {more.map((m) => (
          <Link key={m.href} href={m.href} className={item} style={{ color: ink }}>
            <Glyph name={m.icon} size={18} />
            {m.label}
          </Link>
        ))}
        <form action={openRegularAppsAction}>
          <button type="submit" className={`${item} w-full cursor-pointer border-0 bg-transparent text-start`} style={{ color: ink, fontFamily: "inherit" }}>
            <Glyph name="apps" size={18} />
            {t("studio.regularApps")}
          </button>
        </form>
        <a href={localePath(lang, "/docs/yallapp-studio")} className={item} style={{ color: ink }}>
          <Glyph name="help" size={18} />
          {t("studio.help")}
        </a>
        {/* 203 Yallapp Business on the App Store and Google Play (lib/business-app.ts). */}
        <div className="mt-0.5 flex flex-col gap-1.5 px-3 pt-2 pb-1.5" style={{ borderTop: line }} data-studio-business-app="">
          <span className="text-xs font-bold" style={{ color: C.muted }}>
            {t("owner.getApp")}
          </span>
          <div className="flex gap-1.5">
            {BUSINESS_APP_LINKS.map((link) => (
              <a
                key={link.store}
                href={link.url}
                target="_blank"
                rel="noopener"
                data-business-app={link.store}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold no-underline hover:bg-[var(--sf-soft,#F4EFE6)]"
                style={{ border: line, color: ink }}
              >
                <StoreMark store={link.mark} size={15} />
                <span dir="ltr">{link.store === "appStore" ? t("owner.appStore") : t("owner.googlePlay")}</span>
                <span className="sr-only">{t("owner.newTab")}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="mt-0.5 pt-1.5" style={{ borderTop: line }}>
          <SignOutButton className={`${item} w-full cursor-pointer border-0 bg-transparent text-start font-semibold`}>
            <Glyph name="logout" size={18} />
            {t("nav.signOut")}
          </SignOutButton>
        </div>
      </div>
    </details>
  );
}
