import type { Metadata } from "next";
import { resetPlatformSettingAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { Badge, formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting, PlatformSettingKey } from "@/lib/data/types";
import { appUrl, blobsMode, buildPipelineToken, dataMode, otpSenderConfig, smtpConfig, superAdminEmails } from "@/lib/env";
import { platformSettings } from "@/lib/settings/platform";
import { DEFAULT_CONTACT } from "@/lib/contact";
import {
  ContactForm,
  FawaterkSettingForm,
  IyzicoSettingForm,
  KashierSettingForm,
  MarketplaceForm,
  OtpSettingForm,
  PartnerAppForm,
  PaymentProviderForm,
  PlanBillingForm,
  PublishingSettingForm,
  SmtpSettingForm,
  TestCodeForm,
  TestEmailForm,
  TestPaymentAccountForm,
} from "./forms";
import { isPaymentProvider, PROVIDER_NAME } from "@/lib/payments/provider";
import { resetAppDefaultsAction } from "@/app/actions/app-defaults";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { AppDefaultsForm } from "./app-defaults-form";
import { SmtpMissingNotice } from "../smtp-notice";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <span className="w-[200px] flex-none text-sm font-semibold">{label}</span>
      <Badge tone={ok ? "success" : "warn"}>{ok ? "OK" : "Check"}</Badge>
      <span className="min-w-0 flex-1 text-sm break-all text-muted">{value}</span>
    </div>
  );
}

/** Where a setting comes from, and the way back to the Netlify variables. */
function Source({ setting, settingKey, fallback }: { setting: PlatformSetting | undefined; settingKey: PlatformSettingKey; fallback: string }) {
  if (!setting) return <p className="m-0 text-sm text-muted">Now: {fallback}</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted">
        Set here by {setting.updatedBy}, {formatDateTime(setting.updatedAt)}.
      </p>
      <form action={resetPlatformSettingAction}>
        <input type="hidden" name="key" value={settingKey} />
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
          Use the Netlify variables
        </SubmitButton>
      </form>
    </div>
  );
}

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[19px] font-bold">
          {title}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{text}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Platform settings. Saved ones replace the matching Netlify variables
 * (secrets stay encrypted and are never shown); the server rows are read-only.
 */
