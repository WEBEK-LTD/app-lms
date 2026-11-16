import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { stopManagingAction } from "@/app/actions/admin";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { DashboardLanguage } from "@/components/dashboard-language";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { ThemeSwitch } from "@/components/theme-switch";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { kindOf } from "@/lib/app/kinds";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getVisitorContact } from "@/lib/contact";
import { dashboardText } from "@/lib/dashboard-lang";
import { studioJumpTargets, studioProjectNav } from "@/lib/studio/project-nav";
import { isStudioProject } from "@/lib/studio/section";
import { C, Glyph, StudioBar, StudioScreen } from "../chrome";
import { ProjectNav } from "./project-nav";
import { StudioDashboardLinks } from "./dashboard-links";
import { StudioAccountMenu } from "../account-menu";

/**
 * 103R.3 A Studio project's dashboard: the project switcher, its preview and
 * editor on top, its own side menu, and the dashboard's pages for the
 * project in Studio's frame. 132.1 The menu has every page of the
 * dashboard that applies to the project (lib/studio/project-nav.ts), 132.2
 * a quick search, and 132.4 the frame is light or dark like the dashboard.
 */
export default async function StudioProjectLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  const { app, staff, user, member } = context;
  if (!app || !isStudioProject(app)) redirect("/studio");
  const { t, k, lang, dir } = await dashboardText();
  const projects = context.apps.filter(isStudioProject);
  const contact = await getVisitorContact();
  const nav = { app, text: { t, k }, can: (permission: Parameters<typeof contextCan>[1]) => contextCan(context, permission), supportUrl: contact.whatsappUrl };
  const groups = studioProjectNav(nav).map(({ id, label, items }) => ({ id, label, items: items.map(({ href, label, icon, external }) => ({ href, label, icon, external })) }));
  const more = studioJumpTargets(nav).map(({ href, label, icon }) => ({ href, label, icon }));
  // 60 The person signed in: a team member shows as themselves.
  const me = member ?? user;
  const name = app.appName ?? t("studio.untitledProject");
  // 132.4 The language, light or dark, and signing out, as at the dashboard's foot: in the menu's foot and the account's menu.
  const settings = (
    <div className="flex flex-col gap-2.5">
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
  );
  const role = member ? t(`team.roles.${context.access.role}` as DashKey) : null;

  const bold = { b: (chunk: string) => <strong>{chunk}</strong> };
  return (
    <StudioScreen dir={dir} lang={lang} themed>
      <StudioDashboardLinks />
      <StudioBar>
        {/* 132.4 On phones the bar stays one line: the project as its kind's icon (its name is in the switcher), Preview in the menu. */}
        <details className="relative min-w-0">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm max-sm:px-2" style={{ background: C.barSoft }} aria-label={t("studio.switchProject")}>
            <Glyph name={kindOf(app).icon} size={18} />
            <span className="max-sm:sr-only">{name}</span>
            <Glyph name="expand_more" size={18} />
          </summary>
          <div className="absolute start-0 top-[calc(100%+6px)] z-20 flex min-w-[240px] flex-col gap-0.5 rounded-xl p-1.5 shadow-lg" style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)" }}>
            {projects.map((p) => (
              <form key={p.id} action={openStudioProjectAction}>
                <input type="hidden" name="appId" value={p.id} />
                <button
                  type="submit"
                  aria-current={p.id === app.id ? "true" : undefined}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 px-3 py-2 text-start text-sm hover:bg-[var(--sf-soft)]"
                  style={{ background: p.id === app.id ? "var(--sf-soft)" : "transparent", fontWeight: p.id === app.id ? 700 : 400, color: "var(--sf-ink)", fontFamily: "inherit" }}
                >
                  <Glyph name={kindOf(p).icon} size={18} />
                  {p.appName ?? t("studio.untitledProject")}
                </button>
              </form>
            ))}
            <Link href="/studio" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline hover:bg-[var(--sf-soft)]" style={{ color: "var(--sf-ink)" }}>
              <Glyph name="apps" size={18} />
              {t("studio.yourProjects")}
            </Link>
          </div>
        </details>
        <div className="flex-[1_1_20px]" />
        <Link href="/studio/project/preview" className="flex h-[38px] items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold no-underline max-sm:hidden" style={{ border: `1px solid ${C.barLine}`, color: C.ivory }}>
          <Glyph name="play_arrow" size={18} />
          {/* On phones the bar's two links as their icons, so the bar stays one line. */}
          <span className="max-sm:sr-only">{t("studio.previewOnPhone")}</span>
        </Link>
        <Link href="/studio/editor" className="flex h-[38px] items-center gap-1.5 rounded-[10px] px-[18px] text-sm font-extrabold no-underline max-sm:px-2.5" style={{ background: C.accent, color: C.ink }}>
          <Glyph name="draw" size={18} />
          <span className="max-sm:sr-only">{t("studio.openEditor")}</span>
        </Link>
        {/* 132.51 The language, the account, the team and signing out; 132.3 the account's other pages and dark mode. */}
        <StudioAccountMenu />
      </StudioBar>

      {/* Below lg the menu is a bar above the page: its line keeps its own height. */}
      <div className="flex flex-1 flex-wrap items-stretch max-lg:content-start">
        <Suspense>
          <ProjectNav
            label={t("studio.projectDashboard")}
            menuLabel={t("studio.projectMenu")}
            closeLabel={t("studio.closeProjectMenu")}
            groups={groups}
            more={more}
            appName={name}
            footer={
              // 132.4 As at the dashboard's foot: who is signed in (their account's page), the language, light or dark, and signing out.
              <div className="flex flex-col gap-2.5">
                <Link href="/studio/account" className="flex items-center gap-3 rounded-[10px] no-underline" style={{ color: "var(--sf-ink)" }}>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--sf-soft)", color: "var(--sf-ink)" }} aria-hidden="true">
                    {(me.name.trim()[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{me.name}</span>
                    <span className="truncate text-xs" style={{ color: "var(--sf-muted)" }} title={me.email} dir="ltr">
                      {me.email}
                    </span>
                    {role ? (
                      <span className="truncate text-xs" style={{ color: "var(--sf-muted)" }}>
                        {role}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {settings}
              </div>
            }
          />
        </Suspense>
        <main id="main" tabIndex={-1} className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-5 p-4 outline-none sm:p-6">
          {staff ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-white" style={{ background: C.ink }}>
              <span className="flex items-center gap-2">
                <Glyph name="key" />
                <span>{richText(t("nav.staffApp", { name: user.name, app: name }), bold)}</span>
              </span>
              <form action={stopManagingAction}>
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  {t("nav.backToAdmin")}
                </SubmitButton>
              </form>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </StudioScreen>
  );
}
