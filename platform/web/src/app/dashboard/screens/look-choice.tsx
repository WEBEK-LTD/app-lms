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
      <span className="relative block">{picture}</span>
      {checked ? (
        // On the card's corner, clear of the picture's own buttons.
        <span aria-hidden="true" className="absolute -end-2 -top-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-midnight text-white shadow-md ring-2 ring-white">
          <Icon name="check" size={17} />
        </span>
      ) : null}
      <span className="text-sm leading-snug font-bold">{title}</span>
      {hint ? <span className="text-xs leading-snug text-muted">{hint}</span> : null}
    </label>
  );
}
