"use client";

import type { ReactNode } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import { IconPicker } from "@/app/dashboard/pages/controls";
import type { Action, LanguageCode, StudioNode, Translations } from "@/lib/pages/types";
import { STUDIO_PREMIUM_LIMITS } from "@/lib/pages/types";
import { RangeField } from "./controls";
import { Glyph } from "./shared";

/**
 * 129.1–129.8 The inspector's controls for Studio's premium motion and
 * media: every option of the stories, the ticker, the video and parallax
 * banners, the gallery and before and after, in the language being edited
 * (a text in another language is its translation).
 */

type Change = (patch: Partial<StudioNode>) => void;
type Entry = { translations?: Translations };

export interface PremiumControlsProps {
  node: StudioNode;
  onChange: Change;
  lang: LanguageCode;
  defaultLang: LanguageCode;
  /** The inspector's own link picker (a page, a screen, an entry or an address). */
  link: (id: string, action: Action | null, onChange: (action: Action | null) => void) => ReactNode;
}

const box = { border: "1px solid var(--studio-line)" } as const;

/** An entry's text in the language being edited. */
function textOf(entry: Entry, field: string, lang: LanguageCode, def: LanguageCode): string {
  const own = (entry as Record<string, unknown>)[field];
  if (lang === def) return typeof own === "string" ? own : "";
  return entry.translations?.[lang]?.[field] ?? "";
}

/** The entry with that text in the language being edited. */
function withText<T extends Entry>(entry: T, field: string, text: string, lang: LanguageCode, def: LanguageCode): T {
  if (lang === def) return { ...entry, [field]: text || null };
  const translations = { ...(entry.translations ?? {}) } as Translations;
  const own = { ...(translations[lang] ?? {}) };
  if (text) own[field] = text;
  else delete own[field];
  translations[lang] = own;
  return { ...entry, translations };
}

