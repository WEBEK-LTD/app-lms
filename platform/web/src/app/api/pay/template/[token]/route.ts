import { appUrl } from "@/lib/env";
import { settleTemplatePayment } from "@/lib/studio-market/payment";

/**
 * 106.2 Where iyzico sends a buyer back after paying for a Studio Market
 * template, with its token (when the team chose iyzico for Yallapp's own
 * payments). Delivered only after iyzico confirms the payment
 * (lib/studio-market/payment.ts; Kashier and the others: /api/pay/<provider>/template).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/template/[token]">): Promise<Response> {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const settled = await settleTemplatePayment(token, { provider: "iyzico", iyzicoToken: typeof iyzicoToken === "string" && iyzicoToken ? iyzicoToken : undefined });
  return new Response(null, { status: 303, headers: { location: `${appUrl()}${settled.path}` } });
}
