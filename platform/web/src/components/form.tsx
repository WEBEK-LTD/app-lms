"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useKnownText, useOptionalDashT } from "./dashboard-i18n";
import { Icon } from "./icon";
import { btn } from "./ui";

/** Labelled input with hint and error text wired to aria-describedby. */
export function Field({
  label,
  name,
  error,
  hint,
  small = false,
  className = "",
  ...input
}: {
  label: ReactNode;
  name: string;
  error?: string;
  hint?: ReactNode;
  small?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = input.id ?? `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={`input ${small ? "input-sm" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/**
 * 56 In the dashboard, server actions' English messages (and the lib
 * parsers' field errors) show in the dashboard's language when the catalogs
 * know them (`known` parts of src/i18n/dashboard); elsewhere as they are.
 */
export function FieldError({ id, error }: { id: string; error?: string }) {
  const known = useKnownText();
  if (!error) return null;
  return (
    <span id={id} className="text-[13px] font-semibold text-danger">
      {known(error)}
    </span>
  );
}

export function PasswordField({
  label,
  name,
  error,
  hint,
  autoComplete,
  aside,
  showLabel = "Show password",
  hideLabel = "Hide password",
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  autoComplete: string;
  aside?: ReactNode;
  /** 55 The eye button's names in the page's language. */
  showLabel?: string;
  hideLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className="input pe-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute end-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-midnight"
        >
          <Icon name={visible ? "visibility_off" : "visibility"} size={22} />
        </button>
      </div>
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** Submit button that shows progress while the form's action runs. */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
  name,
  value,
  disabled = false,
  describedBy,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof btn;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  const { pending } = useFormStatus();
  const t = useOptionalDashT();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-describedby={describedBy}
      className={`${btn[variant]} ${className}`}
    >
      {pending ? (
        <>
          <Icon name="progress_activity" size={20} className="animate-spin" />
          {pendingText ?? (t ? t("common.saving") : "Saving…")}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  const known = useKnownText();
  if (!message) return null;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}
    >
      {known(message)}
    </p>
  );
}
