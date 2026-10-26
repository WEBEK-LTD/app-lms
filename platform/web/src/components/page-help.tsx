"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HelpLinks } from "@/lib/docs/help";
import { matchHelp } from "@/lib/docs/help-match";
import { Icon } from "./icon";

/** 93.2 Help with this page: its documentation article, in the dashboard's language, in a new tab. */
export function PageHelp({ links, label }: { links: HelpLinks; label: string }) {
  const slug = matchHelp(links.prefixes, usePathname());
  const article = slug ? links.articles[slug] : null;
  if (!article) return null;
  return (
    <Link
      href={article.href}
      target="_blank"
      title={article.title}
      data-page-help={slug}
      className="inline-flex items-center gap-1.5 self-end text-sm font-semibold text-muted no-underline hover:text-midnight"
    >
      <Icon name="help" size={18} />
      {label}
    </Link>
  );
}
