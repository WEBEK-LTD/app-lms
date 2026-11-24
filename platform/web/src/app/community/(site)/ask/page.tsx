import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { AskForm } from "@/components/community/site/forms";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { sections } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Ask the community", robots: { index: false } };

/** 231 Ask: signed-in members only; similar questions show while the title is typed. */
export default async function AskPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.ask()));
  const all = await sections(lang, viewer.id);
  return (
    <SitePage active="questions">
      <div style={{ maxWidth: 760 }}>
        <AskForm w={w} sections={all.map((s) => ({ slug: s.slug, name: s.name }))} section={sp.section} />
      </div>
    </SitePage>
  );
}
