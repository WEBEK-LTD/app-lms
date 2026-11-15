"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { decideReviewAction } from "@/app/actions/admin-market";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { MarketPhones, TemplatePhone } from "@/components/studio-market/phone";
import { btn } from "@/components/ui";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { initialFormState } from "@/lib/forms";
import type { CoverView } from "@/lib/studio-market/catalog";

/** 106.1 Admin › Studio Market › Review queue: the template drawn page by page, light or dark, in its languages. */
export function ReviewPreview({ pages, languages, samples }: { pages: { slug: string; title: string; view: CoverView }[]; languages: string[]; samples: Pickable }) {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState(languages[0] ?? "en");
  const [start, setStart] = useState(0);
  const per = 4;
  const shown = pages.slice(start, start + per);
  const seg = (on: boolean) => `inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[9px] border-0 px-[11px] text-[13px] ${on ? "bg-midnight font-bold text-white" : "bg-transparent font-semibold text-ink-4"}`;
  return (
    <MarketPhones pickable={samples}>
      <div className="market-board flex flex-col gap-3.5 rounded-2xl border border-line px-[18px] pt-4 pb-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Light or dark" className="inline-flex gap-0.5 rounded-xl border border-line bg-white p-1">
            <button type="button" aria-pressed={!dark} onClick={() => setDark(false)} className={seg(!dark)}>
              <Icon name="light_mode" size={16} />
              Light
            </button>
            <button type="button" aria-pressed={dark} onClick={() => setDark(true)} className={seg(dark)}>
              <Icon name="dark_mode" size={16} />
              Dark
            </button>
          </div>
          <div className="flex items-center gap-2">
            {languages.length > 1 ? (
              <div role="group" aria-label="Language" className="inline-flex gap-0.5 rounded-xl border border-line bg-white p-1">
                {languages.map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={seg(lang === l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="text-[13px] text-muted">{pages.length === 1 ? "1 screen" : `${pages.length} screens`}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3.5">
          {shown.map((p) => (
            <figure key={p.slug} className="m-0 flex flex-col items-center gap-1.5">
              <TemplatePhone view={p.view} width={150} dark={dark} lang={lang} />
              <figcaption className="max-w-[150px] truncate text-xs text-muted">{p.title}</figcaption>
            </figure>
          ))}
        </div>
        {pages.length > per ? (
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: Math.ceil(pages.length / per) }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Screens ${i * per + 1} to ${Math.min(pages.length, (i + 1) * per)}`}
                aria-pressed={start === i * per}
                onClick={() => setStart(i * per)}
                className={`h-1.5 cursor-pointer rounded-full border-0 p-0 ${start === i * per ? "w-[18px] bg-midnight" : "w-1.5 bg-line-strong"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </MarketPhones>
  );
}

/** The checklist and the decision: approve and publish, or request changes with notes (emailed to the designer). */
export function DecisionForm({ id, checks, next, mayDecide }: { id: string; checks: { key: string; label: string }[]; next: string | null; mayDecide: boolean }) {
  const [state, action] = useActionState(decideReviewAction, initialFormState);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  return (
    <form action={action} className="grid items-start gap-4 lg:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <section className="flex flex-col rounded-2xl border border-line bg-white px-[22px] py-5">
        <div className="flex items-center justify-between pb-2">
          <b className="text-base">Checklist</b>
          <span className="text-[13px] text-muted tabular-nums">
            {ticked.size}/{checks.length}
          </span>
        </div>
        {checks.map((c) => (
          <label key={c.key} className="flex cursor-pointer items-start gap-3 border-t border-line-soft py-2.5 text-sm">
            <input
              type="checkbox"
              name="check"
              value={c.key}
              disabled={!mayDecide}
              checked={ticked.has(c.key)}
              onChange={() =>
                setTicked((s) => {
                  const n = new Set(s);
                  if (n.has(c.key)) n.delete(c.key);
                  else n.add(c.key);
                  return n;
                })
              }
              className="mt-0.5 h-5 w-5 flex-none accent-[var(--color-midnight)]"
            />
            {c.label}
          </label>
        ))}
      </section>
      <section className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white px-[22px] py-5">
        <label htmlFor="f-notes" className="text-base font-bold">
          Notes to the designer
        </label>
        <textarea id="f-notes" name="notes" rows={5} maxLength={4000} defaultValue={state.values?.notes} disabled={!mayDecide} className="input min-h-[118px] py-3 leading-relaxed" aria-invalid={state.errors?.notes ? true : undefined} />
        <FieldError id="f-notes-error" error={state.errors?.notes} />
        <label htmlFor="f-team" className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <Icon name="lock" size={16} />
          Team-only note
        </label>
        <textarea id="f-team" name="teamNote" rows={2} maxLength={2000} defaultValue={state.values?.teamNote} disabled={!mayDecide} className="input min-h-[64px] py-2.5 text-sm" />
        <FieldError id="f-team-error" error={state.errors?.teamNote} />
        <FormMessage message={state.message} />
        {mayDecide ? (
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" name="decision" value="approve" className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-success px-5 text-[15px] font-bold text-white in-dark:text-[#0e0d24]">
              <Icon name="check_circle" size={20} />
              Approve and publish
            </button>
            <SubmitButton name="decision" value="changes" variant="danger" className="h-11">
              <Icon name="edit_note" size={20} />
              Request changes
            </SubmitButton>
            {next ? (
              <Link href={`/admin/market?id=${next}`} className={`${btn.ghost} h-11`}>
                Skip
                <Icon name="arrow_forward" size={18} />
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Your role can look at the queue but not decide.</p>
        )}
      </section>
    </form>
  );
}
