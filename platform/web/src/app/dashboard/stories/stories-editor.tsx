"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition } from "react";
import { deleteStoryAction, reorderStoriesAction, saveStoryAction, setStoryEnabledAction, type StoriesResult } from "@/app/actions/stories";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { SortableList, SortControls } from "@/components/manage-kit-client";
import { MediaPicker } from "@/components/media-picker";
import { KitSwitch } from "@/components/studio-page/client";
import { btn, EmptyState, Notice } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import type { AppStoryTexts } from "@/lib/data/types";
import type { ScreenOption } from "@/lib/pages/sources";
import { RTL_LANGUAGES, type Action } from "@/lib/pages/types";
import type { StoryView } from "@/lib/stories/view";
import { Check, IconGlyph, IconPicker, SelectInput, TextInput } from "../pages/controls";

/**
 * 165 Dashboard › Stories: the list in the app's order (dragged, or moved
 * with the arrows), each on or off with its dates, Edit and Remove; the
 * editor with its photo or video, its words in the main language and in
 * Arabic and Turkish beside it, the ring's name and icon, its button and
 * what it opens, its category and dates, and a live preview of the story
 * full screen and as a ring.
 */

type Part = keyof AppStoryTexts;
type Opens = "shop" | "category" | "product" | "page" | "screen" | "url";

interface Props {
  initial: StoryView[];
  languages: { code: string; name: string }[];
  max: number;
  limits: Record<Part, number>;
  fromStudio: boolean;
  studioHref: string;
  appName: string;
  brand: string;
  pages: { slug: string; title: string }[];
  screens: ScreenOption[];
  categories: { id: string; name: string }[];
  products: { id: string; title: string }[];
  hasShop: boolean;
}

interface Draft {
  id: number | null;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  kind: "image" | "video";
  imageUrl: string;
  videoUrl: string;
  texts: Record<string, AppStoryTexts>;
  icon: string | null;
  action: Action | null;
  categoryId: string;
}

const PARTS: { part: Part; label: DashKey; hint?: DashKey }[] = [
  { part: "kicker", label: "stories.kicker", hint: "stories.kickerHint" },
  { part: "title", label: "stories.storyTitle" },
  { part: "line", label: "stories.line" },
  { part: "ring", label: "stories.ringName", hint: "stories.ringHint" },
  { part: "button", label: "stories.buttonText", hint: "stories.buttonHint" },
];

/** An ISO time as a `datetime-local` value in the browser's zone, and back. */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (local: string) => (local ? new Date(local).toISOString() : null);

function draftOf(s: StoryView | null): Draft {
  return {
    id: s?.id ?? null,
    enabled: s?.enabled ?? true,
    startsAt: toLocal(s?.startsAt ?? null),
    endsAt: toLocal(s?.endsAt ?? null),
    kind: s?.media.kind ?? "image",
    imageUrl: s?.media.imageUrl ?? "",
    videoUrl: s?.media.videoUrl ?? "",
    texts: structuredClone(s?.texts ?? {}),
    icon: s?.icon ?? null,
    action: s?.action ?? null,
    categoryId: s?.categoryId ?? "",
  };
}

function opensOf(action: Action | null): Opens {
  if (!action) return "shop";
  if (action.type === "screen" && action.screen === "courses" && action.category_id) return "category";
  if (action.type === "item") return "product";
  if (action.type === "page") return "page";
  if (action.type === "url") return "url";
  return "screen";
}

