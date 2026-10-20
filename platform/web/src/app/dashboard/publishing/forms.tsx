"use client";

import { useActionState } from "react";
import { savePublishingChecklistAction, savePublishingListingAction } from "@/app/actions/publishing";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";

export interface ChecklistStepView {
  id: string;
  title: string;
  text: string;
  links: { label: string; href: string }[];
  /** "Google Play", "App Store" or "Push notifications". */
  group: string;
  done: boolean;
  /** When it was ticked, already formatted. */
  doneAt: string | null;
}

/** The "Publish it for me" checklist: one Done box per step, and who creates the Firebase project. */
export function ChecklistForm({ steps, firebaseBy }: { steps: ChecklistStepView[]; firebaseBy: "client" | "team" }) {
  const t = useDashT();
  const [state, action] = useActionState(savePublishingChecklistAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => {
          const firebase = step.id === "firebase";
          return (
            <li key={step.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {t("publishing.stepOf", { number: i + 1, group: step.group })}
                  </span>
                  <h3 className="m-0 text-base font-bold">{step.title}</h3>
                </div>
                {firebase && firebaseBy === "team" ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                    <Icon name="check_circle" size={20} filled />
                    {t("publishing.weDoThis")}
                  </span>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-semibold">
                    <input type="checkbox" name="done" value={step.id} defaultChecked={step.done} aria-label={t("publishing.doneLabel", { title: step.title })} className="h-4 w-4 accent-midnight" />
                    {t("publishing.done")}
                  </label>
                )}
              </div>
              {firebase ? (
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-1 text-sm font-semibold">{t("publishing.whoFirebase")}</legend>
                  <label className="flex cursor-pointer items-start gap-2 text-[15px]">
                    <input type="radio" name="firebaseBy" value="client" defaultChecked={firebaseBy === "client"} className="mt-1 accent-midnight" />
                    <span>{t("publishing.firebaseMe")}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-[15px]">
                    <input type="radio" name="firebaseBy" value="team" defaultChecked={firebaseBy === "team"} className="mt-1 accent-midnight" />
                    <span>{t("publishing.firebaseYou")}</span>
                  </label>
                </fieldset>
              ) : null}
              {!(firebase && firebaseBy === "team") ? <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p> : (
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.firebaseTeam")}</p>
              )}
              {!(firebase && firebaseBy === "team") && step.links.length ? (
                <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-sm">
                  {step.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold">
                        {link.label}
                        <Icon name="open_in_new" size={16} />
                        <span className="sr-only">{t("common.opensInNewTab")}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {step.doneAt ? <span className="text-xs text-muted">{t("publishing.ticked", { date: step.doneAt })}</span> : null}
            </li>
          );
        })}
      </ol>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("publishing.saveChecklist")}
        </SubmitButton>
      </div>
    </form>
  );
}

function Select({ name, label, options, value, error, hint }: { name: string; label: string; options: readonly string[]; value: string; error?: string; hint?: string }) {
  const t = useDashT();
  const known = useKnownText();
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
      >
        <option value="">{t("publishing.choose")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {known(option)}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function TextArea({ name, label, value, hint, error, placeholder }: { name: string; label: string; value: string; hint: string; error?: string; placeholder?: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        defaultValue={value}
        rows={4}
        maxLength={2000}
        placeholder={placeholder}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
      />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** Categories, content rating notes and notes for the reviewers. */
export function ListingForm({
  current,
  playCategories,
  appStoreCategories,
  reviewNote,
  reviewMeaning,
  ratingExample,
}: {
  current: { playCategory: string; appStoreCategory: string; contentRatingNotes: string; reviewNotes: string };
  playCategories: readonly string[];
  appStoreCategories: readonly string[];
  /** 31 The content rating example for this app's type. */
  ratingExample: string;
  /** 27 What the kind's apps should tell the reviewers (a gym's memberships paid outside the app). */
  reviewNote?: string;
  /** 62 Outside English: what the suggested note (in the field, or `reviewNote`) means; the note itself stays in English for the reviewers. */
  reviewMeaning?: string | null;
}) {
  const t = useDashT();
  const lang = useDashLang();
  const [state, action] = useActionState(savePublishingListingAction, initialFormState);
  const v = { ...current, ...state.values };
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={JSON.stringify(state.values ?? {})}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="playCategory" label={t("publishing.playCategory")} options={playCategories} value={v.playCategory} error={e.playCategory} />
        <Select name="appStoreCategory" label={t("publishing.appleCategory")} options={appStoreCategories} value={v.appStoreCategory} error={e.appStoreCategory} />
      </div>
      <TextArea
        name="contentRatingNotes"
        label={t("publishing.ratingNotes")}
        value={v.contentRatingNotes}
        placeholder={ratingExample}
        hint={t("publishing.ratingHint")}
        error={e.contentRatingNotes}
      />
      <TextArea
        name="reviewNotes"
        label={t("publishing.reviewNotes")}
        value={v.reviewNotes}
        hint={[
          reviewNote ? t("publishing.reviewHintNote", { note: reviewNote }) : t("publishing.reviewHint"),
          lang !== "en" ? t("publishing.reviewEnglish") : null,
          reviewMeaning ? t("publishing.reviewMeaning", { meaning: reviewMeaning }) : null,
        ]
          .filter(Boolean)
          .join(" ")}
        error={e.reviewNotes}
      />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("publishing.saveListing")}
        </SubmitButton>
      </div>
    </form>
  );
}
