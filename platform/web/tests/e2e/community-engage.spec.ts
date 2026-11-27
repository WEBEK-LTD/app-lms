import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 232–235 Yallapp Community, area C's phases 2 to 5 on the running server
 * (docs/api/community.yaml): a phone's push token kept and forgotten, push
 * choices beside email, the member's points and the leaderboard, the
 * challenges and events lists and their admin tools closed to members. With
 * a Community admin (E2E_COMMUNITY_ADMIN_EMAIL, a member already linked to
 * a Yallapp platform admin; none by default: that part is skipped), a
 * challenge and an event made, entered, RSVPed and downloaded as .ics.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up limits per IP don't reach the other specs.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.233" } });

const suffix = Date.now().toString(36);
const api = `${E2E.baseURL}/api/community/v1`;
const password = "community-strong-password-3";
const ADMIN_EMAIL = process.env.E2E_COMMUNITY_ADMIN_EMAIL ?? "community-admin@yallapp.test";

type Member = { token: string; id: string };
let nour: Member;
const auth = (m: Member) => ({ authorization: `Bearer ${m.token}` });

async function join(request: APIRequestContext, name: string, email: string): Promise<Member> {
  const r = await request.post(`${api}/auth/email/sign-up`, { data: { email, password, display_name: name, device: { name: "e2e", platform: "android" } } });
  if (r.status() === 409) {
    const again = await request.post(`${api}/auth/email/log-in`, { data: { email, password, device: { name: "e2e", platform: "android" } } });
    expect(again.status()).toBe(200);
    const body = (await again.json()) as { access_token: string; member: { id: string } };
    return { token: body.access_token, id: body.member.id };
  }
  expect(r.status()).toBe(201);
  const body = (await r.json()) as { access_token: string; member: { id: string } };
  return { token: body.access_token, id: body.member.id };
}

test("232 a phone's push token is kept and forgotten; push choices sit beside email", async ({ request }) => {
  nour = await join(request, "Nour El Hoda", `nour-engage-${suffix}@community.test`);
  const token = `e2e-token-${suffix}-${"x".repeat(120)}`;
  expect((await request.put(`${api}/me/push-tokens`, { headers: auth(nour), data: { token, platform: "android" } })).status()).toBe(204);
  expect((await request.put(`${api}/me/push-tokens`, { headers: auth(nour), data: { token: "x", platform: "web" } })).status()).toBe(400);
  expect((await request.delete(`${api}/me/push-tokens`, { headers: auth(nour) })).status()).toBe(204);
  const settings = await request.put(`${api}/notifications/settings`, { headers: auth(nour), data: { push: { follow: false } } });
  expect(settings.status()).toBe(200);
  const body = (await settings.json()) as { email: Record<string, boolean>; push: Record<string, boolean> };
  expect(body.push).toMatchObject({ follow: false, message: true, event_soon: true });
  expect(Object.keys(body.push).sort()).toEqual(Object.keys(body.email).sort());
});

test("233 the member's points and the leaderboard (this week and all time)", async ({ request }) => {
  const mine = await request.get(`${api}/me/points`, { headers: auth(nour) });
  expect(mine.status()).toBe(200);
  expect(await mine.json()).toMatchObject({ points: 0, week_points: 0, level: { key: "newcomer" }, items: [] });
  for (const period of ["week", "all"]) {
    const board = await request.get(`${api}/leaderboard?period=${period}`, { headers: auth(nour) });
    expect(board.status()).toBe(200);
    expect(await board.json()).toMatchObject({ items: expect.any(Array), me: { points: 0 } });
  }
  expect((await request.get(`${api}/leaderboard?period=year`)).status()).toBe(400);
});

test("233–234 challenges and events are public to read; their admin tools are closed to members", async ({ request }) => {
  expect((await request.get(`${api}/challenges?status=open&limit=1`)).status()).toBe(200);
  expect((await request.get(`${api}/events?when=upcoming`)).status()).toBe(200);
  expect((await request.get(`${api}/events/not-an-event/ics`)).status()).toBe(404);
  for (const [method, path] of [["post", "/admin/challenges"], ["post", "/admin/events"], ["get", "/admin/points"]] as const) {
    const r = await request[method](`${api}${path}`, { headers: auth(nour), data: {} });
    expect(r.status(), path).toBe(403);
  }
});

test("233–234 a Community admin: a challenge entered, an event RSVPed and saved to a calendar", async ({ request }) => {
  const admin = await join(request, "Community Admin", ADMIN_EMAIL);
  const isAdmin = (await request.get(`${api}/admin/points`, { headers: auth(admin) })).status() === 200;
  test.skip(!isAdmin, `${ADMIN_EMAIL} isn't linked to a Yallapp platform admin on this server`);
  const now = Date.now();
  const challenge = await request.post(`${api}/admin/challenges`, { headers: auth(admin), data: { title: `Build a booking app ${suffix}`, rules: "Make a booking app with Yallapp Studio and share it.", starts_at: new Date(now - 60_000).toISOString(), ends_at: new Date(now + 86_400_000).toISOString(), reward_points: 50 } });
  expect(challenge.status()).toBe(201);
  const c = (await challenge.json()) as { id: string; status: string };
  expect(c.status).toBe("open");
  const event = await request.post(`${api}/admin/events`, { headers: auth(admin), data: { title: `Studio office hours ${suffix}`, kind: "online", starts_at: new Date(now + 2 * 86_400_000).toISOString(), join_url: "https://meet.example/yallapp" } });
  expect(event.status()).toBe(201);
  const e = (await event.json()) as { id: string };
  const going = await request.put(`${api}/events/${e.id}/rsvp`, { headers: auth(nour) });
  expect(((await going.json()) as { going: boolean; join_url: string }).join_url).toBe("https://meet.example/yallapp");
  const ics = await request.get(`${api}/events/${e.id}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  expect((await request.delete(`${api}/admin/events/${e.id}`, { headers: auth(admin) })).status()).toBe(204);
  expect((await request.patch(`${api}/admin/challenges/${c.id}`, { headers: auth(admin), data: { status: "cancelled" } })).status()).toBe(200);
});
