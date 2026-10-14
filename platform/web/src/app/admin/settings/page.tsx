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
import { ContactForm, IyzicoSettingForm, MarketplaceForm, OtpSettingForm, PartnerAppForm, PublishingSettingForm, SmtpSettingForm, TestCodeForm, TestEmailForm } from "./forms";
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

      <Section
        id="h-iyzico"
        title="Yallapp's iyzico account"
        text="Yallapp's own merchant account: clients paying their plan by card, and shops selling through Yallapp. Clients with their own iyzico account add their keys on their Products page."
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
      </Section>

      <Section
        id="h-marketplace"
        title="Shops selling through Yallapp"
        text="Shops without their own iyzico account can sell through Yallapp's: iyzico registers each one as a sub-merchant (iyzico's marketplace must be on for Yallapp's account) and pays it each sale minus this commission once the order is completed."
      >
        {marketplace ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              On at {marketplace.value.commissionPercent}%{iyzico ? "" : ", but it needs Yallapp's iyzico account above"}. Set by {marketplace.updatedBy},{" "}
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
          <p className="m-0 text-sm text-muted">Now: off. Shops can only use their own iyzico account.</p>
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
