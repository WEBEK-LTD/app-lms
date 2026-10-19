"use client";

import { useActionState, useState } from "react";
import { createAnnouncementAction, updateAnnouncementAction } from "@/app/actions/admin-announcements";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Markdown } from "@/components/markdown";
import type { AnnouncementFormValues } from "@/lib/announcements";
import { initialFormState } from "@/lib/forms";

interface Option {
  id: string;
  label: string;
}

export function AnnouncementForm({
  id,
  announcement,
  audienceKinds,
  plans,
  appTypes,
  states,
  kinds,
}: {
  id?: string;
  announcement: AnnouncementFormValues;
  audienceKinds: Option[];
  plans: Option[];
  appTypes: Option[];
  states: Option[];
  /** 57 Update, Announcement, Maintenance, Offer. */
  kinds: Option[];
}) {
  const [state, action] = useActionState(id ? updateAnnouncementAction : createAnnouncementAction, initialFormState);
  const s = state.values;
  const v = (name: keyof AnnouncementFormValues) => s?.[name] ?? announcement[name];
  const [audience, setAudience] = useState(v("audience"));
  const [body, setBody] = useState(v("body"));
  const e = state.errors ?? {};
  // 57 The Arabic and Turkish texts are folded away until one is written.
  const translated = Boolean(v("titleAr") || v("bodyAr") || v("titleTr") || v("bodyTr") || e.titleAr || e.bodyAr || e.titleTr || e.bodyTr);
  const textarea = (name: "bodyAr" | "bodyTr", label: string, lang: "ar" | "tr") => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={5}
        lang={lang}
        dir={lang === "ar" ? "rtl" : undefined}
        defaultValue={v(name)}
        aria-invalid={e[name] ? true : undefined}
        aria-describedby={e[name] ? `f-${name}-error` : undefined}
        className="input min-h-28 py-3 text-[15px] leading-relaxed"
      />
      <FieldError id={`f-${name}-error`} error={e[name]} />
    </div>
  );
  const group = (name: "plans" | "appTypes" | "states", options: Option[]) => (
    <div className="flex flex-wrap gap-x-5 gap-y-2 pl-6">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name={name} value={o.id} defaultChecked={v(name).split(",").includes(o.id)} className="h-4 w-4 accent-midnight" />
          {o.label}
        </label>
      ))}
    </div>
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="Title" name="title" maxLength={120} defaultValue={v("title")} hint="In English: everyone sees it in English unless an Arabic or Turkish text is written below." error={e.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-body" className="text-sm font-semibold">
          Message
        </label>
        <span id="f-body-hint" className="text-xs text-muted">
          Markdown: a blank line between paragraphs, - for a list, **bold**, *italic* and [a link](https://…). HTML isn&apos;t allowed.
        </span>
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            id="f-body"
            name="body"
            rows={8}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={e.body ? true : undefined}
            aria-describedby={`f-body-hint${e.body ? " f-body-error" : ""}`}
            className="input min-h-40 py-3 text-[15px] leading-relaxed"
          />
          <section aria-label="Preview of the message" className="flex flex-col gap-2 rounded-xl bg-peach px-4 py-3.5 text-[15px] leading-relaxed text-ink-2 [&_ol]:m-0 [&_ol]:pl-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5">
            <span className="text-xs font-bold tracking-[1px] text-muted">PREVIEW</span>
            <Markdown source={body} />
          </section>
        </div>
        <FieldError id="f-body-error" error={e.body} />
      </div>

      {/* 57 Optional Arabic and Turkish texts; the dashboard shows English until it follows the client's language. */}
      <details open={translated} className="rounded-xl border border-line-soft px-4 py-3 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer text-sm font-semibold">Arabic and Turkish (optional)</summary>
        <div className="flex flex-col gap-4">
          <span className="text-xs text-muted">Write both the title and the message for a language, or neither. Clients reading in that language get them; everyone else gets the English ones.</span>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Field label="Arabic title" name="titleAr" maxLength={120} lang="ar" dir="rtl" defaultValue={v("titleAr")} error={e.titleAr} />
              {textarea("bodyAr", "Arabic message", "ar")}
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Turkish title" name="titleTr" maxLength={120} lang="tr" defaultValue={v("titleTr")} error={e.titleTr} />
              {textarea("bodyTr", "Turkish message", "tr")}
            </div>
          </div>
        </div>
      </details>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Kind</legend>
          <span className="text-xs text-muted">The label clients see on it in the dashboard&apos;s bell.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {kinds.map((k) => (
              <label key={k.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="radio" name="kind" value={k.id} defaultChecked={v("kind") === k.id} className="h-4 w-4 accent-midnight" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Where it shows</legend>
          <label className="flex cursor-pointer items-start gap-2 text-[15px]">
            <input type="radio" name="placement" value="banner" defaultChecked={v("placement") !== "bell"} className="mt-1 h-4 w-4 accent-midnight" />
            <span>
              Show as a banner too
              <span className="block text-xs text-muted">In the bell, and on the overview until the client closes it.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-[15px]">
            <input type="radio" name="placement" value="bell" defaultChecked={v("placement") === "bell"} className="mt-1 h-4 w-4 accent-midnight" />
            <span>
              Bell only
              <span className="block text-xs text-muted">In the bell and the Updates from Yallapp list.</span>
            </span>
          </label>
        </fieldset>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Who sees it</legend>
        {audienceKinds.map((kind) => (
          <div key={kind.id} className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="radio" name="audience" value={kind.id} checked={audience === kind.id} onChange={() => setAudience(kind.id)} className="h-4 w-4 accent-midnight" />
              {kind.label}
            </label>
            {audience === kind.id && kind.id === "plan" ? group("plans", plans) : null}
            {audience === kind.id && kind.id === "app_type" ? group("appTypes", appTypes) : null}
            {audience === kind.id && kind.id === "state" ? group("states", states) : null}
          </div>
        ))}
        <FieldError id="f-audience-error" error={e.audience} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-severity" className="text-sm font-semibold">
            Style
          </label>
          <select id="f-severity" name="severity" defaultValue={v("severity")} className="input">
            <option value="info">Information</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <Field label="Link" name="linkUrl" defaultValue={v("linkUrl")} placeholder="https://… or /pricing" hint="Optional." error={e.linkUrl} className="sm:col-span-2" />
        <Field label="Link text" name="linkLabel" maxLength={60} defaultValue={v("linkLabel")} placeholder="Learn more" error={e.linkLabel} />
        <Field label="Shown from" name="startsAt" type="datetime-local" defaultValue={v("startsAt")} hint="UTC. Empty: now." error={e.startsAt} />
        <Field label="Shown until" name="endsAt" type="datetime-local" defaultValue={v("endsAt")} hint="UTC. Empty: until you end it." error={e.endsAt} />
      </div>

      {id ? null : (
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="email" defaultChecked={s?.email === "on"} className="h-4 w-4 accent-midnight" />
          Also email it to these clients now
        </label>
      )}

      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={id ? "Saving…" : "Publishing…"}>
          {id ? "Save announcement" : "Publish announcement"}
        </SubmitButton>
      </div>
    </form>
  );
}
