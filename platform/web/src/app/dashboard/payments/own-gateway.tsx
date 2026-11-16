import { catalogSettings, isOwnPayment, ownPaymentInput } from "@/lib/catalog/settings";
import type { App } from "@/lib/data/types";
import { appUrl, encryptionKey } from "@/lib/env";
import { savedKeysView } from "@/lib/payments/owner-keys";
import { stripeWebhookUrl } from "@/lib/payments/stripe-keys";
import { webhookReceipt } from "@/lib/payments/webhooks";
import { PaymentKeysForm } from "./keys-form";

/**
 * 132 The owner's own gateway form with what the server knows of it: the
 * saved keys masked, this app's Stripe webhook endpoint, the last webhook,
 * and what the app sells in. A server component: the keys are opened here
 * and only their masks reach the page. Every page that sets up card
 * payments uses it (shop, courses, memberships, events, donations,
 * deliveries, rides, school fees, and the Payments page).
 */
export function OwnGatewayForm({ app, currency }: { app: App; currency?: string }) {
  const settings = catalogSettings(app);
  const own = isOwnPayment(settings.payment) ? settings.payment : null;
  return (
    <PaymentKeysForm
      provider={own?.provider ?? null}
      sandbox={own?.sandbox ?? false}
      merchantId={own?.provider === "kashier" ? own.merchantId : ""}
      clientId={own?.provider === "paypal" ? own.clientId : ""}
      saved={savedKeysView(ownPaymentInput(app, encryptionKey()))}
      stripeWebhookUrl={stripeWebhookUrl(appUrl(), app.id)}
      receipt={webhookReceipt(own)}
      currency={currency ?? settings.currency}
    />
  );
}
