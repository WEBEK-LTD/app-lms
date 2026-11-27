import type { ReactNode } from "react";
import { siteContext } from "./context";
import { groups, unreadConversations } from "./next";
import { Frame, Header, SideNav, TabBar, type NavKey } from "./shell";
import { sections, siteStats } from "./source";

/** A Community page: the header, the nav, the centre (and the rail where given) and the phone's tab bar. */
export async function SitePage({ active, rail, q, children }: { active: NavKey; rail?: ReactNode; q?: string; children: ReactNode }) {
  const { lang, w, viewer } = await siteContext();
  const [all, stats, mine, unreadMessages] = await Promise.all([
    viewer ? sections(lang, viewer.id) : Promise.resolve([]),
    siteStats(),
    viewer ? groups({ mine: true }).then((p) => p.items.map((g) => ({ slug: g.slug, name: g.name }))) : Promise.resolve([]),
    viewer ? unreadConversations() : Promise.resolve(0),
  ]);
  const followed = all.filter((s) => s.followed);
  return (
    <>
      <a href="#cm-content" className="cm-sr">{w.skip}</a>
      <Header w={w} lang={lang} viewer={viewer} unread={viewer?.unread ?? 0} unreadMessages={unreadMessages} active={active} mySections={followed} myGroups={mine} newCount={stats.newQuestions} q={q} />
      <Frame nav={<SideNav w={w} lang={lang} active={active} viewer={viewer} mySections={followed} myGroups={mine} newCount={stats.newQuestions} />} rail={rail}>
        {children}
      </Frame>
      <TabBar w={w} active={active} viewer={viewer} />
    </>
  );
}
