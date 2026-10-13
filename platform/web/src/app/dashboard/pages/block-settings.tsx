"use client";

import type { Pickable } from "@/lib/hosted/pages/pickable";
import { SOURCE_NAMES } from "@/lib/pages/sources";
import {
  BUTTON_STYLES,
  CATEGORY_STYLES,
  ITEMS_LAYOUTS,
  ITEMS_SORTS,
  LAYOUT_LIMITS,
  SPACER_SIZES,
  VISIBILITIES,
  type ItemSource,
  type ItemsQuery,
  type LayoutBlock,
} from "@/lib/pages/types";
import { ActionEditor, Check, IconPicker, LangText, SelectInput, TextInput, type Lang } from "./controls";

export interface BlockContext {
  lang: Lang;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  categorySources: ItemSource[];
  pickable: Pickable;
}

const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], string> = {
  everyone: "Everyone",
  signed_in: "Only signed-in people",
  signed_out: "Only people who aren't signed in",
};
const LAYOUT_LABELS: Record<(typeof ITEMS_LAYOUTS)[number], string> = { carousel: "Side-scrolling row", grid: "Grid", list: "List" };
const SORT_LABELS: Record<(typeof ITEMS_SORTS)[number], string> = { newest: "Newest first", popular: "Most popular first", price_asc: "Lowest price first", price_desc: "Highest price first" };
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
        <SelectInput id={`${id}-sort`} label="Order" value={query.sort} options={opts(ITEMS_SORTS, SORT_LABELS)} onChange={(sort) => set({ sort })} />
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

/** The settings of one block, in the language being edited. */
export function BlockSettings({ block, ctx, onChange }: { block: LayoutBlock; ctx: BlockContext; onChange: (block: LayoutBlock) => void }) {
  const id = `blk-${block.id}`;
  const set = (patch: Partial<LayoutBlock>) => onChange({ ...block, ...patch });
  const { lang } = ctx;
  const actionProps = { pages: ctx.pages, sources: ctx.sources, courses: ctx.pickable.items.courses };
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
              onChange={(source) => set({ source, query: { ...(block.query ?? { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] }), category_id: null, ids: [] } })}
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
      <SelectInput id={`${id}-visibility`} label="Who sees it" value={block.visibility} options={opts(VISIBILITIES, VISIBILITY_LABELS)} onChange={(visibility) => set({ visibility })} />
    </div>
  );
}
