import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 77 Dashboard › Chat: an academy on Pro. A student writes from the app; the
 * owner answers, with a picture from Media; the course's group, a report the
 * owner deals with, stopping a student, and the chat's switches.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Lale Academy", email: `lale-${suffix}@chat.test`, password: "lale-strong-password-1" };
const codes = new Map<string, string>();
let server: Server;
let own: Page;
let api = "";
let courseId = 0;
const students: { name: string; phone: string; auth: Record<string, string> }[] = [
  { name: "Deniz Aksoy", phone: "532 111 22 33", auth: {} },
  { name: "Ece Yıldız", phone: "532 444 55 66", auth: {} },
];
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.77" };

test.beforeAll(async ({ browser }) => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const expected = `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`;
      if (request.headers["x-yallapp-signature"] !== expected) {
        response.writeHead(401).end();
        return;
      }
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.otpWebhookPort, resolve));

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 77");
  await own.getByLabel("Your website (optional)").fill(`https://lale-${suffix}.chat.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.chatAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("pro");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
  await new Promise((resolve) => server.close(resolve));
});

async function signUp(request: APIRequestContext, student: (typeof students)[number], index: number) {
  const device = { id: `install-${suffix}-${index}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const phone = `+90${student.phone.replace(/\s/g, "")}`;
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone: student.phone }, headers: extraHTTPHeaders });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get(phone)).toBeTruthy();
  const verified = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get(phone), device }, headers: extraHTTPHeaders });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token, name: student.name, device }, headers: extraHTTPHeaders });
  expect(registered.status()).toBe(201);
  student.auth = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
}

type Conversation = { id: string; kind: string; title: string; can_send: boolean };
const conversations = async (request: APIRequestContext, i: number) =>
  ((await (await request.get(`${api}/chat/conversations`, { headers: students[i]!.auth })).json()) as { items: Conversation[] }).items;
const write = (request: APIRequestContext, i: number, conversation: string, text: string) =>
  request.post(`${api}/chat/conversations/${conversation}/messages`, { headers: students[i]!.auth, data: { client_id: `e2e-${suffix}-${Math.random().toString(36).slice(2, 10)}`, text } });

test("an academy without a website, with a free course, and Chat in its menu", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  await own.getByRole("link", { name: "Courses", exact: true }).click();
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish for Beginners");
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish for Beginners" })).toBeVisible();
  courseId = Number(own.url().split("/").pop());

  await own.getByRole("navigation").getByRole("link", { name: "Chat", exact: true }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Chat" })).toBeVisible();
  await expect(own.getByText("No conversations yet")).toBeVisible();
});

test("a student writes from the app, and the owner answers as the academy with a picture from Media", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.chat).toEqual({ base_url: api, session: "access_token", groups: false });
  // The business shows as the app's name (the app's own, as in Config.site).
  const business = config.site.name as string;
  await signUp(request, students[0]!, 0);
  const [direct] = await conversations(request, 0);
  expect(direct).toMatchObject({ kind: "direct", title: business, can_send: true });
  expect((await write(request, 0, direct!.id, "Is there a class on Monday?")).status()).toBe(201);

  // A picture in the Media library to send.
  await own.goto("/dashboard/media");
  await own.getByLabel("Choose files").setInputFiles([{ name: "Timetable.png", mimeType: "image/png", buffer: solidPng(40, 30, [200, 80, 40]) }]);
  await expect(own.locator('[data-media="Timetable.png"]')).toBeVisible();

  await own.goto("/dashboard/chat");
  await expect(own.getByRole("heading", { name: "1 unread message" })).toBeVisible();
  const row = own.getByRole("link", { name: /^Deniz Aksoy/ });
  await expect(row).toContainText("Is there a class on Monday?");
  await expect(row).toContainText("1 new");
  await row.click();
  await expect(own.getByRole("heading", { level: 1, name: "Deniz Aksoy" })).toBeVisible();
  await expect(own.getByText("Is there a class on Monday?")).toBeVisible();

  await own.getByRole("button", { name: "Send", exact: true }).click();
  await expect(own.getByText("Write a message or attach a file.")).toBeVisible();
  await own.getByLabel("Your answer").fill("Yes, at 10:00. Here is the timetable.");
  await own.getByRole("button", { name: "Attach from Media" }).click();
  await own.getByRole("dialog").getByRole("button", { name: /Timetable\.png/ }).click();
  await expect(own.getByText("Attached: Timetable.png")).toBeVisible();
  await own.getByRole("button", { name: "Send", exact: true }).click();
  await expect(own.getByRole("status").filter({ hasText: "Sent." })).toBeVisible();
  await expect(own.getByLabel("Your answer")).toHaveValue("");
  await expect(own.getByRole("img", { name: "Timetable.png" })).toBeVisible();
  // The team sees who wrote it; the app sees the academy.
  await expect(own.getByText(`${business} · ${client.name}`, { exact: false })).toBeVisible();

  const messages = await (await request.get(`${api}/chat/conversations/${direct!.id}/messages`, { headers: students[0]!.auth })).json();
  expect(messages.items[0]).toMatchObject({ text: "Yes, at 10:00. Here is the timetable.", sender: { kind: "business", name: business }, attachment: { kind: "image", name: "Timetable.png" } });
  expect(JSON.stringify(messages)).not.toContain(client.email);

  await own.goto("/dashboard/chat");
  await expect(own.getByRole("heading", { name: "You're all caught up." })).toBeVisible();
  await expect(own.getByRole("link", { name: /^Deniz Aksoy/ })).toContainText("You: Yes, at 10:00.");
});

