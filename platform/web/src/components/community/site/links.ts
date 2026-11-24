/**
 * 231 Where the Community's pages are. The site is served on its own host
 * (community.yallapp.com.tr, src/proxy.ts), whose paths map to /community/…
 * in this app; links are written with this helper so the prefix lives in
 * one place.
 */
export const CM_BASE = "/community";

export function cmHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? CM_BASE : `${CM_BASE}${p}`;
}

export const cmLinks = {
  home: () => cmHref("/"),
  questions: (q?: { tab?: string; section?: string; tag?: string }) => withQuery(cmHref("/questions"), q),
  question: (slug: string) => cmHref(`/questions/${encodeURIComponent(slug)}`),
  ask: () => cmHref("/ask"),
  tutorials: (q?: { section?: string; level?: string; language?: string; kind?: string }) => withQuery(cmHref("/tutorials"), q),
  tutorial: (slug: string) => cmHref(`/tutorials/${encodeURIComponent(slug)}`),
  search: (q?: string) => withQuery(cmHref("/search"), q ? { q } : undefined),
  member: (handle: string) => cmHref(`/u/${encodeURIComponent(handle)}`),
  memberList: (handle: string, list: "followers" | "following" | "friends") => cmHref(`/u/${encodeURIComponent(handle)}/${list}`),
  editProfile: () => cmHref("/settings/profile"),
  settings: () => cmHref("/settings"),
  saved: () => cmHref("/saved"),
  verify: () => cmHref("/verify"),
  notifications: () => cmHref("/notifications"),
  welcome: () => cmHref("/welcome"),
  signIn: (next?: string) => withQuery(cmHref("/sign-in"), next ? { next } : undefined),
  signUp: (next?: string) => withQuery(cmHref("/sign-up"), next ? { next } : undefined),
  signOut: () => "/api/community/v1/auth/sign-out",
  admin: (part = "") => cmHref(`/admin${part ? `/${part}` : ""}`),
};

function withQuery(base: string, q?: Record<string, string | undefined>): string {
  if (!q) return base;
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) s.set(k, v);
  const t = s.toString();
  return t ? `${base}?${t}` : base;
}
