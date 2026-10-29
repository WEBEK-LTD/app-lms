"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { STUDIO_HEADER_TYPES, type StudioPage } from "@/lib/pages/types";
import type { DesignFile } from "@/lib/studio/design-file";
import type { OwnDesignView } from "@/lib/studio/own-designs";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * 108.7 The whole designs window, as the owner approved it: over the
 * editor, the project type's designs and the account's own (saved or
 * imported) as phones with their first page; the chosen one's pages on the
 * side, to replace the whole project's design or only the open page.
 */

export interface GalleryDesign {
  id: string;
  name: string;
  /** Yallapp's (made for the project), or the account's own. */
  kind: "yallapp" | "saved" | "imported";
  pages: number;
  /** Yallapp's are made here; the account's are opened when chosen. */
  file: DesignFile | null;
}

type Filter = "all" | "yallapp" | "saved" | "imported";

export function DesignsGallery(props: {
  kindName: string;
  designs: GalleryDesign[];
  preview: (page: StudioPage) => ReactNode;
  load: (id: string) => Promise<DesignFile | null>;
  onApply: (file: DesignFile, mode: "project" | "page", pageIndex: number, keep: boolean) => void;
  onImport: () => void;
  onSaveMine: () => Promise<string | null>;
  onDelete: (id: string) => void;
  onClose: () => void;
  hasOpenPage: boolean;
}) {
  const t = useDashT();
  const [filter, setFilter] = useState<Filter>("all");
  const [chosenId, setChosenId] = useState<string | null>(props.designs[0]?.id ?? null);
  const [files, setFiles] = useState<Record<string, DesignFile | null>>({});
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [keep, setKeep] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const count = (f: Filter) => props.designs.filter((d) => f === "all" || d.kind === f).length;
  const shown = props.designs.filter((d) => filter === "all" || d.kind === filter);
  const chosen = props.designs.find((d) => d.id === chosenId) ?? null;
  const file = chosen ? (chosen.file ?? files[chosen.id] ?? null) : null;

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  /** Chooses a design; the account's own is opened then. */
  function choose(d: GalleryDesign) {
    setChosenId(d.id);
    setPageIndex(0);
    setMessage(null);
    if (d.file || d.id in files) return;
    setLoading(true);
    void props.load(d.id).then((f) => {
      setFiles((all) => ({ ...all, [d.id]: f }));
      setLoading(false);
      if (!f) setMessage({ ok: false, text: t("studio.designsFailed") });
    });
  }

  const header = file?.pages[0]?.studio.header?.type;
  const headerNumber = header ? STUDIO_HEADER_TYPES.indexOf(header) + 1 : 0;
  const meta = file ? t("studio.designsMeta", { count: file.pages.length, header: headerNumber ? t(`studio.header${headerNumber}` as DashKey) : "—", font: file.look?.font ?? "—" }) : "";

  const chip = (f: Filter, label: string) => (
    <button
      key={f}
      type="button"
      aria-pressed={filter === f}
      onClick={() => setFilter(f)}
      className="rounded-full px-2.5 py-0.5 text-xs"
      style={filter === f ? { background: C.ink, color: "#FFFFFF", border: `1px solid ${C.ink}` } : { background: "#FFFFFF", border: `1px solid ${C.line}` }}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(14,13,36,0.45)" }} onClick={props.onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="designs-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-[18px] bg-white text-[13px] outline-none"
        style={{ boxShadow: "0 30px 70px rgba(14,13,36,0.35)", color: C.ink }}
      >
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <Glyph name="dashboard_customize" size={22} className="text-[#3D63FF]" />
          <h2 id="designs-title" className="m-0 min-w-[200px] flex-1 text-lg font-bold">
            {t("studio.designsTitle", { kind: props.kindName })}
          </h2>
          <div role="group" className="flex flex-wrap items-center gap-1.5">
            {chip("all", t("studio.designsAll", { count: count("all") }))}
            {chip("yallapp", t("studio.designsOfKind", { kind: props.kindName, count: count("yallapp") }))}
            {chip("saved", t("studio.designsMine", { count: count("saved") }))}
            {chip("imported", t("studio.designsImported", { count: count("imported") }))}
          </div>
          <Action icon="bookmark_add" onClick={() => void props.onSaveMine().then((err) => setMessage(err ? { ok: false, text: err } : { ok: true, text: t("studio.designsSaved") }))}>
            {t("studio.designsSaveMine")}
          </Action>
          <Action icon="upload" onClick={props.onImport}>
            {t("studio.importDesign").replace(/…$/, "")}
          </Action>
          <button type="button" aria-label={t("studio.close")} onClick={props.onClose} className="flex size-8 items-center justify-center rounded-lg border-0 bg-transparent">
            <Glyph name="close" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-wrap overflow-auto">
          <div className="grid min-w-[300px] flex-[1_1_560px] content-start gap-3 p-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {shown.map((d) => {
              const on = d.id === chosenId;
              const first = (d.file ?? files[d.id])?.pages[0]?.studio;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on}
                  data-studio-design={d.id}
                  onClick={() => choose(d)}
                  className="flex flex-col items-center gap-1.5 rounded-[14px] bg-white p-2.5"
                  style={on ? { outline: `2px solid ${C.select}`, border: "1px solid transparent" } : { border: `1px solid ${C.line}` }}
                >
                  <MiniPhone scale={0.31}>{first ? props.preview(first) : <Empty />}</MiniPhone>
                  <b className="max-w-full truncate">{d.name}</b>
                  <span className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                    {t("studio.designsPages", { count: d.pages })}
                    {d.kind !== "yallapp" ? <Tag>{t(d.kind === "saved" ? "studio.designsTagMine" : "studio.designsTagImported")}</Tag> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex min-w-[300px] flex-[0_1_380px] flex-col gap-3 p-[18px]" style={{ borderInlineStart: `1px solid ${C.line}` }}>
            {chosen ? (
              <>
                <div className="flex items-start gap-2">
                  <b className="flex-1 text-[17px]">{chosen.name}</b>
                  {chosen.kind !== "yallapp" ? (
                    <button type="button" aria-label={t("studio.designsDelete", { name: chosen.name })} title={t("studio.designsDelete", { name: chosen.name })} onClick={() => props.onDelete(chosen.id)} className="flex size-8 items-center justify-center rounded-lg border-0 bg-transparent">
                      <Glyph name="delete" size={18} />
                    </button>
                  ) : null}
                </div>
                <span style={{ color: C.muted }}>{loading && !file ? t("studio.designsLoading") : meta}</span>
                {file ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {file.pages.map((p, i) => (
                      <button key={i} type="button" aria-pressed={pageIndex === i} onClick={() => setPageIndex(i)} className="flex flex-none flex-col items-center gap-1 rounded-lg border-0 bg-transparent p-0.5" style={pageIndex === i ? { outline: `2px solid ${C.select}` } : undefined}>
                        <MiniPhone scale={0.2}>{props.preview(p.studio)}</MiniPhone>
                        <span className="max-w-[72px] truncate text-[11px]">{p.title}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <Wide primary icon="dashboard_customize" disabled={!file} onClick={() => file && props.onApply(file, "project", pageIndex, keep)}>
                  {t("studio.designsReplaceAll")}
                </Wide>
                <Wide disabled={!file || !props.hasOpenPage} onClick={() => file && props.onApply(file, "page", pageIndex, keep)}>
                  {t("studio.designsOpenPage")}
                </Wide>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="accent-[#3D63FF]" />
                  {t("studio.designsKeep")}
                </label>
                <div className="flex gap-2 rounded-xl p-2.5 text-xs" style={{ background: C.ivory, color: C.muted }}>
                  <Glyph name="info" size={18} />
                  <span>{t("studio.designsNote")}</span>
                </div>
              </>
            ) : null}
            {message ? (
              <span role={message.ok ? "status" : "alert"} className="text-xs" style={{ color: message.ok ? "#1F8A4C" : "#B3261E" }}>
                {message.text}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Action({ icon, onClick, children }: { icon: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-white px-3.5 text-sm font-bold" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
      <Glyph name={icon} size={18} />
      {children}
    </button>
  );
}

function Wide({ primary, icon, disabled, onClick, children }: { primary?: boolean; icon?: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-full items-center gap-1.5 rounded-[10px] px-4 text-sm font-bold disabled:opacity-50"
      style={primary ? { background: C.ink, color: C.ivory, border: `1px solid ${C.ink}` } : { background: "#FFFFFF", color: C.ink, border: `1px solid ${C.line}` }}
    >
      {icon ? <Glyph name={icon} size={18} /> : null}
      {children}
    </button>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2 py-px text-[11px]" style={{ border: `1px solid ${C.line}` }}>
      {children}
    </span>
  );
}

function Empty() {
  return (
    <span className="flex h-full w-full items-center justify-center" style={{ background: C.ivory }}>
      <Glyph name="dashboard_customize" size={60} className="text-[#5E5B70]" />
    </span>
  );
}

function MiniPhone({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <span aria-hidden="true" className="block flex-none overflow-hidden" style={{ width: 360 * scale, height: 680 * scale, borderRadius: 14, border: `5px solid ${C.ink}`, background: "#FBF8F2", pointerEvents: "none" }}>
      <span className="block" style={{ width: 360, height: 680, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden" }}>
        {children}
      </span>
    </span>
  );
}
