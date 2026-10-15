"use client";

import type { ReactNode } from "react";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { NOTICE_TONE_LABELS, SOCIAL_LABELS, WEEKDAY_LABELS } from "@/lib/pages/labels";
import { emptyPerson, emptyQuote, emptySlide, emptyStat, moveItem } from "@/lib/pages/model";
import { SOURCE_NAMES, SOURCE_SORTS, sortFor, type ScreenOption } from "@/lib/pages/sources";
import {
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
} from "@/lib/pages/types";
import { ActionEditor, Check, firstScreen, IconGlyph, IconPicker, LangText, SelectInput, TextInput, type Lang } from "./controls";

export interface BlockContext {
  lang: Lang;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  categorySources: ItemSource[];
  /** 31 The screens this app's type opens. */
  screens: ScreenOption[];
  pickable: Pickable;
}

const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], string> = {
  everyone: "Everyone",
  signed_in: "Only signed-in people",
  signed_out: "Only people who aren't signed in",
};
const LAYOUT_LABELS: Record<(typeof ITEMS_LAYOUTS)[number], string> = { carousel: "Side-scrolling row", grid: "Grid", list: "List" };
const SORT_LABELS: Record<ItemsSort, string> = { newest: "Newest first", popular: "Most popular first", price_asc: "Lowest price first", price_desc: "Highest price first" };
const BUTTON_LABELS: Record<(typeof BUTTON_STYLES)[number], string> = { filled: "Filled", outlined: "Outlined", text: "Text only" };
const SIZE_LABELS: Record<(typeof SPACER_SIZES)[number], string> = { small: "Small", medium: "Medium", large: "Large" };
const CATEGORY_STYLE_LABELS: Record<(typeof CATEGORY_STYLES)[number], string> = { chips: "Chips", tiles: "Tiles" };

const opts = <T extends string>(list: readonly T[], labels: Record<T, string>) => list.map((value) => ({ value, label: labels[value] }));

