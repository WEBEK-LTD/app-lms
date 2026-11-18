import type { AppProblem } from "./app-check-rules";

/**
 * 182 Where Studio opens on an app check's problem (client and server alike):
 * its page, the element selected (the tabs for a tab or menu entry), in its language.
 */
export function fixHref(p: Pick<AppProblem, "page" | "element" | "lang">): string {
  const q = new URLSearchParams();
  if (p.page) q.set("page", p.page);
  if (p.element && !p.element.includes(":")) q.set("select", p.element);
  else if (p.element) q.set("select", "tabs");
  if (p.lang) q.set("lang", p.lang);
  const s = q.toString();
  return `/studio/editor${s ? `?${s}` : ""}`;
}
