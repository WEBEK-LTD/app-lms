"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { uploadMailImageAction } from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { ACCOUNT_ONLY_TAGS, MERGE_TAGS } from "@/lib/mailing/merge";
import { sanitizeHtml } from "@/lib/mailing/sanitize";

/** 114 The builder's small form parts: a label and its field, colors, numbers, choices, pictures, rich text and merge tags. */

export const inputClass = "h-10 w-full min-w-0 rounded-[10px] border border-line bg-white px-3 text-[14px] text-midnight outline-0 focus:border-midnight";

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-3">
        {label}
      </label>
      {children}
      {hint ? <span className="text-[12px] leading-snug text-muted">{hint}</span> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, dir, tags = false, multiline = false, mono = false, testId }: { label: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; hint?: ReactNode; dir?: "ltr" | "rtl" | "auto"; tags?: boolean; multiline?: boolean; mono?: boolean; testId?: string }) {
  const id = useId();
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const insert = (tag: string) => {
    const el = ref.current;
    const text = `{{${tag}}}`;
    if (!el) return onChange(value + text);
    const startAt = el.selectionStart ?? value.length;
    const endAt = el.selectionEnd ?? value.length;
    onChange(value.slice(0, startAt) + text + value.slice(endAt));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(startAt + text.length, startAt + text.length);
    });
  };
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {multiline ? (
          <textarea ref={ref} id={id} value={value} dir={dir} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={mono ? 14 : 3} data-testid={testId} className={`${inputClass} h-auto py-2 leading-relaxed ${mono ? "font-mono text-[12.5px]" : ""}`} spellCheck={!mono} />
        ) : (
          <input ref={ref} id={id} value={value} dir={dir} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId} className={inputClass} />
        )}
        {tags ? <MergeTagMenu onPick={insert} /> : null}
      </div>
    </Field>
  );
}

export function MergeTagMenu({ onPick }: { onPick: (tag: string) => void }) {
  return (
    <select
      aria-label="Insert a merge tag"
      value=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
        e.target.value = "";
      }}
      className="h-8 w-fit max-w-full cursor-pointer rounded-lg border border-line bg-sand px-2 text-[12px] font-semibold text-ink-3"
    >
      <option value="">+ Merge tag</option>
      {MERGE_TAGS.filter((t) => t.tag !== "unsubscribe_link").map((t) => (
        <option key={t.tag} value={t.tag}>
          {t.label} ({`{{${t.tag}}}`}){ACCOUNT_ONLY_TAGS.includes(t.tag) ? " · accounts only" : ""}
        </option>
      ))}
    </select>
  );
}

