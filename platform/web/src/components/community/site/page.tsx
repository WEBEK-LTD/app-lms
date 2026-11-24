import type { ReactNode } from "react";
import { siteContext } from "./context";
import { Frame, Header, SideNav, TabBar, type NavKey } from "./shell";
import { sections, siteStats } from "./source";

/** A Community page: the header, the nav, the centre (and the rail where given) and the phone's tab bar. */
export async function SitePage({ active, rail, q, children }: { active: NavKey; rail?: ReactNode; q?: string; children: ReactNode }) {
  const { lang, w, viewer } = await siteContext();
  const [all, stats] = await Promise.all([viewer ? sections(lang, viewer.id) : Promise.resolve([]), siteStats()]);
  const mine = all.filter((s) => s.followed);
  return (
    <>
      <a href="#cm-content" className="cm-sr">{w.skip}</a>
      <Header w={w} lang={lang} viewer={viewer} unread={viewer?.unread ?? 0} active={active} mySections={mine} newCount={stats.newQuestions} q={q} />
      <Frame nav={<SideNav w={w} active={active} viewer={viewer} mySections={mine} newCount={stats.newQuestions} />} rail={rail}>
        {children}
      </Frame>
      <TabBar w={w} active={active} viewer={viewer} />
    </>
  );
}
