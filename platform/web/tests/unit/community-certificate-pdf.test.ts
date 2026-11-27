import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/community/academy/certificates/[code]/pdf/route";
import { getCommunityStore } from "@/lib/community/store/server";

/** 233 A certificate's PDF for anyone with its code; an unknown code is 404. */
describe("233 the certificate PDF route", () => {
  it("serves the PDF of a certificate, and 404 for an unknown code", async () => {
    const store = (await getCommunityStore()).qa.academy;
    const now = new Date("2026-12-02T09:00:00.000Z");
    await store.createCourse({ id: "c-pdf", tenant: "yallapp", slug: "pdf-course", title: "Build your first app", summary: "", coverUrl: null, level: "beginner", language: "en", status: "published", free: true, priceMinor: null, currency: null, createdAt: now, updatedAt: now, publishedAt: now });
    await store.createCertificate({ id: "cert-pdf", tenant: "yallapp", code: "PDFTEST234", memberId: "m-pdf", courseId: "c-pdf", memberName: "Nour Aydın", courseTitle: "Build your first app", issuedAt: now });
    const ctx = (code: string) => ({ params: Promise.resolve({ code }) }) as never;
    const res = await GET(new Request("https://yallapp.test/api/community/academy/certificates/PDFTEST234/pdf?lang=ar"), ctx("PDFTEST234"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
    expect((await GET(new Request("https://yallapp.test/x"), ctx("NOPE000000"))).status).toBe(404);
  });
});
