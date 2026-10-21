import type { ReactNode } from "react";
import { DEFAULT_LANG, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { LogoLink } from "./brand";
import { MiniFooter } from "./site-chrome";
import { ThemeSwitch } from "./theme-switch";

/**
 * Ivory page with the logo header, used for sign-in, sign-up and account status pages.
 * 55 The sign-in pages pass their `lang` and `languages` (the switcher in the footer).
 */
export function AuthShell({
  aside,
  children,
  footer = true,
  lang = DEFAULT_LANG,
  languages = false,
}: {
  aside?: ReactNode;
  children: ReactNode;
  footer?: boolean;
  lang?: Lang;
  languages?: boolean;
}) {
  return (
    <div data-site-theme="" className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-4 px-4 py-[22px] sm:px-6">
        <LogoLink href={localePath(lang, "/")} adaptive alt={messagesFor(lang).nav.logoHome} />
        <div className="flex flex-wrap items-center gap-3">
          {aside}
          {/* 73 Light or dark. */}
          <ThemeSwitch label={messagesFor(lang).nav.darkMode} />
        </div>
      </header>
      {children}
      {footer ? <MiniFooter lang={lang} languages={languages} /> : null}
    </div>
  );
}
