import Link from "next/link";
import { openRegularAppsAction } from "@/app/actions/studio-projects";
import { DashboardLanguage } from "@/components/dashboard-language";
import { SignOutButton } from "@/components/sign-out";
import { localePath } from "@/i18n/paths";
import { contextCan, getClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { Glyph, STUDIO_COLORS as C } from "./editor/shared";

/**
 * 132.51 The signed-in person's menu on Studio's dark bar, as the regular
 * dashboard has it in its side menu: who is signed in, the dashboard's
 * language, Your account and Team (in Studio's own frame), the regular apps,
 * help, and signing out. A `<details>`, so it opens before the page's
 * scripts load; the language and signing out are forms.
 */
export async function StudioAccountMenu() {
  const context = await getClientContext();
  if (!context) return null;
  const { t, lang } = await dashboardText();
  const me = context.member ?? context.user;
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm no-underline hover:bg-[#F4EFE6]";
  return (
    <details className="relative" data-studio-account="">
      <summary
        aria-label={t("studioKit.accountMenu")}
        title={t("studioKit.accountMenu")}
        className="flex h-[38px] cursor-pointer list-none items-center gap-2 rounded-[10px] ps-1 pe-2 text-sm"
        style={{ color: C.ivory }}
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-bold" style={{ background: C.barLine }} aria-hidden="true">
          {(me.name.trim()[0] ?? "?").toUpperCase()}
        </span>
        <span className="max-w-[160px] truncate max-md:sr-only">{me.name}</span>
        <Glyph name="expand_more" size={18} className="max-md:hidden" />
      </summary>
      <div
        // On phones the bar wraps: the menu spans the screen under its button instead of running off one side.
        className="absolute end-0 top-[calc(100%+6px)] z-30 flex w-[280px] max-w-[calc(100vw-24px)] flex-col gap-0.5 rounded-xl bg-white p-1.5 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:mt-1.5 max-sm:w-auto max-sm:max-w-none"
        style={{ border: `1px solid ${C.line}`, color: C.ink }}
      >
        <div className="flex flex-col px-3 pt-2 pb-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span className="truncate text-sm font-bold">{me.name}</span>
          <span className="truncate text-xs" style={{ color: C.muted }} dir="ltr" title={me.email}>
            {me.email}
          </span>
        </div>
        <div className="px-1.5 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
          <DashboardLanguage lang={lang} label={t("nav.languageList")} />
        </div>
        <Link href="/studio/account" className={item} style={{ color: C.ink }}>
          <Glyph name="person" size={18} />
          {t("account.nav")}
        </Link>
        {contextCan(context, "team") ? (
          <Link href="/studio/team" className={item} style={{ color: C.ink }}>
            <Glyph name="group" size={18} />
            {t("team.nav")}
          </Link>
        ) : null}
        <form action={openRegularAppsAction}>
          <button type="submit" className={`${item} w-full cursor-pointer border-0 bg-transparent text-start`} style={{ color: C.ink, fontFamily: "inherit" }}>
            <Glyph name="apps" size={18} />
            {t("studio.regularApps")}
          </button>
        </form>
        <a href={localePath(lang, "/docs/yallapp-studio")} className={item} style={{ color: C.ink }}>
          <Glyph name="help" size={18} />
          {t("studio.help")}
        </a>
        <div className="mt-0.5 pt-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
          <SignOutButton className={`${item} w-full cursor-pointer border-0 bg-transparent text-start font-semibold`}>
            <Glyph name="logout" size={18} />
            {t("nav.signOut")}
          </SignOutButton>
        </div>
      </div>
    </details>
  );
}
