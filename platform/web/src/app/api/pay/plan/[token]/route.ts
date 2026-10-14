import { chooseApp } from "@/lib/auth/session";
import { sendPlanPaidMail } from "@/lib/billing/plan-mail";
import { completePlanPayment } from "@/lib/billing/plan-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import { yallappIyzicoKeys } from "@/lib/settings/platform";

/**
 * Where iyzico sends a client back after paying their plan, with its token.
 * The license changes only after iyzico confirms the payment.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/plan/[token]">): Promise<Response> {
  const { token } = await params;
  // A plain Response (not Response.redirect, whose headers are read-only), so the app cookie can be added to it.
  const go = (path: string) => new Response(null, { status: 303, headers: { location: `${appUrl()}${path}` } });
  const store = await getStore();
  const payment = await store.getPlanPaymentByToken(sha256Hex(token));
  if (!payment) return go("/pending");
  const client = await store.getClientById(payment.clientId);
  const failed = () => go(client?.status === "active" ? "/dashboard/license?payment=failed" : "/pending?payment=failed");
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const keys = await yallappIyzicoKeys(store, encryptionKey());
  if (!client || !keys || typeof iyzicoToken !== "string" || iyzicoToken === "") return failed();
  const outcome = await completePlanPayment({
    store,
    keys,
    baseUrl: iyzicoApiUrl(),
    now: new Date(),
    payment,
    iyzicoToken,
    encryptionKey: encryptionKey(),
  });
  if (outcome.kind === "failed") return failed();
  if (outcome.kind === "paid") await sendPlanPaidMail(store, client, outcome);
  // The dashboard opens on the app that was paid for.
  const paidApp = outcome.kind === "paid" ? (outcome.activation.app?.id ?? null) : payment.appId;
  if (paidApp) await chooseApp(paidApp);
  return go("/dashboard/license?payment=paid");
}
