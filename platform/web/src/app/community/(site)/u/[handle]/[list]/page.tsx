import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { memberList, profile } from "@/components/community/site/source";

const LISTS = ["followers", "following", "friends"] as const;
type Props = { params: Promise<{ handle: string; list: string }>; searchParams: Promise<{ cursor?: string }> };

export const metadata: Metadata = { robots: { index: false } };

/** 231 A member's followers, the members they follow, or their friends. */
export default async function MemberListPage({ params, searchParams }: Props) {
  const [{ handle: raw, list: rawList }, sp] = await Promise.all([params, searchParams]);
  const handle = decodeURIComponent(raw);
  const list = LISTS.find((l) => l === rawList);
  if (!list) notFound();
  const { lang, w, viewer } = await siteContext();
  const p = await profile(handle, { viewerId: viewer?.id ?? null, lang });
  if (!p) notFound();
  const page = await memberList(handle, list, { viewerId: viewer?.id ?? null, cursor: sp.cursor });
  const title = list === "followers" ? w.followers : list === "following" ? w.followingList : w.navFriends;
  return (
    <SitePage active="none">
      <div className="cm-card">
        <Link href={cmLinks.member(p.member.handle)} className="cm-link"><span className="ms">arrow_back</span>{p.member.name}</Link>
        <h1 style={{ marginTop: 8 }}>{title}</h1>
        <div className="cm-tabs" style={{ marginBottom: 0 }}>
          {LISTS.map((l) => (
            <Link key={l} href={cmLinks.memberList(p.member.handle, l)} className={l === list ? "on" : ""}>
              {l === "followers" ? w.followers : l === "following" ? w.followingList : w.navFriends}
            </Link>
          ))}
        </div>
      </div>
      {page.items.length ? (
        <div className="cm-card cm-people">
          {page.items.map((m) => (
            <Link key={m.id} href={cmLinks.member(m.handle)} className="cm-who">
              <Avatar member={m} size={44} />
              <div style={{ minWidth: 0 }}><MemberName member={m} w={w} /><div className="m">@{m.handle}</div></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="cm-empty"><span className="ms f">group</span>{w.nobodyYet}</div>
      )}
      {page.next ? (
        <div className="cm-row" style={{ justifyContent: "center" }}>
          <Link href={`${cmLinks.memberList(p.member.handle, list)}?cursor=${encodeURIComponent(page.next)}`} className="cm-btn g">{w.more}</Link>
        </div>
      ) : null}
    </SitePage>
  );
}
