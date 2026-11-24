import type { Metadata } from "next";
import Link from "next/link";
import { TutorialCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { sections, tutorials } from "@/components/community/site/source";
import { CM_LANG_INFO, CM_LANGS } from "@/components/community/site/words";

export const metadata: Metadata = { title: "Tutorials" };

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

/** 231 The Yallapp team's tutorials, articles and videos, by section, level, language and kind. */
export default async function TutorialsPage({ searchParams }: { searchParams: Promise<{ section?: string; level?: string; language?: string; kind?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const [all, list] = await Promise.all([sections(lang, viewer?.id ?? null), tutorials({ viewerId: viewer?.id ?? null, lang, section: sp.section, level: sp.level, language: sp.language, kind: sp.kind, cursor: sp.cursor, limit: 18 })]);
  const q = { section: sp.section, level: sp.level, language: sp.language, kind: sp.kind };
  // A chip for one value of a filter: on when chosen; pressing a chosen level or language clears it.
  const chip = (key: keyof typeof q, value: string | undefined, label: string, toggle = false) => {
    const on = q[key] === value;
    return (
      <Link key={`${key}-${value ?? "all"}`} href={cmLinks.tutorials({ ...q, [key]: toggle && on ? undefined : value, cursor: undefined } as Record<string, string | undefined>)} className={on ? "on" : ""} aria-pressed={on}>
        {label}
      </Link>
    );
  };
  return (
    <SitePage active="tutorials">
      <div className="cm-card">
        <h1>{w.navTutorials}</h1>
        <p className="cm-muted" style={{ marginTop: 4 }}>{w.tutorialsIntro}</p>
      </div>
      <div className="cm-tabs">
        {chip("kind", undefined, w.all)}
        {chip("kind", "article", w.article)}
        {chip("kind", "video", w.videoKind)}
        <span className="cm-tabsep" />
        {LEVELS.map((l) => chip("level", l, w[`level_${l}`], true))}
        <span className="cm-tabsep" />
        {CM_LANGS.map((l) => chip("language", l, CM_LANG_INFO[l].native, true))}
      </div>
      {all.length ? (
        <div className="cm-tabs" style={{ marginTop: -6 }}>
          {chip("section", undefined, w.allSections)}
          {all.map((s) => chip("section", s.slug, s.name))}
        </div>
      ) : null}
      {list.items.length ? (
        <div className="cm-grid3">
          {list.items.map((t) => <TutorialCard key={t.id} t={t} w={w} />)}
        </div>
      ) : (
        <div className="cm-empty"><span className="ms f">menu_book</span>{w.noTutorials}</div>
      )}
      {list.next ? (
        <div className="cm-row" style={{ justifyContent: "center" }}>
          <Link href={`${cmLinks.tutorials(q)}${Object.values(q).some(Boolean) ? "&" : "?"}cursor=${encodeURIComponent(list.next)}`} className="cm-btn g">{w.more}</Link>
        </div>
      ) : null}
    </SitePage>
  );
}
