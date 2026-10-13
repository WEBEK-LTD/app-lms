import { completePlanPayment } from "@/lib/billing/plan-payment";
import { formatDate } from "@/components/ui";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import { activationMail, renewalMail, sendMail } from "@/lib/mail";
import { getPlans, yallappIyzicoKeys } from "@/lib/settings/platform";

/**
 * Where iyzico sends a client back after paying their plan, with its token.
 * The license changes only after iyzico confirms the payment.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/plan/[token]">): Promise<Response> {
  const { token } = await params;
  const go = (path: string) => Response.redirect(`${appUrl()}${path}`, 303);
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
  if (outcome.kind === "paid") {
    const user = await store.getUserById(client.userId);
    if (user) {
      const plan = (await getPlans(store))[payment.plan].name;
      const until = formatDate(outcome.activeUntil);
      const dashboard = `${appUrl()}/dashboard`;
      await sendMail(
        outcome.activation.created
          ? activationMail(user.email, user.name, plan, until, outcome.activation.licenseKey, dashboard)
          : renewalMail(user.email, user.name, plan, until, dashboard),
      ).catch((error: unknown) => console.error("[mail] payment email failed", error));
    }
  }
  return go("/dashboard/license?payment=paid");
}
