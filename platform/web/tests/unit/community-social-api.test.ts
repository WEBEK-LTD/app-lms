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
  it("uploads a photo, posts it, and shows it on the feed and the member's posts", async () => {
    const { c, karim, nour } = await setup();
    const photo = await upload(c, karim.token);
    expect(photo).toMatchObject({ kind: "image", poster_url: null });
    expect([...c.uploads.keys()]).toEqual([expect.stringMatching(/^community\/media\/yallapp\/[0-9a-f-]{36}\.jpg$/)]);
    const bad = new FormData();
    bad.set("file", new Blob(["<html>"], { type: "image/jpeg" }), "x.jpg");
    expect((await api<Json>(c, "POST", "/media", { token: karim.token, form: bad })).body.error.fields).toHaveProperty("file");

    const post = await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "My new shop is live", media_ids: [photo.id] } });
    expect(post.status, JSON.stringify(post.body)).toBe(201);
    expect(post.body).toMatchObject({ body: "My new shop is live", media: [{ id: photo.id }], like_count: 0, status: "published", share_path: `/posts/${post.body.id}`, author: { id: karim.id } });
    const feed = await api<Json>(c, "GET", "/feed?tab=latest", { token: nour.token });
    expect(feed.body.items[0]).toMatchObject({ type: "post", post: { id: post.body.id } });
    expect((await api<Json>(c, "GET", `/posts?author=${karim.id}`)).body.items.map((p: Json) => p.id)).toEqual([post.body.id]);
    expect((await api(c, "POST", "/posts", { body: { body: "x" } })).status).toBe(401);
  });

  it("likes once, comments and replies, saves", async () => {
    const { c, karim, nour } = await setup();
    const post = (await api<Json>(c, "POST", "/posts", { token: karim.token, body: { body: "Ask me anything" } })).body;
    expect((await api<Json>(c, "PUT", `/posts/${post.id}/like`, { token: karim.token })).status).toBe(400);
    for (let i = 0; i < 3; i++) expect((await api<Json>(c, "PUT", `/posts/${post.id}/like`, { token: nour.token })).body).toEqual({ liked: true, like_count: 1 });
    const comment = await api<Json>(c, "POST", `/posts/${post.id}/comments`, { token: nour.token, body: { body: "How long did it take?" } });
    expect(comment.status).toBe(201);
    const reply = await api<Json>(c, "POST", `/posts/${post.id}/comments`, { token: karim.token, body: { body: "Two days", parent_id: comment.body.id } });
    expect(reply.body.parent_id).toBe(comment.body.id);
    const list = await api<Json>(c, "GET", `/posts/${post.id}/comments`);
    expect(list.body).toMatchObject({ items: [{ id: comment.body.id, reply_count: 1 }], next_cursor: null });
    expect((await api<Json>(c, "GET", `/posts/${post.id}`, { token: nour.token })).body).toMatchObject({ like_count: 1, liked: true, comment_count: 2 });
    expect((await api(c, "PUT", `/posts/${post.id}/save`, { token: nour.token })).status).toBe(204);
    expect((await api<Json>(c, "GET", "/saved", { token: nour.token })).body.posts.map((p: Json) => p.id)).toEqual([post.id]);
    expect((await api(c, "DELETE", `/comments/${comment.body.id}`, { token: karim.token })).status).toBe(403);
    expect((await api(c, "DELETE", `/comments/${reply.body.id}`, { token: karim.token })).status).toBe(204);
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
    const photo = await upload(c, karim.token);
    const story = await api<Json>(c, "POST", "/stories", { token: karim.token, body: { media_id: photo.id } });
    expect(story.status, JSON.stringify(story.body)).toBe(201);
    const rings = await api<Json>(c, "GET", "/stories", { token: nour.token });
    expect(rings.body.items).toMatchObject([{ author: { id: karim.id }, seen: false, stories: [{ id: story.body.id, view_count: null }] }]);
    expect((await api(c, "PUT", `/stories/${story.body.id}/view`, { token: nour.token })).status).toBe(204);
    expect((await api<Json>(c, "GET", `/stories/${story.body.id}/viewers`, { token: karim.token })).body.items.map((v: Json) => v.member.id)).toEqual([nour.id]);
    expect((await api(c, "GET", `/stories/${story.body.id}/viewers`, { token: nour.token })).status).toBe(403);
  });

  it("shows an app in the showcase, with the gallery's filters", async () => {
    const { c, karim, nour } = await setup();
    const photo = await upload(c, karim.token);
    const item = await api<Json>(c, "POST", "/showcase", { token: karim.token, body: { title: "Karim's Bags", description: "Handmade", media_ids: [photo.id], app_type: "shop", play_store_url: "https://play.google.com/store/apps/details?id=x" } });
    expect(item.status, JSON.stringify(item.body)).toBe(201);
    expect(item.body).toMatchObject({ made_with_yallapp: false, app_type: "shop" });
    expect((await api<Json>(c, "POST", "/showcase", { token: karim.token, body: { title: "Bad", media_ids: [], play_store_url: "https://evil.test" } })).status).toBe(400);
    await api(c, "PUT", `/showcase/${item.body.id}/like`, { token: nour.token });
    expect((await api<Json>(c, "GET", "/showcase?type=shop&sort=liked")).body.items).toMatchObject([{ id: item.body.id, like_count: 1 }]);
    expect((await api<Json>(c, "GET", "/showcase?type=food")).body.items).toEqual([]);
    const comment = await api<Json>(c, "POST", `/showcase/${item.body.id}/comments`, { token: nour.token, body: { body: "Lovely" } });
    expect(comment.status).toBe(201);
  });
});
