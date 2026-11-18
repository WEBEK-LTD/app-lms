"use client";

import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { templateCategoryList } from "@/lib/studio/shop-categories";
import { eachNode } from "@/lib/studio/tree";
import { Glyph } from "./shared";
import { fromDashboard, isStoryElement } from "./stories-source-controls";

/**
 * 157 Over a template's list of the shop's categories (or one of its
 * entries) left as the template made it: in the app it shows the shop's own
 * categories once there are any of the owner's, until then the template's
 * (lib/studio/shop-categories.ts); changing its words makes it the owner's.
 */
export function CategoryListNote({ node, body, pickable }: { node: StudioNode; body: StudioNode; pickable: Pickable }) {
  const t = useDashT();
  let parent: StudioNode | null = null;
  eachNode(body, (n, p) => {
    if (n.id === node.id) parent = p;
  });
  const list = templateCategoryList(node) ? node : parent && templateCategoryList(parent) ? parent : null;
  if (!list) return null;
  // 194 A story element's stories are told of by its own part (the stories' source), in one note.
  if (isStoryElement(list, body) && fromDashboard(list, body)) return null;
  const own = Boolean(pickable.shopCategories?.own && pickable.shopCategories.list.length);
  return (
    <p data-category-list-note={own ? "own" : "template"} className="m-0 flex items-start gap-2 px-4 py-3 text-xs" style={{ borderBottom: "1px solid var(--sf-line)", background: "var(--sf-select-fill)", color: "var(--sf-ink)" }}>
      <span style={{ color: "var(--sf-select-ink)" }}>
        <Glyph name="category" size={18} />
      </span>
      <span>{t(own ? "studio.catListOwn" : "studio.catListTemplate")}</span>
    </p>
  );
}
