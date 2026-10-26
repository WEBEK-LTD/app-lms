import { providerReturn } from "@/lib/payments/provider-route";

/** 96.1 Stripe sends the customer back here (GET); the payment is read back from Stripe (lib/payments/provider-route.ts). */
export async function GET(_: Request, { params }: RouteContext<"/api/pay/stripe/[kind]/[token]">): Promise<Response> {
  const { kind, token } = await params;
  return providerReturn("stripe", kind, token);
}
