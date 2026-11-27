import { describe, expect, it } from "vitest";
import { api, joinWithEmail, testCommunity, type TestCommunity } from "./community-support";

/** 232 Posts, comments, likes, the feed, stories and the showcase through the Community API (/api/community/v1). */

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3]);

async function setup() {
  const c = await testCommunity({ providers: false });
  const karim = await joinWithEmail(c, "Karim Seller");
  const nour = await joinWithEmail(c, "Nour Buyer");
  // Established members: a new member's first 2 posts wait for review (area C).
  for (const m of [karim, nour]) await c.deps.store.base.updateMember(m.id, { approvedPosts: 2 });
  return { c, karim, nour };
}

async function upload(c: TestCommunity, token: string, bytes = JPEG) {
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
  const r = await api<Json>(c, "POST", "/media", { token, form });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body;
}

describe("232 Community social API", () => {
  it("uploads photos (one by one or with the post), posts them, and shows them on the feed and the member's posts", async () => {
    const { c, karim, nour } = await setup();
    const photo = await upload(c, karim.token);
    expect(photo).toMatchObject({ kind: "photo", poster_url: null });
    expect([...c.uploads.keys()]).toEqual([expect.stringMatching(/^community\/media\/yallapp\/[0-9a-f-]{36}\.jpg$/)]);
    const bad = new FormData();
    bad.set("file", new Blob(["<html>"], { type: "image/jpeg" }), "x.jpg");
    expect((await api<Json>(c, "POST", "/media", { token: karim.token, form: bad })).body.error.fields).toHaveProperty("file");

    const post = await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "My new shop is live", media_ids: [photo.id] } });
    expect(post.status, JSON.stringify(post.body)).toBe(201);
    expect(post.body).toMatchObject({ body: "My new shop is live", media: [{ id: photo.id, kind: "photo" }], like_count: 0, status: "published", link_preview: null, group_id: null, edited_at: null, share_url: expect.stringMatching(new RegExp(`/posts/${post.body.id}$`)), author: { id: karim.id } });
    // The contract's way: one multipart call with the photos.
    const form = new FormData();
    form.set("body", "Two more photos");
    form.append("photos", new Blob([JPEG], { type: "image/jpeg" }), "a.jpg");
    form.append("photos", new Blob([JPEG], { type: "image/jpeg" }), "b.jpg");
    const multi = await api<Json>(c, "POST", "/posts", { token: karim.token, form });
    expect(multi.status, JSON.stringify(multi.body)).toBe(201);
    expect(multi.body.media.map((m: Json) => m.kind)).toEqual(["photo", "photo"]);
    const feed = await api<Json>(c, "GET", "/feed?tab=latest", { token: nour.token });
    expect(feed.body.items[0]).toMatchObject({ kind: "post", id: expect.any(String), created_at: expect.any(String), post: { author: { id: karim.id } } });
    expect(feed.body.items.map((i: Json) => i.id).sort()).toEqual([post.body.id, multi.body.id].sort());
    expect((await api<Json>(c, "GET", `/members/${karim.id}/posts`)).body.items.map((i: Json) => i.post.id).sort()).toEqual([multi.body.id, post.body.id].sort());
    expect((await api(c, "POST", "/posts", { body: { body: "x" } })).status).toBe(401);
  });

  it("likes once, comments with their replies, saves", async () => {
    const { c, karim, nour } = await setup();
    const post = (await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "Ask me anything" } })).body;
    expect((await api<Json>(c, "PUT", `/posts/${post.id}/like`, { token: karim.token })).status).toBe(400);
    for (let i = 0; i < 3; i++) expect((await api<Json>(c, "PUT", `/posts/${post.id}/like`, { token: nour.token })).body).toEqual({ count: 1, mine: true });
    const comment = await api<Json>(c, "POST", `/posts/${post.id}/comments`, { token: nour.token, body: { body: "How long did it take?" } });
    expect(comment.status).toBe(201);
    const reply = await api<Json>(c, "POST", `/posts/${post.id}/comments`, { token: karim.token, body: { body: "Two days", parent_id: comment.body.id } });
    expect(reply.body.parent_id).toBe(comment.body.id);
    const list = await api<Json>(c, "GET", `/posts/${post.id}/comments`);
    expect(list.body).toMatchObject({ items: [{ id: comment.body.id, replies: [{ id: reply.body.id, parent_id: comment.body.id, replies: [] }] }], next_cursor: null });
    expect((await api<Json>(c, "GET", `/posts/${post.id}`, { token: nour.token })).body).toMatchObject({ like_count: 1, liked: true, comment_count: 2 });
    expect((await api(c, "PUT", `/posts/${post.id}/save`, { token: nour.token })).status).toBe(204);
    expect((await api<Json>(c, "GET", "/me/saved", { token: nour.token })).body.items.map((i: Json) => i.post.id)).toEqual([post.id]);
    expect((await api(c, "DELETE", `/comments/${comment.body.id}`, { token: karim.token })).status).toBe(403);
    expect((await api(c, "DELETE", `/comments/${reply.body.id}`, { token: karim.token })).status).toBe(204);
  });

  it("posts in a group only as its member, and shows the group's feed by its privacy", async () => {
    const { c, karim, nour } = await setup();
    const group = await api<Json>(c, "POST", "/groups", { token: karim.token, body: { name: "Shop makers", description: "Selling with Yallapp.", visibility: "private" } });
    expect(group.status, JSON.stringify(group.body)).toBe(201);
    const gid = group.body.id;
    const post = await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "Welcome to the group", group_id: gid } });
    expect(post.status, JSON.stringify(post.body)).toBe(201);
    expect(post.body.group_id).toBe(gid);
    expect((await api<Json>(c, "POST", "/posts", { token: nour.token, body: { body: "Let me in", group_id: gid } })).status).toBe(403);
    expect((await api<Json>(c, "GET", `/groups/${gid}/feed`, { token: karim.token })).body.items.map((i: Json) => i.post.id)).toEqual([post.body.id]);
    expect((await api<Json>(c, "GET", `/groups/${gid}/feed`, { token: nour.token })).status).toBe(403);
    // Not on the home feed, and not readable by a stranger.
    expect((await api<Json>(c, "GET", "/feed?tab=latest", { token: nour.token })).body.items.map((i: Json) => i.id)).not.toContain(post.body.id);
    expect((await api(c, "GET", `/posts/${post.body.id}`, { token: nour.token })).status).toBe(404);
    expect((await api<Json>(c, "GET", `/groups/${gid}`, { token: karim.token })).body.post_count).toBe(1);
  });

  it("233 gives points through area C's ledger: a post, a like (taken back with it)", async () => {
    const { c, karim, nour } = await setup();
    const points = async () => (await c.deps.store.base.getMember(karim.id))!.points;
    const before = await points();
    const post = (await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "Points please" } })).body;
    expect(await points()).toBe(before + 2);
    await api(c, "PUT", `/posts/${post.id}/like`, { token: nour.token });
    await api(c, "PUT", `/posts/${post.id}/like`, { token: nour.token });
    expect(await points()).toBe(before + 3);
    await api(c, "DELETE", `/posts/${post.id}/like`, { token: nour.token });
    expect(await points()).toBe(before + 2);
  });

  it("holds a new member's first post for review", async () => {
    const { c } = await setup();
    const fresh = await joinWithEmail(c, "Omar New");
    const post = await api<Json>(c, "POST", "/posts", { token: fresh.token, body: { body: "Hello everyone" } });
    expect(post.body.status).toBe("pending");
    expect((await api(c, "GET", `/posts/${post.body.id}`)).status).toBe(404);
  });

  it("posts a story for the members who follow, with who saw it", async () => {
    const { c, karim, nour } = await setup();
    expect((await api(c, "PUT", `/members/${karim.id}/follow`, { token: nour.token })).status).toBeLessThan(300);
    const form = new FormData();
    form.set("photo", new Blob([JPEG], { type: "image/jpeg" }), "s.jpg");
    const story = await api<Json>(c, "POST", "/stories", { token: karim.token, form });
    expect(story.status, JSON.stringify(story.body)).toBe(201);
    expect(story.body).toMatchObject({ author: { id: karim.id }, media: { kind: "photo" }, view_count: 0 });
    const rings = await api<Json>(c, "GET", "/stories", { token: nour.token });
    expect(rings.body.items).toMatchObject([{ member: { id: karim.id }, all_seen: false, stories: [{ id: story.body.id, view_count: 0 }] }]);
    expect((await api(c, "POST", `/stories/${story.body.id}/view`, { token: nour.token })).status).toBe(204);
    expect((await api<Json>(c, "GET", `/stories/${story.body.id}/viewers`, { token: karim.token })).body.items.map((m: Json) => m.id)).toEqual([nour.id]);
    expect((await api(c, "GET", `/stories/${story.body.id}/viewers`, { token: nour.token })).status).toBe(403);
  });

  it("shows an app in the showcase, with the gallery's filters", async () => {
    const { c, karim, nour } = await setup();
    const form = new FormData();
    for (const [k, v] of Object.entries({ title: "Karim's Bags", description: "Handmade", app_type: "shop", play_store_url: "https://play.google.com/store/apps/details?id=x", website_url: "https://bags.example.com" })) form.set(k, v);
    form.append("pictures", new Blob([JPEG], { type: "image/jpeg" }), "p.jpg");
    const item = await api<Json>(c, "POST", "/showcase", { token: karim.token, form });
    expect(item.status, JSON.stringify(item.body)).toBe(201);
    expect(item.body).toMatchObject({ made_with_yallapp: false, app_type: "shop", website_url: "https://bags.example.com/", pictures: [expect.any(String)], comment_count: 0, liked: false });
    expect((await api<Json>(c, "GET", `/showcase/${item.body.id}`)).body.id).toBe(item.body.id);
    expect((await api<Json>(c, "POST", "/showcase", { token: karim.token, body: { title: "Bad", media_ids: [], play_store_url: "https://evil.test" } })).status).toBe(400);
    expect(item.body.status, "a member with approved posts shows at once").toBe("published");
    const liked = await api<Json>(c, "PUT", `/showcase/${item.body.id}/like`, { token: nour.token });
    expect(liked.body, JSON.stringify(liked.body)).toEqual({ count: 1, mine: true });
    const gallery = await api<Json>(c, "GET", `/showcase?type=shop&sort=most_liked&member=${karim.id}`);
    expect(gallery.body.items, JSON.stringify(gallery.body)).toMatchObject([{ id: item.body.id, like_count: 1, cover_url: expect.any(String), made_with_yallapp: false }]);
    expect((await api<Json>(c, "GET", "/showcase?type=food")).body.items).toEqual([]);
    const comment = await api<Json>(c, "POST", `/showcase/${item.body.id}/comments`, { token: nour.token, body: { body: "Lovely" } });
    expect(comment.status).toBe(201);
  });
});
