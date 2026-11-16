"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/**
 * 103R.3 The dark bar's switch between the regular apps and Yallapp
 * Studio; 106 and Studio Market, marked new until it is open. The open one
 * follows the address (the layout stays while pages change under it).
 */
export function SectionSwitch({ label, words }: { label: string; words: { regular: string; studio: string; market: string; newTag: string } }) {
  const pathname = usePathname();
  const market = /^\/dashboard\/studio-market(?:\/|$)/.test(pathname);
  const item = (href: string, icon: IconName, text: string, current: boolean, extra?: React.ReactNode) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] no-underline ${current ? "bg-ivory font-bold text-midnight hover:text-midnight" : "text-night-text hover:bg-night-line hover:text-white"}`}
    >
      <Icon name={icon} size={18} />
      {text}
      {extra}
    </Link>
  );
  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto rounded-[10px] bg-night-2 p-1">
      {item("/dashboard", "apps", words.regular, !market)}
      {item("/studio", "draw", words.studio, false)}
      {item(
        "/dashboard/studio-market",
        "storefront",
        words.market,
        market,
        market ? null : <span className="rounded-full bg-ember px-1.5 text-[10px] leading-4 font-extrabold text-[#0e0d24]">{words.newTag}</span>,
      )}
    </nav>
  );
}
