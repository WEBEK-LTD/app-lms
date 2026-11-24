import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QuestionCard, TutorialCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { saved } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

/** 231 The questions and tutorials the member saved. */
export default async function SavedPage() {
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.saved()));
  const s = await saved(viewer.id, lang);
  return (
    <SitePage active="none">
      <div className="cm-card"><h1>{w.saved}</h1></div>
      {!s.questions.length && !s.tutorials.length ? <div className="cm-empty"><span className="ms f">bookmark</span>{w.nothingSaved}</div> : null}
      {s.questions.length ? (
        <>
          <h2 className="cm-h2">{w.navQuestions}</h2>
          <div className="cm-two">{s.questions.map((q) => <QuestionCard key={q.id} q={q} w={w} />)}</div>
        </>
      ) : null}
      {s.tutorials.length ? (
        <>
          <h2 className="cm-h2">{w.navTutorials}</h2>
          <div className="cm-grid3">{s.tutorials.map((t) => <TutorialCard key={t.id} t={t} w={w} />)}</div>
        </>
      ) : null}
    </SitePage>
  );
}
