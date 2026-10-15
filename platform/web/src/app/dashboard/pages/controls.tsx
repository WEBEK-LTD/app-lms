"use client";

import type { ReactNode } from "react";
import { PAGE_ICONS } from "@/lib/pages/icons";
import { textIn, withText } from "@/lib/pages/model";
import { actionProblem, screenName, SOURCE_NAMES, type ScreenOption } from "@/lib/pages/sources";
import { LANGUAGE_NAMES, RTL_LANGUAGES, type Action, type ItemSource, type LanguageCode, type Translations } from "@/lib/pages/types";

/** Form controls of the page and look editor. Every one has a visible label. */

export function TextInput({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  dir,
  rows,
  type = "text",
  inputMode,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  rows?: number;
  type?: string;
  inputMode?: "numeric" | "decimal" | "url";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {rows ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          dir={dir}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="input min-h-[96px] py-2.5"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          dir={dir}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="input input-sm"
        />
      )}
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function SelectInput<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="input input-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-[15px] ${disabled ? "text-muted" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

export interface Lang {
  /** The language whose texts are being edited. */
  edit: LanguageCode;
  default: LanguageCode;
}

/**
 * A text the client writes, in the language being edited. Other languages
 * show the default text as a placeholder; empty falls back to it.
 */
export function LangText<T extends { translations?: Translations } & object>({
  id,
  label,
  value,
  field,
  lang,
  onChange,
  rows,
  hint,
}: {
  id: string;
  label: string;
  value: T;
  field: string;
  lang: Lang;
  onChange: (value: T) => void;
  rows?: number;
  hint?: ReactNode;
}) {
  const other = lang.edit !== lang.default;
  return (
    <TextInput
      id={`${id}-${lang.edit}`}
      label={other ? `${label} (${LANGUAGE_NAMES[lang.edit]})` : label}
      value={textIn(value, field, lang.edit, lang.default)}
      placeholder={other ? textIn(value, field, lang.default, lang.default) : undefined}
      dir={RTL_LANGUAGES.includes(lang.edit) ? "rtl" : "ltr"}
      rows={rows}
      hint={other ? `Empty shows the ${LANGUAGE_NAMES[lang.default]} text.` : hint}
      onChange={(text) => onChange(withText(value, field, text, lang.edit, lang.default))}
    />
  );
}

export function IconGlyph({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span aria-hidden="true" className="material-symbols-rounded flex-none" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

/** Material Symbols (Rounded) icons to pick from, shown as icons. */
export function IconPicker({ id, label, value, onChange, optional = false }: { id: string; label: string; value: string | null; onChange: (icon: string | null) => void; optional?: boolean }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 flex items-center gap-2 p-0 text-sm font-semibold">
        {label}: {value ? <IconGlyph name={value} /> : null}
        <span className="font-normal text-muted">{value ? value.replaceAll("_", " ") : "none"}</span>
      </legend>
      <details className="rounded-[10px] border border-line px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">Change icon</summary>
        <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-1.5">
          {optional ? (
            <label className="flex h-10 cursor-pointer items-center rounded-lg border border-line px-2.5 text-sm has-[:checked]:border-2 has-[:checked]:border-midnight">
              <input type="radio" name={id} className="sr-only" checked={value === null} onChange={() => onChange(null)} />
              No icon
            </label>
          ) : null}
          {PAGE_ICONS.map((icon) => (
            <label
              key={icon}
              title={icon.replaceAll("_", " ")}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line has-[:checked]:border-2 has-[:checked]:border-midnight has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-midnight"
            >
              <input type="radio" name={id} value={icon} className="sr-only" checked={value === icon} onChange={() => onChange(icon)} aria-label={icon.replaceAll("_", " ")} />
              <IconGlyph name={icon} />
            </label>
          ))}
        </div>
      </details>
    </fieldset>
  );
}

type ActionKind = "none" | Action["type"];

/** The screen a new tap action opens: Account, which every app has (31), else the app's first screen. */
export function firstScreen(screens: readonly ScreenOption[]): Action["screen"] {
  return screens.some((s) => s.value === "account") ? "account" : (screens.find((s) => !s.alias)?.value ?? "account");
}

/** What happens on tap: a page, a screen the app has, (Academy apps) a course, or a web address. */
export function ActionEditor({
  id,
  label,
  action,
  optional,
  onChange,
  pages,
  sources,
  screens,
  courses,
}: {
  id: string;
  label: string;
  action: Action | null | undefined;
  optional: boolean;
  onChange: (action: Action | null) => void;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  /** 31 The screens this app's type opens (lib/pages/sources.ts). */
  screens: ScreenOption[];
  courses: { id: string; title: string }[] | undefined;
}) {
  const kind: ActionKind = action?.type ?? "none";
  // 31 A layout from before the app's type changed may open what this app doesn't have: it shows, with what to fix.
  const problem = actionProblem(action, screens, sources);
  const screenOptions = [
    ...screens.filter((s) => !s.alias || s.value === action?.screen),
    ...(action?.type === "screen" && action.screen && !screens.some((s) => s.value === action.screen) ? [{ value: action.screen, label: `${screenName(action.screen)} (not in this app)` }] : []),
  ];
  const options: { value: ActionKind; label: string }[] = [
    ...(optional ? [{ value: "none" as const, label: "Nothing" }] : []),
    { value: "page", label: "Opens a page" },
    { value: "screen", label: "Opens a screen of the app" },
    ...(kind === "course" || sources.includes("courses") ? [{ value: "course" as const, label: "Opens a course" }] : []),
    { value: "url", label: "Opens a web address" },
    ...(kind === "item" || sources.some((s) => s !== "courses" && s !== "posts") ? [{ value: "item" as const, label: "Opens an entry" }] : []),
  ];
  const change = (next: ActionKind) => {
    if (next === "none") onChange(null);
    else if (next === "page") onChange({ type: "page", page_slug: pages[0]?.slug ?? "" });
    else if (next === "screen") onChange({ type: "screen", screen: firstScreen(screens) });
    else if (next === "course") onChange({ type: "course", course_id: Number(courses?.[0]?.id ?? 0) || null });
    else if (next === "url") onChange({ type: "url", url: "", open_in: "in_app" });
    else onChange({ type: "item", item: { source: sources.find((s) => s !== "courses" && s !== "posts") ?? sources[0] ?? "products", id: "" } });
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ivory/60 p-3">
      <SelectInput id={`${id}-type`} label={label} value={kind} options={options} onChange={change} />
      {problem ? (
        <p role="alert" className="m-0 flex items-start gap-1.5 rounded-lg bg-warn-bg px-3 py-2 text-sm font-semibold text-warn">
          <IconGlyph name="warning" size={18} />
          {problem}
        </p>
      ) : null}
      {action?.type === "page" ? (
        <SelectInput
          id={`${id}-page`}
          label="Page"
          value={action.page_slug ?? ""}
          options={[...(pages.some((p) => p.slug === action.page_slug) ? [] : [{ value: action.page_slug ?? "", label: "Choose a page" }]), ...pages.map((p) => ({ value: p.slug, label: p.title || p.slug }))]}
          onChange={(slug) => onChange({ type: "page", page_slug: slug })}
        />
      ) : null}
      {action?.type === "screen" ? (
        <SelectInput
          id={`${id}-screen`}
          label="Screen"
          value={action.screen ?? firstScreen(screens) ?? "account"}
          options={screenOptions}
          onChange={(screen) => onChange({ type: "screen", screen })}
        />
      ) : null}
      {action?.type === "course" ? (
        courses?.length ? (
          <SelectInput
            id={`${id}-course`}
            label="Course"
            value={String(action.course_id ?? "")}
            options={[...(courses.some((c) => c.id === String(action.course_id)) ? [] : [{ value: String(action.course_id ?? ""), label: "Choose a course" }]), ...courses.map((c) => ({ value: c.id, label: c.title }))]}
            onChange={(courseId) => onChange({ type: "course", course_id: Number(courseId) || null })}
          />
        ) : (
          <TextInput
            id={`${id}-course`}
            label="Course ID"
            inputMode="numeric"
            value={action.course_id ? String(action.course_id) : ""}
            hint="The course's ID on your website."
            onChange={(v) => onChange({ type: "course", course_id: Number(v.replace(/\D/g, "")) || null })}
          />
        )
      ) : null}
      {action?.type === "url" ? (
        <>
          <TextInput id={`${id}-url`} label="Web address" type="url" inputMode="url" placeholder="https://" value={action.url ?? ""} onChange={(url) => onChange({ ...action, url })} />
          <Check label="Open in the phone's browser" checked={action.open_in === "browser"} onChange={(b) => onChange({ ...action, open_in: b ? "browser" : "in_app" })} />
        </>
      ) : null}
      {action?.type === "item" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            id={`${id}-item-source`}
            label="Kind"
            value={action.item?.source ?? sources[0] ?? "products"}
            options={sources.filter((s) => s !== "posts").map((s) => ({ value: s, label: SOURCE_NAMES[s] }))}
            onChange={(source) => onChange({ type: "item", item: { source, id: action.item?.id ?? "" } })}
          />
          <TextInput
            id={`${id}-item-id`}
            label="Entry ID"
            value={action.item?.id ?? ""}
            onChange={(itemId) => onChange({ type: "item", item: { source: action.item?.source ?? sources[0] ?? "products", id: itemId.trim() } })}
          />
        </div>
      ) : null}
    </div>
  );
}
