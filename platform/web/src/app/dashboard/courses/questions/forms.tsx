"use client";

import { useActionState } from "react";
import { answerQuestionAction } from "@/app/actions/course-community";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/** 63 The business's answer under a student's question. */
export function AnswerForm({ id }: { id: number }) {
  const t = useDashT();
  const [state, action] = useActionState(answerQuestionAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-answer" className="text-sm font-semibold">
          {t("community.yourAnswer")}
        </label>
        <textarea
          id="f-answer"
          name="text"
          rows={4}
          maxLength={2000}
          defaultValue={state.ok ? "" : state.values?.text}
          className="input min-h-24 py-3"
          aria-invalid={state.errors?.text ? true : undefined}
          aria-describedby={state.errors?.text ? "f-answer-error" : "f-answer-hint"}
        />
        <span id="f-answer-hint" className="text-[13px] text-muted">
          {t("community.answerHint")}
        </span>
        <FieldError id="f-answer-error" error={state.errors?.text} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.sending")}>
          {t("community.send")}
        </SubmitButton>
      </div>
    </form>
  );
}
