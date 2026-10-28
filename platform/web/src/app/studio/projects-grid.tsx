"use client";

import { useState } from "react";
import Link from "next/link";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { useDashT } from "@/components/dashboard-i18n";
import type { StudioLook } from "@/components/studio/view";
import type { LanguageCode, StudioPage } from "@/lib/pages/types";
import { Glyph, STUDIO_COLORS as C } from "./editor/shared";
import { ProjectPhone } from "./phone";

export interface ProjectCardView {
  id: string;
  name: string;
  icon: string;
  /** "Restaurant · WordPress · Growth plan". */
  meta: string;
  published: boolean;
  /** "Last edited 2 hours ago". */
  edited: string;
  home: { page: StudioPage; look: StudioLook; lang: LanguageCode } | null;
}

type Filter = "all" | "published" | "draft";

/** 103R.3 Studio's home: finding a project, the projects' cards and a new one. */
export function ProjectsGrid({ cards, words }: { cards: ProjectCardView[]; words: Parameters<typeof ProjectPhone>[0]["words"] }) {
  const t = useDashT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const published = cards.filter((c) => c.published).length;
  const counts: Record<Filter, number> = { all: cards.length, published, draft: cards.length - published };
  const q = query.trim().toLowerCase();
  const shown = cards.filter((c) => (filter === "all" || c.published === (filter === "published")) && (!q || c.name.toLowerCase().includes(q)));
  const chip = (value: Filter, key: "studio.filterAll" | "studio.filterPublished" | "studio.filterDraft") => {
    const on = filter === value;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setFilter(value)}
        className="h-10 cursor-pointer rounded-full px-3.5 text-[13px]"
        style={{ border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : "#FFFFFF", color: on ? C.ivory : C.ink, fontWeight: on ? 700 : 400, fontFamily: "inherit" }}
      >
        {t(key, { count: counts[value] })}
      </button>
    );
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 flex-[0_1_320px] items-center gap-2 rounded-[10px] bg-white px-3 text-sm" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
          <Glyph name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("studio.searchProjects")}
            aria-label={t("studio.searchProjects")}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-0"
            style={{ fontFamily: "inherit", color: C.ink }}
          />
        </label>
        {chip("all", "studio.filterAll")}
        {chip("published", "studio.filterPublished")}
        {chip("draft", "studio.filterDraft")}
      </div>

      {q && !shown.length ? (
        <p role="status" className="m-0 text-sm" style={{ color: C.muted }}>
          {t("studio.noMatch", { query: query.trim() })}
        </p>
      ) : null}

      <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {shown.map((card) => (
          <article key={card.id} className="flex flex-col overflow-hidden rounded-[18px] bg-white" style={{ border: `1px solid ${C.line}` }}>
            <div className="flex h-[190px] items-end justify-center" style={{ background: C.board, backgroundImage: `radial-gradient(${C.dot} 1px, transparent 1px)`, backgroundSize: "14px 14px" }}>
              <ProjectPhone home={card.home} size="card" words={words} />
            </div>
            <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 truncate text-[17px] font-extrabold">{card.name}</h2>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap" style={card.published ? { background: "#DDEBD7", color: "#1F5A32" } : { background: C.ivory, color: C.muted }}>
                  {t(card.published ? "studio.statePublished" : "studio.stateDraft")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]" style={{ color: C.muted }}>
                <Glyph name={card.icon} size={16} />
                <span className="min-w-0">{card.meta}</span>
              </div>
              <div className="text-xs" style={{ color: C.muted }}>
                {card.edited}
              </div>
              <form action={openStudioProjectAction} className="mt-1 flex gap-2">
                <input type="hidden" name="appId" value={card.id} />
                <button
                  type="submit"
                  name="to"
                  value="editor"
                  className="flex h-[38px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-0 text-sm font-bold"
                  style={{ background: C.ink, color: C.ivory, fontFamily: "inherit" }}
                >
                  <Glyph name="draw" size={18} />
                  {t("studio.openEditor")}
                </button>
                <button
                  type="submit"
                  name="to"
                  value="project"
                  aria-label={t("studio.projectDashboard")}
                  title={t("studio.projectDashboard")}
                  className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] bg-white"
                  style={{ border: `1px solid ${C.line}`, color: C.ink }}
                >
                  <Glyph name="tune" size={18} />
                </button>
              </form>
            </div>
          </article>
        ))}

        <Link
          href="/studio/new"
          className="flex min-h-[330px] flex-col items-center justify-center gap-2.5 rounded-[18px] no-underline"
          style={{ border: "2px dashed #B9B3A5", color: C.ink, background: "rgba(255,255,255,0.4)" }}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: C.accent }}>
            <Glyph name="add" size={30} />
          </span>
          <span className="text-base font-extrabold">{t("studio.newProject")}</span>
          <span className="max-w-[200px] text-center text-[13px]" style={{ color: C.muted }}>
            {t("studio.newProjectHint")}
          </span>
        </Link>
      </div>
    </>
  );
}
