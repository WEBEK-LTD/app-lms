import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { safeFetch } from "../../net/safe-fetch";
import * as qa from "../qa/service";
import * as social from "../social/service";
import type { FeedTab, SocialEnv } from "../social/service";
import type { LinkPreview } from "../social/store";
import { isYallappTeam } from "../staff";
import { linkedApps } from "../yallapp";
import { noContent, ok, requireMember, tooMany, type CommunityContext, type CommunityResult, type CommunityRoute } from "./http";
import { qaHooksFor, withQaFor } from "./qa-hooks";
import { run, wire } from "./qa-routes";

/**
 * 232 Area B's phase 2 routes (docs/api/community.yaml: Media, Posts,
 * Stories, Showcase): each call's SocialEnv is its community (the tenant),
 * its store, A's members, blocks and follows, C's moderation and notices,
 * and A's groups. Answers are snake_case, errors the Q&A's.
 */

type Handler = (ctx: CommunityContext) => Promise<CommunityResult>;

/** The community a call is about: area A's tenant key when it sets one, else Yallapp Community. */
export function tenantOf(ctx: CommunityContext): string {
  const t = (ctx as CommunityContext & { tenant?: unknown }).tenant;
  return typeof t === "string" && t ? t : "yallapp";
}

/** A link's preview: the page's Open Graph tags, public addresses only, 3 seconds and 512 KB at most. */
export async function fetchPreview(url: string): Promise<LinkPreview | null> {
  const response = await safeFetch(url, { signal: AbortSignal.timeout(3000), headers: { accept: "text/html", "user-agent": "YallappCommunity/1.0 (+https://community.yallapp.com.tr)" } });
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  let html = "";
  const decoder = new TextDecoder();
  for (let size = 0; size < 512 * 1024; ) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    size += value.length;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  await reader.cancel().catch(() => undefined);
  return social.previewFromHtml(response.url || url, html);
}

/** The social engine for this call. */
export function socialEnvFor(ctx: CommunityContext): SocialEnv {
  const hooks = qaHooksFor(ctx) as SocialEnv["hooks"];
  const platform = ctx.deps.platform;
  return {
    store: ctx.store.qa.social,
    tenant: tenantOf(ctx),
    now: ctx.now,
    hooks: { members: hooks.members, hiddenFor: hooks.hiddenFor, followingIds: hooks.followingIds, moderate: hooks.moderate ?? (async () => "published"), notify: hooks.notify ?? (async () => undefined) },
    isTeam: async (memberId) => {
      const m = memberId === ctx.member?.id ? ctx.member : await ctx.store.base.getMember(memberId);
      return !!m && isYallappTeam(ctx, platform, m);
    },
    upload: ctx.deps.upload,
    preview: fetchPreview,
    ownsYallappApp: async (memberId, appId) => {
      const m = memberId === ctx.member?.id ? ctx.member : await ctx.store.base.getMember(memberId);
      if (!m?.yallappUserId) return false;
      return (await linkedApps(platform, m.yallappUserId, ctx.now)).some((app) => app.appId === appId);
    },
    questions: ({ tab, viewerId, limit }) =>
      withQaFor(ctx, async () => (await qa.listQuestions({ viewerId, lang: ctx.lang, filter: tab === "following" ? "following" : tab === "for_you" ? "for_you" : "all", sort: "newest", limit })).items),
  };
}

// ——— Limits ———

