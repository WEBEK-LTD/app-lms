import { getStore } from "@/lib/data";
import { customerLang, donationReceiptPdf, pdfResponse } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

/**
 * 71 GET /receipts/<code>/pdf: a donation's receipt as a PDF, from its
 * page's "Download PDF" and the app's My donations. The code is the
 * receipt's own random one (only the donor has it). In the language asked
 * for (`lang`, else 96.4 the one the donor started it in, else the
 * browser's) when the app has it, else the app's.
 */
export async function GET(request: Request, { params }: RouteContext<"/receipts/[code]/pdf">): Promise<Response> {
  const { code } = await params;
  const store = await getStore();
  const donation = /^[A-Za-z0-9_-]{16,64}$/.test(code) ? await store.getDonationByReceipt(code) : null;
  const app = donation ? await store.getAppById(donation.appId) : null;
  if (!donation || !app) return new Response("Not found.", { status: 404 });
  // 96.4 The language the donor started it in comes before the browser's.
  const wanted = new URL(request.url).searchParams.get("lang") ?? donation.lang ?? request.headers.get("accept-language");
  const receipt = await donationReceiptPdf(store, app, donation, await customerLang(store, app, wanted));
  return receipt ? pdfResponse(receipt) : new Response("Not found.", { status: 404 });
}
