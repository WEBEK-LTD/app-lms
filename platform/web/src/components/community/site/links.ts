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
  privacy: () => cmHref("/privacy"),
  deleteAccount: (done?: boolean) => cmHref(done ? "/delete-account?done=1" : "/delete-account"),
  deleteAccountForm: () => cmHref("/settings/delete-account"),
  saved: () => cmHref("/saved"),
  verify: () => cmHref("/verify"),
  notifications: () => cmHref("/notifications"),
  welcome: () => cmHref("/welcome"),
  signIn: (next?: string) => withQuery(cmHref("/sign-in"), next ? { next } : undefined),
  signUp: (next?: string) => withQuery(cmHref("/sign-up"), next ? { next } : undefined),
  admin: (part = "") => cmHref(`/admin${part ? `/${part}` : ""}`),
  // 232–234
  post: (id: string) => cmHref(`/posts/${encodeURIComponent(id)}`),
  stories: (handle: string) => cmHref(`/stories/${encodeURIComponent(handle)}`),
  showcase: (q?: { type?: string; sort?: string }) => withQuery(cmHref("/showcase"), q),
  showcaseItem: (id: string) => cmHref(`/showcase/${encodeURIComponent(id)}`),
  showcaseNew: () => cmHref("/showcase/new"),
  messages: () => cmHref("/messages"),
  conversation: (id: string) => cmHref(`/messages/${encodeURIComponent(id)}`),
  groups: (q?: { mine?: string }) => withQuery(cmHref("/groups"), q),
  group: (slug: string, part = "") => cmHref(`/groups/${encodeURIComponent(slug)}${part ? `/${part}` : ""}`),
  groupNew: () => cmHref("/groups/new"),
  academy: () => cmHref("/academy"),
  course: (slug: string) => cmHref(`/academy/${encodeURIComponent(slug)}`),
  lesson: (slug: string, lessonId: string) => cmHref(`/academy/${encodeURIComponent(slug)}/${encodeURIComponent(lessonId)}`),
  certificate: (code: string) => cmHref(`/academy/certificates/${encodeURIComponent(code)}`),
  leaderboard: (period?: string) => withQuery(cmHref("/leaderboard"), period ? { period } : undefined),
  challenges: () => cmHref("/challenges"),
  challenge: (id: string) => cmHref(`/challenges/${encodeURIComponent(id)}`),
  writeTutorial: () => cmHref("/tutorials/write"),
  pros: () => cmHref("/pros"),
  pro: (handle: string) => cmHref(`/pros/${encodeURIComponent(handle)}`),
  proEdit: () => cmHref("/settings/pro"),
  hireRequests: (side?: string) => withQuery(cmHref("/pros/requests"), side ? { side } : undefined),
  jobs: (q?: { type?: string; remote?: string; q?: string }) => withQuery(cmHref("/jobs"), q),
  job: (id: string) => cmHref(`/jobs/${encodeURIComponent(id)}`),
  jobNew: () => cmHref("/jobs/new"),
  jobsMine: () => cmHref("/jobs/mine"),
  events: (when?: string) => withQuery(cmHref("/events"), when ? { when } : undefined),
  event: (id: string) => cmHref(`/events/${encodeURIComponent(id)}`),
};

function withQuery(base: string, q?: Record<string, string | undefined>): string {
  if (!q) return base;
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) s.set(k, v);
  const t = s.toString();
  return t ? `${base}?${t}` : base;
}
