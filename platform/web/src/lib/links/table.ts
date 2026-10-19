import type { AppType } from "../data/types";

/**
 * 46 Links that open the app (docs/api/openapi.yaml, tag Links): the one
 * table of docs/api/app-links.json, which the app and the plugin follow too
 * (a unit test keeps this copy identical). A link is `<base>/<kind>/<id>`:
 * `https://yallapp.com.tr/a/<app_id>` on Yallapp's link domain, `<site>/a`
 * on a WordPress site.
 */

export type LinkKind = "course" | "product" | "service" | "listing" | "article" | "event" | "campaign" | "page";
type IdShape = "number" | "text" | "slug";

const ALL_TYPES: AppType[] = ["lms", "store", "booking", "real_estate", "news", "events", "donations"];

export const LINK_KINDS: readonly { kind: LinkKind; route: string; id: IdShape; appTypes: AppType[] }[] = [
  { kind: "course", route: "/course/{id}", id: "number", appTypes: ["lms"] },
  { kind: "product", route: "/product/{id}", id: "number", appTypes: ["store"] },
  { kind: "service", route: "/service/{id}", id: "number", appTypes: ["booking"] },
  { kind: "listing", route: "/listing/{id}", id: "number", appTypes: ["real_estate"] },
  { kind: "article", route: "/article/{id}", id: "text", appTypes: ["news"] },
  { kind: "event", route: "/event/{id}", id: "number", appTypes: ["events"] },
  { kind: "campaign", route: "/campaign/{id}", id: "number", appTypes: ["donations"] },
  { kind: "page", route: "/page/{id}", id: "slug", appTypes: ALL_TYPES },
];

export const LINK_ID_PATTERNS: Record<IdShape, RegExp> = {
  number: /^[1-9][0-9]{0,17}$/,
  text: /^[A-Za-z0-9_-]{1,64}$/,
  slug: /^[a-z0-9-]{1,64}$/,
};

/** The path of every app's links on Yallapp's domain: `/a/<app_id>/`. */
export const YALLAPP_LINK_PREFIX = "/a/";
/** The path of a WordPress site's links, after the site's own path: `/a/`. */
export const SITE_LINK_PATH = "/a";

const APP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ParsedLink {
  /** Set on Yallapp's link domain. */
  appId: string | null;
  kind: LinkKind;
  id: string;
}

/** A kind and id that match the table, or null. */
export function linkTarget(kind: string, id: string): { kind: LinkKind; id: string } | null {
  const row = LINK_KINDS.find((k) => k.kind === kind);
  if (!row || !LINK_ID_PATTERNS[row.id].test(id)) return null;
  return { kind: row.kind, id };
}

/**
 * Reads a link's path: `/a/<app_id>/<kind>/<id>` (Yallapp) or, after a
 * site's own path, `/a/<kind>/<id>`. Anything else is null.
 */
export function parseLinkPath(path: string, sitePath = ""): ParsedLink | null {
  const clean = path.replace(/\/+$/, "");
  const base = sitePath.replace(/\/+$/, "");
  if (base && !clean.startsWith(`${base}/`)) return null;
  const parts = clean.slice(base.length).split("/").slice(1);
  if (parts[0] !== "a") return null;
  if (parts.length === 4 && APP_ID.test(parts[1] ?? "")) {
    const target = linkTarget(parts[2] ?? "", parts[3] ?? "");
    return target ? { appId: parts[1]!, ...target } : null;
  }
  if (parts.length === 3) {
    const target = linkTarget(parts[1] ?? "", parts[2] ?? "");
    return target ? { appId: null, ...target } : null;
  }
  return null;
}

/** Where a link opens in the app (`/course/12`), or null when this app type has no such screen. */
export function appRouteFor(kind: LinkKind, id: string, appType: AppType): string | null {
  const row = LINK_KINDS.find((k) => k.kind === kind);
  if (!row || !row.appTypes.includes(appType) || !LINK_ID_PATTERNS[row.id].test(id)) return null;
  return row.route.replace("{id}", id);
}

/** A shared link: `<base>/<kind>/<id>`. */
export function linkFor(base: string, kind: LinkKind, id: string | number): string {
  return `${base.replace(/\/+$/, "")}/${kind}/${encodeURIComponent(String(id))}`;
}

/** The app's links on Yallapp's link domain: `https://yallapp.com.tr/a/<app_id>`. */
export function yallappLinkBase(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}${YALLAPP_LINK_PREFIX}${appId}`;
}

/** A WordPress site's links: `<site>/a` (the site's own path kept). Null for an address that isn't https. */
export function siteLinkBase(siteUrl: string | null | undefined): string | null {
  if (!siteUrl) return null;
  let url: URL;
  try {
    url = new URL(siteUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return `https://${url.host}${url.pathname.replace(/\/+$/, "")}${SITE_LINK_PATH}`;
}

/** The app's crash reports endpoint at Yallapp: `<hosted API>/crashes`. */
export function crashReportUrl(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/api/app/${appId}/crashes`;
}
