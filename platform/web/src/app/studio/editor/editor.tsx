"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { deleteStudioTemplateAction, saveStudioTemplateAction } from "@/app/actions/studio";
import { publishLayoutAction, saveLayoutDraftAction, type LayoutSaveResult } from "@/app/actions/pages";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { StudioView, type StudioEditing, type StudioLook } from "@/components/studio/view";
import type { DashKey } from "@/i18n/dashboard";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { ScreenOption } from "@/lib/pages/sources";
import { uniqueSlug } from "@/lib/pages/model";
import { STUDIO_HEADER_TYPES, type ItemSource, type LanguageCode, type LayoutContent, type LayoutPage, type StudioHeader, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { duplicateNode, historyOf, holdsChildren, insertNode, isInside, moveNode, placeOf, pushHistory, redo, removeNode, undo, updateNode, wrapNode, type History } from "@/lib/studio/edit";
import { elementInfo, newNode, newNodeId, type NewText } from "@/lib/studio/elements";
import { SECTIONS, sectionsFor, TEMPLATES, templatesFor, type ProjectKind, type SectionContext, type SectionWord, type TemplateInfo } from "@/lib/studio/sections";
import { CLIPBOARD_KEY, forPaste, readCopied, readStyle, STYLE_CLIPBOARD_KEY, styleOf, stylePatch } from "@/lib/studio/clipboard";
import { findNode } from "@/lib/studio/tree";
import { Inspector, type InspectorTab } from "./inspector";
import { LeftPanel, elementLabel, type LeftTab, type MyTemplate } from "./left-panel";
import { DRAG_TYPE, Glyph, STUDIO_COLORS as C, StudioMark, type DragPayload } from "./shared";

/**
 * 103R.4 Yallapp Studio's editor, as the owner approved it: the dark bar on
 * top (pages, phone size, language, undo, saved, preview, publish), the
 * elements and layers on one side, the page in a phone on a dotted board in
 * the middle, and the selected element's design, motion and data on the
 * other side. Everything can be dragged anywhere; the draft saves itself.
 */

type Device = "small" | "phone" | "tablet";
type Status = "saved" | "saving" | "unsaved" | "invalid";

const DEVICES: Record<Device, { width: number; height: number; radius: number; icon: string; iconSize: number }> = {
  small: { width: 330, height: 680, radius: 40, icon: "smartphone", iconSize: 18 },
  phone: { width: 360, height: 760, radius: 44, icon: "smartphone", iconSize: 20 },
  tablet: { width: 620, height: 860, radius: 32, icon: "tablet", iconSize: 20 },
};
const ZOOMS = [50, 75, 100, 125] as const;
const AUTOSAVE_MS = 1200;
/** Changes this close together (typing in a field) are one undo step. */
const JOIN_MS = 1000;

export interface StudioEditorProps {
  initial: { draft: LayoutContent; savedAt: string; published: { version: string; at: string } | null };
  app: { name: string; brand: string; logoUrl: string | null };
  sources: ItemSource[];
  categorySources: ItemSource[];
  screens: ScreenOption[];
  pickable: Pickable;
  myTemplates: MyTemplate[];
  previewHref: string;
  fontCount: number;
  startSlug: string | null;
  studioOnPlan: boolean;
  /** 103R.7 The project's type: its own templates and sections come first. */
  kind: ProjectKind;
}

export function StudioEditor(props: StudioEditorProps) {
  const t = useDashT();
  const known = useKnownText();
  const dashLang = useDashLang();
  const { app } = props;

  const [history, setHistory] = useState<History<LayoutContent>>(() => historyOf(props.initial.draft));
  const layout = history.present;
  const [slug, setSlug] = useState(() => layout.pages.find((p) => p.slug === props.startSlug)?.slug ?? layout.pages.find((p) => p.studio)?.slug ?? layout.pages[0]?.slug ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("phone");
  const [lang, setLang] = useState<LanguageCode>(layout.languages.default);
  const [dark, setDark] = useState(false);
  const [zoom, setZoom] = useState<number>(100);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("elements");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("design");
  const [drop, setDrop] = useState<{ parentId: string; index: number } | null>(null);
  const [status, setStatus] = useState<Status>("saved");
  const [savedAt, setSavedAt] = useState(props.initial.savedAt);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [myTemplates, setMyTemplates] = useState(props.myTemplates);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // 107.1 Re-reads what was copied after copying here (other tabs tell through the storage event).
  const [, setCopies] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const dragging = useRef<DragPayload | null>(null);
  const dirty = useRef(false);
  const edits = useRef(0);
  const lastChange = useRef<{ at: number; key: string }>({ at: 0, key: "" });
  const board = useRef<HTMLDivElement>(null);

  const def = layout.languages.default;
  const editLang = layout.languages.available.includes(lang) ? lang : def;
  const page = layout.pages.find((p) => p.slug === slug) ?? layout.pages[0] ?? null;
  const studio = page?.studio ?? null;
  const source = props.sources[0] ?? null;
  const selected = studio && selectedId && selectedId !== "header" ? findNode(studio.body, selectedId) : null;
  const pageTitle = (p: LayoutPage) => (editLang !== def ? (p.translations?.[editLang]?.title as string | undefined) : undefined) || p.title || p.slug;

  const look: StudioLook = {
    name: app.name,
    logoUrl: app.logoUrl,
    brand: app.brand,
    font: layout.appearance.font_family ?? layout.appearance.font ?? "Cairo",
    tabs: layout.tabs,
    activeTab: layout.tabs.find((tab) => tab.target.type === "page" && tab.target.page_slug === page?.slug)?.id ?? null,
  };
  const palette = useMemo(() => [...new Set([app.brand, layout.appearance.secondary_color, "#FFFFFF", "#0E0D24", "#F4EFE6", "#FF5A1F"].filter((c): c is string => !!c))], [app.brand, layout.appearance.secondary_color]);
  const words = { price: t("studio.price"), addPicture: t("studio.addPicture"), addVideo: t("studio.addVideo"), send: t("studio.send"), search: t("studio.search"), days: t("studio.days"), hours: t("studio.hours"), minutes: t("studio.minutes"), seconds: t("studio.seconds") };
  const kindSections = useMemo(() => sectionsFor(props.kind, { categories: props.categorySources.length > 0 }), [props.kind, props.categorySources]);
  const kindTemplates = useMemo(() => templatesFor(props.kind), [props.kind]);
  const sectionContext: SectionContext = {
    brand: app.brand,
    source,
    w: (word: SectionWord) => t(`studio.w_${word}` as DashKey, { app: app.name }),
  };
  const newText = (key: NewText) =>
    t(
      (
        {
          text: "studio.newText",
          button: "studio.newButton",
          search: "studio.search",
          ratings: "studio.newRatings",
          field: "studio.newField",
          question: "studio.newQuestion",
          answer: "studio.newAnswer",
          tab: "studio.newTab",
          ended: "studio.newEnded",
          bullets: "studio.newBullets",
        } as const
      )[key],
    );

  // ——— Changes, undo and the draft saving itself ———

  /** One change to the whole draft; `key` joins quick changes to one field into one undo step. */
  const change = useCallback((next: (current: LayoutContent) => LayoutContent, key = "") => {
    const now = Date.now();
    const join = key !== "" && key === lastChange.current.key && now - lastChange.current.at <= JOIN_MS;
    lastChange.current = { at: now, key };
    setHistory((h) => {
      const value = next(h.present);
      if (value === h.present) return h;
      return join ? { ...h, present: value } : pushHistory(h, value);
    });
    edits.current += 1;
    dirty.current = true;
    setStatus("unsaved");
    setNotice(null);
  }, []);

  const changePage = useCallback(
    (next: (page: StudioPage) => StudioPage, key = "") =>
      change((current) => {
        const target = current.pages.find((p) => p.slug === slug);
        if (!target?.studio) return current;
        const studio2 = next(target.studio);
        if (studio2 === target.studio) return current;
        return { ...current, pages: current.pages.map((p) => (p.slug === slug ? { ...p, studio: studio2, updated_at: new Date().toISOString() } : p)) };
      }, key),
    [change, slug],
  );

  function step(back: boolean) {
    lastChange.current = { at: 0, key: "" };
    setHistory((h) => (back ? undo(h) : redo(h)));
    edits.current += 1;
    dirty.current = true;
    setStatus("unsaved");
  }

  const applied = useCallback(
    (r: LayoutSaveResult, sent: number) => {
      if (!r.ok) {
        if (edits.current === sent) setStatus("invalid");
        setProblem(known(r.errors[0] ?? ""));
        return false;
      }
      setSavedAt(r.savedAt);
      setNow(Date.now());
      setProblem(null);
      if (edits.current === sent) {
        dirty.current = false;
        setStatus("saved");
      }
      return true;
    },
    [known],
  );

  const save = useCallback(
    async (draft: LayoutContent) => {
      const sent = edits.current;
      setStatus("saving");
      try {
        applied(await saveLayoutDraftAction(JSON.stringify(draft)), sent);
      } catch {
        setStatus("unsaved");
        setProblem(t("pages.cantSave"));
      }
    },
    [applied, t],
  );

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => void save(layout), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [layout, save]);

  // "Saved 2 seconds ago" stays true as time passes.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Leaving with changes that aren't saved yet asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function publish() {
    setPublishing(true);
    setNotice(null);
    const sent = edits.current;
    try {
      const r = await publishLayoutAction(JSON.stringify(layout));
      if (applied(r, sent) && r.ok) setNotice(props.studioOnPlan ? t("studio.published") : t("studio.publishedOff"));
    } catch {
      setProblem(t("pages.cantSave"));
    } finally {
      setPublishing(false);
    }
  }

  // ——— Adding, moving and changing elements ———

  /** Where a new element goes when clicked: into the selected layout, after the selected element, or at the end. */
  function placeForNew(p: StudioPage): { parentId: string; index?: number } {
    if (selected && holdsChildren(selected) && selected.type !== "items") return { parentId: selected.id };
    if (selected) {
      const place = placeOf(p.body, selected.id);
      if (place) return { parentId: place.parent.id, index: place.index + 1 };
    }
    return { parentId: p.body.id };
  }

  function nodeFor(payload: DragPayload): StudioNode | null {
    if (payload.kind === "new") return newNode(payload.type, { source, brand: app.brand, text: newText });
    if (payload.kind === "section") return SECTIONS.find((s) => s.id === payload.id)?.make(sectionContext) ?? null;
    return null;
  }

  function add(payload: DragPayload, at?: { parentId: string; index?: number }) {
    if (!studio) return;
    const node = nodeFor(payload);
    if (!node) return;
    const where = at ?? placeForNew(studio);
    changePage((p) => insertNode(p, where.parentId, node, where.index));
    setSelectedId(node.id);
    setInspectorTab("design");
  }

  function startWith(make: () => StudioPage) {
    if (!page) return;
    const fresh = make();
    change((current) => ({ ...current, pages: current.pages.map((p) => (p.slug === page.slug ? { ...p, studio: fresh, updated_at: new Date().toISOString() } : p)) }));
    setSelectedId(null);
  }

  function applyTemplate(id: string) {
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (tpl) startWith(() => tpl.make(sectionContext));
  }

  function deleteSelected() {
    if (!studio || !selectedId) return;
    if (selectedId === "header") {
      changePage((p) => ({ ...p, header: null }));
      setSelectedId(null);
      return;
    }
    if (selectedId === studio.body.id) return;
    const place = placeOf(studio.body, selectedId);
    changePage((p) => removeNode(p, selectedId));
    const siblings = place?.parent.children ?? [];
    setSelectedId(siblings[place!.index + 1]?.id ?? siblings[place!.index - 1]?.id ?? place?.parent.id ?? null);
  }

  function copySelected() {
    if (!studio || !selectedId || selectedId === "header") return;
    const done = duplicateNode(studio, selectedId, newNodeId);
    if (!done) return;
    changePage(() => done.page);
    setSelectedId(done.id);
  }

  // ——— 107.1 Copying and pasting, also to another page or project ———

  function stored(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function store(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private windows may refuse; copying then lasts only on this page.
    }
  }

  const memory = useRef<{ node: string | null; style: string | null }>({ node: null, style: null });

  const copiedRaw = useSyncExternalStore(onStorage, () => stored(CLIPBOARD_KEY) ?? memory.current.node ?? "", () => "");
  const styleRaw = useSyncExternalStore(onStorage, () => stored(STYLE_CLIPBOARD_KEY) ?? memory.current.style ?? "", () => "");
  const hasCopied = readCopied(copiedRaw) !== null;
  const hasStyle = readStyle(styleRaw) !== null;

  function copyToClipboard(cut: boolean) {
    if (!studio || !selected || selected.id === studio.body.id) return;
    const raw = JSON.stringify(selected);
    memory.current.node = raw;
    store(CLIPBOARD_KEY, raw);
    setCopies((n) => n + 1);
    if (cut) deleteSelected();
    setNotice(t(cut ? "studio.cutDone" : "studio.copied"));
  }

  function pasteFromClipboard() {
    if (!studio) return;
    const copied = readCopied(stored(CLIPBOARD_KEY) ?? memory.current.node);
    if (!copied) {
      setNotice(t("studio.nothingCopied"));
      return;
    }
    const node = forPaste(copied, {
      sources: props.sources,
      categorySources: props.categorySources,
      pageSlugs: layout.pages.map((p) => p.slug),
      screens: props.screens.map((s) => s.value),
      newId: newNodeId,
    });
    const where = placeForNew(studio);
    changePage((p) => insertNode(p, where.parentId, node, where.index));
    setSelectedId(node.id);
    setNotice(t("studio.pasted"));
  }

  function copyStyle() {
    if (!selected) return;
    const raw = JSON.stringify(styleOf(selected));
    memory.current.style = raw;
    store(STYLE_CLIPBOARD_KEY, raw);
    setCopies((n) => n + 1);
    setNotice(t("studio.styleCopied"));
  }

  function pasteStyle() {
    if (!selected) return;
    const style = readStyle(stored(STYLE_CLIPBOARD_KEY) ?? memory.current.style);
    if (!style) {
      setNotice(t("studio.nothingCopied"));
      return;
    }
    const id = selected.id;
    changePage((p) => updateNode(p, id, stylePatch(style)));
    setNotice(t("studio.stylePasted"));
  }

  function selectParent() {
    if (!studio || !selected) return;
    const place = placeOf(studio.body, selected.id);
    if (place) setSelectedId(place.parent.id);
  }

  /** Arrows: the selected element moves before or after its neighbour. */
  function nudge(by: -1 | 1) {
    if (!studio || !selectedId) return;
    const place = placeOf(studio.body, selectedId);
    if (!place) return;
    const to = place.index + by;
    if (to < 0 || to >= (place.parent.children?.length ?? 0)) return;
    changePage((p) => moveNode(p, selectedId, place.parent.id, by > 0 ? to + 1 : to));
  }

  // Delete, Ctrl+Z / Ctrl+Y, Ctrl+D, copying and pasting, the arrows and Escape; never while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      // 107.1 Ctrl+Alt+C and Ctrl+Alt+V copy and paste the style; Ctrl+C, Ctrl+X and Ctrl+V the element.
      if (mod && e.altKey && (e.code === "KeyC" || e.code === "KeyV")) {
        e.preventDefault();
        if (e.code === "KeyC") copyStyle();
        else pasteStyle();
        return;
      }
      if (mod && (key === "c" || key === "x") && selected && !window.getSelection()?.toString()) {
        e.preventDefault();
        copyToClipboard(key === "x");
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        pasteFromClipboard();
        return;
      }
      if (!mod && e.key === "?") {
        setShortcutsOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        step(!e.shiftKey);
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        step(false);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        copySelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPagesOpen(false);
        setZoomOpen(false);
        setShortcutsOpen(false);
      } else if (selectedId && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const rtl = editLang === "ar";
        const back = e.key === "ArrowUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft");
        nudge(back ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ——— Dragging ———

  function dragGhost(e: DragEvent, label: string, icon: string) {
    const ghost = document.createElement("div");
    ghost.dir = dashLang === "ar" ? "rtl" : "ltr";
    ghost.setAttribute("style", `position:fixed;top:-200px;inset-inline-start:-200px;display:flex;align-items:center;gap:8px;background:#FFFFFF;border:1px solid ${C.accent};border-radius:12px;padding:8px 12px;font:700 13px Cairo,system-ui,sans-serif;color:${C.ink};box-shadow:0 10px 24px rgba(14,13,36,0.18);transform:rotate(-4deg)`);
    ghost.innerHTML = `<span class="material-symbols-rounded" style="color:${C.accent};font-size:20px">${icon}</span><span></span><span class="material-symbols-rounded" style="font-size:18px;color:${C.muted}">drag_indicator</span>`;
    (ghost.children[1] as HTMLElement).textContent = label;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);
    setTimeout(() => ghost.remove(), 0);
  }

  function startDrag(e: DragEvent, payload: DragPayload) {
    dragging.current = payload;
    e.dataTransfer.effectAllowed = payload.kind === "move" ? "move" : "copy";
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", "");
    if (payload.kind === "new") dragGhost(e, elementLabel(t, payload.type, source), elementInfo(payload.type).icon);
    else if (payload.kind === "section") dragGhost(e, t(`studio.sec_${payload.id}` as DashKey), SECTIONS.find((s) => s.id === payload.id)?.icon ?? "dashboard");
    else if (studio) {
      const node = findNode(studio.body, payload.id);
      if (node) dragGhost(e, node.name || elementLabel(t, node.type, node.source ?? source), elementInfo(node.type).icon);
    }
  }

  /** Where the pointer is among a layout's children: the index to drop before. */
  function indexAmong(parent: StudioNode, x: number, y: number): number {
    const kids = parent.children ?? [];
    const rtl = editLang === "ar";
    const across = parent.type === "row" || parent.type === "slider";
    for (let i = 0; i < kids.length; i++) {
      const el = board.current?.querySelector(`[data-studio-node="${kids[i]!.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (parent.type === "grid") {
        if (y < r.top) return i;
        if (y <= r.bottom && (rtl ? x > r.left + r.width / 2 : x < r.left + r.width / 2)) return i;
      } else if (across) {
        if (rtl ? x > r.left + r.width / 2 : x < r.left + r.width / 2) return i;
      } else if (y < r.top + r.height / 2) return i;
    }
    return kids.length;
  }

  /** The place a dragged element would land, over this element. */
  function dropOver(e: DragEvent, node: StudioNode, layers: boolean) {
    if (!studio || !dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = dragging.current.kind === "move" ? "move" : "copy";
    const moving = dragging.current.kind === "move" ? dragging.current.id : null;
    let target: { parentId: string; index: number } | null = null;
    if (holdsChildren(node) && !layers) target = { parentId: node.id, index: indexAmong(node, e.clientX, e.clientY) };
    else {
      const place = placeOf(studio.body, node.id);
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (layers && holdsChildren(node) && e.clientY > box.top + box.height * 0.3 && e.clientY < box.bottom - box.height * 0.3) target = { parentId: node.id, index: node.children?.length ?? 0 };
      else if (place) {
        const across = !layers && (place.parent.type === "row" || place.parent.type === "slider");
        const rtl = editLang === "ar";
        const after = across ? (rtl ? e.clientX < box.left + box.width / 2 : e.clientX > box.left + box.width / 2) : e.clientY > box.top + box.height / 2;
        target = { parentId: place.parent.id, index: place.index + (after ? 1 : 0) };
      } else target = { parentId: studio.body.id, index: studio.body.children?.length ?? 0 };
    }
    if (target && moving && isInside(studio.body, target.parentId, moving)) target = null;
    // Cards inside a list take their elements from the list's design, not from drops.
    const parent = target ? findNode(studio.body, target.parentId) : null;
    if (parent?.type === "items") target = null;
    if (target?.parentId !== drop?.parentId || target?.index !== drop?.index) setDrop(target);
  }

  function dropHere(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragging.current ?? readPayload(e);
    const at = drop;
    dragging.current = null;
    setDrop(null);
    if (!payload || !at || !studio) return;
    if (payload.kind === "move") {
      changePage((p) => moveNode(p, payload.id, at.parentId, at.index));
      setSelectedId(payload.id);
    } else add(payload, at);
  }

  function endDrag() {
    dragging.current = null;
    setDrop(null);
  }

  // ——— Motion preview: plays the selected element's entrance once ———

  function playMotion() {
    if (!selected) return;
    const el = board.current?.querySelector<HTMLElement>(`[data-studio-node="${selected.id}"]`);
    const m = selected.motion;
    if (!el || !m) return;
    const rtl = editLang === "ar";
    const from: Record<string, Keyframe> = {
      fade: { opacity: 0 },
      slide_up: { opacity: 0, transform: "translateY(24px)" },
      slide_down: { opacity: 0, transform: "translateY(-24px)" },
      slide_start: { opacity: 0, transform: `translateX(${rtl ? 24 : -24}px)` },
      slide_end: { opacity: 0, transform: `translateX(${rtl ? -24 : 24}px)` },
      zoom: { opacity: 0, transform: "scale(0.85)" },
    };
    const first = m.enter && m.enter !== "none" ? from[m.enter] : null;
    if (first) el.animate([first, { opacity: 1, transform: "none" }], { duration: m.duration_ms ?? 400, delay: m.delay_ms ?? 0, easing: "cubic-bezier(.2,.8,.2,1)" });
    const loops: Record<string, Keyframe[]> = {
      pulse: [{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }],
      float: [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }],
      shake: [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }],
    };
    const loop = m.loop && m.loop !== "none" ? loops[m.loop] : null;
    if (loop) el.animate(loop, { duration: 1200, iterations: 2, delay: (m.delay_ms ?? 0) + (first ? (m.duration_ms ?? 400) : 0) });
  }

  // ——— Pages ———

  function addPage() {
    const title = newTitle.trim();
    if (!title) return;
    const pageSlug = uniqueSlug(title, layout.pages.map((p) => p.slug));
    const fresh: LayoutPage = { slug: pageSlug, title, show_title: false, updated_at: new Date().toISOString(), blocks: [], studio: TEMPLATES.find((x) => x.id === "blank")!.make(sectionContext) };
    change((current) => ({ ...current, pages: [...current.pages, fresh] }));
    setSlug(pageSlug);
    setSelectedId(null);
    setNewTitle("");
    setPagesOpen(false);
  }

  async function saveTemplate(name: string): Promise<string | null> {
    if (!studio) return null;
    const r = await saveStudioTemplateAction(name, JSON.stringify(studio));
    if (!r.ok) return known(r.error);
    setMyTemplates((list) => [r.template, ...list]);
    return null;
  }

  async function deleteTemplate(id: string) {
    const r = await deleteStudioTemplateAction(id);
    if (r.ok) setMyTemplates((list) => list.filter((x) => x.id !== id));
  }

  // ——— Labels ———

  const headerNumber = (type: StudioHeader["type"]) => STUDIO_HEADER_TYPES.indexOf(type) + 1;
  const nodeLabel = (node: StudioNode) => node.name || elementLabel(t, node.type, node.source ?? source);
  const tagOf = (node: StudioNode) => (node.id === "header" && studio?.header ? t("studio.headerType", { n: headerNumber(studio.header.type) }) : nodeLabel(node));
  const parentLabel = (() => {
    if (!studio || !selected) return "";
    const place = placeOf(studio.body, selected.id);
    return place && place.parent.id !== studio.body.id ? nodeLabel(place.parent) : t("studio.pageRoot");
  })();

  const editing: StudioEditing = {
    selectedId,
    hoveredId,
    drop,
    onSelect: (id) => {
      setSelectedId(id);
      setPagesOpen(false);
    },
    onHover: setHoveredId,
    onDragOver: (e, node) => dropOver(e, node, false),
    onDrop: dropHere,
    onDragStartNode: (e, id) => startDrag(e, { kind: "move", id }),
    dropLabel: t("studio.dropHere"),
    tagOf,
    // 108.1 One drag of a corner is one undo step.
    onResize: (id, size, drag) => changePage((p) => updateNode(p, id, size), `resize:${id}:${drag}`),
  };

  const savedText = (() => {
    if (status === "saving") return t("studio.saving");
    if (status === "invalid") return t("studio.saveFailed", { problem: problem ?? "" });
    if (status === "unsaved") return problem ? t("studio.saveFailed", { problem }) : t("studio.unsaved");
    const seconds = Math.max(0, (now - new Date(savedAt).getTime()) / 1000);
    if (seconds < 60) return t("studio.savedJustNow");
    return t("studio.saved", { time: new Date(savedAt).toLocaleTimeString(dashLang, { hour: "numeric", minute: "2-digit" }) });
  })();

  const frame = DEVICES[device];
  const languages = layout.languages.available;

  return (
    <div className="studio flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden" style={{ fontFamily: "var(--font-studio), 'Cairo', system-ui, sans-serif", color: C.ink, background: C.board }} onDragEnd={endDrag}>
      <header className="flex flex-wrap items-center gap-4 px-5 py-2.5" style={{ background: C.ink, color: C.ivory }}>
        <Link href="/studio/project" className="flex items-center gap-2.5 no-underline" style={{ color: C.ivory }} title={t("studio.back")}>
          <StudioMark />
        </Link>

        <div className="relative">
          <button type="button" aria-expanded={pagesOpen} aria-haspopup="true" onClick={() => setPagesOpen((v) => !v)} className="flex items-center gap-1.5 rounded-[10px] border-0 px-3 py-1.5 text-sm" style={{ background: C.barSoft, color: C.ivory }}>
            <Glyph name="description" size={18} />
            <span>{t("studio.page", { page: page ? pageTitle(page) : "" })}</span>
            <Glyph name="expand_more" size={18} />
          </button>
          {pagesOpen ? (
            <div role="menu" className="absolute top-full z-30 mt-1.5 flex w-[260px] flex-col gap-1 rounded-xl bg-white p-2 text-sm shadow-[0_14px_30px_rgba(14,13,36,0.25)]" style={{ insetInlineStart: 0, color: C.ink, border: `1px solid ${C.line}` }}>
              {layout.pages.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  role="menuitemradio"
                  aria-checked={p.slug === page?.slug}
                  onClick={() => {
                    setSlug(p.slug);
                    setSelectedId(null);
                    setPagesOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border-0 px-2.5 py-2 text-start"
                  style={{ background: p.slug === page?.slug ? C.ivory : "transparent", fontWeight: p.slug === page?.slug ? 700 : 400 }}
                >
                  <Glyph name={p.studio ? "dashboard_customize" : "description"} size={18} />
                  <span className="min-w-0 flex-1 truncate">{pageTitle(p)}</span>
                </button>
              ))}
              <form
                className="mt-1 flex gap-1.5 pt-2"
                style={{ borderTop: `1px solid ${C.line}` }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addPage();
                }}
              >
                <input aria-label={t("studio.newPageName")} placeholder={t("studio.newPage")} value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg px-2.5 text-sm" style={{ border: `1px solid ${C.line}` }} />
                <button type="submit" aria-label={t("studio.addPage")} title={t("studio.addPage")} className="flex size-9 items-center justify-center rounded-lg border-0" style={{ background: C.ink, color: C.ivory }}>
                  <Glyph name="add" size={20} />
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <div role="group" aria-label={t("studio.phone")} className="flex items-center gap-1 rounded-[10px] p-1" style={{ background: C.barSoft }}>
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-label={t(d === "small" ? "studio.smallPhone" : d === "phone" ? "studio.phone" : "studio.tablet")}
              title={t(d === "small" ? "studio.smallPhone" : d === "phone" ? "studio.phone" : "studio.tablet")}
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className="flex h-8 w-9 items-center justify-center rounded-lg border-0"
              style={{ background: device === d ? C.ivory : "transparent", color: device === d ? C.ink : C.barMuted }}
            >
              <Glyph name={DEVICES[d].icon} size={DEVICES[d].iconSize} />
            </button>
          ))}
        </div>

        <div role="group" aria-label={t("studio.language")} className="flex items-center gap-1 rounded-[10px] p-1" style={{ background: C.barSoft }}>
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={editLang === code}
              onClick={() => setLang(code)}
              className="h-8 rounded-lg border-0 px-2.5 text-[13px]"
              style={{ background: editLang === code ? C.ivory : "transparent", color: editLang === code ? C.ink : C.barMuted, fontWeight: editLang === code ? 700 : 400 }}
            >
              {code === "ar" ? "عربي" : code.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ flex: "1 1 20px" }} />

        <button type="button" aria-label={t("studio.undo")} title={t("studio.undo")} disabled={!history.past.length} onClick={() => step(true)} className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent" style={{ color: history.past.length ? C.ivory : C.barMuted }}>
          <Glyph name="undo" />
        </button>
        <button type="button" aria-label={t("studio.redo")} title={t("studio.redo")} disabled={!history.future.length} onClick={() => step(false)} className="flex size-9 items-center justify-center rounded-lg border-0 bg-transparent" style={{ color: history.future.length ? C.ivory : C.barMuted }}>
          <Glyph name="redo" />
        </button>
        <div role="status" aria-live="polite" className="flex max-w-[320px] items-center gap-1.5 text-[13px]" style={{ color: status === "invalid" ? "#FFB49A" : C.barMuted }}>
          <Glyph name={status === "saved" ? "cloud_done" : status === "saving" ? "cloud_sync" : status === "invalid" ? "error" : "cloud_upload"} size={16} />
          <span className="truncate" suppressHydrationWarning>
            {notice ?? savedText}
          </span>
        </div>
        <a href={props.previewHref} target="_blank" rel="noopener" className="flex h-[38px] items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold no-underline" style={{ border: `1px solid ${C.barLine}`, color: C.ivory }}>
          <Glyph name="play_arrow" size={18} />
          {t("studio.previewOnPhone")}
          <span className="sr-only">{t("common.opensInNewTab")}</span>
        </a>
        <button type="button" onClick={() => void publish()} disabled={publishing || status === "invalid"} className="flex h-[38px] items-center gap-1.5 rounded-[10px] border-0 px-[18px] text-sm font-extrabold disabled:opacity-60" style={{ background: C.accent, color: C.ink }}>
          <Glyph name="rocket_launch" size={18} />
          {publishing ? t("studio.publishing") : t("studio.publish")}
        </button>
      </header>

      <div className="flex min-h-0 flex-auto flex-wrap items-stretch lg:flex-nowrap">
        <LeftPanel
          tab={leftTab}
          onTab={setLeftTab}
          source={source}
          page={studio}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onAddElement={(type) => add({ kind: "new", type })}
          onAddSection={(id) => add({ kind: "section", id })}
          onUseTemplate={applyTemplate}
          onUseMyTemplate={(tpl) => startWith(() => structuredClone(tpl.page))}
          onDeleteMyTemplate={(id) => void deleteTemplate(id)}
          myTemplates={myTemplates}
          sections={kindSections}
          templates={kindTemplates}
          onDragStart={startDrag}
          onLayerDragOver={(e, node) => dropOver(e, node, true)}
          onLayerDrop={dropHere}
          drop={drop}
        />

        <main
          ref={board}
          aria-label={t("studio.canvasLabel")}
          className="flex min-h-0 min-w-0 flex-col items-center overflow-auto px-4 pt-5 pb-7"
          style={{ flex: "999 1 560px", backgroundColor: C.board, backgroundImage: `radial-gradient(${C.dot} 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
          onClick={() => setSelectedId(null)}
          onMouseLeave={() => setHoveredId(null)}
          onDragOver={(e) => {
            if (studio && dragging.current) dropOver(e, studio.body, false);
          }}
          onDrop={dropHere}
        >
          <div className="mb-3.5 flex flex-wrap items-center justify-center gap-2 text-[13px]">
            <Chip icon="pan_tool">{t("studio.dragHint")}</Chip>
            <div className="relative">
              <Chip icon="zoom_in" onClick={(e) => {
                  e.stopPropagation();
                  setZoomOpen((v) => !v);
                }} label={t("studio.zoom")} expanded={zoomOpen}>
                <span dir="ltr">{zoom}%</span>
              </Chip>
              {zoomOpen ? (
                <div role="menu" className="absolute top-full z-20 mt-1 flex flex-col rounded-xl bg-white p-1 shadow-[0_10px_24px_rgba(14,13,36,0.18)]" style={{ insetInlineStart: 0, border: `1px solid ${C.line}` }}>
                  {ZOOMS.map((z) => (
                    <button
                      key={z}
                      type="button"
                      role="menuitemradio"
                      aria-checked={zoom === z}
                      dir="ltr"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoom(z);
                        setZoomOpen(false);
                      }}
                      className="rounded-lg border-0 px-4 py-1.5 text-[13px]"
                      style={{ background: zoom === z ? C.ivory : "transparent", fontWeight: zoom === z ? 700 : 400 }}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Chip icon={dark ? "light_mode" : "dark_mode"} onClick={(e) => {
                e.stopPropagation();
                setDark((v) => !v);
              }} pressed={dark} label={dark ? t("studio.dark") : t("studio.light")}>
              {t("studio.lightDark")}
            </Chip>
            <div className="relative">
              <Chip icon="keyboard" onClick={(e) => {
                  e.stopPropagation();
                  setShortcutsOpen((v) => !v);
                }} label={t("studio.shortcuts")} expanded={shortcutsOpen}>
                {t("studio.shortcuts")}
              </Chip>
              {shortcutsOpen ? <Shortcuts onClose={() => setShortcutsOpen(false)} /> : null}
            </div>
          </div>

          <div style={{ width: frame.width * (zoom / 100), height: frame.height * (zoom / 100), flex: "none" }}>
            <div style={{ width: frame.width, height: frame.height, transform: `scale(${zoom / 100})`, transformOrigin: "top left", borderRadius: frame.radius, background: C.ink, padding: 10, boxSizing: "border-box", boxShadow: "0 30px 60px rgba(14,13,36,0.25)" }} dir="ltr">
              <div className="studio-screen" style={{ width: "100%", height: "100%", borderRadius: frame.radius - 9, overflow: "hidden auto", position: "relative", background: dark ? "#14121F" : "#FBF8F2" }}>
                {studio ? (
                  <StudioView page={studio} lang={editLang} defaultLang={def} dark={dark} look={look} pickable={props.pickable} editing={editing} words={words} />
                ) : page ? (
                  <StartPage title={pageTitle(page)} regular={page.blocks.length > 0} onPick={applyTemplate} templates={kindTemplates} />
                ) : null}
              </div>
            </div>
          </div>

          {studio ? (
            <div className="mt-[18px] flex flex-wrap justify-center gap-2.5" onClick={(e) => e.stopPropagation()}>
              <div role="group" aria-label={t("studio.headerTypeLabel")} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs" style={{ border: `1px solid ${C.line}` }}>
                <span className="font-bold">{t("studio.headerTypeLabel")}</span>
                {STUDIO_HEADER_TYPES.map((type, i) => {
                  const on = studio.header?.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        changePage((p) => ({ ...p, header: p.header ? { ...p.header, type } : { type, buttons: ["menu", "notifications", "cart", "account"].filter((b) => b !== "cart" || source === "products") as StudioHeader["buttons"] } }));
                        setSelectedId("header");
                      }}
                      className="rounded-lg bg-white"
                      style={on ? { border: `2px solid ${C.select}`, padding: "2px 7px", color: "#1F3FB8", fontWeight: 700 } : { border: `1px solid ${C.line}`, padding: "3px 8px" }}
                    >
                      {t(`studio.header${i + 1}` as DashKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </main>

        {studio ? (
          <Inspector
            page={studio}
            node={selected}
            headerSelected={selectedId === "header"}
            parentLabel={parentLabel}
            tab={inspectorTab}
            onTab={setInspectorTab}
            onChange={(patch) => selected && changePage((p) => updateNode(p, selected.id, patch), `${selected.id}:${Object.keys(patch).join(",")}`)}
            onHeader={(header) => {
              changePage((p) => ({ ...p, header }), header ? "header" : "");
              if (!header) setSelectedId(null);
            }}
            onPage={(patch) => changePage((p) => ({ ...p, ...patch }), `page:${Object.keys(patch).join(",")}`)}
            onCopy={copySelected}
            onDelete={deleteSelected}
            tools={{
              onCopy: () => copyToClipboard(false),
              onCut: () => copyToClipboard(true),
              onPaste: pasteFromClipboard,
              onCopyStyle: copyStyle,
              onPasteStyle: pasteStyle,
              onMove: nudge,
              onSelectParent: selectParent,
              canPaste: hasCopied,
              canPasteStyle: hasStyle,
            }}
            onWrap={(type) => {
              if (!selected) return;
              const done = wrapNode(studio, selected.id, type, newNodeId);
              if (!done) return;
              changePage(() => done.page);
              setSelectedId(done.id);
            }}
            onPlayMotion={playMotion}
            onSaveTemplate={saveTemplate}
            palette={palette}
            lang={editLang}
            defaultLang={def}
            pages={layout.pages.map((p) => ({ slug: p.slug, title: pageTitle(p) }))}
            sources={props.sources}
            categorySources={props.categorySources}
            screens={props.screens}
            pickable={props.pickable}
            fontLabels={{ arabicOnly: t("common.fontsArabicOnly"), none: t("common.fontsNone"), sample: t("common.fontsSample"), hint: t("common.fontsHint", { count: props.fontCount }) }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** 107.1 Copying in another tab of the editor shows here too. */
function onStorage(changed: () => void): () => void {
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
}

/** 107.1 The editor's keyboard shortcuts, listed. */
function Shortcuts({ onClose }: { onClose: () => void }) {
  const t = useDashT();
  const rows: [string, string][] = [
    ["Ctrl C", t("studio.copy")],
    ["Ctrl X", t("studio.cut")],
    ["Ctrl V", t("studio.paste")],
    ["Ctrl D", t("studio.duplicate")],
    ["Ctrl Alt C", t("studio.copyStyle")],
    ["Ctrl Alt V", t("studio.pasteStyle")],
    ["Ctrl Z", t("studio.undo")],
    ["Ctrl Y", t("studio.redo")],
    ["Delete", t("studio.delete")],
    ["↑ ↓", t("studio.moveArrows")],
    ["Esc", t("studio.unselect")],
    ["⌟", t("studio.resizeCorner")],
    ["Shift ⌟", t("studio.resizeShift")],
    ["2× ⌟", t("studio.resizeReset")],
    ["?", t("studio.showShortcuts")],
  ];
  return (
    <div role="dialog" aria-label={t("studio.shortcuts")} onClick={(e) => e.stopPropagation()} className="absolute top-full z-20 mt-1 w-[290px] rounded-xl bg-white p-3 text-[13px] shadow-[0_10px_24px_rgba(14,13,36,0.18)]" style={{ insetInlineEnd: 0, border: `1px solid ${C.line}` }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold">{t("studio.shortcuts")}</span>
        <button type="button" aria-label={t("studio.close")} onClick={onClose} className="flex size-7 items-center justify-center rounded-lg border-0 bg-transparent">
          <Glyph name="close" size={18} />
        </button>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.map(([keys, what]) => (
          <div key={keys} className="contents">
            <dt dir="ltr" className="m-0 justify-self-start rounded-md px-1.5 font-mono text-xs" style={{ background: C.ivory, border: `1px solid ${C.line}` }}>
              {keys}
            </dt>
            <dd className="m-0">{what}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 mb-0 text-xs" style={{ color: C.muted }}>
        {t("studio.macCmd")}
      </p>
    </div>
  );
}

function readPayload(e: DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

/** The white pills above the phone. */
function Chip(props: { icon: string; children: ReactNode; onClick?: (e: MouseEvent) => void; label?: string; pressed?: boolean; expanded?: boolean }) {
  const style = { background: "#FFFFFF", border: `1px solid ${C.line}`, color: C.ink };
  const inner = (
    <>
      <Glyph name={props.icon} size={16} />
      {props.children}
    </>
  );
  if (!props.onClick) {
    return (
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={style}>
        {inner}
      </div>
    );
  }
  return (
    <button type="button" onClick={props.onClick} title={props.label} aria-pressed={props.pressed} aria-expanded={props.expanded} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]" style={style}>
      {inner}
    </button>
  );
}

/** A page that isn't designed in Studio yet: how it starts. */
function StartPage({ title, regular, onPick, templates }: { title: string; regular: boolean; onPick: (id: string) => void; templates: readonly TemplateInfo[] }) {
  const t = useDashT();
  const rtl = useDashLang() === "ar";
  return (
    <div className="flex flex-col gap-3 px-4 pt-10 pb-6" dir={rtl ? "rtl" : "ltr"} style={{ color: C.ink }}>
      <h2 className="m-0 text-lg font-extrabold">{t("studio.startTitle", { page: title })}</h2>
      <p className="m-0 text-[13px]" style={{ color: C.muted }}>
        {t("studio.startIntro")}
      </p>
      {regular ? (
        <p className="m-0 rounded-xl px-3 py-2 text-xs" style={{ background: C.ivory, color: C.muted }}>
          {t("studio.regularPage", { page: title })}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {templates.map((tpl) => (
          <button key={tpl.id} type="button" onClick={() => onPick(tpl.id)} className="flex flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-3 text-[13px] font-bold" style={{ border: `1px solid ${C.line}` }}>
            <Glyph name={tpl.icon} size={26} className="text-[#FF5A1F]" />
            {t(`studio.tpl_${tpl.id}` as DashKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