/** Moves the entry at `i` by `by` places in its list. */
function moved<T>(list: T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

/** The buttons of one entry of a list: move it up or down, or take it out. */
function EntryTools({ index, count, onMove, onRemove, canRemove = count > 1 }: { index: number; count: number; onMove: (by: -1 | 1) => void; onRemove: () => void; canRemove?: boolean }) {
  const t = useDashT();
  const button = "flex h-7 w-7 items-center justify-center rounded-md bg-white disabled:opacity-40";
  return (
    <span className="flex items-center gap-1">
      <button type="button" aria-label={t("studio.pmMoveUp")} title={t("studio.pmMoveUp")} disabled={index === 0} onClick={() => onMove(-1)} className={button} style={box}>
        <Glyph name="arrow_upward" size={16} />
      </button>
      <button type="button" aria-label={t("studio.pmMoveDown")} title={t("studio.pmMoveDown")} disabled={index === count - 1} onClick={() => onMove(1)} className={button} style={box}>
        <Glyph name="arrow_downward" size={16} />
      </button>
      <button type="button" aria-label={t("studio.pmRemove")} title={t("studio.pmRemove")} disabled={!canRemove} onClick={onRemove} className={button} style={box}>
        <Glyph name="delete" size={16} />
      </button>
    </span>
  );
}

/** A choice among a few, as a menu. */
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex flex-col gap-1 font-bold">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 rounded-lg px-1.5 font-normal" style={box}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Tick({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#1F8A4C" }} />
      {label}
    </label>
  );
}

/** The photos of a premium element (a ticker's logos, a gallery, before and after): each one's picture and caption, in order. */
function PhotosList({ node, onChange, lang, defaultLang, min = 0, max = STUDIO_PREMIUM_LIMITS.images, captionLabel }: PremiumControlsProps & { min?: number; max?: number; captionLabel: string }) {
  const t = useDashT();
  const images = node.images ?? [];
  const set = (next: NonNullable<StudioNode["images"]>) => onChange({ images: next.length ? next : undefined });
  return (
    <div className="flex flex-col gap-1.5">
      {images.map((image, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- the element's own photo */}
          <img src={image.image_url} alt="" className="h-10 w-10 flex-none rounded-md object-cover" />
          <input aria-label={captionLabel} placeholder={captionLabel} maxLength={STUDIO_PREMIUM_LIMITS.caption} value={textOf(image, "caption", lang, defaultLang)} onChange={(e) => set(images.map((x, j) => (j === i ? withText(x, "caption", e.target.value, lang, defaultLang) : x)))} className="h-8 min-w-0 flex-1 rounded-md px-2" style={box} />
          <EntryTools index={i} count={images.length} canRemove={images.length > min} onMove={(by) => set(moved(images, i, by))} onRemove={() => set(images.filter((_, j) => j !== i))} />
        </div>
      ))}
      {images.length < max ? <MediaPicker kind="image" share library onPick={(url) => set([...images, { image_url: url, caption: null }])} label={t("studio.pmAddPhoto")} /> : null}
    </div>
  );
}

/** 129.3 The ticker: its words, its pictures, the icon between them, its speed, direction and pictures' size. */
export function MarqueeControls(props: PremiumControlsProps) {
  const t = useDashT();
  const { node, onChange, lang, defaultLang } = props;
  const P = STUDIO_PREMIUM_LIMITS;
  const m = node.marquee ?? {};
  const set = (patch: Partial<NonNullable<StudioNode["marquee"]>>) => {
    const next = { ...m, ...patch };
    for (const key of Object.keys(next) as (keyof typeof next)[]) if (next[key] === undefined) delete next[key];
    onChange({ marquee: Object.keys(next).length ? next : undefined });
  };
  const words = lang === defaultLang ? (node.text ?? "") : (node.translations?.[lang]?.text ?? "");
  const setWords = (text: string) => {
    if (lang === defaultLang) return onChange({ text });
    const translations = { ...(node.translations ?? {}) } as Translations;
    translations[lang] = { ...(translations[lang] ?? {}), text };
    onChange({ translations });
  };
  return (
    <div className="flex flex-col gap-2" data-studio-premium="marquee">
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.pmTickerWords")}
        <textarea value={words} onChange={(e) => setWords(e.target.value)} rows={4} maxLength={2000} className="rounded-lg px-2.5 py-1.5 font-normal" style={box} />
      </label>
      <div className="flex flex-col gap-1 font-bold">
        {t("studio.pmTickerPictures")}
        <PhotosList {...props} captionLabel={t("studio.pmPictureName")} />
      </div>
      <RangeField label={t("studio.pmTickerSpeed")} value={m.speed ?? 40} min={P.speedMin} max={P.speedMax} step={5} unit={t("studio.pmUnitSpeed")} fallback={40} onChange={(speed) => set({ speed: speed === 40 ? undefined : speed })} />
      <Choice
        label={t("studio.pmTickerDirection")}
        value={m.direction ?? "start"}
        onChange={(direction) => set({ direction: direction === "start" ? undefined : direction })}
        options={[
          { value: "start", label: t("studio.pmTowardStart") },
          { value: "end", label: t("studio.pmTowardEnd") },
        ]}
      />
      <Tick label={t("studio.pmPauseOnPress")} checked={m.pause_on_press !== false} onChange={(on) => set({ pause_on_press: on ? undefined : false })} />
      {node.images?.length ? <RangeField label={t("studio.pmPictureHeight")} value={m.size ?? 36} min={P.logoMin} max={P.logoMax} step={2} unit="px" fallback={36} onChange={(size) => set({ size: size === 36 ? undefined : size })} /> : null}
      <IconPicker id={`marquee-icon-${node.id}`} label={t("studio.pmTickerIcon")} value={node.icon ?? null} optional onChange={(icon) => onChange({ icon: icon ?? undefined })} />
      <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.reduceMotion")}
      </p>
    </div>
  );
}

/** 129.4 and 129.7 A video banner's video, poster and playing by itself; a parallax banner's photo and speed; either's frosted panel. */
export function BannerControls({ node, onChange }: PremiumControlsProps) {
  const t = useDashT();
  const video = node.type === "video_hero";
  const remove = (key: "image_url" | "video_url", label: string) => (
    <button type="button" onClick={() => onChange({ [key]: null })} className="rounded-md bg-white px-2 py-0.5" style={box}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-2" data-studio-premium={node.type}>
      {video ? (
        <div className="flex flex-col gap-1 font-bold">
          {t("studio.pmVideo")}
          <div className="flex flex-wrap items-center gap-2 font-normal">
            <MediaPicker kind="video" share library onPick={(url) => onChange({ video_url: url })} label={t("studio.pmChooseVideo")} />
            {node.video_url ? remove("video_url", t("studio.pmRemoveVideo")) : null}
          </div>
          {node.video_url ? (
            <span dir="ltr" className="truncate text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
              {node.video_url}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-1 font-bold">
        {t(video ? "studio.pmPoster" : "studio.picture")}
        <div className="flex flex-wrap items-center gap-2 font-normal">
          {node.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- the banner's own photo
            <img src={node.image_url} alt="" className="h-10 w-14 rounded-md object-cover" />
          ) : null}
          <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.choosePicture")} />
          {node.image_url ? remove("image_url", t("studio.removePicture")) : null}
        </div>
      </div>
      {video ? (
        <>
          <Tick label={t("studio.pmVideoByItself")} checked={Boolean(node.autoplay)} onChange={(on) => onChange({ autoplay: on || undefined })} />
          <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pmVideoHint")}
          </p>
        </>
      ) : (
        <>
          <RangeField label={t("studio.pmParallaxSpeed")} value={Math.round((node.parallax?.speed ?? 0.5) * 100)} min={10} max={90} step={5} unit="%" fallback={50} onChange={(v) => onChange({ parallax: v === 50 ? undefined : { speed: v / 100 } })} />
          <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pmParallaxHint")}
          </p>
        </>
      )}
      <Tick label={t("studio.pmGlass")} checked={Boolean(node.glass)} onChange={(on) => onChange({ glass: on || undefined })} />
    </div>
  );
}

/** 129.2 The stories: each one's photo, title, line and link; the rings' size and each story's time. */
export function StoriesControls({ node, onChange, lang, defaultLang, link }: PremiumControlsProps) {
  const t = useDashT();
  const P = STUDIO_PREMIUM_LIMITS;
  const stories = node.slides ?? [];
  const set = (slides: NonNullable<StudioNode["slides"]>) => onChange({ slides });
  return (
    <div className="flex flex-col gap-2" data-studio-premium="stories">
      <RangeField label={t("studio.pmRingSize")} value={node.stories?.size ?? 68} min={P.ringMin} max={P.ringMax} step={2} unit="px" fallback={68} onChange={(size) => onChange({ stories: size === 68 ? undefined : { size } })} />
      <RangeField label={t("studio.pmStoryTime")} value={node.interval_ms ?? 5000} scale={1000} min={2} max={15} unit={t("studio.unitSeconds")} fallback={5000} onChange={(interval_ms) => onChange({ interval_ms })} />
      {stories.map((story, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-lg p-2" style={box}>
          <div className="flex items-center justify-between gap-2 font-bold">
            {t("studio.pmStory", { number: String(i + 1) })}
            <EntryTools index={i} count={stories.length} onMove={(by) => set(moved(stories, i, by))} onRemove={() => set(stories.filter((_, j) => j !== i))} />
          </div>
          <div className="flex items-center gap-2">
            {story.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- the story's own photo
              <img src={story.image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : null}
            <MediaPicker kind="image" share library onPick={(url) => set(stories.map((s, j) => (j === i ? { ...s, image_url: url } : s)))} label={t("studio.choosePicture")} />
          </div>
          <input aria-label={t("studio.pmStoryTitle")} placeholder={t("studio.pmStoryTitle")} maxLength={P.storyTitle} value={textOf(story, "heading", lang, defaultLang)} onChange={(e) => set(stories.map((s, j) => (j === i ? withText(s, "heading", e.target.value, lang, defaultLang) : s)))} className="h-8 rounded-md px-2" style={box} />
          <input aria-label={t("studio.pmStoryLine")} placeholder={t("studio.pmStoryLine")} maxLength={P.storyLine} value={textOf(story, "subheading", lang, defaultLang)} onChange={(e) => set(stories.map((s, j) => (j === i ? withText(s, "subheading", e.target.value, lang, defaultLang) : s)))} className="h-8 rounded-md px-2" style={box} />
          {link(`story-${node.id}-${i}`, story.action ?? null, (action) => set(stories.map((s, j) => (j === i ? { ...s, action } : s))))}
        </div>
      ))}
      {stories.length < P.stories ? (
        <button type="button" onClick={() => set([...stories, { image_url: null, heading: null, subheading: null, action: null }])} className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white font-bold" style={box}>
          <Glyph name="add" size={18} />
          {t("studio.pmAddStory")}
        </button>
      ) : null}
    </div>
  );
}
