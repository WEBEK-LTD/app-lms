"use client";

import { useActionState } from "react";
import { saveInvoiceSettingAction } from "@/app/actions/admin-invoice";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { INVOICE_LINES_MAX } from "@/lib/receipts/invoice-setting";

/** 71 The lines under Yallapp's name on the receipts of its plans. */
export function InvoiceSettingForm({ lines }: { lines: string[] }) {
  const [state, action] = useActionState(saveInvoiceSettingAction, initialFormState);
  const error = state.errors?.lines;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="f-invoice-lines" className="text-sm font-semibold">
          Lines under Yallapp&apos;s name
        </label>
        <textarea
          id="f-invoice-lines"
          name="lines"
          rows={INVOICE_LINES_MAX}
          className="input min-h-[110px] py-2.5"
          defaultValue={state.values?.lines ?? lines.join("\n")}
          aria-invalid={error ? true : undefined}
          aria-describedby={`f-invoice-lines-hint${error ? " f-invoice-lines-error" : ""}`}
        />
        <p id="f-invoice-lines-hint" className="m-0 text-[13px] text-muted">
          One per line, at most {INVOICE_LINES_MAX}, as they should appear: the company&apos;s legal name, its address, its tax or registration number. Leave it empty to show none.
        </p>
        <FieldError id="f-invoice-lines-error" error={error} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
