import "server-only";
import { formatDate } from "@/components/ui";
import type { DataStore } from "../data/store";
import type { Client } from "../data/types";
import { sendTemplate } from "../email/send";
import { appUrl } from "../env";
import { getPlans } from "../settings/platform";
import type { PlanPaymentOutcome } from "./plan-payment";

/** After a plan is paid (by card, or free with a coupon): the activation or renewal email. Never fails the payment. */
export async function sendPlanPaidMail(store: DataStore, client: Client, outcome: Extract<PlanPaymentOutcome, { kind: "paid" }>): Promise<void> {
  const user = await store.getUserById(client.userId);
  if (!user) return;
  const plan = (await getPlans(store))[outcome.payment.plan].name;
  const until = formatDate(outcome.activeUntil);
  const dashboard = `${appUrl()}/dashboard`;
  await (
    outcome.activation.created
      ? sendTemplate("account_activated", user.email, {
          name: user.name,
          plan,
          active_until: until,
          license_key: outcome.activation.licenseKey,
          dashboard_url: dashboard,
        })
      : sendTemplate("plan_renewed", user.email, { name: user.name, plan, active_until: until, dashboard_url: dashboard })
  ).catch((error: unknown) => console.error("[mail] payment email failed", error));
}
