"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The dashboard's main column: the page in its padded, centred frame with
 * the page's help on top; 106 Studio Market's market and a template's page
 * run edge to edge instead (their own walls and stages, globals.css `.mk`).
 * Chosen from the address, the same on the server and in the browser.
 */
export function DashboardMain({ help, banner, children }: { help: ReactNode; banner: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const bare = /^\/dashboard\/studio-market(?:\/t\/[^/]+)?\/?$/.test(pathname);
  if (bare) {
    return (
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {banner ? <div className="px-4 pt-4 sm:px-8 lg:px-10">{banner}</div> : null}
        {children}
      </main>
    );
  }
  return (
    <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-8 sm:pt-8 lg:px-10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
        {help}
        {banner}
        {children}
      </div>
    </main>
  );
}