export function StoriesEditor(props: Props) {
  const t = useDashT();
  const [stories, setStories] = useState(props.initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [said, setSaid] = useState("");
  const [errors, setErrors] = useState<DashKey[]>([]);
  const [saving, start] = useTransition();
  // When the page opened: whether a story has started or ended.
  const [now] = useState(() => new Date().getTime());
  const main = props.languages[0]?.code ?? "en";
  const nameOf = (s: { texts: Record<string, AppStoryTexts> }) => s.texts[main]?.title || s.texts[main]?.ring || Object.values(s.texts).find((x) => x.title || x.ring)?.title || t("stories.untitled");

  // Only the latest answer is the list now: an earlier one (a move clicked before the last) arriving after it would put an older order back.
  const latest = useRef(0);
  const run = (work: () => Promise<StoriesResult>, done: string, after?: () => void) =>
    start(async () => {
      const asked = ++latest.current;
      const r = await work();
      if (asked !== latest.current) return;
      if (r.ok) {
        setStories(r.stories);
        setErrors([]);
        setSaid(done);
        after?.();
      } else setErrors(r.errors);
    });

  const save = (d: Draft) =>
    run(
      () =>
        saveStoryAction(d.id, {
          enabled: d.enabled,
          startsAt: fromLocal(d.startsAt),
          endsAt: fromLocal(d.endsAt),
          media: { kind: d.kind, imageUrl: d.imageUrl, videoUrl: d.kind === "video" ? d.videoUrl : null },
          texts: d.texts,
          icon: d.icon,
          action: d.action,
          categoryId: d.categoryId || null,
        }),
      t("stories.saved"),
      () => setEditing(null),
    );

  const full = stories.length >= props.max;
  return (
    <div className="flex flex-col gap-5" data-stories-editor>
      {props.fromStudio ? (
        <Notice tone="success" icon="auto_stories" role="status">
          {t("stories.fromStudio")}{" "}
          <Link href={props.studioHref} className="font-semibold">
            {t("stories.studioLink")}
          </Link>
        </Notice>
      ) : null}
      <section aria-labelledby="h-stories" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-6">
          <h2 id="h-stories" className="m-0 text-lg font-bold">
            {t("stories.count", { count: stories.length, max: props.max })}
          </h2>
          <button type="button" className={`${btn.main} h-10 px-4`} disabled={full || saving || editing?.id === null} onClick={() => setEditing(draftOf(null))}>
            <Icon name="add" size={20} />
            {t("stories.add")}
          </button>
        </div>
        {full ? <p className="m-0 px-5 pb-3 text-sm text-muted sm:px-6">{t("stories.full", { max: props.max })}</p> : null}
        <p role="status" aria-live="polite" className="m-0 flex min-h-[38px] items-center gap-2 border-y border-line-soft px-5 py-2 text-[13px] text-muted sm:px-6">
          {saving ? <Icon name="progress_activity" size={16} className="animate-spin" /> : said ? <Icon name="cloud_done" size={16} className="text-success" /> : <Icon name="drag_indicator" size={16} />}
          {saving ? t("stories.saving") : said || t("stories.dragHint")}
        </p>
        {stories.length ? (
          <SortableList
            items={stories}
            idOf={(s) => s.id}
            hint={t("manage.dragKeys")}
            moved={(place, count) => t("stories.moved", { place, count })}
            onReorder={(ids) => run(() => reorderStoriesAction(ids.map(Number)), t("stories.orderSaved"))}
            itemClassName="border-t border-line-soft first:border-t-0"
            render={(s, sortable) => {
              const name = nameOf(s);
              const labelId = `story-${s.id}-name`;
              return (
                <div data-story={name} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4 ${sortable.dragging ? "bg-sand" : ""}`}>
                  <SortControls sortable={sortable} name={name} words={{ drag: t("manage.drag"), up: t("manage.moveUp"), down: t("manage.moveDown") }} />
                  <Thumb story={s} />
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col">
                    <span id={labelId} className="truncate font-semibold">
                      {name}
                    </span>
                    <span className="text-[13px] text-muted">
                      <When story={s} now={now} />
                    </span>
                  </div>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <span id={`${labelId}-on`} className="sr-only">
                      {t("stories.shownLabel", { name })}
                    </span>
                    <KitSwitch checked={s.enabled} labelledBy={`${labelId}-on`} disabled={saving} onChange={(on) => run(() => setStoryEnabledAction(s.id, on), t("stories.saved"))} />
                    <span aria-hidden="true">{s.enabled ? t("stories.shown") : t("stories.off")}</span>
                  </span>
                  <button type="button" className={`${btn.pill} h-9`} aria-label={t("stories.editLabel", { name })} onClick={() => setEditing(draftOf(s))}>
                    <Icon name="edit" size={18} />
                    {t("stories.edit")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("stories.removeLabel", { name })}
                    title={t("stories.remove")}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted hover:bg-danger-bg hover:text-danger"
                    onClick={() => {
                      if (window.confirm(t("stories.removeConfirm", { name }))) run(() => deleteStoryAction(s.id), t("stories.removed"), () => editing?.id === s.id && setEditing(null));
                    }}
                  >
                    <Icon name="delete" size={20} />
                  </button>
                </div>
              );
            }}
          />
        ) : (
          <div className="px-5 py-6 sm:px-6">
            <EmptyState icon="auto_stories" title={t("stories.empty")}>
              {t("stories.emptyText")}
            </EmptyState>
          </div>
        )}
      </section>
      {editing ? <StoryForm key={editing.id ?? "new"} props={props} initial={editing} errors={errors} saving={saving} onCancel={() => (setEditing(null), setErrors([]))} onSave={save} /> : null}
    </div>
  );
}

function Thumb({ story }: { story: StoryView }) {
  const url = story.media.imageUrl;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- The owner's photo, any size.
    <img src={url} alt="" className="h-14 w-10 shrink-0 rounded-lg border border-line-soft object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-tile-2 text-ink-3">
      <Icon name={story.media.kind === "video" ? "movie" : "image"} size={20} />
    </span>
  );
}

function When({ story, now }: { story: StoryView; now: number }) {
  const t = useDashT();
  const date = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  if (story.endsAt && new Date(story.endsAt).getTime() <= now) return <>{t("stories.ended", { date: date(story.endsAt) })}</>;
  const parts = [story.startsAt && new Date(story.startsAt).getTime() > now ? t("stories.scheduled", { date: date(story.startsAt) }) : null, story.endsAt ? t("stories.until", { date: date(story.endsAt) }) : null].filter(Boolean);
  return <>{parts.length ? parts.join(" · ") : story.media.kind === "video" ? t("stories.video") : t("stories.photo")}</>;
}

function StoryForm({ props, initial, errors, saving, onCancel, onSave }: { props: Props; initial: Draft; errors: DashKey[]; saving: boolean; onCancel: () => void; onSave: (d: Draft) => void }) {
  const t = useDashT();
  const known = useKnownText();
  const id = useId();
  const [d, setD] = useState(initial);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const main = props.languages[0]!;
  const setText = (lang: string, part: Part, value: string) => setD((x) => ({ ...x, texts: { ...x.texts, [lang]: { ...x.texts[lang], [part]: value } } }));
  const opens = opensOf(d.action);
  const changeOpens = (next: Opens) => {
    if (next === "shop") set({ action: null });
    else if (next === "category") set({ action: { type: "screen", screen: "courses", category_id: props.categories[0]?.id ?? "" } });
    else if (next === "product") set({ action: { type: "item", item: { source: "products", id: props.products[0]?.id ?? "" } } });
    else if (next === "page") set({ action: { type: "page", page_slug: props.pages[0]?.slug ?? "" } });
    else if (next === "screen") set({ action: { type: "screen", screen: props.screens.find((s) => !s.alias)?.value ?? "courses" } });
    else set({ action: { type: "url", url: "", open_in: "in_app" } });
  };
  const options: { value: Opens; label: string }[] = [
    { value: "shop", label: t("stories.opensShop") },
    ...(props.hasShop ? [{ value: "category" as const, label: t("stories.opensCategory") }, { value: "product" as const, label: t("pages.opensEntry") }] : []),
    { value: "page", label: t("pages.opensPage") },
    { value: "screen", label: t("pages.opensScreen") },
    { value: "url", label: t("pages.opensUrl") },
  ];
  return (
    <section aria-labelledby={`${id}-h`} className="grid min-w-0 gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]" data-story-form>
      <form
        className="flex min-w-0 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(d);
        }}
      >
        <h2 id={`${id}-h`} className="m-0 text-lg font-bold">
          {d.id === null ? t("stories.newTitle") : t("stories.editTitle")}
        </h2>
        {errors.length ? (
          <div role="alert" className="flex flex-col gap-1">
            {errors.map((e) => (
              <Notice key={e} tone="danger" icon="error">
                {t(e, { max: props.max })}
              </Notice>
            ))}
          </div>
        ) : null}

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 p-0 font-bold">{t("stories.media")}</legend>
          <div role="radiogroup" aria-label={t("stories.media")} className="flex gap-2">
            {(["image", "video"] as const).map((k) => (
              <label key={k} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold has-[:checked]:border-2 has-[:checked]:border-midnight">
                <input type="radio" name={`${id}-kind`} className="sr-only" checked={d.kind === k} onChange={() => set({ kind: k })} />
                <Icon name={k === "video" ? "movie" : "image"} size={18} />
                {k === "video" ? t("stories.video") : t("stories.photo")}
              </label>
            ))}
          </div>
          {d.kind === "video" ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-[1_1_260px]">
                <TextInput id={`${id}-video`} label={t("stories.videoLink")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={d.videoUrl} onChange={(videoUrl) => set({ videoUrl })} />
              </div>
              <MediaPicker kind="video" share onPick={(videoUrl) => set({ videoUrl })} label={t("stories.chooseVideo")} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-[1_1_260px]">
              <TextInput id={`${id}-photo`} label={d.kind === "video" ? t("stories.poster") : t("stories.photoLink")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={d.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
            </div>
            <MediaPicker kind="image" share library onPick={(imageUrl) => set({ imageUrl })} label={t("stories.choosePhoto")} />
          </div>
          <p className="m-0 text-xs text-muted">{t("stories.mediaHint")}</p>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 p-0 font-bold">{t("stories.words")}</legend>
          <p className="m-0 text-sm text-muted">{t("stories.wordsHint", { language: main.name })}</p>
          {PARTS.map(({ part, label, hint }) => (
            <div key={part} className="flex flex-col gap-1.5" data-story-part={part}>
              <div className="grid gap-2 sm:grid-cols-3">
                {props.languages.map((l, i) => (
                  <TextInput
                    key={l.code}
                    id={`${id}-${part}-${l.code}`}
                    label={`${t(label)} · ${i === 0 ? t("stories.mainLanguage", { language: l.name }) : l.name}`}
                    dir={RTL_LANGUAGES.includes(l.code) ? "rtl" : "ltr"}
                    max={props.limits[part]}
                    rows={part === "line" ? 2 : undefined}
                    placeholder={i === 0 ? undefined : (d.texts[main.code]?.[part] ?? "")}
                    value={d.texts[l.code]?.[part] ?? ""}
                    onChange={(v) => setText(l.code, part, v)}
                  />
                ))}
              </div>
              {hint ? <span className="text-xs text-muted">{t(hint)}</span> : null}
            </div>
          ))}
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 p-0 font-bold">{t("stories.ring")}</legend>
          <IconPicker id={`${id}-icon`} label={t("stories.ringIcon")} value={d.icon} optional onChange={(icon) => set({ icon })} />
          <TextInput id={`${id}-icon-name`} label={t("stories.ringIconName")} dir="ltr" value={d.icon ?? ""} hint={t("stories.ringIconHint")} onChange={(v) => set({ icon: v.trim() || null })} />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" data-story-button>
          <legend className="mb-1 p-0 font-bold">{t("stories.button")}</legend>
          <div className="flex flex-col gap-3 rounded-xl bg-ivory/60 p-3">
            <SelectInput id={`${id}-opens`} label={t("stories.opens")} value={opens} options={options} onChange={changeOpens} />
            {d.action?.type === "screen" && opens === "category" ? (
              props.categories.length ? (
                <SelectInput
                  id={`${id}-category`}
                  label={t("stories.category")}
                  value={d.action.category_id ?? ""}
                  options={[...(props.categories.some((c) => c.id === d.action?.category_id) ? [] : [{ value: d.action.category_id ?? "", label: t("stories.chooseCategory") }]), ...props.categories.map((c) => ({ value: c.id, label: c.name }))]}
                  onChange={(category_id) => set({ action: { type: "screen", screen: "courses", category_id } })}
                />
              ) : (
                <TextInput id={`${id}-category`} label={t("stories.categoryId")} hint={t("stories.categoryIdHint")} dir="ltr" value={d.action.category_id ?? ""} onChange={(category_id) => set({ action: { type: "screen", screen: "courses", category_id: category_id.trim() } })} />
              )
            ) : null}
            {d.action?.type === "item" ? (
              props.products.length ? (
                <SelectInput
                  id={`${id}-product`}
                  label={t("pages.entryId")}
                  value={d.action.item?.id ?? ""}
                  options={[...(props.products.some((p) => p.id === d.action?.item?.id) ? [] : [{ value: d.action.item?.id ?? "", label: d.action.item?.id || "—" }]), ...props.products.map((p) => ({ value: p.id, label: p.title }))]}
                  onChange={(pid) => set({ action: { type: "item", item: { source: "products", id: pid } } })}
                />
              ) : (
                <TextInput id={`${id}-product`} label={t("pages.entryId")} dir="ltr" value={d.action.item?.id ?? ""} onChange={(pid) => set({ action: { type: "item", item: { source: "products", id: pid.trim() } } })} />
              )
            ) : null}
            {d.action?.type === "page" ? (
              <SelectInput
                id={`${id}-page`}
                label={t("pages.page")}
                value={d.action.page_slug ?? ""}
                options={[...(props.pages.some((p) => p.slug === d.action?.page_slug) ? [] : [{ value: d.action.page_slug ?? "", label: t("pages.choosePage") }]), ...props.pages.map((p) => ({ value: p.slug, label: p.title }))]}
                onChange={(page_slug) => set({ action: { type: "page", page_slug } })}
              />
            ) : null}
            {d.action?.type === "screen" && opens === "screen" ? (
              <SelectInput
                id={`${id}-screen`}
                label={t("pages.screen")}
                value={d.action.screen ?? "courses"}
                options={[...props.screens.filter((s) => !s.alias || s.value === d.action?.screen).map((s) => ({ value: s.value, label: known(s.label) }))]}
                onChange={(screen) => set({ action: { type: "screen", screen } })}
              />
            ) : null}
            {d.action?.type === "url" ? (
              <>
                <TextInput id={`${id}-url`} label={t("pages.webAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={d.action.url ?? ""} onChange={(url) => set({ action: { ...(d.action as Action), url } })} />
                <Check label={t("pages.browser")} checked={d.action.open_in === "browser"} onChange={(b) => set({ action: { ...(d.action as Action), open_in: b ? "browser" : "in_app" } })} />
              </>
            ) : null}
          </div>
          {props.hasShop ? (
            <>
              <SelectInput
                id={`${id}-belongs`}
                label={t("stories.belongsTo")}
                value={d.categoryId}
                options={[{ value: "", label: t("stories.noneCategory") }, ...(d.categoryId && !props.categories.some((c) => c.id === d.categoryId) ? [{ value: d.categoryId, label: d.categoryId }] : []), ...props.categories.map((c) => ({ value: c.id, label: c.name }))]}
                onChange={(categoryId) => set({ categoryId })}
              />
              <span className="-mt-2 text-xs text-muted">{props.categories.length ? t("stories.belongsHint") : t("stories.noCategories")}</span>
            </>
          ) : null}
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 p-0 font-bold">{t("stories.when")}</legend>
          <Check label={t("stories.enabled")} checked={d.enabled} onChange={(enabled) => set({ enabled })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput id={`${id}-starts`} label={t("stories.startsAt")} type="datetime-local" value={d.startsAt} onChange={(startsAt) => set({ startsAt })} />
            <TextInput id={`${id}-ends`} label={t("stories.endsAt")} type="datetime-local" value={d.endsAt} onChange={(endsAt) => set({ endsAt })} />
          </div>
          <span className="text-xs text-muted">{t("stories.datesHint")}</span>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={`${btn.primary} h-11`} disabled={saving}>
            {t("stories.save")}
          </button>
          <button type="button" className={`${btn.secondary} h-11`} onClick={onCancel}>
            {t("stories.cancel")}
          </button>
        </div>
      </form>
      <StoryPreview draft={d} languages={props.languages} brand={props.brand} />
    </section>
  );
}

/** 165 The story as the app shows it: full screen (its photo or video, its label, title, line and button) and as a ring, in the language picked. */
function StoryPreview({ draft, languages, brand }: { draft: Draft; languages: { code: string; name: string }[]; brand: string }) {
  const t = useDashT();
  const [lang, setLang] = useState(languages[0]?.code ?? "en");
  const main = languages[0]?.code ?? "en";
  const text = (part: Part) => draft.texts[lang]?.[part]?.trim() || draft.texts[main]?.[part]?.trim() || "";
  const rtl = RTL_LANGUAGES.includes(lang);
  return (
    <aside aria-label={t("stories.preview")} className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start" data-story-preview>
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-base font-bold">{t("stories.preview")}</h3>
        <select aria-label={t("stories.preview")} value={lang} onChange={(e) => setLang(e.target.value)} className="input input-sm w-auto">
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <p className="m-0 text-xs font-semibold text-muted">{t("stories.previewStory")}</p>
      <div dir={rtl ? "rtl" : "ltr"} className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-[28px] bg-[#1F2A37] text-white shadow-lg">
        {draft.kind === "video" && draft.videoUrl ? (
          <video src={draft.videoUrl} poster={draft.imageUrl || undefined} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : draft.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- The owner's photo, any size.
          <img src={draft.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,0)_22%,rgba(0,0,0,0)_55%,rgba(0,0,0,.7)_100%)]" />
        <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden="true">
          <span className="h-[3px] flex-1 rounded-full bg-white" />
          <span className="h-[3px] flex-1 rounded-full bg-white/40" />
        </div>
        <div className="absolute inset-x-4 bottom-5 flex flex-col items-start gap-1.5">
          {text("kicker") ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] text-[#FFD9C2] uppercase">
              {draft.icon ? <IconGlyph name={draft.icon} size={14} /> : null}
              {text("kicker")}
            </span>
          ) : null}
          {text("title") ? <strong className="text-[22px] leading-tight font-extrabold">{text("title")}</strong> : null}
          {text("line") ? <span className="text-[13px] leading-snug opacity-90">{text("line")}</span> : null}
          <span className="mt-2 inline-flex h-9 items-center gap-1 rounded-full bg-white px-4 text-[13px] font-extrabold text-[#0E0D24]">
            {text("button") || t("stories.previewOpen")}
            <IconGlyph name="arrow_forward" size={16} />
          </span>
        </div>
      </div>
      <p className="m-0 text-xs font-semibold text-muted">{t("stories.previewRing")}</p>
      <div dir={rtl ? "rtl" : "ltr"} className="flex flex-col items-center gap-1.5">
        <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full p-[3px]" style={{ background: `conic-gradient(${brand}, #C89B6D, ${brand})` }}>
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-tile-2 text-ink-3">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- The owner's photo, any size.
              <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : draft.icon ? (
              <IconGlyph name={draft.icon} size={28} />
            ) : null}
          </span>
        </span>
        <span className="max-w-[90px] truncate text-[13px] font-semibold">{text("ring") || text("title")}</span>
      </div>
    </aside>
  );
}
