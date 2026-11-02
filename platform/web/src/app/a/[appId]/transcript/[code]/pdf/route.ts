import { getBlobStore } from "@/lib/blobs";
import { certificateLanguage } from "@/lib/courses/certificates";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { loadTranscript, renderTranscriptPdf } from "@/lib/university/transcript";

export const dynamic = "force-dynamic";

/**
 * 113.9 /a/<app_id>/transcript/<code>/pdf: a university student's
 * transcript as a PDF file, in `?lang=` (else the browser's language). The
 * signed code (from the app's Transcript screen or the dashboard's
 * Transcripts page) works for an hour.
 */
export async function GET(request: Request, { params }: RouteContext<"/a/[appId]/transcript/[code]/pdf">): Promise<Response> {
  const { appId, code } = await params;
  const store = await getStore();
  const now = new Date();
  const found = await loadTranscript(store, hmacSha256(signingSecret(), "hosted-api"), appId, code, now);
  if (!found) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { app, record } = found;
  const lang = certificateLanguage(new URL(request.url).searchParams.get("lang"), request.headers.get("accept-language"));
  const logoId = app.logoAssetId ?? app.iconAssetId;
  const asset = logoId ? await store.getAsset(logoId) : null;
  const logo = asset && /^image\/(png|jpeg)$/.test(asset.contentType) ? ((await getBlobStore().get(asset.blobKey))?.data ?? null) : null;
  const pdf = await renderTranscriptPdf({ lang, school: app.appName ?? app.storeTitle ?? "", accent: app.primaryColor, logo, now, found });
  const file = record.student.name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase() || "student";
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="transcript-${file}.pdf"`, "cache-control": "private, no-store" },
  });
}
