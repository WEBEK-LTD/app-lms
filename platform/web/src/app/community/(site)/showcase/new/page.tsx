import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { ApiForm, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2, SHOWCASE_TYPES as TYPES } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Show your app" };


/** 232 Show an app one built: pictures, description and store links (verified "Made with Yallapp" when it is the member's linked account's). */
export default async function ShowcaseNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.showcaseNew())));
  const w2 = CM_WORDS2[lang];
  return (
    <SitePage active="showcase">
      <PageHead title={w2.showYourApp} intro={w2.madeWithYallappHint} />
      <PageNote sp={sp} w2={w2} />
      <ApiForm call={{ m: "POST", p: "/showcase", back: cmLinks.showcaseNew(), to: cmLinks.showcaseItem("{id}"), multipart: true }} className="cm-card">
        <label className="cm-field">{w2.appTitle}<input name="title" required maxLength={120} /></label>
        <label className="cm-field">{w2.appType}
          <select name="app_type" defaultValue="store">{TYPES.map((t) => <option key={t} value={t}>{w2[`st_${t}`]}</option>)}</select>
        </label>
        <label className="cm-field">{w2.description}<textarea name="description" maxLength={4000} /></label>
        <label className="cm-field">{w2.pictures}<input type="file" name="pictures" accept="image/png,image/jpeg,image/webp" multiple required /><small>{w2.picturesHint}</small></label>
        <label className="cm-field">{w2.appStore}<input name="app_store_url" type="url" placeholder="https://apps.apple.com/…" /></label>
        <label className="cm-field">{w2.googlePlay}<input name="play_store_url" type="url" placeholder="https://play.google.com/…" /></label>
        <label className="cm-field">{w2.website}<input name="website_url" type="url" placeholder="https://" /></label>
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.post}</button></div>
      </ApiForm>
    </SitePage>
  );
}
