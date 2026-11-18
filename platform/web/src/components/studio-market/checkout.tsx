"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { checkoutTemplateAction } from "@/app/actions/studio-market";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { initialFormState } from "@/lib/forms";
import type { CoverView } from "@/lib/studio-market/catalog";
import { Countdown } from "./countdown";
import { WasPrice } from "./parts";
import { TemplatePhone } from "./phone";

/**
 * 106.2 Checkout (screen 3): the plan, the app it goes on (the apps of the
 * template's kinds; the others greyed out with the reason), the payment on
 * the gateway's own page, and the summary with the no-refunds consent next
 * to Pay. Or a renewal: only the plan, extending from the end date. Every
 * amount here is the server's, already formatted; the form sends only the
 * choices, 106.12 the code the page applied and the total shown, which the
 * server works out again (a total that isn't its own is refused, and the
 * page asked again). A code is applied by asking the page again with it
 * (`?code=`): each plan then shows the better of its sale price or the code.
 */

export interface CheckoutPlan {
  period: string;
  name: string;
  /** 106.12 What the buyer pays now, in US cents (sent with the payment, worked out again there). */
  cents: number;
  /** "$24": the price now (after a discount). */
  price: string;
  /** 106.12 The plan's own price, struck through, when a discount lowers it; else null. */
  list: string | null;
  /** 106.12 The discount it gets: "Flash sale", "Price drop" or "Code LALE30", and "−$7.20". */
  discount: { label: string; amount: string; kind: "drop" | "flash" | "coupon" } | null;
  /** 106.12 The flash sale's end, when it gives the price (ISO). */
  flashEndsAt: string | null;
  /** 106.12 What the code does on this plan: better, not better than the sale, or not for this plan. */
  codeNote: { tone: "good" | "info" | "warn"; text: string } | null;
  /** "$8/mo", or the lifetime line. */
  sub: string;
  /** "EGP 1,200", when the gateway charges another currency. */
  charged: string | null;
  /** The end of the period bought now ("15 Feb 2027"), null for lifetime. */
  ends: string | null;
  best: boolean;
}

export interface CheckoutApp {
  id: string;
  name: string;
  icon: IconName;
  /** "Store · Studio project". */
  line: string;
  /** Why it can't take the template, or null. */
  problem: string | null;
}

export interface CheckoutProps {
  slug: string;
  title: string;
  /** "Atelier Kardelen". */
  designer: string;
  cover: CoverView | null;
  plans: CheckoutPlan[];
  apps: CheckoutApp[];
  initialPlan: string;
  initialApp: string;
  /** A renewal: its licence, the app it is on, and where the new period starts ("from 3 Mar 2027", "from today"). */
  renew: { licenceId: string; app: string | null; from: string } | null;
  afterEnd: "keep" | "restore";
  /** "Kashier". */
  provider: string;
  /** Why card payments can't be taken now; null when they can. */
  unavailable: string | null;
  /** 106.12 The code in the address: applied, or why not (a known message); null without one. */
  code: { value: string; applied: boolean; problem: string | null; summary: string | null } | null;
  /** 106.12 A discount runs or a code is applied: say they don't add up. */
  sale: boolean;
}

