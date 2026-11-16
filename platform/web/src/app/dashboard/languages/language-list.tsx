"use client";

import { useState, useSyncExternalStore } from "react";
import { Badge, btn } from "@/components/ui";
import { KitStatus, kit } from "@/components/studio-page";
import { Icon } from "@/components/icon";
import { isBuiltInLanguage, isRtl, languageName, LOCALES, localeInfo } from "@/lib/i18n/locales";
import type { Languages } from "@/lib/pages/types";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { LANG_INFO } from "@/i18n/config";
import { appLanguageName } from "@/lib/i18n/language-names";

const noSubscribe = () => () => {};

/**
 * 43 The app's languages: add any language from the list (with its name in
 * the language itself), choose the default, put them in the order the app's
 * picker shows, remove one. Shared by Pages & look › Languages and the
 * Languages page; the parent saves.
 */
export function LanguageList({
  languages,
  onChange,
  full,
  max,
  idPrefix = "languages",
  look = "card",
}: {
  languages: Languages;
  /** `defaultTo`: the default changed to this language (the parent moves the texts). */
  onChange: (next: Languages, defaultTo?: string) => void;
  /** The plan's languages are all in use. */
  full: boolean;
  max: number;
  idPrefix?: string;
  /** 132.137 "kit": the Languages page's premium look (rows on hairlines, pills); Pages & look keeps its cards. */
  look?: "card" | "kit";
}) {
  const premium = look === "kit";
  const Pill = premium ? KitStatus : Badge;
  const iconButton = premium ? `${kit.icon} disabled:cursor-not-allowed disabled:opacity-40` : iconBtn;
  const t = useDashT();
  const dashLang = useDashLang();
  const nameOf = (code: string) => appLanguageName(code, dashLang);
  const [adding, setAdding] = useState("");
  const list = languages.available;
  // 132.66 The languages to add are named by the browser's language data, which isn't the server's: on the
  // server and until the page is live they're listed by their English names in the list's own order (the same
  // on both, so the page hydrates without a mismatch), then in the dashboard's language, sorted.
  const live = useSyncExternalStore(noSubscribe, () => true, () => false);
  const left = LOCALES.filter((l) => !list.includes(l.code));
  const choices = live
    ? left.map((l) => ({ ...l, name: nameOf(l.code) })).sort((a, b) => a.name.localeCompare(b.name, LANG_INFO[dashLang].intl))
    : left.map((l) => ({ ...l, name: languageName(l.code) }));
  const atMax = list.length >= max;

  function move(code: string, by: number) {
    const from = list.indexOf(code);
    const to = from + by;
    if (from < 0 || to < 0 || to >= list.length) return;
    const next = [...list];
    next.splice(from, 1);
    next.splice(to, 0, code);
    onChange({ default: languages.default, available: next });
  }

  function add() {
    if (!adding || list.includes(adding) || full || atMax) return;
    onChange({ default: languages.default, available: [...list, adding] });
    setAdding("");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className={`m-0 flex list-none flex-col p-0 ${premium ? "" : "gap-2"}`} aria-label={t("languages.inApp")}>
        {list.map((code, i) => {
          const info = localeInfo(code);
          const name = info ? nameOf(code) : code;
          const isDefault = code === languages.default;
          return (
            <li
              key={code}
              className={premium ? "flex flex-wrap items-center justify-between gap-3 border-t border-(--sp-line-soft) py-3.5 first:border-t-0 first:pt-0" : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"}
              data-language={code}
            >
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                  {name}
                  {info && info.nativeName !== name ? (
                    <span lang={code} dir={isRtl(code) ? "rtl" : "ltr"} className={`font-normal ${premium ? "text-(--sp-muted)" : "text-muted"}`}>
                      {info.nativeName}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {isDefault ? <Pill tone="info">{t("languages.default")}</Pill> : null}
                  {isRtl(code) ? <Pill tone="neutral">{t("languages.rtl")}</Pill> : null}
                  {isBuiltInLanguage(code) ? <Pill tone="success">{t("languages.byYallapp")}</Pill> : <Pill tone="warn">{t("languages.youTranslate")}</Pill>}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isDefault ? null : (
                  <button type="button" className={premium ? kit.row : `${btn.secondary} h-9 px-3 text-sm`} onClick={() => onChange({ default: code, available: list }, code)}>
                    {t("languages.makeDefault")}
                  </button>
                )}
                <button type="button" className={iconButton} aria-label={t("languages.moveUp", { name })} disabled={i === 0} onClick={() => move(code, -1)}>
                  <Icon name="arrow_upward" size={18} />
                </button>
                <button type="button" className={iconButton} aria-label={t("languages.moveDown", { name })} disabled={i === list.length - 1} onClick={() => move(code, 1)}>
                  <Icon name="arrow_downward" size={18} />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  aria-label={t("languages.remove", { name })}
                  disabled={isDefault}
                  title={isDefault ? t("languages.defaultFirst") : undefined}
                  onClick={() => onChange({ default: languages.default, available: list.filter((c) => c !== code) })}
                >
                  <Icon name="delete" size={18} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-[0_1_340px] flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-add`} className="text-sm font-semibold">
            {t("languages.addLanguage")}
          </label>
          <select id={`${idPrefix}-add`} value={adding} onChange={(e) => setAdding(e.target.value)} className="input input-sm" disabled={full || atMax}>
            <option value="">{t("languages.chooseLanguage")}</option>
            {choices.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName === l.name ? l.name : `${l.name} (${l.nativeName})`}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={premium ? kit.quiet : `${btn.secondary} h-10 px-4 text-sm`} disabled={!adding || full || atMax} onClick={add}>
          <Icon name="add" size={18} />
          {t("common.add")}
        </button>
      </div>
      <p className={`m-0 text-sm ${premium ? "text-(--sp-muted)" : "text-muted"}`}>
        {t("languages.listText")}
        {atMax ? ` ${t("languages.atMax", { max })}` : ""}
      </p>
    </div>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-midnight hover:border-midnight disabled:cursor-not-allowed disabled:opacity-40";
