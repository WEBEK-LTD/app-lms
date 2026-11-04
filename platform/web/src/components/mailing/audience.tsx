"use client";

import { useEffect, useState, useTransition } from "react";
import { countMailAudienceAction, deleteMailSegmentAction, saveMailSegmentAction } from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import type { MailAccountState, MailAudience, MailLang, MailSegment } from "@/lib/mailing/types";
import { Field, inputClass, Toggle } from "./fields";

/** 114 Who a campaign goes to: filters, the live count, saved audiences. */

export interface AudienceOptions {
  plans: { id: string; name: string }[];
  appTypes: { id: string; label: string }[];
  countries: { code: string; name: string }[];
}

const STATES: { value: MailAccountState; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Waiting for activation" },
  { value: "expired", label: "Plan ended" },
  { value: "suspended", label: "Suspended" },
];
const LANGS: { value: MailLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
];

function Chips<T extends string>({ label, options, value, onChange, testId }: { label: string; options: { value: T; label: string }[]; value: T[] | undefined; onChange: (v: T[]) => void; testId?: string }) {
  const chosen = value ?? [];
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" data-testid={testId}>
      <legend className="mb-2 text-[13px] font-semibold text-ink-3">
        {label} <span className="font-normal text-muted">{chosen.length ? `· any of ${chosen.length}` : "· anyone"}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = chosen.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? chosen.filter((x) => x !== o.value) : [...chosen, o.value])}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] ${on ? "border-midnight bg-midnight font-bold text-ivory" : "border-line bg-white text-midnight hover:border-line-strong"}`}
            >
              {on ? <Icon name="check" size={16} /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AudienceStep({ audience, onChange, segments: initialSegments, segmentId, setSegmentId, options, editable }: { audience: MailAudience; onChange: (a: MailAudience) => void; segments: MailSegment[]; segmentId: string | null; setSegmentId: (id: string | null) => void; options: AudienceOptions; editable: boolean }) {
  const [count, setCount] = useState<{ count: number; suppressed: number; team: number; everyone: boolean } | null>(null);
  const [counting, startCount] = useTransition();
  const [segments, setSegments] = useState(initialSegments);
  const [saving, startSave] = useTransition();
  const [country, setCountry] = useState("");
  const put = (patch: Partial<MailAudience>) => {
    setSegmentId(null);
    onChange({ ...audience, ...patch });
  };
  const key = JSON.stringify(audience);
  useEffect(() => {
    const timer = setTimeout(() => startCount(async () => setCount(await countMailAudienceAction(audience))), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Counted again when the audience changes.
  }, [key]);
  const countryName = (code: string) => options.countries.find((c) => c.code === code)?.name ?? code;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6 rounded-[20px] border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[20px] font-extrabold text-midnight">Who gets it</h2>
          <p className="m-0 text-[14px] text-muted">Each filter narrows it down. Nothing chosen in a filter means anyone. Addresses that unsubscribed or bounced are always left out.</p>
        </div>
        <Chips label="Account" options={STATES} value={audience.states} onChange={(states) => put({ states })} testId="filter-states" />
        <Chips label="Plan" options={options.plans.map((p) => ({ value: p.id, label: p.name }))} value={audience.plans} onChange={(plans) => put({ plans })} />
        <Chips label="Kind of app" options={[{ value: "regular" as const, label: "Regular apps" }, { value: "studio" as const, label: "Yallapp Studio" }]} value={audience.sections} onChange={(sections) => put({ sections })} />
        <Chips label="App type" options={options.appTypes.map((t) => ({ value: t.id, label: t.label }))} value={audience.appTypes} onChange={(appTypes) => put({ appTypes })} />
        <Chips label="Language of their account" options={LANGS} value={audience.langs} onChange={(langs) => put({ langs })} testId="filter-langs" />
        <Field label="Country">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {(audience.countries ?? []).map((c) => (
                <button key={c} type="button" onClick={() => put({ countries: (audience.countries ?? []).filter((x) => x !== c) })} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-midnight bg-midnight px-3 text-[12.5px] font-bold text-ivory" aria-label={`Remove ${countryName(c)}`}>
                  {countryName(c)}
                  <Icon name="close" size={15} />
                </button>
              ))}
            </div>
            <select
              value={country}
              onChange={(e) => {
                const code = e.target.value;
                setCountry("");
                if (code && !(audience.countries ?? []).includes(code)) put({ countries: [...(audience.countries ?? []), code] });
              }}
              className={`${inputClass} max-w-[320px] cursor-pointer`}
              aria-label="Add a country"
            >
              <option value="">{audience.countries?.length ? "Add another country" : "Any country (add one to narrow)"}</option>
              {options.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Signed up from">
            <input type="date" value={audience.signedUpFrom ?? ""} onChange={(e) => put({ signedUpFrom: e.target.value || null })} className={inputClass} />
          </Field>
          <Field label="Signed up until">
            <input type="date" value={audience.signedUpTo ?? ""} onChange={(e) => put({ signedUpTo: e.target.value || null })} className={inputClass} />
          </Field>
          <Field label="Built an app">
            <select value={audience.published ?? ""} onChange={(e) => put({ published: (e.target.value || null) as MailAudience["published"] })} className={`${inputClass} cursor-pointer`}>
              <option value="">Either</option>
              <option value="yes">Yes, at least one ready build</option>
              <option value="no">Not yet</option>
            </select>
          </Field>
          <Field label="Last signed in">
            <select
              value={audience.activeWithinDays ? `in:${audience.activeWithinDays}` : audience.inactiveForDays ? `out:${audience.inactiveForDays}` : ""}
              onChange={(e) => {
                const [kind, days] = e.target.value.split(":");
                put({ activeWithinDays: kind === "in" ? Number(days) : null, inactiveForDays: kind === "out" ? Number(days) : null });
              }}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Any time</option>
              <option value="in:7">In the last 7 days</option>
              <option value="in:30">In the last 30 days</option>
              <option value="in:90">In the last 90 days</option>
              <option value="out:30">Not in the last 30 days</option>
              <option value="out:90">Not in the last 90 days</option>
              <option value="out:180">Not in the last 6 months</option>
            </select>
          </Field>
        </div>
        <div className="rounded-[14px] border border-line bg-sand/60 p-4">
          <Toggle
            label="Also their team members"
            checked={!!audience.includeTeam}
            onChange={(includeTeam) => put({ includeTeam })}
            testId="include-team"
            hint="People an account invited to its team. They didn't sign up to Yallapp themselves, so include them only when the email is for them too. Off: account owners only."
          />
        </div>
        <Field label="Only these addresses (a test group)" hint="One per line or separated by commas. Leave empty for everyone the filters match; when set, only the addresses here that also match get it.">
          <textarea
            rows={2}
            value={(audience.emails ?? []).join("\n")}
            onChange={(e) => {
              const emails = e.target.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
              put({ emails: emails.length ? emails : undefined });
            }}
            className={`${inputClass} h-auto py-2`}
            dir="ltr"
            data-testid="audience-emails"
          />
        </Field>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-midnight p-6 text-ivory">
          <span className="text-[13px] font-semibold text-night-muted">This campaign reaches</span>
          <span className="flex items-baseline gap-2">
            <span className="text-[44px] leading-none font-extrabold tabular-nums" data-testid="audience-count">
              {count ? count.count.toLocaleString("en") : "…"}
            </span>
            <span className="text-[15px] font-semibold">{count?.count === 1 ? "person" : "people"}</span>
            {counting ? <Icon name="progress_activity" size={18} className="animate-spin text-night-muted" /> : null}
          </span>
          {count ? (
            <span className="text-[13px] text-night-muted">
              {count.everyone ? "Everyone on Yallapp" : "Matching the filters"}
              {count.team ? ` · ${count.team} team members` : ""}
              {count.suppressed ? ` · ${count.suppressed} left out (unsubscribed or bounced)` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5">
          <h3 className="m-0 text-[15px] font-extrabold text-midnight">Saved audiences</h3>
          {segments.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {segments.map((s) => (
                <li key={s.id} className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 ${segmentId === s.id ? "border-midnight bg-sand" : "border-line"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(structuredClone(s.audience));
                      setSegmentId(s.id);
                    }}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-start text-[14px] font-semibold text-midnight"
                  >
                    {s.name}
                  </button>
                  {editable ? (
                    <button
                      type="button"
                      aria-label={`Delete ${s.name}`}
                      onClick={() =>
                        startSave(async () => {
                          await deleteMailSegmentAction(s.id);
                          setSegments(segments.filter((x) => x.id !== s.id));
                          if (segmentId === s.id) setSegmentId(null);
                        })
                      }
                      className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-danger"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-muted">Save these filters to use them again in other campaigns.</p>
          )}
          {editable ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const name = window.prompt("Name this audience", "");
                if (!name?.trim()) return;
                startSave(async () => {
                  const result = await saveMailSegmentAction({ name, audience });
                  if (result.ok) {
                    const segment = { id: result.id, name: name.trim(), audience: structuredClone(audience), createdAt: new Date(), updatedAt: new Date() };
                    setSegments([...segments, segment].sort((a, b) => a.name.localeCompare(b.name)));
                    setSegmentId(result.id);
                  }
                });
              }}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white text-[13px] font-semibold text-midnight hover:border-midnight"
            >
              <Icon name="bookmark_add" size={18} />
              Save as an audience
            </button>
          ) : null}
        </div>
        {audience.includeTeam ? (
          <Notice tone="warn" icon="groups">
            Team members are included. They get the email in their own account language.
          </Notice>
        ) : null}
      </aside>
    </div>
  );
}
