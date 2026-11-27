import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { ApiForm, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Create a group" };

/** 232 Create a group (who may follows the admin's "Who can create groups"; the API says no otherwise). */
export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.groupNew())));
  const w2 = CM_WORDS2[lang];
  return (
    <SitePage active="groups">
      <PageHead title={w2.createGroup} />
      {sp.error === "forbidden" || sp.error === "not_allowed_to_create" ? <div className="cm-note err" role="alert">{w2.cannotCreateGroups}</div> : <PageNote sp={sp} w2={w2} />}
      <ApiForm call={{ m: "POST", p: "/groups", back: cmLinks.groupNew(), to: cmLinks.group("{slug}") }} className="cm-card">
        <label className="cm-field">{w2.groupName}<input name="name" required minLength={3} maxLength={80} /></label>
        <label className="cm-field">{w2.description}<textarea name="description" maxLength={2000} /></label>
        <fieldset className="cm-field cm-radios">
          <label><input type="radio" name="visibility" value="public" defaultChecked /> {w2.groupPublic}</label>
          <label><input type="radio" name="visibility" value="private" /> {w2.groupPrivate}</label>
        </fieldset>
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.createGroup}</button></div>
      </ApiForm>
    </SitePage>
  );
}
