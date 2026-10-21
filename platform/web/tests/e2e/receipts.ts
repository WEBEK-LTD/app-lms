import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type APIResponse, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** 71 Receipts as PDF: what the specs check of a download and of a payment email's attachment. */

interface CapturedMail {
  to: string;
  subject: string;
  sentAt: string;
  attachments?: { filename: string; contentType: string; size: number; base64: string }[];
}

/** The emails to `email` the server kept (YALLAPP_MAIL_DIR), oldest first. */
export async function mailsWithFiles(email: string): Promise<CapturedMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as CapturedMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** A download answered with a PDF file. */
export async function expectPdf(response: APIResponse): Promise<Buffer> {
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(response.headers()["content-disposition"]).toMatch(/^attachment; filename="receipt-[A-Za-z0-9-]+\.pdf"$/);
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  return body;
}

/** The link's PDF, fetched with the page's own cookies (as clicking it would). */
export async function pdfBehind(page: Page, name: string | RegExp, scope = page.getByRole("main")): Promise<Buffer> {
  const link = scope.getByRole("link", { name }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  return expectPdf(await page.request.get(new URL(href!, E2E.baseURL).toString()));
}

/** The newest email to `email` whose subject matches carries the receipt's PDF. */
export async function expectReceiptAttached(email: string, subject: RegExp): Promise<void> {
  await expect
    .poll(async () => (await mailsWithFiles(email)).filter((m) => subject.test(m.subject)).at(-1)?.attachments?.[0]?.contentType ?? null, { timeout: 15_000 })
    .toBe("application/pdf");
  const mail = (await mailsWithFiles(email)).filter((m) => subject.test(m.subject)).at(-1)!;
  const file = mail.attachments![0]!;
  expect(file.filename).toMatch(/^receipt-[A-Za-z0-9-]+\.pdf$/);
  expect(Buffer.from(file.base64, "base64").subarray(0, 5).toString()).toBe("%PDF-");
}
