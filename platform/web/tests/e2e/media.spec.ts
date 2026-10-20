import { expect, test, type Page, type Request } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";

/**
 * 51 Videos and pictures hosted by Yallapp: an academy without a website
 * uploads to Media (the platform's own /media gate here, "fs" mode), uses a
 * video in a lesson, hits its storage, buys a storage pack by card (a fake
 * Kashier: 52 priced in pounds, shown in dollars outside Egypt), uploads
 * again and renews the pack with its plan. On the memory store, and on
 * MariaDB with E2E_DATABASE_URL.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up never uses up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.151" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Defne Academy", email: `defne-${suffix}@school.test`, password: "defne-strong-password-1" };
let kashier: FakeGateway;
let admin: Page;
let own: Page;
let api = "";

/** A file of `size` bytes: the gate doesn't look inside, so any bytes make a "video". */
const bytes = (size: number, seed = 1) => {
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) buffer[i] = (i * seed) % 251;
  return buffer;
};

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 61");
  await own.getByLabel("Your website (optional)").fill(`https://defne-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.mediaAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // An academy without a website.
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
});

test.afterAll(async () => {
  // The plan and the payment account back as they were for the other specs.
  await admin.goto("/admin/plans");
  const starter = admin.getByRole("region", { name: "Starter" });
  if (await starter.getByRole("button", { name: "Back to the default plan" }).count()) await starter.getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/plans");
  const packs = admin.getByRole("form", { name: "Storage packs" });
  await packs.getByLabel("Monthly price in EGP").first().fill("");
  await packs.getByLabel("Monthly price in USD (optional)").first().fill("");
  await packs.getByRole("button", { name: "Save storage packs" }).click();
  await expect(packs.getByText("Storage packs saved.")).toBeVisible();
  await admin.goto("/admin/settings");
  const account = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  if (await account.getByRole("button", { name: "Remove keys" }).count()) await account.getByRole("button", { name: "Remove keys" }).click();
  await own.close();
  await admin.close();
  await kashier.close();
});

test("the owner uploads a video in chunks and a picture to Media", async () => {
  await own.goto("/dashboard");
  await own.getByRole("link", { name: "Media", exact: true }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Media" })).toBeVisible();
  await expect(own.locator("[data-storage-used]")).toContainText("0 B of 2 GB used");
  await expect(own.getByRole("region", { name: "Storage", exact: true })).toContainText("Starter plan: 2 GB");

  // 6 MB: two chunks of 5 MB and 1 MB. 64b Sent by POST, as application/octet-stream, the offset in the header and the query.
  const chunks: { method: string; type: string; offset: string | null; header: string | null; path: string }[] = [];
  const seen = (r: Request) => {
    if (/\/media\/u\//.test(r.url()) && r.method() !== "GET")
      chunks.push({ method: r.method(), type: r.headers()["content-type"] ?? "", offset: new URL(r.url()).searchParams.get("offset"), header: r.headers()["upload-offset"] ?? null, path: new URL(r.url()).pathname });
  };
  own.on("request", seen);
  await expect(own.getByLabel("Choose files")).toBeEnabled();
  await own.getByLabel("Choose files").setInputFiles([
    { name: "Lesson one.mp4", mimeType: "video/mp4", buffer: bytes(6 * 1024 * 1024) },
    { name: "Cover.png", mimeType: "image/png", buffer: bytes(2048, 3) },
  ]);
  const uploads = own.getByRole("list", { name: "Uploads" });
  await expect(uploads.locator('[data-upload="Lesson one.mp4"]')).toContainText("Uploaded", { timeout: 30_000 });
  await expect(uploads.locator('[data-upload="Cover.png"]')).toContainText("Uploaded", { timeout: 30_000 });
  own.off("request", seen);
  expect(chunks.length).toBe(3);
  for (const chunk of chunks) {
    expect(chunk).toMatchObject({ method: "POST", type: "application/octet-stream" });
    expect(chunk.offset).toBe(chunk.header);
    // 64b No file extension at the end: no static-file handler takes it for a file.
    expect(chunk.path).toMatch(/^\/media\/u\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(mp4|png)$/);
  }
  expect(chunks.map((c) => c.offset)).toEqual(expect.arrayContaining(["0", String(5 * 1024 * 1024)]));
  const files = own.getByRole("list", { name: "Files" });
  await expect(files.locator('[data-media="Lesson one.mp4"]')).toContainText("Video · 6 MB");
  await expect(files.locator('[data-media="Lesson one.mp4"]')).toContainText("Lessons only");
  await expect(files.locator('[data-media="Cover.png"]')).toContainText("Picture · 2 KB");
  await expect(own.locator("[data-storage-used]")).toContainText("6 MB of 2 GB used");

  // The signed link plays the file with range requests, straight from the gate.
  const open = (await files.locator('[data-media="Lesson one.mp4"]').getByRole("link", { name: "Open" }).getAttribute("href"))!;
  expect(new URL(open).pathname).toMatch(/^\/media\/v\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/mp4$/);
  const range = await own.request.get(open, { headers: { range: "bytes=5242880-5242889" } });
  expect(range.status()).toBe(206);
  expect(range.headers()["content-range"]).toBe(`bytes 5242880-5242889/${6 * 1024 * 1024}`);
  expect(range.headers()["content-type"]).toBe("video/mp4");
  expect(Buffer.from(await range.body()).equals(bytes(6 * 1024 * 1024).subarray(5242880, 5242890))).toBe(true);
  // Tampered: refused.
  expect((await own.request.get(open.replace(/sig=[0-9a-f]{4}/, "sig=0000"))).status()).toBe(403);

  // Its own link: a picture opens for anyone, a lesson's video doesn't.
  const videoId = open.split("/").pop()!.split(".")[0]!;
  const pictureOpen = (await files.locator('[data-media="Cover.png"]').getByRole("link", { name: "Open" }).getAttribute("href"))!;
  const pictureId = pictureOpen.split("/").pop()!.split(".")[0]!;
  const picture = await own.request.get(`/m/${pictureId}`, { maxRedirects: 0 });
  expect(picture.status()).toBe(302);
  expect(new URL(picture.headers().location!).pathname).toContain(`/media/v/`);
  expect((await own.request.get(`/m/${videoId}`, { maxRedirects: 0 })).status()).toBe(403);

  // Renamed.
  const row = files.locator('[data-media="Lesson one.mp4"]');
  await row.getByRole("button", { name: "Rename Lesson one.mp4" }).click();
  await row.getByLabel("Name").fill("Lesson 1 - Hello.mp4");
  await row.getByRole("button", { name: "Save name" }).click();
  await expect(files.locator('[data-media="Lesson 1 - Hello.mp4"]')).toBeVisible();
});

test("64b an upload the media server refuses says why, and stops asking for fresh links", async () => {
  await own.goto("/dashboard/media");
  const uploads = own.getByRole("list", { name: "Uploads" });
  // A firewall in front of the gate: 406 for any upload.
  await own.route("**/media/u/**", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 406, contentType: "text/html", body: "<h1>Not Acceptable</h1>" }) : route.fallback()));
  await expect(own.getByLabel("Choose files")).toBeEnabled();
  await own.getByLabel("Choose files").setInputFiles([{ name: "Refused.png", mimeType: "image/png", buffer: bytes(2048, 7) }]);
  const refused = uploads.locator('[data-upload="Refused.png"]');
  await expect(refused.getByRole("alert")).toContainText("The media server refused the upload (HTTP 406). Its firewall may be blocking uploads.");
  await refused.getByRole("button", { name: "Cancel Refused.png" }).click();
  await expect(refused).toHaveCount(0);
  await own.unroute("**/media/u/**");

  // 403 every time (another secret, or a firewall): two fresh links, then it stops and says so.
  let posts = 0;
  await own.route("**/media/u/**", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    posts++;
    return route.fulfill({ status: 403, contentType: "text/plain", body: "This link is not valid." });
  });
  await own.getByLabel("Choose files").setInputFiles([{ name: "Forbidden.png", mimeType: "image/png", buffer: bytes(2048, 9) }]);
  const forbidden = uploads.locator('[data-upload="Forbidden.png"]');
  await expect(forbidden.getByRole("alert")).toContainText("The media server refused the upload (HTTP 403).");
  expect(posts).toBe(3);
  await forbidden.getByRole("button", { name: "Cancel Forbidden.png" }).click();
  await expect(forbidden).toHaveCount(0);
  await own.unroute("**/media/u/**");
});

test("64b the admin's check of the media server sends a test upload and removes it", async () => {
  await admin.goto("/admin/settings");
  await admin.getByRole("button", { name: "Check the media server" }).click();
  await expect(admin.getByText("A test upload by POST went through and was removed again.")).toBeVisible();
});

test("the owner picks the video for a lesson, and the app plays it from a signed link", async ({ request }) => {
  await own.goto("/dashboard/courses");
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish with Defne");
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish with Defne" })).toBeVisible();
  const curriculum = own.getByRole("region", { name: "Sections and lessons" });
  await curriculum.getByLabel("New section").fill("Hello");
  await curriculum.getByRole("button", { name: "Add section" }).click();
  await expect(curriculum.getByRole("heading", { name: "Hello" })).toBeVisible();
  await curriculum.getByLabel("Lesson title").fill("Greetings");
  await curriculum.getByRole("button", { name: "Choose from Media" }).click();
  const dialog = own.getByRole("dialog", { name: "Your videos" });
  await dialog.getByRole("button", { name: "Use Lesson 1 - Hello.mp4" }).click();
  await expect(dialog).toBeHidden();
  await expect(curriculum.getByLabel("Video address")).toHaveValue(/\/m\/[0-9a-f-]{36}$/);
  await curriculum.getByLabel("Free preview for everyone").check();
  await curriculum.getByRole("button", { name: "Add lesson" }).click();
  await expect(curriculum.getByText("Video · free preview")).toBeVisible();

  const courses = await (await request.get(`${api}/courses`)).json();
  const curriculumJson = await (await request.get(`${api}/courses/${courses.items[0].id}/curriculum`)).json();
  const lesson = await (await request.get(`${api}/lessons/${curriculumJson.topics[0].items[0].id}`)).json();
  expect(lesson.video.source).toBe("upload");
  expect(new URL(lesson.video.url).pathname).toMatch(/^\/media\/v\//);
  expect(new Date(lesson.video.expires_at).getTime()).toBeGreaterThan(Date.now() + 3 * 3600_000);
  const played = await request.get(lesson.video.url, { headers: { range: "bytes=0-99" } });
  expect(played.status()).toBe(206);
  expect((await played.body()).length).toBe(100);
});

test("uploads past the storage are refused, with Buy more storage", async () => {
  await admin.goto("/admin/plans");
  const starter = admin.getByRole("region", { name: "Starter" });
  const limits = starter.getByRole("form", { name: "Starter: features and limits" });
  await limits.getByLabel("Storage (GB)").fill("0.01");
  await limits.getByRole("button", { name: "Save features and limits" }).click();
  await expect(limits.getByText("Starter: features and limits saved.")).toBeVisible();

  await own.goto("/dashboard/media");
  await expect(own.locator("[data-storage-used]")).toContainText("of 10.2 MB used");
  await expect(own.getByLabel("Choose files")).toBeEnabled();
  await own.getByLabel("Choose files").setInputFiles([{ name: "Lesson two.mp4", mimeType: "video/mp4", buffer: bytes(6 * 1024 * 1024, 5) }]);
  const job = own.getByRole("list", { name: "Uploads" }).locator('[data-upload="Lesson two.mp4"]');
  await expect(job.getByRole("alert")).toContainText("There isn't room for Lesson two.mp4 (6 MB)");
  await expect(job.getByRole("link", { name: "Buy more storage" })).toBeVisible();
  await expect(own.getByRole("list", { name: "Files" }).locator('[data-media="Lesson two.mp4"]')).toHaveCount(0);
});

test("the owner buys a storage pack by card, then uploads", async () => {
  // Without a priced pack or Yallapp's account: the team adds packs by hand.
  await own.goto("/dashboard/media");
  await expect(own.getByRole("region", { name: "Buy more storage" })).toContainText("are added by our team");

  await admin.goto("/admin/settings");
  const account = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await account.getByLabel("Merchant ID").fill("MID-5151-515");
  await account.getByLabel("Payment API key").fill("kashier-media-api-key");
  await account.getByLabel("Secret key").fill("kashier-media-secret");
  await account.getByRole("button", { name: "Save keys" }).click();
  await expect(account.getByText("Kashier account saved.")).toBeVisible();
  // 52 A pack's monthly price is set like a plan's: pounds charged, dollars shown outside Egypt.
  await admin.goto("/admin/plans");
  const packs = admin.getByRole("form", { name: "Storage packs" });
  await packs.getByLabel("Monthly price in USD (optional)").first().fill("5");
  await packs.getByRole("button", { name: "Save storage packs" }).click();
  await expect(packs.getByText("Enter the price in Egyptian pounds too: that's what is charged.")).toBeVisible();
  await packs.getByLabel("Monthly price in EGP").first().fill("250");
  await packs.getByRole("button", { name: "Save storage packs" }).click();
  await expect(packs.getByText("Storage packs saved.")).toBeVisible();

  await own.goto("/dashboard/media");
  const buy = own.getByRole("region", { name: "Buy more storage" });
  await expect(buy.getByText("+25 GB")).toBeVisible();
  await expect(buy).toContainText("$5 a month");
  await expect(buy.locator("[data-charge-line]")).toHaveText(/^You'll be charged EGP\s[\d,]+ \(about \$\d+\); your bank may convert it\.$/);
  await buy.getByLabel("City").fill("Ankara");
  await buy.getByLabel("Billing address").fill("Atatürk Bulvarı 10, Çankaya");
  await buy.getByRole("button", { name: "Buy storage" }).click();
  await expect(own.getByText(/^Total \d+\.00 EGP$/)).toBeVisible();
  // Kashier was asked for pounds: EGP 250 for each month left.
  expect(kashier.started!.at(-1)).toMatchObject({ currency: "EGP" });
  expect(Number(kashier.started!.at(-1)!.amount) % 250).toBe(0);
  await own.getByRole("button", { name: "Pay with test card" }).click();

  await expect(own).toHaveURL(/\/dashboard\/media\?payment=paid$/);
  await expect(own.getByRole("status").first()).toContainText("Payment received. Your extra storage is ready.");
  await expect(own.getByRole("region", { name: "Storage", exact: true })).toContainText("+25 GB until");
  await expect(own.locator("[data-storage-used]")).toContainText("of 25 GB used");

  await expect(own.getByLabel("Choose files")).toBeEnabled();
  await own.getByLabel("Choose files").setInputFiles([{ name: "Lesson two.mp4", mimeType: "video/mp4", buffer: bytes(6 * 1024 * 1024, 5) }]);
  await expect(own.getByRole("list", { name: "Uploads" }).locator('[data-upload="Lesson two.mp4"]')).toContainText("Uploaded", { timeout: 30_000 });
  await expect(own.getByRole("list", { name: "Files" }).locator('[data-media="Lesson two.mp4"]')).toContainText("Video · 6 MB");

  // Its receipt: charged in pounds, the dollars shown kept as "about".
  await own.goto("/dashboard/license");
  const list = own.getByRole("region", { name: "Payments" });
  await expect(list).toContainText(/Storage \+25 GB · EGP\s[\d,]+/);
  await list.getByRole("link", { name: "Receipt" }).first().click();
  const receipt = own.getByRole("region", { name: "Yallapp storage payment" });
  await expect(receipt).toContainText("+25 GB for the Media library");
  await expect(receipt).toContainText(/About \$\d+\. Your bank may have converted the charge/);

  // The team sees the pack and the payment.
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name }).first().click();
  await expect(admin.locator("[data-admin-storage]")).toContainText("12 MB used of 25 GB");
  await expect(admin.getByRole("region", { name: "Media storage" })).toContainText("paid by card");
  await expect(admin.getByRole("region", { name: "Payments" }).first()).toContainText("Storage +25 GB");
});

test("renewing the plan by card renews the pack with it", async () => {
  // Starter gets a monthly price for this test (put back in afterAll).
  await admin.goto("/admin/plans");
  const starter = admin.getByRole("region", { name: "Starter" });
  await starter.getByLabel("A price").check();
  await starter.getByLabel("Price in EGP").fill("1000");
  await starter.getByLabel("Price in USD (optional)").fill("20");
  await starter.getByLabel("Billed").selectOption("1");
  await starter.getByRole("button", { name: "Save plan" }).click();
  await expect(starter.getByText("Starter saved.")).toBeVisible();

  await own.goto("/dashboard/license?plan=starter#renew");
  const renew = own.getByRole("checkbox", { name: /Renew my storage pack/ });
  await expect(renew).toBeChecked();
  await expect(own.getByText(/^Renew my storage pack \(\+25 GB\) for \$5 \(charged as EGP\s250\)$/)).toBeVisible();
  await expect(own.locator("[data-charge-line]")).toHaveText(/You'll be charged EGP\s1,000 \(about \$20\)/);
  await own.getByLabel("City").fill("Ankara");
  await own.getByLabel("Billing address").fill("Atatürk Bulvarı 10, Çankaya");
  await own.getByRole("button", { name: "Pay by card" }).click();
  // The plan and the pack together, in pounds.
  await expect(own.getByText("Total 1250.00 EGP")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("region", { name: "Payments" })).toContainText(/Starter · 1 month · storage \+25 GB · EGP\s1,250/);
});

test("deleting a file frees its space", async () => {
  await own.goto("/dashboard/media");
  const files = own.getByRole("list", { name: "Files" });
  await files.locator('[data-media="Lesson two.mp4"]').getByRole("button", { name: "Delete" }).click();
  await expect(files.locator('[data-media="Lesson two.mp4"]')).toHaveCount(0);
  await expect(own.locator("[data-storage-used]")).toContainText("6 MB of 25 GB used");
});
