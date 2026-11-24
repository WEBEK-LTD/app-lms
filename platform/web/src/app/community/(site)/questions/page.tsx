import type { Metadata } from "next";
import Link from "next/link";
import { QuestionPost } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { FeedTabs, feedTab, Rail } from "@/components/community/site/feed";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { questions, sections } from "@/components/community/site/source";
import { followSectionAction } from "../actions";

export const metadata: Metadata = { title: "Q&A" };

/** 231 Q&A: every question, by tab, section or tag, a page at a time. */
export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; section?: string; tag?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const tab = feedTab(sp.tab);
  const [all, list] = await Promise.all([
    sections(lang, viewer?.id ?? null),
    questions({ viewerId: viewer?.id ?? null, lang, tab, section: sp.section, tag: sp.tag, cursor: sp.cursor, limit: 20 }),
  ]);
  const current = all.find((s) => s.slug === sp.section);
  const here = cmLinks.questions({ tab: sp.tab, section: sp.section, tag: sp.tag });
  return (
    <SitePage active="questions" rail={<Rail w={w} lang={lang} viewer={viewer} />}>
      <div className="cm-card cm-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{current ? current.name : sp.tag ? `#${sp.tag}` : w.navQuestions}</h1>
          <p className="cm-muted">{current ? w.sectionIntro : w.questionsIntro}</p>
        </div>
        {current && viewer ? (
          <form action={followSectionAction}>
            <input type="hidden" name="slug" value={current.slug} />
            <input type="hidden" name="on" value={current.followed ? "0" : "1"} />
            <input type="hidden" name="back" value={here} />
            <button type="submit" className={`cm-btn ${current.followed ? "g" : "n"}`}>
              <span className="ms">{current.followed ? "check" : "add"}</span>
              {current.followed ? w.followingSection : w.followSection}
            </button>
          </form>
        ) : null}
        <Link href={viewer ? cmLinks.ask() : cmLinks.signIn(cmLinks.ask())} className="cm-btn o"><span className="ms">add</span>{w.askShort}</Link>
      </div>
      <FeedTabs w={w} tab={tab} section={sp.section} sections={all} base={(q) => cmLinks.questions({ ...q, tag: sp.tag })} />
      {list.items.length ? (
        list.items.map((q) => <QuestionPost key={q.id} q={q} w={w} />)
      ) : (
        <div className="cm-empty"><span className="ms f">forum</span>{w.emptyFeed}</div>
      )}
      {list.next ? (
        <div className="cm-row" style={{ justifyContent: "center" }}>
          <Link href={`${here}${here.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(list.next)}`} className="cm-btn g">{w.more}</Link>
        </div>
      ) : null}
    </SitePage>
  );
}
