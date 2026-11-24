import Link from "next/link";
import type { ReactNode } from "react";
import { LangSelect } from "./client";
import { cmLinks } from "./links";
import type { CmLang, CmWords } from "./words";

/** The sign-in pages: the welcome's night background, the logo, the language, and a card. */
export function AuthShell({ w, lang, children }: { w: CmWords; lang: CmLang; children: ReactNode }) {
  return (
    <div className="cm-land">
      <div className="cm-land-top">
        <Link href={cmLinks.home()} className="cm-land-brand"><img src="/community/logo.svg" alt="" /><b className="brandword">Yallapp Community</b></Link>
        <div className="cm-land-lang"><LangSelect lang={lang} label={w.language} /></div>
      </div>
      <main className="cm-land-card" id="cm-content">{children}</main>
    </div>
  );
}
