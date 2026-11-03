"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Icon } from "@/components/icon";
import { BRAND_THEME, cloneBlock, newBlock } from "@/lib/mailing/blocks";
import { applyMergeTags, exampleMergeValues } from "@/lib/mailing/merge";
import { forceDark, htmlSizeKb, renderBlockForCanvas, renderContent, renderDoc } from "@/lib/mailing/render";
import type { MailBlock, MailBlockType, MailContent, MailDoc, MailLang } from "@/lib/mailing/types";
import { SmallButton } from "./fields";
import { BLOCK_INFO, BlockLibrary, NEW_BLOCK_TYPE } from "./library";
import { BlockProperties, EmailProperties } from "./properties";

/**
 * 114 The email builder: the blocks on the left, the email in the middle
 * (drag blocks onto it, drag them to move them, click one to change it) and
 * the chosen block's settings on the right; or the preview (desktop or
 * phone, light or dark) and HTML mode.
 */

const MOVE_TYPE = "application/x-yallapp-mail-move";

export interface Path {
  i: number;
  col?: number;
  j?: number;
}

function at(blocks: MailBlock[], path: Path): MailBlock | null {
  const top = blocks[path.i];
  if (!top) return null;
  if (path.col === undefined || path.j === undefined) return top;
  return top.columns?.[path.col]?.[path.j] ?? null;
}

function replaceAt(blocks: MailBlock[], path: Path, block: MailBlock | null): MailBlock[] {
  return blocks.flatMap((b, i) => {
    if (i !== path.i) return [b];
    if (path.col === undefined || path.j === undefined) return block ? [block] : [];
    const columns = (b.columns ?? []).map((column, c) => (c !== path.col ? column : column.flatMap((x, j) => (j !== path.j ? [x] : block ? [block] : []))));
    return [{ ...b, columns }];
  });
}

export function previewHtml(content: MailContent, lang: MailLang, assetBase: string, dark: boolean): string {
  const html = applyMergeTags(renderContent(content, { lang, assetBase }).html, exampleMergeValues(), { html: true });
  return dark ? forceDark(html) : html;
}

export function EmailPreview({ html, device, title = "Email preview" }: { html: string; device: "desktop" | "phone"; title?: string }) {
  return (
    <div className={`mx-auto flex justify-center ${device === "phone" ? "w-[402px] max-w-full rounded-[44px] border-[10px] border-midnight bg-midnight p-0 shadow-[0_24px_60px_rgba(14,13,36,0.25)]" : "w-full"}`}>
      <iframe title={title} srcDoc={html} sandbox="" data-testid="email-preview" className={`block border-0 bg-white ${device === "phone" ? "h-[760px] w-[382px] rounded-[34px]" : "h-[880px] w-full rounded-[16px] border border-line"}`} />
    </div>
  );
}

