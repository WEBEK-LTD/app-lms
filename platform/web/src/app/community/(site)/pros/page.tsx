import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { myPro, pros } from "@/components/community/site/next";
import { Empty, More, PageHead, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Pros" };

/** 234 Pros: members who build apps for others, best rated first; search by name or skill, available only. */
export default async function ProsPage({ searchParams }: { searchParams: Promise<{ q?: string; available?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const available = sp.available === "1";
  const [list, mine] = await Promise.all([pros({ q: sp.q, available: available || undefined, cursor: sp.cursor }), viewer ? myPro() : Promise.resolve(null)]);
  const here = `${cmLinks.pros()}${sp.q || available ? `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(available ? { available: "1" } : {}) })}` : ""}`;
  const avail = { available: w2.available, busy: w2.busy, unavailable: w2.unavailable };
  return (
    <SitePage active="pros">
      <PageHead title={w2.prosTitle} intro={w2.prosIntro}>
        {viewer ? <Link href={cmLinks.hireRequests()} className="cm-btn g"><span className="ms" aria-hidden="true">inbox</span>{w2.hireRequests}</Link> : null}
        <Link href={viewer ? cmLinks.proEdit() : cmLinks.signIn(cmLinks.proEdit())} className="cm-btn o">{mine ? w2.editPro : w2.openPro}</Link>
      </PageHead>
      <form className="cm-tabs cm-filter" action={cmLinks.pros()} role="search">
        <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder={w2.skills} aria-label={w2.search} />
        <label className="cm-check"><input type="checkbox" name="available" value="1" defaultChecked={available} /> {w2.available}</label>
        <button type="submit" className="cm-btn g">{w2.search}</button>
      </form>
      {list.items.length ? (
        <div className="cm-grid2">
          {list.items.map((p) => (
            <Link key={p.member.id} href={cmLinks.pro(p.member.handle ?? p.member.id)} className="cm-pro">
              <Avatar member={p.member} size={52} />
              <span className="txt">
                <MemberName member={p.member} w={w} />
                <b>{p.headline}</b>
                <span className="cm-row" style={{ gap: 6 }}>
                  <span className={`pill ${p.availability === "available" ? "p-gr" : "p-gy"}`}>{avail[p.availability]}</span>
                  {p.rating !== null ? <span className="cm-small"><span className="ms f" aria-hidden="true">star</span>{p.rating.toFixed(1)} ({p.review_count})</span> : null}
                  <span className="cm-muted cm-small">{fill(w2.jobsDone, { n: p.done_count })}</span>
                </span>
                <span className="cm-muted cm-small">{p.skills.slice(0, 5).join(" · ")}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <Empty icon="work" text={w2.noPros} />}
      <More href={withCursor(here, list.next)} w2={w2} />
    </SitePage>
  );
}
