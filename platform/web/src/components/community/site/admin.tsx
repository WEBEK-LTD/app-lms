import "server-only";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { siteContext } from "./context";
import type { AdminMember } from "./data";
import { cmLinks } from "./links";
import { SitePage } from "./page";
import type { CmWords } from "./words";

export const ADMIN_TABS = ["verifications", "badges", "moderation", "reports", "audit", "settings"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

/** The admin's pages: only for the community's admins (the trust module checks every call again). */
export async function adminContext() {
  const ctx = await siteContext();
  if (!ctx.viewer) redirect(cmLinks.signIn(cmLinks.admin()));
  if (!ctx.viewer.admin) notFound();
  return { ...ctx, viewer: ctx.viewer };
}

function tabName(w: CmWords, t: AdminTab): string {
  return { verifications: w.adminVerifications, badges: w.badges, moderation: w.adminModeration, reports: w.adminReports, audit: w.adminAudit, settings: w.settings }[t];
}

export function AdminPage({ w, tab, children }: { w: CmWords; tab: AdminTab; children: ReactNode }) {
  return (
    <SitePage active="none">
      <div className="cm-card">
        <h1><span className="ms f" style={{ fontSize: 26, color: "var(--cm-orange)", verticalAlign: "-4px" }}>admin_panel_settings</span> {w.admin}</h1>
        <nav className="cm-tabs" style={{ marginBottom: 0 }} aria-label={w.admin}>
          {ADMIN_TABS.map((t) => (
            <Link key={t} href={cmLinks.admin(t)} className={t === tab ? "on" : ""} aria-current={t === tab ? "page" : undefined}>{tabName(w, t)}</Link>
          ))}
        </nav>
      </div>
      {children}
    </SitePage>
  );
}

export function Who({ m }: { m: AdminMember | null }) {
  if (!m) return <span className="cm-muted">—</span>;
  return m.handle ? <Link href={cmLinks.member(m.handle)} className="cm-strong">{m.name}</Link> : <span className="cm-strong">{m.name}</span>;
}

export function When({ at, lang }: { at: string; lang: string }) {
  return <time dateTime={at}>{new Date(at).toLocaleString(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { dateStyle: "medium", timeStyle: "short" })}</time>;
}

/** The next page of a list (the API's cursor), and back to its start. */
export function Pager({ w, base, cursor, next }: { w: CmWords; base: string; cursor?: string; next: string | null }) {
  if (!cursor && !next) return null;
  const at = (c: string) => `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(c)}`;
  return (
    <div className="cm-row" style={{ justifyContent: "center" }}>
      {cursor ? <Link href={base} className="cm-btn g">{w.firstPage}</Link> : null}
      {next ? <Link href={at(next)} className="cm-btn g">{w.next}</Link> : null}
    </div>
  );
}

export function StatusTabs<T extends string>({ base, value, options }: { base: string; value: T; options: { value: T; label: string }[] }) {
  return (
    <div className="cm-tabs">
      {options.map((o) => (
        <Link key={o.value} href={`${base}?status=${o.value}`} className={o.value === value ? "on" : ""}>{o.label}</Link>
      ))}
    </div>
  );
}
