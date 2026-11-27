/* eslint-disable @next/next/no-img-element -- course covers, from the community's file store. */
import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { courses, myCourses, type CourseSummary } from "@/components/community/site/next";
import { Empty, PageHead } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill, type CmWords } from "@/components/community/site/words";
import { CM_WORDS2, type CmWords2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Academy" };

function CourseCard({ c, w, w2 }: { c: CourseSummary; w: CmWords; w2: CmWords2 }) {
  return (
    <Link href={cmLinks.course(c.slug)} className="cm-course">
      <span className="cov">{c.cover_url ? <img src={c.cover_url} alt="" loading="lazy" /> : <span className="ms" aria-hidden="true">school</span>}</span>
      <span className="txt">
        <span className="cm-row" style={{ gap: 6 }}>
          <span className="pill p-gy">{w[`level_${c.level}`]}</span>
          {c.access === "open" ? <span className="pill p-gr">{c.free ? w2.free : w2.open}</span> : <span className="pill p-gy"><span className="ms" aria-hidden="true">lock</span>{c.price_label ?? w2.locked}</span>}
        </span>
        <b>{c.title}</b>
        <span className="cm-muted cm-clamp2">{c.summary}</span>
        <span className="cm-muted cm-small">{fill(w2.lessons, { n: c.lesson_count })}</span>
        {c.progress !== null && c.progress > 0 ? <span className="cm-bar" aria-label={fill(w2.progress, { n: Math.round(c.progress * 100) })}><i style={{ width: `${Math.round(c.progress * 100)}%` }} /></span> : null}
      </span>
    </Link>
  );
}

/** 233 The Academy: the team's courses (free or paid on the website), and the member's own courses with their progress. */
export default async function AcademyPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const level = ["beginner", "intermediate", "advanced"].find((l) => l === sp.level);
  const [all, mine] = await Promise.all([courses(level), viewer ? myCourses() : Promise.resolve({ items: [], next: null })]);
  return (
    <SitePage active="academy">
      <PageHead title={w2.academyTitle} intro={w2.academyIntro} />
      {mine.items.length ? (
        <>
          <h2 className="cm-h2">{w2.myCourses}</h2>
          <div className="cm-grid3">{mine.items.map((c) => <CourseCard key={c.id} c={c} w={w} w2={w2} />)}</div>
        </>
      ) : null}
      <div className="cm-tabs">
        <Link href={cmLinks.academy()} className={level ? "" : "on"}>{w2.all}</Link>
        {(["beginner", "intermediate", "advanced"] as const).map((l) => <Link key={l} href={`${cmLinks.academy()}?level=${l}`} className={level === l ? "on" : ""}>{w[`level_${l}`]}</Link>)}
      </div>
      {all.items.length ? <div className="cm-grid3">{all.items.map((c) => <CourseCard key={c.id} c={c} w={w} w2={w2} />)}</div> : <Empty icon="school" text={w.noTutorials} />}
    </SitePage>
  );
}
