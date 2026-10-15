import { providerReturn, providerWebhook } from "@/lib/payments/provider-route";

/** 37 Fawaterk sends the customer back here (GET) and posts its webhook here (POST); see lib/payments/provider-route.ts. */
export async function GET(_: Request, { params }: RouteContext<"/api/pay/fawaterk/[kind]/[token]">): Promise<Response> {
  const { kind, token } = await params;
  return providerReturn("fawaterk", kind, token);
}

export async function POST(request: Request, { params }: RouteContext<"/api/pay/fawaterk/[kind]/[token]">): Promise<Response> {
  const { kind, token } = await params;
  return providerWebhook("fawaterk", kind, token, request);
}
