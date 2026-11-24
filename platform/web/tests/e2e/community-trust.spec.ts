import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 Yallapp Community's trust (area C) on the running server
 * (docs/api/community.yaml): a follow reaches the notifications list and is
 * marked read, email choices change; a new member's first question waits
 * for review; the Gold form is refused without 5 apps on a linked Yallapp
 * account; a member is reported once; the admins' tools are closed to
 * members. With a Community admin (a member whose linked Yallapp account is
 * a platform admin; E2E_COMMUNITY_ADMIN_EMAIL/PASSWORD name one already
 * linked), the admins' tools too: the moderation queue approves the
 * question, a badge granted shows next to the member's name and goes when
 * revoked, every step in the audit log, and the settings' "Who can create
 * groups" reaches /config.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.232" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const api = `${E2E.baseURL}/api/community/v1`;
const password = "community-strong-password-2";
/** A Community admin on the e2e server: a member already linked to a Yallapp platform admin (none by default: that part is skipped). */
const ADMIN_EMAIL = process.env.E2E_COMMUNITY_ADMIN_EMAIL ?? "community-admin@yallapp.test";

type Member = { token: string; id: string; username: string; role: string };
let reem: Member;
let sami: Member;
let admin: Member | null = null;
let questionId = "";
const auth = (m: Member) => ({ authorization: `Bearer ${m.token}` });

async function join(request: APIRequestContext, name: string, email: string): Promise<Member> {
  const r = await request.post(`${api}/auth/email/sign-up`, { data: { email, password, display_name: name, device: { name: "e2e", platform: "web" } } });
  if (r.status() === 409) {
    const again = await request.post(`${api}/auth/email/log-in`, { data: { email, password, device: { name: "e2e", platform: "web" } } });
    expect(again.status()).toBe(200);
    const body = (await again.json()) as { access_token: string; member: { id: string; username: string; role: string } };
    return { token: body.access_token, id: body.member.id, username: body.member.username, role: body.member.role };
  }
  expect(r.status()).toBe(201);
  const body = (await r.json()) as { access_token: string; member: { id: string; username: string; role: string } };
  return { token: body.access_token, id: body.member.id, username: body.member.username, role: body.member.role };
}

test("231 a follow reaches the notifications list in the member's words, is marked read, and email choices change", async ({ request }) => {
  reem = await join(request, "Reem Saleh", `reem-${suffix}@community.test`);
  sami = await join(request, "Sami Aydın", `sami-${suffix}@community.test`);
  expect((await request.put(`${api}/members/${reem.id}/follow`, { headers: auth(sami) })).status()).toBe(200);

  const list = await request.get(`${api}/notifications`, { headers: { ...auth(reem), "accept-language": "tr" } });
  expect(list.status()).toBe(200);
  const body = (await list.json()) as { items: { kind: string; text: string; link: string; actor: { id: string }; read: boolean }[]; unread_count: number };
  expect(body.unread_count).toBe(1);
  // The member's own language (English, chosen at sign-up) wins over the request's.
  expect(body.items[0]).toMatchObject({ kind: "follow", text: "Sami Aydın started following you.", link: `/u/${sami.username}`, actor: { id: sami.id }, read: false });
  expect((await request.post(`${api}/notifications/read`, { headers: auth(reem), data: {} })).status()).toBe(204);
  expect(((await (await request.get(`${api}/notifications`, { headers: auth(reem) })).json()) as { unread_count: number }).unread_count).toBe(0);

  const prefs = await request.put(`${api}/notifications/settings`, { headers: auth(reem), data: { email: { follow: true, answer: false } } });
  expect(await prefs.json()).toMatchObject({ email: { follow: true, answer: false, verification_rejected: true } });
});

test("231 a new member's first question waits for review", async ({ request }) => {
  const asked = await request.post(`${api}/qa/questions`, {
    headers: auth(reem),
    data: { title: "How do I add a splash screen to my app?", body: "I built my app with Yallapp Studio and want my own splash screen. Where is it set?", section: "studio", tags: ["Studio"] },
  });
  expect(asked.status()).toBe(201);
  const q = (await asked.json()) as { id: string; status: string };
  expect(q.status).toBe("pending");
  questionId = q.id;
});

