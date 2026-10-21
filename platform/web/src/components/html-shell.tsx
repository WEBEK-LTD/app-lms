"use client";

import { useParams } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LANG, isPrefixedLang, LANG_INFO, type Lang } from "@/i18n/config";

/**
 * 56 The client dashboard's language, set while it is open
 * (components/dashboard-i18n.tsx `DocumentLang`): the dashboard has no
 * language in its address, and the root layout can't read the cookie without
 * making every page dynamic. Pages rendered on the server keep English here;
 * the dashboard's own wrapper has the right `lang` and `dir` from the start.
 */
let override: Lang | null = null;
const listeners = new Set<() => void>();

export function setDocumentLang(lang: Lang | null): void {
  override = lang;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 55 The page's <html>, with the language and the direction of the page the
 * visitor is on: the `[lang]` of /ar/… and /tr/… pages, English everywhere
 * else (56: the dashboard's language while it is open). It reads the route's
 * parameters while the page is rendered (on the server too), so pages made
 * ahead of time keep being made ahead of time.
 */
export function HtmlShell({ className, children }: { className: string; children: ReactNode }) {
  const params = useParams<{ lang?: string }>();
  const dashboard = useSyncExternalStore(
    subscribe,
    () => override,
    () => null,
  );
  const lang = dashboard ?? (isPrefixedLang(params?.lang) ? params.lang : DEFAULT_LANG);
  return (
    // 73 `data-theme` is set by the theme script before React starts (components/theme-script.tsx).
    <html lang={lang} dir={LANG_INFO[lang].dir} className={className} suppressHydrationWarning>
      {children}
    </html>
  );
}
