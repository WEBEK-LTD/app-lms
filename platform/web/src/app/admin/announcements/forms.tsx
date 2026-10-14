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
}: {
  id?: string;
  announcement: AnnouncementFormValues;
  audienceKinds: Option[];
  plans: Option[];
  appTypes: Option[];
  states: Option[];
}) {
  const [state, action] = useActionState(id ? updateAnnouncementAction : createAnnouncementAction, initialFormState);
  const s = state.values;
  const v = (name: keyof AnnouncementFormValues) => s?.[name] ?? announcement[name];
  const [audience, setAudience] = useState(v("audience"));
  const [body, setBody] = useState(v("body"));
  const e = state.errors ?? {};
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
      <Field label="Title" name="title" maxLength={120} defaultValue={v("title")} error={e.title} />
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
            Kind
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
