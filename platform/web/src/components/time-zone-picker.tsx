"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LANG_INFO } from "@/i18n/config";
import type { DashKey } from "@/i18n/dashboard";
import { en as zonesEn } from "@/i18n/dashboard/zones";
import { matchesZone, zoneOptions } from "@/lib/time/zones";
import { useDashLang, useOptionalDashT } from "./dashboard-i18n";
import { FieldError } from "./form";

const subscribe = () => () => undefined;

/**
 * 136 The time zone an app (or a team member) works in, from every IANA
 * zone: a search box (city, zone, its name in the dashboard's language or
 * the offset, "+3") over a plain select, the zones Yallapp's clients are in
 * first (Istanbul, Cairo, the Gulf…), then the rest by offset. Each reads
 * "UTC+03:00 · Istanbul · Türkiye Standard Time". As the currency picker
 * (components/currency-picker.tsx), the server renders the chosen zone
 * alone and the browser the full list (its own offsets and names: no
 * mismatch), and the select keeps the form's `name`, so the server action
 * reads the field as before. The saved zone stays in the list even when
 * the browser doesn't know it.
 */
export function TimeZonePicker({
  name = "timezone",
  id: idProp,
  label,
  value: controlled,
  defaultValue,
  onChange,
  error,
  hint,
  hintId: hintIdProp,
  disabled,
  size,
  className = "",
  selectClassName,
  inputClassName,
}: {
  name?: string;
  id?: string;
  /** The field's label; null: the page shows its own label for `id`. */
  label?: string | null;
  /** Controlled; else `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (zone: string) => void;
  error?: string;
  hint?: string;
  /** The id of a hint the page shows itself, for aria-describedby. */
  hintId?: string;
  disabled?: boolean;
  /** "sm": the compact fields of the console's settings. */
  size?: "sm";
  className?: string;
  /** Replaces the fields' classes (the admin's mailing editor has its own). */
  selectClassName?: string;
  inputClassName?: string;
}) {
  const t = useOptionalDashT();
  const lang = useDashLang();
  const generated = useId();
  const id = idProp ?? `f-${name}`;
  const searchId = `${id}-search-${generated.replace(/:/g, "")}`;
  const [own, setOwn] = useState(defaultValue ?? controlled ?? "");
  const value = controlled ?? own;
  const [query, setQuery] = useState("");
  // The full list only in the browser (its own Intl data): no hydration mismatch.
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const all = useMemo(() => (inBrowser ? zoneOptions(LANG_INFO[lang].intl, value) : []), [inBrowser, lang, value]);
  const shown = useMemo(() => all.filter((o) => matchesZone(o, query)), [all, query]);
  const current = all.find((o) => o.value === value) ?? null;
  // The chosen one stays in the select while searching, so the form never sends another.
  const keepCurrent = value && !shown.some((o) => o.value === value);
  const usual = shown.filter((o) => o.served);
  const others = shown.filter((o) => !o.served);
  // Outside the dashboard (the admin): the English texts.
  const text = (key: keyof typeof zonesEn, values?: Record<string, string | number>) =>
    t ? t(`zones.${key}` as DashKey, values) : zonesEn[key].replace(/\{(\w+)\}/g, (_, n: string) => String(values?.[n] ?? ""));
  const hintId = hint ? `${id}-hint` : hintIdProp;
  const describedBy = [hintId, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const choose = (zone: string) => {
    setOwn(zone);
    onChange?.(zone);
  };
  // React resets a form after its action: the browser would then show the
  // first zone of the list, and send it next time. The one chosen is put back.
  const select = useRef<HTMLSelectElement>(null);
  const chosen = useRef(value);
  useEffect(() => {
    chosen.current = value;
  }, [value]);
  useEffect(() => {
    const form = select.current?.form;
    if (!form) return;
    const keep = () =>
      setTimeout(() => {
        if (select.current && select.current.value !== chosen.current) select.current.value = chosen.current;
      }, 0);
    form.addEventListener("reset", keep);
    return () => form.removeEventListener("reset", keep);
  }, []);
  const sm = size === "sm" ? " input-sm" : "";
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {label === null ? null : (
        <label htmlFor={id} className="text-sm font-semibold">
          {label ?? text("label")}
        </label>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={text("searchPlaceholder")}
          aria-label={text("search")}
          aria-controls={id}
          disabled={disabled || !inBrowser}
          autoComplete="off"
          className={inputClassName ?? `input${sm} sm:max-w-[200px]`}
        />
        <select
          ref={select}
          id={id}
          name={name}
          value={value}
          onChange={(e) => choose(e.target.value)}
          disabled={disabled}
          dir="ltr"
          className={selectClassName ?? `input${sm} min-w-0 flex-1`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {!inBrowser ? (
            <option value={value}>{value.replace(/_/g, " ")}</option>
          ) : (
            <>
              {keepCurrent && current ? <option value={current.value}>{current.label}</option> : null}
              {usual.length ? (
                <optgroup label={text("usual")}>
                  {usual.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length ? (
                <optgroup label={text("all")}>
                  {others.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </>
          )}
        </select>
      </div>
      {query && inBrowser && shown.length === 0 ? (
        <span role="status" className="text-xs text-muted">
          {text("none", { query })}
        </span>
      ) : null}
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
