"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { appLanguageName } from "@/lib/i18n/language-names";
import { screenTextState, type WordForms } from "@/lib/pages/template-translations";

/** 181 What Studio › Screens needs to tell the template's words from the owner's. */
interface ScreenWords {
  /** The app's main language: its texts are the owner's. */
  main: string | null;
  /** Yallapp's words the screens use now (lib/pages/template-translations.ts `screenWordsIn`). */
  words: readonly WordForms[];
  appName: string;
}

const ScreenWordsContext = createContext<ScreenWords | null>(null);

export function ScreenWordsProvider({ value, children }: { value: ScreenWords; children: ReactNode }) {
  return <ScreenWordsContext.Provider value={value}>{children}</ScreenWordsContext.Provider>;
}

/**
 * 181 Under a Studio › Screens text in a language other than the app's main
 * one, what the app shows there, as the page inspector says it (156,
 * `TextInApp`): the owner's own translation, Yallapp's translation of the
 * text (the template's, while the main language's text is still its word),
 * or the owner's text (none given, or the template's word for a text they
 * changed: left out, `withoutStaleScreenTexts`).
 */
export function ScreenTextState({ texts, lang, className = "" }: { texts: Readonly<Record<string, string>>; lang: string; className?: string }) {
  const t = useDashT();
  const dashLang = useDashLang();
  const context = useContext(ScreenWordsContext);
  const main = context?.main;
  if (!context || !main || lang === main || !texts[main]?.trim()) return null;
  const state = screenTextState(texts, lang, main, { appName: context.appName, more: context.words });
  const key: DashKey = state === "own" ? "studio.textOwn" : state === "template" ? "studio.textYallapp" : "studio.textFollows";
  return (
    <span className={`text-xs font-normal text-muted ${className}`.trim()} data-screen-text-state={state === "stale" ? "none" : state} data-language={lang}>
      {t(key, { lang: appLanguageName(lang, dashLang) })}
    </span>
  );
}
