import { chooseApp } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { settlePlanPayment } from "@/lib/payments/settle";

/**
 * Where iyzico sends a client back after paying their plan, with its token.
 * The license changes only after iyzico confirms the payment
 * (lib/payments/settle.ts; 37 Kashier and Fawaterk: /api/pay/<provider>/plan).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/plan/[token]">): Promise<Response> {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const settled = await settlePlanPayment(token, { provider: "iyzico", iyzicoToken: typeof iyzicoToken === "string" && iyzicoToken ? iyzicoToken : undefined });
  if (settled.paidApp) await chooseApp(settled.paidApp);
  // A plain Response (not Response.redirect, whose headers are read-only), so the app cookie can be added to it.
  return new Response(null, { status: 303, headers: { location: `${appUrl()}${settled.path}` } });
}