/** What each merge tag becomes for an account and for a contact (the editor's tag help). */
export function MergeTagHelp() {
  return (
    <details className="rounded-[14px] border border-line bg-sand/60 px-4 py-3 text-[13px] text-ink-3" data-testid="merge-tag-help">
      <summary className="cursor-pointer font-semibold text-midnight">How merge tags fill in</summary>
      <p className="mt-2 mb-2">
        Write <code dir="ltr">{"{{first_name}}"}</code> to put in each person&apos;s value, or <code dir="ltr">{"{{first_name|there}}"}</code> to write &ldquo;there&rdquo; when they have none.
        Contacts have no Yallapp account, so the tags marked &ldquo;accounts only&rdquo; are empty for them: give those a default, or leave them out of emails that go to contacts.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start text-[12.5px]">
          <thead>
            <tr className="text-ink-3">
              <th className="py-1 pe-3 text-start font-semibold">Tag</th>
              <th className="py-1 pe-3 text-start font-semibold">Accounts</th>
              <th className="py-1 text-start font-semibold">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {MERGE_TAGS.map((t) => (
              <tr key={t.tag} className="border-t border-line-soft align-top">
                <td className="py-1 pe-3 font-mono whitespace-nowrap" dir="ltr">{`{{${t.tag}}}`}</td>
                <td className="py-1 pe-3">{t.label}</td>
                <td className="py-1">{t.contact ?? <span className="text-muted">Empty (accounts only): the default after | shows</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function ColorField({ label, value, onChange, fallback }: { label: ReactNode; value: string | undefined; onChange: (v: string | undefined) => void; fallback: string }) {
  const id = useId();
  // What's being typed, until it's a whole color; else the color itself.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value ?? "";
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={typeof label === "string" ? `${label}: pick` : "Pick a color"} value={value ?? fallback} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-11 shrink-0 cursor-pointer rounded-[10px] border border-line bg-white p-1" />
        <input
          id={id}
          value={text}
          placeholder={fallback}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toUpperCase());
            if (!e.target.value) onChange(undefined);
          }}
          onBlur={() => setDraft(null)}
          className={`${inputClass} font-mono uppercase`}
          dir="ltr"
        />
        {value ? (
          <button type="button" onClick={() => onChange(undefined)} className="h-10 shrink-0 cursor-pointer rounded-[10px] border border-line bg-white px-2 text-muted hover:text-midnight" aria-label="Back to the email's color" title="Back to the email's color">
            <Icon name="format_color_reset" size={18} />
          </button>
        ) : null}
      </div>
    </Field>
  );
}

export function RangeField({ label, value, onChange, min, max, step = 1, unit = "px" }: { label: ReactNode; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 cursor-pointer accent-[#0E0D24]" />
        <span className="w-14 shrink-0 text-end text-[13px] font-semibold text-ink-3 tabular-nums">
          {value}
          {unit}
        </span>
      </div>
    </Field>
  );
}

export function Choice<T extends string | number>({ label, value, options, onChange }: { label: ReactNode; value: T; options: { value: T; label: ReactNode; icon?: Parameters<typeof Icon>[0]["name"] }[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <div role="radiogroup" className="flex flex-wrap gap-1 rounded-[12px] border border-line bg-sand p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[9px] px-2 text-[12.5px] font-semibold ${o.value === value ? "bg-white text-midnight shadow-[0_1px_2px_rgba(14,13,36,0.12)]" : "text-ink-4 hover:text-midnight"}`}
          >
            {o.icon ? <Icon name={o.icon} size={17} /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint, testId }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode; testId?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" data-testid={testId} />
      <span aria-hidden="true" className="mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-line-strong p-0.5 transition-colors peer-checked:bg-midnight peer-focus-visible:ring-2 peer-focus-visible:ring-ember">
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4 rtl:-translate-x-4" : ""}`} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-midnight">{label}</span>
        {hint ? <span className="text-[12px] leading-snug text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A picture's address, with an upload to Yallapp's files (PNG, JPEG, GIF). */
export function ImageField({ label, value, onChange }: { label: ReactNode; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const upload = (f: File) => {
    setError(null);
    const data = new FormData();
    data.set("file", f);
    start(async () => {
      const result = await uploadMailImageAction(data);
      if (result.ok) onChange(result.url);
      else setError(result.error);
    });
  };
  return (
    <Field label={label} htmlFor={id} hint={error ? <span className="text-danger">{error}</span> : "PNG, JPEG or GIF up to 5 MB, about twice as wide as shown for sharp screens."}>
      <div className="flex flex-col gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- The admin's own picture.
          <img src={value} alt="" className="max-h-32 w-full rounded-[10px] border border-line object-cover" />
        ) : null}
        <div className="flex gap-2">
          <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" className={inputClass} dir="ltr" />
          <button type="button" onClick={() => file.current?.click()} disabled={pending} className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-midnight hover:border-midnight disabled:cursor-wait">
            <Icon name={pending ? "progress_activity" : "upload"} size={18} className={pending ? "animate-spin" : ""} />
            Upload
          </button>
          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Field>
  );
}

/** Rich text: bold, italic, underline, links and lists, kept to what the email allows. */
export function RichText({ label, value, onChange, dir, blockId }: { label: ReactNode; value: string; onChange: (v: string) => void; dir: "ltr" | "rtl"; blockId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  // Written into the box when another block is chosen only, so typing keeps its place.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeHtml(value, "inline");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- On a new block only.
  }, [blockId]);
  const emit = () => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML, "inline"));
  };
  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };
  const tool = "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-1.5 text-[13px] text-ink-3 hover:bg-white hover:text-midnight";
  return (
    <Field label={<span id={id}>{label}</span>}>
      <div className="overflow-hidden rounded-[10px] border border-line bg-white focus-within:border-midnight">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-line-soft bg-sand px-1.5 py-1" role="toolbar" aria-label="Formatting">
          <button type="button" className={`${tool} font-extrabold`} onMouseDown={(e) => e.preventDefault()} onClick={() => run("bold")} aria-label="Bold">
            B
          </button>
          <button type="button" className={`${tool} italic`} onMouseDown={(e) => e.preventDefault()} onClick={() => run("italic")} aria-label="Italic">
            I
          </button>
          <button type="button" className={`${tool} underline`} onMouseDown={(e) => e.preventDefault()} onClick={() => run("underline")} aria-label="Underline">
            U
          </button>
          <button
            type="button"
            className={tool}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = window.prompt("Link address (https://…)", "https://");
              if (url && /^(https?:|mailto:|tel:|\{\{)/i.test(url)) run("createLink", url);
            }}
            aria-label="Link"
          >
            <Icon name="link" size={18} />
          </button>
          <button type="button" className={tool} onMouseDown={(e) => e.preventDefault()} onClick={() => run("insertUnorderedList")} aria-label="Bulleted list">
            <Icon name="list" size={18} />
          </button>
          <span className="ms-auto">
            <MergeTagMenu onPick={(tag) => run("insertText", `{{${tag}}}`)} />
          </span>
        </div>
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={id}
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          onInput={emit}
          onBlur={emit}
          data-testid="rich-text"
          className="min-h-[110px] px-3 py-2.5 text-[14px] leading-relaxed text-midnight outline-0 [&_a]:text-accent [&_a]:underline [&_p]:m-0 [&_p+p]:mt-2 [&_ul]:my-1 [&_ul]:ps-5"
        />
      </div>
    </Field>
  );
}

/** A list of rows with add, remove and order (links, profiles, stores, points, cards). */
export function Rows<T>({ label, items, onChange, render, make, max = 8, addLabel }: { label: ReactNode; items: T[]; onChange: (items: T[]) => void; render: (item: T, set: (item: T) => void, index: number) => ReactNode; make: () => T; max?: number; addLabel: string }) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  return (
    <Field label={label}>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[12px] border border-line-soft bg-sand/60 p-2.5">
            {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
            <div className="flex justify-end gap-1">
              <SmallButton icon="arrow_upward" label="Up" onClick={() => move(i, i - 1)} disabled={i === 0} />
              <SmallButton icon="arrow_downward" label="Down" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} />
              <SmallButton icon="delete" label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          </div>
        ))}
        {items.length < max ? (
          <button type="button" onClick={() => onChange([...items, make()])} className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong bg-white text-[13px] font-semibold text-ink-3 hover:border-midnight hover:text-midnight">
            <Icon name="add" size={18} />
            {addLabel}
          </button>
        ) : null}
      </div>
    </Field>
  );
}

export function SmallButton({ icon, label, onClick, disabled, tone = "neutral" }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick: () => void; disabled?: boolean; tone?: "neutral" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-white disabled:cursor-default disabled:opacity-40 ${tone === "danger" ? "text-danger hover:border-danger" : "text-ink-3 hover:border-midnight hover:text-midnight"}`}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

/** A titled part of the settings panel that opens and closes. */
export function PanelSection({ title, children, open = true }: { title: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line-soft last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-extrabold tracking-wide text-midnight uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="expand_more" size={20} className="text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}
