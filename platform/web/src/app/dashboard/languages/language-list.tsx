"use client";

import { useState } from "react";
import { Badge, btn } from "@/components/ui";
import { Icon } from "@/components/icon";
import { isBuiltInLanguage, isRtl, LOCALES, localeInfo } from "@/lib/i18n/locales";
import type { Languages } from "@/lib/pages/types";

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
}: {
  languages: Languages;
  /** `defaultTo`: the default changed to this language (the parent moves the texts). */
  onChange: (next: Languages, defaultTo?: string) => void;
  /** The plan's languages are all in use. */
  full: boolean;
  max: number;
  idPrefix?: string;
}) {
  const [adding, setAdding] = useState("");
  const list = languages.available;
  const choices = LOCALES.filter((l) => !list.includes(l.code)).sort((a, b) => a.name.localeCompare(b.name, "en"));
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
      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Languages in the app">
        {list.map((code, i) => {
          const info = localeInfo(code);
          const name = info?.name ?? code;
          const isDefault = code === languages.default;
          return (
            <li key={code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3" data-language={code}>
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                  {name}
                  {info && info.nativeName !== name ? (
                    <span lang={code} dir={isRtl(code) ? "rtl" : "ltr"} className="font-normal text-muted">
                      {info.nativeName}
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {isDefault ? <Badge tone="info">Default</Badge> : null}
                  {isRtl(code) ? <Badge tone="neutral">Right to left</Badge> : null}
                  {isBuiltInLanguage(code) ? <Badge tone="success">Translated by Yallapp</Badge> : <Badge tone="warn">You translate</Badge>}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isDefault ? null : (
                  <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => onChange({ default: code, available: list }, code)}>
                    Make default
                  </button>
                )}
                <button type="button" className={iconBtn} aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => move(code, -1)}>
                  <Icon name="arrow_upward" size={18} />
                </button>
                <button type="button" className={iconBtn} aria-label={`Move ${name} down`} disabled={i === list.length - 1} onClick={() => move(code, 1)}>
                  <Icon name="arrow_downward" size={18} />
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  aria-label={`Remove ${name}`}
                  disabled={isDefault}
                  title={isDefault ? "Make another language the default first." : undefined}
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
            Add a language
          </label>
          <select id={`${idPrefix}-add`} value={adding} onChange={(e) => setAdding(e.target.value)} className="input input-sm" disabled={full || atMax}>
            <option value="">Choose a language</option>
            {choices.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName === l.name ? l.name : `${l.name} (${l.nativeName})`}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={`${btn.secondary} h-10 px-4 text-sm`} disabled={!adding || full || atMax} onClick={add}>
          <Icon name="add" size={18} />
          Add
        </button>
      </div>
      <p className="m-0 text-sm text-muted">
        Yallapp translates the app into English, Arabic and Turkish, also the tab names and texts it writes for you. Any other language starts in English until you translate it on
        the Languages page. People pick a language in the app&apos;s settings; right-to-left languages turn the whole app around.
        {atMax ? ` An app can have up to ${max} languages.` : ""}
      </p>
    </div>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-midnight hover:border-midnight disabled:cursor-not-allowed disabled:opacity-40";
