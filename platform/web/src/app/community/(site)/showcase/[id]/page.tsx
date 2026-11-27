/* eslint-disable @next/next/no-img-element -- a showcase app's screenshots, from the community's file store. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { showcaseComments, showcaseItem } from "@/components/community/site/next";
import { ApiButton, Comments, PageNote, Who } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, compact } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; pending?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const it = await showcaseItem((await params).id);
  return it ? { title: it.title, description: it.description.slice(0, 160) } : {};
}

/** 232 A showcase app: its pictures, description, store links and the "Made with Yallapp" check, with likes and comments. */
export default async function ShowcaseItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const [it, comments] = await Promise.all([showcaseItem(id), showcaseComments(id)]);
  if (!it) notFound();
  const back = cmLinks.showcaseItem(it.id);
  const p = `/showcase/${encodeURIComponent(it.id)}`;
  const links = [
    it.app_store_url ? { href: it.app_store_url, label: w2.appStore, icon: "phone_iphone" } : null,
    it.play_store_url ? { href: it.play_store_url, label: w2.googlePlay, icon: "android" } : null,
    it.website_url ? { href: it.website_url, label: w2.website, icon: "language" } : null,
  ].filter((l): l is { href: string; label: string; icon: string } => !!l);
  return (
    <SitePage active="showcase">
      <PageNote sp={sp} w2={w2} />
      <article className="cm-card cm-sc-page">
        <div className="cm-row" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{it.title}</h1>
            <Who member={it.author} w={w} sub={ago(w, it.created_at)} size={36} />
          </div>
          {it.made_with_yallapp ? <span className="pill p-gr" title={w2.madeWithYallappHint}><span className="ms f" aria-hidden="true">verified</span>{w2.madeWithYallapp}</span> : null}
        </div>
        {it.pictures.length ? (
          <div className="cm-shots">{it.pictures.map((src) => <a key={src} href={src} target="_blank" rel="noopener"><img src={src} alt="" loading="lazy" /></a>)}</div>
        ) : null}
        {it.description ? <p className="cm-body">{it.description}</p> : null}
        {links.length ? (
          <div className="cm-row">
            {links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener nofollow ugc" className="cm-btn g"><span className="ms" aria-hidden="true">{l.icon}</span>{l.label}</a>)}
          </div>
        ) : null}
        <div className="cm-acts">
          <ApiButton call={{ m: it.liked ? "DELETE" : "PUT", p: `${p}/like`, back }} className={`cm-act${it.liked ? " on" : ""}`} icon="favorite" pressed={it.liked} label={compact(it.like_count)} title={it.liked ? w2.liked : w2.like} />
          <span className="sp" />
          {viewer?.id === it.author.id ? <ApiButton call={{ m: "DELETE", p, back, to: cmLinks.showcase() }} className="cm-link" icon="delete" label={w2.delete} /> : null}
        </div>
      </article>
      <Comments items={comments.items} w={w} w2={w2} back={back} path={`${p}/comments`} canWrite={!!viewer} />
    </SitePage>
  );
}
