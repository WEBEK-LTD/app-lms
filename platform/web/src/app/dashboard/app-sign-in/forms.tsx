"use client";

import { useActionState } from "react";
import {
  removeAppWhatsappAction,
  saveAppSignInAction,
  saveAppWhatsappAction,
  saveSignInMethodsAction,
  testAppWhatsappAction,
} from "@/app/actions/app-sign-in";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
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

/** 18 Phone, email or both. */
export function SignInMethodsForm({
  current,
  wordpress,
  emailPossible,
  note = null,
  chosen,
}: {
  current: "phone" | "email" | "both";
  wordpress: boolean;
  emailPossible: boolean;
  /** 19 Why email isn't offered, or how it works with the app's platform (emailSignInNote). */
  note?: string | null;
  chosen: boolean;
}) {
  const [state, action] = useActionState(saveSignInMethodsAction, initialFormState);
  const value = state.values?.methods ?? current;
  const error = state.errors?.methods;
  const emailHint = wordpress
    ? "With the email address and password of their account on your website."
    : "A 6-digit code by email. New customers sign up with their email address.";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={value}>
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
        <p className="m-0 text-sm leading-relaxed text-muted">
          {chosen
            ? "Your website gets this at the plugin's next license check (within 12 hours), or at once with Check now in the Yallapp plugin. It replaces the choice on the plugin's settings page."
            : "Not chosen here yet: your website uses the choice on the Yallapp plugin's settings page (phone by default). Saving here replaces it."}{" "}
          Email sign-in is for people who already have an account; new people sign up by phone or on your website.
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

export function AppSignInForm({ current }: { current: Record<string, string> }) {
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
          Apple and Google sign in to check the app before it goes live. This number signs in with this code; no message is sent.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Review phone number" name="reviewPhone" type="tel" defaultValue={v.reviewPhone} error={e.reviewPhone} />
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
