"use client";

import { useState, type DragEvent } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import type { ItemSource, StudioHeader, StudioNode, StudioPage } from "@/lib/pages/types";
import { ELEMENTS, type ElementGroup } from "@/lib/studio/elements";
import { SECTIONS, TEMPLATES } from "@/lib/studio/sections";
import { holdsChildren } from "@/lib/studio/edit";
import { Glyph, type DragPayload } from "./shared";

/**
 * 103R The editor's left side, as in the approved design: Elements, Ready
 * sections and Templates (with search), and the page's layers as a tree.
 */

export type LeftTab = "elements" | "sections" | "templates";

export interface MyTemplate {
  id: string;
  name: string;
  page: StudioPage;
}

export function elementLabel(t: ReturnType<typeof useDashT>, type: StudioNode["type"], source: ItemSource | null | undefined): string {
  if (type === "items" && source) return t(`studio.el_items_${source}` as DashKey);
  return t(`studio.el_${type}` as DashKey);
}

export function LeftPanel(props: {
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  source: ItemSource | null;
  page: StudioPage | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddElement: (type: StudioNode["type"]) => void;
  onAddSection: (id: string) => void;
  onUseTemplate: (id: string) => void;
  onUseMyTemplate: (template: MyTemplate) => void;
  onDeleteMyTemplate: (id: string) => void;
  myTemplates: MyTemplate[];
  onDragStart: (e: DragEvent, payload: DragPayload) => void;
  onLayerDragOver: (e: DragEvent, node: StudioNode) => void;
  onLayerDrop: (e: DragEvent) => void;
  drop: { parentId: string; index: number } | null;
}) {
  const t = useDashT();
  const [query, setQuery] = useState("");
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();
  const tabs: { id: LeftTab; label: string }[] = [
    { id: "elements", label: t("studio.elements") },
    { id: "sections", label: t("studio.sections") },
    { id: "templates", label: t("studio.templates") },
  ];
  const matches = (label: string, keywords: string) => !q || label.toLowerCase().includes(q) || keywords.includes(q);
  const groups: { id: ElementGroup; label: string }[] = [
    { id: "layout", label: t("studio.groupLayout") },
    { id: "content", label: t("studio.groupContent") },
    { id: "more", label: t("studio.groupMore") },
  ];
  const sections = SECTIONS.filter((s) => matches(t(`studio.sec_${s.id}` as DashKey), s.id));
  const templates = TEMPLATES.filter((tpl) => matches(t(`studio.tpl_${tpl.id}` as DashKey), tpl.id));

  return (
    <aside aria-label={t("studio.elements")} className="studio-left flex min-h-0 flex-col border-line bg-white" style={{ flex: "1 1 260px", maxWidth: 300, minWidth: 240, borderInlineEnd: "1px solid var(--studio-line)" }}>
      <div role="tablist" aria-label={t("studio.elements")} className="flex gap-1 px-3 pt-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={props.tab === tab.id}
            onClick={() => props.onTab(tab.id)}
            className="h-[38px] flex-1 border-0 bg-transparent text-sm"
            style={{ borderBottom: `2px solid ${props.tab === tab.id ? "var(--studio-ink)" : "transparent"}`, fontWeight: props.tab === tab.id ? 700 : 400, color: props.tab === tab.id ? "var(--studio-ink)" : "var(--studio-muted)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        <label className="flex h-[38px] items-center gap-2 rounded-[10px] px-2.5 text-[13px]" style={{ border: "1px solid var(--studio-line)", color: "var(--studio-muted)" }}>
          <Glyph name="search" size={18} />
          <span className="sr-only">{t("studio.searchElements")}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("studio.searchElements")} className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none" />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {props.tab === "elements"
          ? groups.map((group) => {
              const items = ELEMENTS.filter((e) => e.group === group.id && matches(elementLabel(t, e.type, props.source), e.keywords));
              if (!items.length) return null;
              return (
                <div key={group.id}>
                  <div className="px-3 text-xs font-bold" style={{ color: "var(--studio-muted)" }}>
                    {group.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-3 pt-2 pb-3">
                    {items.map((e) => (
                      <button
                        key={e.type}
                        type="button"
                        draggable
                        onDragStart={(ev) => props.onDragStart(ev, { kind: "new", type: e.type })}
                        onClick={() => props.onAddElement(e.type)}
                        className="studio-tile flex flex-col items-center rounded-[10px] bg-white px-1 py-2.5 text-center text-xs"
                        style={{ border: "1px solid var(--studio-line)", cursor: "grab" }}
                        data-studio-element={e.type}
                      >
                        <Glyph name={e.icon} size={20} />
                        <span className="mt-1">{elementLabel(t, e.type, props.source)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          : null}
        {props.tab === "elements" && q && !ELEMENTS.some((e) => matches(elementLabel(t, e.type, props.source), e.keywords)) ? (
          <p className="m-0 px-3 pb-3 text-[13px]" style={{ color: "var(--studio-muted)" }}>
            {t("studio.noResults", { query })}
          </p>
        ) : null}

        {props.tab === "sections" ? (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <p className="m-0 text-[13px]" style={{ color: "var(--studio-muted)" }}>
              {t("studio.sectionsIntro")}
            </p>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                draggable
                onDragStart={(ev) => props.onDragStart(ev, { kind: "section", id: s.id })}
                onClick={() => props.onAddSection(s.id)}
                className="studio-tile flex items-center gap-2.5 rounded-[10px] bg-white px-3 py-2.5 text-start text-[13px] font-semibold"
                style={{ border: "1px solid var(--studio-line)", cursor: "grab" }}
                data-studio-section={s.id}
              >
                <Glyph name={s.icon} size={20} />
                {t(`studio.sec_${s.id}` as DashKey)}
              </button>
            ))}
          </div>
        ) : null}

        {props.tab === "templates" ? (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <p className="m-0 text-[13px]" style={{ color: "var(--studio-muted)" }}>
              {t("studio.templatesIntro")}
            </p>
            {templates.map((tpl) => (
              <button key={tpl.id} type="button" onClick={() => props.onUseTemplate(tpl.id)} className="studio-tile flex items-center gap-2.5 rounded-[10px] bg-white px-3 py-2.5 text-start text-[13px] font-semibold" style={{ border: "1px solid var(--studio-line)" }} data-studio-template={tpl.id}>
                <Glyph name={tpl.icon} size={20} />
                {t(`studio.tpl_${tpl.id}` as DashKey)}
              </button>
            ))}
            <div className="pt-2 text-xs font-bold" style={{ color: "var(--studio-muted)" }}>
              {t("studio.myTemplates")}
            </div>
            {props.myTemplates.length === 0 ? (
              <p className="m-0 text-[13px]" style={{ color: "var(--studio-muted)" }}>
                {t("studio.noMyTemplates")}
              </p>
            ) : (
              props.myTemplates
                .filter((m) => matches(m.name, ""))
                .map((m) => (
                  <div key={m.id} className="flex items-stretch gap-1.5">
                    <button type="button" onClick={() => props.onUseMyTemplate(m)} className="studio-tile flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] bg-white px-3 py-2.5 text-start text-[13px] font-semibold" style={{ border: "1px solid var(--studio-line)" }}>
                      <Glyph name="bookmark" size={20} />
                      <span className="truncate">{m.name}</span>
                    </button>
                    <button type="button" aria-label={`${t("studio.delete")}: ${m.name}`} title={t("studio.delete")} onClick={() => props.onDeleteMyTemplate(m.id)} className="flex w-9 flex-none items-center justify-center rounded-[10px] bg-white" style={{ border: "1px solid var(--studio-line)", color: "var(--studio-muted)" }}>
                      <Glyph name="delete" size={18} />
                    </button>
                  </div>
                ))
            )}
          </div>
        ) : null}

        {/* The page's layers. */}
        <div className="flex justify-between px-3 pt-3 pb-1.5 text-xs font-bold" style={{ borderTop: "1px solid var(--studio-line)", color: "var(--studio-muted)" }}>
          <span id="studio-layers">{t("studio.layers")}</span>
          <button
            type="button"
            aria-label={folded.size ? t("studio.expandAll") : t("studio.collapseAll")}
            title={folded.size ? t("studio.expandAll") : t("studio.collapseAll")}
            onClick={() => {
              if (folded.size) setFolded(new Set());
              else if (props.page) {
                const all = new Set<string>();
                const walk = (n: StudioNode) => {
                  if (holdsChildren(n) && n.children?.length) all.add(n.id);
                  n.children?.forEach(walk);
                };
                walk(props.page.body);
                all.add("header");
                setFolded(all);
              }
            }}
            className="border-0 bg-transparent"
            style={{ color: "var(--studio-muted)" }}
          >
            <Glyph name={folded.size ? "unfold_more" : "unfold_less"} size={18} />
          </button>
        </div>
        {props.page ? (
          <ul role="tree" aria-labelledby="studio-layers" className="m-0 flex list-none flex-col gap-0.5 px-2 pb-4 text-[13px]">
            {props.page.header ? <HeaderLayer header={props.page.header} selected={props.selectedId === "header"} folded={folded.has("header")} onFold={() => toggle("header")} onSelect={() => props.onSelect("header")} /> : null}
            {(props.page.body.children ?? []).map((child) => (
              <Layer key={child.id} node={child} depth={0} {...props} folded={folded} onFold={toggle} />
            ))}
            <li role="treeitem" aria-selected={false} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <Glyph name="tab" size={16} />
              {t("studio.bottomTabs")}
            </li>
          </ul>
        ) : null}
      </div>
    </aside>
  );

  function toggle(id: string) {
    setFolded((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}

function HeaderLayer({ header, selected, folded, onFold, onSelect }: { header: StudioHeader; selected: boolean; folded: boolean; onFold: () => void; onSelect: () => void }) {
  const t = useDashT();
  const n = ["logo_center", "title_search", "logo_actions", "transparent"].indexOf(header.type) + 1;
  const buttons = (header.buttons ?? []).filter((b) => b !== "menu");
  return (
    <>
      <li role="treeitem" aria-selected={selected} aria-expanded={!folded} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={selected ? { background: "#E8EEFF", color: "#1F3FB8", fontWeight: 700 } : undefined}>
        <button type="button" onClick={onFold} aria-label={folded ? t("studio.expandAll") : t("studio.collapseAll")} className="border-0 bg-transparent p-0" style={{ color: "inherit" }}>
          <Glyph name={folded ? "chevron_left" : "expand_more"} size={16} flip />
        </button>
        <button type="button" onClick={onSelect} className="flex flex-1 items-center gap-1.5 border-0 bg-transparent p-0 text-start" style={{ color: "inherit", fontWeight: "inherit" }}>
          <Glyph name="web_asset" size={16} />
          {t("studio.layerHeader", { n: String(n) })}
        </button>
      </li>
      {folded ? null : (
        <>
          <li className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ marginInlineStart: 22, color: "var(--studio-muted)" }}>
            <Glyph name="image" size={16} />
            {t("studio.layerLogo")}
          </li>
          {buttons.length ? (
            <li className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ marginInlineStart: 22, color: "var(--studio-muted)" }}>
              <Glyph name="widgets" size={16} />
              {t("studio.layerIcons", { list: buttons.map((b) => t(`studio.btn_${b}` as DashKey)).join("، ") })}
            </li>
          ) : null}
        </>
      )}
    </>
  );
}

function Layer(props: {
  node: StudioNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  folded: Set<string>;
  onFold: (id: string) => void;
  source: ItemSource | null;
  onDragStart: (e: DragEvent, payload: DragPayload) => void;
  onLayerDragOver: (e: DragEvent, node: StudioNode) => void;
  onLayerDrop: (e: DragEvent) => void;
  drop: { parentId: string; index: number } | null;
}) {
  const t = useDashT();
  const { node } = props;
  const element = ELEMENTS.find((e) => e.type === node.type);
  const kids = holdsChildren(node) ? (node.children ?? []) : [];
  const folded = props.folded.has(node.id);
  const selected = props.selectedId === node.id;
  const label = node.name ?? (node.type === "button" || node.type === "text" ? `${elementLabel(t, node.type, node.source)} «${(node.text ?? "").slice(0, 24)}»` : elementLabel(t, node.type, node.source));
  return (
    <>
      <li
        role="treeitem"
        aria-selected={selected}
        aria-expanded={kids.length ? !folded : undefined}
        draggable
        onDragStart={(e) => props.onDragStart(e, { kind: "move", id: node.id })}
        onDragOver={(e) => props.onLayerDragOver(e, node)}
        onDrop={props.onLayerDrop}
        data-studio-layer={node.id}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
        style={{ marginInlineStart: props.depth * 22, ...(selected ? { background: "#E8EEFF", color: "#1F3FB8", fontWeight: 700 } : {}) }}
      >
        {kids.length ? (
          <button type="button" onClick={() => props.onFold(node.id)} aria-label={folded ? t("studio.expandAll") : t("studio.collapseAll")} className="border-0 bg-transparent p-0" style={{ color: "inherit" }}>
            <Glyph name={folded ? "chevron_left" : "expand_more"} size={16} flip />
          </button>
        ) : null}
        <button type="button" onClick={() => props.onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-1.5 border-0 bg-transparent p-0 text-start" style={{ color: "inherit", fontWeight: "inherit" }}>
          <Glyph name={element?.icon ?? "crop_square"} size={16} />
          <span className="truncate">{label}</span>
        </button>
      </li>
      {folded ? null : kids.map((child) => <Layer key={child.id} {...props} node={child} depth={props.depth + 1} />)}
    </>
  );
}