const LIMITS = {
  media: { name: "community-media:member", limit: 60, windowSeconds: 60 * 60 },
  post: { name: "community-post:member", limit: 20, windowSeconds: 60 * 60 },
  comment: { name: "community-post-comment:member", limit: 60, windowSeconds: 60 * 60 },
  like: { name: "community-like:member", limit: 300, windowSeconds: 60 * 60 },
  story: { name: "community-story:member", limit: 20, windowSeconds: 60 * 60 },
  showcase: { name: "community-showcase:member", limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

const limited =
  (rule: keyof typeof LIMITS, handler: Handler): Handler =>
  async (ctx) => {
    const hit = await hitRateLimit(ctx.deps.platform, LIMITS[rule], ctx.member?.id ?? ctx.deps.ip, ctx.now);
    if (!hit.allowed) tooMany(hit.retryAfter);
    return handler(ctx);
  };

// ——— Handlers ———

const viewer = (ctx: CommunityContext) => ctx.member?.id ?? null;
const limitOf = (ctx: CommunityContext) => Number.parseInt(ctx.query.get("limit") ?? "", 10) || undefined;
const pageOut = <T>(p: { items: T[]; nextCursor: string | null }) => ({ items: wire(p.items), next_cursor: p.nextCursor });
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

async function fileOf(ctx: CommunityContext, name: string): Promise<{ bytes: Uint8Array } | null> {
  const f = ctx.req.form?.get(name);
  return f && typeof f !== "string" ? { bytes: new Uint8Array(await f.arrayBuffer()) } : null;
}

const uploadMedia: Handler = async (ctx) => {
  requireMember(ctx);
  // No file is refused by the check of its bytes, as any file that isn't a photo or a video.
  const file = (await fileOf(ctx, "file")) ?? { bytes: new Uint8Array() };
  return ok(wire(await social.uploadMedia(socialEnvFor(ctx), viewer(ctx), file, await fileOf(ctx, "poster"))), 201);
};

const feed: Handler = async (ctx) => {
  const tab = (["for_you", "latest", "following"] as const).find((t) => t === ctx.query.get("tab")) as FeedTab | undefined;
  return ok(pageOut(await social.feed(socialEnvFor(ctx), viewer(ctx), { tab, cursor: ctx.query.get("cursor"), limit: limitOf(ctx) })));
};

const createPost: Handler = async (ctx) => {
  const b = ctx.json();
  return ok(wire(await social.createPost(socialEnvFor(ctx), requireMember(ctx).member.id, { body: b.body, mediaIds: b.media_ids, groupId: str(b.group_id) ?? null })), 201);
};
const getPost: Handler = async (ctx) => ok(wire(await social.getPost(socialEnvFor(ctx), viewer(ctx), ctx.params.post_id!)));
const editPost: Handler = async (ctx) => ok(wire(await social.editPost(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.post_id!, { body: ctx.json().body })));
const deletePost: Handler = async (ctx) => {
  await social.deletePost(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.post_id!);
  return noContent();
};
const memberPosts: Handler = async (ctx) => ok(pageOut(await social.listPosts(socialEnvFor(ctx), viewer(ctx), { authorId: ctx.query.get("author") ?? undefined, cursor: ctx.query.get("cursor"), limit: limitOf(ctx) })));

const likeOn =
  (kind: "post" | "comment" | "showcase", param: string, on: boolean): Handler =>
  async (ctx) => {
    const r = await social.like(socialEnvFor(ctx), requireMember(ctx).member.id, kind, ctx.params[param]!, on);
    return ok({ liked: r.liked, like_count: r.likeCount });
  };
const saveOn =
  (kind: "post" | "showcase", param: string, on: boolean): Handler =>
  async (ctx) => {
    await social.save(socialEnvFor(ctx), requireMember(ctx).member.id, kind, ctx.params[param]!, on);
    return noContent();
  };
const savedList: Handler = async (ctx) => ok(wire(await social.saved(socialEnvFor(ctx), requireMember(ctx).member.id)));

const listComments =
  (target: "post" | "showcase", param: string): Handler =>
  async (ctx) =>
    ok(pageOut(await social.listComments(socialEnvFor(ctx), viewer(ctx), target, ctx.params[param]!, { parentId: ctx.query.get("parent_id"), cursor: ctx.query.get("cursor"), limit: limitOf(ctx) })));
const addComment =
  (target: "post" | "showcase", param: string): Handler =>
  async (ctx) => {
    const b = ctx.json();
    return ok(wire(await social.comment(socialEnvFor(ctx), requireMember(ctx).member.id, target, ctx.params[param]!, { body: b.body, parentId: str(b.parent_id) ?? null })), 201);
  };
const deleteComment: Handler = async (ctx) => {
  await social.deleteComment(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.comment_id!);
  return noContent();
};

const stories: Handler = async (ctx) => ok({ items: wire(await social.storyRings(socialEnvFor(ctx), viewer(ctx))) });
const createStory: Handler = async (ctx) => ok(wire(await social.createStory(socialEnvFor(ctx), requireMember(ctx).member.id, { mediaId: ctx.json().media_id })), 201);
const viewStory: Handler = async (ctx) => {
  await social.viewStory(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!);
  return noContent();
};
const storyViewers: Handler = async (ctx) => ok({ items: wire(await social.storyViewers(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!)) });
const deleteStory: Handler = async (ctx) => {
  await social.deleteStory(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!);
  return noContent();
};

const showcaseList: Handler = async (ctx) =>
  ok(pageOut(await social.listShowcase(socialEnvFor(ctx), viewer(ctx), { appType: ctx.query.get("type") ?? undefined, authorId: ctx.query.get("author") ?? undefined, sort: ctx.query.get("sort") === "liked" ? "liked" : "newest", cursor: ctx.query.get("cursor"), limit: limitOf(ctx) })));
const showcaseFields = (b: Record<string, unknown>) => ({ title: b.title, description: b.description, appType: b.app_type, appStoreUrl: b.app_store_url, playStoreUrl: b.play_store_url, webUrl: b.web_url });
const createShowcase: Handler = async (ctx) => {
  const b = ctx.json();
  return ok(wire(await social.createShowcase(socialEnvFor(ctx), requireMember(ctx).member.id, { ...showcaseFields(b), mediaIds: b.media_ids, yallappAppId: b.yallapp_app_id })), 201);
};
const getShowcase: Handler = async (ctx) => ok(wire(await social.getShowcase(socialEnvFor(ctx), viewer(ctx), ctx.params.showcase_id!)));
const editShowcase: Handler = async (ctx) => ok(wire(await social.editShowcase(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.showcase_id!, showcaseFields(ctx.json()))));
const deleteShowcase: Handler = async (ctx) => {
  await social.deleteShowcase(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.showcase_id!);
  return noContent();
};

const pub = (method: CommunityRoute["method"], path: string, handler: Handler): CommunityRoute => ({ method, path, auth: "public", handler: run(handler) });
const mem = (method: CommunityRoute["method"], path: string, handler: Handler, options?: { refusedStatus?: number }): CommunityRoute => ({ method, path, handler: run(handler, options) });

export const SOCIAL_ROUTES: CommunityRoute[] = [
  mem("POST", "/media", limited("media", uploadMedia)),
  // Posts and the feed
  pub("GET", "/feed", feed),
  pub("GET", "/posts", memberPosts),
  mem("POST", "/posts", limited("post", createPost)),
  pub("GET", "/posts/:post_id", getPost),
  mem("PATCH", "/posts/:post_id", limited("post", editPost)),
  mem("DELETE", "/posts/:post_id", deletePost),
  mem("PUT", "/posts/:post_id/like", limited("like", likeOn("post", "post_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/posts/:post_id/like", limited("like", likeOn("post", "post_id", false)), { refusedStatus: 400 }),
  mem("PUT", "/posts/:post_id/save", saveOn("post", "post_id", true)),
  mem("DELETE", "/posts/:post_id/save", saveOn("post", "post_id", false)),
  pub("GET", "/posts/:post_id/comments", listComments("post", "post_id")),
  mem("POST", "/posts/:post_id/comments", limited("comment", addComment("post", "post_id"))),
  mem("DELETE", "/comments/:comment_id", deleteComment),
  mem("PUT", "/comments/:comment_id/like", limited("like", likeOn("comment", "comment_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/comments/:comment_id/like", limited("like", likeOn("comment", "comment_id", false)), { refusedStatus: 400 }),
  mem("GET", "/saved", savedList),
  // Stories
  pub("GET", "/stories", stories),
  mem("POST", "/stories", limited("story", createStory)),
  mem("PUT", "/stories/:story_id/view", viewStory),
  mem("GET", "/stories/:story_id/viewers", storyViewers),
  mem("DELETE", "/stories/:story_id", deleteStory),
  // Showcase
  pub("GET", "/showcase", showcaseList),
  mem("POST", "/showcase", limited("showcase", createShowcase)),
  pub("GET", "/showcase/:showcase_id", getShowcase),
  mem("PATCH", "/showcase/:showcase_id", limited("showcase", editShowcase)),
  mem("DELETE", "/showcase/:showcase_id", deleteShowcase),
  mem("PUT", "/showcase/:showcase_id/like", limited("like", likeOn("showcase", "showcase_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/showcase/:showcase_id/like", limited("like", likeOn("showcase", "showcase_id", false)), { refusedStatus: 400 }),
  mem("PUT", "/showcase/:showcase_id/save", saveOn("showcase", "showcase_id", true)),
  mem("DELETE", "/showcase/:showcase_id/save", saveOn("showcase", "showcase_id", false)),
  pub("GET", "/showcase/:showcase_id/comments", listComments("showcase", "showcase_id")),
  mem("POST", "/showcase/:showcase_id/comments", limited("comment", addComment("showcase", "showcase_id"))),
];
