"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * 132.9 One look to choose from in Studio › Screens: its picture (the
 * look drawn as the app draws it), its name and its line, a radio button
 * underneath for the keyboard and screen readers; the one chosen ringed
 * and ticked.
 */
export function LookChoice({ name, value, checked, onChange, title, hint, picture, testId }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; hint?: string; picture: ReactNode; testId?: string }) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-2.5 transition-shadow focus-within:ring-2 focus-within:ring-accent motion-reduce:transition-none ${checked ? "border-midnight ring-2 ring-midnight" : "border-line hover:border-line-strong"}`}
      data-look-choice={testId ?? value}
      data-checked={checked ? "" : undefined}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className="relative block">
        {picture}
        {checked ? (
          <span aria-hidden="true" className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-midnight text-white shadow-md">
            <Icon name="check" size={16} />
          </span>
        ) : null}
      </span>
      <span className="text-sm leading-snug font-bold">{title}</span>
      {hint ? <span className="text-xs leading-snug text-muted">{hint}</span> : null}
    </label>
  );
}