test("course groups: the owner turns them on, a report is dealt with and its sender stopped", async ({ request }) => {
  const settings = own.getByRole("region", { name: "Chat settings" });
  await settings.getByLabel("Course groups").check();
  await settings.getByRole("button", { name: "Save" }).click();
  await expect(settings.getByText("Saved. The app follows it the next time it opens.")).toBeVisible();

  await signUp(request, students[1]!, 1);
  for (const i of [0, 1]) expect((await request.post(`${api}/courses/${courseId}/enroll`, { headers: students[i]!.auth })).ok()).toBe(true);
  // Each app lists its conversations when it opens: that puts the student in the course's group.
  const group = (await conversations(request, 0)).find((c) => c.kind === "group")!;
  expect(group.title).toBe("Turkish for Beginners");
  expect((await conversations(request, 1)).find((c) => c.kind === "group")?.id).toBe(group.id);
  const spam = await (await write(request, 0, group.id, "Buy cheap watches!")).json();
  expect((await request.post(`${api}/chat/messages/${spam.id}/report`, { headers: students[1]!.auth, data: { reason: "spam" } })).status()).toBe(204);

  await own.goto("/dashboard/chat");
  await own.getByRole("link", { name: "Reports (1)" }).click();
  const reports = own.getByRole("region", { name: "Reported messages" });
  await expect(reports).toContainText("Reported by Ece Yıldız in Turkish for Beginners · Spam");
  await expect(reports).toContainText("Deniz Aksoy: Buy cheap watches!");
  await reports.getByRole("button", { name: "Delete and stop the sender" }).click();
  await expect(own.getByText("No reports to look at.")).toBeVisible();
  await expect(own.getByRole("region", { name: "Dealt with" })).toContainText("Deleted, sender stopped");

  const refused = await write(request, 0, group.id, "Hello?");
  expect(refused.status()).toBe(403);
  expect(await refused.json()).toMatchObject({ code: "chat_blocked" });

  // The owner lets Deniz write again from the conversation.
  await own.getByRole("link", { name: "All", exact: true }).click();
  await own.getByRole("link", { name: /^Deniz Aksoy/ }).click();
  await expect(own.getByText("Deniz Aksoy can read but not send messages.")).toBeVisible();
  await own.getByRole("button", { name: "Let them send again" }).click();
  await expect(own.getByRole("button", { name: "Stop them sending" })).toBeVisible();
  expect((await write(request, 0, group.id, "Sorry.")).status()).toBe(201);
});

test("deleting a message and a whole conversation, keeping one another year", async ({ request }) => {
  await own.goto("/dashboard/chat?view=group");
  await own.getByRole("link", { name: /Turkish for Beginners/ }).click();
  await expect(own.getByText("Sorry.")).toBeVisible();
  await expect(own.getByText("Message deleted")).toBeVisible();
  await expect(own.getByText(/Messages are kept a year\. The oldest here are deleted on/)).toBeVisible();
  await own.getByRole("button", { name: "Keep another year" }).click();
  await expect(own.getByText(/Kept until .*, the oldest messages too\./)).toBeVisible();

  own.once("dialog", (dialog) => void dialog.accept());
  await own.getByRole("button", { name: "Delete this message" }).last().click();
  await expect(own.getByText("Sorry.")).toHaveCount(0);

  own.once("dialog", (dialog) => void dialog.accept());
  await own.getByRole("button", { name: "Delete all messages" }).click();
  await expect(own.getByText("No messages here yet.")).toBeVisible();
  const group = (await conversations(request, 1)).find((c) => c.kind === "group")!;
  expect((await (await request.get(`${api}/chat/conversations/${group.id}/messages`, { headers: students[1]!.auth })).json()).items).toEqual([]);
});

test("the switches: chat off leaves the app without it, in Arabic too", async ({ request }) => {
  await own.goto("/dashboard/chat");
  const settings = own.getByRole("region", { name: "Chat settings" });
  await settings.getByLabel("Chat in the app").uncheck();
  await settings.getByRole("button", { name: "Save" }).click();
  // The page shows the chat off at once.
  await expect(own.getByText("Chat is off: the app doesn't show it.")).toBeVisible();
  await expect(own.getByRole("link", { name: "Reports" })).toHaveCount(0);
  expect((await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()).chat).toBeUndefined();
  expect((await request.get(`${api}/chat/conversations`, { headers: students[0]!.auth })).status()).toBe(403);

  // The page in Arabic.
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "المحادثات" })).toBeVisible();
  await own.getByRole("region", { name: "إعدادات المحادثات" }).getByLabel("المحادثات في التطبيق").check();
  await own.getByRole("button", { name: "حفظ" }).click();
  // On again: the inbox, in Arabic.
  await expect(own.getByRole("navigation", { name: "عرض" }).getByRole("link", { name: "مجموعات الدورات" })).toBeVisible();
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  expect((await request.get(`${api}/chat/conversations`, { headers: students[0]!.auth })).status()).toBe(200);
});
