import { beforeEach, expect, it } from "vitest";
import * as social from "@/lib/community/social/service";
import type { SocialEnv } from "@/lib/community/social/service";
import type { SocialStore } from "@/lib/community/social/store";

/**
 * 232 Posts, comments, likes, stories and the showcase on one store (memory
 * or MySQL): the members are fixed (karim, nour, omar, team-1), moderation
 * holds whoever is in `held`, and the notices are kept.
 */
export const NOW = new Date("2026-12-01T09:00:00.000Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
export const MEMBERS = ["karim", "nour", "omar", "team-1"];

const JPEG = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3]);
const MP4 = () => new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0, 0]);

export function communitySocialSuite(setup: () => Promise<SocialStore>) {
  let env: SocialEnv;
  let held: Set<string>;
  let blocks: Map<string, string[]>;
  let follows: Map<string, string[]>;
  let notices: { to: string; kind: string; link: string; count?: number }[];
  let uploads: string[];

  beforeEach(async () => {
    held = new Set();
    blocks = new Map();
    follows = new Map();
    notices = [];
    uploads = [];
    const store = await setup();
    env = {
      store,
      tenant: "yallapp",
      now: NOW,
      hooks: {
        async members(ids) {
          return Object.fromEntries(ids.filter((id) => MEMBERS.includes(id)).map((id) => [id, { id, username: id, displayName: id, avatarUrl: null, topBadge: null, team: id.startsWith("team"), deleted: false }]));
        },
        async hiddenFor(viewer) {
          return [...(blocks.get(viewer) ?? []), ...[...blocks.entries()].filter(([, list]) => list.includes(viewer)).map(([who]) => who)];
        },
        async followingIds(viewer) {
          return follows.get(viewer) ?? [];
        },
        async moderate({ memberId }) {
          return held.has(memberId) ? "pending" : "published";
        },
        async notify({ memberId, kind, link, data }) {
          notices.push({ to: memberId, kind, link, ...(data.count !== undefined ? { count: data.count } : {}) });
        },
      },
      isTeam: async (id) => id.startsWith("team"),
      upload: async (key) => {
        uploads.push(key);
        return `https://files.test/${key}`;
      },
      preview: async (url) => ({ url, title: "Yallapp", description: "Apps without code", imageUrl: "https://yallapp.test/og.png", siteName: "yallapp.test" }),
      ownsYallappApp: async (member, appId) => member === "karim" && appId === "app-karim",
    };
  });

  const photo = (who: string) => social.uploadMedia(env, who, { bytes: JPEG() });

  it("checks uploads by their bytes, keeps a video's still, and uses each file once, by its owner", async () => {
    const image = await photo("karim");
    expect(image).toMatchObject({ kind: "image", posterUrl: null });
    expect(image.url).toMatch(/^https:\/\/files\.test\/community\/media\/yallapp\/.+\.jpg$/);
    const video = await social.uploadMedia(env, "karim", { bytes: MP4() }, { bytes: JPEG() });
    expect(video).toMatchObject({ kind: "video", posterUrl: expect.stringMatching(/-poster\.jpg$/) });
    await expect(social.uploadMedia(env, "karim", { bytes: new TextEncoder().encode("<svg>not a picture</svg>") })).rejects.toMatchObject({ code: "invalid_request", field: "file" });
    await expect(social.uploadMedia(env, null, { bytes: JPEG() })).rejects.toMatchObject({ code: "invalid_token" });

    const post = await social.createPost(env, "karim", { body: "My new shop is live", mediaIds: [image.id, video.id] });
    expect(post.media.map((m) => m.id)).toEqual([image.id, video.id]);
    // Used already, or someone else's: refused.
    await expect(social.createPost(env, "karim", { body: "Again", mediaIds: [image.id] })).rejects.toMatchObject({ field: "media_ids" });
    const nours = await photo("nour");
    await expect(social.createPost(env, "karim", { body: "Hers", mediaIds: [nours.id] })).rejects.toMatchObject({ field: "media_ids" });
    const many = await Promise.all(Array.from({ length: 11 }, () => photo("omar")));
    await expect(social.createPost(env, "omar", { body: "", mediaIds: many.map((m) => m.id) })).rejects.toMatchObject({ field: "media_ids" });
  });

  it("posts with a link's preview, held for a new member until approved, and edited into review again", async () => {
    const post = await social.createPost(env, "karim", { body: "Read this https://yallapp.test/blog/launch." });
    expect(post).toMatchObject({ status: "published", canEdit: true, link: { url: "https://yallapp.test/blog/launch", title: "Yallapp" }, sharePath: `/posts/${post.id}` });
    await expect(social.createPost(env, "karim", { body: "   " })).rejects.toMatchObject({ field: "body" });

    held.add("omar");
    const pending = await social.createPost(env, "omar", { body: "Hello everyone" });
    expect(pending.status).toBe("pending");
    expect((await social.getPost(env, "omar", pending.id)).status).toBe("pending");
    await expect(social.getPost(env, "nour", pending.id)).rejects.toMatchObject({ code: "not_found" });
    expect(await social.setStatus(env, "post", pending.id, "published")).toBe(true);
    expect((await social.getPost(env, "nour", pending.id)).status).toBe("published");

    held.add("karim");
    expect((await social.editPost(env, "karim", post.id, { body: "Edited into spam" })).status).toBe("pending");
    await expect(social.editPost(env, "nour", pending.id, { body: "Not mine" })).rejects.toMatchObject({ code: "not_allowed" });
    await social.deletePost(env, "omar", pending.id);
    await expect(social.getPost(env, "omar", pending.id)).rejects.toMatchObject({ code: "not_found" });
    expect(await social.contentInfo(env, "post", post.id)).toMatchObject({ memberId: "karim", link: `/posts/${post.id}` });
  });

  it("counts a like once however often it's sent, never one's own, and tells the author at the milestones", async () => {
    const post = await social.createPost(env, "karim", { body: "Like me" });
    await expect(social.like(env, "karim", "post", post.id, true)).rejects.toMatchObject({ code: "not_allowed" });
    const results = await Promise.all(Array.from({ length: 5 }, () => social.like(env, "nour", "post", post.id, true)));
    expect(results.every((r) => r.liked)).toBe(true);
    expect((await social.getPost(env, "nour", post.id)).likeCount).toBe(1);
    expect(notices).toEqual([{ to: "karim", kind: "post_liked", link: `/posts/${post.id}`, count: 1 }]);
    await social.like(env, "nour", "post", post.id, false);
    await social.like(env, "nour", "post", post.id, false);
    expect((await social.getPost(env, "nour", post.id))).toMatchObject({ likeCount: 0, liked: false });
  });

  it("comments and replies one level deep, telling the post's author and the comment's", async () => {
    const post = await social.createPost(env, "karim", { body: "Questions welcome" });
    const c = await social.comment(env, "nour", "post", post.id, { body: "How long did it take?" });
    env.now = later(1);
    const r = await social.comment(env, "karim", "post", post.id, { body: "Two days!", parentId: c.id });
    env.now = later(2);
    // A reply to a reply answers its comment.
    const rr = await social.comment(env, "omar", "post", post.id, { body: "Same here", parentId: r.id });
    expect(rr.parentId).toBe(c.id);
    expect(notices.map((n) => [n.to, n.kind])).toEqual([
      ["karim", "post_comment"],
      ["nour", "comment_reply"],
      ["nour", "comment_reply"],
      ["karim", "post_comment"],
    ]);
    const top = await social.listComments(env, null, "post", post.id, {});
    expect(top.items.map((x) => [x.id, x.replyCount])).toEqual([[c.id, 2]]);
    expect((await social.listComments(env, null, "post", post.id, { parentId: c.id })).items.map((x) => x.id)).toEqual([r.id, rr.id]);
    expect((await social.getPost(env, null, post.id)).commentCount).toBe(3);
    await expect(social.comment(env, "nour", "post", post.id, { body: "" })).rejects.toMatchObject({ field: "body" });
    await expect(social.deleteComment(env, "nour", r.id)).rejects.toMatchObject({ code: "not_allowed" });
    await social.deleteComment(env, "karim", r.id);
    expect((await social.getPost(env, null, post.id)).commentCount).toBe(2);
    await social.like(env, "karim", "comment", c.id, true);
    expect((await social.listComments(env, "karim", "post", post.id, {})).items[0]).toMatchObject({ likeCount: 1, liked: true });
  });

  it("keeps blocked members apart: their posts, comments and likes", async () => {
    const post = await social.createPost(env, "karim", { body: "Hi" });
    blocks.set("karim", ["omar"]);
    await expect(social.getPost(env, "omar", post.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(social.like(env, "omar", "post", post.id, true)).rejects.toMatchObject({ code: "not_found" });
    expect((await social.listPosts(env, "omar", { authorId: "karim" })).items).toEqual([]);
    expect((await social.listPosts(env, "nour", { authorId: "karim" })).items.map((p) => p.id)).toEqual([post.id]);
  });

  it("mixes posts and questions on the feed, newest first, with Following for the members followed", async () => {
    const a = await social.createPost(env, "karim", { body: "First" });
    env.now = later(10);
    const b = await social.createPost(env, "nour", { body: "Second" });
    env.questions = async () => [{ id: "q1", createdAt: later(5).toISOString() } as never];
    env.now = later(20);
    const latest = await social.feed(env, "omar", { tab: "latest" });
    expect(latest.items.map((i) => (i.type === "post" ? i.post.id : i.question.id))).toEqual([b.id, "q1", a.id]);
    const firstPage = await social.feed(env, "omar", { tab: "latest", limit: 2 });
    expect(firstPage.nextCursor).toBe("2");
    expect((await social.feed(env, "omar", { tab: "latest", limit: 2, cursor: "2" })).items).toHaveLength(1);
    follows.set("omar", ["nour"]);
    env.questions = async () => [];
    expect((await social.feed(env, "omar", { tab: "following" })).items.map((i) => i.type === "post" && i.post.id)).toEqual([b.id]);
    await expect(social.feed(env, null, { tab: "following" })).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("keeps stories 24 hours as rings, the viewer's own first, unseen before seen, with who saw them for the author", async () => {
    follows.set("omar", ["karim", "nour"]);
    const k = await social.createStory(env, "karim", { mediaId: (await photo("karim")).id });
    const n = await social.createStory(env, "nour", { mediaId: (await photo("nour")).id });
    const own = await social.createStory(env, "omar", { mediaId: (await photo("omar")).id });
    await social.viewStory(env, "omar", k.id);
    await social.viewStory(env, "omar", k.id);
    const rings = await social.storyRings(env, "omar");
    expect(rings.map((r) => [r.author.id, r.seen])).toEqual([
      ["omar", true],
      ["nour", false],
      ["karim", true],
    ]);
    expect(rings[0]!.stories[0]).toMatchObject({ id: own.id, viewCount: 0 });
    expect(rings[2]!.stories[0]!.viewCount).toBeNull();
    expect((await social.storyViewers(env, "karim", k.id)).map((v) => v.member.id)).toEqual(["omar"]);
    await expect(social.storyViewers(env, "omar", k.id)).rejects.toMatchObject({ code: "not_allowed" });
    await expect(social.createStory(env, "karim", {})).rejects.toMatchObject({ field: "media_ids" });
    // A day later they're gone.
    env.now = later(24 * 60 + 1);
    expect(await social.storyRings(env, "omar")).toEqual([]);
    await expect(social.viewStory(env, "omar", n.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("shows apps in the showcase: Made with Yallapp only for the linked account's app, store links checked, the gallery by type and likes", async () => {
    const pics = [(await photo("karim")).id];
    const mine = await social.createShowcase(env, "karim", { title: "Karim's Bags", description: "Handmade bags", mediaIds: pics, appType: "shop", appStoreUrl: "https://apps.apple.com/app/id1", yallappAppId: "app-karim" });
    expect(mine).toMatchObject({ madeWithYallapp: true, appType: "shop", appStoreUrl: "https://apps.apple.com/app/id1" });
    const claimed = await social.createShowcase(env, "nour", { title: "Not really mine", mediaIds: [(await photo("nour")).id], appType: "food", yallappAppId: "app-karim" });
    expect(claimed.madeWithYallapp).toBe(false);
    await expect(social.createShowcase(env, "omar", { title: "Bad link", mediaIds: [(await photo("omar")).id], appStoreUrl: "https://evil.test/app" })).rejects.toMatchObject({ field: "app_store_url" });
    await expect(social.createShowcase(env, "omar", { title: "No pictures", mediaIds: [] })).rejects.toMatchObject({ field: "media_ids" });
    await social.like(env, "omar", "showcase", claimed.id, true);
    expect((await social.listShowcase(env, null, { sort: "liked" })).items.map((s) => s.id)).toEqual([claimed.id, mine.id]);
    expect((await social.listShowcase(env, null, { appType: "shop" })).items.map((s) => s.id)).toEqual([mine.id]);
    await social.comment(env, "omar", "showcase", mine.id, { body: "Beautiful" });
    expect(notices.at(-1)).toMatchObject({ to: "karim", kind: "showcase_comment" });
    await social.save(env, "omar", "showcase", mine.id, true);
    const post = await social.createPost(env, "nour", { body: "Saved post" });
    await social.save(env, "omar", "post", post.id, true);
    const kept = await social.saved(env, "omar");
    expect(kept.showcase.map((s) => s.id)).toEqual([mine.id]);
    expect(kept.posts.map((p) => p.id)).toEqual([post.id]);
  });

  it("keeps each community's posts its own", async () => {
    const post = await social.createPost(env, "karim", { body: "In Yallapp Community" });
    const other = { ...env, tenant: "app-123" };
    await expect(social.getPost(other, "nour", post.id)).rejects.toMatchObject({ code: "not_found" });
    expect((await social.feed(other, "nour", { tab: "latest" })).items).toEqual([]);
  });
}
