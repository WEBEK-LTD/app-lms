import { appUrl } from "@/lib/env";
import { settleOrderPayment } from "@/lib/payments/settle";

/**
 * Where iyzico sends the customer back after the card payment, with its
 * token. The order is marked paid only after iyzico confirms the payment
 * (lib/payments/settle.ts; 37 Kashier and Fawaterk: /api/pay/<provider>/order).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/iyzico/[token]">): Promise<Response> {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const settled = await settleOrderPayment(token, { provider: "iyzico", iyzicoToken: typeof iyzicoToken === "string" && iyzicoToken ? iyzicoToken : undefined });
  return Response.redirect(`${appUrl()}${settled.path}`, 303);
}
