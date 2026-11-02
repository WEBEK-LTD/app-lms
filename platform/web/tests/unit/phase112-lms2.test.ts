import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { renderCertificatePdf } from "@/lib/courses/certificate-pdf";
import { certificateLanguage, loadCertificate } from "@/lib/courses/certificates";
import { certificateCode } from "@/lib/courses/learning";
import type { App, CourseSetup } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 112.5, round 2: the certificate as a PDF file, the question bank, cohorts,
 * grading in the Teacher tab, report cards in the school app.
 */

const SECRET = "test-certificate-secret";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

export function academy(): CourseSetup {
  return {
    currency: "EGP",
    categories: [],
    courses: [
      {
        id: 10,
        title: "Turkish for Beginners",
        description: "",
        imageAssetId: null,
        priceCents: 0,
        categoryIds: [],
        instructorName: null,
        level: null,
        active: true,
        certificate: true,
        certificateSigner: "Dr. Sara Adel",
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [{ id: 11, title: "Hello", lessons: [{ id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: false }] }],
      },
    ],
    nextId: 40,
  };
}

/** A hosted academy and a student who signs up, with calls checked against the contract. */
export async function hostedAcademy(setup: () => CourseSetup = academy) {
  const { store } = await setupClient();
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: setup() };
  await store.createApp(app);
  const sender = new LogSender();
  const state = { now: NOW, app };
  const context = (): HostedContext => ({
    store,
    app: state.app,
    active: true,
    now: state.now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app: state.app, assetUrl: (id) => id, platformUrl: "https://yallapp.test", signingSecret: SECRET }),
  });
  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string>; lang?: string } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      ...(options.lang ? { headers: new Headers({ "accept-language": options.lang }) } : {}),
    });
    expectContract(method, route, result);
    return result;
  }
  async function signUp(phone = "5321234567", name = "Deniz Aksoy") {
    state.now = new Date(state.now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }
  return { store, state, call, signUp };
}

describe("112.5 the certificate as a PDF file", () => {
  let h: Awaited<ReturnType<typeof hostedAcademy>>;
  beforeEach(async () => {
    h = await hostedAcademy();
  });

  it("lists the PDF with each certificate, in the app's language", async () => {
    const { access_token: token, user } = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token });
    const code = certificateCode(SECRET, h.state.app.id, user.id, 10);
    expect((await h.call("GET", "/me/certificates", { token, lang: "ar" })).body).toMatchObject({
      items: [{ url: `https://yallapp.test/a/${h.state.app.id}/certificate/${code}`, pdf_url: `https://yallapp.test/a/${h.state.app.id}/certificate/${code}/pdf?lang=ar` }],
    });
    expect(await loadCertificate(h.store, SECRET, h.state.app.id, code)).toMatchObject({ name: "Deniz Aksoy", course: { id: 10 } });
    expect(await loadCertificate(h.store, SECRET, h.state.app.id, code.replace(/.$/, "x"))).toBeNull();
  });

  it("makes an A4 PDF in English, Arabic and Turkish", async () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const pdf = await renderCertificatePdf({
        lang,
        academy: lang === "ar" ? "أكاديمية لالا" : "Lale Academy",
        name: lang === "ar" ? "دنيز أكسوي" : "Deniz Aksoy",
        course: "Turkish for Beginners",
        completedAt: NOW,
        code: "1-10-abcdefghijklmnop",
        signer: "Dr. Sara Adel",
        verifyUrl: "https://yallapp.test/a/x/certificate/1-10-abcdefghijklmnop",
        accent: "#7A3EF0",
        logo: null,
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(5000);
    }
    expect(certificateLanguage("tr", "ar")).toBe("tr");
    expect(certificateLanguage(null, "ar-EG,ar;q=0.9")).toBe("ar");
    expect(certificateLanguage("de", "fr")).toBe("en");
  });
});
