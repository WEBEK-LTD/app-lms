"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { deleteTemplateDraftAction, publishTemplateUpdateAction, saveTemplateStepAction, sendTemplateAction, startTemplateAction } from "@/app/actions/designer";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { ConfirmSubmit } from "@/components/studio-market/confirm";
import { PageThumb, TemplatePhone } from "@/components/studio-market/phone";
import { btn } from "@/components/ui";
import { initialFormState, type FormState } from "@/lib/forms";
import type { CoverView } from "@/lib/studio-market/catalog";

/**
 * 106.1 Publishing a template: each step its own form on one page (the
 * draft saved as the designer goes), as the owner approved it. Free only
 * for now: the plans step has the free template on.
 */

export type StepState = "done" | "cur" | "";

export function StepSection({ id, num, state, title, description, children, muted = false }: { id: string; num: number; state: StepState; title: string; description?: string; children: ReactNode; muted?: boolean }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`mk-panel flex min-w-0 scroll-mt-6 flex-col ${state === "cur" ? "mk-current" : ""} ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
        <StepNumber num={num} state={state} />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-h`} className="m-0 text-lg leading-snug font-bold">
            {title}
          </h2>
          {description ? <p className="m-0 text-sm leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4 px-5 pt-4 pb-6 sm:ps-16 sm:pe-6">{children}</div>
    </section>
  );
}

export function StepNumber({ num, state, small = false }: { num: number; state: StepState; small?: boolean }) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-extrabold ${small ? "h-[26px] w-[26px] text-[13px]" : "h-7 w-7 text-[13px]"} ${state === "done" ? "bg-success text-white in-dark:text-[#0e0d24]" : state === "cur" ? "bg-midnight text-white" : "bg-line-soft text-muted"}`}
    >
      {state === "done" ? <Icon name="check" size={small ? 16 : 17} /> : num}
    </span>
  );
}

function Saved({ state }: { state: FormState }) {
  const known = useKnownText();
  if (state.errors?.details) {
    return (
      <div className="flex flex-col gap-1.5">
        <FormMessage message={state.message} ok={state.ok} />
        <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-[13px] text-danger">
          {state.errors.details.split("\n").map((line, i) => (
            <li key={i}>{known(line)}</li>
          ))}
        </ul>
      </div>
    );
  }
  return <FormMessage message={state.message} ok={state.ok} />;
}

export interface ProjectChoice {
  id: string;
  name: string;
  meta: string;
  home: CoverView | null;
}

function ProjectCards({ projects, current }: { projects: ProjectChoice[]; current: string | null }) {
  const [chosen, setChosen] = useState(current ?? projects[0]?.id ?? "");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const on = chosen === p.id;
        return (
          <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-[14px] p-3 ${on ? "border-2 border-midnight bg-sand p-[11px]" : "border border-line bg-white"}`}>
            <span className="h-[58px] w-11 flex-none overflow-hidden rounded-[9px] border border-line">{p.home ? <PageThumb view={p.home} width={44} height={58} /> : null}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b className="truncate text-[15px]">{p.name}</b>
              <span className="text-xs text-muted">{p.meta}</span>
            </span>
            <input type="radio" name="app" value={p.id} checked={on} onChange={() => setChosen(p.id)} className="h-5 w-5 flex-none accent-[var(--color-midnight)]" />
          </label>
        );
      })}
    </div>
  );
}

/** Step 1 before there is a draft: choosing the project makes it. */
export function StartForm({ projects }: { projects: ProjectChoice[] }) {
  const t = useDashT();
  return (
    <form action={startTemplateAction} className="flex flex-col gap-4">
      <ProjectCards projects={projects} current={null} />
      <span className="flex items-start gap-1.5 text-[13px] text-muted">
        <Icon name="info" size={16} />
        <span>{t("studioMarket.s1Note")}</span>
      </span>
      <div>
        <SubmitButton className="h-11">
          {t("studioMarket.saveContinue")}
          <Icon name="arrow_forward" size={20} />
        </SubmitButton>
      </div>
    </form>
  );
}

/** The section after each step's, shown once the step is saved. */
const NEXT: Record<string, string> = { project: "step-texts", texts: "step-screens", screens: "step-kinds", kinds: "step-plans", plans: "step-after", after_end: "step-send" };

