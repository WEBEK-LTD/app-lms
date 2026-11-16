"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { useViewChoice, ViewToggle } from "@/components/manage-kit-client";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";

/** 132.13 One course as the list shows it (its price already written in the academy's currency). */
export interface CourseRowData {
  id: number;
  title: string;
  image: string | null;
  teacher: string | null;
  price: string;
  cents: number;
  lessons: number;
  sections: number;
  students: number;
  /** published, in_review, returned, draft or hidden. */
  stage: string;
  stageLabel: string;
  stageTone: "neutral" | "info" | "success" | "warn";
  categoryIds: number[];
  created: number;
  sample: { label: string; demo: string | null } | null;
}

const SORTS = ["newest", "title", "students", "priceLow", "priceHigh"] as const;
type Sort = (typeof SORTS)[number];
const SORT_WORDS: Record<Sort, DashKey> = { newest: "manage.sortNewest", title: "manage.sortTitle", students: "manage.sortStudents", priceLow: "manage.sortPriceLow", priceHigh: "manage.sortPriceHigh" };
const TINTS = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"];

/**
 * 132.13 The academy's courses: a search, their state (published, waiting
 * for review, not published), a category and a sort, as a grid of covers
 * or a list; each opens the course's editor.
 */
export function CoursesBrowser({ courses, categories }: { courses: CourseRowData[]; categories: { id: number; name: string }[] }) {
  const t = useDashT();
  const [view, setView] = useViewChoice("courses", "grid");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const query = q.trim().toLocaleLowerCase();
  const group = (c: CourseRowData) => (c.stage === "published" || c.stage === "in_review" ? c.stage : "other");
  const shown = courses
    .filter((c) => (stage === "all" || group(c) === stage) && (category === "all" || c.categoryIds.includes(Number(category))) && (!query || [c.title, c.teacher ?? ""].join(" ").toLocaleLowerCase().includes(query)))
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "students") return b.students - a.students;
      if (sort === "priceLow") return a.cents - b.cents;
      if (sort === "priceHigh") return b.cents - a.cents;
      return b.created - a.created || b.id - a.id;
    });
  const chips = [
    { value: "all", label: t("common.all"), count: courses.length },
    { value: "published", label: t("courses.statPublished"), count: courses.filter((c) => group(c) === "published").length },
    { value: "in_review", label: t("teachers.stage_in_review"), count: courses.filter((c) => group(c) === "in_review").length },
    { value: "other", label: t("courses.statNotPublished"), count: courses.filter((c) => group(c) === "other").length },
  ].filter((c) => c.value === "all" || c.count > 0);
  const filtered = query !== "" || stage !== "all" || category !== "all";
  const clear = () => {
    setQ("");
    setStage("all");
    setCategory("all");
  };
  const lines = (c: CourseRowData) => t("courses.courseLine", { price: c.price, lessons: c.lessons, students: c.students });
  const sample = (c: CourseRowData) =>
    c.sample ? (
      <span data-from-demo={c.sample.demo ?? undefined}>
        <Badge tone="info">{c.sample.label}</Badge>
      </span>
    ) : null;
  const select = "input input-sm h-10 min-w-0 cursor-pointer pe-8";

  return (
    <section aria-labelledby="h-courses" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white" data-courses-browser="">
      <h2 id="h-courses" className="sr-only">
        {t("courses.count", { count: courses.length })}
      </h2>
      <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-sm text-muted focus-within:border-midnight">
            <Icon name="search" size={18} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("courses.search")} aria-label={t("courses.search")} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-midnight outline-0" />
          </label>
          {categories.length ? (
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("manage.filterCategory")} className={`${select} flex-[0_1_200px]`}>
              <option value="all">{t("manage.allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("manage.sort")} className={`${select} flex-[0_1_190px]`}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(SORT_WORDS[s])}
              </option>
            ))}
          </select>
          <ViewToggle view={view} onChange={setView} words={{ label: t("manage.view"), list: t("manage.viewList"), grid: t("manage.viewGrid") }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.length > 2
            ? chips.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={stage === c.value}
                  onClick={() => setStage(c.value)}
                  className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] ${stage === c.value ? "border-midnight bg-midnight font-bold text-ivory" : "border-line bg-white text-midnight hover:border-line-strong"}`}
                >
                  {c.label}
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${stage === c.value ? "bg-white/20" : "bg-sand text-muted"}`}>{c.count}</span>
                </button>
              ))
            : null}
          <span className="ms-auto flex items-center gap-3 text-[13px] text-muted">
            <span role="status" aria-live="polite">
              {t("manage.showing", { shown: shown.length, count: courses.length })}
            </span>
            {filtered ? (
              <button type="button" onClick={clear} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-accent underline">
                {t("manage.clearFilters")}
              </button>
            ) : null}
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-muted">
            <Icon name="search" size={26} />
          </span>
          <p role="status" className="m-0 text-[15px] text-muted">
            {t("courses.noMatch")}
          </p>
          <button type="button" onClick={clear} className={`${btn.secondary} h-10`}>
            {t("manage.clearFilters")}
          </button>
        </div>
      ) : view === "grid" ? (
        <ul className="m-0 grid list-none gap-4 p-4 sm:p-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(250px, 100%), 1fr))" }}>
          {shown.map((c, i) => (
            <li key={c.id} data-course={c.title} className="min-w-0">
              <Link href={`/dashboard/courses/${c.id}`} className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-white text-midnight no-underline transition-shadow hover:border-line-strong hover:text-midnight hover:shadow-[0_6px_24px_rgba(14,13,36,0.08)]">
                <span className="relative block">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
                    <img src={c.image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className={`flex aspect-[16/9] w-full items-center justify-center text-ink-3 ${TINTS[i % TINTS.length]}`}>
                      <Icon name="school" size={40} />
                    </span>
                  )}
                  <span className="absolute start-3 top-3">
                    <Badge tone={c.stageTone}>{c.stageLabel}</Badge>
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-[16px] font-extrabold break-words">{c.title}</span>
                    <Icon name="chevron_right" size={20} className="mt-0.5 shrink-0 text-faint group-hover:text-midnight" />
                  </span>
                  {sample(c)}
                  {c.teacher ? (
                    <span className="flex items-center gap-1 text-[13px] text-ink-4">
                      <Icon name="person" size={16} className="text-muted" />
                      {c.teacher}
                    </span>
                  ) : null}
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5 text-[13px] text-muted">
                    <span className="text-[15px] font-extrabold text-midnight" dir="auto">
                      {c.price}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title={t("courses.statLessons")}>
                        <Icon name="play_circle" size={16} />
                        <span className="tabular-nums">{c.lessons}</span>
                      </span>
                      <span className="flex items-center gap-1" title={t("courses.statStudents")}>
                        <Icon name="groups" size={16} />
                        <span className="tabular-nums">{c.students}</span>
                      </span>
                    </span>
                  </span>
                  <span className="sr-only">{lines(c)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((c, i) => (
            <li key={c.id} data-course={c.title} className="border-t border-line-soft px-4 py-3 first:border-t-0 sm:px-5">
              <Link href={`/dashboard/courses/${c.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl text-midnight no-underline hover:text-midnight sm:flex-nowrap">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
                  <img src={c.image} alt="" loading="lazy" className="h-12 w-[76px] shrink-0 rounded-[10px] border border-line-soft object-cover" />
                ) : (
                  <span aria-hidden="true" className={`flex h-12 w-[76px] shrink-0 items-center justify-center rounded-[10px] text-ink-3 ${TINTS[i % TINTS.length]}`}>
                    <Icon name="school" size={24} />
                  </span>
                )}
                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-bold break-words group-hover:underline">{c.title}</span>
                    {sample(c)}
                  </span>
                  <span className="text-[13px] text-muted" dir="auto">
                    {lines(c)}
                  </span>
                  {c.teacher ? (
                    <span className="flex items-center gap-1 text-[13px] text-ink-4">
                      <Icon name="person" size={16} className="text-muted" />
                      {c.teacher}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 max-sm:order-last max-sm:basis-full">
                  <Badge tone={c.stageTone}>{c.stageLabel}</Badge>
                </span>
                <Icon name="chevron_right" size={20} className="shrink-0 text-faint group-hover:text-midnight max-sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
