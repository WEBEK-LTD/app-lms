"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";

/** 106 A form's button that asks first (going back to an app's previous design, deleting a draft). */
export function ConfirmSubmit({ confirm, className = "", children }: { confirm: string; className?: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
