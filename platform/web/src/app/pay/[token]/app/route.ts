import { appUrl } from "@/lib/env";
import { PAY_TOKEN, appReturnCookie } from "@/lib/payments/app-return";

export const dynamic = "force-dynamic";

/**
 * 170 Where the app opens its payment in the phone's browser sheet: marks
 * this payment as the app's (a cookie kept to `/pay/<token>`, holding no
 * secret), then the payment page. Its done, failed and pending pages then
 * lead back to the app. The payment page itself checks the token, as for
 * any other link.
 */
export async function GET(request: Request, { params }: RouteContext<"/pay/[token]/app">): Promise<Response> {
  const { token } = await params;
  if (!PAY_TOKEN.test(token)) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  const base = appUrl();
  const secure = base.startsWith("https://") || new URL(request.url).protocol === "https:";
  return new Response(null, {
    status: 303,
    headers: { location: `${base}/pay/${token}`, "set-cookie": appReturnCookie(token, secure), "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}
