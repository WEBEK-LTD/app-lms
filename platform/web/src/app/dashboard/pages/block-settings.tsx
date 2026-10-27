"use client";

import type { ReactNode } from "react";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { blockListLimits, blockTextLimit, ENTRY_TEXT_LIMITS } from "@/lib/pages/blocks";
import { NOTICE_TONE_LABELS, SOCIAL_LABELS, WEEKDAY_LABELS } from "@/lib/pages/labels";
import { emptyCard, emptyField, emptyImage, emptyPerson, emptyQuote, emptySlide, emptyStat, moveItem } from "@/lib/pages/model";
import { SOURCE_NAMES, SOURCE_SORTS, sortFor, type ScreenOption } from "@/lib/pages/sources";
import { localeInfo } from "@/lib/i18n/locales";
import {
  BLOCK_ALIGNS,
  BLOCK_BACKGROUNDS,
  BLOCK_CORNERS,
  BLOCK_SPACINGS,
  BLOCK_TEXT_SIZES,
  DIVIDER_STYLES,
  FORM_FIELD_KINDS,
  FORM_SEND_TO,
  IMAGE_FITS,
  SHOW_PLATFORMS,
  BUTTON_STYLES,
  CATEGORY_STYLES,
  ITEMS_LAYOUTS,
  LAYOUT_LIMITS,
  NOTICE_TONES,
  QUICK_LINK_STYLES,
  SOCIAL_NETWORKS,
  SPACER_SIZES,
  VISIBILITIES,
  WEEKDAYS,
  type ItemSource,
  type ItemsQuery,
  type ItemsSort,
  type HoursPeriod,
  type LayoutBlock,
  type QuickLink,
  type BlockBackground,
  type BlockLook,
  type BlockShow,
  type BlockSpacing,
  type LanguageCode,
} from "@/lib/pages/types";
import { ActionEditor, Check, firstScreen, IconGlyph, IconPicker, LangText, OwnIcon, SelectInput, TextInput, type Lang } from "./controls";
import { MediaPicker } from "@/components/media-picker";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { richText } from "@/i18n/rich";
import type { DashKey, DashT } from "@/i18n/dashboard";

export interface BlockContext {
  lang: Lang;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  categorySources: ItemSource[];
  /** 31 The screens this app's type opens. */
  screens: ScreenOption[];
  pickable: Pickable;
  /** 99.3 The app's languages, for "Shows in". */
  languages: LanguageCode[];
}

const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], DashKey> = {
  everyone: "pages.everyone",
  signed_in: "pages.onlySignedIn",
  signed_out: "pages.onlySignedOut",
};
const LAYOUT_LABELS: Record<(typeof ITEMS_LAYOUTS)[number], DashKey> = { carousel: "pages.carousel", grid: "pages.grid", list: "pages.list" };
const SORT_LABELS: Record<ItemsSort, DashKey> = { newest: "pages.newest", popular: "pages.popular", price_asc: "pages.priceAsc", price_desc: "pages.priceDesc" };
const BUTTON_LABELS: Record<(typeof BUTTON_STYLES)[number], DashKey> = { filled: "pages.filled", outlined: "pages.outlined", text: "pages.textOnly" };
const SIZE_LABELS: Record<(typeof SPACER_SIZES)[number], DashKey> = { small: "pages.small", medium: "pages.medium", large: "pages.large" };
const CATEGORY_STYLE_LABELS: Record<(typeof CATEGORY_STYLES)[number], DashKey> = { chips: "pages.chips", tiles: "pages.tiles" };

const opts = <T extends string>(list: readonly T[], labels: Record<T, DashKey>, t: DashT) => list.map((value) => ({ value, label: t(labels[value]) }));

function QueryEditor({ id, block, ctx, onChange }: { id: string; block: LayoutBlock; ctx: BlockContext; onChange: (query: ItemsQuery) => void }) {
  const t = useDashT();
  const query = block.query ?? { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] };
  const source = block.source ?? ctx.sources[0] ?? "courses";
  const entries = ctx.pickable.items[source];
  const categories = ctx.pickable.categories[source];
  const set = (patch: Partial<ItemsQuery>) => onChange({ ...query, ...patch });
  const picked = query.ids.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {categories?.length ? (
          <SelectInput
            id={`${id}-category`}
            label={t("pages.category")}
            value={query.category_id ?? ""}
            options={[{ value: "", label: t("pages.anyCategory") }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => set({ category_id: v || null })}
          />
        ) : (
          <TextInput id={`${id}-category`} label={t("pages.categoryId")} value={query.category_id ?? ""} hint={t("pages.anyCategoryHint")} onChange={(v) => set({ category_id: v.trim() || null })} />
        )}
        {/* 31 Only the orders this kind of entry has: no prices for articles; events are always soonest first. */}
        {SOURCE_SORTS[source].length > 1 ? (
          <SelectInput id={`${id}-sort`} label={t("pages.order")} value={sortFor(source, query.sort)} options={opts(SOURCE_SORTS[source], SORT_LABELS, t)} onChange={(sort) => set({ sort })} />
        ) : null}
        <TextInput
          id={`${id}-limit`}
          label={t("pages.howMany")}
          type="number"
          inputMode="numeric"
          value={String(query.limit)}
          onChange={(v) => set({ limit: Math.min(Math.max(Number.parseInt(v, 10) || 1, 1), LAYOUT_LIMITS.maxItems) })}
        />
      </div>
      {source === "products" ? <Check label={t("pages.featured")} checked={query.featured} onChange={(featured) => set({ featured })} /> : null}
      {entries?.length ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">{t("pages.handPicked")}</legend>
          <span className="text-xs text-muted">{t("pages.handPickedText")}</span>
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {entries.map((e) => (
              <Check
                key={e.id}
                label={e.title || e.id}
                checked={query.ids.includes(e.id)}
                onChange={(on) => set({ ids: on ? [...query.ids, e.id].slice(0, LAYOUT_LIMITS.maxHandPicked) : query.ids.filter((i) => i !== e.id) })}
              />
            ))}
          </div>
        </fieldset>
      ) : (
        <TextInput
          id={`${id}-ids`}
          label={t("pages.handPickedIds")}
          value={query.ids.join(", ")}
          hint={picked ? t("pages.idsHintPicked") : t("pages.idsHint")}
          onChange={(v) =>
            set({
              ids: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, LAYOUT_LIMITS.maxHandPicked),
            })
          }
        />
      )}
    </div>
  );
}

