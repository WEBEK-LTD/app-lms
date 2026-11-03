"use client";

import type { ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { btn } from "./ui";

/** Page kit addition (to fold into page-kit-client.tsx): the button that opens an AddDetails `target` (or any part) and goes to its first field. */
export function DetailsButton({ target, children, icon = "add", variant = "main", className = "h-11" }: { target: string; children: ReactNode; icon?: IconName | null; variant?: keyof typeof btn; className?: string }) {
  return (
    <button
      type="button"
      aria-controls={target}
      className={`${btn[variant]} ${className}`}
      onClick={() => {
        const el = document.getElementById(target);
        if (!el) return;
        if (el instanceof HTMLDetailsElement) el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select")?.focus({ preventScroll: true });
      }}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}
