"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/community/(site)/actions";
import { Note } from "./forms";

/** A form posted to a server action that answers with a note (done, or what went wrong) shown under it. */
export function ActionForm({ action, className, children }: { action: (prev: FormState, form: FormData) => Promise<FormState>; className?: string; children: ReactNode }) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className} aria-busy={pending}>
      <fieldset disabled={pending} style={{ display: "contents" }}>
        {children}
      </fieldset>
      <Note state={state} />
    </form>
  );
}
