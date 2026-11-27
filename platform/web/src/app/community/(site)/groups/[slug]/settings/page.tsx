import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { group } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { GroupHead } from "../head";

export const metadata: Metadata = { title: "Group settings" };

/** 232 A group's settings, for its owner and moderators: name, description, public or private, cover; the owner deletes it. */
export default async function GroupSettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const g = await group(slug);
  if (!g || !(g.standing.role === "owner" || g.standing.role === "moderator")) notFound();
  const back = cmLinks.group(g.slug, "settings");
  const p = `/groups/${encodeURIComponent(g.slug)}`;
  return (
    <SitePage active="groups">
      <GroupHead g={g} w2={w2} viewer={viewer} tab="settings" />
      <PageNote sp={sp} w2={w2} />
      <ApiForm call={{ m: "PATCH", p, back, done: "saved" }} className="cm-card">
        <label className="cm-field">{w2.groupName}<input name="name" required minLength={3} maxLength={80} defaultValue={g.name} /></label>
        <label className="cm-field">{w2.description}<textarea name="description" maxLength={2000} defaultValue={g.description} /></label>
        <fieldset className="cm-field cm-radios">
          <label><input type="radio" name="visibility" value="public" defaultChecked={g.visibility === "public"} /> {w2.groupPublic}</label>
          <label><input type="radio" name="visibility" value="private" defaultChecked={g.visibility === "private"} /> {w2.groupPrivate}</label>
        </fieldset>
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button></div>
      </ApiForm>
      <ApiForm call={{ m: "PUT", p: `${p}/cover`, back, done: "saved", multipart: true }} className="cm-card">
        <label className="cm-field">{w2.cover}<input type="file" name="cover" accept="image/png,image/jpeg,image/webp" required /></label>
        <div className="cm-row" style={{ marginTop: 12 }}><button type="submit" className="cm-btn g">{w2.saveChanges}</button></div>
      </ApiForm>
      {g.standing.role === "owner" ? (
        <div className="cm-row"><ApiButton call={{ m: "DELETE", p, back, to: cmLinks.groups() }} className="cm-link" icon="delete" label={w2.delete} /></div>
      ) : null}
    </SitePage>
  );
}
