"use client";

import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { isTemplateNewsTicker } from "@/lib/school/news-ticker";
import { templateCategoryList } from "@/lib/studio/shop-categories";
import { inTemplateFaculty } from "@/lib/teachers/faculty";
import { eachNode } from "@/lib/studio/tree";
import { Glyph } from "./shared";

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

/**
 * 179 Over Nakhla's news ticker and Rawaq's faculty still as the template
 * made them: in the app they show the school's own news and the academy's
 * own teachers (lib/school/news-ticker.ts, lib/teachers/faculty.ts);
 * changing their words makes them the owner's.
 */
export function TemplateDataNote({ node, body }: { node: StudioNode; body: StudioNode }) {
  const t = useDashT();
  const kind = isTemplateNewsTicker(node) ? "news" : inTemplateFaculty(body, node.id) ? "faculty" : null;
  if (!kind) return null;
  return (
    <p data-template-data-note={kind} className="m-0 flex items-start gap-2 px-4 py-3 text-xs" style={{ borderBottom: "1px solid var(--sf-line)", background: "var(--sf-select-fill)", color: "var(--sf-ink)" }}>
      <span style={{ color: "var(--sf-select-ink)" }}>
        <Glyph name={kind === "news" ? "campaign" : "co_present"} size={18} />
      </span>
      <span>{t(kind === "news" ? "studio.schoolNewsNote" : "studio.facultyNote")}</span>
    </p>
  );
}
