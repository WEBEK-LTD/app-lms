"use client";

import { useActionState, useState } from "react";
import { replyRatingAction } from "@/app/actions/designer-page";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

/** 106.14 The designer's one answer under a rating: written, changed or taken away. */
export function ReplyForm({ rating, reply }: { rating: string; reply: string }) {
  const t = useDashT();
  const [state, action] = useActionState(replyRatingAction, initialFormState);
  const saved = state.ok ? (state.values?.reply ?? "") : reply;
  const [open, setOpen] = useState(!saved);
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    if (state.ok) setOpen(!state.values?.reply);
  }
  const id = `reply-${rating}`;
  if (saved && !open)
    return (
      <div className="ms-4 flex flex-col gap-2 md:ms-8">
        <div className="mk-tile flex gap-2.5 rounded-2xl px-4 py-3" data-own-reply="">
          <Icon name="forum" size={18} className="mt-0.5 flex-none text-[var(--mk-accent)]" />
          <span className="flex min-w-0 flex-col gap-1">
            <b className="text-[13px]">{t("marketPage.yourReply")}</b>
            <span dir="auto" className="text-sm leading-relaxed whitespace-pre-line">
              {saved}
            </span>
          </span>
        </div>
        {state.ok ? <FormMessage ok message={state.message} /> : null}
        <span className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className={`${btn.ghost} h-9 cursor-pointer px-3 text-sm`}>
            <Icon name="edit" size={17} />
            {t("studioMarket.edit")}
          </button>
          <form action={action}>
            <input type="hidden" name="rating" value={rating} />
            <input type="hidden" name="remove" value="on" />
            <button type="submit" className={`${btn.ghost} h-9 cursor-pointer px-3 text-sm`}>
              <Icon name="delete" size={17} />
              {t("marketPage.replyRemove")}
            </button>
          </form>
        </span>
      </div>
    );
  return (
    <form action={action} className="ms-4 flex flex-col gap-2 md:ms-8" data-reply-form="">
      <input type="hidden" name="rating" value={rating} />
      <label htmlFor={id} className="text-sm font-semibold">
        {t("marketPage.replyLabel")}
      </label>
      <textarea id={id} name="reply" defaultValue={state.values?.reply ?? saved} maxLength={1000} rows={2} required className="input min-h-[72px] py-3" aria-describedby={`${id}-hint`} aria-invalid={state.errors?.reply ? true : undefined} />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {t("marketPage.replyHint")}
      </span>
      <FieldError id={`${id}-error`} error={state.errors?.reply} />
      {state.ok ? <FormMessage ok message={state.message} /> : null}
      <span>
        <SubmitButton className="h-10">{saved ? t("marketPage.replySave") : t("marketPage.replySend")}</SubmitButton>
      </span>
    </form>
  );
}
