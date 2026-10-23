"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { applyDesignAction, discardLayoutDraftAction, publishLayoutAction, restoreLayoutVersionAction, saveLayoutDraftAction, type LayoutSaveResult } from "@/app/actions/pages";
import type { LayoutHistoryEntry } from "@/lib/pages/layout";
import { Badge, btn, formatDateTime } from "@/components/ui";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { newBlockId } from "@/lib/pages/defaults";
import { devicesWithout, type AppVersionCount } from "@/lib/pages/reach";
import type { Palette } from "@/lib/pages/designs/build";
import { blockTexts } from "@/lib/pages/designs/texts";
import { BLOCK_GROUPS, BLOCK_HINTS, BLOCK_ICONS, BLOCK_LABELS, CARD_LABELS, CORNER_LABELS, TEMPLATE_LABELS, THEME_MODE_LABELS } from "@/lib/pages/labels";
import { duplicatePage, moveItem, newBlock, pageLinks, renamePageLinks, switchDefaultLanguage, uniqueSlug } from "@/lib/pages/model";
import { actionProblem, blockProblem, type ScreenOption } from "@/lib/pages/sources";
import { translated } from "@/lib/pages/translate";
import {
  APP_FONTS,
  APP_TEMPLATES,
  CARD_STYLES,
  CORNERS,
  LAYOUT_LIMITS,
  THEME_MODES,
  type Appearance,
  type BlockType,
  type ItemSource,
  type LanguageCode,
  type Languages,
  type LayoutBlock,
  type LayoutContent,
  type LayoutPage,
  type LayoutTab,
} from "@/lib/pages/types";
import { BlockSettings, type BlockContext } from "./block-settings";
import { ActionEditor, Check, firstScreen, IconGlyph, IconPicker, LangText, OwnIcon, SelectInput, TextInput, type Lang } from "./controls";
import { BLOCK_DRAG_TYPE, DesignThumb, PhonePreview } from "./preview";
import { LivePreview, notifyDraftSaved } from "./live-preview";
import { UpgradeHint } from "@/components/upgrade";
import { MAX_LANGUAGES } from "@/lib/i18n/locales";
import { appLanguageName } from "@/lib/i18n/language-names";
import { useDashFormat, useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { formatList } from "@/i18n/format";
import { richText } from "@/i18n/rich";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { SOURCE_NAMES } from "@/lib/pages/sources";
import { LanguageList } from "../languages/language-list";
import type { Plan } from "@/lib/plans";

/** 13.1 What the app's plan allows in the editor. */
export interface EditorPlan {
  name: string;
  /** The full page editor; without it the app gets the ready-made pages and tabs (`ready`). */
  pageEditor: boolean;
  /** App languages, English included (null: all). */
  languages: number | null;
  upgradeEditor: { id: Plan; name: string } | null;
  upgradeLanguages: { id: Plan; name: string } | null;
}

type Panel = "pages" | "tabs" | "look" | "languages";
type Status = "saved" | "saving" | "unsaved" | "invalid";

const PANELS: { id: Panel; label: DashKey }[] = [
  { id: "pages", label: "pages.panelPages" },
  { id: "tabs", label: "pages.panelTabs" },
  { id: "look", label: "pages.panelLook" },
  { id: "languages", label: "pages.panelLanguages" },
];

const TEMPLATE_TEXT: Record<(typeof APP_TEMPLATES)[number], DashKey> = {
  classic: "pages.templateClassic",
  bold: "pages.templateBold",
  minimal: "pages.templateMinimal",
};

/**
 * 56 A problem the layout's check found ("Page "Home", block 2 (Banner): The
 * heading can have at most 200 characters."): where it is and what it is, each
 * in the dashboard's language when the words are known.
 */
function layoutProblem(text: string, t: DashT, known: (english: string) => string): string {
  const match = text.match(/^(.*): ([A-Z][^:]*)$/);
  if (!match) return known(text);
  const where = match[1]!
    .replace(/Page "(.*?)"/g, (_, name: string) => t("pages.wherePage", { name }))
    .replace(/Page (\d+)/g, (_, n: string) => t("pages.wherePageN", { n }))
    .replace(/block (\d+)/g, (_, n: string) => t("pages.whereBlock", { n }))
    .replace(/Tab (\d+)/g, (_, n: string) => t("pages.whereTab", { n }))
    .replace(/\(([^)]+)\)/g, (_, name: string) => `(${known(name)})`)
    .replace(/^(Look|Languages|Tabs)$/, (name) => known(name));
  return `${where}: ${known(match[2]!)}`;
}

const AUTOSAVE_MS = 1200;

function summary(block: LayoutBlock): string {
  const text = block.heading || block.text || block.label || block.title || block.placeholder || (block.html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 48) : "";
}

/** 82.5 A tab or menu entry with (or, null, without) the owner's own icon. */
function withIconUrl(tab: LayoutTab, iconUrl: string | null): LayoutTab {
  if (iconUrl) return { ...tab, icon_url: iconUrl };
  const { icon_url: _drop, ...rest } = tab;
  void _drop;
  return rest;
}

/** 82.5 The layout with this side menu; none stored when it's empty. */
function withMenu(layout: LayoutContent, menu: LayoutTab[]): LayoutContent {
  if (menu.length) return { ...layout, menu };
  const { menu: _drop, ...rest } = layout;
  void _drop;
  return rest;
}

/** 82.4 Changes this close together are one step to undo; and how many steps are kept. */
const UNDO_JOIN_MS = 1000;
const UNDO_STEPS = 50;
const clockMs = () => Date.now();

const sectionClass = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
const smallBtn = `${btn.secondary} h-9 px-3 text-sm`;
const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white text-midnight hover:border-midnight disabled:cursor-not-allowed disabled:opacity-40";

