"use client";

import { useActionState, useState } from "react";
import { cancelMoveAction, confirmMoveCodeAction, copyAppAction, createAppForClientAction, requestMoveAction, requestPlanMoveAction } from "@/app/actions/admin-apps";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";

/**
 * 132.111–132.115 The admin's forms for a client's apps: make an app for
 * them, move one (with what moves and what stays, live as the choices
 * change), the owner's code, copy one, or move only its plan.
 */

export interface StartGroup {
  label: string;
  options: { value: string; label: string }[];
}

/** 132.111 "Create an app for this client": what it starts from and its name. Opens it as the client. */
export function CreateAppForm({ clientId, groups }: { clientId: string; groups: StartGroup[] }) {
  const [state, action] = useActionState(createAppForClientAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-app-start" className="text-sm font-semibold">
          Starts from
        </label>
        <select id="f-app-start" name="start" required defaultValue={state.values?.start ?? ""} className="input input-sm" aria-invalid={state.errors?.start ? true : undefined} aria-describedby={state.errors?.start ? "f-app-start-error" : undefined}>
          <option value="" disabled>
            Choose a type or a Studio template
          </option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <FieldError id="f-app-start-error" error={state.errors?.start} />
      </div>
      <Field id="f-app-name" label="App name" name="name" required maxLength={30} defaultValue={state.values?.name} error={state.errors?.name} small />
      <SubmitButton className="h-10 self-start px-4 text-sm" pendingText="Creating…">
        <Icon name="add_circle" size={18} />
        Create it and open it as the client
      </SubmitButton>
    </form>
  );
}

const MOVES_ALWAYS = ["The app: its design, Studio project, pages and screens", "Its content, media, settings and languages", "Its builds and store listings", "Its integrations and keys (website, payments, push, stores)"];
const DATA = "Its data: customers and users, orders, bookings, payments, messages and activity";
const PLAN = "Its subscription: the plan or license, storage packs and renewal";

/** 132.112 The move's two choices, what moves and what stays as they change, and "Send approval code to the client". */
export function MoveRequestForm({ clientId, appId, toClientId, toName, ownerEmail }: { clientId: string; appId: string; toClientId: string; toName: string; ownerEmail: string }) {
  const [state, action] = useActionState(requestMoveAction, initialFormState);
  const [data, setData] = useState(true);
  const [plan, setPlan] = useState(true);
  const moves = [...MOVES_ALWAYS, ...(data ? [DATA] : []), ...(plan ? [PLAN] : [])];
  const stays = ["Past invoices, with the account that paid them", ...(data ? [] : [`${DATA}: archived and readable, never deleted`]), ...(plan ? [] : [`${PLAN}: the app arrives without a plan, like a new app`])];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="toClientId" value={toClientId} />
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">What goes with it</legend>
        <label className="flex items-start gap-2.5 rounded-xl border border-line p-3.5">
          <input type="checkbox" name="moveData" checked={data} onChange={(e) => setData(e.target.checked)} className="mt-1 h-4 w-4" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Move the app&apos;s data</span>
            <span className="text-sm text-muted">Customers and users, orders, bookings, messages and activity go to {toName}&apos;s account. Off: they stay in this account, archived and readable.</span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 rounded-xl border border-line p-3.5">
          <input type="checkbox" name="moveSubscription" checked={plan} onChange={(e) => setPlan(e.target.checked)} className="mt-1 h-4 w-4" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Move the subscription</span>
            <span className="text-sm text-muted">The plan or license and its renewal go to {toName}&apos;s account. Off: the app arrives there without a plan, like a new app, and this account keeps it.</span>
          </span>
        </label>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2" data-move-summary="">
        <div className="flex flex-col gap-1.5 rounded-xl bg-sand p-3.5">
          <span className="text-sm font-bold">Moves to {toName}</span>
          <ul className="m-0 flex flex-col gap-1 ps-5 text-sm">
            {moves.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-sand p-3.5">
          <span className="text-sm font-bold">Stays in this account</span>
          <ul className="m-0 flex flex-col gap-1 ps-5 text-sm">
            {stays.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <p role="note" className="m-0 flex items-start gap-2 rounded-xl bg-peach px-3.5 py-3 text-sm">
        <Icon name="info" size={18} />
        <span>
          Ask the client before moving data or subscriptions. Nothing is charged or refunded; the owner ({ownerEmail}) gets a 6-digit code by email and approves on their page, or gives you the code.
        </span>
      </p>
      <SubmitButton className="h-11 self-start px-5" pendingText="Sending…">
        <Icon name="send" size={18} />
        Send approval code to the client
      </SubmitButton>
    </form>
  );
}

/** 132.112 The code the owner gave: right, the move (or the plan move) happens now. */
export function MoveCodeForm({ requestId, label }: { requestId: string; label: string }) {
  const [state, action] = useActionState(confirmMoveCodeAction, initialFormState);
  return (
    <div className="flex flex-col gap-3">
      <form action={action} noValidate className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="requestId" value={requestId} />
        <FormMessage message={state.message} ok={state.ok} />
        <Field id="f-move-code" label="The client's code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} pattern="[0-9 ]*" dir="ltr" defaultValue={state.values?.code} error={state.errors?.code} small className="w-48" />
        <SubmitButton className="h-10 px-4 text-sm" pendingText="Moving…">
          {label}
        </SubmitButton>
      </form>
      <form action={cancelMoveAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
          Cancel the request
        </SubmitButton>
      </form>
    </div>
  );
}

/** 132.114 The copy's account (this one unless another was chosen) and its name. */
export function CopyAppForm({ clientId, appId, toClientId, defaultName }: { clientId: string; appId: string; toClientId: string; defaultName: string }) {
  const [state, action] = useActionState(copyAppAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="toClientId" value={toClientId} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field id="f-copy-name" label="The copy's name" name="name" required maxLength={60} defaultValue={state.values?.name ?? defaultName} error={state.errors?.name} small />
      <SubmitButton className="h-11 self-start px-5" pendingText="Copying…">
        <Icon name="content_copy" size={18} />
        Copy the app
      </SubmitButton>
    </form>
  );
}

/** 132.115 The app the plan goes to, and "Send approval code to the client". */
export function PlanMoveForm({ clientId, appId, toAppId }: { clientId: string; appId: string; toAppId: string }) {
  const [state, action] = useActionState(requestPlanMoveAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="toAppId" value={toAppId} />
      <FormMessage message={state.message} ok={state.ok} />
      <p role="note" className="m-0 flex items-start gap-2 rounded-xl bg-peach px-3.5 py-3 text-sm">
        <Icon name="info" size={18} />
        <span>Ask the client first. Nothing is charged or refunded; the owner gets a 6-digit code by email and approves on their page, or gives you the code.</span>
      </p>
      <SubmitButton className="h-11 self-start px-5" pendingText="Sending…">
        <Icon name="send" size={18} />
        Send approval code to the client
      </SubmitButton>
    </form>
  );
}
