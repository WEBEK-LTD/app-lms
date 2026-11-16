"use client";

import { useActionState } from "react";
import { deleteRatingReplyAction, replyRatingAction } from "@/app/actions/rating-replies";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/**
 * 132 Under a customer's rating on the dashboard: the business's reply, to
 * write, change or remove. The customer sees it in the app in the
 * business's name.
 */
export function RatingReply({ source, id, reply }: { source: "food" | "market" | "ride"; id: number; reply: string | null }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(replyRatingAction, initialFormState);
  const f = `rating-reply-${source}-${id}`;
  return (
    <div className="flex flex-col gap-2" data-rating-reply={reply ? "replied" : "none"}>
      {reply ? (
        <div className="flex flex-col gap-1 rounded-xl bg-sand p-3 text-[15px]">
          <span className="text-[13px] font-bold text-muted">{t("food.yourReply")}</span>
          <span className="whitespace-pre-line" dir="auto">
            {reply}
          </span>
          <form action={deleteRatingReplyAction}>
            <input type="hidden" name="source" value={source} />
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="secondary" className="h-8 px-2.5 text-[13px]">
              {t("food.removeReply")}
            </SubmitButton>
          </form>
        </div>
      ) : null}
      <details className="rounded-xl border border-line p-3" open={Boolean(state.errors)}>
        <summary className="cursor-pointer text-[15px] font-semibold">{reply ? t("food.editReply") : t("food.replyToRating")}</summary>
        <form action={action} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="id" value={id} />
          <label htmlFor={f} className="text-sm font-semibold">
            {t("food.replyLabel")}
          </label>
          <textarea id={f} name="text" rows={3} maxLength={2000} className="input" defaultValue={state.values?.text ?? reply ?? ""} dir="auto" aria-describedby={`${f}-error`} />
          <FieldError id={`${f}-error`} error={state.errors?.text ? known(state.errors.text) : undefined} />
          <p className="m-0 text-xs text-ink-4">{t("food.replyHint")}</p>
          <div>
            <SubmitButton className="h-9 px-3 text-sm">{t("food.sendReply")}</SubmitButton>
          </div>
          <FormMessage message={state.message} ok={state.ok} />
        </form>
      </details>
    </div>
  );
}
