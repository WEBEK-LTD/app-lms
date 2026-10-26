"use client";

import { useActionState } from "react";
import { saveAppDefaultsAction } from "@/app/actions/app-defaults";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { CARD_LABELS, CORNER_LABELS, TEMPLATE_LABELS, THEME_MODE_LABELS } from "@/lib/pages/labels";
import { languageName } from "@/lib/i18n/locales";
import { FontPicker } from "@/components/font-picker";
import { APP_TEMPLATES, CARD_STYLES, CORNERS, LANGUAGE_CODES, THEME_MODES, type AppDefaultsSetting } from "@/lib/pages/types";

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { id: string; label: string }[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`f-defaults-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <select id={`f-defaults-${name}`} name={name} defaultValue={value} className="input input-sm">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const list = <T extends string>(ids: readonly T[], labels: Record<T, string>) => ids.map((id) => ({ id, label: labels[id] }));

/** 11.9: the look and languages a new app starts with. */
export function AppDefaultsForm({ current }: { current: AppDefaultsSetting }) {
  const [state, action] = useActionState(saveAppDefaultsAction, initialFormState);
  const v = state.values;
  const a = current.appearance;
  const chosen = new Set(v ? v.languages!.split(",") : current.languages.available);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={JSON.stringify(v ?? current)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select name="template" label="Template" value={v?.template ?? a.template} options={list(APP_TEMPLATES, TEMPLATE_LABELS)} />
        <Select name="theme_mode" label="Opens in" value={v?.theme_mode ?? a.theme_mode} options={list(THEME_MODES, THEME_MODE_LABELS)} />
        <Select name="corners" label="Corners" value={v?.corners ?? a.corners} options={list(CORNERS, CORNER_LABELS)} />
        <Select name="cards" label="Cards" value={v?.cards ?? a.cards} options={list(CARD_STYLES, CARD_LABELS)} />
        <Select
          name="default_language"
          label="Default language"
          value={v?.default_language ?? current.languages.default}
          options={LANGUAGE_CODES.map((l) => ({ id: l, label: languageName(l) }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FontPicker
          id="f-defaults-font"
          name="font"
          label="Font"
          value={v?.font ?? a.font_family ?? a.font}
          labels={{ arabicOnly: "Only fonts with Arabic letters", none: "No font has this name.", sample: "The app's text looks like this · نص التطبيق" }}
        />
        <FontPicker
          id="f-defaults-arabic-font"
          name="arabic_font"
          label="Font for Arabic text"
          value={v?.arabic_font || a.arabic_font || "Readex Pro"}
          labels={{ arabicOnly: "Only fonts with Arabic letters", none: "No font has this name.", sample: "نص التطبيق يبدو هكذا · The app's text" }}
          arabicOnly
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input
          type="checkbox"
          name="user_can_change_mode"
          defaultChecked={v ? v.user_can_change_mode === "on" : a.user_can_change_mode}
          className="h-4 w-4 accent-midnight"
        />
        People can switch between light and dark mode
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Languages turned on</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {LANGUAGE_CODES.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="languages" value={l} defaultChecked={chosen.has(l)} className="h-4 w-4 accent-midnight" />
              {languageName(l)}
            </label>
          ))}
        </div>
        <span className="text-xs text-muted">The default language is always on.</span>
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save defaults
        </SubmitButton>
      </div>
    </form>
  );
}
