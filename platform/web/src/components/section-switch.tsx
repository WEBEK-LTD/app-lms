"use client";

import Link from "next/link";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/**
 * 103R.3 The dark bar's switch between the regular apps and Yallapp
 * Studio. 191 Studio Market is Studio's (Studio's bar and menu have it), not
 * the regular apps' dashboard's.
 */
export function SectionSwitch({ label, words }: { label: string; words: { regular: string; studio: string } }) {
  const item = (href: string, icon: IconName, text: string, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] no-underline ${current ? "bg-ivory font-bold text-midnight hover:text-midnight" : "text-night-text hover:bg-night-line hover:text-white"}`}
    >
      <Icon name={icon} size={18} />
      {text}
    </Link>
  );
  return (
    <nav aria-label={label} className="flex items-center gap-1 overflow-x-auto rounded-[10px] bg-night-2 p-1">
      {item("/dashboard", "apps", words.regular, true)}
      {item("/studio", "draw", words.studio, false)}
    </nav>
  );
}
