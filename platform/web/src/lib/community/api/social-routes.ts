import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { safeFetch } from "../../net/safe-fetch";
import * as qa from "../qa/service";
import * as social from "../social/service";
import type { FeedTab, SocialEnv } from "../social/service";
import type { LinkPreview } from "../social/store";
import { isYallappTeam } from "../staff";
import { linkedApps } from "../yallapp";
import { fail, noContent, ok, requireMember, tooMany, type CommunityContext, type CommunityResult, type CommunityRoute } from "./http";
import { findMember } from "../base/profile";
import { groupPosted, readableGroup } from "../connect/groups";
import { setPortfolioLookup } from "../connect/pros";
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
  return ctx.tenant || ctx.deps.tenant || "yallapp";
}

/** Area A's group rights; no such group reads as none. */
async function groupRights(ctx: CommunityContext, groupId: string) {
  try {
    return await readableGroup(ctx, groupId);
  } catch {
    return null;
  }
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
    groups: {
      canRead: async (_viewer, groupId) => (await groupRights(ctx, groupId))?.canRead ?? false,
      canPost: async (_member, groupId) => (await groupRights(ctx, groupId))?.canPost ?? false,
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

// ——— The contract's shapes (docs/api/community.yaml: Post, Comment, Story, StoryRing, ShowcaseItem…) ———

type Json = Record<string, unknown>;
const viewer = (ctx: CommunityContext) => ctx.member?.id ?? null;
const limitOf = (ctx: CommunityContext) => Number.parseInt(ctx.query.get("limit") ?? "", 10) || undefined;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

const mediaOut = (m: social.MediaView) => ({ id: m.id, kind: m.kind === "image" ? "photo" : "video", url: m.url, poster_url: m.posterUrl, width: null, height: null });
const shareUrl = (ctx: CommunityContext, path: string) => `${ctx.deps.siteUrl.replace(/\/$/, "")}${path}`;

function postOut(ctx: CommunityContext, p: social.PostView): Json {
  return {
    id: p.id,
    author: wire(p.author),
    body: p.body,
    media: p.media.map(mediaOut),
    link_preview: p.link ? wire(p.link) : null,
    group_id: p.groupId,
    like_count: p.likeCount,
    comment_count: p.commentCount,
    liked: p.liked,
    saved: p.saved,
    status: p.status,
    can_edit: p.canEdit,
    share_url: shareUrl(ctx, p.sharePath),
    created_at: p.createdAt,
    edited_at: p.updatedAt !== p.createdAt ? p.updatedAt : null,
  };
}

const commentOut = (c: social.CommentView, replies: Json[] = []): Json => ({ id: c.id, author: wire(c.author), body: c.body, parent_id: c.parentId, like_count: c.likeCount, liked: c.liked, replies, reply_count: c.replyCount, status: c.status, can_delete: c.canDelete, created_at: c.createdAt });

const storyOut = (s: social.StoryView, author: unknown): Json => ({ id: s.id, author: wire(author), media: mediaOut(s.media), view_count: s.viewCount ?? 0, seen: s.seen, created_at: s.createdAt, expires_at: s.expiresAt });

const showcaseSummaryOut = (v: social.ShowcaseView): Json => ({ id: v.id, title: v.title, cover_url: v.media[0]?.posterUrl ?? v.media[0]?.url ?? null, author: wire(v.author), made_with_yallapp: v.madeWithYallapp, like_count: v.likeCount, app_type: v.appType || null });
const showcaseOut = (v: social.ShowcaseView): Json => ({
  ...showcaseSummaryOut(v),
  description: v.description,
  pictures: v.media.map((m) => m.url),
  media: v.media.map(mediaOut),
  app_store_url: v.appStoreUrl,
  play_store_url: v.playStoreUrl,
  website_url: v.webUrl,
  comment_count: v.commentCount,
  liked: v.liked,
  status: v.status,
  can_edit: v.canEdit,
  created_at: v.createdAt,
});

const feedItem = (ctx: CommunityContext, item: social.FeedItem): Json =>
  item.type === "post" ? { kind: "post", id: item.post.id, created_at: item.at, post: postOut(ctx, item.post) } : { kind: "question", id: item.question.id, created_at: item.at, question: wire(item.question) };

// ——— Files: multipart parts, or ids from POST /media ———

async function filesOf(ctx: CommunityContext, name: string): Promise<{ bytes: Uint8Array }[]> {
  const out: { bytes: Uint8Array }[] = [];
  for (const f of ctx.req.form?.getAll(name) ?? []) if (typeof f !== "string") out.push({ bytes: new Uint8Array(await f.arrayBuffer()) });
  return out;
}
const fileOf = async (ctx: CommunityContext, name: string) => (await filesOf(ctx, name))[0] ?? null;

/** The body's fields: a multipart form's, else the JSON's. */
function fieldsOf(ctx: CommunityContext): Json {
  const form = ctx.req.form;
  if (!form) return ctx.json();
  const out: Json = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Uploads a call's photos (field `photos`, `pictures` or `photo`) and video (`video` with its `poster`); with JSON, `media_ids`. */
async function mediaIdsOf(ctx: CommunityContext, env: SocialEnv, me: string, photoFields: string[]): Promise<unknown> {
  if (!ctx.req.form) return ctx.json().media_ids ?? [];
  const ids: string[] = [];
  for (const field of photoFields) for (const f of await filesOf(ctx, field)) ids.push((await social.uploadMedia(env, me, f)).id);
  const video = await fileOf(ctx, "video");
  if (video) ids.push((await social.uploadMedia(env, me, video, await fileOf(ctx, "poster"))).id);
  return ids;
}

// ——— Handlers ———

const uploadMedia: Handler = async (ctx) => {
  requireMember(ctx);
  // No file is refused by the check of its bytes, as any file that isn't a photo or a video.
  const file = (await fileOf(ctx, "file")) ?? { bytes: new Uint8Array() };
  return ok(mediaOut(await social.uploadMedia(socialEnvFor(ctx), viewer(ctx), file, await fileOf(ctx, "poster"))), 201);
};

const feed: Handler = async (ctx) => {
  const tab = (["for_you", "latest", "following"] as const).find((t) => t === ctx.query.get("tab")) as FeedTab | undefined;
  const page = await social.feed(socialEnvFor(ctx), viewer(ctx), { tab, cursor: ctx.query.get("cursor"), limit: limitOf(ctx) });
  return ok({ items: page.items.map((i) => feedItem(ctx, i)), next_cursor: page.nextCursor });
};

const createPost: Handler = async (ctx) => {
  const me = requireMember(ctx).member.id;
  const env = socialEnvFor(ctx);
  const b = fieldsOf(ctx);
  const mediaIds = await mediaIdsOf(ctx, env, me, ["photos", "photo"]);
  const post = await social.createPost(env, me, { body: b.body, mediaIds, groupId: str(b.group_id) ?? null });
  if (post.groupId) await groupPosted(ctx, post.groupId, 1);
  return ok(postOut(ctx, post), 201);
};
const linkPreview: Handler = async (ctx) => {
  requireMember(ctx);
  const url = str(ctx.json().url);
  if (!url || !/^https?:\/\//i.test(url)) fail(400, "invalid_request", { url: "error.invalid_request" });
  const preview = await fetchPreview(url!).catch(() => null);
  return preview ? ok(wire(preview)) : fail(404, "not_found");
};
const getPost: Handler = async (ctx) => ok(postOut(ctx, await social.getPost(socialEnvFor(ctx), viewer(ctx), ctx.params.post_id!)));
const editPost: Handler = async (ctx) => ok(postOut(ctx, await social.editPost(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.post_id!, { body: ctx.json().body })));
const deletePost: Handler = async (ctx) => {
  const env = socialEnvFor(ctx);
  const groupId = (await env.store.getPost(ctx.params.post_id!))?.groupId;
  await social.deletePost(env, requireMember(ctx).member.id, ctx.params.post_id!);
  if (groupId) await groupPosted(ctx, groupId, -1);
  return noContent();
};
const memberPosts: Handler = async (ctx) => {
  const member = (await findMember(ctx, ctx.params.member ?? "")) ?? fail(404, "not_found");
  const page = await social.listPosts(socialEnvFor(ctx), viewer(ctx), { authorId: member.id, cursor: ctx.query.get("cursor"), limit: limitOf(ctx) });
  return ok({ items: page.items.map((p) => ({ kind: "post", id: p.id, created_at: p.createdAt, post: postOut(ctx, p) })), next_cursor: page.nextCursor });
};

/** A group's posts, newest first (A's groups decide who reads). */
const groupFeed: Handler = async (ctx) => {
  const rights = await readableGroup(ctx, ctx.params.group!);
  if (!rights.canRead) fail(403, "group_private");
  const page = await social.listPosts(socialEnvFor(ctx), viewer(ctx), { groupId: rights.group.id, cursor: ctx.query.get("cursor"), limit: limitOf(ctx) });
  return ok({ items: page.items.map((p) => ({ kind: "post", id: p.id, created_at: p.createdAt, post: postOut(ctx, p) })), next_cursor: page.nextCursor });
};

// 234 A pro's portfolio is their own showcase items, in the order given.
setPortfolioLookup(async (ctx, memberId, ids) => {
  const env = socialEnvFor(ctx);
  const out: unknown[] = [];
  for (const id of ids) {
    const item = await social.getShowcase(env, viewer(ctx), id).catch(() => null);
    if (item && item.author.id === memberId) out.push(showcaseSummaryOut(item));
  }
  return out;
});

const likeOn =
  (kind: "post" | "comment" | "showcase", param: string, on: boolean): Handler =>
  async (ctx) => {
    const r = await social.like(socialEnvFor(ctx), requireMember(ctx).member.id, kind, ctx.params[param]!, on);
    return ok({ count: r.likeCount, mine: r.liked });
  };
const saveOn =
  (on: boolean): Handler =>
  async (ctx) => {
    await social.save(socialEnvFor(ctx), requireMember(ctx).member.id, "post", ctx.params.post_id!, on);
    return noContent();
  };
const savedList: Handler = async (ctx) => {
  const { posts } = await social.saved(socialEnvFor(ctx), requireMember(ctx).member.id);
  return ok({ items: posts.map((p) => ({ kind: "post", id: p.id, created_at: p.createdAt, post: postOut(ctx, p) })), next_cursor: null });
};

const listComments =
  (target: "post" | "showcase", param: string): Handler =>
  async (ctx) => {
    const env = socialEnvFor(ctx);
    const page = await social.listComments(env, viewer(ctx), target, ctx.params[param]!, { cursor: ctx.query.get("cursor"), limit: limitOf(ctx) });
    const items = await Promise.all(
      page.items.map(async (c) => commentOut(c, c.replyCount ? (await social.listComments(env, viewer(ctx), target, ctx.params[param]!, { parentId: c.id, limit: 50 })).items.map((r) => commentOut(r)) : [])),
    );
    return ok({ items, next_cursor: page.nextCursor });
  };
const addComment =
  (target: "post" | "showcase", param: string): Handler =>
  async (ctx) => {
    const b = ctx.json();
    return ok(commentOut(await social.comment(socialEnvFor(ctx), requireMember(ctx).member.id, target, ctx.params[param]!, { body: b.body, parentId: str(b.parent_id) ?? null })), 201);
  };
const deleteComment: Handler = async (ctx) => {
  await social.deleteComment(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.comment_id!);
  return noContent();
};

const stories: Handler = async (ctx) => {
  const rings = await social.storyRings(socialEnvFor(ctx), viewer(ctx));
  return ok({ items: rings.map((r) => ({ member: wire(r.author), stories: r.stories.map((s) => storyOut(s, r.author)), all_seen: r.seen })) });
};
const createStory: Handler = async (ctx) => {
  const me = requireMember(ctx);
  const env = socialEnvFor(ctx);
  let mediaId: unknown = ctx.json().media_id;
  if (ctx.req.form) {
    const photo = await fileOf(ctx, "photo");
    const video = await fileOf(ctx, "video");
    const file = photo ?? video ?? { bytes: new Uint8Array() };
    mediaId = (await social.uploadMedia(env, me.member.id, file, photo ? null : await fileOf(ctx, "poster"))).id;
  }
  const story = await social.createStory(env, me.member.id, { mediaId });
  const [author] = Object.values(await env.hooks.members([me.member.id]));
  return ok(storyOut(story, author), 201);
};
const viewStory: Handler = async (ctx) => {
  await social.viewStory(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!);
  return noContent();
};
const storyViewers: Handler = async (ctx) => ok({ items: (await social.storyViewers(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!)).map((v) => wire(v.member)), next_cursor: null });
const deleteStory: Handler = async (ctx) => {
  await social.deleteStory(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.story_id!);
  return noContent();
};

const showcaseList: Handler = async (ctx) => {
  const ref = ctx.query.get("member");
  const member = ref ? await findMember(ctx, ref) : null;
  if (ref && !member) return ok({ items: [], next_cursor: null });
  const sort = ctx.query.get("sort");
  const page = await social.listShowcase(socialEnvFor(ctx), viewer(ctx), { appType: ctx.query.get("type") ?? undefined, authorId: member?.id, sort: sort === "most_liked" || sort === "liked" ? "liked" : "newest", cursor: ctx.query.get("cursor"), limit: limitOf(ctx) });
  return ok({ items: page.items.map(showcaseSummaryOut), next_cursor: page.nextCursor });
};
const showcaseFields = (b: Json) => ({ title: b.title, description: b.description, appType: b.app_type, appStoreUrl: b.app_store_url, playStoreUrl: b.play_store_url, webUrl: b.website_url ?? b.web_url });
const createShowcase: Handler = async (ctx) => {
  const me = requireMember(ctx).member.id;
  const env = socialEnvFor(ctx);
  const b = fieldsOf(ctx);
  const mediaIds = await mediaIdsOf(ctx, env, me, ["pictures", "photos"]);
  return ok(showcaseOut(await social.createShowcase(env, me, { ...showcaseFields(b), mediaIds, yallappAppId: b.yallapp_app_id })), 201);
};
const getShowcase: Handler = async (ctx) => ok(showcaseOut(await social.getShowcase(socialEnvFor(ctx), viewer(ctx), ctx.params.item_id!)));
const editShowcase: Handler = async (ctx) => ok(showcaseOut(await social.editShowcase(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.item_id!, showcaseFields(ctx.json()))));
const deleteShowcase: Handler = async (ctx) => {
  await social.deleteShowcase(socialEnvFor(ctx), requireMember(ctx).member.id, ctx.params.item_id!);
  return noContent();
};

const pub = (method: CommunityRoute["method"], path: string, handler: Handler): CommunityRoute => ({ method, path, auth: "public", handler: run(handler) });
const mem = (method: CommunityRoute["method"], path: string, handler: Handler, options?: { refusedStatus?: number }): CommunityRoute => ({ method, path, handler: run(handler, options) });

export const SOCIAL_ROUTES: CommunityRoute[] = [
  mem("POST", "/media", limited("media", uploadMedia)),
  // Posts and the feed
  pub("GET", "/feed", feed),
  mem("POST", "/posts", limited("post", createPost)),
  mem("POST", "/posts/link-preview", limited("post", linkPreview)),
  pub("GET", "/posts/:post_id", getPost),
  mem("PATCH", "/posts/:post_id", limited("post", editPost)),
  mem("DELETE", "/posts/:post_id", deletePost),
  mem("PUT", "/posts/:post_id/like", limited("like", likeOn("post", "post_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/posts/:post_id/like", limited("like", likeOn("post", "post_id", false)), { refusedStatus: 400 }),
  mem("PUT", "/posts/:post_id/save", saveOn(true)),
  mem("DELETE", "/posts/:post_id/save", saveOn(false)),
  pub("GET", "/posts/:post_id/comments", listComments("post", "post_id")),
  mem("POST", "/posts/:post_id/comments", limited("comment", addComment("post", "post_id"))),
  mem("DELETE", "/comments/:comment_id", deleteComment),
  mem("PUT", "/comments/:comment_id/like", limited("like", likeOn("comment", "comment_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/comments/:comment_id/like", limited("like", likeOn("comment", "comment_id", false)), { refusedStatus: 400 }),
  mem("GET", "/me/saved", savedList),
  pub("GET", "/members/:member/posts", memberPosts),
  pub("GET", "/groups/:group/feed", groupFeed),
  // Stories
  mem("GET", "/stories", stories),
  mem("POST", "/stories", limited("story", createStory)),
  mem("POST", "/stories/:story_id/view", viewStory),
  mem("GET", "/stories/:story_id/viewers", storyViewers),
  mem("DELETE", "/stories/:story_id", deleteStory),
  // Showcase
  pub("GET", "/showcase", showcaseList),
  mem("POST", "/showcase", limited("showcase", createShowcase)),
  pub("GET", "/showcase/:item_id", getShowcase),
  mem("PATCH", "/showcase/:item_id", limited("showcase", editShowcase)),
  mem("DELETE", "/showcase/:item_id", deleteShowcase),
  mem("PUT", "/showcase/:item_id/like", limited("like", likeOn("showcase", "item_id", true)), { refusedStatus: 400 }),
  mem("DELETE", "/showcase/:item_id/like", limited("like", likeOn("showcase", "item_id", false)), { refusedStatus: 400 }),
  pub("GET", "/showcase/:item_id/comments", listComments("showcase", "item_id")),
  mem("POST", "/showcase/:item_id/comments", limited("comment", addComment("showcase", "item_id"))),
];
