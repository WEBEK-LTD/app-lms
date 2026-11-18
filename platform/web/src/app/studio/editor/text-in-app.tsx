"use client";

import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { appLanguageName } from "@/lib/i18n/language-names";
import { hasPlaceholder, translationState } from "@/lib/pages/template-translations";
import type { LanguageCode, Translations } from "@/lib/pages/types";

/**
 * 156 What each of the app's other languages shows for this text: the
 * owner's text (no translation, or the template's for a text they changed),
 * Yallapp's translation (the template's, of the text as it still is), or
 * their own. Editing another language, that language only. A template's
 * [placeholder] still there says the app leaves it out until it's written.
 */
export function TextInApp(props: { value: { translations?: Translations }; field: string; lang: LanguageCode; defaultLang: LanguageCode; languages?: readonly LanguageCode[]; appName?: string }) {
  const t = useDashT();
  const dashLang = useDashLang();
  const text = (props.value as Record<string, unknown>)[props.field];
  const others = (props.lang === props.defaultLang ? (props.languages ?? []).filter((l) => l !== props.defaultLang) : [props.lang]).filter((l) => l !== props.defaultLang);
  // 156 The template's [placeholder], still to be written: the app leaves it out until then.
  const shown = props.lang === props.defaultLang ? text : (props.value.translations?.[props.lang]?.[props.field] ?? text);
  const placeholder = hasPlaceholder(shown, { appName: props.appName });
  if ((!others.length && !placeholder) || typeof text !== "string" || !text.trim()) return null;
  const lines = others.map((lang) => {
    const state = translationState(props.value, props.field, lang, { appName: props.appName });
    const key: DashKey = state === "own" ? "studio.textOwn" : state === "template" ? "studio.textYallapp" : "studio.textFollows";
    return { lang, state, words: t(key, { lang: appLanguageName(lang, dashLang) }) };
  });
  return (
    <span className="flex flex-col text-xs font-normal" style={{ color: "var(--sf-muted)" }} data-text-in-app={props.field}>
      {placeholder ? (
        <span className="font-semibold" style={{ color: "#B45309" }} data-placeholder="">
          {t("studio.textPlaceholder")}
        </span>
      ) : null}
      {lines.length ? <span className="font-bold">{t("studio.textInApp")}</span> : null}
      {lines.map((l) => (
        <span key={l.lang} data-language={l.lang} data-state={l.state === "stale" ? "none" : l.state}>
          {l.words}
        </span>
      ))}
    </span>
  );
}
