"use client";

import { useActionState } from "react";
import { activateClientAction, addClientAction, saveClientDetailsAction, uploadReleaseAction } from "@/app/actions/admin";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** Activates or extends one app's plan (each app of an account has its own). */
export function ActivateForm({
  clientId,
  appId = null,
  plan,
  activeUntil,
  pending,
  planNames,
  from,
}: {
  clientId: string;
  /** The app whose plan this is; null for a client without an app yet. */
  appId?: string | null;
  plan: "starter" | "pro";
  activeUntil: string;
  pending: boolean;
  planNames: { starter: string; pro: string };
  /** "client": the form is on the client's own page, which it goes back to. */
  from?: "client";
}) {
  const [state, action] = useActionState(activateClientAction, initialFormState);
  // Unique per app: the client's page has one form per app.
  const id = (name: string) => `f-${name}${appId ? `-${appId}` : ""}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      {appId ? <input type="hidden" name="appId" value={appId} /> : null}
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <FormMessage message={state.message} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("plan")} className="text-sm font-semibold">
          Plan
        </label>
        <select id={id("plan")} name="plan" className="input input-sm" defaultValue={state.values?.plan ?? plan}>
          <option value="starter">{planNames.starter}</option>
          <option value="pro">{planNames.pro}</option>
        </select>
        <FieldError id={`${id("plan")}-error`} error={state.errors?.plan} />
      </div>
      <Field
        id={id("activeUntil")}
        label="Active until"
        name="activeUntil"
        type="date"
        required
        defaultValue={state.values?.activeUntil ?? activeUntil}
        error={state.errors?.activeUntil}
        small
      />
      <Field
        id={id("paymentNote")}
        label="Payment note"
        name="paymentNote"
        placeholder="e.g. paid via bank transfer"
        defaultValue={state.values?.paymentNote}
        error={state.errors?.paymentNote}
        small
      />
      <SubmitButton className="h-11" pendingText={pending ? "Activating…" : "Saving…"}>
        {pending ? "Activate & send license" : "Save & notify client"}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">
        {pending
          ? "The client gets their license key and access to the setup wizard."
          : "Keeps the same license key. The client gets an email with the new date."}
      </span>
    </form>
  );
}

export function AddClientForm() {
  const [state, action] = useActionState(addClientAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} />
      <Field label="Full name" name="name" required defaultValue={v.name} error={state.errors?.name} small />
      <Field label="Email" name="email" type="email" required defaultValue={v.email} error={state.errors?.email} small />
      <Field label="WhatsApp number" name="whatsapp" type="tel" required defaultValue={v.whatsapp} error={state.errors?.whatsapp} small />
      <Field label="Website (optional)" name="siteUrl" type="url" defaultValue={v.siteUrl} error={state.errors?.siteUrl} small />
      <SubmitButton className="h-11" pendingText="Adding…">
        Add client
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">The client gets an email to set their password. Activate them after that.</span>
    </form>
  );
}

export function ClientDetailsForm({ clientId, name, whatsapp, siteUrl }: { clientId: string; name: string; whatsapp: string; siteUrl: string }) {
  const [state, action] = useActionState(saveClientDetailsAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="Full name" name="name" required defaultValue={v.name ?? name} error={state.errors?.name} small />
      <Field label="WhatsApp number" name="whatsapp" type="tel" required defaultValue={v.whatsapp ?? whatsapp} error={state.errors?.whatsapp} small />
      <Field label="Website (optional)" name="siteUrl" type="url" defaultValue={v.siteUrl ?? siteUrl} error={state.errors?.siteUrl} small />
      <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}

export function ReleaseForm() {
  const [state, action] = useActionState(uploadReleaseAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5" key={state.ok ? state.message : "form"}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-file" className="text-sm font-semibold">
          Plugin .zip
        </label>
        <input
          id="f-file"
          name="file"
          type="file"
          accept=".zip,application/zip"
          required
          aria-invalid={state.errors?.file ? true : undefined}
          aria-describedby={state.errors?.file ? "f-file-error" : undefined}
          className="block w-full min-w-0 rounded-[10px] border border-line-strong bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ivory file:px-3 file:py-2 file:font-semibold file:text-midnight"
        />
        <FieldError id="f-file-error" error={state.errors?.file} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Field className="flex-[1_1_110px]" label="Version" name="version" placeholder="0.2.0" required defaultValue={v.version} error={state.errors?.version} small />
        <Field className="flex-[1_1_110px]" label="Requires WordPress" name="requiresWp" required defaultValue={v.requiresWp ?? "6.0"} error={state.errors?.requiresWp} small />
        <Field className="flex-[1_1_110px]" label="Requires PHP" name="requiresPhp" required defaultValue={v.requiresPhp ?? "7.4"} error={state.errors?.requiresPhp} small />
        <Field className="flex-[1_1_110px]" label="Tested up to" name="testedWp" required defaultValue={v.testedWp} placeholder="6.8" error={state.errors?.testedWp} small />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-changelog" className="text-sm font-semibold">
          Changelog
        </label>
        <textarea
          id="f-changelog"
          name="changelog"
          rows={5}
          defaultValue={v.changelog}
          className="input"
          aria-describedby="f-changelog-hint"
          aria-invalid={state.errors?.changelog ? true : undefined}
        />
        <span id="f-changelog-hint" className="text-xs text-muted">
          Plain text. Lines starting with “- ” become a list in the WordPress update screen.
        </span>
        <FieldError id="f-changelog-error" error={state.errors?.changelog} />
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" name="published" defaultChecked={v.published === "on"} className="h-[18px] w-[18px] accent-midnight" />
        Publish now (sites get the update on their next check)
      </label>
      <SubmitButton className="h-11 self-start" pendingText="Uploading…">
        Upload release
      </SubmitButton>
    </form>
  );
}
