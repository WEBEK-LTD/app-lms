"use client";

import { useActionState } from "react";
import { inviteAdminAction, type InviteState } from "@/app/actions/admin-team";
import { CopyButton } from "@/components/copy-button";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";

export function InviteForm({ roles }: { roles: { id: string; label: string; text: string }[] }) {
  const [state, action] = useActionState<InviteState, FormData>(inviteAdminAction, {});
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      {state.link ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-sand p-3">
          <label htmlFor="f-invite-link" className="text-sm font-semibold">
            Set-password link
          </label>
          <input id="f-invite-link" readOnly value={state.link} className="input input-sm font-mono text-xs" />
          <span>
            <CopyButton value={state.link} label="Copy the link" />
          </span>
        </div>
      ) : null}
      <Field id="f-invite-name" label="Name" name="name" required defaultValue={v.name} error={state.errors?.name} small />
      <Field id="f-invite-email" label="Email" name="email" type="email" required defaultValue={v.email} error={state.errors?.email} small />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Role</legend>
        {roles.map((role) => (
          <label key={role.id} className="flex items-start gap-2 text-sm">
            <input type="radio" name="role" value={role.id} defaultChecked={(v.role ?? "support") === role.id} className="mt-0.5 h-4 w-4 accent-midnight" />
            <span>
              <span className="font-semibold">{role.label}</span>
              <span className="block text-[13px] text-muted">{role.text}</span>
            </span>
          </label>
        ))}
        <FieldError id="f-invite-role-error" error={state.errors?.role} />
      </fieldset>
      <SubmitButton className="h-11" pendingText="Inviting…">
        Invite
      </SubmitButton>
    </form>
  );
}
