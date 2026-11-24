import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberMarkdown } from "@/components/community/site/markdown";
import { Avatar } from "@/components/community/site/avatar";
import { answersLabel, MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import type { Answer, QuestionDetail } from "@/components/community/site/data";
import { AnswerForm, ReplyForm, ReportButton } from "@/components/community/site/forms";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { question, similar } from "@/components/community/site/source";
import { ago, fill, type CmWords } from "@/components/community/site/words";
import { acceptAction, bookmarkAction, voteAction } from "../../actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pending?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang, viewer } = await siteContext();
  const q = await question(slug, { viewerId: viewer?.id ?? null, lang });
  return q ? { title: q.title, description: q.excerpt } : {};
}

/** Up, the score, down: a member's vote shows filled; pressing it again takes it back. */
function Votes({ w, kind, id, slug, score, mine, signedIn }: { w: CmWords; kind: "question" | "answer"; id: string; slug: string; score: number; mine: -1 | 0 | 1; signedIn: boolean }) {
  const button = (value: 1 | -1, icon: string, label: string) =>
    signedIn ? (
      <form action={voteAction}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="value" value={mine === value ? 0 : value} />
        <button type="submit" className={mine === value ? "on" : ""} aria-pressed={mine === value} aria-label={label}>
          <span className={`ms${mine === value ? " f" : ""}`}>{icon}</span>
        </button>
      </form>
    ) : (
      <Link href={cmLinks.signIn(cmLinks.question(slug))} aria-label={label}><span className="ms">{icon}</span></Link>
    );
  return (
    <div className="cm-votes">
      {button(1, "arrow_upward", w.voteUp)}
      <b className="num" aria-label={fill(w.scoreLabel, { n: score })}>{score}</b>
      {button(-1, "arrow_downward", w.voteDown)}
    </div>
  );
}

