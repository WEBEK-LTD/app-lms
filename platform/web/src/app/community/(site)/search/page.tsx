import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName, QuestionPost, TutorialCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { search } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

/** 231 Search: questions, tutorials and members. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 120);
  const { lang, w, viewer } = await siteContext();
  const found = q ? await search({ q, viewerId: viewer?.id ?? null, lang, limit: 20 }) : { questions: [], tutorials: [], members: [] };
  const none = q && !found.questions.length && !found.tutorials.length && !found.members.length;
  return (
    <SitePage active="none" q={q}>
      <form className="cm-card" action={cmLinks.search()} role="search">
        <h1>{q ? fill(w.resultsFor, { q }) : w.search}</h1>
        <div className="cm-row" style={{ marginTop: 12 }}>
          <label className="cm-field" style={{ flex: 1, marginTop: 0 }}>
            <span className="cm-sr">{w.search}</span>
            <input type="search" name="q" defaultValue={q} placeholder={w.searchPlaceholder} autoFocus={!q} />
          </label>
          <button type="submit" className="cm-btn o"><span className="ms" aria-hidden="true">search</span>{w.search}</button>
        </div>
      </form>
      {none ? <div className="cm-empty"><span className="ms f" aria-hidden="true">search_off</span>{w.noResults}</div> : null}
      {found.members.length ? (
        <section className="cm-card">
          <h2>{w.members}</h2>
          <div className="cm-people">
            {found.members.map((m) => (
              <Link key={m.id} href={cmLinks.member(m.handle ?? m.id)} className="cm-who">
                <Avatar member={m} size={40} />
                <div><MemberName member={m} w={w} /><div className="m">@{m.handle}</div></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {found.questions.length ? <h2 className="cm-h2">{w.navQuestions}</h2> : null}
      {found.questions.map((x) => <QuestionPost key={x.id} q={x} w={w} />)}
      {found.tutorials.length ? (
        <>
          <h2 className="cm-h2">{w.navTutorials}</h2>
          <div className="cm-grid3">{found.tutorials.map((t) => <TutorialCard key={t.id} t={t} w={w} />)}</div>
        </>
      ) : null}
    </SitePage>
  );
}
