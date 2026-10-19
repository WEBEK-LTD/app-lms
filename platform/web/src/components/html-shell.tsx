"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { DEFAULT_LANG, isPrefixedLang, LANG_INFO } from "@/i18n/config";

/**
 * 55 The page's <html>, with the language and the direction of the page the
 * visitor is on: the `[lang]` of /ar/… and /tr/… pages, English everywhere
 * else. It reads the route's parameters while the page is rendered (on the
 * server too), so pages made ahead of time keep being made ahead of time.
 */
export function HtmlShell({ className, children }: { className: string; children: ReactNode }) {
  const params = useParams<{ lang?: string }>();
  const lang = isPrefixedLang(params?.lang) ? params.lang : DEFAULT_LANG;
  return (
    <html lang={lang} dir={LANG_INFO[lang].dir} className={className}>
      {children}
    </html>
  );
}
