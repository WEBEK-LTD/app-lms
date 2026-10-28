"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Glyph, STUDIO_COLORS as C } from "../editor/shared";

export interface ProjectNavGroup {
  label?: string;
  items: { href: string; label: string; icon: string }[];
}

/** Whether a link is the page open: the overview only itself, a setup step by its step, the rest with their pages below. */
function isCurrent(href: string, path: string, step: string | null): boolean {
  const [target, query] = href.split("?");
  if (target === "/studio/project") return path === target;
  if (query) return path === target && new URLSearchParams(query).get("step") === step;
  if (target === "/studio/project/setup") return path === target && !step;
  return path === target || path.startsWith(`${target}/`);
}

/** 103R.3 The project dashboard's side menu, in the approved design. */
export function ProjectNav({ label, groups }: { label: string; groups: ProjectNavGroup[] }) {
  const path = usePathname();
  const step = useSearchParams().get("step");
  return (
    <nav aria-label={label} className="box-border flex max-w-[260px] min-w-[220px] flex-[1_1_240px] flex-col gap-0.5 bg-white px-2.5 py-3.5 text-sm" style={{ borderInlineEnd: `1px solid ${C.line}` }}>
      {groups.map((group, g) => (
        <div key={group.label ?? g} className="flex flex-col gap-0.5">
          {group.label ? (
            <div className="px-3 pt-3 pb-1 text-xs font-bold" style={{ color: C.muted }}>
              {group.label}
            </div>
          ) : null}
          {group.items.map((item) => {
            const on = isCurrent(item.href, path, step);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-[9px] no-underline hover:bg-[#F4EFE6]"
                style={{ background: on ? C.ivory : undefined, fontWeight: on ? 700 : 400, color: C.ink }}
              >
                <Glyph name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