function StepForm({ id, step, children, locked }: { id: string; step: string; children: (state: FormState) => ReactNode; locked: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveTemplateStepAction, initialFormState);
  useEffect(() => {
    if (state.ok) document.getElementById(NEXT[step] ?? "")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state, step]);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {children(state)}
      <Saved state={state} />
      {locked ? null : (
        <div>
          <SubmitButton className="h-11">
            {t("studioMarket.saveContinue")}
            <Icon name="arrow_forward" size={20} />
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

export function ProjectForm({ id, projects, current, locked }: { id: string; projects: ProjectChoice[]; current: string | null; locked: boolean }) {
  const t = useDashT();
  return (
    <StepForm id={id} step="project" locked={locked}>
      {(state) => (
        <>
          <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{t("studioMarket.s1Title")}</legend>
            <ProjectCards projects={projects} current={current} />
          </fieldset>
          <FieldError id="f-app-error" error={state.errors?.app} />
          <span className="flex items-start gap-1.5 text-[13px] text-muted">
            <Icon name="info" size={16} />
            <span>{t("studioMarket.s1Note")}</span>
          </span>
        </>
      )}
    </StepForm>
  );
}

type Texts = Partial<Record<"en" | "ar" | "tr", { title: string; short: string; description: string }>>;
const LANG_TABS = [
  { lang: "en", name: "English" },
  { lang: "ar", name: "العربية" },
  { lang: "tr", name: "Türkçe" },
] as const; // i18n-ok

export function TextsForm({ id, texts, locked }: { id: string; texts: Texts; locked: boolean }) {
  const t = useDashT();
  const [tab, setTab] = useState<"en" | "ar" | "tr">("en");
  return (
    <StepForm id={id} step="texts" locked={locked}>
      {(state) => {
        const value = (lang: string, field: string) => state.values?.[`${lang}_${field}`] ?? texts[lang as "en"]?.[field as "title"] ?? "";
        const done = (lang: "en" | "ar" | "tr") => Boolean(texts[lang]?.title);
        const hasError = (lang: string) => ["title", "short", "description"].some((f) => state.errors?.[`${lang}_${f}`]);
        return (
          <>
            <div role="tablist" aria-label={t("studioMarket.s2Title")} className="flex gap-1 border-b border-line">
              {LANG_TABS.map(({ lang, name }) => (
                <button
                  key={lang}
                  type="button"
                  role="tab"
                  aria-selected={tab === lang}
                  lang={lang}
                  onClick={() => setTab(lang)}
                  className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-0 border-b-2 bg-transparent px-3.5 pt-2.5 pb-3 text-[15px] ${tab === lang ? "border-ember font-bold text-midnight" : "border-transparent font-semibold text-muted"} ${hasError(lang) ? "text-danger" : ""}`}
                >
                  {name}
                  {done(lang) ? <Icon name="check_circle" size={16} filled className="text-success" /> : lang === "tr" ? <span className="rounded-xl bg-line-soft px-[7px] py-px text-[11px] font-bold text-muted">{t("studioMarket.optional")}</span> : null}
                </button>
              ))}
            </div>
            {LANG_TABS.map(({ lang }) => (
              <fieldset key={lang} disabled={locked} hidden={tab !== lang} className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <TextField name={`${lang}_title`} label={t("studioMarket.titleLabel")} max={40} value={value(lang, "title")} error={state.errors?.[`${lang}_title`]} />
                  <TextField name={`${lang}_short`} label={t("studioMarket.shortLabel")} max={80} value={value(lang, "short")} error={state.errors?.[`${lang}_short`]} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`f-${lang}_description`} className="text-sm font-semibold">
                    {t("studioMarket.descriptionLabel")}
                  </label>
                  <textarea id={`f-${lang}_description`} name={`${lang}_description`} defaultValue={value(lang, "description")} maxLength={1200} rows={4} className="input min-h-[104px] py-3 leading-relaxed" aria-invalid={state.errors?.[`${lang}_description`] ? true : undefined} />
                  <FieldError id={`f-${lang}_description-error`} error={state.errors?.[`${lang}_description`]} />
                </div>
              </fieldset>
            ))}
            <span className="text-[12.5px] leading-normal text-muted">{t("studioMarket.textsHint")}</span>
          </>
        );
      }}
    </StepForm>
  );
}

function TextField({ name, label, max, value, error }: { name: string; label: string; max: number; value: string; error?: string }) {
  const [length, setLength] = useState(value.length);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center justify-between">
        <label htmlFor={`f-${name}`} className="text-sm font-semibold">
          {label}
        </label>
        <span id={`f-${name}-count`} className="text-xs font-medium text-muted tabular-nums" dir="ltr">
          {length}/{max}
        </span>
      </span>
      <input id={`f-${name}`} name={name} defaultValue={value} maxLength={max} onChange={(e) => setLength(e.target.value.length)} className="input" aria-describedby={`f-${name}-count`} aria-invalid={error ? true : undefined} />
      <FieldError id={`f-${name}-error`} error={error} />
    </div>
  );
}

export interface ScreenChoice {
  slug: string;
  title: string;
  view: CoverView;
}

const LANG_SHORT: Record<string, string> = { en: "EN", ar: "عربي", tr: "TR" }; // i18n-ok

export function ScreensForm({ id, pages, order, languages, locked }: { id: string; pages: ScreenChoice[]; order: string[]; languages: string[]; locked: boolean }) {
  const t = useDashT();
  const start = order.length ? [...order.filter((s) => pages.some((p) => p.slug === s)), ...pages.map((p) => p.slug).filter((s) => !order.includes(s))] : pages.map((p) => p.slug);
  const [list, setList] = useState<string[]>(start);
  const [shown, setShown] = useState<Set<string>>(new Set(order.length ? order : pages.map((p) => p.slug)));
  const [lang, setLang] = useState(languages[0] ?? "en");
  const [dark, setDark] = useState(false);
  const move = (slug: string, by: number) =>
    setList((l) => {
      const i = l.indexOf(slug);
      const j = i + by;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const picked = list.filter((s) => shown.has(s));
  return (
    <StepForm id={id} step="screens" locked={locked}>
      {() => (
        <>
          {picked.map((slug) => (
            <input key={slug} type="hidden" name="screen" value={slug} />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-xl bg-success-bg px-2.5 py-1 text-xs font-bold text-success">
              <Icon name="cloud_done" size={15} filled />
              {t("studioMarket.s3Auto", { count: pages.length })}
            </span>
            <div className="flex flex-wrap gap-2">
              <div role="group" aria-label={t("studioMarket.lightDark")} className="inline-flex gap-0.5 rounded-xl border border-line bg-white p-1">
                {(["light", "dark"] as const).map((mode) => (
                  <button key={mode} type="button" aria-pressed={dark === (mode === "dark")} onClick={() => setDark(mode === "dark")} className={`inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[9px] border-0 px-[11px] text-[13px] ${dark === (mode === "dark") ? "bg-midnight font-bold text-white" : "bg-transparent font-semibold text-ink-4"}`}>
                    <Icon name={mode === "dark" ? "dark_mode" : "light_mode"} size={17} />
                    {t(mode === "dark" ? "studioMarket.dark" : "studioMarket.light")}
                  </button>
                ))}
              </div>
              {languages.length > 1 ? (
                <div role="group" aria-label={t("nav.languages")} className="inline-flex gap-0.5 rounded-xl border border-line bg-white p-1">
                  {languages.map((l) => (
                    <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`inline-flex h-[30px] cursor-pointer items-center rounded-[9px] border-0 px-[11px] text-[13px] ${lang === l ? "bg-midnight font-bold text-white" : "bg-transparent font-semibold text-ink-4"}`}>
                      {LANG_SHORT[l] ?? l.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <ol className="relative m-0 flex list-none gap-3 overflow-x-auto p-0 pb-1">
            {list.map((slug, i) => {
              const page = pages.find((p) => p.slug === slug)!;
              const on = shown.has(slug);
              const cover = picked[0] === slug;
              return (
                <li key={slug} className="flex flex-none flex-col items-center gap-1.5">
                  <div className={`market-board relative h-[168px] overflow-hidden rounded-[14px] px-[9px] pt-[9px] ${cover ? "border-2 border-ember" : "border border-line"} ${on ? "" : "opacity-40"}`}>
                    <TemplatePhone view={page.view} width={86} lang={lang} dark={dark} />
                    {cover ? <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-xl bg-ember px-2 py-0.5 text-[11px] font-bold text-[#0e0d24]">{t("studioMarket.cover")}</span> : null}
                  </div>
                  <span className="max-w-[104px] truncate text-xs text-muted">{page.title}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" disabled={locked || i === 0} onClick={() => move(slug, -1)} className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-muted disabled:opacity-40">
                      <Icon name="arrow_back" size={16} />
                      <span className="sr-only">{`${t("studioMarket.moveUp")}: ${page.title}`}</span>
                    </button>
                    <label className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-line bg-white">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={locked}
                        onChange={() =>
                          setShown((s) => {
                            const next = new Set(s);
                            if (next.has(slug)) next.delete(slug);
                            else next.add(slug);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-[var(--color-midnight)]"
                      />
                      <span className="sr-only">{`${t("studioMarket.showIn")}: ${page.title}`}</span>
                    </label>
                    <button type="button" disabled={locked || i === list.length - 1} onClick={() => move(slug, 1)} className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-line bg-white text-muted disabled:opacity-40">
                      <Icon name="arrow_forward" size={16} />
                      <span className="sr-only">{`${t("studioMarket.moveDown")}: ${page.title}`}</span>
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          <span className="flex items-start gap-1.5 text-[13px] text-muted">
            <Icon name="info" size={16} />
            <span>{t("studioMarket.s3Hint")}</span>
          </span>
        </>
      )}
    </StepForm>
  );
}

export function KindsForm({ id, kinds, chosen, tags, locked }: { id: string; kinds: { id: string; name: string; icon: string }[]; chosen: string[]; tags: string[]; locked: boolean }) {
  const t = useDashT();
  const known = useKnownText();
  const [picked, setPicked] = useState<Set<string>>(new Set(chosen));
  return (
    <StepForm id={id} step="kinds" locked={locked}>
      {(state) => (
        <>
          <fieldset disabled={locked} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold">
              {t("studioMarket.kindsFits")} <span className="text-[13px] font-medium text-muted">· {t("studioMarket.upTo3")}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {kinds.map((kind) => {
                const on = picked.has(kind.id);
                return (
                  <label key={kind.id} className={`inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-full border px-[15px] text-sm ${on ? "border-midnight bg-midnight font-bold text-white" : "border-line bg-white text-midnight"}`}>
                    <input
                      type="checkbox"
                      name="kind"
                      value={kind.id}
                      checked={on}
                      onChange={() =>
                        setPicked((s) => {
                          const next = new Set(s);
                          if (next.has(kind.id)) next.delete(kind.id);
                          else if (next.size < 3) next.add(kind.id);
                          return next;
                        })
                      }
                      className="sr-only"
                    />
                    <Icon name={kind.icon as IconName} size={19} className={on ? "text-white" : "text-muted"} />
                    {known(kind.name)}
                    {on ? <Icon name="check" size={17} /> : null}
                  </label>
                );
              })}
            </div>
            <span className="text-[12.5px] text-muted">{t("studioMarket.kindsEngine")}</span>
            <FieldError id="f-kinds-error" error={state.errors?.kinds} />
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-tags" className="text-sm font-semibold">
              {t("studioMarket.tagsLabel")}
            </label>
            <input id="f-tags" name="tags" defaultValue={state.values?.tags ?? tags.join(", ")} disabled={locked} className="input" aria-describedby="f-tags-hint" aria-invalid={state.errors?.tags ? true : undefined} />
            <span id="f-tags-hint" className="text-[12.5px] text-muted">
              {t("studioMarket.tagsHint")}
            </span>
            <FieldError id="f-tags-error" error={state.errors?.tags} />
          </div>
        </>
      )}
    </StepForm>
  );
}

export function PlansForm({ id, locked }: { id: string; locked: boolean }) {
  const t = useDashT();
  return (
    <StepForm id={id} step="plans" locked={locked}>
      {() => (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-sand px-4 py-3">
            <span className="flex flex-col">
              <b className="text-[15px]">{t("studioMarket.freeTemplate")}</b>
              <span className="text-[13px] text-muted">{t("studioMarket.freeTemplateText")}</span>
            </span>
            <span role="switch" aria-checked="true" aria-disabled="true" aria-label={t("studioMarket.freeTemplate")} className="relative inline-block h-6 w-10 flex-none rounded-full bg-success after:absolute after:start-[19px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow" />
          </div>
          <span className="flex items-start gap-1.5 text-[13px] text-muted">
            <Icon name="info" size={16} />
            <span>{t("studioMarket.freeOnly")}</span>
          </span>
        </>
      )}
    </StepForm>
  );
}

export function AfterEndForm({ id, value, locked }: { id: string; value: "keep" | "restore"; locked: boolean }) {
  const t = useDashT();
  const [chosen, setChosen] = useState(value);
  const option = (v: "keep" | "restore", icon: IconName, title: string, text: string) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-[14px] p-4 ${chosen === v ? "border-2 border-midnight bg-sand p-[15px]" : "border border-line bg-white"}`}>
      <input type="radio" name="afterEnd" value={v} checked={chosen === v} disabled={locked} onChange={() => setChosen(v)} className="mt-0.5 h-5 w-5 flex-none accent-[var(--color-midnight)]" />
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          <Icon name={icon} size={20} className="text-accent" />
          {title}
        </span>
        <span className="text-sm leading-relaxed text-ink-4">{text}</span>
      </span>
    </label>
  );
  return (
    <StepForm id={id} step="after_end" locked={locked}>
      {(state) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {option("keep", "history", t("studioMarket.keepTitle"), t("studioMarket.keepText"))}
            {option("restore", "undo", t("studioMarket.restoreTitle"), t("studioMarket.restoreText"))}
          </div>
          <FieldError id="f-afterEnd-error" error={state.errors?.afterEnd} />
          <span className="flex items-start gap-1.5 text-[13px] text-muted">
            <Icon name="visibility" size={16} />
            <span>{t("studioMarket.afterNote")}</span>
          </span>
        </>
      )}
    </StepForm>
  );
}

export function SendForm({ id, checks, ready, note }: { id: string; checks: { label: string; ok: boolean }[]; ready: boolean; note: string }) {
  const t = useDashT();
  const [state, action] = useActionState(sendTemplateAction, initialFormState);
  const [rights, setRights] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <ul className="m-0 grid list-none gap-x-5 gap-y-2.5 p-0 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            <Icon name={c.ok ? "check_circle" : "radio_button_unchecked"} size={19} filled={c.ok} className={c.ok ? "text-success" : "text-faint"} />
            {c.label}
          </li>
        ))}
      </ul>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5 ${rights ? "border-2 border-midnight px-[15px] py-[13px]" : "border border-line-strong"}`}>
        <input type="checkbox" name="rights" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[var(--color-midnight)]" />
        <span className="text-sm">{t("studioMarket.rights")}</span>
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-semibold">
          {t("studioMarket.noteLabel")}
        </label>
        <textarea id="note" name="note" rows={3} maxLength={1000} defaultValue={state.values?.note ?? note} className="input min-h-[84px] py-3 leading-relaxed" />
      </div>
      <div className="flex gap-2.5 rounded-xl border border-line bg-sand px-4 py-3.5 text-sm leading-relaxed text-ink-2">
        <Icon name="schedule" size={20} className="text-muted" />
        <span>{t("studioMarket.reviewTime")}</span>
      </div>
      <Saved state={state} />
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton variant="main" className="h-[52px] text-base" disabled={!ready || !rights}>
          <Icon name="send" size={20} />
          {t("studioMarket.send")}
        </SubmitButton>
        <Link href="/designer/templates" className={`${btn.secondary} h-[52px] text-base`}>
          {t("studioMarket.saveDraft")}
        </Link>
      </div>
    </form>
  );
}

export function UpdateForm({ id, version }: { id: string; version: string }) {
  const t = useDashT();
  const [state, action] = useActionState(publishTemplateUpdateAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <p className="m-0 text-sm leading-relaxed text-ink-3">{t("studioMarket.updateText")}</p>
      <span className="text-[13px] text-muted">{version}</span>
      <Saved state={state} />
      <div>
        <SubmitButton variant="main" className="h-[52px] text-base">
          <Icon name="send" size={20} />
          {t("studioMarket.sendUpdate")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteDraft({ id }: { id: string }) {
  const t = useDashT();
  return (
    <form action={deleteTemplateDraftAction} className="flex justify-end">
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit confirm={t("studioMarket.deleteConfirm")} className={`${btn.ghost} h-10 cursor-pointer text-sm text-danger`}>
        <Icon name="delete" size={18} />
        {t("studioMarket.deleteDraft")}
      </ConfirmSubmit>
    </form>
  );
}
