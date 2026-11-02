import { hmacSha256 } from "@/lib/crypto/tokens";
import { verifySignedUrl } from "@/lib/crypto/signed-url";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { isLang } from "@/i18n/config";
import { payslipLinkKey } from "@/lib/school/salaries-hosted";
import { payslipPdfResponse } from "@/lib/school/salary-pdf";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

/**
 * 113.12 /a/<app_id>/payslips/<id>/pdf: a payslip as a PDF file, from the
 * signed link the hosted API gives its own person (`GET /staff/payslips`),
 * good for a quarter of an hour; an old, changed or other school's link is
 * refused, and so is a sheet the school opened again.
 */
export async function GET(request: Request, { params }: RouteContext<"/a/[appId]/payslips/[id]/pdf">): Promise<Response> {
  const { appId, id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(appId) || !/^\d{1,15}$/.test(id)) return notFound();
  const url = new URL(request.url);
  // The signature covers the path and the query; the key is from the hosted API's secret (app/api/app/[appId]/[...path]/route.ts).
  const check = verifySignedUrl(url, payslipLinkKey(hmacSha256(signingSecret(), "hosted-api"), appId));
  if (check === "expired") return new Response("This link has ended. Open the payslip in the app again.", { status: 410, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (check !== "valid") return notFound();
  const store = await getStore();
  const [app, payslip] = await Promise.all([store.getAppById(appId), store.getSchoolPayslip(appId, Number(id))]);
  if (!app || app.connector?.kind !== "school" || !payslip || payslip.status === "draft") return notFound();
  const asked = url.searchParams.get("lang");
  return payslipPdfResponse({ lang: isLang(asked) ? asked : "en", app, payslip });
}
