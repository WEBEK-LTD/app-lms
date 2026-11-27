import { randomUUID } from "node:crypto";
import type { MemberPerson, QaHooks } from "../qa/hooks";
import { rankOf } from "../qa/text";
import { QaError, type MemberSummary, type QuestionSummary } from "../qa/types";
import type { CommentRecord, CommentTarget, LinkPreview, MediaKind, MediaRecord, PostRecord, ReactionTarget, ShowcaseRecord, SocialStatus, SocialStore, StoryRecord } from "./store";

/**
 * 232 Members connect (area B): posts with up to 10 photos or videos and a
 * link's preview; comments with replies; likes and saves (each counted
 * once); the home feed mixing posts and questions; 24-hour stories with who
 * saw them; the showcase of apps members built ("Made with Yallapp" checked
 * against their linked account). Moderation, blocks and notices are the
 * other areas', through `SocialEnv` (lib/community/api/social-routes.ts
 * builds it for each call).
 */

/** What the social engine needs for one call. */
export interface SocialEnv {
  store: SocialStore;
  /** The community: "yallapp", or a client app's id (phase 5). */
  tenant: string;
  now: Date;
  /** Members, blocks, follows, moderation and notices: the same seam as the Q&A (lib/community/api/qa-hooks.ts). */
  hooks: Pick<QaHooks, "members" | "hiddenFor" | "followingIds" | "moderate" | "notify">;
  isTeam(memberId: string): Promise<boolean>;
  /** Stores an uploaded file and gives its public address; null when uploads aren't set up. */
  upload: ((key: string, bytes: Uint8Array, contentType: string) => Promise<string>) | null;
  /** A link's preview (lib/net/safe-fetch); tests give their own. */
  preview(url: string): Promise<LinkPreview | null>;
  /** Whether the app is one of the member's linked Yallapp account's ("Made with Yallapp"). */
  ownsYallappApp(memberId: string, appId: string): Promise<boolean>;
  /** Area A's groups: may this member post in it, may this viewer read it. */
  groups?: { canPost(memberId: string, groupId: string): Promise<boolean>; canRead(viewerId: string | null, groupId: string): Promise<boolean> };
  /** The feed's questions (area B's Q&A), newest or for the member. */
  questions?(input: { tab: FeedTab; viewerId: string | null; limit: number }): Promise<QuestionSummary[]>;
  /** For points (area C): something the member did. */
  onEvent?(event: { kind: SocialEventKind; memberId: string; refId: string }): Promise<void>;
}

export type SocialEventKind = "post_created" | "post_liked" | "comment_created" | "story_created" | "showcase_created" | "showcase_liked";
export type FeedTab = "for_you" | "latest" | "following";

export const SOCIAL_LIMITS = {
  bodyMax: 5000,
  mediaMax: 10,
  commentMax: 1000,
  fileMax: 5 * 1024 * 1024,
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 4000,
  pageMax: 50,
  storyHours: 24,
} as const;
const LIKE_MILESTONES = [1, 10, 50, 100] as const;
const SHOWN: readonly SocialStatus[] = ["published"];

// ——— Views ———

export interface MediaView {
  id: string;
  kind: MediaKind;
  url: string;
  posterUrl: string | null;
}

export interface PostView {
  id: string;
  author: MemberSummary;
  groupId: string | null;
  body: string;
  media: MediaView[];
  link: LinkPreview | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  status: SocialStatus;
  canEdit: boolean;
  /** The post's own page, to share. */
  sharePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentView {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  parentId: string | null;
  author: MemberSummary;
  body: string;
  likeCount: number;
  liked: boolean;
  replyCount: number;
  status: SocialStatus;
  canDelete: boolean;
  createdAt: string;
}

export interface StoryView {
  id: string;
  media: MediaView;
  seen: boolean;
  /** Only the author sees how many saw it. */
  viewCount: number | null;
  expiresAt: string;
  createdAt: string;
}

export interface StoryRing {
  author: MemberSummary;
  stories: StoryView[];
  /** Every story in it was seen. */
  seen: boolean;
}

export interface ShowcaseView {
  id: string;
  author: MemberSummary;
  title: string;
  description: string;
  media: MediaView[];
  appType: string;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  webUrl: string | null;
  madeWithYallapp: boolean;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  status: SocialStatus;
  canEdit: boolean;
  createdAt: string;
}

export type FeedItem = { type: "post"; post: PostView; at: string } | { type: "question"; question: QuestionSummary; at: string };

// ——— Helpers ———

const signedIn = (viewerId: string | null): string => {
  if (!viewerId) throw new QaError("invalid_token", "Sign in first.");
  return viewerId;
};
const DELETED = (id: string): MemberPerson => ({ id, username: "", displayName: "Deleted member", avatarUrl: null, topBadge: null, team: false, deleted: true });

async function people(env: SocialEnv, ids: readonly string[]): Promise<Record<string, MemberSummary>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const found = await env.hooks.members(unique);
  return Object.fromEntries(unique.map((id) => [id, { ...(found[id] ?? DELETED(id)), rank: found[id]?.rank ?? rankOf(0) }]));
}

function text(value: unknown, max: number, field: string, min = 0): string {
  const clean = typeof value === "string" ? value.normalize("NFC").replace(/\r\n/g, "\n").trim() : "";
  if (clean.length < min || clean.length > max) throw new QaError("invalid_request", `${field} is ${clean.length < min ? "too short" : "too long"}.`, field);
  return clean;
}

