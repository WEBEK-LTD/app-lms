import { getBlobStore } from "@/lib/blobs";
import { renderCertificatePdf } from "@/lib/courses/certificate-pdf";
import { certificateLanguage, loadCertificate } from "@/lib/courses/certificates";
import { certificateUrl } from "@/lib/courses/learning";
import { getStore } from "@/lib/data";
import { appUrl, signingSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 112.5 /a/<app_id>/certificate/<code>/pdf: the certificate as a PDF file,
 * in `?lang=` (else the browser's language). Like its page, open to anyone
 * with the link: the signed code is the proof.
 */
export async function GET(request: Request, { params }: RouteContext<"/a/[appId]/certificate/[code]/pdf">): Promise<Response> {
  const { appId, code } = await params;
  const store = await getStore();
  const found = await loadCertificate(store, signingSecret(), appId, code);
  if (!found) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { app, course, name, completedAt } = found;
  const lang = certificateLanguage(new URL(request.url).searchParams.get("lang"), request.headers.get("accept-language"));
  const logoId = app.logoAssetId ?? app.iconAssetId;
  const asset = logoId ? await store.getAsset(logoId) : null;
  const logo = asset && /^image\/(png|jpeg)$/.test(asset.contentType) ? ((await getBlobStore().get(asset.blobKey))?.data ?? null) : null;
  const pdf = await renderCertificatePdf({
    lang,
    academy: app.appName ?? app.storeTitle ?? "",
    name,
    course: course.title,
    completedAt,
    code,
    signer: course.certificateSigner ?? null,
    verifyUrl: certificateUrl(appUrl(), app.id, code),
    accent: app.primaryColor,
    logo,
  });
  const file = course.title.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase() || "certificate";
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="certificate-${file}.pdf"`, "cache-control": "private, no-store" },
  });
}
