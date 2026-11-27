import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { myTutorials } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { sections } from "@/components/community/site/source";
import { ago } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Write a tutorial" };

/** 233 Members write tutorials (an article, or a video link); the first ones go through review. The "Official" mark stays the team's. */
export default async function WriteTutorialPage({ searchParams }: { searchParams: Promise<{ error?: string; pending?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.writeTutorial())));
  const w2 = CM_WORDS2[lang];
  const [mine, all] = await Promise.all([myTutorials(), sections(lang, viewer.id)]);
  const back = cmLinks.writeTutorial();
  const st = (s: string) => (s === "published" ? w2.published : s === "pending" ? w2.inReview : w2.held);
  return (
    <SitePage active="tutorials">
      <PageHead title={w2.writeTutorial} />
      <PageNote sp={sp} w2={w2} pendingText={w2.tutorialSent} />
      <ApiForm call={{ m: "POST", p: "/tutorials/drafts", back }} className="cm-card">
        <label className="cm-field">{w2.tutorialTitle}<input name="title" required minLength={10} maxLength={140} /></label>
        <label className="cm-field">{w2.tutorialSummary}<input name="summary" required maxLength={300} /></label>
        <div className="cm-row" style={{ gap: 14 }}>
          <label className="cm-field" style={{ flex: 1 }}>{w.section}<select name="section" required>{all.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
          <label className="cm-field" style={{ flex: 1 }}>{w2.level}<select name="level" defaultValue="beginner">{(["beginner", "intermediate", "advanced"] as const).map((l) => <option key={l} value={l}>{w[`level_${l}`]}</option>)}</select></label>
          <label className="cm-field" style={{ flex: 1 }}>{w.language}<select name="language" defaultValue={lang}><option value="en">English</option><option value="ar">العربية</option><option value="tr">Türkçe</option></select></label>
        </div>
        <fieldset className="cm-field cm-radios">
          <label><input type="radio" name="kind" value="article" defaultChecked /> {w.article}</label>
          <label><input type="radio" name="kind" value="video" /> {w.videoKind}</label>
        </fieldset>
        <label className="cm-field">{w2.videoUrl}<input name="video_url" type="url" placeholder="https://www.youtube.com/watch?v=…" /></label>
        <label className="cm-field">{w2.tutorialBody}<textarea name="body" maxLength={50000} style={{ minHeight: 280 }} /></label>
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.post}</button></div>
      </ApiForm>
      <section className="cm-card">
        <h2>{w2.myTutorials}</h2>
        {mine.items.length ? (
          <ul className="cm-hist">
            {mine.items.map((t) => (
              <li key={t.id}>
                <span>{t.slug && t.status === "published" ? <a href={cmLinks.tutorial(t.slug)}>{t.title}</a> : t.title}</span>
                <span className="pill p-gy">{st(t.status)}</span>
                <span className="cm-muted cm-small">{ago(w, t.created_at)}</span>
                <ApiButton call={{ m: "DELETE", p: `/tutorials/drafts/${encodeURIComponent(t.id)}`, back }} className="cm-link" label={w2.delete} />
              </li>
            ))}
          </ul>
        ) : <p className="cm-muted">{w2.noMyTutorials}</p>}
      </section>
    </SitePage>
  );
}
