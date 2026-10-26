import { providerReturn } from "@/lib/payments/provider-route";

/** 96.1 PayPal sends the customer back here (GET); the payment is captured and read back from PayPal (lib/payments/provider-route.ts). */
export async function GET(_: Request, { params }: RouteContext<"/api/pay/paypal/[kind]/[token]">): Promise<Response> {
  const { kind, token } = await params;
  return providerReturn("paypal", kind, token);
}