function AnswerItem({ a, q, w, viewerId }: { a: Answer; q: QuestionDetail; w: CmWords; viewerId: string | null }) {
  const back = cmLinks.question(q.slug);
  return (
    <article className={`cm-card cm-answer${a.accepted ? " accepted" : ""}${a.official ? " official" : ""}`} id={`a-${a.id}`}>
      <Votes w={w} kind="answer" id={a.id} slug={q.slug} score={a.score} mine={a.myVote} signedIn={!!viewerId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cm-row" style={{ gap: 8 }}>
          {a.accepted ? <span className="pill p-gr"><span className="ms f" style={{ fontSize: 15 }}>check_circle</span>{w.acceptedAnswer}</span> : null}
          {a.official ? <span className="pill cm-official"><span className="ms f" style={{ fontSize: 15 }}>verified_user</span>{w.officialAnswer}</span> : null}
        </div>
        <div className="cm-md"><MemberMarkdown source={a.body} /></div>
        <div className="cm-who" style={{ marginTop: 12 }}>
          <Avatar member={a.author} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MemberName member={a.author} w={w} />
            <div className="m">{ago(w, a.createdAt)}</div>
          </div>
          {q.mine ? (
            <form action={acceptAction}>
              <input type="hidden" name="answerId" value={a.id} />
              <input type="hidden" name="slug" value={q.slug} />
              <input type="hidden" name="on" value={a.accepted ? "0" : "1"} />
              <button type="submit" className={`cm-btn ${a.accepted ? "g" : "n"}`} style={{ height: 38, fontSize: 13.5 }}>
                <span className="ms">{a.accepted ? "undo" : "check"}</span>
                {a.accepted ? w.unaccept : w.accept}
              </button>
            </form>
          ) : null}
        </div>
        {a.replies.length ? (
          <ul className="cm-replies">
            {a.replies.map((r) => (
              <li key={r.id}>
                <Avatar member={r.author} size={26} />
                <div>
                  <MemberName member={r.author} w={w} /> <span className="cm-muted" style={{ fontSize: 12 }}>{ago(w, r.createdAt)}</span>
                  <div className="cm-md small"><MemberMarkdown source={r.body} /></div>
                  {viewerId && r.author.id !== viewerId ? <ReportButton w={w} kind="reply" id={r.id} back={back} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="cm-row cm-answer-acts">
          {viewerId ? <ReplyForm w={w} answerId={a.id} slug={q.slug} /> : null}
          {viewerId && a.author.id !== viewerId ? <ReportButton w={w} kind="answer" id={a.id} back={back} /> : null}
        </div>
      </div>
    </article>
  );
}

/** 231 A question: its votes, details and tags, then its answers (accepted, then official, then by score) and the answer form. */
export default async function QuestionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { lang, w, viewer } = await siteContext();
  const q = await question(slug, { viewerId: viewer?.id ?? null, lang, countView: true });
  if (!q) notFound();
  const like = (await similar({ title: q.title, section: q.section.slug, limit: 6, viewerId: viewer?.id ?? null, lang })).filter((s) => s.id !== q.id).slice(0, 5);
  const back = cmLinks.question(q.slug);
  const rail = (
    <section className="cm-box">
      <h5>{w.similarTitleShort}</h5>
      {like.length ? (
        like.map((s) => (
          <Link key={s.id} href={cmLinks.question(s.slug)} className="cm-wq">
            <div className="n num">{s.answerCount}<small>{w.answerWord}</small></div>
            <div><b>{s.title}</b><div className="m">{s.section.name}</div></div>
          </Link>
        ))
      ) : (
        <p className="cm-muted" style={{ fontSize: 13 }}>{w.noSimilar}</p>
      )}
    </section>
  );
  return (
    <SitePage active="questions" rail={rail}>
      {sp.pending ? (
        <div className="cm-note" role="status" style={{ marginTop: 0, marginBottom: 14 }}>
          <span className="ms f">hourglass_top</span>
          {w.questionPending}
        </div>
      ) : null}
      <article className="cm-card cm-answer">
        <Votes w={w} kind="question" id={q.id} slug={q.slug} score={q.score} mine={q.myVote} signedIn={!!viewer} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cm-q">
            <div className="tg">
              <Link href={cmLinks.questions({ section: q.section.slug })} className="pill p-or">{q.section.name}</Link>
              {q.tags.map((t) => (
                <Link key={t.slug} href={cmLinks.questions({ tag: t.slug })} className="pill p-gy">{t.name}</Link>
              ))}
            </div>
          </div>
          <h1>{q.title}</h1>
          <div className="cm-who" style={{ marginTop: 12 }}>
            <Avatar member={q.author} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <MemberName member={q.author} w={w} />
              <div className="m">{ago(w, q.createdAt)} · {(q.views === 1 ? w.oneView : fill(w.views, { n: q.views }))}</div>
            </div>
          </div>
          <div className="cm-md"><MemberMarkdown source={q.body} /></div>
          <div className="cm-row cm-answer-acts">
            {viewer ? (
              <form action={bookmarkAction}>
                <input type="hidden" name="kind" value="question" />
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="on" value={q.bookmarked ? "0" : "1"} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="cm-link" aria-pressed={q.bookmarked}>
                  <span className={`ms${q.bookmarked ? " f" : ""}`}>bookmark</span>
                  {q.bookmarked ? w.savedOne : w.save}
                </button>
              </form>
            ) : null}
            {viewer && !q.mine ? <ReportButton w={w} kind="question" id={q.id} back={back} /> : null}
          </div>
        </div>
      </article>
      <h2 className="cm-h2">{answersLabel(w, q.answers.length)}</h2>
      {q.answers.map((a) => (
        <AnswerItem key={a.id} a={a} q={q} w={w} viewerId={viewer?.id ?? null} />
      ))}
      {viewer ? (
        <AnswerForm w={w} questionId={q.id} slug={q.slug} />
      ) : (
        <div className="cm-card cm-row">
          <span style={{ flex: 1 }}>{w.signInToAnswer}</span>
          <Link href={cmLinks.signIn(back)} className="cm-btn o">{w.logIn}</Link>
        </div>
      )}
    </SitePage>
  );
}