/** 106.12 "Discount code" with Apply: the page is asked again with the code, keeping the plan and the app. */
function CodeBox({ code, plan, app, renew, sale }: { code: CheckoutProps["code"]; plan: string; app: string; renew: string | null; sale: boolean }) {
  const t = useDashT();
  const known = useKnownText();
  const router = useRouter();
  const path = usePathname();
  const [typed, setTyped] = useState(code?.value ?? "");
  const [pending, start] = useTransition();
  const go = (value: string) => {
    const params = new URLSearchParams({ plan });
    if (renew) params.set("renew", renew);
    else params.set("app", app);
    if (value.trim()) params.set("code", value.trim());
    start(() => router.replace(`${path}?${params}`, { scroll: false }));
  };
  const applied = Boolean(code?.applied && typed.trim() && typed.trim().toUpperCase() === code.value);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="discount-code" className="text-[13px] font-bold">
        {t("marketDiscounts.codeLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="discount-code"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            // Enter applies the code; it never pays.
            if (e.key === "Enter") {
              e.preventDefault();
              go(typed);
            }
          }}
          placeholder={t("marketDiscounts.codePlaceholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          maxLength={40}
          aria-describedby={code ? "code-message" : undefined}
          className="input h-11 min-w-0 flex-1 uppercase"
        />
        {applied ? (
          <button
            type="button"
            onClick={() => {
              setTyped("");
              go("");
            }}
            className="mk-btn mk-btn-ghost h-11 px-4 text-sm"
            disabled={pending}
          >
            {t("marketDiscounts.codeRemove")}
          </button>
        ) : (
          <button type="button" onClick={() => go(typed)} disabled={pending || !typed.trim()} className="mk-btn mk-btn-ink h-11 px-4 text-sm">
            {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
            {t("marketDiscounts.codeApply")}
          </button>
        )}
      </div>
      {code?.problem ? (
        <p id="code-message" role="alert" data-code-message className="m-0 flex items-start gap-1.5 text-[13px] font-semibold text-danger">
          <Icon name="error" size={17} className="mt-px flex-none" />
          <span>{known(code.problem)}</span>
        </p>
      ) : code?.summary ? (
        <p id="code-message" role="status" data-code-message className="m-0 flex items-start gap-1.5 text-[13px] font-semibold text-success">
          <Icon name="check_circle" size={17} filled className="mt-px flex-none" />
          <span>{code.summary}</span>
        </p>
      ) : null}
      {sale ? <p className="mk-muted m-0 text-[12px] leading-normal">{t("marketDiscounts.noStack")}</p> : null}
    </div>
  );
}

function Pay({ label, disabled }: { label: string; disabled: boolean }) {
  const t = useDashT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="mk-btn mk-btn-ember mk-btn-lg w-full">
      {pending ? <Icon name="progress_activity" size={22} className="animate-spin" /> : <Icon name="lock" size={22} />}
      {pending ? t("studioMarket.paying") : label}
    </button>
  );
}

export function CheckoutForm(props: CheckoutProps) {
  const t = useDashT();
  const known = useKnownText();
  const router = useRouter();
  const [state, action] = useActionState(checkoutTemplateAction, initialFormState);
  const [plan, setPlan] = useState(state.values?.plan || props.initialPlan);
  const [app, setApp] = useState(state.values?.app || props.initialApp);
  const [consent, setConsent] = useState(state.values?.consent === "on");
  const chosen = props.plans.find((p) => p.period === plan) ?? props.plans[0]!;
  // 106.12 The price changed (a sale ended, a code was used up): the page is asked again for the prices now.
  const stale = Boolean(state.errors?.price || state.errors?.code);
  useEffect(() => {
    if (stale) router.refresh();
  }, [stale, state, router]);
  const appName = props.renew ? props.renew.app : app === "later" ? null : (props.apps.find((a) => a.id === app)?.name ?? null);
  const section = (n: string, title: string, children: React.ReactNode, aside?: React.ReactNode) => (
    <section className="flex flex-col gap-4 border-t border-[var(--mk-hair)] pt-8" aria-labelledby={`h-${n}`}>
      <div className="flex items-end justify-between gap-3">
        <h2 id={`h-${n}`} className="m-0 flex items-baseline gap-3 text-[24px] font-extrabold tracking-[-0.02em] md:text-[28px]">
          <span className="text-sm font-bold text-[var(--mk-accent)]">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
  return (
    <form action={action} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <input type="hidden" name="template" value={props.slug} />
      {props.renew ? <input type="hidden" name="renew" value={props.renew.licenceId} /> : null}
      {/* 106.12 The code the page applied, and the total shown: the server works both out again. */}
      {props.code?.applied ? <input type="hidden" name="code" value={props.code.value} /> : null}
      <input type="hidden" name="total" value={chosen.cents} />
      <div className="flex min-w-0 flex-col gap-8">
        {section(
          "01",
          t("studioMarket.stepPlan"),
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="sr-only">{t("studioMarket.stepPlan")}</legend>
            {props.plans.map((p) => (
              <label key={p.period} data-plan={p.period} className={`mk-panel flex cursor-pointer items-center gap-4 rounded-[18px] px-4 py-4 md:px-5 ${plan === p.period ? "mk-current" : ""}`}>
                <input type="radio" name="plan" value={p.period} checked={plan === p.period} onChange={() => setPlan(p.period)} className="h-5 w-5 flex-none accent-[var(--color-midnight)]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-[16px]">{p.name}</b>
                    {p.best ? <span className="mk-pill mk-pill-ink static">{t("studioMarket.bestValue")}</span> : null}
                  </span>
                  <span className="mk-muted text-[13px]">{p.sub}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="flex flex-wrap items-baseline justify-end gap-x-1.5">
                    {p.list ? <WasPrice text={p.list} /> : null}
                    <b className="text-[19px] tracking-[-0.02em]">{p.price}</b>
                  </span>
                  {p.charged ? <span className="mk-muted text-xs">{p.charged}</span> : null}
                </span>
              </label>
            ))}
          </fieldset>,
        )}
        {props.renew
          ? section(
              "02",
              t("studioMarket.renewWhen"),
              <p className="m-0 flex items-start gap-2 text-[15px] leading-relaxed">
                <Icon name="event" size={20} className="mt-0.5 flex-none text-[var(--mk-accent)]" />
                <span>{props.renew.app ? t("studioMarket.renewOnApp", { app: props.renew.app, from: props.renew.from }) : t("studioMarket.renewFrom", { from: props.renew.from })}</span>
              </p>,
            )
          : section(
              "02",
              t("studioMarket.stepApp"),
              <>
                <fieldset className="m-0 grid gap-2.5 border-0 p-0 sm:grid-cols-2">
                  <legend className="sr-only">{t("studioMarket.stepApp")}</legend>
                  {props.apps.map((a) => (
                    <label
                      key={a.id}
                      data-app={a.id}
                      className={`mk-panel flex items-start gap-3 rounded-[18px] px-4 py-4 ${a.problem ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${app === a.id ? "mk-current" : ""}`}
                    >
                      <input type="radio" name="app" value={a.id} checked={app === a.id} disabled={Boolean(a.problem)} onChange={() => setApp(a.id)} className="mt-1 h-5 w-5 flex-none accent-[var(--color-midnight)]" />
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-midnight text-ivory">
                        <Icon name={a.icon} size={22} filled />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <b dir="auto" className="truncate text-[15px]">
                          {a.name}
                        </b>
                        <span className="mk-muted text-[13px]">{a.line}</span>
                        <span className={`mt-1 flex items-start gap-1.5 text-[13px] ${a.problem ? "mk-muted" : ""}`}>
                          <Icon name={a.problem ? "block" : "check_circle"} size={16} filled={!a.problem} className={a.problem ? "" : "text-success"} />
                          <span>{a.problem ?? t("studioMarket.fitsSaved")}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                  <label data-app="later" className={`mk-panel flex cursor-pointer items-start gap-3 rounded-[18px] px-4 py-4 ${app === "later" ? "mk-current" : ""}`}>
                    <input type="radio" name="app" value="later" checked={app === "later"} onChange={() => setApp("later")} className="mt-1 h-5 w-5 flex-none accent-[var(--color-midnight)]" />
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[var(--mk-hair)]">
                      <Icon name="schedule" size={22} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <b className="text-[15px]">{t("studioMarket.applyLaterTitle")}</b>
                      <span className="mk-muted text-[13px]">{t("studioMarket.applyLaterText")}</span>
                    </span>
                  </label>
                </fieldset>
                <span className="mk-muted flex items-start gap-1.5 text-[13px]">
                  <Icon name="compare" size={16} />
                  <span>{t("studioMarket.moveNote")}</span>
                </span>
              </>,
            )}
        {section(
          "03",
          t("studioMarket.stepPayment"),
          <div className="flex flex-col gap-2.5">
            <p className="m-0 flex items-start gap-2 text-[15px] leading-relaxed">
              <Icon name="credit_card" size={20} className="mt-0.5 flex-none text-[var(--mk-accent)]" />
              <span>{t("studioMarket.payOnProvider", { provider: props.provider })}</span>
            </p>
            {chosen.charged ? (
              <p data-charge-line className="mk-muted m-0 text-[13px]">
                {t("studioMarket.chargeLine", { charged: chosen.charged, shown: chosen.price })}
              </p>
            ) : null}
          </div>,
        )}
      </div>

      <aside aria-label={t("studioMarket.summary")} className="mk-panel flex flex-col gap-5 rounded-[28px] p-5 md:p-6 lg:sticky lg:top-6">
        <div className="mk-tile flex h-[220px] justify-center overflow-hidden rounded-[20px] pt-5" aria-hidden="true">
          <TemplatePhone view={props.cover} width={150} />
        </div>
        <div className="flex flex-col gap-1">
          <h2 dir="auto" className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            {props.title}
          </h2>
          <span className="mk-muted text-[13px]">{[props.designer, chosen.name, appName ? t("studioMarket.forApp", { app: appName }) : null].filter(Boolean).join(" · ")}</span>
        </div>
        <CodeBox code={props.code} plan={chosen.period} app={app} renew={props.renew?.licenceId ?? null} sale={props.sale} />
        <div className="flex flex-col gap-2 border-t border-[var(--mk-hair)] pt-4 text-sm">
          <span className="flex justify-between gap-3">
            <span>{t("studioMarket.planLine", { plan: chosen.name })}</span>
            <span data-list>{chosen.list ?? chosen.price}</span>
          </span>
          {chosen.discount ? (
            <span data-discount={chosen.discount.kind} className="flex justify-between gap-3 font-semibold text-[var(--mk-accent)]">
              <span className="flex items-center gap-1.5">
                <Icon name={chosen.discount.kind === "coupon" ? "confirmation_number" : chosen.discount.kind === "flash" ? "bolt" : "sell"} size={17} />
                {chosen.discount.label}
              </span>
              <span dir="ltr">{chosen.discount.amount}</span>
            </span>
          ) : null}
          {chosen.flashEndsAt ? <Countdown endsAt={chosen.flashEndsAt} className="mk-sale-time text-[12.5px]" size={15} /> : null}
          {chosen.codeNote ? (
            <span data-code-note={chosen.codeNote.tone} className={`flex items-start gap-1.5 text-[12.5px] leading-normal ${chosen.codeNote.tone === "good" ? "text-success" : chosen.codeNote.tone === "warn" ? "text-warn" : "mk-muted"}`}>
              <Icon name={chosen.codeNote.tone === "good" ? "check_circle" : chosen.codeNote.tone === "warn" ? "warning" : "info"} size={16} className="mt-px flex-none" />
              <span>{chosen.codeNote.text}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-[var(--mk-hair)] pt-4">
          <b className="text-[15px]">{t("studioMarket.totalToday")}</b>
          <span className="flex flex-col items-end">
            <b data-total className="text-[34px] leading-none tracking-[-0.04em]">
              {chosen.price}
            </b>
            <span className="mk-muted text-[11px] font-bold tracking-[0.1em]">USD</span>
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px] leading-normal">
          <li className="flex items-start gap-2">
            <Icon name="event" size={17} className="mt-px flex-none" />
            <span>{chosen.ends ? t("studioMarket.endsNote", { date: chosen.ends }) : t("studioMarket.lifeNote")}</span>
          </li>
          {chosen.ends ? (
            <li className="flex items-start gap-2">
              <Icon name="history" size={17} className="mt-px flex-none" />
              <span>
                {props.afterEnd === "restore"
                  ? appName
                    ? t("studioMarket.thenRestore", { app: appName })
                    : t("studioMarket.thenRestoreNoApp")
                  : appName
                    ? t("studioMarket.thenKeep", { app: appName })
                    : t("studioMarket.thenKeepNoApp")}
              </span>
            </li>
          ) : null}
        </ul>
        <label className={`mk-tile flex cursor-pointer items-start gap-3 rounded-[16px] p-4 ${state.errors?.consent ? "ring-2 ring-danger" : ""}`}>
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-describedby="consent-hint" className="mt-0.5 h-5 w-5 flex-none accent-[var(--color-midnight)]" />
          <span className="flex flex-col gap-1">
            <b className="text-[14px] text-[var(--mk-ink)]">{t("studioMarket.consentTitle")}</b>
            <span id="consent-hint" className="mk-muted text-[12.5px]">
              {t("studioMarket.consentText")}
            </span>
          </span>
        </label>
        {state.message ? (
          <p role="alert" className="m-0 rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-semibold text-danger">
            {known(state.message)}
          </p>
        ) : null}
        {props.unavailable ? (
          <p role="status" className="m-0 rounded-xl bg-warn-bg px-3.5 py-2.5 text-sm font-semibold text-warn">
            {known(props.unavailable)}
          </p>
        ) : null}
        <Pay label={t("studioMarket.payButton", { price: chosen.price })} disabled={Boolean(props.unavailable)} />
        <p className="mk-muted m-0 text-center text-[12px] leading-normal">{t("studioMarket.cardNote", { provider: props.provider })}</p>
      </aside>
    </form>
  );
}
