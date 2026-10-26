import type { Metadata } from "next";
import { resetPlatformSettingAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { isYallappProvider, PROVIDER_NAME } from "@/lib/payments/provider";
import { platformSettings } from "@/lib/settings/platform";
import { FawaterkSettingForm, IyzicoSettingForm, KashierSettingForm, PlanBillingForm, TestPaymentAccountForm } from "../forms";
import { Section } from "../parts";

export const metadata: Metadata = { title: "Payments · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Payments: the gateway for Yallapp's plans, and Yallapp's own accounts with each gateway. */
export default async function PaymentSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const iyzico = settings.get("iyzico") as PlatformSetting<"iyzico"> | undefined;
  // 37 Kashier and Fawaterk. 72 Only for Yallapp's own plan payments: the old marketplace's provider choice is gone.
  const kashier = settings.get("kashier") as PlatformSetting<"kashier"> | undefined;
  const fawaterk = settings.get("fawaterk") as PlatformSetting<"fawaterk"> | undefined;
  const accounts = { iyzico: Boolean(iyzico), kashier: Boolean(kashier), fawaterk: Boolean(fawaterk) };
  // 52 Yallapp's own plans: their gateway (Kashier until set) and the pound-to-dollar rate.
  const billing = settings.get("billing") as PlatformSetting<"billing"> | undefined;
  const planProvider = billing && isYallappProvider(billing.value.planProvider) ? billing.value.planProvider : "kashier";

  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      {/* 52 Yallapp's own plans and add-ons: the gateway they're paid through and the rate for their dollar prices. */}
      <Section
        id="h-plan-billing"
        title="Yallapp's plan payments"
        text="Clients pay Yallapp's plans and add-ons through this gateway. Prices are set in Egyptian pounds on the Plans page: people in Egypt see pounds, everyone else sees US dollars, and Kashier and Fawaterk charge everyone in pounds. iyzico takes no pounds, so with iyzico the dollar price is charged. Payments already started finish with the account they started with."
      >
        <p className="m-0 text-sm text-muted">
          Now: {PROVIDER_NAME[planProvider]}
          {billing ? `, set by ${billing.updatedBy}, ${formatDateTime(billing.updatedAt)}` : " (the default)"}.
          {billing?.value.egpPerUsd ? ` 1 US dollar = ${billing.value.egpPerUsd} Egyptian pounds.` : " No exchange rate: only prices with their own dollar figure show in dollars."}
          {accounts[planProvider] ? "" : ` Yallapp's ${PROVIDER_NAME[planProvider]} account isn't set: card payments for plans are off.`}
        </p>
        <PlanBillingForm provider={planProvider} rate={billing?.value.egpPerUsd ? String(billing.value.egpPerUsd) : ""} />
      </Section>

      <Section
        id="h-iyzico"
        title="Yallapp's iyzico account"
        text="Yallapp's own iyzico merchant account (Türkiye), for plan payments when iyzico is the gateway above. Clients take their own customers' payments in their own accounts, on their Products page: Yallapp never collects payments for them."
      >
        {iyzico ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              {iyzico.value.sandbox ? "Sandbox" : "Live"} keys saved by {iyzico.updatedBy}, {formatDateTime(iyzico.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="iyzico" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Remove keys
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: not set.</p>
        )}
        <IyzicoSettingForm sandbox={iyzico?.value.sandbox ?? true} />
        {iyzico ? <TestPaymentAccountForm provider="iyzico" /> : null}
      </Section>

      <Section
        id="h-kashier"
        title="Yallapp's Kashier account"
        text={`Yallapp's own Kashier account (Egypt): its merchant ID, and the Payment API key and secret key from Kashier's dashboard (test and live keys differ). Payments come back to ${appUrl()}/api/pay/kashier/… and are confirmed by reading them back from Kashier. Payments made with test keys show in Kashier's dashboard in its Test mode only.`}
      >
        {kashier ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              {kashier.value.sandbox ? "Test" : "Live"} keys for {kashier.value.merchantId} saved by {kashier.updatedBy}, {formatDateTime(kashier.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="kashier" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Remove keys
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: not set.</p>
        )}
        <KashierSettingForm merchantId={kashier?.value.merchantId ?? ""} sandbox={kashier?.value.sandbox ?? true} />
        {kashier ? <TestPaymentAccountForm provider="kashier" /> : null}
      </Section>

      <Section
        id="h-fawaterk"
        title="Yallapp's Fawaterk account"
        text={`Yallapp's own Fawaterk account (Egypt): the API key from Fawaterk's dashboard (staging and live keys differ). Payments come back to ${appUrl()}/api/pay/fawaterk/… and are confirmed by reading the invoice back from Fawaterk.`}
      >
        {fawaterk ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              {fawaterk.value.sandbox ? "Staging" : "Live"} key saved by {fawaterk.updatedBy}, {formatDateTime(fawaterk.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="fawaterk" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Remove key
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: not set.</p>
        )}
        <FawaterkSettingForm sandbox={fawaterk?.value.sandbox ?? true} />
        {fawaterk ? <TestPaymentAccountForm provider="fawaterk" /> : null}
      </Section>
    </ReadOnly>
  );
}