// 33 The settings of the new blocks: lists of entries, each in its own box.

const entryBtn = "inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong bg-white px-2.5 text-sm font-semibold text-midnight hover:border-midnight disabled:cursor-not-allowed disabled:opacity-40";

/** A block's list (slides, links, quotes...): each entry with its fields, moved, removed or added. */
function Entries<T>({
  id,
  name,
  items,
  min = 1,
  max,
  make,
  onChange,
  children,
}: {
  id: string;
  /** 56 "Slide 2" and "Add a slide", in the dashboard's language. */
  name: { one: DashKey; add: DashKey };
  items: T[];
  min?: number;
  max: number;
  make: () => T;
  onChange: (items: T[]) => void;
  children: (item: T, set: (next: T) => void, index: number) => ReactNode;
}) {
  const t = useDashT();
  const one = (i: number) => t(name.one, { n: i + 1 });
  return (
    <div className="flex flex-col gap-2.5">
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item, i) => (
          <li key={i}>
            <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-line p-3" id={`${id}-${i}`}>
              <legend className="px-1 text-sm font-bold">{one(i)}</legend>
              {children(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))), i)}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={entryBtn} aria-label={t("pages.moveUp", { item: one(i) })} disabled={i === 0} onClick={() => onChange(moveItem(items, i, i - 1))}>
                  <IconGlyph name="arrow_upward" size={18} /> {t("pages.up")}
                </button>
                <button
                  type="button"
                  className={entryBtn}
                  aria-label={t("pages.moveDown", { item: one(i) })}
                  disabled={i === items.length - 1}
                  onClick={() => onChange(moveItem(items, i, i + 1))}
                >
                  <IconGlyph name="arrow_downward" size={18} /> {t("pages.down")}
                </button>
                <button type="button" className={entryBtn} aria-label={t("pages.removeItem", { item: one(i) })} disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <IconGlyph name="delete" size={18} /> {t("pages.remove")}
                </button>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div>
        <button type="button" className={entryBtn} disabled={items.length >= max} onClick={() => onChange([...items, make()])}>
          <IconGlyph name="add" size={18} /> {t(name.add)}
        </button>
      </div>
    </div>
  );
}

