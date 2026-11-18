"use client";

import { createContext, useActionState, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { applyTemplateAction } from "@/app/actions/studio-market";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { initialFormState } from "@/lib/forms";
import type { CoverView } from "@/lib/studio-market/catalog";
import { Countdown } from "./countdown";
import { Board, WasPrice } from "./parts";
import { MarketPhones, TemplatePhone } from "./phone";

/**
 * 106.1 A template's page in the dashboard: its pages drawn in phones, in
 * light or dark and in each of its languages (the gallery), the demo to
 * tap through every page, and "Preview it on my app first": the same with
 * the buyer's app's name, logo and entries. Then "Apply to my app".
 */

export interface DemoPage {
  slug: string;
  title: string;
  view: CoverView;
}

export interface MineApp {
  id: string;
  name: string;
  logoUrl: string | null;
  /** The app's own entries for the lists (content kept in Yallapp); else the samples. */
  pickable: Pickable | null;
}

interface DemoState {
  pages: DemoPage[];
  languages: string[];
  samples: Pickable;
  mine: MineApp[];
  open: (mode: { mine: string | null; page?: number }) => void;
  selectedApp: string | null;
  selectApp: (id: string) => void;
}

const Context = createContext<DemoState | null>(null);

function useDemo(): DemoState {
  const value = useContext(Context);
  if (!value) throw new Error("useDemo needs TemplateDemo");
  return value;
}

const LANG_NAMES: Record<string, string> = { en: "EN", ar: "عربي", tr: "TR" }; // i18n-ok

export function TemplateDemo({ pages, languages, samples, mine, startOpen, title, children }: { pages: DemoPage[]; languages: string[]; samples: Pickable; mine: MineApp[]; startOpen: boolean; title: string; children: ReactNode }) {
  const [open, setOpen] = useState<{ mine: string | null; page: number } | null>(startOpen ? { mine: null, page: 0 } : null);
  const [selectedApp, selectApp] = useState<string | null>(mine[0]?.id ?? null);
  const value = useMemo<DemoState>(() => ({ pages, languages, samples, mine, open: (mode) => setOpen({ mine: mode.mine, page: mode.page ?? 0 }), selectedApp, selectApp }), [pages, languages, samples, mine, selectedApp]);
  return (
    <Context.Provider value={value}>
      <MarketPhones pickable={samples}>{children}</MarketPhones>
      {open ? <DemoDialog title={title} start={open.page} mine={mine.find((m) => m.id === open.mine) ?? null} onClose={() => setOpen(null)} /> : null}
    </Context.Provider>
  );
}

function Seg<T extends string>({ label, value, options, onChange, small = true }: { label: string; value: T; options: { value: T; label: string; icon?: Parameters<typeof Icon>[0]["name"] }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-none gap-0.5 rounded-xl border border-line bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border-0 ${small ? "h-[30px] px-[11px] text-[13px]" : "h-[34px] px-3.5 text-sm"} ${value === o.value ? "bg-midnight font-bold text-white" : "bg-transparent font-semibold text-ink-4 hover:text-midnight"}`}
          lang={o.value.length === 2 ? o.value : undefined}
        >
          {o.icon ? <Icon name={o.icon} size={17} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The pools of light under the stage's phones in the dark theme (B): ember in the middle, then violet. */
const POOLS = ["rgba(255,130,90,.7)", "rgba(255,90,31,.45)", "rgba(120,98,255,.5)"];

/**
 * The stage at the top of a template's page: its first three pages in
 * phones on the wall (A) or under the night's light (B), the template's
 * name beside them, and its own light/dark and language switches (the
 * phones' mode, not the dashboard's). A phone opens the demo on its page.
 */
export function TemplateStage({ crumbs, intro }: { crumbs: ReactNode; intro: ReactNode }) {
  const t = useDashT();
  const { pages, languages, open } = useDemo();
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState(languages[0] ?? "en");
  const shown = pages.slice(0, 3);
  // On the stage: the second page, the first in the middle, the third.
  const order = shown.length === 3 ? [1, 0, 2] : shown.length === 2 ? [1, 0] : [0];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {crumbs}
        <div className="flex flex-wrap items-center gap-2">
          {languages.length > 1 ? (
            <div role="group" aria-label={t("nav.languages")} className="mk-seg">
              {languages.map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} lang={l} className="h-[32px] px-3">
                  {LANG_NAMES[l] ?? l.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
          <div role="group" aria-label={t("studioMarket.lightDark")} className="mk-seg">
            {(["light", "dark"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={(mode === "dark") === dark} onClick={() => setDark(mode === "dark")} className="h-[32px] px-3.5">
                <Icon name={mode === "dark" ? "dark_mode" : "light_mode"} size={17} />
                {t(mode === "dark" ? "studioMarket.dark" : "studioMarket.light")}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid items-end gap-2 pt-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-5 lg:pt-3">
        <div className="flex flex-col gap-5 lg:pb-12">{intro}</div>
        <div className="mk-stagebox relative -mx-5 h-[410px] md:mx-0 lg:h-[600px]" data-stage={dark ? "dark" : "light"}>
          <span className="mk-stage-wash" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-9 flex origin-bottom scale-[0.66] items-end justify-center lg:bottom-10 lg:scale-100">
            {order.map((index) => {
              const p = shown[index]!;
              const side = order.length > 1 && index !== 0;
              const first = order.indexOf(index) === 0;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => open({ mine: null, page: index })}
                  className={`relative flex-none cursor-pointer border-0 bg-transparent p-0 ${side ? (first ? "z-[1] -me-10 mb-[30px] -rotate-6 rtl:rotate-6" : "z-[2] -ms-10 mb-[30px] rotate-6 rtl:-rotate-6") : "z-[3]"}`}
                >
                  <span className="sr-only">{t("studioMarket.showPage", { page: p.title })}</span>
                  <span className="mk-glow" style={{ "--mk-pool": POOLS[index] } as React.CSSProperties} />
                  <TemplatePhone view={p.view} width={side ? 200 : 250} dark={dark} lang={lang} className="mk-reflect" />
                </button>
              );
            })}
          </div>
          <span className="mk-plinth bottom-3 w-[80%] lg:w-[520px]" />
        </div>
      </div>
    </>
  );
}

/** The template's pages by name; each opens the demo on it. */
export function PageChips() {
  const t = useDashT();
  const { pages, open } = useDemo();
  return (
    <ul aria-label={t("studioMarket.pagesList")} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {pages.map((p, i) => (
        <li key={p.slug}>
          <button type="button" onClick={() => open({ mine: null, page: i })} className="mk-chip h-[34px] px-3.5 text-[13px]">
            {p.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "Try the demo" anywhere on the page. */
export function DemoButton({ className = "" }: { className?: string }) {
  const t = useDashT();
  const { open } = useDemo();
  return (
    <button type="button" onClick={() => open({ mine: null })} className={`mk-btn mk-btn-ghost ${className}`}>
      <Icon name="play_circle" size={22} filled />
      {t("studioMarket.tryDemo")}
    </button>
  );
}

/** Every page in a large phone, one at a time, with the list of pages. */
function DemoDialog({ title, start, mine, onClose }: { title: string; start: number; mine: MineApp | null; onClose: () => void }) {
  const t = useDashT();
  const { pages, languages, samples } = useDemo();
  const [index, setIndex] = useState(Math.min(start, pages.length - 1));
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState(languages[0] ?? "en");
  const close = useRef<HTMLButtonElement>(null);
  const page = pages[index];
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(pages.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [onClose, pages.length]);
  const view = useCallback(
    (p: DemoPage): CoverView => (mine ? { ...p.view, look: { ...p.view.look, name: mine.name, logoUrl: mine.logoUrl } } : p.view),
    [mine],
  );
  if (!page) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(14,13,36,0.72)] p-3 sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="demo-title" className="flex max-h-full w-full max-w-[940px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          <h2 id="demo-title" className="m-0 text-lg font-extrabold">
            {mine ? t("studioMarket.demoMine", { name: title, app: mine.name }) : t("studioMarket.demoTitle", { name: title })}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Seg
              label={t("studioMarket.lightDark")}
              value={dark ? "dark" : "light"}
              onChange={(v) => setDark(v === "dark")}
              options={[
                { value: "light", label: t("studioMarket.light"), icon: "light_mode" },
                { value: "dark", label: t("studioMarket.dark"), icon: "dark_mode" },
              ]}
            />
            {languages.length > 1 ? <Seg label={t("nav.languages")} value={lang} onChange={setLang} options={languages.map((l) => ({ value: l, label: LANG_NAMES[l] ?? l.toUpperCase() }))} /> : null}
            <button ref={close} type="button" onClick={onClose} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line-strong bg-white text-midnight">
              <Icon name="close" size={20} />
              <span className="sr-only">{t("studioMarket.close")}</span>
            </button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label={t("studioMarket.pagesList")} className="hidden border-e border-line-soft p-3 sm:block">
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {pages.map((p, i) => (
                <li key={p.slug}>
                  <button type="button" aria-current={i === index ? "page" : undefined} onClick={() => setIndex(i)} className={`flex w-full cursor-pointer items-center gap-2 rounded-[10px] border-0 px-3 py-2 text-start text-sm ${i === index ? "bg-peach font-bold text-midnight" : "bg-transparent text-ink-3 hover:bg-ivory"}`}>
                    <span className="w-5 text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <MarketPhones pickable={mine?.pickable ? { ...mine.pickable, samples: samples.samples } : samples}>
            <Board className="flex flex-col items-center gap-4 px-4 py-6">
              <TemplatePhone view={view(page)} width={300} dark={dark} lang={lang} scroll />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className={`${btn.secondary} h-10 cursor-pointer px-3`}>
                  <Icon name="arrow_back" size={18} />
                  <span className="sr-only">{t("studioMarket.previous")}</span>
                </button>
                <span className="text-sm font-semibold text-ink-4" aria-live="polite">
                  {t("studioMarket.pagePosition", { page: page.title, n: index + 1, total: pages.length })}
                </span>
                <button type="button" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={index === pages.length - 1} className={`${btn.secondary} h-10 cursor-pointer px-3`}>
                  <Icon name="arrow_forward" size={18} />
                  <span className="sr-only">{t("studioMarket.next")}</span>
                </button>
              </div>
            </Board>
          </MarketPhones>
        </div>
      </div>
    </div>
  );
}

/** The panel's "Apply to my app": which of the buyer's apps, "Preview it on my app first", and the answer. */
export function ApplyForm({ slug, apps, label }: { slug: string; apps: { id: string; name: string }[]; label: { apply: string } }) {
  const t = useDashT();
  const known = useKnownText();
  const { open, selectedApp, selectApp } = useDemo();
  const [state, action] = useActionState(applyTemplateAction, initialFormState);
  const chosen = state.values?.app ?? selectedApp ?? apps[0]?.id ?? "";
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="template" value={slug} />
      {state.ok ? (
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {known(state.message ?? "")}
          <span className="flex flex-wrap gap-2">
            <Link href="/dashboard/studio-market/mine" className={`${btn.secondary} h-9 px-3 text-sm`}>
              {t("studioMarket.navMine")}
            </Link>
          </span>
        </div>
      ) : (
        <FormMessage message={state.message} />
      )}
      {state.errors?.details ? (
        <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-[13px] text-danger">
          {state.errors.details.split("\n").map((line, i) => (
            <li key={i}>{known(line)}</li>
          ))}
        </ul>
      ) : null}
      {state.ok ? null : (
        <>
          <ApplySubmit>
            <Icon name="format_paint" size={22} />
            {label.apply}
          </ApplySubmit>
          <button type="button" onClick={() => open({ mine: chosen || null })} className="mk-btn mk-btn-ghost w-full">
            <Icon name="visibility" size={21} />
            {t("studioMarket.previewMine")}
          </button>
          <label className="mk-muted flex items-center justify-center gap-1.5 text-[13px]">
            <Icon name="smartphone" size={16} />
            {t("studioMarket.forLabel")}
            {apps.length > 1 ? (
              <select name="app" value={chosen} onChange={(e) => selectApp(e.target.value)} aria-label={t("studioMarket.chooseApp")} className="max-w-[200px] cursor-pointer rounded-lg border border-line-strong bg-white px-2 py-1 text-[13px] font-bold text-midnight">
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <b className="text-[var(--mk-ink)]">{apps[0]?.name}</b>
                <input type="hidden" name="app" value={apps[0]?.id ?? ""} />
              </>
            )}
          </label>
        </>
      )}
    </form>
  );
}

/** The ember "Apply to my app", busy while it is applied. */
function ApplySubmit({ children }: { children: ReactNode }) {
  const t = useDashT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="mk-btn mk-btn-ember mk-btn-lg w-full">
      {pending ? (
        <>
          <Icon name="progress_activity" size={22} className="animate-spin" />
          {t("studioMarket.applying")}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** 106.2 A paid plan on the template's page. */
export interface PlanChoice {
  period: string;
  name: string;
  /** "$24". */
  price: string;
  /** "$8/mo", or the lifetime line. */
  sub: string;
  best: boolean;
  /** 106.12 The plan's own price, struck through, when a price drop or a flash sale lowers it ("$24"); else null. */
  was: string | null;
  /** 106.12 When the flash sale that gives it its price ends (ISO); null without one. */
  flashEndsAt: string | null;
}

/**
 * 106.2 A paid template's plans with their billed prices, the one chosen
 * taken to checkout ("Apply to my app · $24"), where the app is chosen and
 * paid; and "Preview it on my app first".
 */
export function PlanPicker({ slug, plans, initial }: { slug: string; plans: PlanChoice[]; initial: string }) {
  const t = useDashT();
  const { open, mine } = useDemo();
  const [plan, setPlan] = useState(initial);
  const chosen = plans.find((p) => p.period === plan) ?? plans[0]!;
  return (
    <div className="flex flex-col gap-3.5">
      <span className="mk-small">{t("studioMarket.choosePlan")}</span>
      <div role="radiogroup" aria-label={t("studioMarket.choosePlan")} className="grid grid-cols-2 gap-x-2.5 gap-y-3.5 pt-1.5">
        {plans.map((p) => (
          <button key={p.period} type="button" role="radio" aria-checked={plan === p.period} data-plan={p.period} onClick={() => setPlan(p.period)} aria-current={plan === p.period ? "true" : undefined} className="mk-plan cursor-pointer text-start">
            {p.best ? <span className="mk-pill mk-pill-ink absolute -top-3 end-3 h-[22px] text-[11px]">{t("studioMarket.bestValue")}</span> : null}
            <span className="text-[13px] font-bold opacity-75">{p.name}</span>
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <b className="text-[20px] tracking-[-0.02em]">{p.price}</b>
              {p.was ? <WasPrice text={p.was} className="text-xs" /> : null}
            </span>
            <span className="text-xs opacity-75">{p.sub}</span>
          </button>
        ))}
      </div>
      {chosen.flashEndsAt ? (
        <p className="mk-sale-time m-0 flex flex-wrap items-center gap-x-2 text-[13px] font-bold">
          <Icon name="bolt" size={17} filled />
          {t("marketDiscounts.flashPill")}
          <Countdown endsAt={chosen.flashEndsAt} />
        </p>
      ) : null}
      <Link href={`/dashboard/studio-market/checkout/${slug}?plan=${chosen.period}`} className="mk-btn mk-btn-ember mk-btn-lg w-full">
        <Icon name="format_paint" size={22} />
        {t("studioMarket.applyPaid", { price: chosen.price })}
      </Link>
      {mine.length ? (
        <button type="button" onClick={() => open({ mine: mine[0]!.id })} className="mk-btn mk-btn-ghost w-full">
          <Icon name="visibility" size={21} />
          {t("studioMarket.previewMine")}
        </button>
      ) : null}
    </div>
  );
}