export default async function SettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const otp = settings.get("otp") as PlatformSetting<"otp"> | undefined;
  const smtp = settings.get("smtp") as PlatformSetting<"smtp"> | undefined;
  const iyzico = settings.get("iyzico") as PlatformSetting<"iyzico"> | undefined;
  // 37 Kashier and Fawaterk, and which account takes payments (iyzico until set).
  const kashier = settings.get("kashier") as PlatformSetting<"kashier"> | undefined;
  const fawaterk = settings.get("fawaterk") as PlatformSetting<"fawaterk"> | undefined;
  const paymentProvider = settings.get("paymentProvider") as PlatformSetting<"paymentProvider"> | undefined;
  const provider = paymentProvider && isPaymentProvider(paymentProvider.value.provider) ? paymentProvider.value.provider : "iyzico";
  const accounts = { iyzico: Boolean(iyzico), kashier: Boolean(kashier), fawaterk: Boolean(fawaterk) };
  // 52 Yallapp's own plans: their gateway (Kashier until set) and the pound-to-dollar rate.
  const billing = settings.get("billing") as PlatformSetting<"billing"> | undefined;
  const planProvider = billing && isPaymentProvider(billing.value.planProvider) ? billing.value.planProvider : "kashier";
  const marketplace = settings.get("marketplace") as PlatformSetting<"marketplace"> | undefined;
  const contact = settings.get("contact") as PlatformSetting<"contact"> | undefined;
  const appDefaults = settings.get("appDefaults") as PlatformSetting<"appDefaults"> | undefined;
  const publishing = settings.get("publishing") as PlatformSetting<"publishing"> | undefined;
  const partnerApps = [
    {
      key: "sallaApp" as const,
      id: "salla",
      name: "Salla",
      setting: settings.get("sallaApp") as PlatformSetting<"sallaApp"> | undefined,
      webhook: `${appUrl()}/api/webhooks/salla`,
      help: (
        <>
          In the Salla Partners portal, create an app (Apps, then Create App) and choose the custom mode for its authorization. Set its callback URL to{" "}
          <code className="break-all">{appUrl()}/oauth/salla</code>, give it read access to the store, products, categories, orders and customers,
          and turn on offline access. For webhooks, set <code className="break-all">{appUrl()}/api/webhooks/salla</code> with the Signature
          security strategy. Copy its Client ID, Client Secret and Webhook Secret here.
        </>
      ),
    },
    {
      key: "zidApp" as const,
      id: "zid",
      name: "Zid",
      setting: settings.get("zidApp") as PlatformSetting<"zidApp"> | undefined,
      webhook: null,
      help: (
        <>
          In the Zid Partner Dashboard, create an app with the redirect URL <code className="break-all">{appUrl()}/oauth/zid</code> and read
          access to the store, products, categories, orders and customers. Copy its Client ID and Client Secret here.
        </>
      ),
    },
  ];
  const data = dataMode();
  let envOtp = "Not set: sign-in on the hosted API fails";
  try {
    const config = otpSenderConfig();
    if (config) envOtp = `Netlify variables (${config.kind})`;
  } catch (e) {
    envOtp = `Netlify variables are incomplete: ${e instanceof Error ? e.message : ""}`;
  }
  const envSmtp = smtpConfig();
  const otpValue = otp?.value;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Settings</h1>
        <span className="text-[15px] text-muted">
          Settings saved here replace the Netlify variables and apply within 30 seconds. Secrets are stored encrypted and never shown again.
        </span>
      </div>
      {/* 19 Without SMTP, production drops every email with only a server log line. */}
      {smtp || envSmtp ? null : <SmtpMissingNotice what="Emails to the team (new publishing and set-up requests, build problems) aren't sent" settingsLink={false} />}
      <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">

      <Section id="h-contact" title="Contact details" text="How clients reach Yallapp: shown on every page of the website, in the dashboard and in emails.">
        {contact ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              Set here by {contact.updatedBy}, {formatDateTime(contact.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="contact" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Use the defaults
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: the defaults.</p>
        )}
        <ContactForm whatsapp={contact?.value.whatsapp ?? DEFAULT_CONTACT.whatsapp} email={contact?.value.email ?? DEFAULT_CONTACT.email} />
      </Section>

      <Section
        id="h-publishing"
        title="Publishing service"
        text="“Publish it for me”: clients invite this email to their Google Play Console, App Store Connect and Firebase accounts, and new requests are sent to it."
      >
        {publishing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              Set here by {publishing.updatedBy}, {formatDateTime(publishing.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="publishing" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Use the contact email
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: the contact email, {contact?.value.email ?? DEFAULT_CONTACT.email}.</p>
        )}
        <PublishingSettingForm teamEmail={publishing?.value.teamEmail ?? contact?.value.email ?? DEFAULT_CONTACT.email} />
      </Section>

      <Section id="h-otp" title="Sign-in codes" text="How apps on the hosted API send customers their 6-digit sign-in codes.">
        <Source setting={otp} settingKey="otp" fallback={envOtp} />
        <OtpSettingForm
          current={{
            kind: otpValue?.kind ?? null,
            phoneNumberId: otpValue?.kind === "whatsapp" ? otpValue.phoneNumberId : "",
            template: otpValue?.kind === "whatsapp" ? otpValue.template : "",
            language: otpValue?.kind === "whatsapp" ? otpValue.language : "",
            url: otpValue?.kind === "webhook" ? otpValue.url : "",
            baseUrl: otpValue?.kind === "waabek" ? otpValue.baseUrl : "",
            instanceId: otpValue?.kind === "waabek" ? (otpValue.instanceId ?? "") : "",
          }}
        />
        <TestCodeForm />
      </Section>

      <Section id="h-email" title="Email" text="Password links, activations, build results and new-order emails go out through this server.">
        <Source
          setting={smtp}
          settingKey="smtp"
          fallback={envSmtp ? `Netlify variables (${envSmtp.host}:${envSmtp.port} as ${envSmtp.from})` : "Not set: emails are not sent"}
        />
        <SmtpSettingForm
          current={{
            host: smtp?.value.host ?? "",
            port: smtp ? String(smtp.value.port) : "",
            secure: smtp?.value.secure ?? true,
            user: smtp?.value.user ?? "",
            from: smtp?.value.from ?? "",
            hasPassword: Boolean(smtp?.value.passEncrypted),
          }}
        />
        <TestEmailForm />
      </Section>

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

      {/* 37 Which of Yallapp's accounts takes payments: iyzico, Kashier or Fawaterk. */}
      <Section
        id="h-payment-provider"
        title="Yallapp's payment provider"
        text="Which of Yallapp's merchant accounts below takes shop sales through Yallapp (the marketplace). Plans have their own gateway above. Payments already started finish with the account they started with."
      >
        <p className="m-0 text-sm text-muted">
          Now: {PROVIDER_NAME[provider]}
          {paymentProvider ? `, set by ${paymentProvider.updatedBy}, ${formatDateTime(paymentProvider.updatedAt)}` : " (the default)"}.
          {accounts[provider] ? "" : ` Yallapp's ${PROVIDER_NAME[provider]} account isn't set: card payments are off.`}
        </p>
        <PaymentProviderForm provider={provider} />
      </Section>

      <Section
        id="h-iyzico"
        title="Yallapp's iyzico account"
        text="Yallapp's own iyzico merchant account (Türkiye), for plan payments and shops selling through Yallapp while iyzico is chosen above. Clients with their own account add their keys on their Products page."
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
        text={`Yallapp's own Kashier account (Egypt): its merchant ID, and the Payment API key and secret key from Kashier's dashboard (test and live keys differ). Payments come back to ${appUrl()}/api/pay/kashier/… and are confirmed by reading them back from Kashier.`}
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

      <Section
        id="h-marketplace"
        title="Shops selling through Yallapp"
        text="Shops without their own payment account can sell through Yallapp's, with the provider above. With iyzico, iyzico registers each one as a sub-merchant (iyzico's marketplace must be on for Yallapp's account) and pays it each sale minus this commission once the order is completed. With Kashier or Fawaterk, the whole payment comes to Yallapp's account and the team transfers each released share to the shop's IBAN (listed on the Payments page)."
      >
        {marketplace ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              On at {marketplace.value.commissionPercent}%{accounts[provider] ? "" : `, but it needs Yallapp's ${PROVIDER_NAME[provider]} account above`}. Set by {marketplace.updatedBy},{" "}
              {formatDateTime(marketplace.updatedAt)}.
            </p>
            <form action={resetPlatformSettingAction}>
              <input type="hidden" name="key" value="marketplace" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Turn off
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: off. Shops can only use their own payment account.</p>
        )}
        <MarketplaceForm commission={marketplace ? String(marketplace.value.commissionPercent) : ""} />
      </Section>

      {/* 25 Store platforms connected with OAuth through Yallapp's partner apps. */}
      {partnerApps.map((p) => (
        <Section
          key={p.key}
          id={`h-${p.id}`}
          title={`${p.name} partner app`}
          text={`Store apps connect a ${p.name} store with "Connect with ${p.name}" on their Website step, through this app. Until it's set, ${p.name} shows as not available yet.`}
        >
          {p.setting ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm text-muted">
                Set by {p.setting.updatedBy}, {formatDateTime(p.setting.updatedAt)}.
              </p>
              <form action={resetPlatformSettingAction}>
                <input type="hidden" name="key" value={p.key} />
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  Remove the app
                </SubmitButton>
              </form>
            </div>
          ) : (
            <p className="m-0 text-sm text-muted">Now: not set. Store apps can&apos;t connect a {p.name} store yet.</p>
          )}
          <p className="m-0 text-sm leading-relaxed text-ink-4">{p.help}</p>
          <PartnerAppForm
            settingKey={p.key}
            name={p.name}
            clientId={p.setting?.value.clientId ?? ""}
            saved={{ clientSecret: Boolean(p.setting), webhookSecret: Boolean(p.setting?.value.webhookSecretEncrypted) }}
            webhook={p.webhook}
          />
        </Section>
      ))}

      <Section
        id="h-app-defaults"
        title="Defaults for new apps"
        text="The look and languages a new app starts with. Clients change them on their Pages & look page; apps that already have pages keep theirs."
      >
        {appDefaults ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              Set here by {appDefaults.updatedBy}, {formatDateTime(appDefaults.updatedAt)}.
            </p>
            <form action={resetAppDefaultsAction}>
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Use the built-in defaults
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: the built-in defaults.</p>
        )}
        <AppDefaultsForm current={appDefaults?.value ?? BUILT_IN_APP_DEFAULTS} />
      </Section>

      <Section id="h-server" title="Server" text="These come from the Netlify environment variables. Change them in Netlify and redeploy.">
        <div className="flex flex-col">
          <Row label="Site address" ok={appUrl().startsWith("https://")} value={appUrl()} />
          <Row label="Database" ok={data === "mysql"} value={data === "mysql" ? "MySQL over TLS" : "In memory (development only)"} />
          <Row label="File storage" ok={blobsMode() === "netlify"} value={blobsMode() === "netlify" ? "Netlify Blobs" : "Local folder (development only)"} />
          <Row label="Build pipeline token" ok={Boolean(buildPipelineToken())} value={buildPipelineToken() ? "Set" : "Not set: the pipeline API refuses every request"} />
          <Row label="Super admins" ok={superAdminEmails().length > 0} value={superAdminEmails().join(", ")} />
        </div>
      </Section>
      </ReadOnly>
    </>
  );
}
