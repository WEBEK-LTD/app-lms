import { certificate } from "@/lib/community/academy/service";
import { certificateLinks } from "@/lib/community/api/academy-routes";
import { communityDeps } from "@/lib/community/deps";
import { QaError } from "@/lib/community/qa/types";
import { renderCertificatePdf } from "@/lib/courses/certificate-pdf";
import { certificateLanguage } from "@/lib/courses/certificates";
import { errorResponse, ipFromHeaders } from "@/lib/http";

/**
 * 233 A Yallapp Academy certificate as a PDF (A4 across), for anyone with
 * its code: the member's name and the course as they were on the day, the
 * date, the code and the address that proves it.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/community/academy/certificates/[code]/pdf">): Promise<Response> {
  const { code } = await params;
  const deps = await communityDeps({ ip: ipFromHeaders(request.headers) });
  try {
    const c = await certificate({ store: deps.store.qa.academy, tenant: "yallapp", now: deps.now, memberName: async () => null }, code);
    const lang = certificateLanguage(new URL(request.url).searchParams.get("lang"), request.headers.get("accept-language"));
    const pdf = await renderCertificatePdf({ lang, academy: "Yallapp Academy", name: c.memberName, course: c.courseTitle, completedAt: new Date(c.issuedAt), code: c.code, signer: null, verifyUrl: certificateLinks(deps.siteUrl, deps.yallappUrl, c.code).verifyUrl, accent: "#FF5A1F", logo: null });
    return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="yallapp-certificate-${c.code}.pdf"`, "cache-control": "public, max-age=3600" } });
  } catch (error) {
    if (error instanceof QaError && error.code === "not_found") return errorResponse(404, "not_found", "There's no such certificate.");
    throw error;
  }
}
