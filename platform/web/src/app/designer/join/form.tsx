"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { joinDesignerAction } from "@/app/actions/designer";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

/**
 * 106.1 "Become a designer", as the owner approved it: four steps in one
 * card (the profile, the country, the terms with Yallapp's 25% share, then
 * Studio), sent at once when the terms are agreed to. A designer comes back
 * here to change their profile.
 */

export interface JoinProfile {
  name: string;
  slug: string;
  country: string;
  bio: string;
}

const slugOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

export function JoinForm({ profile, countries, joined, host }: { profile: JoinProfile | null; countries: { code: string; name: string }[]; joined: boolean; host: string }) {
  const t = useDashT();
  const member = profile !== null;
  const [state, action] = useActionState(joinDesignerAction, initialFormState);
  const values = { name: state.values?.name ?? profile?.name ?? "", slug: state.values?.slug ?? profile?.slug ?? "", country: state.values?.country ?? profile?.country ?? "", bio: state.values?.bio ?? profile?.bio ?? "" };
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(values.slug));
  const [country, setCountry] = useState(values.country);
  const [bio, setBio] = useState(values.bio);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(member ? 4 : 1);
  const [agreed, setAgreed] = useState(false);
  const [full, setFull] = useState(false);
  // An error sends them back to its step (an answer from the server, once).
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    const e = state.errors ?? {};
    if (e.name || e.slug || e.bio) setStep(1);
    else if (e.country) setStep(2);
    else if (e.terms) setStep(3);
    else if (state.ok && member) setStep(4);
  }
  const shownSlug = slugEdited ? slug : slugOf(name);
  const countryName = countries.find((c) => c.code === country)?.name ?? "";
  const progress = member ? 4 : step;

  const done = (num: number, title: string, summary: React.ReactNode, to: 1 | 2 | 3) => (
    <div className="flex items-center gap-3.5 border-b border-line-soft py-[18px]">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-success text-white in-dark:text-[#0e0d24]">
        <Icon name="check" size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-base">{title}</b>
        <span className="text-sm text-muted">{summary}</span>
      </div>
      <button type="button" onClick={() => setStep(to)} className="cursor-pointer border-0 bg-transparent text-sm font-semibold text-accent">
        {t("studioMarket.edit")}
        <span className="sr-only"> {title}</span>
      </button>
      <span className="sr-only">{num}</span>
    </div>
  );
  const head = (num: number, title: string, hint?: string, current = true) => (
    <div className="flex items-center gap-3.5">
      <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${current ? "bg-midnight text-white" : "bg-line-soft text-muted"}`}>{num}</span>
      <div className="flex flex-col gap-0.5">
        <b className="text-lg">{title}</b>
        {hint ? <span className="text-sm text-muted">{hint}</span> : null}
      </div>
    </div>
  );
  const rule = (icon: IconName, text: string) => (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-ink-3">
      <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-peach text-accent">
        <Icon name={icon} size={18} />
      </span>
      <span className="pt-1">{text}</span>
    </li>
  );

  return (
    <section className="mk-panel flex flex-col rounded-[28px] px-5 py-6 sm:px-8 sm:py-[30px]">
      <div className="flex flex-col gap-2 pb-1.5">
        <span className="flex justify-between gap-3 text-[13px]">
          <span className="font-bold text-accent">{t("studioMarket.stepOf", { n: progress, total: 4 })}</span>
          <span className="text-muted">{t("studioMarket.aboutMinutes")}</span>
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n < progress || (member && n <= 4) ? "bg-success" : n === progress ? "bg-ember" : "bg-line-soft"}`} />
          ))}
        </div>
        <h1 className="mk-display mk-gradtext m-0 mt-2.5 text-[30px] sm:text-[34px]">{t("studioMarket.joinTitle")}</h1>
        <p className="m-0 text-[15px] text-ink-4">{t("studioMarket.joinIntro")}</p>
      </div>

      {joined ? (
        <div role="status" className="mt-4 flex gap-2.5 rounded-xl bg-success-bg px-4 py-3.5 text-[15px] text-ink-2">
          <Icon name="check_circle" size={22} filled className="text-success" />
          <span>
            <b>{t("studioMarket.joinedTitle")}</b>
            <br />
            {t("studioMarket.joinedText")}
          </span>
        </div>
      ) : null}

      <form action={action} noValidate className="flex flex-col">
        <input type="hidden" name="slug" value={shownSlug} />
        {/* 1 Profile */}
        {step === 1 ? (
          <div className="flex flex-col gap-4 border-b border-line-soft py-5">
            {head(1, t("studioMarket.profileStep"))}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-name" className="text-sm font-semibold">
                {t("studioMarket.nameLabel")}
              </label>
              <input id="f-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="input" aria-describedby="f-name-hint" aria-invalid={state.errors?.name ? true : undefined} autoComplete="organization" />
              <span id="f-name-hint" className="text-xs text-muted">
                {t("studioMarket.nameHint")}
              </span>
              <FieldError id="f-name-error" error={state.errors?.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-slug" className="text-sm font-semibold">
                {t("studioMarket.slugLabel")}
              </label>
              <div className="input flex items-center gap-0 px-0" dir="ltr">
                <span className="ps-3.5 text-sm font-semibold whitespace-nowrap text-muted">{host}/designers/</span>
                <input
                  id="f-slug"
                  value={shownSlug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  maxLength={40}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent pe-3.5 text-[15px] outline-none"
                  aria-describedby="f-slug-hint"
                  aria-invalid={state.errors?.slug ? true : undefined}
                />
              </div>
              <span id="f-slug-hint" className="text-xs text-muted">
                {t("studioMarket.slugHint")}
              </span>
              <FieldError id="f-slug-error" error={state.errors?.slug} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-bio" className="text-sm font-semibold">
                {t("studioMarket.bioLabel")}
              </label>
              <textarea id="f-bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} rows={2} className="input min-h-[72px] py-3" aria-invalid={state.errors?.bio ? true : undefined} />
              <FieldError id="f-bio-error" error={state.errors?.bio} />
            </div>
            <div className="flex gap-3">
              {member ? (
                <SubmitButton className="h-11">{t("studioMarket.saveProfile")}</SubmitButton>
              ) : (
                <button type="button" disabled={!name.trim()} onClick={() => setStep(2)} className={`${btn.primary} h-11 cursor-pointer`}>
                  {t("studioMarket.continue")}
                  <Icon name="arrow_forward" size={20} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="bio" value={bio} />
            {done(
              1,
              t("studioMarket.profileStep"),
              <span className="flex flex-wrap items-center gap-2">
                <b className="text-midnight">{name}</b>
                <span className="text-faint">·</span>
                <bdi dir="ltr">
                  {host}/designers/{shownSlug}
                </bdi>
              </span>,
              1,
            )}
          </>
        )}

        {/* 2 Country */}
        {step === 2 ? (
          <div className="flex flex-col gap-4 border-b border-line-soft py-5">
            {head(2, t("studioMarket.countryStep"))}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-country" className="text-sm font-semibold">
                {t("studioMarket.countryLabel")}
              </label>
              <select id="f-country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="input" aria-invalid={state.errors?.country ? true : undefined}>
                {country ? null : <option value="">{t("studioMarket.countryChoose")}</option>}
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError id="f-country-error" error={state.errors?.country} />
            </div>
            <div className="flex gap-3">
              {member ? (
                <SubmitButton className="h-11">{t("studioMarket.saveProfile")}</SubmitButton>
              ) : (
                <>
                  <button type="button" disabled={!country} onClick={() => setStep(3)} className={`${btn.primary} h-11 cursor-pointer`}>
                    {t("studioMarket.continue")}
                    <Icon name="arrow_forward" size={20} />
                  </button>
                  <button type="button" onClick={() => setStep(1)} className={`${btn.ghost} h-11 cursor-pointer`}>
                    {t("studioMarket.back")}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : step > 2 || member ? (
          <>
            <input type="hidden" name="country" value={country} />
            {done(2, t("studioMarket.countryStep"), t("studioMarket.paidUsd", { country: countryName }), 2)}
          </>
        ) : (
          <>
            <input type="hidden" name="country" value={country} />
            <div className="flex items-center gap-3.5 border-b border-line-soft py-[18px] opacity-75">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-line-soft text-[13px] font-extrabold text-muted">2</span>
              <b className="text-base">{t("studioMarket.countryStep")}</b>
            </div>
          </>
        )}

        {/* 3 The terms */}
        {member ? null : step === 3 ? (
          <div className="flex flex-col gap-4 pt-5 pb-1">
            {head(3, t("studioMarket.termsStep"), t("studioMarket.termsHint"))}
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-sand p-[18px]">
              <div className="flex justify-between gap-3">
                <b className="text-[15px]">{t("studioMarket.splitTitle")}</b>
                <span className="text-[13px] text-muted">{t("studioMarket.example")}</span>
              </div>
              <div dir="ltr" className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                <span className="flex-[75] bg-success" />
                <span className="flex-[25] bg-ember" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[13px] text-muted">{t("studioMarket.buyerPays")}</span>
                  <b className="text-xl" dir="ltr">
                    $100.00
                  </b>
                </div>
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <span className="h-2 w-2 rounded-full bg-ember" />
                    {t("studioMarket.yallappShare")}
                  </span>
                  <b className="text-xl" dir="ltr">
                    −$25.00
                  </b>
                </div>
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    {t("studioMarket.youGet")}
                  </span>
                  <b className="text-xl text-success" dir="ltr">
                    $75.00
                  </b>
                </div>
              </div>
              <p className="m-0 text-[13px] leading-relaxed text-ink-4">{t("studioMarket.splitText")}</p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {rule("fact_check", t("studioMarket.rule1"))}
              {rule("block", t("studioMarket.rule2"))}
              {rule("history", t("studioMarket.rule3"))}
              {rule("verified_user", t("studioMarket.rule4"))}
              {rule("payments", t("studioMarket.rule5"))}
            </ul>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl bg-white px-4 py-3.5 ${agreed ? "border-2 border-midnight px-[15px] py-[13px]" : "border border-line-strong"}`}>
              <input type="checkbox" name="terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-[22px] w-[22px] flex-none accent-[var(--color-midnight)]" />
              <span className="text-[15px] font-semibold">
                {t("studioMarket.agree")}{" "}
                <button type="button" onClick={() => setFull((v) => !v)} aria-expanded={full} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent">
                  {t("studioMarket.readTerms")}
                </button>
              </span>
            </label>
            <FieldError id="f-terms-error" error={state.errors?.terms} />
            {full ? (
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-sand px-4 py-3.5 text-sm leading-relaxed text-ink-3">
                <b className="text-[15px] text-midnight">{t("studioMarket.fullTermsTitle")}</b>
                <ol className="m-0 flex flex-col gap-1.5 ps-5">
                  {(["fullTerms1", "fullTerms2", "fullTerms3", "fullTerms4", "fullTerms5", "fullTerms6", "fullTerms7", "fullTerms8"] as const).map((key) => (
                    <li key={key}>{t(`studioMarket.${key}`)}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <FormMessage message={state.errors?.form ?? (state.ok ? undefined : state.message)} />
            <div className="flex gap-3">
              <SubmitButton variant="main" className="h-[52px] text-base" disabled={!agreed}>
                {t("studioMarket.agreeContinue")}
                <Icon name="arrow_forward" size={20} />
              </SubmitButton>
              <button type="button" onClick={() => setStep(2)} className={`${btn.ghost} h-[52px] cursor-pointer`}>
                {t("studioMarket.back")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 border-b border-line-soft py-[18px] opacity-75">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-line-soft text-[13px] font-extrabold text-muted">3</span>
            <b className="text-base">{t("studioMarket.termsStep")}</b>
          </div>
        )}
        {member && state.ok ? <FormMessage ok message={state.message} /> : null}
      </form>

      {/* 4 Open Studio */}
      <div className={`mt-[18px] flex flex-wrap items-center gap-3.5 border-t border-line-soft pt-[18px] ${member ? "" : "opacity-75"}`}>
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${member ? "bg-midnight text-white" : "bg-line-soft text-muted"}`}>4</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-base">{t("studioMarket.studioStep")}</b>
          <span className="text-sm text-muted">{t("studioMarket.studioStepText")}</span>
        </div>
        {member ? (
          <div className="flex flex-wrap gap-2.5">
            <Link href="/studio" className={`${btn.secondary} h-11`}>
              <Icon name="draw" size={20} />
              {t("studioMarket.openStudioButton")}
            </Link>
            <Link href="/designer/publish" className={`${btn.main} h-11`}>
              <Icon name="add" size={20} />
              {t("studioMarket.publishTemplate")}
            </Link>
          </div>
        ) : (
          <Icon name="lock" size={20} className="text-faint" />
        )}
      </div>
    </section>
  );
}
