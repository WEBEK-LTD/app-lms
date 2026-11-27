import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { post, postComments } from "@/components/community/site/next";
import { ApiButton, Comments, PageNote, PostCard } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; pending?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await post((await params).id);
  return p ? { title: `${p.author.name}: ${p.body.slice(0, 60)}`, description: p.body.slice(0, 160) } : {};
}

/** 232 A post on its own page, with its comments and replies. */
export default async function PostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const [p, comments] = await Promise.all([post(id), postComments(id)]);
  if (!p) notFound();
  const back = cmLinks.post(p.id);
  const mine = viewer?.id === p.author.id;
  return (
    <SitePage active="home">
      <PageNote sp={sp} w2={w2} />
      <PostCard post={p} w={w} w2={w2} back={back} full />
      {mine ? (
        <div className="cm-row" style={{ marginBottom: 14 }}>
          <ApiButton call={{ m: "DELETE", p: `/posts/${encodeURIComponent(p.id)}`, back, to: cmLinks.home() }} className="cm-link" icon="delete" label={w2.delete} />
        </div>
      ) : null}
      <Comments items={comments.items} w={w} w2={w2} back={back} path={`/posts/${encodeURIComponent(p.id)}/comments`} canWrite={!!viewer} />
    </SitePage>
  );
}
