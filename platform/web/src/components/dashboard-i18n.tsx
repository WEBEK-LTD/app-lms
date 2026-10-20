"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Lang } from "@/i18n/config";
import { setDocumentLang } from "./html-shell";
import { flattenMessages, formatDate, formatMessage, formatNumber, lookup, translateFrom } from "@/i18n/format";
import type { DashboardMessages, DashT } from "@/i18n/dashboard";
import { nestedValue } from "@/i18n/dashboard/nested";

/**
 * 56 The dashboard's language in client components. The dashboard layout
 * (and /pending) wraps the page in `DashboardI18n` with the person's language
 * and that language's catalog (one language, sent with the page, not in the
 * scripts), so `useDashT()` gives `t("area.key")` like the server's.
 * Shared components (form.tsx) use `useKnownText()` and `useOptionalDashT()`,
 * which do nothing outside the dashboard: the admin and the website are
 * unchanged.
 */

interface DashboardI18nValue {
  lang: Lang;
  t: DashT;
  known: (english: string) => string;
}

const Context = createContext<DashboardI18nValue | null>(null);

export function DashboardI18n({
  lang,
  messages,
  knownEnglish,
  children,
}: {
  lang: Lang;
  messages: DashboardMessages;
  /** The English `known` texts by key (only for Arabic and Turkish): server messages are matched against them. */
  knownEnglish: Record<string, string>;
  children: ReactNode;
}) {
  const value = useMemo<DashboardI18nValue>(() => {
    const t: DashT = (key, values) => formatMessage(lang, lookup(messages, key), values);
    if (lang === "en") return { lang, t, known: (english) => english };
    const source = new Map(Object.entries(knownEnglish));
    const target = new Map([...flattenMessages(messages)].filter(([key]) => source.has(key)));
    return { lang, t, known: (english) => translateFrom(lang, source, target, english, nestedValue(lang, source, target)) };
  }, [lang, messages, knownEnglish]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** `t(key, values)` in the dashboard's language. Only inside the dashboard. */
export function useDashT(): DashT {
  const value = useContext(Context);
  if (!value) throw new Error("useDashT needs the dashboard's DashboardI18n");
  return value.t;
}

/** `t`, or null outside the dashboard (the admin, the website). */
export function useOptionalDashT(): DashT | null {
  return useContext(Context)?.t ?? null;
}

/** The dashboard's language ("en" outside it). */
export function useDashLang(): Lang {
  return useContext(Context)?.lang ?? "en";
}

/** Dates and numbers in the dashboard's language, Latin digits everywhere. */
export function useDashFormat() {
  const lang = useDashLang();
  return useMemo(
    () => ({
      date: (date: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) => formatDate(lang, date, options),
      num: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(lang, value, options),
    }),
    [lang],
  );
}

/** Translates an English server message the catalogs know; outside the dashboard, the text as it is. */
export function useKnownText(): (english: string) => string {
  return useContext(Context)?.known ?? identity;
}

const identity = (text: string) => text;

/**
 * The page's `<html lang dir>` while the dashboard is open (the root layout
 * renders English, because static pages can't read the cookie): the
 * dashboard's own wrapper already has them from the server, so nothing
 * moves; this is for dialogs, the scrollbar side and screen readers.
 */
export function DocumentLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    setDocumentLang(lang);
    return () => setDocumentLang(null);
  }, [lang]);
  return null;
}
