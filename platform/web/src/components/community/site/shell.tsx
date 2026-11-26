/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons, small files the site and the platform serve already sized. */
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Drawer, LangSelect, SearchKey, ThemeButtons } from "./client";
import type { Section, Viewer } from "./data";
import { cmLinks } from "./links";
import { sectionColor } from "./source";
import { signOutAction } from "@/app/community/(site)/auth-actions";
import { fill, type CmLang, type CmWords } from "./words";

export type NavKey = "home" | "questions" | "tutorials" | "admin" | "none";

type Item = { key: NavKey | "soon"; icon: string; label: string; href?: string; count?: string };

/** The sections, in the design's order; the later phases' show as "Soon" and lead nowhere. */
function items(w: CmWords, newCount: number, withSocial: boolean): Item[] {
  const list: Item[] = [
    { key: "home", icon: "home", label: w.navHome, href: cmLinks.home() },
    { key: "questions", icon: "forum", label: w.navQuestions, href: cmLinks.questions(), count: newCount > 0 ? fill(w.newCount, { n: newCount }) : undefined },
    { key: "tutorials", icon: "menu_book", label: w.navTutorials, href: cmLinks.tutorials() },
    { key: "soon", icon: "school", label: w.navAcademy },
    { key: "soon", icon: "apps", label: w.navShowcase },
    { key: "soon", icon: "emoji_events", label: w.navChallenges },
  ];
  if (withSocial) list.push({ key: "soon", icon: "groups", label: w.navGroups });
  list.push({ key: "soon", icon: "work", label: w.navPros }, { key: "soon", icon: "event", label: w.navEvents });
  return list;
}

function NavItems({ w, active, newCount, withSocial, viewer }: { w: CmWords; active: NavKey; newCount: number; withSocial: boolean; viewer: Viewer | null }) {
  const list = items(w, newCount, withSocial);
  if (viewer?.role) list.push({ key: "admin", icon: "admin_panel_settings", label: w.admin, href: cmLinks.admin() });
  if (withSocial && viewer) list.splice(7, 0, { key: "none", icon: "diversity_3", label: w.navFriends, href: cmLinks.memberList(viewer.handle, "friends") });
  return (
    <>
      {list.map((it) =>
        it.href ? (
          <Link key={it.label} href={it.href} className={it.key === active ? "on" : ""} aria-current={it.key === active ? "page" : undefined}>
            <span className={`ms${it.key === active ? " f" : ""}`} aria-hidden="true">{it.icon}</span>
            {it.label}
            {it.count ? <span className="cnt">{it.count}</span> : null}
          </Link>
        ) : (
          <span key={it.label} className="soon" aria-disabled="true" title={w.comingSoon}>
            <span className="ms" aria-hidden="true">{it.icon}</span>
            {it.label}
            <em>{w.soon}</em>
          </span>
        ),
      )}
    </>
  );
}

function MeCard({ viewer, w }: { viewer: Viewer; w: CmWords }) {
  // The bar fills toward the next thousand points.
  const pct = Math.max(4, Math.round(((viewer.points % 1000) / 1000) * 100));
  return (
    <Link href={cmLinks.member(viewer.handle)} className="cm-mecard">
      <Avatar member={viewer} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{viewer.name}</b>
        <div className="m num">{fill(w.points, { n: viewer.points.toLocaleString("en-US") })}</div>
        <div className="cm-pts"><i style={{ width: `${pct}%` }} /></div>
      </div>
    </Link>
  );
}

/** The start-side nav of the desktop design. */
export function SideNav({ w, active, viewer, mySections, newCount }: { w: CmWords; active: NavKey; viewer: Viewer | null; mySections: Section[]; newCount: number }) {
  return (
    <nav className="cm-nav" aria-label={w.navHome}>
      <NavItems w={w} active={active} newCount={newCount} withSocial={false} viewer={viewer} />
      {mySections.length ? (
        <>
          <h6>{w.mySections}</h6>
          {mySections.slice(0, 6).map((s) => (
            <Link key={s.slug} href={cmLinks.questions({ section: s.slug })} className="cm-chip">
              <i style={{ background: sectionColor(s) }} />
              {s.name}
            </Link>
          ))}
        </>
      ) : null}
      {viewer ? <MeCard viewer={viewer} w={w} /> : null}
      {viewer ? (
        <form action={signOutAction}>
          <button type="submit" className="cm-btn g" data-testid="cm-nav-logout"><span className="ms" aria-hidden="true">logout</span>{w.logOut}</button>
        </form>
      ) : null}
      <Link href={cmLinks.privacy()} className="cm-muted cm-fine" data-testid="cm-footer-privacy">{w.privacyPolicy}</Link>
    </nav>
  );
}

