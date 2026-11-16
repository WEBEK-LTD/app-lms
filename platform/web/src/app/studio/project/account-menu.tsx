"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * 132.4 The account's menu on Studio's bar, as the person's initial: who is
 * signed in, the account's pages (your account with two-step sign-in, the
 * country, Yallapp's emails and deleting the account; the team; the plan
 * and invoices; the phones signed in to Yallapp Business; updates from
 * Yallapp), each in Studio's frame, then the language, dark mode and
 * signing out. Closes when a page opens, on Esc and on a click beside it.
 */
export function AccountMenu({ label, name, email, role, items, footer }: { label: string; name: string; email: string; role?: string | null; items: { href: string; label: string; icon: string; external?: boolean }[]; footer: ReactNode }) {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    menu.current?.removeAttribute("open");
  }, [path]);

  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      const el = menu.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !el.contains(event.target as Node)) el.removeAttribute("open");
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={menu} className="relative" data-studio-account="">
      <summary
        aria-label={label}
        className="flex h-[38px] w-[38px] cursor-pointer list-none items-center justify-center rounded-full text-sm font-extrabold"
        style={{ background: "#F4EFE6", color: "#0E0D24" }}
      >
        {(name.trim()[0] ?? "?").toUpperCase()}
      </summary>
      <div
        className="absolute end-0 top-[calc(100%+8px)] z-30 flex w-[290px] max-w-[calc(100vw-24px)] flex-col gap-0.5 rounded-2xl p-2 shadow-[0_18px_48px_rgba(14,13,36,0.28)]"
        style={{ border: "1px solid var(--sf-line)", background: "var(--sf-surface)", color: "var(--sf-ink)" }}
      >
        <div className="flex flex-col px-3 pt-2 pb-2.5" style={{ borderBottom: "1px solid var(--sf-line)" }}>
          <span className="truncate text-[15px] font-bold">{name}</span>
          <span className="truncate text-xs" style={{ color: "var(--sf-muted)" }} dir="ltr">
            {email}
          </span>
          {role ? (
            <span className="truncate text-xs" style={{ color: "var(--sf-muted)" }}>
              {role}
            </span>
          ) : null}
        </div>
        <nav aria-label={label} className="flex flex-col gap-0.5 py-1">
          {items.map((item) =>
            item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14.5px] no-underline hover:bg-[var(--sf-soft)]" style={{ color: "var(--sf-ink)" }}>
                <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--sf-muted)" }}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </a>
            ) : (
              <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined} className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14.5px] no-underline hover:bg-[var(--sf-soft)]" style={{ color: "var(--sf-ink)", fontWeight: path === item.href ? 700 : 500, background: path === item.href ? "var(--sf-soft)" : undefined }}>
                <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: 20, color: path === item.href ? "var(--sf-accent)" : "var(--sf-muted)" }}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            ),
          )}
        </nav>
        <div className="px-2 pt-2 pb-1" style={{ borderTop: "1px solid var(--sf-line)" }}>
          {footer}
        </div>
      </div>
    </details>
  );
}
