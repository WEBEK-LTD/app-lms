"use client";

import Link from "next/link";
import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { slideParts, sliderOf, storiesSlider } from "@/lib/studio/slides";
import { layerLabel } from "./left-panel";
import { Glyph } from "./shared";

/** 189 Where the app's stories are changed (Studio's own page of Dashboard › Stories). */
export const STORIES_HREF = "/studio/project/stories";

/**
 * 189 The inspector's list of a slider's slides, as in the layers: shown
 * when the slider, one of its slides or anything on one is selected. Each
 * slide by its number and name; the one being edited opened with its
 * pictures, words and buttons. A click selects it, and the phone shows that
 * slide. When the slides show the app's stories saved in Dashboard ›
 * Stories, a note says they are changed there.
 */
export function SliderSlides({ node, body, pickable, onSelect }: { node: StudioNode; body: StudioNode; pickable: Pickable; onSelect: (id: string) => void }) {
  const t = useDashT();
  const found = sliderOf(body, node.id);
  if (!found) return null;
  const slides = found.slider.children ?? [];
  if (!slides.length) return null;
  const open = found.index ?? 0;
  // 165 Until the owner saves in Dashboard › Stories the app shows the slides designed here, the edits here included.
  const fromStories = storiesSlider(found.slider, found.parent) && pickable.storiesSaved === true;
  const row = (selected: boolean) => ({ border: "0", background: selected ? "var(--sf-select-fill)" : "transparent", color: selected ? "var(--sf-select-ink)" : "var(--sf-ink)" });
  return (
    <section aria-label={t("stories.slidesTitle", { count: slides.length })} data-studio-slider-slides="" className="flex flex-col gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid var(--sf-line)" }}>
      <div className="flex items-center gap-2 text-[14px] font-extrabold">
        <span style={{ color: "#3D63FF" }}>
          <Glyph name="view_carousel" size={20} />
        </span>
        <button type="button" onClick={() => onSelect(found.slider.id)} className="min-w-0 flex-1 cursor-pointer truncate text-start text-[14px] font-extrabold" style={{ border: "0", background: "transparent", color: "var(--sf-ink)", padding: 0 }}>
          {t("stories.slidesTitle", { count: slides.length })}
        </button>
      </div>
      <p className="m-0 text-xs" style={{ color: "var(--sf-muted)" }}>
        {t("stories.slidesHint")}
      </p>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {slides.map((slide, i) => {
          const current = found.index !== null && i === open;
          return (
            <li key={slide.id} data-studio-slide-row={i + 1} aria-current={current ? "true" : undefined}>
              <button type="button" onClick={() => onSelect(slide.id)} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-start" style={row(node.id === slide.id)}>
                <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold" style={{ background: current ? "#3D63FF" : "var(--sf-line)", color: current ? "#FFFFFF" : "var(--sf-ink)" }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-bold">{t("stories.slideRow", { n: i + 1 })}</span>
                  {slide.name ? <span style={{ color: "var(--sf-muted)" }}> · {slide.name}</span> : null}
                </span>
                <Glyph name={current ? "expand_more" : "chevron_right"} size={18} />
              </button>
              {current ? (
                <ul className="m-0 flex list-none flex-col gap-0.5 py-0.5 ps-8 pe-0">
                  {slideParts(slide).map((part) => (
                    <li key={part.id}>
                      <button type="button" onClick={() => onSelect(part.id)} data-studio-slide-part={part.type} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-start text-[12px]" style={row(node.id === part.id)}>
                        <Glyph name={part.type === "text" ? "title" : part.type === "button" ? "smart_button" : part.type === "icon" ? "star" : "image"} size={16} />
                        <span className="min-w-0 flex-1 truncate">{layerLabel(t, part)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
      {fromStories ? (
        <div role="note" data-studio-story-slides="" className="mt-1 flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "var(--sf-select-fill)", color: "var(--sf-ink)" }}>
          <p className="m-0 text-xs leading-snug">{t("stories.slidesNoteText")}</p>
          <Link href={STORIES_HREF} target="_blank" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-bold text-white no-underline" style={{ background: "#3D63FF" }}>
            <Glyph name="auto_stories" size={18} />
            {t("stories.slidesCanvasButton")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
