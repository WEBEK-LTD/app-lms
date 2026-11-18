import type { ReactNode } from "react";
import Link from "next/link";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { DashboardLanguage } from "@/components/dashboard-language";
import { ThemeSwitch } from "@/components/theme-switch";
import type { DashKey } from "@/i18n/dashboard";
import { localePath } from "@/i18n/paths";
import { kindOf } from "@/lib/app/kinds";
import type { App } from "@/lib/data/types";
import { contextCan, type ClientContext } from "@/lib/auth/session";
import { getVisitorContact } from "@/lib/contact";
import type { DashboardText } from "@/lib/dashboard-words";
import { studioJumpTargets, studioProjectNav } from "@/lib/studio/project-nav";
import { isStudioProject } from "@/lib/studio/section";
import { StudioAccountMenu } from "./account-menu";
import { Glyph } from "./chrome";
import { StudioDashboardLinks } from "./project/dashboard-links";
import { ConsoleCrumbs, ProjectNav, type ProjectNavGroup } from "./project/project-nav";

/** The project's name and its switcher: its kind's icon on an Ember tile, the name, and the other projects to open. */
function ProjectSwitcher({ app, projects, text }: { app: App; projects: App[]; text: DashboardText }) {
  const { t } = text;
  const name = app.appName ?? t("studio.untitledProject");
  return (
    <details className="relative" data-studio-switcher="">
      <summary className="sc-app" aria-label={t("studio.switchProject")}>
        <span className="sc-atile">
          <Glyph name={kindOf(app).icon} size={18} className="filled" />
        </span>
        <span className="sc-app-name" dir="auto">
          {name}
        </span>
        <Glyph name="unfold_more" size={18} className="opacity-70" />
      </summary>
      <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 flex min-w-[240px] flex-col gap-0.5 rounded-xl p-1.5 shadow-lg" style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)" }}>
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
  );
}

/**
 * 132.150 Yallapp Studio's console, the frame of a project's pages and of
 * the account's own (Your account, Team): a midnight frame in both themes
 * with the rail of the menu's groups and the panel of the group open (the
 * project and its switcher, the quick search, the group's pages, the
 * person, the language and dark mode), and the page on a rounded canvas
 * inset in it, under a bar with where it is (the project, the group, the
 * page), Preview, Open the editor and the account's menu. Without a
 * project (the account's pages only), the rail has Studio's projects and
 * the account's group. The document scrolls; the frame stays.
 */