export function Builder({
  content,
  onChange,
  lang,
  assetBase,
  undo,
  redo,
  canUndo,
  canRedo,
  onSaveTemplate,
}: {
  content: MailContent;
  onChange: (content: MailContent) => void;
  lang: MailLang;
  assetBase: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveTemplate: () => void;
}) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [dark, setDark] = useState(false);
  const [sel, setSel] = useState<Path | null>(null);
  const [drop, setDrop] = useState<{ i: number; col?: number; j?: number } | null>(null);
  const doc: MailDoc = content.doc ?? { version: 1, theme: BRAND_THEME, blocks: [] };
  const theme = { ...BRAND_THEME, ...doc.theme };
  const dir = content.dir;
  const blocks = doc.blocks;
  const selected = sel ? at(blocks, sel) : null;

  const setBlocks = (next: MailBlock[]) => onChange({ ...content, doc: { ...doc, blocks: next } });
  const insert = (type: MailBlockType, index: number) => {
    const block = newBlock(type);
    const next = [...blocks];
    next.splice(index, 0, block);
    setBlocks(next);
    setSel({ i: index });
  };
  const insertInColumn = (type: MailBlockType, i: number, col: number, j: number) => {
    if (type === "columns") return;
    const block = { ...newBlock(type), style: { ...newBlock(type).style, padding: [6, 0, 6, 0] as [number, number, number, number] } };
    const next = blocks.map((b, x) => (x !== i ? b : { ...b, columns: (b.columns ?? []).map((column, c) => (c !== col ? column : [...column.slice(0, j), block, ...column.slice(j)])) }));
    setBlocks(next);
    setSel({ i, col, j });
  };
  const move = (from: number, to: number) => {
    if (from === to || from + 1 === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, b!);
    setBlocks(next);
    setSel({ i: to > from ? to - 1 : to });
  };
  const nudge = (path: Path, by: -1 | 1) => {
    if (path.col === undefined || path.j === undefined) {
      const to = path.i + by;
      if (to < 0 || to >= blocks.length) return;
      const next = [...blocks];
      [next[path.i], next[to]] = [next[to]!, next[path.i]!];
      setBlocks(next);
      setSel({ i: to });
      return;
    }
    const column = blocks[path.i]?.columns?.[path.col] ?? [];
    const to = path.j + by;
    if (to < 0 || to >= column.length) return;
    const nextColumn = [...column];
    [nextColumn[path.j], nextColumn[to]] = [nextColumn[to]!, nextColumn[path.j]!];
    setBlocks(blocks.map((b, x) => (x !== path.i ? b : { ...b, columns: b.columns!.map((c, ci) => (ci === path.col ? nextColumn : c)) })));
    setSel({ ...path, j: to });
  };
  const duplicate = (path: Path) => {
    const block = at(blocks, path);
    if (!block) return;
    if (path.col === undefined || path.j === undefined) {
      const next = [...blocks];
      next.splice(path.i + 1, 0, cloneBlock(block));
      setBlocks(next);
      setSel({ i: path.i + 1 });
    } else insertCopyInColumn(path, block);
  };
  const insertCopyInColumn = (path: Path, block: MailBlock) => {
    setBlocks(blocks.map((b, x) => (x !== path.i ? b : { ...b, columns: b.columns!.map((c, ci) => (ci === path.col ? [...c.slice(0, path.j! + 1), cloneBlock(block), ...c.slice(path.j! + 1)] : c)) })));
    setSel({ ...path, j: path.j! + 1 });
  };
  const remove = (path: Path) => {
    setBlocks(replaceAt(blocks, path, null));
    setSel(null);
  };

  const onDropAt = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDrop(null);
    const type = e.dataTransfer.getData(NEW_BLOCK_TYPE) as MailBlockType;
    const from = e.dataTransfer.getData(MOVE_TYPE);
    if (type && BLOCK_INFO[type]) insert(type, index);
    else if (from !== "") move(Number(from), index);
  };
  const overAt = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(MOVE_TYPE) ? "move" : "copy";
    if (drop?.i !== index || drop.col !== undefined) setDrop({ i: index });
  };

  const canvasHtml = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of blocks) {
      if (b.type !== "columns") map.set(b.id, renderBlockForCanvas(doc, b, { dir, lang, assetBase }));
      else {
        const n = b.columns?.length || 1;
        const width = Math.floor((theme.width - 64 - 16 * (n - 1)) / n);
        for (const column of b.columns ?? []) for (const x of column) map.set(x.id, renderBlockForCanvas(doc, x, { dir, lang, assetBase, width }));
      }
    }
    return map;
  }, [blocks, doc, dir, lang, assetBase, theme.width]);

  const html = useMemo(() => (view === "preview" ? previewHtml(content, lang, assetBase, dark) : ""), [view, content, lang, assetBase, dark]);
  const size = useMemo(() => htmlSizeKb(renderDoc(doc, content, { lang, assetBase })), [doc, content, lang, assetBase]);

  const toolbarButton = (active: boolean) => `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold ${active ? "bg-midnight text-ivory" : "text-ink-3 hover:bg-sand hover:text-midnight"}`;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-white" data-testid="builder">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div role="tablist" aria-label="View" className="flex gap-1 rounded-[12px] bg-sand p-1">
          <button type="button" role="tab" aria-selected={view === "edit"} onClick={() => setView("edit")} className={toolbarButton(view === "edit")}>
            <Icon name="edit" size={18} />
            Edit
          </button>
          <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")} className={toolbarButton(view === "preview")} data-testid="preview-tab">
            <Icon name="visibility" size={18} />
            Preview
          </button>
        </div>
        {view === "preview" ? (
          <div className="flex gap-1 rounded-[12px] bg-sand p-1">
            <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} className={toolbarButton(device === "desktop")} title="Desktop">
              <Icon name="devices" size={18} />
              <span className="max-md:sr-only">Desktop</span>
            </button>
            <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")} className={toolbarButton(device === "phone")} title="Phone" data-testid="device-phone">
              <Icon name="smartphone" size={18} />
              <span className="max-md:sr-only">Phone</span>
            </button>
            <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)} className={toolbarButton(dark)} title="Dark mode">
              <Icon name={dark ? "dark_mode" : "light_mode"} size={18} />
              <span className="max-md:sr-only">{dark ? "Dark" : "Light"}</span>
            </button>
          </div>
        ) : null}
        <div className="flex gap-1">
          <SmallButton icon="undo" label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
          <SmallButton icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
        </div>
        <button type="button" onClick={() => onChange({ ...content, dir: dir === "rtl" ? "ltr" : "rtl" })} className={toolbarButton(false)} title="Text direction" data-testid="direction">
          <Icon name="translate" size={18} />
          {dir === "rtl" ? "Right to left" : "Left to right"}
        </button>
        <span className={`ms-auto text-[12px] font-semibold tabular-nums ${size > 90 ? "text-danger" : "text-muted"}`} title="Gmail cuts emails past about 100 KB">
          {size} KB
        </span>
        <button type="button" onClick={onSaveTemplate} className={toolbarButton(false)} data-testid="save-template">
          <Icon name="bookmark_add" size={18} />
          <span className="max-lg:sr-only">Save as template</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Switch to HTML? The email becomes its HTML, which you edit by hand from now on. You can come back to the blocks, but your HTML changes would be lost.")) return;
            onChange({ ...content, mode: "html", html: renderDoc(doc, content, { lang, assetBase, legal: false }) });
          }}
          className={toolbarButton(false)}
          data-testid="to-html"
        >
          <Icon name="code" size={18} />
          <span className="max-lg:sr-only">HTML</span>
        </button>
      </div>
      {view === "preview" ? (
        <div className="bg-ivory p-4 sm:p-6">
          <EmailPreview html={html} device={device} />
        </div>
      ) : (
        <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)_320px]">
          <aside aria-label="Blocks" className="border-line max-lg:border-b lg:border-e lg:overflow-y-auto lg:max-h-[1100px]">
            <BlockLibrary onAdd={(type) => insert(type, sel && sel.col === undefined ? sel.i + 1 : blocks.length)} />
          </aside>
          <div
            className="min-w-0 overflow-x-auto px-3 py-6 sm:px-6"
            style={{ backgroundColor: theme.background }}
            onClick={() => setSel(null)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null);
            }}
          >
            <div className="mx-auto overflow-hidden shadow-[0_8px_30px_rgba(14,13,36,0.08)]" dir={dir} style={{ maxWidth: theme.width, backgroundColor: theme.body, borderRadius: theme.radius }} data-testid="canvas">
              {blocks.length === 0 ? (
                <div onDragOver={(e) => overAt(e, 0)} onDrop={(e) => onDropAt(e, 0)} className={`m-4 flex h-48 items-center justify-center rounded-2xl border-2 border-dashed text-[14px] font-semibold ${drop ? "border-ember bg-peach text-accent" : "border-line-strong text-muted"}`}>
                  Drag blocks here, or click one on the left
                </div>
              ) : null}
              {blocks.map((block, i) => {
                const isSel = sel?.i === i && sel.col === undefined;
                return (
                  <div key={block.id}>
                    <DropLine active={drop?.i === i && drop.col === undefined} />
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`${BLOCK_INFO[block.type].label} block`}
                      aria-pressed={isSel}
                      data-canvas-block={block.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(MOVE_TYPE, String(i));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        overAt(e, e.clientY < r.top + r.height / 2 ? i : i + 1);
                      }}
                      onDrop={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        onDropAt(e, e.clientY < r.top + r.height / 2 ? i : i + 1);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSel({ i });
                      }}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSel({ i });
                        }
                        if (e.key === "Delete" || e.key === "Backspace") remove({ i });
                      }}
                      className={`group relative cursor-pointer outline-offset-[-2px] ${isSel ? "outline-2 outline-ember outline" : "hover:outline-2 hover:outline-dashed hover:outline-[#FF5A1F80]"}`}
                    >
                      {block.type === "columns" ? (
                        <Columns
                          block={block}
                          i={i}
                          html={canvasHtml}
                          sel={sel}
                          setSel={setSel}
                          drop={drop}
                          setDrop={setDrop}
                          onDrop={(e, col, j) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDrop(null);
                            const type = e.dataTransfer.getData(NEW_BLOCK_TYPE) as MailBlockType;
                            if (type && BLOCK_INFO[type]) insertInColumn(type, i, col, j);
                          }}
                          dir={dir}
                        />
                      ) : (
                        <div className="pointer-events-none select-none" dangerouslySetInnerHTML={{ __html: canvasHtml.get(block.id) ?? "" }} />
                      )}
                      <span className={`absolute start-2 top-2 z-10 items-center gap-1 rounded-lg bg-midnight px-2 py-1 text-[11px] font-bold text-ivory ${isSel ? "flex" : "hidden group-hover:flex"}`}>
                        <Icon name="drag_indicator" size={14} />
                        {BLOCK_INFO[block.type].label}
                      </span>
                      {isSel ? <BlockTools onUp={() => nudge({ i }, -1)} onDown={() => nudge({ i }, 1)} onCopy={() => duplicate({ i })} onDelete={() => remove({ i })} first={i === 0} last={i === blocks.length - 1} /> : null}
                    </div>
                  </div>
                );
              })}
              {blocks.length ? (
                <div onDragOver={(e) => overAt(e, blocks.length)} onDrop={(e) => onDropAt(e, blocks.length)} className="h-10">
                  <DropLine active={drop?.i === blocks.length && drop.col === undefined} />
                </div>
              ) : null}
              <p className="m-0 border-t border-dashed border-line px-6 py-4 text-center text-[11.5px] text-muted">The unsubscribe line and “Yallapp · Cairo, Egypt” are added under every email.</p>
            </div>
          </div>
          <aside aria-label="Settings" className="border-line max-lg:border-t lg:border-s lg:overflow-y-auto lg:max-h-[1100px]" data-testid="properties">
            {selected && sel ? (
              <>
                <BlockProperties key={selected.id} block={selected} set={(b) => setBlocks(replaceAt(blocks, sel, b))} theme={theme} dir={dir} />
                {sel.col !== undefined ? (
                  <div className="flex gap-1 border-t border-line-soft px-4 py-3">
                    <SmallButton icon="arrow_upward" label="Up" onClick={() => nudge(sel, -1)} />
                    <SmallButton icon="arrow_downward" label="Down" onClick={() => nudge(sel, 1)} />
                    <SmallButton icon="content_copy" label="Duplicate" onClick={() => duplicate(sel)} />
                    <SmallButton icon="delete" label="Delete" tone="danger" onClick={() => remove(sel)} />
                  </div>
                ) : null}
              </>
            ) : (
              <EmailProperties
                theme={theme}
                setTheme={(t) => onChange({ ...content, doc: { ...doc, theme: t } })}
                dir={dir}
                setDir={(d) => onChange({ ...content, dir: d })}
                preview={content.preview}
                setPreview={(p) => onChange({ ...content, preview: p })}
                subject={content.subject}
                setSubject={(s) => onChange({ ...content, subject: s })}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function DropLine({ active }: { active: boolean }) {
  return <div aria-hidden="true" className={`mx-4 rounded-full transition-all ${active ? "my-1 h-1 bg-ember" : "h-0"}`} />;
}

function BlockTools({ onUp, onDown, onCopy, onDelete, first, last }: { onUp: () => void; onDown: () => void; onCopy: () => void; onDelete: () => void; first: boolean; last: boolean }) {
  return (
    <span className="absolute end-2 top-2 z-10 flex gap-1" onClick={(e) => e.stopPropagation()}>
      <SmallButton icon="arrow_upward" label="Up" onClick={onUp} disabled={first} />
      <SmallButton icon="arrow_downward" label="Down" onClick={onDown} disabled={last} />
      <SmallButton icon="content_copy" label="Duplicate" onClick={onCopy} />
      <SmallButton icon="delete" label="Delete" tone="danger" onClick={onDelete} />
    </span>
  );
}

function Columns({
  block,
  i,
  html,
  sel,
  setSel,
  drop,
  setDrop,
  onDrop,
  dir,
}: {
  block: MailBlock;
  i: number;
  html: Map<string, string>;
  sel: Path | null;
  setSel: (p: Path) => void;
  drop: { i: number; col?: number; j?: number } | null;
  setDrop: (d: { i: number; col?: number; j?: number } | null) => void;
  onDrop: (e: DragEvent, col: number, j: number) => void;
  dir: "ltr" | "rtl";
}) {
  const s = block.style;
  const [t, r, b, l] = s?.padding ?? [12, 32, 12, 32];
  const columns = block.columns ?? [];
  return (
    <div dir={dir} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length || 1}, minmax(0, 1fr))`, padding: `${t}px ${dir === "rtl" ? l : r}px ${b}px ${dir === "rtl" ? r : l}px`, backgroundColor: s?.background }}>
      {columns.map((column, col) => (
        <div
          key={col}
          className={`flex min-h-16 flex-col rounded-lg border border-dashed ${drop?.i === i && drop.col === col ? "border-ember bg-peach/50" : "border-transparent hover:border-line-strong"}`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(NEW_BLOCK_TYPE)) return;
            e.preventDefault();
            e.stopPropagation();
            if (drop?.i !== i || drop.col !== col) setDrop({ i, col, j: column.length });
          }}
          onDrop={(e) => onDrop(e, col, column.length)}
        >
          {column.map((x, j) => {
            const isSel = sel?.i === i && sel.col === col && sel.j === j;
            return (
              <div
                key={x.id}
                role="button"
                tabIndex={0}
                aria-label={`${BLOCK_INFO[x.type].label} in column ${col + 1}`}
                aria-pressed={isSel}
                onClick={(e) => {
                  e.stopPropagation();
                  setSel({ i, col, j });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setSel({ i, col, j });
                  }
                }}
                className={`relative cursor-pointer rounded ${isSel ? "outline-2 outline-ember outline" : "hover:outline hover:outline-dashed hover:outline-[#FF5A1F80]"}`}
              >
                <div className="pointer-events-none select-none" dangerouslySetInnerHTML={{ __html: html.get(x.id) ?? "" }} />
              </div>
            );
          })}
          {column.length === 0 ? <div className="flex flex-1 items-center justify-center p-3 text-center text-[12px] text-muted">Drop a block here</div> : null}
        </div>
      ))}
    </div>
  );
}

/** HTML mode: the email's code on one side, what it looks like on the other. */
export function HtmlEditor({ content, onChange, lang, assetBase, onBackToBlocks }: { content: MailContent; onChange: (c: MailContent) => void; lang: MailLang; assetBase: string; onBackToBlocks: (() => void) | null }) {
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [dark, setDark] = useState(false);
  const html = useMemo(() => previewHtml(content, lang, assetBase, dark), [content, lang, assetBase, dark]);
  const size = htmlSizeKb(content.html ?? "");
  const button = (active: boolean) => `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold ${active ? "bg-midnight text-ivory" : "text-ink-3 hover:bg-sand hover:text-midnight"}`;
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-white" data-testid="html-editor">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="inline-flex items-center gap-1.5 px-1 text-[14px] font-extrabold text-midnight">
          <Icon name="code" size={19} />
          HTML mode
        </span>
        <div className="flex gap-1 rounded-[12px] bg-sand p-1">
          <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} className={button(device === "desktop")}>
            <Icon name="devices" size={18} />
            Desktop
          </button>
          <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")} className={button(device === "phone")}>
            <Icon name="smartphone" size={18} />
            Phone
          </button>
          <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)} className={button(dark)}>
            <Icon name={dark ? "dark_mode" : "light_mode"} size={18} />
            {dark ? "Dark" : "Light"}
          </button>
        </div>
        <button type="button" onClick={() => onChange({ ...content, dir: content.dir === "rtl" ? "ltr" : "rtl" })} className={button(false)}>
          <Icon name="translate" size={18} />
          {content.dir === "rtl" ? "Right to left" : "Left to right"}
        </button>
        <span className={`ms-auto text-[12px] font-semibold tabular-nums ${size > 90 ? "text-danger" : "text-muted"}`}>{size} KB</span>
        {onBackToBlocks ? (
          <button type="button" onClick={onBackToBlocks} className={button(false)}>
            <Icon name="dashboard_customize" size={18} />
            Back to blocks
          </button>
        ) : null}
      </div>
      <div className="grid min-h-[720px] grid-cols-1 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col border-line xl:border-e">
          <label htmlFor="html-code" className="sr-only">
            The email&apos;s HTML
          </label>
          <textarea
            id="html-code"
            value={content.html ?? ""}
            onChange={(e) => onChange({ ...content, html: e.target.value })}
            spellCheck={false}
            dir="ltr"
            data-testid="html-code"
            className="min-h-[720px] w-full flex-1 resize-none border-0 bg-[#0E0D24] p-4 font-mono text-[12.5px] leading-relaxed text-[#E9E6FF] outline-0"
          />
          <p className="m-0 border-t border-line-soft px-4 py-2.5 text-[12px] text-muted">Scripts, forms, frames and event handlers are taken out; the preview line, the direction and the unsubscribe line are added when it&apos;s sent.</p>
        </div>
        <div className="bg-ivory p-4">
          <EmailPreview html={html} device={device} />
        </div>
      </div>
    </div>
  );
}
