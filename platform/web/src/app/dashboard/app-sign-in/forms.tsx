"use client";

import { useActionState, useState } from "react";
import {
  removeAppWhatsappAction,
  saveAppMailAction,
  saveAppSignInAction,
  saveAppWhatsappAction,
  saveSignInMethodsAction,
  testAppMailAction,
  testAppWhatsappAction,
} from "@/app/actions/app-sign-in";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { MAIL_PRESETS, SECURITY_LABELS, mailPreset, type MailSecurity } from "@/lib/email/app-mail-presets";
import { initialFormState } from "@/lib/forms";

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

const METHODS = [
  { value: "phone", label: "Phone number", hint: "A 6-digit code on WhatsApp." },
  { value: "email", label: "Email address", hint: "" },
  { value: "both", label: "Phone number or email address", hint: "The app shows a Phone / Email switch." },
] as const;

/** 24 WordPress: how email sign-in works. */
const EMAIL_WAYS = [
  {
    value: "code",
    label: "With a code by email: anyone can sign up",
    hint: "A 6-digit code by email. People without an account on your website get one. Staff accounts that can edit your website sign in on the website, not by code. Needs version 0.3.5 or later of the Yallapp plugin.",
  },
  { value: "password", label: "With their password: existing accounts only", hint: "The email address and password of their account on your website. New people sign up by phone or on your website." },
] as const;