test("231 the Gold form: Apply is closed without 5 apps on a linked Yallapp account", async ({ request }) => {
  const state = await request.get(`${api}/badges/verification`, { headers: auth(reem) });
  expect(await state.json()).toMatchObject({ has_gold: false, yallapp_linked: false, app_count: 0, required_apps: 5, can_apply: false, request: null });
  const sent = await request.post(`${api}/badges/verification`, {
    headers: auth(reem),
    multipart: { full_name: "Reem Saleh", id_proof: { name: "id.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(2048, 1) } },
  });
  expect(sent.status()).toBe(403);
  expect(((await sent.json()) as { error: { code: string } }).error.code).toBe("not_eligible");
});

test("231 a member is reported once; the admins' tools are closed to members", async ({ request }) => {
  const made = await request.post(`${api}/reports`, { headers: auth(sami), data: { target_type: "member", target_id: reem.id, reason: "impersonation", note: "Uses the Yallapp logo as her picture" } });
  expect(made.status()).toBe(201);
  const again = await request.post(`${api}/reports`, { headers: auth(sami), data: { target_type: "member", target_id: reem.id, reason: "spam" } });
  expect(again.status()).toBe(409);
  for (const path of ["/admin/settings", "/admin/moderation", "/admin/reports", "/admin/audit-log", "/admin/verification-requests"]) {
    const r = await request.get(`${api}${path}`, { headers: auth(sami) });
    expect(r.status(), path).toBe(403);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe("not_admin");
  }
});

test("231 a Community admin: moderation, a badge granted and revoked, the audit log and the settings", async ({ request }) => {
  admin = await join(request, "Community Admin", ADMIN_EMAIL);
  const isAdmin = (await request.get(`${api}/admin/settings`, { headers: auth(admin) })).status() === 200;
  test.skip(!isAdmin, `${ADMIN_EMAIL} isn't linked to a Yallapp platform admin on this server`);
  const a = admin;

  // The moderation queue: Reem's first question, approved, appears and she is told.
  const queue = (await (await request.get(`${api}/admin/moderation`, { headers: auth(a) })).json()) as { items: { id: string; target_id: string; cause: string }[] };
  const item = queue.items.find((i) => i.target_id === questionId)!;
  expect(item.cause).toBe("first_posts");
  expect((await request.post(`${api}/admin/moderation/${item.id}`, { headers: auth(a), data: { decision: "approve" } })).status()).toBe(200);
  expect(((await (await request.get(`${api}/qa/questions/${questionId}`)).json()) as { status: string }).status).toBe("published");
  expect(((await (await request.get(`${api}/notifications`, { headers: auth(reem) })).json()) as { items: { kind: string }[] }).items[0]!.kind).toBe("post_approved");

  // A badge granted by hand shows next to her name, then goes; both in the audit log with who and why.
  const granted = await request.post(`${api}/admin/members/@${reem.username}/badges`, { headers: auth(a), data: { badge: "blue", reason: "Helps new members every day" } });
  expect(granted.status()).toBe(201);
  expect(((await (await request.get(`${api}/members/${reem.id}`)).json()) as { top_badge: string }).top_badge).toBe("blue");
  expect((await request.delete(`${api}/admin/members/${reem.id}/badges/blue`, { headers: auth(a), data: { reason: "Granted by mistake" } })).status()).toBe(204);
  expect(((await (await request.get(`${api}/members/${reem.id}`)).json()) as { top_badge: string | null }).top_badge).toBeNull();
  const log = (await (await request.get(`${api}/admin/audit-log?member=${reem.id}`, { headers: auth(a) })).json()) as { items: { action: string; actor: { id: string }; reason: string }[] };
  expect(log.items.slice(0, 3).map((e) => [e.action, e.actor?.id, e.reason])).toEqual([
    ["badge.revoke", a.id, "Granted by mistake"],
    ["badge.grant", a.id, "Helps new members every day"],
    ["moderation.approve", a.id, null],
  ]);

  // The report on Reem, closed.
  const reports = (await (await request.get(`${api}/admin/reports`, { headers: auth(a) })).json()) as { items: { id: string; target_id: string }[] };
  const report = reports.items.find((r) => r.target_id === reem.id)!;
  expect(((await (await request.post(`${api}/admin/reports/${report.id}`, { headers: auth(a), data: { status: "dismissed" } })).json()) as { status: string }).status).toBe("dismissed");

  // "Who can create groups" reaches /config, then back to everyone.
  expect((await request.put(`${api}/admin/settings`, { headers: auth(a), data: { groups_create_policy: "badge_holders" } })).status()).toBe(200);
  expect(((await (await request.get(`${api}/config`)).json()) as { groups_create_policy: string }).groups_create_policy).toBe("badge_holders");
  expect((await request.put(`${api}/admin/settings`, { headers: auth(a), data: { groups_create_policy: "everyone" } })).status()).toBe(200);
});
