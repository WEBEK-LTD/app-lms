"use client";

import { useActionState, useState } from "react";
import { saveIyzicoSettingAction, saveOtpSettingAction, saveSmtpSettingAction, sendTestEmailAction } from "@/app/actions/admin-settings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

type OtpKind = "whatsapp" | "webhook" | "off";

export function OtpSettingForm({
  current,
}: {
  current: { kind: OtpKind | null; phoneNumberId: string; template: string; language: string; url: string };
}) {
  const [state, action] = useActionState(saveOtpSettingAction, initialFormState);
  const [kind, setKind] = useState<OtpKind>((state.values?.kind as OtpKind | undefined) ?? current.kind ?? "whatsapp");
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const saved = current.kind === kind;
  const options: { id: OtpKind; title: string; text: string }[] = [
    { id: "whatsapp", title: "WhatsApp", text: "WhatsApp Cloud API with an approved authentication template." },
    { id: "webhook", title: "Our gateway", text: "We post each code to our SMS gateway, signed with a shared secret." },
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
