"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { FormMessage } from "@/components/form";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { initialFormState, type FormState } from "@/lib/forms";

/**
 * 105.4 A school page's form: its fields come from the page; the action's
 * message and the fields' problems show above the button. What was typed
 * stays when something is wrong; a form that adds is emptied once added.
 */
export function SchoolForm({
  action,
  submit,
  children,
  reset = false,
  className = "",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children: ReactNode;
  reset?: boolean;
  className?: string;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [state, run, pending] = useActionState(action, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && reset) form.current?.reset();
  }, [state, reset]);
  const problems = [...new Set(Object.values(state.errors ?? {}))];
  return (
    <form
      ref={form}
      noValidate
      className={`flex flex-col gap-4 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <FormMessage message={state.message} ok={state.ok} />
      {children}
      {problems.length ? (
        <ul role="alert" className="m-0 flex list-none flex-col gap-1 rounded-xl bg-danger-bg px-4 py-3 text-[14px] font-semibold text-danger">
          {problems.map((p) => (
            <li key={p}>{known(p)}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={`${btn.primary} h-10 px-4 text-[15px]`}>
          {pending ? (
            <>
              <Icon name="progress_activity" size={20} className="animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            submit
          )}
        </button>
      </div>
    </form>
  );
}

/** A labelled select of the page's choices. */
export function Choice({
  id,
  name,
  label,
  options,
  defaultValue = "",
  empty,
  className = "",
}: {
  id: string;
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  empty?: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className="input">
        {empty !== undefined ? <option value="">{empty}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
