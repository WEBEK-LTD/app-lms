"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { currencyDigits, currencyOptions, matchesCurrency, type CurrencyOption } from "@/lib/money/currencies";
import { useDashLang, useOptionalDashT } from "./dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { en as moneyEn } from "@/i18n/dashboard/money";
import { FieldError } from "./form";

const subscribe = () => () => undefined;

/**
 * 133.3 The currency an app sells in, from every active ISO 4217 currency:
 * a search box (name in the dashboard's language, code or sign) over a
 * plain select, the usual ones first (EGP, SAR, AED, KWD…), then the others
 * A–Z. The names come from the browser (Intl.DisplayNames), so the page
 * first renders the chosen code alone and the full list once it runs in
 * the browser (no mismatch with the server's list). `gateway` is the card
 * gateway the app takes payments through: a currency it doesn't take says
 * so under the field. The select keeps the form's `name` and the label, as
 * before 133.
 */
export function CurrencyPicker({
  name = "currency",
  id: idProp,
  label,
  value: controlled,
  defaultValue,
  onChange,
  error,
  hint,
  disabled,
  gateway,
  className = "",
}: {
  name?: string;
  id?: string;
  label?: string;
  /** Controlled; else `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** The app's card gateway and the currencies it takes; null: none set up. */
  gateway?: { provider: string; currencies: readonly string[] } | null;
  className?: string;
}) {
  const t = useOptionalDashT();
  const lang = useDashLang();
  const generated = useId();
  const id = idProp ?? `f-${name}`;
  const searchId = `${id}-search-${generated.replace(/:/g, "")}`;
  const [own, setOwn] = useState(defaultValue ?? controlled ?? "");
  const value = controlled ?? own;
  const [query, setQuery] = useState("");
  // The full list only in the browser (its own Intl names): no hydration mismatch.
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const all = useMemo(() => (inBrowser ? currencyOptions(lang) : []), [inBrowser, lang]);
  const shown = useMemo(() => all.filter((o) => matchesCurrency(o, query)), [all, query]);
  const current = all.find((o) => o.code === value) ?? null;
  // The chosen one stays in the select while searching, so the form never sends another.
  const usual = shown.filter((o) => o.usual);
  const others = shown.filter((o) => !o.usual);
  const keepCurrent = value && !shown.some((o) => o.code === value);
  // Outside the dashboard (the admin): the English texts.
  const text = (key: `money.${Exclude<keyof typeof moneyEn, "known">}`, values?: Record<string, string | number>) =>
    t ? t(key as DashKey, values) : moneyEn[key.slice(6) as Exclude<keyof typeof moneyEn, "known">].replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));
  const optionLabel = (o: CurrencyOption) => (o.symbol && o.symbol !== o.code ? `${o.name} · ${o.code} · ${o.symbol}` : `${o.name} · ${o.code}`);
  const digits = value ? currencyDigits(value) : 2;
  const gatewayRefuses = gateway && value && !gateway.currencies.includes(value);
  const list = gateway ? listOf(gateway.currencies) : "";
  const hintId = `${id}-hint`;
  const noteId = `${id}-note`;
  const describedBy = [hint ? hintId : null, digits !== 2 || gatewayRefuses ? noteId : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const choose = (code: string) => {
    setOwn(code);
    onChange?.(code);
  };
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label ?? text("money.label")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={text("money.searchPlaceholder")}
          aria-label={text("money.search")}
          aria-controls={id}
          disabled={disabled || !inBrowser}
          autoComplete="off"
          className="input sm:max-w-[220px]"
        />
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => choose(e.target.value)}
          disabled={disabled}
          className="input min-w-0 flex-1"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {!inBrowser ? (
            <option value={value}>{value}</option>
          ) : (
            <>
              {keepCurrent && current ? <option value={current.code}>{optionLabel(current)}</option> : null}
              {usual.length ? (
                <optgroup label={text("money.usual")}>
                  {usual.map((o) => (
                    <option key={o.code} value={o.code}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length ? (
                <optgroup label={text("money.all")}>
                  {others.map((o) => (
                    <option key={o.code} value={o.code}>
                      {optionLabel(o)}
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
          {text("money.none", { query })}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      {value && (digits !== 2 || gatewayRefuses) ? (
        <span id={noteId} className="flex flex-col gap-1 text-xs">
          {digits === 0 ? <span className="text-muted">{text("money.digits0", { code: value })}</span> : null}
          {digits === 3 ? <span className="text-muted">{text("money.digits3", { code: value })}</span> : null}
          {gatewayRefuses ? <span className="font-semibold text-warn">{text("money.gatewayNo", { provider: gateway.provider, code: value, list })}</span> : null}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** "EGP, USD or EUR"; a long list (Stripe's) as its first few and a count. */
function listOf(codes: readonly string[]): string {
  if (codes.length > 8) return `${codes.slice(0, 6).join(", ")} +${codes.length - 6}`;
  return codes.join(", ");
}