/** The header: brand, search, language, messages, notifications, Ask and the member (the phone's: menu, logo, search, messages, notifications, avatar). */
export function Header({ w, lang, viewer, unread, active, mySections, newCount, q = "" }: { w: CmWords; lang: CmLang; viewer: Viewer | null; unread: number; active: NavKey; mySections: Section[]; newCount: number; q?: string }) {
  return (
    <header className="cm-hdr">
      <Drawer label={w.menu} closeLabel={w.close}>
        <div className="dr-top">
          <Link href={cmLinks.home()} className="l"><img src="/community/logo.svg" alt="" />{w.community}</Link>
        </div>
        {viewer ? (
          <Link href={cmLinks.member(viewer.handle)} className="prof">
            <Avatar member={viewer} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{viewer.name}</b>
              <div className="m num">{fill(w.points, { n: viewer.points.toLocaleString("en-US") })}</div>
            </div>
            <span className="ms go" aria-hidden="true">chevron_right</span>
          </Link>
        ) : (
          <div className="prof guest">
            <Link href={cmLinks.signUp()} className="cm-btn o">{w.signUp}</Link>
            <Link href={cmLinks.signIn()} className="cm-btn g">{w.logIn}</Link>
          </div>
        )}
        <div className="dnav">
          <NavItems w={w} active={active} newCount={newCount} withSocial viewer={viewer} />
        </div>
        <div className="dh">{w.yourGroups}</div>
        <div className="dsoon">{w.groupsSoon}</div>
        {mySections.length ? (
          <>
            <div className="dh">{w.mySections}</div>
            {mySections.slice(0, 6).map((s) => (
              <Link key={s.slug} href={cmLinks.questions({ section: s.slug })} className="cm-chip">
                <i style={{ background: sectionColor(s) }} />
                {s.name}
              </Link>
            ))}
          </>
        ) : null}
        <div className="dl"><LangSelect lang={lang} label={w.language} /></div>
        <div className="foot">
          <ThemeButtons light={w.themeLight} dark={w.themeDark} />
          <Link href={cmLinks.privacy()} className="cm-muted" data-testid="cm-footer-privacy">{w.privacyPolicy}</Link>
          {viewer ? (
            <div className="fi">
              <Link href={cmLinks.saved()} aria-label={w.saved}><span className="ms" aria-hidden="true">bookmark</span></Link>
              <Link href={cmLinks.settings()} aria-label={w.settings}><span className="ms" aria-hidden="true">settings</span></Link>
              <form action={signOutAction}>
                <button type="submit" aria-label={w.logOut}><span className="ms" aria-hidden="true">logout</span></button>
              </form>
            </div>
          ) : null}
        </div>
      </Drawer>
      <Link href={cmLinks.home()} className="cm-brand">
        <img src="/community/logo.svg" alt="" />
        <div>
          <b className="brandword">Yallapp Community</b>
          <small>{w.tagline}</small>
        </div>
      </Link>
      <form className="cm-search" action={cmLinks.search()} role="search">
        <span className="ms" aria-hidden="true">search</span>
        <input type="search" name="q" defaultValue={q} placeholder={w.searchPlaceholder} aria-label={w.search} aria-keyshortcuts="Control+K Meta+K" />
        <SearchKey />
      </form>
      <div className="sp" />
      <LangSelect lang={lang} label={w.language} />
      <Link href={cmLinks.search()} className="cm-icb cm-only-phone" aria-label={w.search}><span className="ms" aria-hidden="true">search</span></Link>
      <span className="cm-icb soon" aria-disabled="true" title={w.messagesSoon} aria-label={w.messagesSoon}><span className="ms" aria-hidden="true">chat_bubble</span></span>
      {viewer ? (
        <Link href={cmLinks.notifications()} className="cm-icb" aria-label={unread ? `${w.notifications} (${unread})` : w.notifications}>
          <span className="ms" aria-hidden="true">notifications</span>
          {unread ? <i /> : null}
        </Link>
      ) : null}
      <Link href={viewer ? cmLinks.ask() : cmLinks.signIn(cmLinks.ask())} className="cm-ask">
        <span className="ms" aria-hidden="true">add</span>
        <span className="label">{w.ask}</span>
      </Link>
      {viewer ? (
        <Link href={cmLinks.member(viewer.handle)} aria-label={w.profile}>
          <Avatar member={viewer} size={46} className="cm-me-btn" />
        </Link>
      ) : (
        <Link href={cmLinks.signIn()} className="cm-login">{w.logIn}</Link>
      )}
    </header>
  );
}

/** The phone's tab bar: Home, Q&A, +, Learn, Groups (soon). */
export function TabBar({ w, active, viewer }: { w: CmWords; active: NavKey; viewer: Viewer | null }) {
  const tab = (key: NavKey, icon: string, label: string, href: string) => (
    <Link href={href} className={`t${active === key ? " on" : ""}`} aria-current={active === key ? "page" : undefined}>
      <span className={`ms${active === key ? " f" : ""}`} aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
  return (
    <nav className="cm-tb" aria-label={w.tabs}>
      {tab("home", "home", w.navHome, cmLinks.home())}
      {tab("questions", "forum", w.navQuestions, cmLinks.questions())}
      <Link href={viewer ? cmLinks.ask() : cmLinks.signIn(cmLinks.ask())} className="cr" aria-label={w.ask}>
        <span className="ms" aria-hidden="true">add</span>
      </Link>
      {tab("tutorials", "school", w.learn, cmLinks.tutorials())}
      <span className="t soon" aria-disabled="true" title={w.comingSoon}>
        <span className="ms" aria-hidden="true">groups</span>
        <span>{w.navGroups}</span>
      </span>
    </nav>
  );
}

/** The page under the header: nav, centre and (on the home and lists) the rail. */
export function Frame({ nav, rail, children }: { nav: ReactNode; rail?: ReactNode; children: ReactNode }) {
  return (
    <div className={`cm-main${rail ? "" : " wide"}`}>
      {nav}
      <main id="cm-content" style={{ minWidth: 0 }}>{children}</main>
      {rail ? <aside className="cm-rail">{rail}</aside> : null}
    </div>
  );
}
