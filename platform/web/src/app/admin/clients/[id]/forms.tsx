"use client";

import { useActionState } from "react";
import { wordpressReadyAction } from "@/app/actions/admin";
import { checkConnectionAction, sendClientNotificationAction, setAppSwitchesAction } from "@/app/actions/admin-clients";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";

/** A notification to everyone using the client's app, sent with the dashboard's own sender. */
export function ClientNotificationForm({ clientId, appId, titleMax, bodyMax }: { clientId: string; appId: string; titleMax: number; bodyMax: number }) {
  const [state, action] = useActionState(sendClientNotificationAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        id={`f-notification-title-${appId}`}
        label="Title"
        name="title"
        required
        maxLength={titleMax}
        defaultValue={state.ok ? "" : state.values?.title}
        error={state.errors?.title}
        small
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-notification-body-${appId}`} className="text-sm font-semibold">
          Message
        </label>
        <textarea
          id={`f-notification-body-${appId}`}
          name="body"
          required
          rows={3}
          maxLength={bodyMax}
          defaultValue={state.ok ? "" : state.values?.body}
          className="input min-h-20 py-3"
          aria-invalid={state.errors?.body ? true : undefined}
          aria-describedby={state.errors?.body ? `f-notification-body-${appId}-error` : undefined}
        />
        <FieldError id={`f-notification-body-${appId}-error`} error={state.errors?.body} />
      </div>
      <SubmitButton className="h-10 self-start px-4 text-sm" pendingText="Sending…">
        Send to the app&apos;s users
      </SubmitButton>
    </form>
  );
}

/** 19 The WordPress site our team set up is ready: the app moves to it and the client is told. */
export function WordpressReadyForm({ clientId, appId, siteUrl }: { clientId: string; appId: string; siteUrl: string }) {
  const [state, action] = useActionState(wordpressReadyAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2.5">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="from" value="client" />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        id={`f-wordpress-site-${appId}`}
        label="Their new WordPress site"
        name="siteUrl"
        type="url"
        required
        defaultValue={state.values?.siteUrl ?? siteUrl}
        placeholder="https://academy.example"
        hint="The app moves to this site, and the client gets an email and a notice on their dashboard. Activating their license in the plugin on this site does the same."
        error={state.errors?.siteUrl}
        small
      />
      <SubmitButton className="h-9 self-start px-3 text-sm" pendingText="Saving…">
        WordPress is ready
      </SubmitButton>
    </form>
  );
}

/** Asks the app's website or platform whether it answers now. */
export function ConnectionCheckForm({ clientId, appId }: { clientId: string; appId: string }) {
  const [state, action] = useActionState(checkConnectionAction, { status: null });
  const status = state.status;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <SubmitButton variant="secondary" className="h-9 self-start px-3 text-sm" pendingText="Checking…">
        Check the connection now
      </SubmitButton>
      {status ? (
        <div role="status" className="flex flex-col gap-1 text-sm">
          <span className={`flex items-center gap-1.5 font-semibold ${status.ok ? "text-success" : "text-danger"}`}>
            <Icon name={status.ok ? "check_circle" : "error"} size={18} filled />
            {status.message}
          </span>
          {status.problems.length ? (
            <ul className="m-0 pl-5 text-[13px] text-ink-4">
              {status.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

/** 83.3 The app's switches for its modules and new features. */
export function AppSwitchesForm({
  clientId,
  appId,
  switches,
}: {
  clientId: string;
  appId: string;
  switches: { name: string; label: string; description: string; kind: "module" | "feature"; on: boolean }[];
}) {
  const [state, action] = useActionState(setAppSwitchesAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3" aria-label="App switches">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <FormMessage message={state.message} ok={state.ok} />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {switches.map((s) => (
          <li key={s.name}>
            <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input type="checkbox" name={s.name} defaultChecked={s.on} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col">
                <span className="font-semibold">
                  {s.label} <span className="text-xs font-normal text-muted">{s.kind === "module" ? "Module" : "New feature"}</span>
                </span>
                <span className="text-[13px] text-ink-4">{s.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <SubmitButton className="h-9 self-start px-3 text-sm" pendingText="Saving…">
        Save switches
      </SubmitButton>
    </form>
  );
}
