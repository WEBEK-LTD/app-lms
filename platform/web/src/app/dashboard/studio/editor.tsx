"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { publishLayoutAction, saveLayoutDraftAction } from "@/app/actions/pages";
import { Badge, btn } from "@/components/ui";
import { MediaPicker } from "@/components/media-picker";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { ScreenOption } from "@/lib/pages/sources";
import { SOURCE_NAMES } from "@/lib/pages/sources";
import {
  ITEMS_LAYOUTS,
  LAYOUT_LIMITS,
  STUDIO_ALIGNS,
  STUDIO_FONT_WEIGHTS,
  STUDIO_LIMITS,
  type Action,
  type ItemSource,
  type LayoutContent,
  type LayoutPage,
  type StudioCanvas,
  type StudioLayer,
  type StudioLayerType,
} from "@/lib/pages/types";
import { STUDIO_LAYER_TYPES } from "@/lib/pages/types";
import { clampHeight, clampLayer, layerName, newLayer, newLayerId, reorder, snap, STUDIO_TEMPLATES, studioPage, templateCanvas, type StudioTemplate } from "@/lib/studio/canvas";
import { ActionEditor, Check, IconGlyph, IconPicker, SelectInput, TextInput } from "../pages/controls";

const KIND: Record<StudioLayerType, DashKey> = {
  box: "studio.kindBox",
  text: "studio.kindText",
  image: "studio.kindImage",
  button: "studio.kindButton",
  icon: "studio.kindIcon",
  items: "studio.kindItems",
};
const KIND_ICON: Record<StudioLayerType, string> = { box: "category", text: "title", image: "image", button: "touch_app", icon: "star", items: "view_carousel" };
const TEMPLATE_TEXT: Record<StudioTemplate, [DashKey, DashKey]> = {
  blank: ["studio.tplBlankName", "studio.tplBlankText"],
  welcome: ["studio.tplWelcomeName", "studio.tplWelcomeText2"],
  offer: ["studio.tplOfferName", "studio.tplOfferText2"],
  delivery: ["studio.tplDeliveryName", "studio.tplDeliveryText2"],
};
const WEIGHT_TEXT: Record<(typeof STUDIO_FONT_WEIGHTS)[number], DashKey> = {
  400: "studio.weight400",
  500: "studio.weight500",
  600: "studio.weight600",
  700: "studio.weight700",
  800: "studio.weight800",
};
const LAYOUT_TEXT: Record<(typeof ITEMS_LAYOUTS)[number], DashKey> = { carousel: "studio.layoutCarousel", grid: "studio.layoutGrid", list: "studio.layoutList" };
const ALIGN_TEXT: Record<(typeof STUDIO_ALIGNS)[number], DashKey> = { start: "studio.alignStart", center: "studio.alignCenter", end: "studio.alignEnd" };

const section = "flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:p-5";
const small = `${btn.secondary} h-9 px-3 text-sm`;

type Status = "saved" | "unsaved" | "saving";

/**
 * 103 Yallapp Studio: the draft's pages, a page's canvas with its layers
 * placed by dragging, and a panel for the selected layer. Saved in the same
 * draft as Pages & look and published like it.
 */
