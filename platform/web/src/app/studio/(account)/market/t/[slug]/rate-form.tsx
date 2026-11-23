"use client";

import { useActionState, useState } from "react";
import { rateTemplateAction } from "@/app/actions/designer-page";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

/**
 * 106.14 "Rate this template", for an account that got it: 1 to 5 stars
 * and an optional comment, once; sent again it changes their rating. Their
 * name shows as the page will show it ("Ahmed K.").
 */
export function RateForm({ slug, mine, name, designerName }: { slug: string; mine: { stars: number; comment: string; hidden: boolean; reply: string | null } | null; name: string; designerName: string }) {
  const t = useDashT();
  const [state, action] = useActionState(rateTemplateAction, initialFormState);
  const saved = state.ok ? { stars: Number(state.values?.stars), comment: state.values?.comment ?? "" } : mine;
  const [editing, setEditing] = useState(!mine);
  const [stars, setStars] = useState<number>(Number(state.values?.stars) || mine?.stars || 0);
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    if (state.ok) setEditing(false);
  }

  if (saved && !editing)
    return (
      <div className="mk-panel flex flex-col gap-3 rounded-[22px] px-5 py-4" data-my-rating={saved.stars}>
        <span className="flex flex-wrap items-center gap-3">
          <b className="text-[15px]">{t("marketPage.yourRating")}</b>
          <span dir="ltr" aria-label={t("marketPage.star", { count: saved.stars })} role="img" className="inline-flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Icon key={n} name="star" size={20} filled={n <= saved.stars} className={n <= saved.stars ? "text-[#f5a623]" : "opacity-30"} />
            ))}
          </span>
        </span>
        {saved.comment ? (
          <p dir="auto" className="m-0 text-[15px] whitespace-pre-line">
            {saved.comment}
          </p>
        ) : null}
        {mine?.hidden ? <p className="m-0 rounded-xl bg-warn-bg px-3.5 py-2 text-sm">{t("marketPage.hiddenMine")}</p> : null}
        {mine?.reply ? (
          <p dir="auto" className="m-0 text-sm text-muted">
            <b>{t("marketPage.replyFrom", { name: designerName })}: </b>
            {mine.reply}
          </p>
        ) : null}
        {state.ok ? <FormMessage ok message={state.message} /> : null}
        <span>
          <button type="button" onClick={() => setEditing(true)} className={`${btn.secondary} h-10 cursor-pointer`}>
            <Icon name="edit" size={18} />
            {t("marketPage.rateEdit")}
          </button>
        </span>
      </div>
    );

  return (
    <form action={action} className="mk-panel flex flex-col gap-4 rounded-[22px] px-5 py-5" data-rate-form="">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-1">
        <b className="text-lg">{mine ? t("marketPage.rateEdit") : t("marketPage.rateTitle")}</b>
        <span className="text-sm text-muted">{t("marketPage.rateHint", { name })}</span>
      </div>
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("marketPage.starsLabel")}</legend>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-lg p-0.5 focus-within:outline-2 focus-within:outline-[var(--color-ember)]">
              <input type="radio" name="stars" value={n} checked={stars === n} onChange={() => setStars(n)} className="sr-only" />
              <Icon name="star" size={32} filled={n <= stars} className={n <= stars ? "text-[#f5a623]" : "opacity-35"} />
              <span className="sr-only">{t("marketPage.star", { count: n })}</span>
            </label>
          ))}
        </div>
        <FieldError id="f-stars-error" error={state.errors?.stars} />
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-comment" className="text-sm font-semibold">
          {t("marketPage.commentLabel")}
        </label>
        <textarea id="f-comment" name="comment" defaultValue={state.values?.comment ?? mine?.comment ?? ""} maxLength={1000} rows={3} className="input min-h-[88px] py-3" aria-describedby="f-comment-hint" aria-invalid={state.errors?.comment ? true : undefined} />
        <span id="f-comment-hint" className="text-xs text-muted">
          {t("marketPage.commentHint")}
        </span>
        <FieldError id="f-comment-error" error={state.errors?.comment} />
      </div>
      <FormMessage message={state.errors?.form} />
      <span className="flex flex-wrap gap-2.5">
        <SubmitButton className="h-11" disabled={!stars}>
          {mine ? t("marketPage.rateSave") : t("marketPage.rateSend")}
        </SubmitButton>
        {mine ? (
          <button type="button" onClick={() => setEditing(false)} className={`${btn.ghost} h-11 cursor-pointer`}>
            {t("studioMarket.back")}
          </button>
        ) : null}
      </span>
    </form>
  );
}
