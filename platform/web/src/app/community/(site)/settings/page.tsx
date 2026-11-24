import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/community/site/action-form";
import { LangSelect, ThemeButtons } from "@/components/community/site/client";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { linkedAccount, noticePrefs } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";
import { linkAction, prefsAction, unlinkAction } from "../trust-actions";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

/** 231 Settings: the profile, the linked Yallapp account, emails, language and theme, and logging out. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.settings()));
  const [link, prefs] = await Promise.all([linkedAccount(viewer.id), noticePrefs(viewer.id)]);
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 760 }}>
        <div className="cm-card"><h1>{w.settings}</h1></div>
        <section className="cm-card cm-set">
          <h2>{w.profile}</h2>
          <p className="cm-muted">{w.profileHint}</p>
          <Link href={cmLinks.editProfile()} className="cm-btn g"><span className="ms">edit</span>{w.editProfile}</Link>
        </section>
        <section className="cm-card cm-set">
          <h2>{w.yallappAccount}</h2>
          {link.linked ? (
            <>
              <p className="cm-muted">{fill(w.linkedHint, { n: link.apps })}</p>
              <div className="cm-row">
                <Link href={cmLinks.verify()} className="cm-btn n"><span className="ms">workspace_premium</span>{w.badgeGold}</Link>
                <form action={unlinkAction}><button type="submit" className="cm-btn g"><span className="ms">link_off</span>{w.unlinkAccount}</button></form>
              </div>
            </>
          ) : (
            <>
              <p className="cm-muted">{w.linkHint}</p>
              {sp.link === "unavailable" ? <div className="cm-note err" role="alert"><span className="ms f">error</span>{w.errorNotReady}</div> : null}
              <form action={linkAction}><button type="submit" className="cm-btn n"><span className="ms">link</span>{w.linkAccount}</button></form>
            </>
          )}
        </section>
        <section className="cm-card cm-set">
          <h2>{w.emails}</h2>
          <ActionForm action={prefsAction}>
            <label className="cm-check">
              <input type="checkbox" name="email" value="1" defaultChecked={prefs.email} />
              {w.emailNotices}
            </label>
            <button type="submit" className="cm-btn g" style={{ marginTop: 12 }}>{w.saveChanges}</button>
          </ActionForm>
        </section>
        <section className="cm-card cm-set">
          <h2>{w.language} · {w.theme}</h2>
          <div className="cm-row" style={{ gap: 18 }}>
            <LangSelect lang={lang} label={w.language} />
            <div className="cm-themes"><ThemeButtons light={w.themeLight} dark={w.themeDark} /></div>
          </div>
        </section>
        <section className="cm-card cm-set">
          <form action={cmLinks.signOut()} method="post">
            <button type="submit" className="cm-btn g"><span className="ms">logout</span>{w.logOut}</button>
          </form>
        </section>
      </div>
    </SitePage>
  );
}