export function StudioEditor({
  initial,
  app,
  sources,
  screens,
  pickable,
  studioOnPlan,
}: {
  initial: LayoutContent;
  app: { name: string; primaryColor: string };
  sources: ItemSource[];
  screens: ScreenOption[];
  pickable: Pickable;
  studioOnPlan: boolean;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [layout, setLayout] = useState<LayoutContent>(initial);
  const [slug, setSlug] = useState<string>(() => initial.pages.find((p) => p.canvas)?.slug ?? initial.pages[0]?.slug ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("saved");
  const [message, setMessage] = useState<{ ok: boolean; text: string[] } | null>(null);
  const [pending, start] = useTransition();
  const page = layout.pages.find((p) => p.slug === slug) ?? null;
  const canvas = page?.canvas ?? null;
  const layer = canvas?.layers.find((l) => l.id === selected) ?? null;
  const first: Action | null = screens[0] ? { type: "screen", screen: screens[0].value } : null;
  const words = {
    welcome: t("studio.tplWelcome"),
    welcomeText: t("studio.tplWelcomeText"),
    start: t("studio.tplStart"),
    popular: t("studio.tplPopular"),
    offer: t("studio.tplOffer"),
    offerText: t("studio.tplOfferText"),
    shop: t("studio.tplShop"),
    send: t("studio.tplSend"),
    sendText: t("studio.tplSendText"),
    track: t("studio.tplTrack"),
    trackText: t("studio.tplTrackText"),
  };

  const change = (next: LayoutContent) => {
    setLayout(next);
    setStatus("unsaved");
    setMessage(null);
  };
  const setPage = (fn: (p: LayoutPage) => LayoutPage) => change({ ...layout, pages: layout.pages.map((p) => (p.slug === slug ? fn(p) : p)) });
  const setCanvas = (fn: (c: StudioCanvas) => StudioCanvas) => setPage((p) => (p.canvas ? { ...p, canvas: fn(p.canvas) } : p));
  const setLayer = (patch: Partial<StudioLayer>) => {
    if (!layer) return;
    setCanvas((c) => ({ ...c, layers: c.layers.map((l) => (l.id === layer.id ? clampLayer({ ...l, ...patch }, c) : l)) }));
  };

  const save = (publish: boolean) => {
    setStatus("saving");
    start(async () => {
      const json = JSON.stringify(layout);
      const result = publish ? await publishLayoutAction(json) : await saveLayoutDraftAction(json);
      if (!result.ok) {
        setStatus("unsaved");
        setMessage({ ok: false, text: result.errors.map(known) });
        return;
      }
      setLayout(result.draft);
      setStatus("saved");
      setMessage({ ok: true, text: [result.message ? known(result.message) : t("studio.saved")] });
    });
  };

  // A new Studio page from a template.
  const [newName, setNewName] = useState("");
  const [template, setTemplate] = useState<StudioTemplate>("welcome");
  const createPage = () => {
    if (layout.pages.length >= LAYOUT_LIMITS.maxPages) return;
    const made = studioPage(
      newName.trim() || t(TEMPLATE_TEXT[template][0]),
      layout.pages.map((p) => p.slug),
      templateCanvas(template, { primary: app.primaryColor, sources, first, words }),
      new Date(),
    );
    change({ ...layout, pages: [...layout.pages, made] });
    setSlug(made.slug);
    setSelected(null);
    setNewName("");
  };

  return (
    <div className="flex flex-col gap-5">
      {studioOnPlan ? null : (
        <p className="m-0 rounded-xl bg-sand p-3 text-sm" data-studio-plan="off">
          {richText(t("studio.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
        <span className="text-sm font-semibold" role="status" data-studio-status={status}>
          {status === "saving" ? t("studio.saving") : status === "unsaved" ? t("studio.unsaved") : t("studio.saved")}
        </span>
        <span className="flex-1" />
        <button type="button" className={small} disabled={pending || status === "saved"} onClick={() => save(false)}>
          {t("studio.save")}
        </button>
        <button type="button" className={`${btn.primary} h-9 px-4 text-sm`} disabled={pending} onClick={() => save(true)}>
          {pending ? t("studio.publishing") : t("studio.publish")}
        </button>
      </div>
      {message ? (
        <div role={message.ok ? "status" : "alert"} className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${message.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
          {message.text.map((line) => (
            <p key={line} className="m-0">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* The canvas. */}
        <div className="flex min-w-0 flex-col gap-3">
          {page && !canvas ? (
            <section className={section}>
              <p className="m-0 text-[15px]">{richText(t("studio.editInPages"), { link: (chunk) => <Link href="/dashboard/pages">{chunk}</Link> })}</p>
              <div>
                <button
                  type="button"
                  className={small}
                  onClick={() => {
                    if (page.blocks.length && !window.confirm(t("studio.makeStudioConfirm"))) return;
                    setPage((p) => ({ ...p, blocks: [], canvas: templateCanvas("blank", { primary: app.primaryColor, sources, first, words }) }));
                  }}
                >
                  {t("studio.makeStudio")}
                </button>
              </div>
            </section>
          ) : null}
          {page && canvas ? (
            <>
              <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("studio.add")}>
                <span className="text-sm font-semibold">{t("studio.add")}:</span>
                {STUDIO_LAYER_TYPES.filter((type) => type !== "items" || sources.length > 0).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={small}
                    onClick={() => {
                      const scroller = document.getElementById("studio-canvas-scroll");
                      const added = newLayer(type, canvas, { top: scroller?.scrollTop ?? 0, primary: app.primaryColor, sources, words: { text: t("studio.newText"), button: t("studio.newButton") } });
                      setCanvas((c) => ({ ...c, layers: [...c.layers, added] }));
                      setSelected(added.id);
                    }}
                  >
                    <IconGlyph name={KIND_ICON[type]} size={18} />
                    {t(KIND[type])}
                  </button>
                ))}
              </div>
              <CanvasView
                canvas={canvas}
                pageTitle={page.title}
                selected={selected}
                onSelect={setSelected}
                onMove={(id, patch) => setCanvas((c) => ({ ...c, layers: c.layers.map((l) => (l.id === id ? clampLayer({ ...l, ...patch }, c) : l)) }))}
                onDelete={(id) => {
                  setCanvas((c) => ({ ...c, layers: c.layers.filter((l) => l.id !== id) }));
                  setSelected(null);
                }}
                pickable={pickable}
              />
              <p className="m-0 text-xs text-muted">{t("studio.help")}</p>
              <p className="m-0 text-xs text-muted">{t("studio.rtl")}</p>
            </>
          ) : null}
        </div>

        {/* The pages, the selected layer, the layers, the canvas and a new Studio page. */}
        <div className="flex flex-col gap-5">
          <section className={section} aria-labelledby="h-studio-pages">
            <h2 id="h-studio-pages" className="m-0 text-base font-bold">
              {t("studio.pages")}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {layout.pages.map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    aria-pressed={p.slug === slug}
                    onClick={() => {
                      setSlug(p.slug);
                      setSelected(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-sm aria-pressed:bg-sand aria-pressed:font-semibold"
                  >
                    <span className="truncate">{p.title}</span>
                    <Badge tone={p.canvas ? "info" : "neutral"}>{p.canvas ? t("studio.studioBadge") : t("studio.blocksBadge")}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {page && canvas ? (
            <>
            <section className={section} aria-labelledby="h-studio-layer">
              <h2 id="h-studio-layer" className="m-0 text-base font-bold">
                {layer ? layerName(layer, kindNames(t)) : t("studio.layers")}
              </h2>
              {layer ? (
                <LayerPanel layer={layer} canvas={canvas} onChange={setLayer} pages={layout.pages.map((p) => ({ slug: p.slug, title: p.title }))} sources={sources} screens={screens} pickable={pickable} />
              ) : (
                <p className="m-0 text-sm text-muted">{t("studio.selectHint")}</p>
              )}
            </section>
            <section className={section} aria-labelledby="h-studio-layers">
              <h2 id="h-studio-layers" className="m-0 text-base font-bold">
                {t("studio.layers")}
              </h2>
              {canvas.layers.length === 0 ? <p className="m-0 text-sm text-muted">{t("studio.emptyCanvas")}</p> : null}
              <ol className="m-0 flex list-none flex-col gap-1 p-0">
                {[...canvas.layers].reverse().map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-pressed={l.id === selected}
                      onClick={() => setSelected(l.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm aria-pressed:bg-sand aria-pressed:font-semibold"
                    >
                      <IconGlyph name={KIND_ICON[l.type]} size={18} />
                      <span className="truncate">{layerName(l, kindNames(t))}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {layer ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={small} onClick={() => setCanvas((c) => ({ ...c, layers: reorder(c.layers, layer.id, 1) }))}>
                    {t("studio.front")}
                  </button>
                  <button type="button" className={small} onClick={() => setCanvas((c) => ({ ...c, layers: reorder(c.layers, layer.id, -1) }))}>
                    {t("studio.back")}
                  </button>
                  <button
                    type="button"
                    className={small}
                    disabled={canvas.layers.length >= STUDIO_LIMITS.maxLayers}
                    onClick={() => {
                      const copy = clampLayer({ ...layer, id: newLayerId(), x: layer.x + 16, y: layer.y + 16 }, canvas);
                      setCanvas((c) => ({ ...c, layers: [...c.layers, copy] }));
                      setSelected(copy.id);
                    }}
                  >
                    {t("studio.duplicate")}
                  </button>
                  <button
                    type="button"
                    className={small}
                    onClick={() => {
                      setCanvas((c) => ({ ...c, layers: c.layers.filter((l) => l.id !== layer.id) }));
                      setSelected(null);
                    }}
                  >
                    {t("studio.delete")}
                  </button>
                </div>
              ) : null}
            </section>
            <section className={section} aria-labelledby="h-studio-canvas">
              <h2 id="h-studio-canvas" className="m-0 text-base font-bold">
                {t("studio.canvas")}
              </h2>
              <NumberField id="studio-height" label={t("studio.height")} value={canvas.height} onChange={(h) => setCanvas((c) => ({ ...c, height: Math.max(clampHeight(h), ...c.layers.map((l) => Math.ceil(l.y + l.h))) }))} />
              <ColorField id="studio-background" label={t("studio.background")} none={t("studio.appBackground")} value={canvas.background} onChange={(background) => setCanvas((c) => ({ ...c, background }))} />
              <button
                type="button"
                className={small}
                onClick={() => {
                  if (!window.confirm(t("studio.backToBlocksConfirm"))) return;
                  setPage((p) => {
                    const { canvas: _canvas, ...rest } = p;
                    void _canvas;
                    return rest;
                  });
                  setSelected(null);
                }}
              >
                {t("studio.backToBlocks")}
              </button>
            </section>
          
            </>
          ) : null}
          <section className={section} aria-labelledby="h-studio-new">
            <h2 id="h-studio-new" className="m-0 text-base font-bold">
              {t("studio.newPage")}
            </h2>
            <TextInput id="studio-new-name" label={t("studio.pageName")} value={newName} onChange={setNewName} max={60} />
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 p-0 text-sm font-semibold">{t("studio.startFrom")}</legend>
              {STUDIO_TEMPLATES.map((id) => (
                <label key={id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-2.5 text-sm has-[:checked]:border-midnight">
                  <input type="radio" name="studio-template" checked={template === id} onChange={() => setTemplate(id)} className="mt-0.5 h-4 w-4 accent-midnight" />
                  <span className="flex flex-col">
                    <span className="font-semibold">{t(TEMPLATE_TEXT[id][0])}</span>
                    <span className="text-xs text-muted">{t(TEMPLATE_TEXT[id][1])}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button type="button" className={small} onClick={createPage} disabled={layout.pages.length >= LAYOUT_LIMITS.maxPages}>
              {t("studio.create")}
            </button>
            <p className="m-0 text-xs text-muted">{t("studio.newPageHint")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

const kindNames = (t: ReturnType<typeof useDashT>) => Object.fromEntries(STUDIO_LAYER_TYPES.map((type) => [type, t(KIND[type])])) as Record<StudioLayerType, string>;

/** The canvas at its design size: layers dragged to move, their corner dragged to resize, the selected one moved with the arrow keys. */
function CanvasView({
  canvas,
  pageTitle,
  selected,
  onSelect,
  onMove,
  onDelete,
  pickable,
}: {
  canvas: StudioCanvas;
  pageTitle: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Partial<StudioLayer>) => void;
  onDelete: (id: string) => void;
  pickable: Pickable;
}) {
  const t = useDashT();
  const drag = useRef<{ id: string; mode: "move" | "resize"; x: number; y: number; start: StudioLayer } | null>(null);
  const begin = (event: PointerEvent, layer: StudioLayer, mode: "move" | "resize") => {
    event.stopPropagation();
    event.preventDefault();
    onSelect(layer.id);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { id: layer.id, mode, x: event.clientX, y: event.clientY, start: layer };
  };
  const moveTo = (event: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (d.mode === "move") onMove(d.id, { x: snap(d.start.x + dx), y: snap(d.start.y + dy) });
    else onMove(d.id, { w: snap(d.start.w + dx), h: snap(d.start.h + dy) });
  };
  const end = () => {
    drag.current = null;
  };
  const keys = (event: KeyboardEvent) => {
    const layer = canvas.layers.find((l) => l.id === selected);
    if (!layer) return;
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, Partial<StudioLayer>> = {
      ArrowLeft: { x: layer.x - step },
      ArrowRight: { x: layer.x + step },
      ArrowUp: { y: layer.y - step },
      ArrowDown: { y: layer.y + step },
    };
    if (moves[event.key]) {
      event.preventDefault();
      onMove(layer.id, moves[event.key]!);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onDelete(layer.id);
    } else if (event.key === "Escape") onSelect(null);
  };
  return (
    <div id="studio-canvas-scroll" className="max-h-[78vh] overflow-auto rounded-2xl border border-line bg-sand p-4">
      <div
        role="application"
        aria-label={t("studio.canvasLabel", { page: pageTitle })}
        tabIndex={0}
        onKeyDown={keys}
        onPointerDown={() => onSelect(null)}
        dir="ltr"
        data-studio-canvas=""
        className="relative mx-auto shadow-[0_2px_12px_rgba(14,13,36,.12)] outline-none focus-visible:ring-2 focus-visible:ring-midnight"
        style={{ width: canvas.width, height: canvas.height, background: canvas.background ?? "#ffffff" }}
      >
        {canvas.layers.map((layer) => {
          const isSelected = layer.id === selected;
          const name = layerName(layer, kindNames(t));
          return (
            <div
              key={layer.id}
              data-layer={layer.id}
              aria-label={t("studio.layerLabel", { name, kind: t(KIND[layer.type]) })}
              onPointerDown={(e) => begin(e, layer, "move")}
              onPointerMove={moveTo}
              onPointerUp={end}
              className={`absolute cursor-move touch-none select-none ${isSelected ? "outline-2 outline-offset-1 outline-midnight" : "hover:outline hover:outline-1 hover:outline-line-strong"}`}
              style={{ left: layer.x, top: layer.y, width: layer.w, height: layer.h }}
            >
              <LayerPreview layer={layer} pickable={pickable} />
              {isSelected ? (
                <span
                  role="button"
                  aria-label={t("studio.resize", { name })}
                  data-resize={layer.id}
                  onPointerDown={(e) => begin(e, layer, "resize")}
                  onPointerMove={moveTo}
                  onPointerUp={end}
                  className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-white bg-midnight"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A layer as the app draws it, near enough to design with. */
function LayerPreview({ layer, pickable }: { layer: StudioLayer; pickable: Pickable }) {
  const t = useDashT();
  const box: CSSProperties = {
    width: "100%",
    height: "100%",
    background: layer.fill ?? undefined,
    borderRadius: layer.radius ?? 0,
    border: layer.border_width && layer.border_color ? `${layer.border_width}px solid ${layer.border_color}` : undefined,
    boxShadow: layer.shadow ? "0 4px 12px rgba(0,0,0,.18)" : undefined,
    opacity: layer.opacity ?? 1,
    overflow: "hidden",
    color: layer.color ?? "#0e0d24",
    fontSize: layer.font_size ?? 16,
    fontWeight: layer.font_weight ?? 400,
    lineHeight: 1.25,
    textAlign: layer.align === "center" ? "center" : layer.align === "end" ? "right" : "left",
    whiteSpace: "pre-wrap",
  };
  switch (layer.type) {
    case "text":
      return <div style={box}>{layer.text}</div>;
    case "button":
      return <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", textAlign: "center" }}>{layer.text}</div>;
    case "image":
      return layer.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- the owner's own picture, any address
        <img src={layer.image_url} alt="" draggable={false} style={{ ...box, objectFit: layer.fit === "contain" ? "contain" : "cover", display: "block" }} />
      ) : (
        <div style={{ ...box, background: layer.fill ?? "#e4ded3", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconGlyph name="image" size={28} />
        </div>
      );
    case "icon":
      return (
        <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: Math.min(layer.w, layer.h), color: layer.color ?? "#0e0d24" }}>
            {layer.icon}
          </span>
        </div>
      );
    case "items": {
      const titles = (layer.source ? (pickable.items[layer.source] ?? []) : []).slice(0, layer.query?.limit ?? 8).map((i) => i.title);
      const cards = titles.length ? titles : [1, 2, 3, 4].map(() => (layer.source ? SOURCE_NAMES[layer.source] : t("studio.kindItems")));
      const grid = layer.layout === "grid";
      return (
        <div style={{ ...box, display: grid ? "grid" : "flex", gridTemplateColumns: grid ? "1fr 1fr" : undefined, flexDirection: layer.layout === "list" ? "column" : "row", gap: 12, padding: 12, fontSize: 13, fontWeight: 600, textAlign: "left" }}>
          {cards.map((title, i) => (
            <div key={i} style={{ flex: layer.layout === "carousel" ? "0 0 150px" : undefined, display: "flex", flexDirection: layer.layout === "list" ? "row" : "column", gap: 8 }}>
              <div style={{ background: "#e4ded3", borderRadius: 12, aspectRatio: layer.layout === "list" ? undefined : "4 / 3", width: layer.layout === "list" ? 64 : "100%", height: layer.layout === "list" ? 64 : undefined, flex: "none" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            </div>
          ))}
        </div>
      );
    }
    case "box":
      return <div style={box} />;
  }
}

/** The selected layer's frame, look, contents and tap. */
function LayerPanel({
  layer,
  canvas,
  onChange,
  pages,
  sources,
  screens,
  pickable,
}: {
  layer: StudioLayer;
  canvas: StudioCanvas;
  onChange: (patch: Partial<StudioLayer>) => void;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  screens: ScreenOption[];
  pickable: Pickable;
}) {
  const t = useDashT();
  const id = `studio-${layer.id}`;
  const textual = layer.type === "text" || layer.type === "button";
  return (
    <div className="flex flex-col gap-3" key={layer.id}>
      <fieldset className="m-0 grid grid-cols-2 gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-sm font-semibold">{t("studio.positionSize")}</legend>
        <NumberField id={`${id}-x`} label={t("studio.x")} value={layer.x} onChange={(x) => onChange({ x })} />
        <NumberField id={`${id}-y`} label={t("studio.y")} value={layer.y} onChange={(y) => onChange({ y })} />
        <NumberField id={`${id}-w`} label={t("studio.w")} value={layer.w} onChange={(w) => onChange({ w })} />
        <NumberField id={`${id}-h`} label={t("studio.h")} value={layer.h} onChange={(h) => onChange({ h: Math.min(h, canvas.height) })} />
      </fieldset>
      {textual ? (
        <>
          <TextInput id={`${id}-text`} label={t("studio.text")} value={layer.text ?? ""} onChange={(text) => onChange({ text })} rows={layer.type === "text" ? 3 : undefined} max={STUDIO_LIMITS.textChars} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField id={`${id}-size`} label={t("studio.fontSize")} value={layer.font_size ?? 16} onChange={(font_size) => onChange({ font_size: Math.min(Math.max(font_size, STUDIO_LIMITS.minFont), STUDIO_LIMITS.maxFont) })} />
            <SelectInput
              id={`${id}-weight`}
              label={t("studio.weight")}
              value={String(layer.font_weight ?? 400)}
              options={STUDIO_FONT_WEIGHTS.map((w) => ({ value: String(w), label: t(WEIGHT_TEXT[w]) }))}
              onChange={(w) => onChange({ font_weight: Number(w) as StudioLayer["font_weight"] })}
            />
          </div>
          <SelectInput id={`${id}-align`} label={t("studio.align")} value={layer.align ?? "start"} options={STUDIO_ALIGNS.map((a) => ({ value: a, label: t(ALIGN_TEXT[a]) }))} onChange={(align) => onChange({ align })} />
        </>
      ) : null}
      {textual || layer.type === "icon" ? <ColorField id={`${id}-color`} label={t("studio.color")} none={t("studio.appColor")} value={layer.color ?? null} onChange={(color) => onChange({ color })} /> : null}
      {layer.type === "image" ? (
        <>
          <TextInput id={`${id}-url`} label={t("studio.pictureUrl")} value={layer.image_url ?? ""} onChange={(image_url) => onChange({ image_url: image_url.trim() || null })} dir="ltr" inputMode="url" />
          <MediaPicker kind="image" library onPick={(image_url) => onChange({ image_url })} />
          <SelectInput id={`${id}-fit`} label={t("studio.fit")} value={layer.fit ?? "cover"} options={[{ value: "cover", label: t("studio.fitCover") }, { value: "contain", label: t("studio.fitContain") }]} onChange={(fit) => onChange({ fit })} />
        </>
      ) : null}
      {layer.type === "icon" ? <IconPicker id={`${id}-icon`} label={t("studio.icon")} value={layer.icon ?? null} onChange={(icon) => onChange({ icon })} /> : null}
      {layer.type === "items" ? (
        <>
          <SelectInput
            id={`${id}-source`}
            label={t("studio.source")}
            value={layer.source ?? sources[0]!}
            options={sources.map((s) => ({ value: s, label: SOURCE_NAMES[s] }))}
            onChange={(source) => onChange({ source, query: { ...(layer.query ?? { category_id: null, featured: false, ids: [], sort: "newest", limit: 8 }), ids: [] } })}
          />
          <SelectInput id={`${id}-layout`} label={t("studio.layout")} value={layer.layout ?? "carousel"} options={ITEMS_LAYOUTS.map((l) => ({ value: l, label: t(LAYOUT_TEXT[l]) }))} onChange={(layout) => onChange({ layout })} />
          <NumberField
            id={`${id}-count`}
            label={t("studio.count")}
            value={layer.query?.limit ?? 8}
            onChange={(limit) => onChange({ query: { ...(layer.query ?? { category_id: null, featured: false, ids: [], sort: "newest", limit: 8 }), limit: Math.min(Math.max(Math.round(limit), 1), LAYOUT_LIMITS.maxItems) } })}
          />
        </>
      ) : null}
      <ColorField id={`${id}-fill`} label={t("studio.fill")} none={t("studio.noFill")} value={layer.fill ?? null} onChange={(fill) => onChange({ fill })} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField id={`${id}-radius`} label={t("studio.radius")} value={layer.radius ?? 0} onChange={(radius) => onChange({ radius: Math.min(Math.max(radius, 0), STUDIO_LIMITS.maxRadius) })} />
        <NumberField id={`${id}-opacity`} label={t("studio.opacity")} value={Math.round((layer.opacity ?? 1) * 100)} onChange={(o) => onChange({ opacity: Math.min(Math.max(o, 0), 100) / 100 })} />
        <NumberField id={`${id}-border`} label={t("studio.borderWidth")} value={layer.border_width ?? 0} onChange={(w) => onChange({ border_width: Math.min(Math.max(w, 0), STUDIO_LIMITS.maxBorder), border_color: layer.border_color ?? "#E4DED3" })} />
        <ColorField id={`${id}-border-color`} label={t("studio.borderColor")} value={layer.border_color ?? "#E4DED3"} onChange={(border_color) => onChange({ border_color })} />
      </div>
      <Check label={t("studio.shadow")} checked={layer.shadow === true} onChange={(shadow) => onChange({ shadow })} />
      {layer.type !== "items" ? (
        <ActionEditor
          id={`${id}-action`}
          label={t("studio.onTap")}
          action={layer.action}
          optional
          onChange={(action) => onChange({ action })}
          pages={pages}
          sources={sources}
          screens={screens}
          courses={pickable.items.courses}
        />
      ) : null}
    </div>
  );
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="input input-sm"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}

/** A colour, or none (`none` names what shows instead) when it can be left out. */
function ColorField({ id, label, value, onChange, none }: { id: string; label: string; value: string | null; onChange: (value: string | null) => void; none?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} type="color" className="input input-sm w-16 p-1" value={(value ?? "#FFFFFF").toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} disabled={none !== undefined && value === null} />
        {none !== undefined ? <Check label={none} checked={value === null} onChange={(off) => onChange(off ? null : "#FFFFFF")} /> : null}
      </div>
    </div>
  );
}