function QueryEditor({ id, block, ctx, onChange }: { id: string; block: LayoutBlock; ctx: BlockContext; onChange: (query: ItemsQuery) => void }) {
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
            label="Category"
            value={query.category_id ?? ""}
            options={[{ value: "", label: "Any category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => set({ category_id: v || null })}
          />
        ) : (
          <TextInput id={`${id}-category`} label="Category ID" value={query.category_id ?? ""} hint="Empty for any category." onChange={(v) => set({ category_id: v.trim() || null })} />
        )}
        {/* 31 Only the orders this kind of entry has: no prices for articles; events are always soonest first. */}
        {SOURCE_SORTS[source].length > 1 ? (
          <SelectInput id={`${id}-sort`} label="Order" value={sortFor(source, query.sort)} options={opts(SOURCE_SORTS[source], SORT_LABELS)} onChange={(sort) => set({ sort })} />
        ) : null}
        <TextInput
          id={`${id}-limit`}
          label="How many"
          type="number"
          inputMode="numeric"
          value={String(query.limit)}
          onChange={(v) => set({ limit: Math.min(Math.max(Number.parseInt(v, 10) || 1, 1), LAYOUT_LIMITS.maxItems) })}
        />
      </div>
      {source === "products" ? <Check label="Featured products only" checked={query.featured} onChange={(featured) => set({ featured })} /> : null}
      {entries?.length ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Hand-picked {SOURCE_NAMES[source].toLowerCase()}</legend>
          <span className="text-xs text-muted">Pick entries to show exactly these, in the order you pick them. With none picked, the list follows the settings above.</span>
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
          label="Hand-picked IDs"
          value={query.ids.join(", ")}
          hint={`Optional: IDs separated by commas, shown in this order.${picked ? " The settings above don't apply." : ""}`}
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
  /** "Slide": "Slide 2", "Add a slide". */
  name: string;
  items: T[];
  min?: number;
  max: number;
  make: () => T;
  onChange: (items: T[]) => void;
  children: (item: T, set: (next: T) => void, index: number) => ReactNode;
}) {
  const lower = name.toLowerCase();
  return (
    <div className="flex flex-col gap-2.5">
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item, i) => (
          <li key={i}>
            <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-line p-3" id={`${id}-${i}`}>
              <legend className="px-1 text-sm font-bold">
                {name} {i + 1}
              </legend>
              {children(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))), i)}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={entryBtn} aria-label={`Move ${lower} ${i + 1} up`} disabled={i === 0} onClick={() => onChange(moveItem(items, i, i - 1))}>
                  <IconGlyph name="arrow_upward" size={18} /> Up
                </button>
                <button type="button" className={entryBtn} aria-label={`Move ${lower} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, i + 1))}>
                  <IconGlyph name="arrow_downward" size={18} /> Down
                </button>
                <button type="button" className={entryBtn} aria-label={`Remove ${lower} ${i + 1}`} disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <IconGlyph name="delete" size={18} /> Remove
                </button>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div>
        <button type="button" className={entryBtn} disabled={items.length >= max} onClick={() => onChange([...items, make()])}>
          <IconGlyph name="add" size={18} /> Add {/^[aeiou]/.test(lower) ? "an" : "a"} {lower}
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

const TONE_OPTIONS = NOTICE_TONES.map((value) => ({ value, label: NOTICE_TONE_LABELS[value] }));
const DAY_OPTIONS = WEEKDAYS.map((value) => ({ value, label: WEEKDAY_LABELS[value] }));
const SOCIAL_OPTIONS = SOCIAL_NETWORKS.map((value) => ({ value, label: SOCIAL_LABELS[value] }));
const RATING_OPTIONS = [{ value: "", label: "No stars" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }))];
const QUICK_STYLE_LABELS: Record<(typeof QUICK_LINK_STYLES)[number], string> = { grid: "Tiles in rows", row: "One row to swipe" };

function MoreBlockSettings({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const id = `blk-${block.id}`;
  const set = (patch: Partial<LayoutBlock>) => onChange({ ...block, ...patch });
  const { lang } = ctx;
  const actionProps = { pages: ctx.pages, sources: ctx.sources, screens: ctx.screens, courses: ctx.pickable.items.courses };
  switch (block.type) {
    case "slider":
      return (
        <>
          <Check label="Move to the next slide on its own" checked={block.auto_advance !== false} onChange={(auto_advance) => set({ auto_advance })} />
          <Entries id={`${id}-slides`} name="Slide" items={block.slides ?? []} max={LAYOUT_LIMITS.maxSlides} make={emptySlide} onChange={(slides) => set({ slides })}>
            {(s, setSlide, i) => (
              <>
                <TextInput
                  id={`${id}-s${i}-image`}
                  label="Image address"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  hint="Optional. Without one, the slide shows your app's colors."
                  value={s.image_url ?? ""}
                  onChange={(v) => setSlide({ ...s, image_url: v || null })}
                />
                <LangText id={`${id}-s${i}-heading`} label="Heading" value={s} field="heading" lang={lang} onChange={setSlide} />
                <LangText id={`${id}-s${i}-subheading`} label="Text under the heading" value={s} field="subheading" lang={lang} onChange={setSlide} />
                <ActionEditor id={`${id}-s${i}-action`} label="On tap" action={s.action} optional onChange={(action) => setSlide({ ...s, action })} {...actionProps} />
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
            label="Look"
            value={(block.style ?? "grid") as (typeof QUICK_LINK_STYLES)[number]}
            options={opts(QUICK_LINK_STYLES, QUICK_STYLE_LABELS)}
            onChange={(style) => set({ style })}
          />
          <Entries
            id={`${id}-links`}
            name="Link"
            items={block.links ?? []}
            max={LAYOUT_LIMITS.maxLinks}
            make={(): QuickLink => ({ icon: "star", label: "", action: { type: "screen", screen: firstScreen(ctx.screens) } })}
            onChange={(links) => set({ links })}
          >
            {(l, setLink, i) => (
              <>
                <LangText id={`${id}-l${i}-label`} label="Label" value={l} field="label" lang={lang} onChange={setLink} />
                <IconPicker id={`${id}-l${i}-icon`} label="Icon" value={l.icon} onChange={(icon) => setLink({ ...l, icon: icon ?? l.icon })} />
                <ActionEditor id={`${id}-l${i}-action`} label="Opens" action={l.action} optional={false} onChange={(action) => action && setLink({ ...l, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "testimonials":
      return (
        <Entries id={`${id}-quotes`} name="Quote" items={block.quotes ?? []} max={LAYOUT_LIMITS.maxQuotes} make={emptyQuote} onChange={(quotes) => set({ quotes })}>
          {(q, setQuote, i) => (
            <>
              <LangText id={`${id}-q${i}-text`} label="What they said" value={q} field="text" lang={lang} rows={3} onChange={setQuote} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LangText id={`${id}-q${i}-name`} label="Name" value={q} field="name" lang={lang} onChange={setQuote} />
                <LangText id={`${id}-q${i}-role`} label="Role" value={q} field="role" lang={lang} onChange={setQuote} hint="Optional, like Student." />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  id={`${id}-q${i}-photo`}
                  label="Photo address"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  hint="Optional."
                  value={q.photo_url ?? ""}
                  onChange={(v) => setQuote({ ...q, photo_url: v || null })}
                />
                <SelectInput id={`${id}-q${i}-rating`} label="Stars" value={q.rating ? String(q.rating) : ""} options={RATING_OPTIONS} onChange={(v) => setQuote({ ...q, rating: v ? Number(v) : null })} />
              </div>
            </>
          )}
        </Entries>
      );
    case "faq":
      return (
        <Entries
          id={`${id}-questions`}
          name="Question"
          items={block.questions ?? []}
          max={LAYOUT_LIMITS.maxQuestions}
          make={() => ({ question: "", answer: "" })}
          onChange={(questions) => set({ questions })}
        >
          {(q, setQuestion, i) => (
            <>
              <LangText id={`${id}-f${i}-question`} label="Question" value={q} field="question" lang={lang} onChange={setQuestion} />
              <LangText id={`${id}-f${i}-answer`} label="Answer" value={q} field="answer" lang={lang} rows={3} onChange={setQuestion} />
            </>
          )}
        </Entries>
      );
    case "countdown":
      return (
        <>
          <LangText id={`${id}-heading`} label="Heading" value={block} field="heading" lang={lang} onChange={onChange} hint="Like: The sale ends in" />
          <LangText id={`${id}-subheading`} label="Text under the heading" value={block} field="subheading" lang={lang} onChange={onChange} hint="Optional." />
          <TextInput
            id={`${id}-ends`}
            label="Ends at"
            type="datetime-local"
            value={toLocalInput(block.ends_at)}
            hint="In your computer's time zone. The app counts down on each phone."
            onChange={(v) => set({ ends_at: fromLocalInput(v) })}
          />
          <LangText id={`${id}-ended`} label="Text after the end" value={block} field="ended_text" lang={lang} onChange={onChange} hint="Empty hides the block when the time is up." />
          <LangText id={`${id}-label`} label="Button text" value={block} field="label" lang={lang} onChange={onChange} hint="Optional, with what it opens below." />
          <ActionEditor id={`${id}-action`} label="The button opens" action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      );
    case "contact":
      return (
        <>
          <p className="m-0 text-sm text-muted">Fill in the ways people can reach you. Each one shows as a button; empty ones are left out.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput id={`${id}-phone`} label="Phone number" inputMode="numeric" placeholder="+20 100 123 4567" value={block.phone ?? ""} onChange={(v) => set({ phone: v || null })} />
            <TextInput id={`${id}-whatsapp`} label="WhatsApp number" inputMode="numeric" placeholder="+20 100 123 4567" value={block.whatsapp ?? ""} onChange={(v) => set({ whatsapp: v || null })} />
            <TextInput id={`${id}-email`} label="Email address" type="email" value={block.email ?? ""} onChange={(v) => set({ email: v || null })} />
            <TextInput id={`${id}-website`} label="Website" type="url" inputMode="url" placeholder="https://" value={block.website ?? ""} onChange={(v) => set({ website: v || null })} />
          </div>
          <LangText id={`${id}-address`} label="Address" value={block} field="address" lang={lang} onChange={onChange} hint="Directions open it in the phone's maps." />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              id={`${id}-lat`}
              label="Latitude"
              inputMode="decimal"
              placeholder="30.0444"
              hint="Optional, for exact directions."
              value={block.latitude === null || block.latitude === undefined ? "" : String(block.latitude)}
              onChange={(v) => set({ latitude: v.trim() === "" ? null : Number(v.replace(",", ".")) })}
            />
            <TextInput
              id={`${id}-lng`}
              label="Longitude"
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
            name="Opening time"
            min={0}
            items={block.hours ?? []}
            max={LAYOUT_LIMITS.maxHours}
            make={(): HoursPeriod => ({ day: "mon", opens: "09:00", closes: "17:00" })}
            onChange={(hours) => set({ hours })}
          >
            {(h, setHours, i) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectInput id={`${id}-h${i}-day`} label="Day" value={h.day} options={DAY_OPTIONS} onChange={(day) => setHours({ ...h, day })} />
                <TextInput id={`${id}-h${i}-opens`} label="Opens" type="time" value={h.opens} onChange={(opens) => setHours({ ...h, opens })} />
                <TextInput id={`${id}-h${i}-closes`} label="Closes" type="time" value={h.closes} onChange={(closes) => setHours({ ...h, closes })} />
              </div>
            )}
          </Entries>
          <p className="m-0 text-xs text-muted">Days without a time show as closed. Add a day twice for a break, and a closing time earlier than the opening time for after midnight.</p>
          <TextInput
            id={`${id}-closed`}
            label="Closed on"
            placeholder="2026-12-31, 2027-01-01"
            hint="Optional: holidays, as dates separated by commas."
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
          <LangText id={`${id}-note`} label="Note" value={block} field="note" lang={lang} onChange={onChange} hint="Optional, like: Closed on public holidays." />
        </>
      );
    case "social":
      return (
        <Entries
          id={`${id}-profiles`}
          name="Profile"
          items={block.profiles ?? []}
          max={SOCIAL_NETWORKS.length}
          make={() => ({ network: SOCIAL_NETWORKS.find((n) => !(block.profiles ?? []).some((p) => p.network === n)) ?? "instagram", url: "" })}
          onChange={(profiles) => set({ profiles })}
        >
          {(p, setProfile, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectInput id={`${id}-p${i}-network`} label="Network" value={p.network} options={SOCIAL_OPTIONS} onChange={(network) => setProfile({ ...p, network })} />
              <TextInput id={`${id}-p${i}-url`} label="Profile address" type="url" inputMode="url" placeholder="https://" value={p.url} onChange={(url) => setProfile({ ...p, url })} />
            </div>
          )}
        </Entries>
      );
    case "team":
      return (
        <>
          <SelectInput id={`${id}-layout`} label="Look" value={block.layout ?? "carousel"} options={opts(ITEMS_LAYOUTS, LAYOUT_LABELS)} onChange={(layout) => set({ layout })} />
          <Entries id={`${id}-people`} name="Person" items={block.people ?? []} max={LAYOUT_LIMITS.maxPeople} make={emptyPerson} onChange={(people) => set({ people })}>
            {(p, setPerson, i) => (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LangText id={`${id}-m${i}-name`} label="Name" value={p} field="name" lang={lang} onChange={setPerson} />
                  <LangText id={`${id}-m${i}-role`} label="Role" value={p} field="role" lang={lang} onChange={setPerson} hint="Optional, like Head coach." />
                </div>
                <LangText id={`${id}-m${i}-bio`} label="A few words" value={p} field="bio" lang={lang} rows={2} onChange={setPerson} hint="Optional." />
                <TextInput
                  id={`${id}-m${i}-photo`}
                  label="Photo address"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  hint="Optional. Without one, their initials show."
                  value={p.photo_url ?? ""}
                  onChange={(v) => setPerson({ ...p, photo_url: v || null })}
                />
                <ActionEditor id={`${id}-m${i}-action`} label="On tap" action={p.action} optional onChange={(action) => setPerson({ ...p, action })} {...actionProps} />
              </>
            )}
          </Entries>
        </>
      );
    case "stats":
      return (
        <Entries
          id={`${id}-stats`}
          name="Number"
          min={LAYOUT_LIMITS.minStats}
          items={block.stats ?? []}
          max={LAYOUT_LIMITS.maxStats}
          make={emptyStat}
          onChange={(stats) => set({ stats })}
        >
          {(s, setStat, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <LangText id={`${id}-n${i}-value`} label="Number" value={s} field="value" lang={lang} onChange={setStat} hint="Short, like 12k+ or 24/7." />
              <LangText id={`${id}-n${i}-label`} label="Label" value={s} field="label" lang={lang} onChange={setStat} />
            </div>
          )}
        </Entries>
      );
    case "notice":
      return (
        <>
          <SelectInput id={`${id}-tone`} label="Color" value={block.tone ?? "info"} options={TONE_OPTIONS} onChange={(tone) => set({ tone })} />
          <LangText id={`${id}-text`} label="Text" value={block} field="text" lang={lang} rows={2} onChange={onChange} />
          <LangText id={`${id}-label`} label="Link text" value={block} field="label" lang={lang} onChange={onChange} hint="Optional, with what it opens below." />
          <ActionEditor id={`${id}-action`} label="The link opens" action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      );
    default:
      return null;
  }
}

/** The settings of one block, in the language being edited. */
export function BlockSettings({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const id = `blk-${block.id}`;
  const set = (patch: Partial<LayoutBlock>) => onChange({ ...block, ...patch });
  const { lang } = ctx;
  const actionProps = { pages: ctx.pages, sources: ctx.sources, screens: ctx.screens, courses: ctx.pickable.items.courses };
  const sourceOptions = (list: ItemSource[]) => list.map((s) => ({ value: s, label: SOURCE_NAMES[s] }));
  return (
    <div className="flex flex-col gap-3">
      {block.type !== "spacer" ? <LangText id={`${id}-title`} label="Title above the block" value={block} field="title" lang={lang} onChange={onChange} hint="Optional." /> : null}
      {block.type === "banner" ? (
        <>
          <TextInput id={`${id}-image`} label="Image address" type="url" inputMode="url" placeholder="https://" value={block.image_url ?? ""} onChange={(image_url) => set({ image_url })} />
          <LangText id={`${id}-heading`} label="Heading" value={block} field="heading" lang={lang} onChange={onChange} />
          <LangText id={`${id}-subheading`} label="Text under the heading" value={block} field="subheading" lang={lang} onChange={onChange} />
          <ActionEditor id={`${id}-action`} label="On tap" action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "text" ? (
        <LangText
          id={`${id}-html`}
          label="Text"
          value={block}
          field="html"
          lang={lang}
          rows={6}
          onChange={onChange}
          hint="Write plain text, or use <p>, <h2>, <h3>, <b>, <i>, <a href>, <ul> and <li>. Anything else is removed."
        />
      ) : null}
      {block.type === "image" ? (
        <>
          <TextInput id={`${id}-image`} label="Image address" type="url" inputMode="url" placeholder="https://" value={block.image_url ?? ""} onChange={(image_url) => set({ image_url })} />
          <TextInput
            id={`${id}-ratio`}
            label="Shape (width divided by height)"
            inputMode="decimal"
            placeholder="1.78"
            hint="Optional, like 1.78 for a wide image or 1 for a square."
            value={block.aspect_ratio === null || block.aspect_ratio === undefined ? "" : String(block.aspect_ratio)}
            onChange={(v) => set({ aspect_ratio: v.trim() === "" ? null : Number(v.replace(",", ".")) })}
          />
          <ActionEditor id={`${id}-action`} label="On tap" action={block.action} optional onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "video" ? (
        <>
          <TextInput id={`${id}-url`} label="Video address" type="url" inputMode="url" placeholder="https://" hint="An MP4 link, or a YouTube or Vimeo page." value={block.url ?? ""} onChange={(url) => set({ url })} />
          <TextInput id={`${id}-poster`} label="Cover image address" type="url" inputMode="url" placeholder="https://" hint="Optional." value={block.poster_url ?? ""} onChange={(v) => set({ poster_url: v || null })} />
        </>
      ) : null}
      {block.type === "button" ? (
        <>
          <LangText id={`${id}-label`} label="Button text" value={block} field="label" lang={lang} onChange={onChange} />
          <SelectInput id={`${id}-style`} label="Style" value={(block.style ?? "filled") as (typeof BUTTON_STYLES)[number]} options={opts(BUTTON_STYLES, BUTTON_LABELS)} onChange={(style) => set({ style })} />
          <IconPicker id={`${id}-icon`} label="Icon" value={block.icon ?? null} optional onChange={(icon) => set({ icon })} />
          <ActionEditor id={`${id}-action`} label="On tap" action={block.action} optional={false} onChange={(action) => set({ action })} {...actionProps} />
        </>
      ) : null}
      {block.type === "items" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              id={`${id}-source`}
              label="Shows"
              value={block.source ?? ctx.sources[0] ?? "courses"}
              options={sourceOptions(ctx.sources)}
              onChange={(source) => {
                const query = block.query ?? { category_id: null, featured: false, sort: "newest" as const, limit: 10, ids: [] };
                set({ source, query: { ...query, sort: sortFor(source, query.sort), category_id: null, ids: [] } });
              }}
            />
            <SelectInput id={`${id}-layout`} label="Look" value={block.layout ?? "carousel"} options={opts(ITEMS_LAYOUTS, LAYOUT_LABELS)} onChange={(layout) => set({ layout })} />
          </div>
          <QueryEditor id={id} block={block} ctx={ctx} onChange={(query) => set({ query })} />
          <ActionEditor id={`${id}-see-all`} label='"See all" opens' action={block.see_all} optional onChange={(see_all) => set({ see_all })} {...actionProps} />
        </>
      ) : null}
      {block.type === "categories" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput id={`${id}-source`} label="Categories of" value={block.source ?? ctx.categorySources[0] ?? "courses"} options={sourceOptions(ctx.categorySources)} onChange={(source) => set({ source })} />
          <SelectInput id={`${id}-style`} label="Style" value={(block.style ?? "chips") as (typeof CATEGORY_STYLES)[number]} options={opts(CATEGORY_STYLES, CATEGORY_STYLE_LABELS)} onChange={(style) => set({ style })} />
        </div>
      ) : null}
      {block.type === "search" ? (
        <>
          <SelectInput id={`${id}-source`} label="Searches" value={block.source ?? ctx.sources[0] ?? "courses"} options={sourceOptions(ctx.sources)} onChange={(source) => set({ source })} />
          <LangText id={`${id}-placeholder`} label="Text in the search box" value={block} field="placeholder" lang={lang} onChange={onChange} />
        </>
      ) : null}
      {block.type === "continue_learning" ? <p className="m-0 text-sm text-muted">Shows the course a signed-in student is taking, with their progress. Hidden for everyone else.</p> : null}
      {block.type === "embed" ? (
        <>
          <TextInput id={`${id}-url`} label="Web page address" type="url" inputMode="url" placeholder="https://" value={block.url ?? ""} onChange={(url) => set({ url })} />
          <TextInput
            id={`${id}-height`}
            label="Height"
            inputMode="numeric"
            hint="Optional, 50 to 2000, used when the page's own height can't be measured."
            value={block.height ? String(block.height) : ""}
            onChange={(v) => set({ height: v.trim() === "" ? null : Number.parseInt(v, 10) || null })}
          />
        </>
      ) : null}
      {block.type === "spacer" ? <SelectInput id={`${id}-size`} label="Size" value={block.size ?? "medium"} options={opts(SPACER_SIZES, SIZE_LABELS)} onChange={(size) => set({ size })} /> : null}
      <MoreBlockSettings block={block} ctx={ctx} onChange={onChange} />
      <SelectInput id={`${id}-visibility`} label="Who sees it" value={block.visibility} options={opts(VISIBILITIES, VISIBILITY_LABELS)} onChange={(visibility) => set({ visibility })} />
    </div>
  );
}
