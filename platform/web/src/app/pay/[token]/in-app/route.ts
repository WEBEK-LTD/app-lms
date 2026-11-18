import { appUrl } from "@/lib/env";
import { PAY_TOKEN } from "@/lib/payments/app-return";

export const dynamic = "force-dynamic";

/**
 * 186 The link the apps are handed (lib/payments/pay-link.ts): straight on to
 * the payment page, in the app's own web view. Nothing is marked: the page is
 * as in any browser. The payment page itself checks the token, as for any
 * other link.
 */
export async function GET(request: Request, { params }: RouteContext<"/pay/[token]/in-app">): Promise<Response> {
  const { token } = await params;
  if (!PAY_TOKEN.test(token)) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  const { search } = new URL(request.url);
  return new Response(null, {
    status: 303,
    headers: { location: `${appUrl()}/pay/${token}${search}`, "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}