export function PagesEditor({
  initial,
  app,
  sources,
  categorySources,
  screens,
  blockTypes,
  pickable,
  versions,
  reach,
  plan,
  ready,
  designs,
  builtin,
  live,
}: {
  initial: {
    draft: LayoutContent;
    savedAt: string;
    published: { version: string; at: string } | null;
    changes: boolean;
    /** 33 The design the app last started from, and the sample texts it wrote (`page/block` IDs). */
    design: string | null;
    samples: Record<string, string>;
    /** 82.4 The app's last publishes, newest first. */
    history: LayoutHistoryEntry[];
  };
  app: { appType: string; name: string; primaryColor: string; logoUrl: string | null };
  sources: ItemSource[];
  categorySources: ItemSource[];
  /** 31 The screens this app's type opens. */
  screens: ScreenOption[];
  blockTypes: BlockType[];
  pickable: Pickable;
  /** 83.2 The app's versions on people's phones, to say who won't see a block until they update. */
  versions: AppVersionCount[];
  reach: string | null;
  plan: EditorPlan;
  /** The ready-made pages and tabs the app gets without the full page editor. */
  ready: Pick<LayoutContent, "pages" | "tabs">;
  /** 33 The ready-made designs for the app's kind, each as the draft it would make. */
  designs: { id: string; name: string; description: string; layout: LayoutContent; palettes: Palette[] }[];
  /** 43 Yallapp's translations of the texts it wrote, for the phone preview. */
  builtin: Record<string, Record<string, string>>;
  /** 82.1 The app preview's address with the draft (hosted apps); null shows the quick view only. */
  live: string | null;
}) {
  const t = useDashT();
  const known = useKnownText();
  const dashLang = useDashLang();
  const { num } = useDashFormat();
  const languageName = (code: string) => appLanguageName(code, dashLang);
  const [layout, setLayout] = useState<LayoutContent>(initial.draft);
  const [published, setPublished] = useState(initial.published);
  const [changes, setChanges] = useState(initial.changes);
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [status, setStatus] = useState<Status>("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<Panel>(plan.pageEditor ? "pages" : "look");
  const [editLang, setEditLang] = useState<LanguageCode>(initial.draft.languages.default);
  const [pageSlug, setPageSlug] = useState<string | null>(initial.draft.pages[0]?.slug ?? null);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [samples, setSamples] = useState(initial.samples);
  const [currentDesign, setCurrentDesign] = useState(initial.design);
  // Open for an app that hasn't started from a design yet.
  const [designsOpen, setDesignsOpen] = useState(initial.design === null && !initial.published);
  /** Edits not saved yet; each save only clears the edits it sent. */
  const edits = useRef(0);
  const dirty = useRef(false);
  // 82.1 The real app beside the editor, told about each save; or the quick view.
  const frames = useRef<HTMLDivElement | null>(null);
  // 82.4 Undo and redo: the drafts before (and after) each change, here only; and the publish history.
  const [steps, setSteps] = useState<{ past: LayoutContent[]; future: LayoutContent[] }>({ past: [], future: [] });
  const lastChange = useRef(0);
  const [history, setHistory] = useState(initial.history);
  const [view, setView] = useState<"app" | "sketch">(live ? "app" : "sketch");

  const def = layout.languages.default;
  // Without the full page editor, the app (and the preview) shows the ready-made pages with this look.
  const shown: LayoutContent = plan.pageEditor ? layout : { ...layout, pages: ready.pages, tabs: ready.tabs };
  const languagesFull = plan.languages !== null && layout.languages.available.length >= plan.languages;
  const lang: Lang = { edit: layout.languages.available.includes(editLang) ? editLang : def, default: def };
  const page = layout.pages.find((p) => p.slug === pageSlug) ?? layout.pages[0] ?? null;
  const pages = layout.pages.map((p) => ({ slug: p.slug, title: p.title }));
  const blockCtx: BlockContext = { lang, pages, sources, categorySources, screens, pickable };

  const applied = useCallback((r: LayoutSaveResult, sent: number, replace: boolean) => {
    if (!r.ok) {
      if (edits.current === sent) setStatus("invalid");
      setErrors(r.errors);
      return;
    }
    setPublished(r.published);
    setSavedAt(r.savedAt);
    setErrors([]);
    notifyDraftSaved(frames.current);
    if (replace) {
      dirty.current = false;
      setLayout(r.draft);
      // 82.4 A draft replaced from the server starts its own undo history.
      setSteps({ past: [], future: [] });
    }
    if (r.history) setHistory(r.history);
    if (edits.current === sent) {
      dirty.current = false;
      setStatus("saved");
      setChanges(r.changes);
    }
  }, []);

  const save = useCallback(
    async (draft: LayoutContent) => {
      const sent = edits.current;
      setStatus("saving");
      try {
        applied(await saveLayoutDraftAction(JSON.stringify(draft)), sent, false);
      } catch {
        setStatus("unsaved");
        setErrors([t("pages.cantSave")]);
      }
    },
    [applied, t],
  );

  // Saves the draft a moment after the last change.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => void save(layout), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [layout, save]);

  function update(change: (current: LayoutContent) => LayoutContent) {
    // 82.4 Typing in a field is one step: changes less than a second apart join the one before.
    const now = clockMs();
    const join = now - lastChange.current <= UNDO_JOIN_MS;
    lastChange.current = now;
    const before = layout;
    setSteps((st) => ({ past: join ? st.past : [...st.past, before].slice(-UNDO_STEPS), future: [] }));
    edits.current += 1;
    dirty.current = true;
    setStatus("unsaved");
    setMessage(null);
    setLayout(change);
  }

  /** 82.4 Back (or forward again) one step; the draft is saved as after any change. */
  function step(back: boolean) {
    const from = back ? steps.past : steps.future;
    const target = from.at(-1);
    if (!target) return;
    const rest = from.slice(0, -1);
    const now = layout;
    setSteps(back ? { past: rest, future: [...steps.future, now] } : { past: [...steps.past, now], future: rest });
    lastChange.current = 0;
    edits.current += 1;
    dirty.current = true;
    setStatus("unsaved");
    setMessage(null);
    setLayout(target);
  }

  // 82.4 Ctrl+Z (⌘Z), and Ctrl+Shift+Z or Ctrl+Y, outside the fields (which undo their own typing).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      step(key === "z" && !event.shiftKey);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** 82.4 An earlier publish as the draft. */
  async function restore(entry: LayoutHistoryEntry) {
    if (!window.confirm(t("pages.restoreConfirm", { date: formatDateTime(new Date(entry.at), dashLang) }))) return;
    setBusy(true);
    edits.current += 1;
    const sent = edits.current;
    try {
      const r = await restoreLayoutVersionAction(entry.number);
      applied(r, sent, true);
      setMessage(r.ok ? { text: r.message ? known(r.message) : t("pages.restored"), ok: true } : { text: r.errors.map((e) => known(e)).join(" "), ok: false });
      if (r.ok) {
        setPageSlug(r.draft.pages[0]?.slug ?? null);
        setOpenBlock(null);
      }
    } finally {
      setBusy(false);
    }
  }

  function updatePage(slug: string, change: (p: LayoutPage) => LayoutPage) {
    update((l) => ({ ...l, pages: l.pages.map((p) => (p.slug === slug ? change(p) : p)) }));
  }

  function updateBlocks(slug: string, change: (blocks: LayoutBlock[]) => LayoutBlock[]) {
    updatePage(slug, (p) => ({ ...p, blocks: change(p.blocks) }));
  }

  async function publish() {
    setBusy(true);
    const sent = edits.current;
    try {
      const r = await publishLayoutAction(JSON.stringify(layout));
      applied(r, sent, edits.current === sent);
      setMessage(r.ok ? { text: r.message ? known(r.message) : t("pages.published"), ok: true } : { text: t("pages.notPublished"), ok: false });
    } catch {
      setMessage({ text: t("pages.cantPublish"), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!window.confirm(published ? t("pages.discardPublished") : t("pages.discardStarting"))) return;
    setBusy(true);
    edits.current += 1;
    const sent = edits.current;
    try {
      const r = await discardLayoutDraftAction();
      applied(r, sent, true);
      if (r.ok) {
        setMessage({ text: r.message ? known(r.message) : t("pages.discarded"), ok: true });
        setEditLang(r.draft.languages.default);
      }
    } finally {
      setBusy(false);
    }
  }

  // 33 Ready-made designs

  // 84.2 The colours chosen on each design's card (its own until another is picked).
  const [palettes, setPalettes] = useState<Record<string, string>>({});

  async function chooseDesign(id: string, name: string) {
    if (!window.confirm(t("pages.replaceDesign", { name }))) return;
    setBusy(true);
    edits.current += 1;
    const sent = edits.current;
    try {
      // 84.2 With the colours chosen on its card.
      const r = await applyDesignAction(id, palettes[id]);
      applied(r, sent, true);
      if (r.ok) {
        setSamples(r.samples ?? {});
        setCurrentDesign(id);
        setPageSlug(r.draft.pages[0]?.slug ?? null);
        setOpenBlock(null);
        setDesignsOpen(false);
        setMessage({ text: r.message ? known(r.message) : t("pages.designApplied"), ok: true });
      } else {
        setMessage({ text: r.errors[0] ? known(r.errors[0]) : t("pages.designFailed"), ok: false });
      }
    } catch {
      setMessage({ text: t("pages.cantApply"), ok: false });
    } finally {
      setBusy(false);
    }
  }

  // Pages

  function addPage() {
    const title = newTitle.trim();
    if (!title) return;
    if (layout.pages.length >= LAYOUT_LIMITS.maxPages) {
      setMessage({ text: t("pages.maxPages", { max: LAYOUT_LIMITS.maxPages }), ok: false });
      return;
    }
    const slug = uniqueSlug(title, layout.pages.map((p) => p.slug));
    update((l) => ({ ...l, pages: [...l.pages, { slug, title: title.slice(0, 60), show_title: true, updated_at: new Date().toISOString(), blocks: [] }] }));
    setPageSlug(slug);
    setNewTitle("");
  }

  function deletePage(p: LayoutPage) {
    const links = pageLinks(layout, p.slug);
    if (links.length) {
      setMessage({ text: t("pages.cantDelete", { page: p.title, links: formatList(dashLang, links) }), ok: false });
      return;
    }
    update((l) => ({ ...l, pages: l.pages.filter((x) => x.slug !== p.slug) }));
    if (pageSlug === p.slug) setPageSlug(layout.pages.find((x) => x.slug !== p.slug)?.slug ?? null);
  }

  function duplicate(p: LayoutPage) {
    if (layout.pages.length >= LAYOUT_LIMITS.maxPages) return;
    const copy = duplicatePage(p, layout.pages.map((x) => x.slug), new Date());
    update((l) => {
      const at = l.pages.findIndex((x) => x.slug === p.slug);
      const next = [...l.pages];
      next.splice(at + 1, 0, copy);
      return { ...l, pages: next };
    });
    setPageSlug(copy.slug);
  }

  function changeSlug(p: LayoutPage, raw: string) {
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
    if (slug === p.slug || layout.pages.some((x) => x.slug === slug && x !== p)) return;
    update((l) => renamePageLinks(l, p.slug, slug));
    setPageSlug(slug);
  }

  // Blocks

  /** Adds a block at the end, or (82.2, dropped on the phone) before the block at `at`. */
  function addBlock(type: BlockType, at?: number) {
    if (!page || !blockTypes.includes(type)) return;
    if (page.blocks.length >= LAYOUT_LIMITS.maxBlocks) {
      setMessage({ text: t("pages.maxBlocks", { max: LAYOUT_LIMITS.maxBlocks }), ok: false });
      return;
    }
    const block = newBlock(type, sources, screens);
    updateBlocks(page.slug, (blocks) => (at === undefined ? [...blocks, block] : [...blocks.slice(0, at), block, ...blocks.slice(at)]));
    setOpenBlock(block.id);
  }

  /** 82.2 A block clicked on the phone: open in the list, in view. */
  function selectBlock(id: string) {
    setPanel("pages");
    setOpenBlock(id);
    requestAnimationFrame(() => document.getElementById(`block-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  function onDrop(event: DragEvent, to: number) {
    event.preventDefault();
    if (page && dragFrom !== null) updateBlocks(page.slug, (blocks) => moveItem(blocks, dragFrom, to));
    setDragFrom(null);
  }

  // Tabs

  // 82.5 The side menu.
  const menu = layout.menu ?? [];
  function addMenuEntry() {
    if (menu.length >= LAYOUT_LIMITS.maxMenu) return;
    update((l) =>
      withMenu(l, [...(l.menu ?? []), { id: newBlockId("m"), label: "", icon: "info", target: l.pages[0] ? { type: "page", page_slug: l.pages[0].slug } : { type: "screen", screen: firstScreen(screens) } }]),
    );
  }

  function addTab() {
    if (layout.tabs.length >= LAYOUT_LIMITS.maxTabs) return;
    update((l) => ({
      ...l,
      tabs: [...l.tabs, { id: newBlockId("t"), label: "", icon: "star", target: l.pages[0] ? { type: "page", page_slug: l.pages[0].slug } : { type: "screen", screen: firstScreen(screens) } }],
    }));
  }

  // Look and languages

  const setLook = (patch: Partial<Appearance>) => update((l) => ({ ...l, appearance: { ...l.appearance, ...patch } }));

  // 43 Added, removed, reordered or a new default; a new default takes its translations as the main texts.
  function changeLanguages(next: Languages, defaultTo?: string) {
    update((l) => {
      const base = defaultTo ? switchDefaultLanguage(l, defaultTo) : l;
      return { ...base, languages: { default: base.languages.default, available: next.available } };
    });
    if (defaultTo) setEditLang(defaultTo);
    else if (!next.available.includes(editLang)) setEditLang(def);
  }

  const statusText =
    status === "saving"
      ? t("pages.saving")
      : status === "unsaved"
        ? t("pages.unsaved")
        : status === "invalid"
          ? t("pages.invalid")
          : t("pages.savedAt", { date: formatDateTime(new Date(savedAt), dashLang) });
  // 31 What a List block can show in this app: "Courses or blog posts".
  const listHint = sources.length ? formatList(dashLang, sources.map((s) => known(SOURCE_NAMES[s])), "disjunction") : t("pages.entriesFrom");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section aria-label={t("pages.draftSection")} className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p role="status" className="m-0 text-[15px] font-semibold">
                {statusText}
              </p>
              <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-muted">
                {published
                  ? t("pages.publishedVersion", { version: published.version, date: formatDateTime(new Date(published.at), dashLang) })
                  : t("pages.notYet")}
                {changes && published ? <Badge tone="warn">{t("pages.unpublished")}</Badge> : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 82.4 */}
              <button type="button" className={smallBtn} disabled={busy || steps.past.length === 0} aria-keyshortcuts="Control+Z" onClick={() => step(true)}>
                {t("pages.undo")}
              </button>
              <button type="button" className={smallBtn} disabled={busy || steps.future.length === 0} aria-keyshortcuts="Control+Shift+Z" onClick={() => step(false)}>
                {t("pages.redo")}
              </button>
              <button type="button" className={smallBtn} disabled={busy || status === "saving"} onClick={() => void save(layout)}>
                {t("pages.saveDraft")}
              </button>
              <button type="button" className={smallBtn} disabled={busy} onClick={() => void discard()}>
                {t("pages.discardDraft")}
              </button>
              <button type="button" className={`${btn.primary} h-9 px-4 text-sm`} disabled={busy} onClick={() => void publish()}>
                {busy ? t("pages.working") : t("pages.publish")}
              </button>
            </div>
          </div>
          {reach ? <p className="m-0 text-sm text-muted">{reach}</p> : null}
          {layout.languages.available.length > 1 ? (
            <div className="max-w-[280px]">
              <SelectInput
                id="edit-language"
                label={t("pages.editIn")}
                value={lang.edit}
                options={layout.languages.available.map((c) => ({ value: c, label: c === def ? t("pages.defaultLang", { language: languageName(c) }) : languageName(c) }))}
                onChange={setEditLang}
              />
            </div>
          ) : null}
          {errors.length ? (
            <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[15px] text-danger">
              <p className="m-0 font-semibold">{t("pages.fix")}</p>
              <ul className="m-0 mt-1 list-disc ps-5">
                {errors.map((e, i) => (
                  <li key={i}>{layoutProblem(e, t, known)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* 82.4 The last publishes, to go back to. */}
          {history.length ? (
            <details className="rounded-xl border border-line px-4 py-2">
              <summary className="cursor-pointer text-[15px] font-semibold">{t("pages.history", { count: history.length })}</summary>
              <ul aria-label={t("pages.historyList")} className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {history.map((entry) => {
                  const live = published?.version.endsWith(`.${entry.number}`) ?? false;
                  return (
                    <li key={entry.number} className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        {entry.by ? t("pages.historyEntryBy", { date: formatDateTime(new Date(entry.at), dashLang), email: entry.by }) : t("pages.historyEntry", { date: formatDateTime(new Date(entry.at), dashLang) })}
                        {live ? <Badge tone="success">{t("pages.historyLive")}</Badge> : null}
                      </span>
                      <button
                        type="button"
                        className={smallBtn}
                        disabled={busy}
                        aria-label={t("pages.useAsDraftNamed", { date: formatDateTime(new Date(entry.at), dashLang) })}
                        onClick={() => void restore(entry)}
                      >
                        {t("pages.useAsDraft")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
          {message ? (
            <p role={message.ok ? "status" : "alert"} className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${message.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
              {message.text}
            </p>
          ) : null}
        </section>

        <div role="tablist" aria-label={t("pages.edit")} className="flex flex-wrap gap-1 rounded-xl bg-white p-1">
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={panel === p.id}
              aria-controls={`panel-${p.id}`}
              onClick={() => setPanel(p.id)}
              className={`h-10 flex-1 rounded-lg px-4 text-[15px] ${panel === p.id ? "bg-midnight font-bold text-white" : "font-semibold text-ink-3 hover:bg-ivory"}`}
            >
              {t(p.label)}
            </button>
          ))}
        </div>

        {(panel === "pages" || panel === "tabs") && !plan.pageEditor ? (
          <section role="tabpanel" id={`panel-${panel}`} aria-labelledby={`tab-${panel}`} className={sectionClass}>
            <h2 className="m-0 text-lg font-bold">{panel === "pages" ? t("pages.panelPages") : t("pages.bottomTabs")}</h2>
            <p className="m-0 text-[15px] text-ink-4">{t("pages.readyMade", { plan: plan.name })}</p>
            <UpgradeHint
              title={t("pages.fullEditor")}
              to={plan.upgradeEditor}
              cta={plan.upgradeEditor ? t("overview.upgradeTo", { plan: plan.upgradeEditor.name }) : undefined}
            >
              {t("pages.fullEditorText")}
            </UpgradeHint>
          </section>
        ) : null}

        {panel === "pages" && plan.pageEditor ? (
          <div role="tabpanel" id="panel-pages" aria-labelledby="tab-pages" className="flex flex-col gap-5">
            {designs.length ? (
              <section aria-labelledby="h-designs" className={sectionClass}>
                <details open={designsOpen} onToggle={(e) => setDesignsOpen(e.currentTarget.open)}>
                  <summary className="cursor-pointer list-none">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <h2 id="h-designs" className="m-0 text-lg font-bold">
                        {t("pages.startDesign")}
                      </h2>
                      <span className={smallBtn}>{designsOpen ? t("pages.hideDesigns") : t("pages.showDesigns")}</span>
                    </span>
                    <span className="mt-1 block text-[15px] text-ink-4">{t("pages.designsText")}</span>
                  </summary>
                  <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
                    {designs.map((d) => (
                      <li key={d.id} className={`flex flex-col gap-2 rounded-xl border p-3 ${currentDesign === d.id ? "border-2 border-midnight" : "border-line"}`}>
                        <DesignThumb layout={{ ...d.layout, appearance: { ...d.layout.appearance, theme_mode: "light" } }} app={app} />
                        <span className="flex items-center gap-2 text-[15px] font-bold">
                          {known(d.name)}
                          {currentDesign === d.id ? <Badge tone="neutral">{t("pages.yourDesign")}</Badge> : null}
                        </span>
                        <span className="text-xs text-muted">{known(d.description)}</span>
                        {d.palettes.length ? (
                          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
                            <legend className="mb-1 p-0 text-xs font-semibold">{t("pages.colours")}</legend>
                            <span className="flex flex-wrap gap-2">
                              {d.palettes.map((p) => (
                                <label key={p.id} className="flex cursor-pointer items-center gap-1 rounded-lg border border-line px-1.5 py-1 has-[:checked]:border-midnight" title={known(p.name)}>
                                  <input
                                    type="radio"
                                    name={`palette-${d.id}`}
                                    value={p.id}
                                    checked={(palettes[d.id] ?? d.palettes[0]!.id) === p.id}
                                    onChange={() => setPalettes((all) => ({ ...all, [d.id]: p.id }))}
                                    className="sr-only"
                                  />
                                  <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: p.primary ?? app.primaryColor }} />
                                  <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: p.secondary }} />
                                  <span className="sr-only">{known(p.name)}</span>
                                </label>
                              ))}
                            </span>
                          </fieldset>
                        ) : null}
                        {/* 38 Grows with its text: in four narrow columns "Use this design" takes two lines. */}
                        <button type="button" className={`${btn.secondary} mt-auto min-h-9 px-3 py-1.5 text-center leading-tight`} disabled={busy} aria-label={t("pages.useNamed", { name: known(d.name) })} onClick={() => void chooseDesign(d.id, known(d.name))}>
                          {t("pages.useDesign")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ) : null}
            <section aria-labelledby="h-page-list" className={sectionClass}>
              <h2 id="h-page-list" className="m-0 text-lg font-bold">
                {t("pages.panelPages")}
              </h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {layout.pages.map((p) => {
                  const title = translated(p, lang.edit, def).title || p.slug;
                  return (
                    <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-2.5 first:border-t-0">
                      <button
                        type="button"
                        aria-current={page?.slug === p.slug ? "true" : undefined}
                        onClick={() => setPageSlug(p.slug)}
                        className={`flex min-w-0 cursor-pointer flex-col items-start border-0 bg-transparent p-0 text-start ${page?.slug === p.slug ? "text-midnight" : "text-ink-3"}`}
                      >
                        <span className={`text-[15px] ${page?.slug === p.slug ? "font-bold" : "font-semibold"}`}>{title}</span>
                        <span className="text-xs text-muted">{t("pages.pageInfo", { slug: p.slug, count: p.blocks.length })}</span>
                      </button>
                      <span className="flex gap-2">
                        <button type="button" className={smallBtn} aria-label={t("pages.duplicateNamed", { name: title })} onClick={() => duplicate(p)}>
                          {t("pages.duplicate")}
                        </button>
                        <button type="button" className={`${btn.danger} h-9 px-3 text-sm`} aria-label={t("pages.deleteNamed", { name: title })} onClick={() => deletePage(p)}>
                          {t("common.delete")}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <TextInput id="new-page-title" label={t("pages.newPage")} value={newTitle} onChange={setNewTitle} />
                </div>
                <button type="button" className={`${btn.primary} h-11 px-4 text-sm`} disabled={!newTitle.trim()} onClick={addPage}>
                  {t("pages.addPage")}
                </button>
              </div>
            </section>

            {page ? (
              <section aria-labelledby="h-page" className={sectionClass}>
                <h2 id="h-page" className="m-0 text-lg font-bold">
                  {t("pages.pageHeading", { name: translated(page, lang.edit, def).title || page.slug })}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LangText id={`page-${page.slug}-title`} label={t("pages.pageTitle")} value={page} field="title" lang={lang} onChange={(next) => updatePage(page.slug, () => next)} />
                  <TextInput id={`page-${page.slug}-slug`} label={t("pages.pageAddress")} dir="ltr" value={page.slug} hint={t("pages.pageAddressHint")} onChange={(v) => changeSlug(page, v)} />
                </div>
                <Check label={t("pages.showTitle")} checked={page.show_title} onChange={(show_title) => updatePage(page.slug, (p) => ({ ...p, show_title }))} />

                <h3 className="m-0 text-base font-bold">{t("pages.blocks")}</h3>
                {page.blocks.length ? (
                  <ol aria-label={t("pages.blocks")} className="m-0 flex list-none flex-col gap-2 p-0">
                    {page.blocks.map((block, i) => {
                      const open = openBlock === block.id;
                      const name = `${known(BLOCK_LABELS[block.type])}${summary(translated(block, lang.edit, def)) ? `: ${summary(translated(block, lang.edit, def))}` : ""}`;
                      const problem = blockProblem(block, screens, sources);
                      return (
                        <li
                          key={block.id}
                          id={`block-${block.id}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => onDrop(e, i)}
                          className={`rounded-xl border ${dragFrom === i ? "border-dashed border-midnight opacity-60" : "border-line"} bg-white`}
                        >
                          <div
                            draggable
                            onDragStart={(e) => {
                              setDragFrom(i);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", block.id);
                            }}
                            onDragEnd={() => setDragFrom(null)}
                            className="flex items-center gap-2 px-2 py-2"
                          >
                            <span className="cursor-grab text-muted" title={t("pages.drag")}>
                              <IconGlyph name="drag_indicator" />
                            </span>
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setOpenBlock(open ? null : block.id)}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-start text-[15px] font-semibold text-midnight"
                            >
                              <span className="truncate">{name}</span>
                              {block.visibility !== "everyone" ? <Badge tone="neutral">{block.visibility === "signed_in" ? t("pages.signedIn") : t("pages.signedOut")}</Badge> : null}
                              {problem ? (
                                <span title={known(problem)}>
                                  <Badge tone="warn">{t("pages.needsFix")}</Badge>
                                </span>
                              ) : null}
                              {devicesWithout(block.type, versions) ? (
                                <span title={t("pages.behindTitle")}>
                                  <Badge tone="warn">{t("pages.behind", { count: devicesWithout(block.type, versions) })}</Badge>
                                </span>
                              ) : null}
                              {samples[`${page.slug}/${block.id}`] === blockTexts(block) ? (
                                <span title={t("pages.sampleTitle")}>
                                  <Badge tone="neutral">{t("pages.sample")}</Badge>
                                </span>
                              ) : null}
                            </button>
                            <button type="button" className={iconBtn} aria-label={t("pages.blockUp", { n: i + 1 })} disabled={i === 0} onClick={() => updateBlocks(page.slug, (b) => moveItem(b, i, i - 1))}>
                              <IconGlyph name="arrow_upward" size={20} />
                            </button>
                            <button
                              type="button"
                              className={iconBtn}
                              aria-label={t("pages.blockDown", { n: i + 1 })}
                              disabled={i === page.blocks.length - 1}
                              onClick={() => updateBlocks(page.slug, (b) => moveItem(b, i, i + 1))}
                            >
                              <IconGlyph name="arrow_downward" size={20} />
                            </button>
                            <button type="button" className={iconBtn} aria-label={t("pages.blockDelete", { n: i + 1 })} onClick={() => updateBlocks(page.slug, (b) => b.filter((x) => x.id !== block.id))}>
                              <IconGlyph name="delete" size={20} />
                            </button>
                          </div>
                          {open ? (
                            <div className="border-t border-line-soft p-3" role="group" aria-label={t("pages.blockSettings", { n: i + 1 })}>
                              <BlockSettings block={block} ctx={blockCtx} onChange={(next) => updateBlocks(page.slug, (b) => b.map((x) => (x.id === block.id ? next : x)))} />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="m-0 text-[15px] text-muted">{t("pages.noBlocks")}</p>
                )}

                <h3 className="m-0 text-base font-bold">{t("pages.addBlock")}</h3>
                {/* 33 In groups, each block with its icon and what it's for. */}
                {BLOCK_GROUPS.map((group) => {
                  const types = group.types.filter((type) => blockTypes.includes(type));
                  if (!types.length) return null;
                  return (
                    <div key={group.name} role="group" aria-labelledby={`add-${group.name}`} className="flex flex-col gap-2">
                      <h4 id={`add-${group.name}`} className="m-0 text-xs font-bold tracking-[0.06em] text-muted uppercase">
                        {known(group.name)}
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {types.map((type) => (
                          <button
                            key={type}
                            type="button"
                            aria-label={t("pages.addNamed", { name: known(BLOCK_LABELS[type]) })}
                            onClick={() => addBlock(type)}
                            // 82.2 Or dragged onto the phone, where it should go.
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "copy";
                              e.dataTransfer.setData(BLOCK_DRAG_TYPE, type);
                            }}
                            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-start hover:border-midnight"
                          >
                            <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-ivory text-midnight">
                              <IconGlyph name={BLOCK_ICONS[type]} size={20} />
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-[15px] font-semibold text-midnight">{known(BLOCK_LABELS[type])}</span>
                              <span className="text-xs text-muted">{type === "items" ? listHint : known(BLOCK_HINTS[type])}</span>
                              {devicesWithout(type, versions) ? (
                                <span className="text-xs font-semibold text-warn" title={t("pages.behindTitle")}>
                                  {t("pages.behind", { count: devicesWithout(type, versions) })}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : (
              <p className="m-0 text-[15px] text-muted">{t("pages.addPageFirst")}</p>
            )}
          </div>
        ) : null}

        {panel === "tabs" && plan.pageEditor ? (
          <section role="tabpanel" id="panel-tabs" aria-labelledby="tab-tabs" className={sectionClass}>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-lg font-bold">{t("pages.bottomTabs")}</h2>
              <p className="m-0 text-[15px] text-ink-4">{t("pages.tabsText", { min: LAYOUT_LIMITS.minTabs, max: LAYOUT_LIMITS.maxTabs })}</p>
            </div>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {layout.tabs.map((tab, i) => (
                <li key={tab.id}>
                  <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-3">
                    <legend className="flex items-center gap-2 px-1 text-sm font-bold">
                      {t("pages.tabN", { n: num(i + 1) })}
                      {actionProblem(tab.target, screens, sources) ? <Badge tone="warn">{t("pages.needsFix")}</Badge> : null}
                    </legend>
                    <LangText
                      id={`tab-${tab.id}-label`}
                      label={t("pages.label")}
                      value={tab}
                      field="label"
                      lang={lang}
                      onChange={(next) => update((l) => ({ ...l, tabs: l.tabs.map((x) => (x.id === tab.id ? next : x)) }))}
                    />
                    <IconPicker
                      id={`tab-${tab.id}-icon`}
                      label={t("pages.icon")}
                      value={tab.icon}
                      onChange={(icon) => update((l) => ({ ...l, tabs: l.tabs.map((x) => (x.id === tab.id ? { ...x, icon: icon ?? x.icon } : x)) }))}
                    />
                    <OwnIcon id={`tab-${tab.id}-own-icon`} value={tab.icon_url} onChange={(icon_url) => update((l) => ({ ...l, tabs: l.tabs.map((x) => (x.id === tab.id ? withIconUrl(x, icon_url) : x)) }))} />
                    <ActionEditor
                      id={`tab-${tab.id}-target`}
                      label={t("pages.opens")}
                      action={tab.target}
                      optional={false}
                      pages={pages}
                      sources={sources}
                      screens={screens}
                      courses={pickable.items.courses}
                      onChange={(target) => target && update((l) => ({ ...l, tabs: l.tabs.map((x) => (x.id === tab.id ? { ...x, target } : x)) }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={smallBtn} aria-label={t("pages.tabLeft", { n: i + 1 })} disabled={i === 0} onClick={() => update((l) => ({ ...l, tabs: moveItem(l.tabs, i, i - 1) }))}>
                        {t("pages.moveLeft")}
                      </button>
                      <button
                        type="button"
                        className={smallBtn}
                        aria-label={t("pages.tabRight", { n: i + 1 })}
                        disabled={i === layout.tabs.length - 1}
                        onClick={() => update((l) => ({ ...l, tabs: moveItem(l.tabs, i, i + 1) }))}
                      >
                        {t("pages.moveRight")}
                      </button>
                      <button
                        type="button"
                        className={`${btn.danger} h-9 px-3 text-sm`}
                        aria-label={t("pages.tabRemove", { n: i + 1 })}
                        disabled={layout.tabs.length <= LAYOUT_LIMITS.minTabs}
                        onClick={() => update((l) => ({ ...l, tabs: l.tabs.filter((x) => x.id !== tab.id) }))}
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            <div>
              <button type="button" className={smallBtn} disabled={layout.tabs.length >= LAYOUT_LIMITS.maxTabs} onClick={addTab}>
                {t("pages.addTab")}
              </button>
            </div>
          </section>
        ) : null}

        {/* 82.5 The side menu, as well as the tabs. */}
        {panel === "tabs" && plan.pageEditor ? (
          <section aria-labelledby="h-side-menu" className={sectionClass}>
            <div className="flex flex-col gap-1">
              <h2 id="h-side-menu" className="m-0 text-lg font-bold">
                {t("pages.sideMenu")}
              </h2>
              <p className="m-0 text-[15px] text-ink-4">{t("pages.sideMenuText", { max: LAYOUT_LIMITS.maxMenu })}</p>
            </div>
            {menu.length ? (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {menu.map((entry, i) => {
                  const setEntry = (change: (e: LayoutTab) => LayoutTab) => update((l) => ({ ...l, menu: (l.menu ?? []).map((x) => (x.id === entry.id ? change(x) : x)) }));
                  return (
                    <li key={entry.id}>
                      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-3">
                        <legend className="flex items-center gap-2 px-1 text-sm font-bold">
                          {t("pages.menuN", { n: num(i + 1) })}
                          {actionProblem(entry.target, screens, sources) ? <Badge tone="warn">{t("pages.needsFix")}</Badge> : null}
                        </legend>
                        <LangText id={`menu-${entry.id}-label`} label={t("pages.label")} value={entry} field="label" lang={lang} onChange={(next) => setEntry(() => next)} />
                        <IconPicker id={`menu-${entry.id}-icon`} label={t("pages.icon")} value={entry.icon} onChange={(icon) => setEntry((x) => ({ ...x, icon: icon ?? x.icon }))} />
                        <OwnIcon id={`menu-${entry.id}-own-icon`} value={entry.icon_url} onChange={(icon_url) => setEntry((x) => withIconUrl(x, icon_url))} />
                        <ActionEditor
                          id={`menu-${entry.id}-target`}
                          label={t("pages.opens")}
                          action={entry.target}
                          optional={false}
                          pages={pages}
                          sources={sources}
                          screens={screens}
                          courses={pickable.items.courses}
                          onChange={(target) => target && setEntry((x) => ({ ...x, target }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={smallBtn} aria-label={t("pages.moveUp", { item: t("pages.menuN", { n: num(i + 1) }) })} disabled={i === 0} onClick={() => update((l) => ({ ...l, menu: moveItem(l.menu ?? [], i, i - 1) }))}>
                            {t("pages.up")}
                          </button>
                          <button
                            type="button"
                            className={smallBtn}
                            aria-label={t("pages.moveDown", { item: t("pages.menuN", { n: num(i + 1) }) })}
                            disabled={i === menu.length - 1}
                            onClick={() => update((l) => ({ ...l, menu: moveItem(l.menu ?? [], i, i + 1) }))}
                          >
                            {t("pages.down")}
                          </button>
                          <button
                            type="button"
                            className={`${btn.danger} h-9 px-3 text-sm`}
                            aria-label={t("pages.menuRemove", { n: i + 1 })}
                            onClick={() => update((l) => withMenu(l, (l.menu ?? []).filter((x) => x.id !== entry.id)))}
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      </fieldset>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <div>
              <button type="button" className={smallBtn} disabled={menu.length >= LAYOUT_LIMITS.maxMenu} onClick={addMenuEntry}>
                {t("pages.addMenuEntry")}
              </button>
            </div>
          </section>
        ) : null}

        {panel === "look" ? (
          <section role="tabpanel" id="panel-look" aria-labelledby="tab-look" className={sectionClass}>
            <h2 className="m-0 text-lg font-bold">{t("pages.panelLook")}</h2>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1.5 p-0 text-sm font-semibold">{t("pages.template")}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {APP_TEMPLATES.map((template) => (
                  <label
                    key={template}
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line p-3 has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:p-[11px]"
                  >
                    <span className="flex items-center gap-2 text-[15px] font-bold">
                      <input type="radio" name="template" checked={layout.appearance.template === template} onChange={() => setLook({ template })} className="h-4 w-4 accent-midnight" />
                      {known(TEMPLATE_LABELS[template])}
                    </span>
                    <span className="text-xs text-muted">{t(TEMPLATE_TEXT[template])}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectInput
                id="look-mode"
                label={t("pages.opensIn")}
                value={layout.appearance.theme_mode}
                options={THEME_MODES.map((m) => ({ value: m, label: known(THEME_MODE_LABELS[m]) }))}
                onChange={(theme_mode) => setLook({ theme_mode })}
              />
              <SelectInput id="look-font" label={t("pages.font")} value={layout.appearance.font} options={APP_FONTS.map((f) => ({ value: f, label: f }))} onChange={(font) => setLook({ font })} />
              <SelectInput
                id="look-corners"
                label={t("pages.corners")}
                value={layout.appearance.corners}
                options={CORNERS.map((c) => ({ value: c, label: known(CORNER_LABELS[c]) }))}
                onChange={(corners) => setLook({ corners })}
              />
              <SelectInput
                id="look-cards"
                label={t("pages.cards")}
                value={layout.appearance.cards}
                options={CARD_STYLES.map((c) => ({ value: c, label: known(CARD_LABELS[c]) }))}
                onChange={(cards) => setLook({ cards })}
              />
            </div>
            <Check label={t("pages.switchMode")} checked={layout.appearance.user_can_change_mode} onChange={(user_can_change_mode) => setLook({ user_can_change_mode })} />
            <div className="flex flex-wrap items-end gap-4">
              <Check
                label={t("pages.secondary")}
                checked={layout.appearance.secondary_color !== null}
                onChange={(on) => setLook({ secondary_color: on ? (layout.appearance.secondary_color ?? "#E8B04B") : null })}
              />
              {layout.appearance.secondary_color !== null ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="look-secondary" className="text-sm font-semibold">
                    {t("pages.secondaryColor")}
                  </label>
                  <input
                    id="look-secondary"
                    type="color"
                    value={layout.appearance.secondary_color}
                    onChange={(e) => setLook({ secondary_color: e.target.value.toUpperCase() })}
                    className="input input-sm w-20"
                  />
                </div>
              ) : null}
            </div>
            <p className="m-0 text-sm text-muted">{t("pages.colorsFrom")}</p>
          </section>
        ) : null}

        {panel === "languages" ? (
          <section role="tabpanel" id="panel-languages" aria-labelledby="tab-languages" className={sectionClass}>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-lg font-bold">{t("pages.panelLanguages")}</h2>
              <p className="m-0 text-[15px] text-ink-4">
                {richText(t("pages.languagesText"), {
                  link: (chunk) => (
                    <Link href="/dashboard/languages" className="font-semibold">
                      {chunk}
                    </Link>
                  ),
                })}
              </p>
            </div>
            {/* 43 Any language, in the owner's order. */}
            <LanguageList languages={layout.languages} onChange={changeLanguages} full={languagesFull} max={MAX_LANGUAGES} idPrefix="pages-languages" />
            {plan.languages !== null && languagesFull ? (
              <UpgradeHint
                title={t("pages.moreLanguages")}
                to={plan.upgradeLanguages}
                cta={plan.upgradeLanguages ? t("overview.upgradeTo", { plan: plan.upgradeLanguages.name }) : undefined}
              >
                {t("pages.planLanguages", { plan: plan.name, count: plan.languages })}
              </UpgradeHint>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6">
        {live ? (
          <div role="group" aria-label={t("pages.previewChoice")} className="flex rounded-[10px] border border-line-strong bg-white p-0.5">
            {(["app", "sketch"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold ${view === v ? "bg-midnight text-white" : "text-midnight hover:bg-ivory"}`}
              >
                {v === "app" ? t("pages.previewTheApp") : t("pages.previewSketch")}
              </button>
            ))}
          </div>
        ) : null}
        {live && view === "app" ? (
          <LivePreview src={live} appName={app.name} framesRef={frames} />
        ) : (
          <PhonePreview
            layout={shown}
            page={plan.pageEditor ? page : (shown.pages.find((p) => p.slug === pageSlug) ?? shown.pages[0] ?? null)}
            lang={lang.edit}
            pickable={pickable}
            app={app}
            onOpenPage={setPageSlug}
            builtin={builtin}
            editing={
              plan.pageEditor && page
                ? {
                    selected: openBlock,
                    name: (block) => known(BLOCK_LABELS[block.type]),
                    onSelect: selectBlock,
                    onDrop: (type, at) => {
                      setPanel("pages");
                      addBlock(type, at);
                    },
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
