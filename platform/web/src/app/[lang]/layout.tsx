import { langParams } from "@/site/lang";

/**
 * 55 The public website in Arabic (/ar) and Turkish (/tr). The pages are the
 * English ones (src/site), in the route's language; <html> takes its
 * language and direction from the route (components/html-shell.tsx).
 * Each page checks the language (src/site/lang.ts `routeLang`): any other
 * first segment, like /xyz, is "page not found" (in English).
 */
export function generateStaticParams() {
  return langParams();
}

export default function LangLayout({ children }: LayoutProps<"/[lang]">) {
  return children;
}
