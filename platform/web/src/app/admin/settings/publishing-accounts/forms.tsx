"use client";

import { useActionState } from "react";
import { addPublishingAccountAction, moveAppAccountAction, removePublishingAccountAction, updatePublishingAccountAction } from "@/app/actions/admin-publishing-accounts";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 138 A new publishing account: its email and how many apps it takes. */
export function AddAccountForm({ defaultLimit }: { defaultLimit: number }) {
  const [state, action] = useActionState(addPublishingAccountAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label="Add a publishing account">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Email" name="email" type="email" dir="ltr" defaultValue={state.values?.email ?? ""} hint="The Google (and Apple) sign-in clients invite as admin." error={state.errors?.email} />
        <Field label="Apps it takes" name="limit" inputMode="numeric" defaultValue={state.values?.limit ?? ""} placeholder={String(defaultLimit)} hint={`Empty: ${defaultLimit}.`} error={state.errors?.limit} />
      </div>
      <div>
        <SubmitButton variant="main" className="h-10">
          Add account
        </SubmitButton>
      </div>
    </form>
  );
}

/** 138 One account: its limit, whether it takes new apps, and removing it. */
export function AccountForm({ account }: { account: { id: string; email: string; limit: number; active: boolean; apps: number } }) {
  const [state, action] = useActionState(updatePublishingAccountAction, initialFormState);
  const [removed, remove] = useActionState(removePublishingAccountAction, initialFormState);
  return (
    <div className="flex flex-col gap-3" data-publishing-account={account.email}>
      <form action={action} noValidate className="flex flex-wrap items-end gap-3" aria-label={`Publishing account ${account.email}`}>
        <input type="hidden" name="id" value={account.id} />
        <div className="w-[160px]">
          <Field label="Apps it takes" name="limit" inputMode="numeric" defaultValue={state.values?.limit ?? String(account.limit)} error={state.errors?.limit} />
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={state.values ? state.values.active === "on" : account.active} className="h-4 w-4 accent-midnight" />
          Takes new apps
        </label>
        <SubmitButton variant="secondary" className="h-10">
          Save
        </SubmitButton>
      </form>
      <form action={remove} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={account.id} />
        <SubmitButton variant="ghost" className="h-9 px-3 text-sm">
          Remove account
        </SubmitButton>
        <span className="text-xs text-muted">Only without apps.</span>
      </form>
      <FormMessage message={state.message ?? removed.message} ok={state.ok ?? removed.ok} />
    </div>
  );
}

/** 138 Admin › Publishing: move an app to another account. */
export function MoveAccountForm({ appId, current, accounts }: { appId: string; current: string | null; accounts: { id: string; label: string }[] }) {
  const [state, action] = useActionState(moveAppAccountAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" aria-label="Move to another publishing account">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="appId" value={appId} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`move-${appId}`} className="text-xs font-semibold text-muted">
          Move to
        </label>
        <select id={`move-${appId}`} name="account" defaultValue={current ?? ""} className="input input-sm">
          <option value="" disabled>
            Choose an account
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
        Move
      </SubmitButton>
    </form>
  );
}
