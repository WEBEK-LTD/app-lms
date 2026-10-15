"use client";

import { useActionState, useState } from "react";
import {
  checkTestCodeAction,
  saveContactAction,
  saveFawaterkSettingAction,
  saveIyzicoSettingAction,
  saveKashierSettingAction,
  savePaymentProviderAction,
  savePublishingSettingAction,
  saveMarketplaceAction,
  saveOtpSettingAction,
  savePartnerAppAction,
  saveSmtpSettingAction,
  sendTestCodeAction,
  sendTestEmailAction,
  testPaymentAccountAction,
} from "@/app/actions/admin-settings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

type OtpKind = "whatsapp" | "webhook" | "waabek" | "off";

export function OtpSettingForm({
  current,
}: {
  current: { kind: OtpKind | null; phoneNumberId: string; template: string; language: string; url: string; baseUrl: string; instanceId: string };
}) {
  const [state, action] = useActionState(saveOtpSettingAction, initialFormState);
  const [kind, setKind] = useState<OtpKind>((state.values?.kind as OtpKind | undefined) ?? current.kind ?? "whatsapp");
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const saved = current.kind === kind;
  const options: { id: OtpKind; title: string; text: string }[] = [
    { id: "whatsapp", title: "WhatsApp", text: "WhatsApp Cloud API with an approved authentication template." },
    { id: "webhook", title: "Our gateway", text: "We post each code to our SMS gateway, signed with a shared secret." },
    { id: "waabek", title: "WABEK", text: "WABEK sends the code on WhatsApp from one of your numbers, through its approved OTP template when needed." },
    { id: "off", title: "Off", text: "No codes are sent; customers can't sign in to apps on the hosted API." },
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="kind" value={kind} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Send codes by</legend>
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="otpKindChoice" value={o.id} checked={kind === o.id} onChange={() => setKind(o.id)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{o.title}</span>
              <span className="text-[13px] text-muted">{o.text}</span>
            </span>
          </label>
        ))}
        <FieldError id="f-kind-error" error={state.errors?.kind} />
      </fieldset>
      {kind === "whatsapp" ? (
        <>
          <Field
            label="Access token"
            name="accessToken"
            type="password"
            autoComplete="off"
            placeholder={saved ? "Saved. Paste a new one to replace it." : ""}
            hint="A permanent token of a system user in Meta Business, with WhatsApp messaging permission."
            error={state.errors?.accessToken}
          />
          <Field label="Phone number ID" name="phoneNumberId" inputMode="numeric" defaultValue={v("phoneNumberId", current.phoneNumberId)} error={state.errors?.phoneNumberId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Template" name="template" defaultValue={v("template", current.template || "yallapp_code")} error={state.errors?.template} />
            <Field label="Language" name="language" defaultValue={v("language", current.language || "en")} error={state.errors?.language} />
          </div>
        </>
      ) : null}
      {kind === "waabek" ? (
        <>
          <Field
            label="API key"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={saved ? "Saved. Paste a new one to replace it." : ""}
            hint="From your WABEK account. Sent as X-API-Key."
            error={state.errors?.apiKey}
          />
          <Field
            label="Instance ID"
            name="instanceId"
            defaultValue={v("instanceId", current.instanceId)}
            hint="The WhatsApp number that sends the codes, from WABEK › Instances. Empty: WABEK uses your first connected number."
            error={state.errors?.instanceId}
          />
          <Field
            label="WABEK address"
            name="baseUrl"
            type="url"
            defaultValue={v("baseUrl", current.baseUrl || "https://waabek.com")}
            hint="Codes are sent with POST /api/v1/send."
            error={state.errors?.baseUrl}
          />
        </>
      ) : null}
      {kind === "webhook" ? (
        <>
          <Field label="Gateway address" name="url" type="url" defaultValue={v("url", current.url)} placeholder="https://sms.example.com/yallapp" error={state.errors?.url} />
          <Field
            label="Signing secret"
            name="secret"
            type="password"
            autoComplete="off"
            placeholder={saved ? "Saved. Type a new one to replace it." : ""}
            hint="Each request carries X-Yallapp-Signature: sha256=<base64url HMAC-SHA256 of the body>."
            error={state.errors?.secret}
          />
        </>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

export function SmtpSettingForm({
  current,
}: {
  current: { host: string; port: string; secure: boolean; user: string; from: string; hasPassword: boolean };
}) {
  const [state, action] = useActionState(saveSmtpSettingAction, initialFormState);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Mail server" name="host" defaultValue={v("host", current.host)} placeholder="mail.yallapp.com.tr" error={state.errors?.host} />
        <Field label="Port" name="port" inputMode="numeric" defaultValue={v("port", current.port || "465")} error={state.errors?.port} />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="secure" defaultChecked={state.values ? state.values.secure === "on" : current.secure} className="h-4 w-4 accent-midnight" />
        TLS from the start (port 465). Off uses STARTTLS (port 587).
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" name="user" autoComplete="off" defaultValue={v("user", current.user)} error={state.errors?.user} />
        <Field
          label="Password"
          name="pass"
          type="password"
          autoComplete="off"
          placeholder={current.hasPassword ? "Saved. Type a new one to replace it." : ""}
          error={state.errors?.pass}
        />
      </div>
      <Field label="From" name="from" defaultValue={v("from", current.from || "Yallapp <info@yallapp.com.tr>")} error={state.errors?.from} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

/** Sends a real code to the admin's number with the saved setting, then checks it like the hosted API. */
export function TestCodeForm() {
  const [sent, send] = useActionState(sendTestCodeAction, initialFormState);
  const [checked, check] = useActionState(checkTestCodeAction, initialFormState);
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="m-0 text-sm font-semibold">Test it</p>
      <form action={send} noValidate className="flex flex-col gap-3">
        <FormMessage message={sent.message} ok={sent.ok} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field
              label="Your number"
              name="phone"
              type="tel"
              defaultValue={sent.values?.phone ?? ""}
              placeholder="+20 100 123 4567"
              hint="A real code goes to this number with the saved setting."
              error={sent.errors?.phone}
            />
          </div>
          <SubmitButton variant="secondary" className="h-10" pendingText="Sending…">
            Send a test code
          </SubmitButton>
        </div>
      </form>
      {sent.ok || checked.message || checked.errors ? (
        <form action={check} noValidate className="flex flex-col gap-3">
          <FormMessage message={checked.message} ok={checked.ok} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Field
                label="The code you got"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                defaultValue={checked.values?.code ?? ""}
                error={checked.errors?.code}
              />
            </div>
            <SubmitButton variant="secondary" className="h-10" pendingText="Checking…">
              Check the code
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function TestEmailForm() {
  const [state, action] = useActionState(sendTestEmailAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText="Sending…">
          Send a test email to me
        </SubmitButton>
      </div>
    </form>
  );
}

export function IyzicoSettingForm({ sandbox }: { sandbox: boolean }) {
  const [state, action] = useActionState(saveIyzicoSettingAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="API key" name="apiKey" autoComplete="off" error={state.errors?.apiKey} />
      <Field label="Secret key" name="secretKey" type="password" autoComplete="off" error={state.errors?.secretKey} />
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="sandbox" defaultChecked={state.values ? state.values.sandbox === "on" : sandbox} className="h-4 w-4 accent-midnight" />
        Sandbox keys (test payments)
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Checking…">
          Save keys
        </SubmitButton>
      </div>
    </form>
  );
}

/** 37 Which of Yallapp's accounts takes plan payments and marketplace sales. */
export function PaymentProviderForm({ provider }: { provider: "iyzico" | "kashier" | "fawaterk" }) {
  const [state, action] = useActionState(savePaymentProviderAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-payment-provider" className="text-sm font-semibold">
          Provider
        </label>
        <select id="f-payment-provider" name="provider" defaultValue={state.values?.provider ?? provider} className="input">
          <option value="iyzico">iyzico (TRY, USD, EUR)</option>
          <option value="kashier">Kashier (EGP, USD, EUR)</option>
          <option value="fawaterk">Fawaterk (EGP, USD, SAR, AED, EUR)</option>
        </select>
        <FieldError id="f-payment-provider-error" error={state.errors?.provider} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save provider
        </SubmitButton>
      </div>
    </form>
  );
}

/** 37 Yallapp's Kashier account. */
export function KashierSettingForm({ merchantId, sandbox }: { merchantId: string; sandbox: boolean }) {
  const [state, action] = useActionState(saveKashierSettingAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field id="f-kashier-merchantId" label="Merchant ID" name="merchantId" autoComplete="off" placeholder="MID-1234-567" defaultValue={state.values?.merchantId ?? merchantId} error={state.errors?.merchantId} />
      <Field id="f-kashier-apiKey" label="Payment API key" name="apiKey" autoComplete="off" error={state.errors?.apiKey} />
      <Field id="f-kashier-secretKey" label="Secret key" name="secretKey" type="password" autoComplete="off" error={state.errors?.secretKey} />
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="sandbox" defaultChecked={state.values ? state.values.sandbox === "on" : sandbox} className="h-4 w-4 accent-midnight" />
        Test mode keys (test payments)
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Checking…">
          Save keys
        </SubmitButton>
      </div>
    </form>
  );
}

/** 37 Yallapp's Fawaterk account. */
export function FawaterkSettingForm({ sandbox }: { sandbox: boolean }) {
  const [state, action] = useActionState(saveFawaterkSettingAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field id="f-fawaterk-apiKey" label="API key" name="apiKey" type="password" autoComplete="off" error={state.errors?.apiKey} />
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="sandbox" defaultChecked={state.values ? state.values.sandbox === "on" : sandbox} className="h-4 w-4 accent-midnight" />
        Staging key (test payments)
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Checking…">
          Save key
        </SubmitButton>
      </div>
    </form>
  );
}

/** 37 "Test connection" with the saved keys: a call that changes nothing. */
export function TestPaymentAccountForm({ provider }: { provider: "iyzico" | "kashier" | "fawaterk" }) {
  const [state, action] = useActionState(testPaymentAccountAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-3">
      <input type="hidden" name="provider" value={provider} />
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={`m-0 flex-1 text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText="Testing…">
        Test connection
      </SubmitButton>
    </form>
  );
}

export function MarketplaceForm({ commission }: { commission: string }) {
  const [state, action] = useActionState(saveMarketplaceAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Commission (%)"
        name="commission"
        inputMode="decimal"
        defaultValue={state.values?.commission ?? commission}
        hint="Yallapp's share of each product sale; shipping goes to the shop in full."
        error={state.errors?.commission}
      />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save commission
        </SubmitButton>
      </div>
    </form>
  );
}

export function ContactForm({ whatsapp, email }: { whatsapp: string; email: string }) {
  const [state, action] = useActionState(saveContactAction, initialFormState);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp number" name="whatsapp" type="tel" defaultValue={v("whatsapp", whatsapp)} hint="As it should look, with the country code." error={state.errors?.whatsapp} />
        <Field label="Email" name="email" type="email" defaultValue={v("email", email)} error={state.errors?.email} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

/** 14.1 The address clients invite to their store and Firebase accounts. */
export function PublishingSettingForm({ teamEmail }: { teamEmail: string }) {
  const [state, action] = useActionState(savePublishingSettingAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Publishing team email"
        name="teamEmail"
        type="email"
        defaultValue={state.values?.teamEmail ?? teamEmail}
        hint="A Google account (for Google Play and Firebase) that also has an Apple Account. New publishing requests are emailed here too."
        error={state.errors?.teamEmail}
      />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

/** 25 Yallapp's partner app on Salla or Zid. */
export function PartnerAppForm({
  settingKey,
  name,
  clientId,
  saved,
  webhook,
}: {
  settingKey: "sallaApp" | "zidApp";
  name: string;
  clientId: string;
  /** Whether a client secret (and a webhook secret) is saved. */
  saved: { clientSecret: boolean; webhookSecret: boolean };
  /** Where the platform sends webhooks, when Yallapp reads them. */
  webhook: string | null;
}) {
  const [state, action] = useActionState(savePartnerAppAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="key" value={settingKey} />
      <Field label="Client ID" name="clientId" autoComplete="off" defaultValue={state.values?.clientId ?? clientId} error={state.errors?.clientId} />
      <Field
        label="Client Secret"
        name="clientSecret"
        type="password"
        autoComplete="off"
        placeholder={saved.clientSecret ? "Saved. Paste a new one to replace it." : ""}
        error={state.errors?.clientSecret}
      />
      <Field
        label="Webhook Secret (optional)"
        name="webhookSecret"
        type="password"
        autoComplete="off"
        placeholder={saved.webhookSecret ? "Saved. Paste a new one to replace it." : ""}
        hint={webhook ? `Checks the webhooks ${name} sends to ${webhook}.` : `Kept for ${name}'s webhooks; stores connect without it.`}
        error={state.errors?.webhookSecret}
      />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save {name} app
        </SubmitButton>
      </div>
    </form>
  );
}
