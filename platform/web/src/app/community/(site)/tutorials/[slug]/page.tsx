import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberMarkdown } from "@/components/community/site/markdown";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName, TutorialCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { tutorial, tutorials } from "@/components/community/site/source";
import { ago, CM_LANG_INFO } from "@/components/community/site/words";
import { bookmarkAction } from "../../actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang, viewer } = await siteContext();
  const t = await tutorial(slug, { viewerId: viewer?.id ?? null, lang });
  return t ? { title: t.title } : {};
}

/** Only video addresses the team publishes from (YouTube, Vimeo) play inside the page. */
function embed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
  } catch {
    return null;
  }
  return null;
}

/** 231 A tutorial: its video or article, level, language and section, and more from the section. */
export default async function TutorialPage({ params }: Props) {
  const { slug } = await params;
  const { lang, w, viewer } = await siteContext();
  const t = await tutorial(slug, { viewerId: viewer?.id ?? null, lang, countView: true });
  if (!t) notFound();
  const more = (await tutorials({ viewerId: viewer?.id ?? null, lang, section: t.section.slug, limit: 4 })).items.filter((x) => x.id !== t.id).slice(0, 3);
  const video = t.kind === "video" && t.videoUrl ? embed(t.videoUrl) : null;
  return (
    <SitePage active="tutorials">
      <article className="cm-card">
        <div className="cm-q">
          <div className="tg">
            <span className="pill p-vi">{t.kind === "video" ? w.videoKind : w.article}</span>
            <Link href={cmLinks.tutorials({ section: t.section.slug })} className="pill p-gy">{t.section.name}</Link>
            <span className="pill p-gr">{w[`level_${t.level}`]}</span>
            <span className="pill p-gy">{CM_LANG_INFO[t.language].native}</span>
          </div>
        </div>
        <h1>{t.title}</h1>
        <div className="cm-who" style={{ marginTop: 12 }}>
          <Avatar member={t.author} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MemberName member={t.author} w={w} />
            <div className="m">{ago(w, t.createdAt)}</div>
          </div>
          {viewer ? (
            <form action={bookmarkAction}>
              <input type="hidden" name="kind" value="tutorial" />
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="on" value={t.bookmarked ? "0" : "1"} />
              <input type="hidden" name="back" value={cmLinks.tutorial(t.slug)} />
              <button type="submit" className="cm-link" aria-pressed={t.bookmarked}>
                <span className={`ms${t.bookmarked ? " f" : ""}`}>bookmark</span>
                {t.bookmarked ? w.savedOne : w.save}
              </button>
            </form>
          ) : null}
        </div>
        {video ? (
          <div className="cm-player">
            <iframe src={video} title={t.title} allow="encrypted-media; picture-in-picture; fullscreen" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        ) : t.kind === "video" && t.videoUrl ? (
          <video className="cm-player" src={t.videoUrl} controls preload="metadata" poster={t.coverUrl ?? undefined} />
        ) : t.coverUrl ? (
          <div className="cm-vid" style={{ height: 260, marginTop: 16, backgroundImage: `url(${t.coverUrl})` }} />
        ) : null}
        {t.body ? <div className="cm-md"><MemberMarkdown source={t.body} /></div> : null}
      </article>
      {more.length ? (
        <>
          <h2 className="cm-h2">{w.moreTutorials}</h2>
          <div className="cm-grid3">
            {more.map((x) => <TutorialCard key={x.id} t={x} w={w} />)}
          </div>
        </>
      ) : null}
    </SitePage>
  );
}
