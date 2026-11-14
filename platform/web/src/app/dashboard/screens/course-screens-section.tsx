"use client";

import { useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { CourseScreenDrawing, type CourseScreenPart } from "@/components/studio/course-screens";
import type { DashKey } from "@/i18n/dashboard";
import type { PickableEntry } from "@/lib/hosted/pages/pickable";
import {
  CARD_LAYOUTS,
  CARD_PARTS,
  CARD_RATIOS,
  COURSE_LOOK_DEFAULTS,
  COURSE_LOOKS,
  COURSE_SCREEN_LIMITS,
  LESSON_PARTS,
  LESSON_PLAYERS,
  LESSON_PROGRESS,
  MINE_LAYOUTS,
  MINE_PARTS,
  MINE_PROGRESS,
  PAGE_BARS,
  PAGE_HEROES,
  PAGE_PARTS,
  resolveCourseScreens,
  type CourseLook,
  type CourseScreens,
  type CourseTexts,
} from "@/lib/studio/course-screens";

/**
 * 130.52 Studio › Screens: the academy's course screens in one premium
 * look (Night cinema, Gold ring, Faculty index, On air), and every option
 * of each screen: the course card (its layout, photo, shade, corners and
 * the parts it shows), a course's page (its top, the enrol bar, the
 * sections it shows and the button's words), the lesson (the player, how
 * far through the course, the parts it shows) and My courses (a grid or a
 * list, rings or bars, the parts it shows and the line under its title),
 * each drawn beside its options as the app draws it. "As before" keeps the
 * screens as the looks below have them.
 */

const FIELD = "h-10 rounded-lg border border-line bg-white px-2";
const SCREENS: { part: CourseScreenPart; key: "card" | "page" | "lesson" | "my_courses" }[] = [
  { part: "card", key: "card" },
  { part: "page", key: "page" },
  { part: "lesson", key: "lesson" },
  { part: "mine", key: "my_courses" },
];

/** Every option, as a select of the look's own and its values. */
const OPTIONS = {
  card: [
    ["layout", CARD_LAYOUTS],
    ["ratio", CARD_RATIOS],
  ],
  page: [
    ["hero", PAGE_HEROES],
    ["bar", PAGE_BARS],
  ],
  lesson: [
    ["player", LESSON_PLAYERS],
    ["progress", LESSON_PROGRESS],
  ],
  my_courses: [
    ["layout", MINE_LAYOUTS],
    ["progress", MINE_PROGRESS],
  ],
} as const;

const PARTS = { card: CARD_PARTS, page: PAGE_PARTS, lesson: LESSON_PARTS, my_courses: MINE_PARTS } as const;

export function CourseScreensSection({
  value,
  onChange,
  languages,
  brand,
  accent,
  courses,
  lang,
  dark,
}: {
  value: CourseScreens | null;
  onChange: (next: CourseScreens | null) => void;
  languages: { code: string; name: string }[];
  brand: string;
  accent: string | null;
  /** The project's courses, else the samples, for the drawings. */
  courses: PickableEntry[];
  lang: string;
  dark: boolean;
}) {
  const t = useDashT();
  const [open, setOpen] = useState<CourseScreenPart>("card");
  const look = value?.look ?? null;
  const resolved = value ? resolveCourseScreens(value) : null;
  const pick = (l: CourseLook) => onChange({ ...(value ?? {}), look: l });
  type Screen = "card" | "page" | "lesson" | "my_courses";
  const patch = (screen: Screen, change: Record<string, unknown>) => {
    if (!value) return;
    const current = (value[screen] ?? { hide: [] }) as unknown as Record<string, unknown>;
    const next = { ...current, ...change };
    for (const [k, v] of Object.entries(next)) if (v === undefined || v === "") delete next[k];
    onChange({ ...value, [screen]: { hide: [], ...next } });
  };
  const toggle = (screen: Screen, part: string, shown: boolean) => {
    if (!value) return;
    const hide = ((value[screen]?.hide ?? []) as string[]).filter((x) => x !== part);
    patch(screen, { hide: shown ? hide : [...hide, part] });
  };
  const words = (screen: "page" | "my_courses", field: "cta" | "headline", code: string, text: string) => {
    if (!value) return;
    const current = ((value[screen] as Record<string, unknown> | undefined)?.[field] ?? {}) as CourseTexts;
    const next = { ...current, [code]: text };
    if (!text) delete next[code];
    patch(screen, { [field]: Object.keys(next).length ? next : undefined });
  };
  return (
    <section aria-labelledby="h-course-screens" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-course-screens-section="">
      <div className="flex flex-col gap-1">
        <h2 id="h-course-screens" className="m-0 text-lg font-bold">
          {t("studio.csTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">{t("studio.csText")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${look === null ? "border-ink" : "border-line"}`}>
          <input type="radio" name="course_look" checked={look === null} onChange={() => onChange(null)} data-course-look="" />
          <span className="flex flex-col">
            <b>{t("studio.csLookNone")}</b>
            <span className="text-sm text-muted">{t("studio.csLookNoneHint")}</span>
          </span>
        </label>
        {COURSE_LOOKS.map((l) => (
          <label key={l} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${look === l ? "border-ink" : "border-line"}`}>
            <input type="radio" name="course_look" checked={look === l} onChange={() => pick(l)} data-course-look={l} />
            <span className="flex flex-col">
              <b>{t(`studio.csLook_${l}` as DashKey)}</b>
              <span className="text-sm text-muted">{t(`studio.csLookHint_${l}` as DashKey)}</span>
            </span>
          </label>
        ))}
      </div>
      {value && resolved ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              {t("studio.csAccent")}
              <input type="color" value={value.accent ?? accent ?? "#B8893A"} onChange={(e) => onChange({ ...value, accent: e.target.value.toUpperCase() })} className="h-9 w-12 cursor-pointer rounded border border-line" data-course-accent="" />
            </label>
            {value.accent ? (
              <button type="button" className="rounded-md border border-line px-2 py-1 text-sm" onClick={() => onChange({ ...value, accent: null })}>
                {t("studio.csAccentOwn")}
              </button>
            ) : (
              <span className="text-sm text-muted">{t("studio.csAccentHint")}</span>
            )}
          </div>
          <div role="tablist" aria-label={t("studio.csTitle")} className="flex flex-wrap gap-2">
            {SCREENS.map(({ part }) => (
              <button key={part} type="button" role="tab" aria-selected={open === part} onClick={() => setOpen(part)} data-course-screen-tab={part} className={`rounded-full border px-3 py-1.5 text-sm ${open === part ? "border-ink bg-ink font-bold text-white" : "border-line"}`}>
                {t(`studio.csScreen_${part}` as DashKey)}
              </button>
            ))}
          </div>
          {SCREENS.filter((s) => s.part === open).map(({ part, key }) => {
            const saved = (value[key] ?? { hide: [] }) as Record<string, unknown> & { hide: string[] };
            const own = COURSE_LOOK_DEFAULTS[value.look][key] as Record<string, string | number>;
            return (
              <div key={part} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]" data-course-screen-panel={part}>
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {OPTIONS[key].map(([field, list]) => (
                      <label key={field} className="flex flex-col gap-1 text-sm font-bold">
                        {t(`studio.csOpt_${key}_${field}` as DashKey)}
                        <select className={`${FIELD} font-normal`} value={(saved[field] as string | undefined) ?? ""} onChange={(e) => patch(key, { [field]: e.target.value || undefined })} data-course-option={`${key}.${field}`}>
                          <option value="">{t("studio.csLooksOwn", { value: t(`studio.csVal_${field}_${own[field]}` as DashKey) })}</option>
                          {list.map((v) => (
                            <option key={v} value={v}>
                              {t(`studio.csVal_${field}_${v}` as DashKey)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {key === "card"
                      ? (["scrim", "radius"] as const).map((field) => (
                          <label key={field} className="flex flex-col gap-1 text-sm font-bold">
                            <span>
                              {t(`studio.csOpt_card_${field}` as DashKey)} · {resolved.card[field]}
                              {field === "scrim" ? "%" : ""}
                            </span>
                            <input type="range" min={0} max={COURSE_SCREEN_LIMITS[field]} value={resolved.card[field]} onChange={(e) => patch("card", { [field]: Number(e.target.value) })} data-course-option={`card.${field}`} />
                          </label>
                        ))
                      : null}
                  </div>
                  <fieldset className="m-0 flex flex-wrap gap-x-4 gap-y-2 border-0 p-0">
                    <legend className="mb-1.5 text-sm font-bold">{t("studio.csShows")}</legend>
                    {PARTS[key].map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={!saved.hide.includes(p)} onChange={(e) => toggle(key, p, e.target.checked)} data-course-part={`${key}.${p}`} />
                        {t(`studio.csPart_${key}_${p}` as DashKey)}
                      </label>
                    ))}
                  </fieldset>
                  {key === "page" || key === "my_courses" ? (
                    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                      <legend className="mb-1.5 text-sm font-bold">{t(key === "page" ? "studio.csCta" : "studio.csHeadline")}</legend>
                      {languages.map((l) => {
                        const field = key === "page" ? "cta" : "headline";
                        const texts = (saved[field] ?? {}) as CourseTexts;
                        return (
                          <label key={l.code} className="flex items-center gap-2 text-sm">
                            <span className="w-24 shrink-0 text-muted">{l.name}</span>
                            <input
                              className={`${FIELD} min-w-0 flex-1`}
                              dir={l.code === "ar" ? "rtl" : "ltr"}
                              maxLength={COURSE_SCREEN_LIMITS[field]}
                              value={texts[l.code] ?? ""}
                              placeholder={t(key === "page" ? "studio.csCtaHint" : "studio.csHeadlineHint")}
                              onChange={(e) => words(key, field, l.code, e.target.value)}
                              data-course-words={`${field}.${l.code}`}
                            />
                          </label>
                        );
                      })}
                    </fieldset>
                  ) : null}
                </div>
                <div className="flex justify-center">
                  <div data-course-screen-preview={part} className="flex h-[520px] w-[260px] flex-col overflow-hidden rounded-[28px] border-[6px] border-[#0E0D24] shadow-lg" style={{ background: dark ? "#0B0A1C" : "#F4EFE6" }}>
                    <div className="flex min-h-full flex-col overflow-y-auto" style={{ zoom: 0.72 }}>
                      <CourseScreenDrawing part={part} design={resolved} dark={dark} lang={lang} brand={brand} accent={accent} courses={courses} top={0} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : null}
    </section>
  );
}