/** `2026-11-01T18:00:00Z` as the local `2026-11-01T21:00` a date-time field shows, and back. */
function toLocalInput(iso: string | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const QUICK_STYLE_LABELS: Record<(typeof QUICK_LINK_STYLES)[number], DashKey> = { grid: "pages.tilesRows", row: "pages.oneRow" };

function MoreBlockSettings({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const t = useDashT();
  const known = useKnownText();
  const TONE_OPTIONS = NOTICE_TONES.map((value) => ({ value, label: known(NOTICE_TONE_LABELS[value]) }));
  const DAY_OPTIONS = WEEKDAYS.map((value) => ({ value, label: known(WEEKDAY_LABELS[value]) }));
  const SOCIAL_OPTIONS = SOCIAL_NETWORKS.map((value) => ({ value, label: known(SOCIAL_LABELS[value]) }));
  const RATING_OPTIONS = [{ value: "", label: t("pages.noStars") }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: t("pages.stars", { count: n }) }))];
  const id = `blk-${block.id}`;
  const set = (patch: Partial<LayoutBlock>) => onChange({ ...block, ...patch });
  const { lang } = ctx;
  const actionProps = { pages: ctx.pages, sources: ctx.sources, screens: ctx.screens, courses: ctx.pickable.items.courses };
  switch (block.type) {
    case "slider":
      return (
        <>
          <Check label={t("pages.autoAdvance")} checked={block.auto_advance !== false} onChange={(auto_advance) => set({ auto_advance })} />
          <Entries id={`${id}-slides`} name={{ one: "pages.slide", add: "pages.addSlide" }} items={block.slides ?? []} max={blockListLimits("slider", "slides").max} make={emptySlide} onChange={(slides) => set({ slides })}>
            {(s, setSlide, i) => (
              <>
                <TextInput
                  id={`${id}-s${i}-image`}
                  label={t("pages.imageAddress")}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  dir="ltr"
                  hint={t("pages.slideImageHint")}
                  value={s.image_url ?? ""}
                  onChange={(v) => setSlide({ ...s, image_url: v || null })}
                />
                <MediaPicker kind="image" library onPick={(link) => setSlide({ ...s, image_url: link })} />
                <LangText id={`${id}-s${i}-heading`} label={t("pages.heading")} value={s} field="heading" max={ENTRY_TEXT_LIMITS.slides.heading} lang={lang} onChange={setSlide} />
                <LangText id={`${id}-s${i}-subheading`} label={t("pages.textUnder")} value={s} field="subheading" max={ENTRY_TEXT_LIMITS.slides.subheading} lang={lang} onChange={setSlide} />
                <ActionEditor id={`${id}-s${i}-action`} label={t("pages.onTap")} action={s.action} optional onChange={(action) => setSlide({ ...s, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "quick_links":
      return (
        <>
          <SelectInput
            id={`${id}-style`}
            label={t("pages.look")}
            value={(block.style ?? "grid") as (typeof QUICK_LINK_STYLES)[number]}
            options={opts(QUICK_LINK_STYLES, QUICK_STYLE_LABELS, t)}
            onChange={(style) => set({ style })}
          />
          <Entries
            id={`${id}-links`}
            name={{ one: "pages.link", add: "pages.addLink" }}
            items={block.links ?? []}
            max={blockListLimits("quick_links", "links").max}
            make={(): QuickLink => ({ icon: "star", label: "", action: { type: "screen", screen: firstScreen(ctx.screens) } })}
            onChange={(links) => set({ links })}
          >
            {(l, setLink, i) => (
              <>
                <LangText id={`${id}-l${i}-label`} label={t("pages.label")} value={l} field="label" max={ENTRY_TEXT_LIMITS.links.label} lang={lang} onChange={setLink} />
                <IconPicker id={`${id}-l${i}-icon`} label={t("pages.icon")} value={l.icon} onChange={(icon) => setLink({ ...l, icon: icon ?? l.icon })} />
                <OwnIcon id={`${id}-l${i}-own-icon`} value={l.icon_url} onChange={(icon_url) => setLink({ ...l, icon_url })} />
                <ActionEditor id={`${id}-l${i}-action`} label={t("pages.opens")} action={l.action} optional={false} onChange={(action) => action && setLink({ ...l, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "testimonials":
      return (
        <Entries id={`${id}-quotes`} name={{ one: "pages.quote", add: "pages.addQuote" }} items={block.quotes ?? []} max={blockListLimits("testimonials", "quotes").max} make={emptyQuote} onChange={(quotes) => set({ quotes })}>
          {(q, setQuote, i) => (
            <>
              <LangText id={`${id}-q${i}-text`} label={t("pages.whatSaid")} value={q} field="text" max={ENTRY_TEXT_LIMITS.quotes.text} lang={lang} rows={3} onChange={setQuote} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LangText id={`${id}-q${i}-name`} label={t("pages.name")} value={q} field="name" max={ENTRY_TEXT_LIMITS.quotes.name} lang={lang} onChange={setQuote} />
                <LangText id={`${id}-q${i}-role`} label={t("pages.role")} value={q} field="role" max={ENTRY_TEXT_LIMITS.quotes.role} lang={lang} onChange={setQuote} hint={t("pages.roleStudent")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  id={`${id}-q${i}-photo`}
                  label={t("pages.photoAddress")}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  dir="ltr"
                  hint={t("pages.optionalHint")}
                  value={q.photo_url ?? ""}
                  onChange={(v) => setQuote({ ...q, photo_url: v || null })}
                />
                <SelectInput id={`${id}-q${i}-rating`} label={t("pages.stars0")} value={q.rating ? String(q.rating) : ""} options={RATING_OPTIONS} onChange={(v) => setQuote({ ...q, rating: v ? Number(v) : null })} />
              </div>
            </>
          )}
        </Entries>
      );
    case "faq":
      return (
        <Entries
          id={`${id}-questions`}
          name={{ one: "pages.question", add: "pages.addQuestion" }}
          items={block.questions ?? []}
          max={blockListLimits("faq", "questions").max}
          make={() => ({ question: "", answer: "" })}
          onChange={(questions) => set({ questions })}
        >
          {(q, setQuestion, i) => (
            <>
              <LangText id={`${id}-f${i}-question`} label={t("pages.questionField")} value={q} field="question" max={ENTRY_TEXT_LIMITS.questions.question} lang={lang} onChange={setQuestion} />
              <LangText id={`${id}-f${i}-answer`} label={t("pages.answer")} value={q} field="answer" max={ENTRY_TEXT_LIMITS.questions.answer} lang={lang} rows={3} onChange={setQuestion} />
            </>
          )}
        </Entries>
      );
    case "countdown":
      return (
        <>
          <LangText id={`${id}-heading`} label={t("pages.heading")} value={block} field="heading" max={blockTextLimit(block.type, "heading")} lang={lang} onChange={onChange} hint={t("pages.countdownHeadingHint")} />
          <LangText id={`${id}-subheading`} label={t("pages.textUnder")} value={block} field="subheading" max={blockTextLimit(block.type, "subheading")} lang={lang} onChange={onChange} hint={t("pages.optionalHint")} />
          <TextInput
            id={`${id}-ends`}
            label={t("pages.endsAt")}
            type="datetime-local"
            value={toLocalInput(block.ends_at)}
            hint={t("pages.endsAtHint")}
            onChange={(v) => set({ ends_at: fromLocalInput(v) })}
          />
          <LangText id={`${id}-ended`} label={t("pages.textAfter")} value={block} field="ended_text" max={blockTextLimit(block.type, "ended_text")} lang={lang} onChange={onChange} hint={t("pages.textAfterHint")} />
          <LangText id={`${id}-label`} label={t("pages.buttonText")} value={block} field="label" max={blockTextLimit(block.type, "label")} lang={lang} onChange={onChange} hint={t("pages.buttonTextHint")} />
          <ActionEditor id={`${id}-action`} label={t("pages.buttonOpens")} action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      );
    case "contact":
      return (
        <>
          <p className="m-0 text-sm text-muted">{t("pages.contactText")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput id={`${id}-phone`} label={t("pages.phone")} dir="ltr" inputMode="numeric" placeholder="+20 100 123 4567" value={block.phone ?? ""} onChange={(v) => set({ phone: v || null })} />
            <TextInput id={`${id}-whatsapp`} label={t("pages.whatsapp")} dir="ltr" inputMode="numeric" placeholder="+20 100 123 4567" value={block.whatsapp ?? ""} onChange={(v) => set({ whatsapp: v || null })} />
            <TextInput id={`${id}-email`} label={t("pages.email")} dir="ltr" type="email" value={block.email ?? ""} onChange={(v) => set({ email: v || null })} />
            <TextInput id={`${id}-website`} label={t("pages.website")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={block.website ?? ""} onChange={(v) => set({ website: v || null })} />
          </div>
          <LangText id={`${id}-address`} label={t("pages.address")} value={block} field="address" max={blockTextLimit(block.type, "address")} lang={lang} onChange={onChange} hint={t("pages.addressHint")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              id={`${id}-lat`}
              label={t("pages.latitude")}
              inputMode="decimal"
              placeholder="30.0444"
              dir="ltr"
              hint={t("pages.latitudeHint")}
              value={block.latitude === null || block.latitude === undefined ? "" : String(block.latitude)}
              onChange={(v) => set({ latitude: v.trim() === "" ? null : Number(v.replace(",", ".")) })}
            />
            <TextInput
              id={`${id}-lng`}
              label={t("pages.longitude")}
              dir="ltr"
              inputMode="decimal"
              placeholder="31.2357"
              value={block.longitude === null || block.longitude === undefined ? "" : String(block.longitude)}
              onChange={(v) => set({ longitude: v.trim() === "" ? null : Number(v.replace(",", ".")) })}
            />
          </div>
        </>
      );
    case "hours":
      return (
        <>
          <Entries
            id={`${id}-hours`}
            name={{ one: "pages.openingTime", add: "pages.addOpeningTime" }}
            min={0}
            items={block.hours ?? []}
            max={blockListLimits("hours", "hours").max}
            make={(): HoursPeriod => ({ day: "mon", opens: "09:00", closes: "17:00" })}
            onChange={(hours) => set({ hours })}
          >
            {(h, setHours, i) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectInput id={`${id}-h${i}-day`} label={t("pages.day")} value={h.day} options={DAY_OPTIONS} onChange={(day) => setHours({ ...h, day })} />
                <TextInput id={`${id}-h${i}-opens`} label={t("pages.opensAt")} type="time" value={h.opens} onChange={(opens) => setHours({ ...h, opens })} />
                <TextInput id={`${id}-h${i}-closes`} label={t("pages.closes")} type="time" value={h.closes} onChange={(closes) => setHours({ ...h, closes })} />
              </div>
            )}
          </Entries>
          <p className="m-0 text-xs text-muted">{t("pages.hoursText")}</p>
          <TextInput
            id={`${id}-closed`}
            label={t("pages.closedOn")}
            placeholder="2026-12-31, 2027-01-01"
            dir="ltr"
            hint={t("pages.closedOnHint")}
            value={(block.closed_dates ?? []).join(", ")}
            onChange={(v) =>
              set({
                closed_dates: v
                  .split(",")
                  .map((d) => d.trim())
                  .filter(Boolean),
              })
            }
          />
          <LangText id={`${id}-note`} label={t("pages.note")} value={block} field="note" max={blockTextLimit(block.type, "note")} lang={lang} onChange={onChange} hint={t("pages.noteHint")} />
        </>
      );
    case "social":
      return (
        <Entries
          id={`${id}-profiles`}
          name={{ one: "pages.profile", add: "pages.addProfile" }}
          items={block.profiles ?? []}
          max={SOCIAL_NETWORKS.length}
          make={() => ({ network: SOCIAL_NETWORKS.find((n) => !(block.profiles ?? []).some((p) => p.network === n)) ?? "instagram", url: "" })}
          onChange={(profiles) => set({ profiles })}
        >
          {(p, setProfile, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectInput id={`${id}-p${i}-network`} label={t("pages.network")} value={p.network} options={SOCIAL_OPTIONS} onChange={(network) => setProfile({ ...p, network })} />
              <TextInput id={`${id}-p${i}-url`} label={t("pages.profileAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={p.url} onChange={(url) => setProfile({ ...p, url })} />
            </div>
          )}
        </Entries>
      );
    case "team":
      return (
        <>
          <SelectInput id={`${id}-layout`} label={t("pages.look")} value={block.layout ?? "carousel"} options={opts(ITEMS_LAYOUTS, LAYOUT_LABELS, t)} onChange={(layout) => set({ layout })} />
          <Entries id={`${id}-people`} name={{ one: "pages.person", add: "pages.addPerson" }} items={block.people ?? []} max={blockListLimits("team", "people").max} make={emptyPerson} onChange={(people) => set({ people })}>
            {(p, setPerson, i) => (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LangText id={`${id}-m${i}-name`} label={t("pages.name")} value={p} field="name" max={ENTRY_TEXT_LIMITS.people.name} lang={lang} onChange={setPerson} />
                  <LangText id={`${id}-m${i}-role`} label={t("pages.role")} value={p} field="role" max={ENTRY_TEXT_LIMITS.people.role} lang={lang} onChange={setPerson} hint={t("pages.roleCoach")} />
                </div>
                <LangText id={`${id}-m${i}-bio`} label={t("pages.fewWords")} value={p} field="bio" max={ENTRY_TEXT_LIMITS.people.bio} lang={lang} rows={2} onChange={setPerson} hint={t("pages.optionalHint")} />
                <TextInput
                  id={`${id}-m${i}-photo`}
                  label={t("pages.photoAddress")}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  dir="ltr"
                  hint={t("pages.photoHint")}
                  value={p.photo_url ?? ""}
                  onChange={(v) => setPerson({ ...p, photo_url: v || null })}
                />
                <ActionEditor id={`${id}-m${i}-action`} label={t("pages.onTap")} action={p.action} optional onChange={(action) => setPerson({ ...p, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "stats":
      return (
        <Entries
          id={`${id}-stats`}
          name={{ one: "pages.number", add: "pages.addNumber" }}
          min={blockListLimits("stats", "stats").min}
          items={block.stats ?? []}
          max={blockListLimits("stats", "stats").max}
          make={emptyStat}
          onChange={(stats) => set({ stats })}
        >
          {(s, setStat, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <LangText id={`${id}-n${i}-value`} label={t("pages.numberField")} value={s} field="value" max={ENTRY_TEXT_LIMITS.stats.value} lang={lang} onChange={setStat} hint={t("pages.numberHint")} />
              <LangText id={`${id}-n${i}-label`} label={t("pages.label")} value={s} field="label" max={ENTRY_TEXT_LIMITS.stats.label} lang={lang} onChange={setStat} />
            </div>
          )}
        </Entries>
      );
    // 99.4
    case "cards":
      return (
        <>
          <SelectInput id={`${id}-columns`} label={t("pages.columns")} value={String(block.columns ?? 2) as "2" | "3"} options={COLUMN_OPTIONS} onChange={(v) => set({ columns: v === "3" ? 3 : 2 })} />
          <Entries id={`${id}-cards`} name={{ one: "pages.card", add: "pages.addCard" }} items={block.cards ?? []} max={blockListLimits("cards", "cards").max} make={emptyCard} onChange={(cards) => set({ cards })}>
            {(card, setCard, i) => (
              <>
                <LangText id={`${id}-c${i}-title`} label={t("pages.entryTitle")} value={card} field="title" max={ENTRY_TEXT_LIMITS.cards.title} lang={lang} onChange={setCard} />
                <LangText id={`${id}-c${i}-text`} label={t("pages.text")} value={card} field="text" max={ENTRY_TEXT_LIMITS.cards.text} lang={lang} rows={2} onChange={setCard} hint={t("pages.optionalHint")} />
                <TextInput id={`${id}-c${i}-image`} label={t("pages.imageAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={card.image_url ?? ""} onChange={(v) => setCard({ ...card, image_url: v || null })} />
                <MediaPicker kind="image" library onPick={(image_url) => setCard({ ...card, image_url })} />
                <ActionEditor id={`${id}-c${i}-action`} label={t("pages.onTap")} action={card.action} optional onChange={(action) => setCard({ ...card, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "gallery":
      return (
        <>
          <SelectInput id={`${id}-columns`} label={t("pages.columns")} value={String(block.columns ?? 3) as "2" | "3"} options={COLUMN_OPTIONS} onChange={(v) => set({ columns: v === "2" ? 2 : 3 })} />
          <Entries id={`${id}-images`} name={{ one: "pages.photo", add: "pages.addPhoto" }} items={block.images ?? []} max={blockListLimits("gallery", "images").max} make={emptyImage} onChange={(images) => set({ images })}>
            {(image, setImage, i) => (
              <>
                <TextInput id={`${id}-g${i}-image`} label={t("pages.imageAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={image.image_url} onChange={(image_url) => setImage({ ...image, image_url })} />
                <MediaPicker kind="image" library onPick={(image_url) => setImage({ ...image, image_url })} />
                <LangText id={`${id}-g${i}-caption`} label={t("pages.caption")} value={image} field="caption" max={ENTRY_TEXT_LIMITS.images.caption} lang={lang} onChange={setImage} hint={t("pages.optionalHint")} />
              </>
            )}
          </Entries>
        </>
      );
    case "map":
      return (
        <>
          <LangText id={`${id}-name`} label={t("pages.placeName")} value={block} field="name" max={blockTextLimit(block.type, "name")} lang={lang} onChange={onChange} hint={t("pages.optionalHint")} />
          <LangText id={`${id}-address`} label={t("pages.address")} value={block} field="address" max={blockTextLimit(block.type, "address")} lang={lang} onChange={onChange} hint={t("pages.optionalHint")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              id={`${id}-lat`}
              label={t("pages.latitude")}
              inputMode="decimal"
              placeholder="30.0444"
              dir="ltr"
              hint={t("pages.latitudeHint")}
              value={block.latitude ? String(block.latitude) : ""}
              onChange={(v) => set({ latitude: Number(v.replace(",", ".")) || 0 })}
            />
            <TextInput id={`${id}-lng`} label={t("pages.longitude")} dir="ltr" inputMode="decimal" placeholder="31.2357" value={block.longitude ? String(block.longitude) : ""} onChange={(v) => set({ longitude: Number(v.replace(",", ".")) || 0 })} />
          </div>
          <LangText id={`${id}-label`} label={t("pages.buttonText")} value={block} field="label" max={blockTextLimit(block.type, "label")} lang={lang} onChange={onChange} hint={t("pages.directionsHint")} />
        </>
      );
    case "divider":
      return <SelectInput id={`${id}-style`} label={t("pages.style")} value={(block.style ?? "line") as (typeof DIVIDER_STYLES)[number]} options={opts(DIVIDER_STYLES, DIVIDER_LABELS, t)} onChange={(style) => set({ style })} />;
    case "form": {
      const fields = block.fields ?? [];
      return (
        <>
          <SelectInput id={`${id}-send-to`} label={t("pages.sendTo")} value={block.send_to ?? "email"} options={opts(FORM_SEND_TO, SEND_TO_LABELS, t)} onChange={(send_to) => set({ send_to })} />
          <Entries id={`${id}-fields`} name={{ one: "pages.question", add: "pages.addQuestion" }} items={fields} max={blockListLimits("form", "fields").max} make={() => emptyField(fields.map((f) => f.id))} onChange={(next) => set({ fields: next })}>
            {(field, setField, i) => (
              <>
                <LangText id={`${id}-f${i}-label`} label={t("pages.questionText")} value={field} field="label" max={ENTRY_TEXT_LIMITS.fields.label} lang={lang} onChange={setField} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectInput
                    id={`${id}-f${i}-kind`}
                    label={t("pages.answerKind")}
                    value={field.kind}
                    options={opts(FORM_FIELD_KINDS, FIELD_KIND_LABELS, t)}
                    onChange={(kind) => setField({ ...field, kind, options: kind === "choice" ? (field.options ?? []) : null })}
                  />
                  <div className="flex items-end pb-2">
                    <Check label={t("pages.requiredAnswer")} checked={field.required} onChange={(required) => setField({ ...field, required })} />
                  </div>
                </div>
                {field.kind === "choice" ? (
                  <TextInput id={`${id}-f${i}-options`} label={t("pages.choices")} rows={4} hint={t("pages.choicesHint")} value={(field.options ?? []).join("\n")} onChange={(v) => setField({ ...field, options: v.split("\n").map((o) => o.trimStart()) })} />
                ) : null}
              </>
            )}
          </Entries>
          <LangText id={`${id}-submit`} label={t("pages.buttonText")} value={block} field="submit_label" max={blockTextLimit(block.type, "submit_label")} lang={lang} onChange={onChange} hint={t("pages.sendHint")} />
          <LangText id={`${id}-success`} label={t("pages.successText")} value={block} field="success_text" max={blockTextLimit(block.type, "success_text")} lang={lang} rows={2} onChange={onChange} hint={t("pages.successHint")} />
        </>
      );
    }
    case "notice":
      return (
        <>
          <SelectInput id={`${id}-tone`} label={t("pages.color")} value={block.tone ?? "info"} options={TONE_OPTIONS} onChange={(tone) => set({ tone })} />
          <LangText id={`${id}-text`} label={t("pages.text")} value={block} field="text" max={blockTextLimit(block.type, "text")} lang={lang} rows={2} onChange={onChange} />
          <LangText id={`${id}-label`} label={t("pages.linkText")} value={block} field="label" max={blockTextLimit(block.type, "label")} lang={lang} onChange={onChange} hint={t("pages.buttonTextHint")} />
          <ActionEditor id={`${id}-action`} label={t("pages.linkOpens")} action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      );
    default:
      return null;
  }
}

// 82.5 Backgrounds within the brand, and spacing.
const BACKGROUND_LABELS: Record<BlockBackground, DashKey> = {
  none: "pages.bgNone",
  tint: "pages.bgTint",
  primary: "pages.bgPrimary",
  secondary: "pages.bgSecondary",
  surface: "pages.bgSurface",
};
const SPACING_LABELS: Record<BlockSpacing, DashKey> = {
  none: "pages.spaceNone",
  small: "pages.small",
  medium: "pages.medium",
  large: "pages.large",
};
// 99.4 The new blocks' choices.
const COLUMN_OPTIONS = [
  { value: "2" as const, label: "2" },
  { value: "3" as const, label: "3" },
];
const DIVIDER_LABELS: Record<(typeof DIVIDER_STYLES)[number], DashKey> = { line: "pages.lineSolid", dashed: "pages.lineDashed", dots: "pages.lineDots" };
const SEND_TO_LABELS: Record<(typeof FORM_SEND_TO)[number], DashKey> = { email: "pages.sendEmail", chat: "pages.sendChat" };
const FIELD_KIND_LABELS: Record<(typeof FORM_FIELD_KINDS)[number], DashKey> = {
  text: "pages.kindText",
  long_text: "pages.kindLong",
  email: "pages.kindEmail",
  phone: "pages.kindPhone",
  number: "pages.kindNumber",
  choice: "pages.kindChoice",
};

// 99.3 Where its texts sit, their size, its corners and how its pictures fit.
const ALIGN_LABELS: Record<(typeof BLOCK_ALIGNS)[number], DashKey> = { start: "pages.alignStart", center: "pages.alignCenter", end: "pages.alignEnd" };
const TEXT_SIZE_LABELS: Record<(typeof BLOCK_TEXT_SIZES)[number], DashKey> = { small: "pages.small", medium: "pages.medium", large: "pages.large" };
const CORNERS_LABELS: Record<(typeof BLOCK_CORNERS)[number], DashKey> = { app: "pages.cornersApp", sharp: "pages.cornersSharp", round: "pages.cornersRound" };
const FIT_LABELS: Record<(typeof IMAGE_FITS)[number], DashKey> = { cover: "pages.fitCover", contain: "pages.fitContain" };
const PLATFORM_LABELS: Record<(typeof SHOW_PLATFORMS)[number], DashKey> = { android: "pages.onAndroid", ios: "pages.onIphone" };
/** 99.3 Blocks with pictures, whose fit can change. */
const PICTURE_BLOCKS: readonly LayoutBlock["type"][] = ["banner", "image", "slider"];

/** The usual look is stored as none; 99.3 so are its usual parts. */
const lookOf = (look: BlockLook): BlockLook | null => {
  const { background, spacing, align, text_size, corners, image_fit } = look;
  const more = {
    ...(align && align !== "start" ? { align } : {}),
    ...(text_size && text_size !== "medium" ? { text_size } : {}),
    ...(corners && corners !== "app" ? { corners } : {}),
    ...(image_fit && image_fit !== "cover" ? { image_fit } : {}),
  };
  return background === "none" && spacing === "medium" && !Object.keys(more).length ? null : { background, spacing, ...more };
};

/** 99.3 A date and time as the browser's date field shows it, in the owner's time zone. */
function localTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 99.3 The rules stored as none when the block always shows. */
function showOf(show: BlockShow): BlockShow | null {
  const out: BlockShow = {};
  if (show.from) out.from = show.from;
  if (show.until) out.until = show.until;
  if (show.platforms?.length) out.platforms = show.platforms;
  if (show.languages?.length) out.languages = show.languages;
  return Object.keys(out).length ? out : null;
}

/** The settings of one block, in the language being edited. */
export function BlockSettings({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const t = useDashT();
  const known = useKnownText();
  const id = `blk-${block.id}`;
  const set = (patch: Partial<LayoutBlock>) => onChange({ ...block, ...patch });
  const { lang } = ctx;
  const actionProps = { pages: ctx.pages, sources: ctx.sources, screens: ctx.screens, courses: ctx.pickable.items.courses };
  const sourceOptions = (list: ItemSource[]) => list.map((s) => ({ value: s, label: known(SOURCE_NAMES[s]) }));
  return (
    <div className="flex flex-col gap-3">
      {block.type !== "spacer" ? <LangText id={`${id}-title`} label={t("pages.titleAbove")} value={block} field="title" max={blockTextLimit(block.type, "title")} lang={lang} onChange={onChange} hint={t("pages.optionalHint")} /> : null}
      {block.type === "banner" ? (
        <>
          <TextInput id={`${id}-image`} label={t("pages.imageAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={block.image_url ?? ""} onChange={(image_url) => set({ image_url })} />
          {/* 51 Pictures and videos from the Media library. */}
          <MediaPicker kind="image" library onPick={(image_url) => set({ image_url })} />
          <LangText id={`${id}-heading`} label={t("pages.heading")} value={block} field="heading" max={blockTextLimit(block.type, "heading")} lang={lang} onChange={onChange} />
          <LangText id={`${id}-subheading`} label={t("pages.textUnder")} value={block} field="subheading" max={blockTextLimit(block.type, "subheading")} lang={lang} onChange={onChange} />
          <ActionEditor id={`${id}-action`} label={t("pages.onTap")} action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "text" ? (
        <LangText
          id={`${id}-html`}
          label={t("pages.text")}
          value={block}
          field="html"
          max={blockTextLimit(block.type, "html")}
          lang={lang}
          rows={6}
          onChange={onChange}
          hint={richText(t("pages.htmlHint"), {
            code: () => <code dir="ltr">{"<p>, <h2>, <h3>, <b>, <i>, <a href>, <ul>"}</code>, // i18n-ok: HTML tags
            code2: () => <code dir="ltr">{"<li>"}</code>, // i18n-ok: HTML tags
          })}
        />
      ) : null}
      {block.type === "image" ? (
        <>
          <TextInput id={`${id}-image`} label={t("pages.imageAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={block.image_url ?? ""} onChange={(image_url) => set({ image_url })} />
          <MediaPicker kind="image" library onPick={(image_url) => set({ image_url })} />
          <TextInput
            id={`${id}-ratio`}
            label={t("pages.shape")}
            inputMode="decimal"
            placeholder="1.78"
            dir="ltr"
            hint={t("pages.shapeHint")}
            value={block.aspect_ratio === null || block.aspect_ratio === undefined ? "" : String(block.aspect_ratio)}
            onChange={(v) => set({ aspect_ratio: v.trim() === "" ? null : Number(v.replace(",", ".")) })}
          />
          <ActionEditor id={`${id}-action`} label={t("pages.onTap")} action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "video" ? (
        <>
          <TextInput id={`${id}-url`} label={t("pages.videoAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" hint={t("pages.videoHint")} value={block.url ?? ""} onChange={(url) => set({ url })} />
          <MediaPicker kind="video" share onPick={(url) => set({ url })} />
          <TextInput id={`${id}-poster`} label={t("pages.coverAddress")} dir="ltr" type="url" inputMode="url" placeholder="https://" hint={t("pages.optionalHint")} value={block.poster_url ?? ""} onChange={(v) => set({ poster_url: v || null })} />
          <MediaPicker kind="image" label={t("pages.coverFromMedia")} onPick={(poster_url) => set({ poster_url })} />
        </>
      ) : null}
      {block.type === "button" ? (
        <>
          <LangText id={`${id}-label`} label={t("pages.buttonText")} value={block} field="label" max={blockTextLimit(block.type, "label")} lang={lang} onChange={onChange} />
          <SelectInput
            id={`${id}-style`}
            label={t("pages.style")}
            value={(block.style ?? "filled") as (typeof BUTTON_STYLES)[number]}
            options={opts(BUTTON_STYLES, BUTTON_LABELS, t)}
            onChange={(style) => set({ style })}
          />
          <IconPicker id={`${id}-icon`} label={t("pages.icon")} value={block.icon ?? null} optional onChange={(icon) => set({ icon })} />
          <ActionEditor id={`${id}-action`} label={t("pages.onTap")} action={block.action} optional={false} onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "items" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              id={`${id}-source`}
              label={t("pages.shows")}
              value={block.source ?? ctx.sources[0] ?? "courses"}
              options={sourceOptions(ctx.sources)}
              onChange={(source) => {
                const query = block.query ?? { category_id: null, featured: false, sort: "newest" as const, limit: 10, ids: [] };
                set({ source, query: { ...query, sort: sortFor(source, query.sort), category_id: null, ids: [] } });
              }}
            />
            <SelectInput id={`${id}-layout`} label={t("pages.look")} value={block.layout ?? "carousel"} options={opts(ITEMS_LAYOUTS, LAYOUT_LABELS, t)} onChange={(layout) => set({ layout })} />
          </div>
          <QueryEditor id={id} block={block} ctx={ctx} onChange={(query) => set({ query })} />
          <ActionEditor id={`${id}-see-all`} label={t("pages.seeAllOpens")} action={block.see_all} optional onChange={(see_all) => set({ see_all })} {...actionProps} />
        </>
      ) : null}
      {block.type === "categories" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            id={`${id}-source`}
            label={t("pages.categoriesOf")}
            value={block.source ?? ctx.categorySources[0] ?? "courses"}
            options={sourceOptions(ctx.categorySources)}
            onChange={(source) => set({ source })}
          />
          <SelectInput
            id={`${id}-style`}
            label={t("pages.style")}
            value={(block.style ?? "chips") as (typeof CATEGORY_STYLES)[number]}
            options={opts(CATEGORY_STYLES, CATEGORY_STYLE_LABELS, t)}
            onChange={(style) => set({ style })}
          />
        </div>
      ) : null}
      {block.type === "search" ? (
        <>
          <SelectInput id={`${id}-source`} label={t("pages.searches")} value={block.source ?? ctx.sources[0] ?? "courses"} options={sourceOptions(ctx.sources)} onChange={(source) => set({ source })} />
          <LangText id={`${id}-placeholder`} label={t("pages.searchText")} value={block} field="placeholder" max={blockTextLimit(block.type, "placeholder")} lang={lang} onChange={onChange} />
        </>
      ) : null}
      {block.type === "continue_learning" ? <p className="m-0 text-sm text-muted">{t("pages.continueText")}</p> : null}
      {block.type === "embed" ? (
        <>
          <TextInput id={`${id}-url`} label={t("pages.pageAddressField")} dir="ltr" type="url" inputMode="url" placeholder="https://" value={block.url ?? ""} onChange={(url) => set({ url })} />
          <TextInput
            id={`${id}-height`}
            label={t("pages.height")}
            inputMode="numeric"
            hint={t("pages.heightHint")}
            value={block.height ? String(block.height) : ""}
            onChange={(v) => set({ height: v.trim() === "" ? null : Number.parseInt(v, 10) || null })}
          />
        </>
      ) : null}
      {block.type === "spacer" ? <SelectInput id={`${id}-size`} label={t("pages.size")} value={block.size ?? "medium"} options={opts(SPACER_SIZES, SIZE_LABELS, t)} onChange={(size) => set({ size })} /> : null}
      <MoreBlockSettings block={block} ctx={ctx} onChange={onChange} />
      <SelectInput id={`${id}-visibility`} label={t("pages.whoSees")} value={block.visibility} options={opts(VISIBILITIES, VISIBILITY_LABELS, t)} onChange={(visibility) => set({ visibility })} />
      {/* 82.5 The block's look within the brand. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput
          id={`${id}-background`}
          label={t("pages.background")}
          value={block.look?.background ?? "none"}
          options={BLOCK_BACKGROUNDS.map((b) => ({ value: b, label: t(BACKGROUND_LABELS[b]) }))}
          onChange={(background) => set({ look: lookOf({ background, spacing: block.look?.spacing ?? "medium" }) })}
        />
        <SelectInput
          id={`${id}-spacing`}
          label={t("pages.spacing")}
          value={block.look?.spacing ?? "medium"}
          options={BLOCK_SPACINGS.map((sp) => ({ value: sp, label: t(SPACING_LABELS[sp]) }))}
          onChange={(spacing) => set({ look: lookOf({ background: block.look?.background ?? "none", spacing }) })}
        />
      </div>
      <BlockStyle block={block} ctx={ctx} onChange={onChange} />
    </div>
  );
}

/** 99.3 More of the block's look, and when it shows. */
function BlockStyle({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const t = useDashT();
  const id = `blk-${block.id}`;
  const look: BlockLook = block.look ?? { background: "none", spacing: "medium" };
  const setLook = (patch: Partial<BlockLook>) => onChange({ ...block, look: lookOf({ ...look, ...patch }) });
  const show = block.show ?? {};
  const setShow = (patch: Partial<BlockShow>) => onChange({ ...block, show: showOf({ ...show, ...patch }) });
  const time = (value: string) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString().replace(/\.000Z$/, "Z") : null;
  };
  const toggle = <T extends string>(list: readonly T[] | null | undefined, all: readonly T[], value: T, on: boolean): T[] | null => {
    const now = new Set(list?.length ? list : all);
    if (on) now.add(value);
    else now.delete(value);
    const chosen = all.filter((v) => now.has(v));
    // Every one (or none): no rule.
    return chosen.length === all.length || chosen.length === 0 ? null : chosen;
  };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput id={`${id}-align`} label={t("pages.textPosition")} value={look.align ?? "start"} options={opts(BLOCK_ALIGNS, ALIGN_LABELS, t)} onChange={(align) => setLook({ align })} />
        <SelectInput id={`${id}-text-size`} label={t("pages.textSize")} value={look.text_size ?? "medium"} options={opts(BLOCK_TEXT_SIZES, TEXT_SIZE_LABELS, t)} onChange={(text_size) => setLook({ text_size })} />
        <SelectInput id={`${id}-corners`} label={t("pages.corners")} value={look.corners ?? "app"} options={opts(BLOCK_CORNERS, CORNERS_LABELS, t)} onChange={(corners) => setLook({ corners })} />
        {PICTURE_BLOCKS.includes(block.type) ? (
          <SelectInput id={`${id}-fit`} label={t("pages.pictureFit")} value={look.image_fit ?? "cover"} options={opts(IMAGE_FITS, FIT_LABELS, t)} onChange={(image_fit) => setLook({ image_fit })} />
        ) : null}
      </div>
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-3">
        <legend className="px-1 text-sm font-semibold">{t("pages.whenShows")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput id={`${id}-from`} label={t("pages.showFrom")} type="datetime-local" value={localTime(show.from)} onChange={(v) => setShow({ from: time(v) })} />
          <TextInput id={`${id}-until`} label={t("pages.showUntil")} type="datetime-local" value={localTime(show.until)} onChange={(v) => setShow({ until: time(v) })} />
        </div>
        <p className="m-0 text-xs text-muted">{t("pages.showDatesHint")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label={t("pages.showOn")}>
          <span className="text-sm font-semibold">{t("pages.showOn")}</span>
          {SHOW_PLATFORMS.map((p) => (
            <Check key={p} label={t(PLATFORM_LABELS[p])} checked={!show.platforms?.length || show.platforms.includes(p)} onChange={(on) => setShow({ platforms: toggle(show.platforms, SHOW_PLATFORMS, p, on) })} />
          ))}
        </div>
        {ctx.languages.length > 1 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label={t("pages.showIn")}>
            <span className="text-sm font-semibold">{t("pages.showIn")}</span>
            {ctx.languages.map((l) => (
              <Check key={l} label={localeInfo(l)?.nativeName ?? l} checked={!show.languages?.length || show.languages.includes(l)} onChange={(on) => setShow({ languages: toggle(show.languages, ctx.languages, l, on) })} />
            ))}
          </div>
        ) : null}
      </fieldset>
    </>
  );
}
