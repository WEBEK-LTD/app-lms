import type { PremiumProps } from "./shared";

/** The element's own title or text in the language being edited. */
export function own(p: PremiumProps, field: "title" | "text"): string {
  const { node, lang, defaultLang } = p;
  return (lang !== defaultLang && (node.translations?.[lang]?.[field] as string | undefined)) || node[field] || "";
}