/** 18 Phone, email or both. */
export function SignInMethodsForm({
  current,
  wordpress,
  emailPossible,
  note = null,
  chosen,
  emailWay = "password",
  emailWayChosen = false,
}: {
  current: "phone" | "email" | "both";
  wordpress: boolean;
  emailPossible: boolean;
  /** 19 Why email isn't offered, or how it works with the app's platform (emailSignInNote). */
  note?: string | null;
  chosen: boolean;
  /** 24 WordPress: email with a code or with the password. */
  emailWay?: "code" | "password";
  emailWayChosen?: boolean;
}) {
  const [state, action] = useActionState(saveSignInMethodsAction, initialFormState);
  const value = state.values?.methods ?? current;
  const way = state.values?.emailSignIn || emailWay;
  const error = state.errors?.methods;
  const emailHint = wordpress
    ? "With a code by email or with their password, as you choose below."
    : "A 6-digit code by email. New customers sign up with their email address.";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={`${value}-${way}`}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={error ? "methods-error" : undefined}>
        <legend className="sr-only">How people sign in</legend>
        {METHODS.map((m) => {
          const disabled = m.value !== "phone" && !emailPossible;
          return (
            <label key={m.value} className={`flex items-start gap-2.5 text-[15px] ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <input type="radio" name="methods" value={m.value} defaultChecked={value === m.value} disabled={disabled} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col">
                <span className="font-semibold">{m.label}</span>
                <span className="text-sm text-muted">{m.value === "email" ? emailHint : m.hint}</span>
              </span>
            </label>
          );
        })}
        <FieldError id="methods-error" error={error} />
      </fieldset>
      {/* 19 Why email isn't offered, or how it works with a course platform. */}
      {note ? <p className="m-0 text-sm leading-relaxed text-muted">{note}</p> : null}
      {wordpress ? (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.emailSignIn ? "email-way-error" : undefined}>
          <legend className="mb-1.5 text-[15px] font-bold">Email sign-in works</legend>
          {EMAIL_WAYS.map((w) => (
            <label key={w.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input type="radio" name="emailSignIn" value={w.value} defaultChecked={way === w.value} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col">
                <span className="font-semibold">{w.label}</span>
                <span className="text-sm text-muted">{w.hint}</span>
              </span>
            </label>
          ))}
          <FieldError id="email-way-error" error={state.errors?.emailSignIn} />
        </fieldset>
      ) : null}
      {wordpress ? (
        <p className="m-0 text-sm leading-relaxed text-muted">
          {chosen
            ? "Your website picks this up within 12 hours, or right away when you click Check now in the Yallapp plugin. It overrides the sign-in choice in the plugin's settings."
            : "Not chosen here yet, so your website uses the plugin's own setting (phone by default). Saving here overrides it."}
          {chosen && !emailWayChosen ? " Email sign-in uses passwords until you save a choice here." : ""}
        </p>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText="Saving…">
          Save sign-in methods
        </SubmitButton>
      </div>
    </form>
  );
}

/** 18 Codes from the owner's own WhatsApp number (WABEK), with a test. */
export function AppWhatsappForms({
  connected,
  defaultPhone,
  wordpress,
}: {
  connected: { keyLast4: string; instanceId: string | null } | null;
  defaultPhone: string;
  wordpress: boolean;
}) {
  const [state, action] = useActionState(saveAppWhatsappAction, initialFormState);
  const [test, testAction] = useActionState(testAppWhatsappAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {connected
          ? `Your app's codes go out from your own WhatsApp number on WABEK (API key ending ${connected.keyLast4}${connected.instanceId ? `, instance ${connected.instanceId}` : ""}).`
          : "Your app's codes go out from Yallapp's WhatsApp number, with your app's name. You can send them from your own WhatsApp number instead, with a WABEK account (waabek.com)."}
        {wordpress ? " This applies when the Yallapp plugin sends your website's codes (Sent by Yallapp)." : ""}
      </p>
      <form action={action} noValidate className="flex flex-col gap-4" key={state.ok ? "saved" : "form"}>
        <FormMessage message={state.message} ok={state.ok} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="WABEK API key"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={connected ? `•••• ${connected.keyLast4}` : ""}
            hint={connected ? "Paste a new key to replace the saved one. It's stored encrypted and never shown again." : "From your WABEK account. It's stored encrypted and never shown again."}
            error={e.apiKey}
          />
          <Field
            label="Instance ID"
            name="instanceId"
            autoComplete="off"
            defaultValue={state.values?.instanceId ?? connected?.instanceId ?? ""}
            hint="The WhatsApp number in WABEK that sends the codes. Optional: empty lets WABEK choose."
            error={e.instanceId}
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton className="h-11" pendingText="Saving…">
            Save WhatsApp number
          </SubmitButton>
        </div>
      </form>
      {connected ? (
        <>
          <form action={testAction} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
            <FormMessage message={test.message} ok={test.ok} />
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label="Send a test code to"
                name="phone"
                type="tel"
                defaultValue={test.values?.phone ?? defaultPhone}
                error={test.errors?.phone}
                className="min-w-[240px] flex-1"
              />
              <SubmitButton variant="secondary" className="h-11" pendingText="Sending…">
                Send a test code
              </SubmitButton>
            </div>
          </form>
          <form action={removeAppWhatsappAction} className="flex justify-end">
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText="Removing…">
              Use Yallapp&apos;s number again
            </SubmitButton>
          </form>
        </>
      ) : null}
    </div>
  );
}

export function AppSignInForm({ current, emailOnly = false }: { current: Record<string, string>; emailOnly?: boolean }) {
  const [state, action] = useActionState(saveAppSignInAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">New customers</legend>
        <Check name="signupAllowed" label="New customers can sign up in the app" checked={v.signupAllowed === "on"} />
        <span className="text-sm text-muted">Customers give their name when they sign up. Also ask for:</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check name="askEmail" label="Email" checked={v.askEmail === "on"} />
          <Check name="askCity" label="City" checked={v.askCity === "on"} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">Phone and devices</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Country code"
            name="defaultCountryCode"
            inputMode="numeric"
            defaultValue={v.defaultCountryCode}
            hint="Shown first on the sign-in screen, like 90 for Turkey."
            error={e.defaultCountryCode}
          />
          <Field
            label="Devices per customer"
            name="deviceLimit"
            inputMode="numeric"
            defaultValue={v.deviceLimit}
            hint="A customer at the limit signs out on another device first. 0 for no limit."
            error={e.deviceLimit}
          />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">Help and terms</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support WhatsApp" name="supportWhatsapp" type="tel" defaultValue={v.supportWhatsapp} hint="Shown in the app for help. Optional." error={e.supportWhatsapp} />
          <Field label="Terms page" name="termsUrl" type="url" defaultValue={v.termsUrl} placeholder="https://" hint="Linked from the sign-up screen. Optional." error={e.termsUrl} />
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1.5 text-[17px] font-bold">App store review</legend>
        <p className="m-0 text-sm leading-relaxed text-muted">
          Apple and Google sign in to check the app before it goes live. This number and this email address sign in with this code; no
          message is sent. {emailOnly ? "Your app signs in by email only, so reviewers need the review email address." : "Set the email address when your app offers email sign-in."}{" "}
          Give them to the stores with your notes for the reviewers on Publishing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Review phone number" name="reviewPhone" type="tel" defaultValue={v.reviewPhone} error={e.reviewPhone} />
          <Field
            label="Review email address"
            name="reviewEmail"
            type="email"
            autoComplete="off"
            defaultValue={v.reviewEmail}
            placeholder="review@your-site.com"
            error={e.reviewEmail}
          />
          <Field label="Review code" name="reviewCode" inputMode="numeric" autoComplete="off" maxLength={6} defaultValue={v.reviewCode} error={e.reviewCode} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

/** 24 What the page knows about the saved own email server (never the password). */
export interface SavedMailServer {
  host: string;
  username: string;
  fromName: string;
  fromAddress: string;
}

/** 24 "Your app's email": sent by Yallapp, or from the owner's own email server, with a test. */
export function AppMailForms({
  current,
  saved,
  defaultTestTo,
  production,
  wordpress,
}: {
  /** The form's values (appMailFormValues); the password is always empty. */
  current: Record<string, string>;
  saved: SavedMailServer | null;
  defaultTestTo: string;
  production: boolean;
  wordpress: boolean;
}) {
  const [state, action] = useActionState(saveAppMailAction, initialFormState);
  const [test, testAction] = useActionState(testAppMailAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {saved
          ? `Emails to the people using your app go out from ${saved.fromName} <${saved.fromAddress}>, through your email server (${saved.host}).`
          : "Emails to the people using your app, like sign-in codes, go out from Yallapp's address with your app's name. You can send them from your own address instead, through your email server."}{" "}
        {wordpress
          ? "This is for the sign-in codes Yallapp emails for your website. Your website's own emails, like password resets and order emails, still come from WordPress."
          : "Emails to you and your team always come from Yallapp."}
      </p>
      <MailServerForm key={JSON.stringify(v)} action={action} values={v} errors={e} message={state.message} ok={state.ok} saved={saved !== null} production={production} />
      {saved ? (
        <form action={testAction} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
          <FormMessage message={test.message} ok={test.ok} />
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="Send a test email to"
              name="to"
              type="email"
              autoComplete="email"
              defaultValue={test.values?.to ?? defaultTestTo}
              error={test.errors?.to}
              className="min-w-[240px] flex-1"
            />
            <SubmitButton variant="secondary" className="h-11" pendingText="Sending…">
              Send a test email
            </SubmitButton>
          </div>
          <p className="m-0 text-sm text-muted">It goes out through the saved settings. Save your changes first.</p>
        </form>
      ) : null}
    </div>
  );
}

function MailServerForm({
  action,
  values,
  errors,
  message,
  ok,
  saved,
  production,
}: {
  action: (formData: FormData) => void;
  values: Record<string, string>;
  errors: Record<string, string>;
  message?: string;
  ok?: boolean;
  saved: boolean;
  production: boolean;
}) {
  const [sender, setSender] = useState(values.sender === "own" ? "own" : "yallapp");
  const [presetId, setPresetId] = useState(values.preset || "google");
  const [host, setHost] = useState(values.host ?? "");
  const [port, setPort] = useState(values.port ?? "");
  const [security, setSecurity] = useState<string>(values.security ?? "ssl");
  const preset = mailPreset(presetId) ?? MAIL_PRESETS[0]!;
  const choose = (id: string) => {
    const next = mailPreset(id);
    setPresetId(id);
    if (next && next.host) {
      setHost(next.host);
      setPort(String(next.ports[0]!.port));
      setSecurity(next.ports[0]!.security);
    }
  };
  const securities: MailSecurity[] = production ? ["ssl", "starttls"] : ["ssl", "starttls", "none"];
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage message={message} ok={ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">Who sends your app&apos;s emails</legend>
        {[
          { value: "yallapp", label: "Sent by Yallapp", hint: "From Yallapp's address, with your app's name. Nothing to set up." },
          { value: "own", label: "My own email server", hint: "From your own address, like hello@your-site.com, through your email service." },
        ].map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input
              type="radio"
              name="sender"
              value={o.value}
              checked={sender === o.value}
              onChange={() => setSender(o.value)}
              className="mt-1 h-4 w-4 accent-midnight"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{o.label}</span>
              <span className="text-sm text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="sender-error" error={errors.sender} />
      </fieldset>

      {sender === "own" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-preset" className="text-sm font-semibold">
              Your email service
            </label>
            <select id="f-preset" name="preset" value={presetId} onChange={(event) => choose(event.target.value)} className="input">
              {MAIL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.hint})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-sand px-4 py-3.5">
            <p className="m-0 text-[15px] font-bold">How to set up {preset.name}</p>
            <ol className="m-0 mt-2 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-2">
              {preset.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" name="username" autoComplete="off" defaultValue={values.username} hint={preset.usernameHint} error={errors.username} />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={saved ? "•••••••• (saved)" : ""}
              hint={`${preset.passwordHint} Stored encrypted and never shown again.${saved ? " Leave blank to keep the saved one." : ""}`}
              error={errors.password}
            />
            <Field label="From name" name="fromName" autoComplete="off" defaultValue={values.fromName} hint="The name people see, usually your app's name." error={errors.fromName} />
            <Field
              label="From address"
              name="fromAddress"
              type="email"
              autoComplete="off"
              defaultValue={values.fromAddress}
              placeholder="hello@your-site.com"
              hint="Usually the same address as the username. Many services refuse other addresses."
              error={errors.fromAddress}
            />
            <Field
              label="Reply-to address"
              name="replyTo"
              type="email"
              autoComplete="off"
              defaultValue={values.replyTo}
              hint="Where replies go, if not to the From address. Optional."
              error={errors.replyTo}
            />
          </div>

          <details open={presetId === "custom" || Boolean(errors.host || errors.port || errors.security)} className="rounded-xl border border-line px-4 py-3">
            <summary className="cursor-pointer text-[15px] font-semibold">Server settings</summary>
            <p className="m-0 mt-2 text-sm text-muted">
              {presetId === "custom" ? "From your email service." : `Filled in for ${preset.name}. Change them only if your email service tells you to.`}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label="Server" name="host" autoComplete="off" value={host} onChange={(event) => setHost(event.target.value)} placeholder="smtp.example.com" error={errors.host} className="sm:col-span-3" />
              <Field
                label="Port"
                name="port"
                inputMode="numeric"
                autoComplete="off"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                placeholder="465"
                hint="465, 587, 25 or 2525."
                error={errors.port}
              />
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-security" className="text-sm font-semibold">
                  Security
                </label>
                <select
                  id="f-security"
                  name="security"
                  value={security}
                  onChange={(event) => setSecurity(event.target.value)}
                  className="input"
                  aria-invalid={errors.security ? true : undefined}
                  aria-describedby={errors.security ? "f-security-error" : undefined}
                >
                  {securities.map((s) => (
                    <option key={s} value={s}>
                      {SECURITY_LABELS[s]}
                    </option>
                  ))}
                </select>
                <FieldError id="f-security-error" error={errors.security} />
              </div>
            </div>
          </details>
        </>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText="Saving…">
          Save email settings
        </SubmitButton>
      </div>
    </form>
  );
}