const page = (cursor: string | null | undefined, limit: number | undefined) => ({
  offset: Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0),
  limit: Math.min(SOCIAL_LIMITS.pageMax, Math.max(1, limit ?? 20)),
});
const nextCursor = (got: number, p: { offset: number; limit: number }) => (got > p.limit ? String(p.offset + p.limit) : null);

/** A new post's status: the team's show at once; the rest go through moderation (area C). */
async function moderated(env: SocialEnv, memberId: string, targetType: "post" | "post_comment" | "showcase" | "story", targetId: string, textOf: string): Promise<SocialStatus> {
  if (await env.isTeam(memberId)) return "published";
  return env.hooks.moderate({ memberId, targetType: targetType as never, targetId, text: textOf });
}

const mediaView = (m: MediaRecord): MediaView => ({ id: m.id, kind: m.kind, url: m.url, posterUrl: m.posterUrl });

async function mediaOf(env: SocialEnv, ids: readonly string[]): Promise<Map<string, MediaView>> {
  return new Map((await env.store.getMedia([...new Set(ids)])).map((m) => [m.id, mediaView(m)]));
}

// ——— Media ———

const SNIFF: { kind: MediaKind; type: string; test: (b: Uint8Array) => boolean }[] = [
  { kind: "image", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: "image", type: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { kind: "image", type: "image/webp", test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
  { kind: "video", type: "video/mp4", test: (b) => String.fromCharCode(...b.slice(4, 8)) === "ftyp" },
  { kind: "video", type: "video/webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };

/** What a file is by its first bytes (not its name or what the client says); null for anything else. */
export function sniffMedia(bytes: Uint8Array): { kind: MediaKind; type: string } | null {
  const hit = SNIFF.find((s) => bytes.length >= 12 && s.test(bytes));
  return hit ? { kind: hit.kind, type: hit.type } : null;
}

/** A photo or a video (with its still, optional) for a post, a story or the showcase: stored, then used once. */
export async function uploadMedia(env: SocialEnv, viewerId: string | null, file: { bytes: Uint8Array }, poster?: { bytes: Uint8Array } | null): Promise<MediaView> {
  const member = signedIn(viewerId);
  if (!env.upload) throw new QaError("invalid_request", "Uploads aren't available.", "file");
  const what = sniffMedia(file.bytes);
  if (!what) throw new QaError("invalid_request", "Choose a JPEG, PNG or WebP photo, or an MP4 or WebM video.", "file");
  if (file.bytes.length > SOCIAL_LIMITS.fileMax) throw new QaError("invalid_request", "The file is too large (5 MB at most).", "file");
  const id = randomUUID();
  const url = await env.upload(`community/media/${env.tenant}/${id}.${EXT[what.type]}`, file.bytes, what.type);
  let posterUrl: string | null = null;
  if (what.kind === "video" && poster?.bytes.length) {
    const still = sniffMedia(poster.bytes);
    if (!still || still.kind !== "image" || poster.bytes.length > SOCIAL_LIMITS.fileMax) throw new QaError("invalid_request", "The video's still must be a JPEG, PNG or WebP photo.", "poster");
    posterUrl = await env.upload(`community/media/${env.tenant}/${id}-poster.${EXT[still.type]}`, poster.bytes, still.type);
  }
  const media: MediaRecord = { id, tenant: env.tenant, ownerId: member, kind: what.kind, url, posterUrl, contentType: what.type, size: file.bytes.length, usedBy: null, createdAt: env.now };
  await env.store.createMedia(media);
  return mediaView(media);
}

/** The member's own unused uploads, in their order; any other id is refused. */
async function takeMedia(env: SocialEnv, member: string, ids: unknown, by: string, max: number, min = 0): Promise<string[]> {
  const list = Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string"))] : [];
  if (list.length < min || list.length > max) throw new QaError("invalid_request", `Add ${min ? `${min} to ` : "up to "}${max} photos or videos.`, "media_ids");
  if (!list.length) return [];
  const taken = await env.store.useMedia(member, list, by);
  if (taken.length !== list.length) throw new QaError("invalid_request", "A photo or video isn't yours, or was used already.", "media_ids");
  return list;
}

// ——— Link previews ———

const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"')]+/i;

/** The first link in a post's words, for its preview. */
export function firstLink(body: string): string | null {
  const m = URL_IN_TEXT.exec(body);
  if (!m) return null;
  try {
    const u = new URL(m[0].replace(/[.,!?;:]+$/, ""));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

/** A page's title, description, image and site name from its Open Graph tags (else its <title>). */
export function previewFromHtml(url: string, html: string): LinkPreview | null {
  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
    const tag = re.exec(html)?.[0];
    return tag ? decode(/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? "") : "";
  };
  const title = meta("og:title") || decode(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "");
  if (!title) return null;
  const image = meta("og:image");
  let imageUrl: string | null = null;
  try {
    const u = image ? new URL(image, url) : null;
    imageUrl = u && u.protocol === "https:" ? u.toString() : null;
  } catch {
    imageUrl = null;
  }
  return { url, title: title.slice(0, 200), description: meta("og:description").slice(0, 400) || meta("description").slice(0, 400), imageUrl, siteName: (meta("og:site_name") || new URL(url).hostname).slice(0, 80) };
}

async function linkOf(env: SocialEnv, body: string): Promise<LinkPreview | null> {
  const url = firstLink(body);
  if (!url) return null;
  try {
    return await env.preview(url);
  } catch {
    return null;
  }
}

// ——— Posts ———

async function postViews(env: SocialEnv, viewerId: string | null, posts: PostRecord[]): Promise<PostView[]> {
  const ids = posts.map((p) => p.id);
  const [authors, media, liked, saved] = await Promise.all([
    people(env, posts.map((p) => p.authorId)),
    mediaOf(env, posts.flatMap((p) => p.mediaIds)),
    viewerId ? env.store.reactionsOf(viewerId, "like", "post", ids) : ([] as string[]),
    viewerId ? env.store.reactionsOf(viewerId, "save", "post", ids) : ([] as string[]),
  ]);
  return posts.map((p) => ({
    id: p.id,
    author: authors[p.authorId]!,
    groupId: p.groupId,
    body: p.body,
    media: p.mediaIds.map((id) => media.get(id)).filter((m): m is MediaView => !!m),
    link: p.link,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    liked: liked.includes(p.id),
    saved: saved.includes(p.id),
    status: p.status,
    canEdit: viewerId === p.authorId,
    sharePath: `/posts/${p.id}`,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

/** A post the viewer may see: published (their own whatever it is), not by someone blocked either way, in a group they may read. */
async function visiblePost(env: SocialEnv, viewerId: string | null, id: string): Promise<PostRecord> {
  const p = await env.store.getPost(id);
  const own = !!viewerId && p?.authorId === viewerId;
  if (!p || p.tenant !== env.tenant || p.status === "removed" || (p.status !== "published" && !own)) throw new QaError("not_found", "There's no such post.");
  if (viewerId && !own && (await env.hooks.hiddenFor(viewerId)).includes(p.authorId)) throw new QaError("not_found", "There's no such post.");
  if (p.groupId && !(await env.groups?.canRead(viewerId, p.groupId))) throw new QaError("not_found", "There's no such post.");
  return p;
}

export async function createPost(env: SocialEnv, viewerId: string | null, input: { body?: unknown; mediaIds?: unknown; groupId?: string | null }): Promise<PostView> {
  const member = signedIn(viewerId);
  const body = text(input.body ?? "", SOCIAL_LIMITS.bodyMax, "body");
  const groupId = input.groupId ?? null;
  if (groupId && !(await env.groups?.canPost(member, groupId))) throw new QaError("not_allowed", "You can't post in this group.", "group_id");
  const id = randomUUID();
  const mediaIds = await takeMedia(env, member, input.mediaIds, `post:${id}`, SOCIAL_LIMITS.mediaMax);
  if (!body && !mediaIds.length) throw new QaError("invalid_request", "Write something or add a photo or video.", "body");
  const link = await linkOf(env, body);
  const post: PostRecord = { id, tenant: env.tenant, authorId: member, groupId, body, mediaIds, link, status: "pending", likeCount: 0, commentCount: 0, createdAt: env.now, updatedAt: env.now };
  await env.store.createPost(post);
  post.status = await moderated(env, member, "post", id, body);
  if (post.status !== "pending") await env.store.updatePost(id, { status: post.status });
  await env.onEvent?.({ kind: "post_created", memberId: member, refId: id });
  return (await postViews(env, member, [post]))[0]!;
}

export async function getPost(env: SocialEnv, viewerId: string | null, id: string): Promise<PostView> {
  return (await postViews(env, viewerId, [await visiblePost(env, viewerId, id)]))[0]!;
}

/** One's own post's words; a published one is moderated again (an edit into spam is held). */
export async function editPost(env: SocialEnv, viewerId: string | null, id: string, input: { body?: unknown }): Promise<PostView> {
  const member = signedIn(viewerId);
  const p = await visiblePost(env, member, id);
  if (p.authorId !== member) throw new QaError("not_allowed", "Only its author can change a post.");
  const body = text(input.body ?? "", SOCIAL_LIMITS.bodyMax, "body");
  if (!body && !p.mediaIds.length) throw new QaError("invalid_request", "Write something or add a photo or video.", "body");
  const patch: Partial<PostRecord> = { body, link: body === p.body ? p.link : await linkOf(env, body), updatedAt: env.now };
  if (body !== p.body && p.status === "published") patch.status = await moderated(env, member, "post", id, body);
  await env.store.updatePost(id, patch);
  return getPost(env, member, id);
}

/** One's own post goes; Yallapp's team removes anyone's. */
export async function deletePost(env: SocialEnv, viewerId: string | null, id: string): Promise<void> {
  const member = signedIn(viewerId);
  const p = await env.store.getPost(id);
  if (!p || p.tenant !== env.tenant || p.status === "removed") throw new QaError("not_found", "There's no such post.");
  if (p.authorId !== member && !(await env.isTeam(member))) throw new QaError("not_allowed", "Only its author can delete a post.");
  await env.store.updatePost(id, { status: "removed", updatedAt: env.now });
}

/** A member's posts, or a group's (area A asks for these with `groupId`), newest first. */
export async function listPosts(env: SocialEnv, viewerId: string | null, input: { authorId?: string; groupId?: string | null; cursor?: string | null; limit?: number }): Promise<{ items: PostView[]; nextCursor: string | null }> {
  if (input.groupId && !(await env.groups?.canRead(viewerId, input.groupId))) throw new QaError("not_found", "There's no such group.");
  const hidden = viewerId ? await env.hooks.hiddenFor(viewerId) : [];
  const p = page(input.cursor, input.limit);
  const rows = await env.store.listPosts(
    { tenant: env.tenant, statuses: SHOWN, orAuthorId: viewerId, authorIds: input.authorId ? [input.authorId] : undefined, excludeAuthorIds: hidden, groupId: input.groupId ?? null },
    { offset: p.offset, limit: p.limit + 1 },
  );
  return { items: await postViews(env, viewerId, rows.slice(0, p.limit)), nextCursor: nextCursor(rows.length, p) };
}

/**
 * The home feed: posts and questions together, newest first. "Latest" is
 * everyone's; "Following" is of the members the viewer follows (questions
 * by the Q&A's "following"); "For you" puts the Q&A's choice for the member
 * with every post.
 */
export async function feed(env: SocialEnv, viewerId: string | null, input: { tab?: FeedTab; cursor?: string | null; limit?: number }): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const tab: FeedTab = input.tab === "following" || input.tab === "latest" ? input.tab : "for_you";
  if (tab === "following") signedIn(viewerId);
  const p = page(input.cursor, input.limit);
  // Each source's first offset+limit+1 rows hold the merged page's.
  const want = Math.min(p.offset + p.limit + 1, 500);
  const hidden = viewerId ? await env.hooks.hiddenFor(viewerId) : [];
  const following = tab === "following" ? await env.hooks.followingIds(viewerId!) : undefined;
  const [posts, questions] = await Promise.all([
    following && !following.length ? Promise.resolve([] as PostRecord[]) : env.store.listPosts({ tenant: env.tenant, statuses: SHOWN, orAuthorId: viewerId, authorIds: following, excludeAuthorIds: hidden, groupId: null }, { offset: 0, limit: want }),
    env.questions ? env.questions({ tab, viewerId, limit: want }) : Promise.resolve([] as QuestionSummary[]),
  ]);
  const merged: ({ type: "post"; row: PostRecord; at: Date } | { type: "question"; question: QuestionSummary; at: Date })[] = [
    ...posts.map((row) => ({ type: "post" as const, row, at: row.createdAt })),
    ...questions.map((question) => ({ type: "question" as const, question, at: new Date(question.createdAt) })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const slice = merged.slice(p.offset, p.offset + p.limit);
  const views = new Map((await postViews(env, viewerId, slice.flatMap((x) => (x.type === "post" ? [x.row] : [])))).map((v) => [v.id, v]));
  const items: FeedItem[] = slice.map((x) => (x.type === "post" ? { type: "post", post: views.get(x.row.id)!, at: x.at.toISOString() } : { type: "question", question: x.question, at: x.at.toISOString() }));
  return { items, nextCursor: merged.length > p.offset + p.limit ? String(p.offset + p.limit) : null };
}

// ——— Likes and saves ———

async function likeTarget(env: SocialEnv, viewerId: string, kind: ReactionTarget, id: string): Promise<{ authorId: string; likeCount: number; link: string; title: string }> {
  if (kind === "post") {
    const p = await visiblePost(env, viewerId, id);
    return { authorId: p.authorId, likeCount: p.likeCount, link: `/posts/${p.id}`, title: p.body.slice(0, 80) };
  }
  if (kind === "showcase") {
    const s = await visibleShowcase(env, viewerId, id);
    return { authorId: s.authorId, likeCount: s.likeCount, link: `/showcase/${s.id}`, title: s.title };
  }
  const c = await visibleComment(env, viewerId, id);
  return { authorId: c.authorId, likeCount: c.likeCount, link: c.targetType === "post" ? `/posts/${c.targetId}#c${c.id}` : `/showcase/${c.targetId}#c${c.id}`, title: c.body.slice(0, 80) };
}

/** Likes or unlikes: counted once however often it's sent; the author hears at 1, 10, 50 and 100. Never one's own. */
export async function like(env: SocialEnv, viewerId: string | null, kind: ReactionTarget, id: string, on: boolean): Promise<{ liked: boolean; likeCount: number }> {
  const member = signedIn(viewerId);
  const target = await likeTarget(env, member, kind, id);
  if (target.authorId === member) throw new QaError("not_allowed", "You can't like your own post.");
  const changed = await env.store.setReaction(member, "like", kind, id, on, env.now);
  if (!changed) return { liked: on, likeCount: target.likeCount };
  await env.store.addCounts(kind, id, { likes: on ? 1 : -1 });
  const likeCount = target.likeCount + (on ? 1 : -1);
  if (on && kind !== "comment") {
    await env.onEvent?.({ kind: kind === "post" ? "post_liked" : "showcase_liked", memberId: target.authorId, refId: id });
    if ((LIKE_MILESTONES as readonly number[]).includes(likeCount)) {
      await env.hooks.notify({ memberId: target.authorId, kind: "post_liked" as never, actorId: member, targetType: kind as never, targetId: id, data: { title: target.title, count: likeCount }, link: target.link });
    }
  }
  return { liked: on, likeCount };
}

export async function save(env: SocialEnv, viewerId: string | null, kind: "post" | "showcase", id: string, on: boolean): Promise<void> {
  const member = signedIn(viewerId);
  await likeTarget(env, member, kind, id);
  await env.store.setReaction(member, "save", kind, id, on, env.now);
}

/** The member's saved posts and showcase items, the last saved first. */
export async function saved(env: SocialEnv, viewerId: string | null): Promise<{ posts: PostView[]; showcase: ShowcaseView[] }> {
  const member = signedIn(viewerId);
  const [postIds, showcaseIds] = await Promise.all([env.store.savedBy(member, "post", { offset: 0, limit: 100 }), env.store.savedBy(member, "showcase", { offset: 0, limit: 100 })]);
  const hidden = await env.hooks.hiddenFor(member);
  const [posts, items] = await Promise.all([
    postIds.length ? env.store.listPosts({ tenant: env.tenant, statuses: SHOWN, ids: postIds, excludeAuthorIds: hidden }, { offset: 0, limit: 100 }) : [],
    showcaseIds.length ? env.store.listShowcase({ tenant: env.tenant, statuses: SHOWN, ids: showcaseIds, excludeAuthorIds: hidden }, "newest", { offset: 0, limit: 100 }) : [],
  ]);
  const byId = <T extends { id: string }>(rows: T[], order: string[]) => order.map((id) => rows.find((r) => r.id === id)).filter((r): r is T => !!r);
  return { posts: await postViews(env, member, byId(posts, postIds)), showcase: await showcaseViews(env, member, byId(items, showcaseIds)) };
}

// ——— Comments ———

async function visibleComment(env: SocialEnv, viewerId: string | null, id: string): Promise<CommentRecord> {
  const c = await env.store.getComment(id);
  const own = !!viewerId && c?.authorId === viewerId;
  if (!c || c.tenant !== env.tenant || c.status === "removed" || (c.status !== "published" && !own)) throw new QaError("not_found", "There's no such comment.");
  if (viewerId && !own && (await env.hooks.hiddenFor(viewerId)).includes(c.authorId)) throw new QaError("not_found", "There's no such comment.");
  return c;
}

async function commentTarget(env: SocialEnv, viewerId: string | null, targetType: CommentTarget, targetId: string): Promise<{ authorId: string; link: string; title: string }> {
  if (targetType === "post") {
    const p = await visiblePost(env, viewerId, targetId);
    return { authorId: p.authorId, link: `/posts/${p.id}`, title: p.body.slice(0, 80) };
  }
  const s = await visibleShowcase(env, viewerId, targetId);
  return { authorId: s.authorId, link: `/showcase/${s.id}`, title: s.title };
}

async function commentViews(env: SocialEnv, viewerId: string | null, comments: CommentRecord[]): Promise<CommentView[]> {
  const ids = comments.map((c) => c.id);
  const [authors, liked, replies] = await Promise.all([people(env, comments.map((c) => c.authorId)), viewerId ? env.store.reactionsOf(viewerId, "like", "comment", ids) : ([] as string[]), env.store.replyCounts(ids)]);
  return comments.map((c) => ({
    id: c.id,
    targetType: c.targetType,
    targetId: c.targetId,
    parentId: c.parentId,
    author: authors[c.authorId]!,
    body: c.body,
    likeCount: c.likeCount,
    liked: liked.includes(c.id),
    replyCount: replies[c.id] ?? 0,
    status: c.status,
    canDelete: viewerId === c.authorId,
    createdAt: c.createdAt.toISOString(),
  }));
}

/** A post's or showcase item's comments (or a comment's replies), oldest first. */
export async function listComments(env: SocialEnv, viewerId: string | null, targetType: CommentTarget, targetId: string, input: { parentId?: string | null; cursor?: string | null; limit?: number }): Promise<{ items: CommentView[]; nextCursor: string | null }> {
  await commentTarget(env, viewerId, targetType, targetId);
  const hidden = viewerId ? await env.hooks.hiddenFor(viewerId) : [];
  const p = page(input.cursor, input.limit);
  const rows = await env.store.listComments({ targetType, targetId, parentId: input.parentId ?? null, statuses: SHOWN, orAuthorId: viewerId, excludeAuthorIds: hidden }, { offset: p.offset, limit: p.limit + 1 });
  return { items: await commentViews(env, viewerId, rows.slice(0, p.limit)), nextCursor: nextCursor(rows.length, p) };
}

/** Comments, or replies to a comment (one level: a reply to a reply answers its comment). The author hears of it, and a reply's comment's author too. */
export async function comment(env: SocialEnv, viewerId: string | null, targetType: CommentTarget, targetId: string, input: { body?: unknown; parentId?: string | null }): Promise<CommentView> {
  const member = signedIn(viewerId);
  const target = await commentTarget(env, member, targetType, targetId);
  if ((await env.hooks.hiddenFor(member)).includes(target.authorId)) throw new QaError("not_allowed", "You can't comment here.");
  const body = text(input.body, SOCIAL_LIMITS.commentMax, "body", 1);
  let parent: CommentRecord | null = null;
  if (input.parentId) {
    parent = await visibleComment(env, member, input.parentId);
    if (parent.targetType !== targetType || parent.targetId !== targetId) throw new QaError("invalid_request", "That comment isn't on this post.", "parent_id");
    if (parent.parentId) parent = await visibleComment(env, member, parent.parentId);
  }
  const record: CommentRecord = { id: randomUUID(), tenant: env.tenant, targetType, targetId, parentId: parent?.id ?? null, authorId: member, body, status: "pending", likeCount: 0, createdAt: env.now };
  await env.store.createComment(record);
  record.status = await moderated(env, member, "post_comment", record.id, body);
  if (record.status === "published") await publishComment(env, record, target);
  else await env.store.updateComment(record.id, { status: record.status });
  return (await commentViews(env, member, [record]))[0]!;
}

async function publishComment(env: SocialEnv, c: CommentRecord, target: { authorId: string; link: string; title: string }): Promise<void> {
  await env.store.updateComment(c.id, { status: "published" });
  await env.store.addCounts(c.targetType, c.targetId, { comments: 1 });
  await env.onEvent?.({ kind: "comment_created", memberId: c.authorId, refId: c.id });
  const link = `${target.link}#c${c.id}`;
  const told = new Set<string>([c.authorId]);
  if (c.parentId) {
    const parent = await env.store.getComment(c.parentId);
    if (parent && !told.has(parent.authorId)) {
      told.add(parent.authorId);
      await env.hooks.notify({ memberId: parent.authorId, kind: "comment_reply" as never, actorId: c.authorId, targetType: "post_comment" as never, targetId: c.id, data: { title: target.title }, link });
    }
  }
  if (!told.has(target.authorId)) {
    await env.hooks.notify({ memberId: target.authorId, kind: (c.targetType === "post" ? "post_comment" : "showcase_comment") as never, actorId: c.authorId, targetType: "post_comment" as never, targetId: c.id, data: { title: target.title }, link });
  }
}

/** One's own comment goes; the team removes anyone's. */
export async function deleteComment(env: SocialEnv, viewerId: string | null, id: string): Promise<void> {
  const member = signedIn(viewerId);
  const c = await env.store.getComment(id);
  if (!c || c.tenant !== env.tenant || c.status === "removed") throw new QaError("not_found", "There's no such comment.");
  if (c.authorId !== member && !(await env.isTeam(member))) throw new QaError("not_allowed", "Only its author can delete a comment.");
  await setStatus(env, "post_comment", id, "removed");
}

// ——— Stories ———

/** A photo or short video for 24 hours. */
export async function createStory(env: SocialEnv, viewerId: string | null, input: { mediaId?: unknown }): Promise<StoryView> {
  const member = signedIn(viewerId);
  const id = randomUUID();
  const [mediaId] = await takeMedia(env, member, input.mediaId ? [input.mediaId] : [], `story:${id}`, 1, 1);
  const story: StoryRecord = { id, tenant: env.tenant, authorId: member, mediaId: mediaId!, status: "pending", viewCount: 0, expiresAt: new Date(env.now.getTime() + SOCIAL_LIMITS.storyHours * 3600_000), createdAt: env.now };
  await env.store.createStory(story);
  story.status = await moderated(env, member, "story", id, "");
  await env.store.updateStory(id, { status: story.status });
  await env.onEvent?.({ kind: "story_created", memberId: member, refId: id });
  const media = (await mediaOf(env, [story.mediaId])).get(story.mediaId)!;
  return { id, media, seen: true, viewCount: 0, expiresAt: story.expiresAt.toISOString(), createdAt: story.createdAt.toISOString() };
}

/** The ring row on home: the viewer's own first, then those they follow with something unseen, then the rest. */
export async function storyRings(env: SocialEnv, viewerId: string | null): Promise<StoryRing[]> {
  if (!viewerId) return [];
  const [following, hidden] = await Promise.all([env.hooks.followingIds(viewerId), env.hooks.hiddenFor(viewerId)]);
  const authorIds = [viewerId, ...following.filter((id) => !hidden.includes(id))];
  const stories = await env.store.listStories({ tenant: env.tenant, authorIds, statuses: SHOWN, now: env.now });
  const own = (await env.store.listStories({ tenant: env.tenant, authorIds: [viewerId], statuses: ["pending"], now: env.now })).filter((s) => !stories.some((x) => x.id === s.id));
  const all = [...stories, ...own];
  if (!all.length) return [];
  const [seen, media, authors] = await Promise.all([env.store.seenStories(viewerId, all.map((s) => s.id)), mediaOf(env, all.map((s) => s.mediaId)), people(env, all.map((s) => s.authorId))]);
  const rings = new Map<string, StoryRing>();
  for (const s of all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const mine = s.authorId === viewerId;
    const ring = rings.get(s.authorId) ?? { author: authors[s.authorId]!, stories: [], seen: true };
    const view: StoryView = { id: s.id, media: media.get(s.mediaId)!, seen: mine || seen.includes(s.id), viewCount: mine ? s.viewCount : null, expiresAt: s.expiresAt.toISOString(), createdAt: s.createdAt.toISOString() };
    ring.stories.push(view);
    ring.seen &&= view.seen;
    rings.set(s.authorId, ring);
  }
  const latest = (r: StoryRing) => new Date(r.stories.at(-1)!.createdAt).getTime();
  return [...rings.values()].sort((a, b) => Number(b.author.id === viewerId) - Number(a.author.id === viewerId) || Number(a.seen) - Number(b.seen) || latest(b) - latest(a));
}

async function visibleStory(env: SocialEnv, viewerId: string, id: string): Promise<StoryRecord> {
  const s = await env.store.getStory(id);
  const own = s?.authorId === viewerId;
  if (!s || s.tenant !== env.tenant || s.expiresAt.getTime() <= env.now.getTime() || s.status === "removed" || (s.status !== "published" && !own)) throw new QaError("not_found", "There's no such story.");
  if (!own && (await env.hooks.hiddenFor(viewerId)).includes(s.authorId)) throw new QaError("not_found", "There's no such story.");
  return s;
}

/** Seen: counted once per viewer (not the author). */
export async function viewStory(env: SocialEnv, viewerId: string | null, id: string): Promise<void> {
  const member = signedIn(viewerId);
  const s = await visibleStory(env, member, id);
  if (s.authorId !== member) await env.store.addStoryView(s.id, member, env.now);
}

/** Who saw it: the author only. */
export async function storyViewers(env: SocialEnv, viewerId: string | null, id: string): Promise<{ member: MemberSummary; viewedAt: string }[]> {
  const member = signedIn(viewerId);
  const s = await visibleStory(env, member, id);
  if (s.authorId !== member) throw new QaError("not_allowed", "Only its author sees who saw a story.");
  const hidden = await env.hooks.hiddenFor(member);
  const viewers = (await env.store.storyViewers(s.id)).filter((v) => !hidden.includes(v.viewerId));
  const authors = await people(env, viewers.map((v) => v.viewerId));
  return viewers.map((v) => ({ member: authors[v.viewerId]!, viewedAt: v.viewedAt.toISOString() }));
}

export async function deleteStory(env: SocialEnv, viewerId: string | null, id: string): Promise<void> {
  const member = signedIn(viewerId);
  const s = await env.store.getStory(id);
  if (!s || s.tenant !== env.tenant || s.status === "removed") throw new QaError("not_found", "There's no such story.");
  if (s.authorId !== member && !(await env.isTeam(member))) throw new QaError("not_allowed", "Only its author can delete a story.");
  await env.store.updateStory(id, { status: "removed" });
}

// ——— Showcase ———

const STORE_HOSTS = { appStoreUrl: ["apps.apple.com"], playStoreUrl: ["play.google.com"] } as const;

function storeLink(value: unknown, field: "appStoreUrl" | "playStoreUrl" | "webUrl"): string | null {
  if (value === undefined || value === null || value === "") return null;
  try {
    const u = new URL(String(value));
    if (u.protocol !== "https:") throw new Error("https");
    if (field !== "webUrl" && !(STORE_HOSTS[field] as readonly string[]).includes(u.hostname)) throw new Error("host");
    return u.toString().slice(0, 500);
  } catch {
    const name = field === "appStoreUrl" ? "app_store_url" : field === "playStoreUrl" ? "play_store_url" : "web_url";
    throw new QaError("invalid_request", field === "webUrl" ? "Give an https address." : `Give the app's ${field === "appStoreUrl" ? "App Store" : "Google Play"} address.`, name);
  }
}

const APP_TYPE = /^[a-z0-9_-]{2,30}$/;

async function showcaseViews(env: SocialEnv, viewerId: string | null, items: ShowcaseRecord[]): Promise<ShowcaseView[]> {
  const ids = items.map((s) => s.id);
  const [authors, media, liked, savedIds] = await Promise.all([
    people(env, items.map((s) => s.authorId)),
    mediaOf(env, items.flatMap((s) => s.mediaIds)),
    viewerId ? env.store.reactionsOf(viewerId, "like", "showcase", ids) : ([] as string[]),
    viewerId ? env.store.reactionsOf(viewerId, "save", "showcase", ids) : ([] as string[]),
  ]);
  return items.map((s) => ({
    id: s.id,
    author: authors[s.authorId]!,
    title: s.title,
    description: s.description,
    media: s.mediaIds.map((id) => media.get(id)).filter((m): m is MediaView => !!m),
    appType: s.appType,
    appStoreUrl: s.appStoreUrl,
    playStoreUrl: s.playStoreUrl,
    webUrl: s.webUrl,
    madeWithYallapp: s.verified,
    likeCount: s.likeCount,
    commentCount: s.commentCount,
    liked: liked.includes(s.id),
    saved: savedIds.includes(s.id),
    status: s.status,
    canEdit: viewerId === s.authorId,
    createdAt: s.createdAt.toISOString(),
  }));
}

async function visibleShowcase(env: SocialEnv, viewerId: string | null, id: string): Promise<ShowcaseRecord> {
  const s = await env.store.getShowcase(id);
  const own = !!viewerId && s?.authorId === viewerId;
  if (!s || s.tenant !== env.tenant || s.status === "removed" || (s.status !== "published" && !own)) throw new QaError("not_found", "There's no such app.");
  if (viewerId && !own && (await env.hooks.hiddenFor(viewerId)).includes(s.authorId)) throw new QaError("not_found", "There's no such app.");
  return s;
}

/** A member shows an app they built: pictures, words, its store links; "Made with Yallapp" when it is their linked account's. */
export async function createShowcase(
  env: SocialEnv,
  viewerId: string | null,
  input: { title?: unknown; description?: unknown; mediaIds?: unknown; appType?: unknown; appStoreUrl?: unknown; playStoreUrl?: unknown; webUrl?: unknown; yallappAppId?: unknown },
): Promise<ShowcaseView> {
  const member = signedIn(viewerId);
  const title = text(input.title, SOCIAL_LIMITS.titleMax, "title", SOCIAL_LIMITS.titleMin);
  const description = text(input.description ?? "", SOCIAL_LIMITS.descriptionMax, "description");
  const appType = typeof input.appType === "string" && APP_TYPE.test(input.appType) ? input.appType : "other";
  const links = { appStoreUrl: storeLink(input.appStoreUrl, "appStoreUrl"), playStoreUrl: storeLink(input.playStoreUrl, "playStoreUrl"), webUrl: storeLink(input.webUrl, "webUrl") };
  const yallappAppId = typeof input.yallappAppId === "string" && input.yallappAppId ? input.yallappAppId.slice(0, 36) : null;
  const verified = yallappAppId ? await env.ownsYallappApp(member, yallappAppId) : false;
  const id = randomUUID();
  const mediaIds = await takeMedia(env, member, input.mediaIds, `showcase:${id}`, SOCIAL_LIMITS.mediaMax, 1);
  const item: ShowcaseRecord = { id, tenant: env.tenant, authorId: member, title, description, mediaIds, appType, ...links, yallappAppId: verified ? yallappAppId : null, verified, status: "pending", likeCount: 0, commentCount: 0, createdAt: env.now, updatedAt: env.now };
  await env.store.createShowcase(item);
  item.status = await moderated(env, member, "showcase", id, `${title}\n${description}`);
  await env.store.updateShowcase(id, { status: item.status });
  await env.onEvent?.({ kind: "showcase_created", memberId: member, refId: id });
  return (await showcaseViews(env, member, [item]))[0]!;
}

export async function getShowcase(env: SocialEnv, viewerId: string | null, id: string): Promise<ShowcaseView> {
  return (await showcaseViews(env, viewerId, [await visibleShowcase(env, viewerId, id)]))[0]!;
}

export async function editShowcase(env: SocialEnv, viewerId: string | null, id: string, input: { title?: unknown; description?: unknown; appType?: unknown; appStoreUrl?: unknown; playStoreUrl?: unknown; webUrl?: unknown }): Promise<ShowcaseView> {
  const member = signedIn(viewerId);
  const s = await visibleShowcase(env, member, id);
  if (s.authorId !== member) throw new QaError("not_allowed", "Only its author can change it.");
  const patch: Partial<ShowcaseRecord> = { updatedAt: env.now };
  if (input.title !== undefined) patch.title = text(input.title, SOCIAL_LIMITS.titleMax, "title", SOCIAL_LIMITS.titleMin);
  if (input.description !== undefined) patch.description = text(input.description, SOCIAL_LIMITS.descriptionMax, "description");
  if (typeof input.appType === "string" && APP_TYPE.test(input.appType)) patch.appType = input.appType;
  if (input.appStoreUrl !== undefined) patch.appStoreUrl = storeLink(input.appStoreUrl, "appStoreUrl");
  if (input.playStoreUrl !== undefined) patch.playStoreUrl = storeLink(input.playStoreUrl, "playStoreUrl");
  if (input.webUrl !== undefined) patch.webUrl = storeLink(input.webUrl, "webUrl");
  const words = `${patch.title ?? s.title}\n${patch.description ?? s.description}`;
  if (s.status === "published" && words !== `${s.title}\n${s.description}`) patch.status = await moderated(env, member, "showcase", id, words);
  await env.store.updateShowcase(id, patch);
  return getShowcase(env, member, id);
}

export async function deleteShowcase(env: SocialEnv, viewerId: string | null, id: string): Promise<void> {
  const member = signedIn(viewerId);
  const s = await env.store.getShowcase(id);
  if (!s || s.tenant !== env.tenant || s.status === "removed") throw new QaError("not_found", "There's no such app.");
  if (s.authorId !== member && !(await env.isTeam(member))) throw new QaError("not_allowed", "Only its author can delete it.");
  await env.store.updateShowcase(id, { status: "removed", updatedAt: env.now });
}

/** The gallery: by kind of app, newest or most liked. */
export async function listShowcase(env: SocialEnv, viewerId: string | null, input: { appType?: string; authorId?: string; sort?: "newest" | "liked"; cursor?: string | null; limit?: number }): Promise<{ items: ShowcaseView[]; nextCursor: string | null }> {
  const hidden = viewerId ? await env.hooks.hiddenFor(viewerId) : [];
  const p = page(input.cursor, input.limit);
  const rows = await env.store.listShowcase(
    { tenant: env.tenant, statuses: SHOWN, orAuthorId: viewerId, authorId: input.authorId, appType: input.appType, excludeAuthorIds: hidden },
    input.sort === "liked" ? "liked" : "newest",
    { offset: p.offset, limit: p.limit + 1 },
  );
  return { items: await showcaseViews(env, viewerId, rows.slice(0, p.limit)), nextCursor: nextCursor(rows.length, p) };
}

// ——— For moderation and reports (area C, area A) ———

export type SocialContentKind = "post" | "post_comment" | "showcase" | "story";

/** Approved, held or removed by a moderator; a comment's count follows. */
export async function setStatus(env: SocialEnv, kind: SocialContentKind, id: string, status: SocialStatus | "hidden"): Promise<boolean> {
  const next: SocialStatus = status === "hidden" ? "removed" : status;
  if (kind === "post") {
    const p = await env.store.getPost(id);
    if (!p) return false;
    await env.store.updatePost(id, { status: next, updatedAt: env.now });
    return true;
  }
  if (kind === "story") {
    if (!(await env.store.getStory(id))) return false;
    await env.store.updateStory(id, { status: next });
    return true;
  }
  if (kind === "showcase") {
    if (!(await env.store.getShowcase(id))) return false;
    await env.store.updateShowcase(id, { status: next, updatedAt: env.now });
    return true;
  }
  const c = await env.store.getComment(id);
  if (!c) return false;
  if (c.status === next) return true;
  if (next === "published") {
    const target = await commentTarget(env, null, c.targetType, c.targetId).catch(() => null);
    if (target) return publishComment(env, c, target).then(() => true);
  }
  await env.store.updateComment(id, { status: next });
  if (c.status === "published") await env.store.addCounts(c.targetType, c.targetId, { comments: -1 });
  return true;
}

/** Who wrote it and where it is, for reports and the moderation queue. */
export async function contentInfo(env: SocialEnv, kind: SocialContentKind, id: string): Promise<{ memberId: string; title: string; link: string; status: SocialStatus; text: string } | null> {
  if (kind === "post") {
    const p = await env.store.getPost(id);
    return p && p.tenant === env.tenant ? { memberId: p.authorId, title: p.body.slice(0, 80), link: `/posts/${p.id}`, status: p.status, text: p.body } : null;
  }
  if (kind === "story") {
    const s = await env.store.getStory(id);
    return s && s.tenant === env.tenant ? { memberId: s.authorId, title: "Story", link: `/stories/${s.id}`, status: s.status, text: "" } : null;
  }
  if (kind === "showcase") {
    const s = await env.store.getShowcase(id);
    return s && s.tenant === env.tenant ? { memberId: s.authorId, title: s.title, link: `/showcase/${s.id}`, status: s.status, text: `${s.title}\n${s.description}` } : null;
  }
  const c = await env.store.getComment(id);
  return c && c.tenant === env.tenant ? { memberId: c.authorId, title: c.body.slice(0, 80), link: `${c.targetType === "post" ? "/posts" : "/showcase"}/${c.targetId}#c${c.id}`, status: c.status, text: c.body } : null;
}
