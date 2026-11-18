"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * 115.53 The reply box with support's ready replies (lib/market/complaints.ts
 * READY_REPLIES): choosing one puts its words into the box, to be changed and
 * sent with Send; a ready reply is never sent by itself.
 */
export function ReplyBox({
  action,
  hidden,
  replies,
  labels,
  variant,
  initial = "",
  extra,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  replies: { key: string; text: string }[];
  labels: { readyReplies: string; placeholder: string; send: string };
  /** The queue's side panel lists them as cards; the page as chips over the box. */
  variant: "panel" | "page";
  initial?: string;
  extra?: React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [chosen, setChosen] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const formId = useId();
  const choose = (r: { key: string; text: string }) => {
    setValue(r.text);
    setChosen(r.key);
    box.current?.focus();
  };
  return (
    <div className="flex flex-col gap-2.5">
    <form id={formId} action={action} className="flex flex-col gap-2.5">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="flex flex-col gap-1.5" role="group" aria-label={labels.readyReplies}>
        <span className={variant === "panel" ? "text-[12px] font-bold text-muted" : "text-[13px] font-semibold text-ink-3"}>{labels.readyReplies}</span>
        {variant === "panel" ? (
          replies.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => choose(r)}
              aria-pressed={chosen === r.key}
              className={`flex items-start gap-2 rounded-[10px] border px-2.5 py-2 text-start text-[12.5px] leading-snug ${chosen === r.key ? "border-midnight bg-sand" : "border-line bg-white hover:border-line-strong"}`}
            >
              <Icon name={chosen === r.key ? "check_circle" : "chat"} size={16} className={`mt-px shrink-0 ${chosen === r.key ? "text-muted" : "text-faint"}`} />
              <span>{r.text}</span>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-start gap-1.5">
            {replies.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => choose(r)}
                aria-pressed={chosen === r.key}
                title={r.text}
                className={`max-w-full truncate rounded-full border px-3 py-1.5 text-start text-[13px] text-ink-2 ${chosen === r.key ? "border-midnight bg-sand" : "border-line bg-white hover:border-line-strong"}`}
              >
                {r.text}
              </button>
            ))}
          </div>
        )}
      </div>
      <textarea
        ref={box}
        name="text"
        rows={3}
        maxLength={2000}
        required
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (chosen) setChosen(null);
        }}
        aria-label={labels.placeholder}
        placeholder={labels.placeholder}
        className={`input w-full ${variant === "panel" ? "min-h-[86px] border-[1.5px] border-midnight" : "min-h-[86px]"}`}
      />
    </form>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {extra}
        <button type="submit" form={formId} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-midnight px-4 text-sm font-semibold text-ivory hover:opacity-90">
          <Icon name="send" size={17} className="rtl:-scale-x-100" />
          {labels.send}
        </button>
      </div>
    </div>
  );
}

/** A select that saves as soon as it changes (Status, Assigned to), with a button for when scripts don't run. */
export function SaveOnChange({ action, hidden, name, value, label, prefix, options, save }: { action: (formData: FormData) => Promise<void>; hidden: Record<string, string>; name: string; value: string; label: string; prefix?: React.ReactNode; options: { value: string; label: string }[]; save: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="relative flex h-11 items-center gap-2 rounded-xl border border-line bg-white ps-3.5 pe-2 text-[14px]">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {prefix}
      <select name={name} defaultValue={value} aria-label={label} onChange={() => form.current?.requestSubmit()} className="h-full cursor-pointer appearance-none bg-transparent pe-7 font-semibold outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" size={18} className="pointer-events-none absolute end-2.5 text-ink-3" />
      <noscript>
        <button type="submit" className="text-[13px] font-semibold underline">
          {save}
        </button>
      </noscript>
    </form>
  );
}
