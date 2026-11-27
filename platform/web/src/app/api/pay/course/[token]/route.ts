import { settledLocation } from "@/lib/payments/provider-route";
import { settleCoursePayment } from "@/lib/community/engage/course-payment";

/**
 * 233 Where iyzico sends a buyer back after paying for a Yallapp Community
 * course, with its token (when the team chose iyzico for Yallapp's own
 * payments). The course unlocks only after iyzico confirms the payment
 * (lib/community/engage/checkout.ts; Kashier and the others: /api/pay/<gateway>/course).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/course/[token]">): Promise<Response> {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const settled = await settleCoursePayment(token, { provider: "iyzico", iyzicoToken: typeof iyzicoToken === "string" && iyzicoToken ? iyzicoToken : undefined });
  return new Response(null, { status: 303, headers: { location: settledLocation(settled.path) } });
}
