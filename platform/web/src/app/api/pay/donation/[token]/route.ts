import { appUrl } from "@/lib/env";
import { settleDonationPayment } from "@/lib/payments/settle";

/**
 * 29 Where iyzico sends the donor back after the card payment, with its
 * token. The donation is marked paid, and added to its campaign, only after
 * iyzico confirms the payment; then the donor gets their receipt by email
 * (lib/payments/settle.ts; 37 Kashier and Fawaterk: /api/pay/<provider>/donation).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/donation/[token]">): Promise<Response> {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const settled = await settleDonationPayment(token, { provider: "iyzico", iyzicoToken: typeof iyzicoToken === "string" && iyzicoToken ? iyzicoToken : undefined });
  return Response.redirect(`${appUrl()}${settled.path}`, 303);
}
