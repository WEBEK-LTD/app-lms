"use client";

import { useActionState } from "react";
import { replyProductReviewAction } from "@/app/actions/product-reviews";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/** 212 The shop's one public reply under a product review (written again replaces it). */
export function ProductReviewReplyForm({ id, current }: { id: number; current: string }) {
  const t = useDashT();
  const [state, action] = useActionState(replyProductReviewAction, initialFormState);
  const field = `f-preply-${id}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={field} className="text-sm font-semibold">
          {t("community.yourReply")}
        </label>
        <textarea
          id={field}
          name="text"
          rows={3}
          maxLength={2000}
          defaultValue={state.ok ? current : (state.values?.text ?? current)}
          className="input min-h-20 py-3"
          aria-invalid={state.errors?.text ? true : undefined}
          aria-describedby={state.errors?.text ? `${field}-error` : `${field}-hint`}
        />
        <span id={`${field}-hint`} className="text-[13px] text-muted">
          {t("community.replyHint")}
        </span>
        <FieldError id={`${field}-error`} error={state.errors?.text} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.sending")}>
          {t("community.saveReply")}
        </SubmitButton>
      </div>
    </form>
  );
}
