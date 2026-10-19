import type { ReactNode } from "react";
import { langParams, routeLang } from "@/site/lang";

/**
 * 55 The public website in Arabic (/ar) and Turkish (/tr). The pages are the
 * English ones (src/site), in the route's language; <html> takes its
 * language and direction from the route (components/html-shell.tsx).
 */
export function generateStaticParams() {
  return langParams();
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  await routeLang(params);
  return children;
}
