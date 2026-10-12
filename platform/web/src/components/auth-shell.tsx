import type { ReactNode } from "react";
import { LogoLink } from "./brand";
import { MiniFooter } from "./site-chrome";

/** Ivory page with the logo header, used for sign-in, sign-up and account status pages. */
export function AuthShell({ aside, children, footer = true }: { aside?: ReactNode; children: ReactNode; footer?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-4 px-4 py-[22px] sm:px-6">
        <LogoLink />
        {aside}
      </header>
      {children}
      {footer ? <MiniFooter /> : null}
    </div>
  );
}
