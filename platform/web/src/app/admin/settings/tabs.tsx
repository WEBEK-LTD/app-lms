"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_PAGES } from "./pages";

/** 95.1 The settings pages, as tabs under the title. */
export function SettingsTabs() {
  const pathname = usePathname();
  const items = [{ href: "/admin/settings", label: "All settings" }, ...SETTINGS_PAGES];
  return (
    <nav aria-label="Settings pages" className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
              current ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
