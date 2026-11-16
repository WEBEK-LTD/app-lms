"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDIO_COLORS as C } from "../editor/shared";

/** 132.50 Your account and Team, side by side above the page, the one open marked. */
export function AccountTabs({ labels, team }: { labels: { group: string; account: string; team: string }; team: boolean }) {
  const path = usePathname();
  const tabs = [{ href: "/studio/account", label: labels.account }, ...(team ? [{ href: "/studio/team", label: labels.team }] : [])];
  return (
    <nav aria-label={labels.group} className="flex flex-wrap gap-1 self-start rounded-xl p-1" style={{ background: "var(--sf-surface, #FFFFFF)", border: `1px solid var(--sf-line, ${C.line})` }}>
      {tabs.map((tab) => {
        const on = path === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className="flex h-9 items-center rounded-lg px-4 text-sm no-underline"
            style={{ background: on ? `var(--sf-ink, ${C.ink})` : "transparent", color: on ? `var(--sf-board, ${C.ivory})` : `var(--sf-ink, ${C.ink})`, fontWeight: on ? 700 : 500 }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