export async function StudioConsole({ context, text, children, notice }: { context: ClientContext; text: DashboardText; children: ReactNode; notice?: ReactNode }) {
  const { t, k, lang, dir } = text;
  const project = context.app && isStudioProject(context.app) ? context.app : null;
  const projects = context.apps.filter(isStudioProject);
  const contact = await getVisitorContact();
  const can = (permission: Parameters<typeof contextCan>[1]) => contextCan(context, permission);
  const nav = project ? { app: project, text: { t, k }, can, supportUrl: contact.whatsappUrl } : null;
  const groups: ProjectNavGroup[] = nav
    ? studioProjectNav(nav).map(({ id, label, icon, items }) => ({ id, label, icon, items: items.map(({ href, label, icon, external }) => ({ href, label, icon, external })) }))
    : [
        // The account's pages before a project: Studio's projects, then the account and the team.
        { id: "start", icon: "apps", items: [{ href: "/studio", label: t("studio.yourProjects"), icon: "apps" }] },
        {
          id: "account",
          label: t("nav.account"),
          icon: "account_circle",
          items: [{ href: "/studio/account", label: t("account.nav"), icon: "account_circle" }, ...(can("team") ? [{ href: "/studio/team", label: t("team.nav"), icon: "groups" }] : [])],
        },
      ];
  const more = nav ? studioJumpTargets(nav).map(({ href, label, icon }) => ({ href, label, icon })) : [];
  // 60 The person signed in: a team member shows as themselves.
  const me = context.member ?? context.user;
  const role = context.member ? t(`team.roles.${context.access.role}` as DashKey) : null;
  const initial = (me.name.trim()[0] ?? "?").toUpperCase();
  const name = project ? (project.appName ?? t("studio.untitledProject")) : t("studio.yourProjects");
  const switcher = project ? <ProjectSwitcher app={project} projects={projects} text={text} /> : null;
  const label = project ? t("studio.projectDashboard") : t("studioKit.accountPages");
  // 132.4 As at the dashboard's foot: who is signed in (their account's page), the language and dark mode.
  const footer = (
    <>
      <Link href="/studio/account" className="sc-me">
        <span className="sc-av" aria-hidden="true">
          {initial}
        </span>
        <span className="sc-me-who">
          <span className="sc-me-name" dir="auto">
            {me.name}
          </span>
          <span className="sc-me-mail" dir="ltr" title={me.email}>
            {me.email}
          </span>
          {role ? <span className="sc-me-mail">{role}</span> : null}
        </span>
      </Link>
      <div className="sc-prefs">
        <DashboardLanguage lang={lang} label={t("nav.languageList")} look="console" />
        <ThemeSwitch label={t("nav.darkMode")} look="bare" className="sc-theme" />
      </div>
    </>
  );
  const help = (
    <>
      <a href={localePath(lang, "/docs/yallapp-studio")} className="sc-pi">
        <Glyph name="help" size={19} />
        <span className="sc-pi-label">{t("studio.help")}</span>
      </a>
      {contact.whatsappUrl ? (
        <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="sc-pi">
          <Glyph name="support_agent" size={19} />
          <span className="sc-pi-label">{t("nav.support")}</span>
          <span className="sr-only">{t("common.opensInNewTab")}</span>
        </a>
      ) : null}
    </>
  );
  return (
    <div lang={lang} dir={dir} className="sc" data-site-theme="" data-studio-frame="" data-studio-console="">
      {/* The pages' links to the dashboard open the same page in Studio's frame. */}
      {project ? <StudioDashboardLinks /> : null}
      {/*
        132.188 The menu and the crumbs draw the page open (its group on the phone's tab bar, where
        it is on the bar), so they come to life with the frame, not in a Suspense boundary of their
        own: one that comes to life after a link of the bar opened another page draws that page
        over the server's HTML of this one (React's hydration error #418). The frame's pages are
        rendered on request, so useSearchParams needs no boundary.
      */}
      <ProjectNav
        label={label}
        menuLabel={t("studio.projectMenu")}
        closeLabel={t("studio.closeProjectMenu")}
        groups={groups}
        more={more}
        appName={name}
        home={{ href: "/studio", label: t("studio.yourProjects") }}
        switcher={switcher}
        footer={footer}
        help={help}
      />
      <div className="sc-canvas">
        <div className="sc-top">
          <header className="sc-bar">
            {/* Phones: the project on the frame, above the canvas. */}
            {switcher ? <div className="sc-mswitch">{switcher}</div> : null}
            <ConsoleCrumbs
              label={t("studioPage.breadcrumb")}
              groups={groups}
              more={more}
              root={{ href: project ? "/studio/project" : "/studio", label: name }}
              // 175 Products' own pages under it (Products › Settings, not Products alone).
              subpages={[
                { href: "/studio/project/catalog/categories", label: t("shop.categories") },
                { href: "/studio/project/catalog/coupons", label: t("shop.coupons") },
                { href: "/studio/project/catalog/delivery", label: t("shop.pickupDelivery") },
                { href: "/studio/project/catalog/settings", label: t("manage.settings") },
                { href: "/studio/project/catalog/import", label: t("imports.title") },
              ]}
            />
            {project ? (
              <>
                <Link href="/studio/project/preview" className="sc-gb" title={t("studio.previewOnPhone")}>
                  <Glyph name="play_arrow" />
                  <span className="sc-gb-label">{t("studio.previewOnPhone")}</span>
                </Link>
                <Link href="/studio/editor" className="sc-gb" data-edit="" title={t("studio.openEditor")}>
                  <Glyph name="draw" />
                  <span className="sc-gb-label">{t("studio.openEditor")}</span>
                </Link>
              </>
            ) : null}
            {/* 132.51 The language, the account, the team and signing out; 132.3 the account's other pages and dark mode. */}
            <StudioAccountMenu look="avatar" />
          </header>
        </div>
        <main id="main" tabIndex={-1} className="sc-body">
          {notice}
          {children}
        </main>
      </div>
    </div>
  );
}
