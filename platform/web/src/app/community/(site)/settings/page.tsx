import type { Metadata } from "next";
import Link from "next/link";
import { LinkSuggestion } from "@/components/community/site/link-suggest";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/community/site/action-form";
import { LangSelect, ThemeButtons } from "@/components/community/site/client";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { linkedAccount, noticePrefs } from "@/components/community/site/source";
import { CM_DELETE } from "@/components/community/site/privacy-words";
import { fill, type CmWords } from "@/components/community/site/words";
import { linkAction, prefsAction, unlinkAction } from "../trust-actions";
import { signOutAction } from "../auth-actions";

/** A notification kind's name in the member's language (its code when the site has no word for it yet). */
function kindLabel(w: CmWords, kind: string): string {
  return (w as Record<string, string>)[`kind_${kind}`] ?? kind.replace(/_/g, " ");
}

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

/** 231 Settings: the profile, the linked Yallapp account, emails, language and theme, and logging out. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.settings()));
  const [link, prefs] = await Promise.all([linkedAccount(), noticePrefs()]);
  const kinds = Object.keys(prefs);
  const d = CM_DELETE[lang];
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 760 }}>
        <div className="cm-card"><h1>{w.settings}</h1></div>
        <LinkSuggestion w={w} viewer={viewer} back={cmLinks.settings()} />
        {sp.link === "suggested" ? <div className="cm-note ok" role="status"><span className="ms f" aria-hidden="true">check_circle</span>{w.linkSuggestDone}</div> : null}
        <section className="cm-card cm-set">
          <h2>{w.profile}</h2>
          <p className="cm-muted">{w.profileHint}</p>
          <Link href={cmLinks.editProfile()} className="cm-btn g"><span className="ms" aria-hidden="true">edit</span>{w.editProfile}</Link>
        </section>
        <section className="cm-card cm-set">
          <h2>{w.yallappAccount}</h2>
          {link.linked ? (
            <>
              <p className="cm-muted">{fill(w.linkedHint, { n: link.apps })}</p>
              <div className="cm-row">
                <Link href={cmLinks.verify()} className="cm-btn n"><span className="ms" aria-hidden="true">workspace_premium</span>{w.badgeGold}</Link>
                <form action={unlinkAction}><button type="submit" className="cm-btn g"><span className="ms" aria-hidden="true">link_off</span>{w.unlinkAccount}</button></form>
              </div>
            </>
          ) : (
            <>
              <p className="cm-muted">{w.linkHint}</p>
              {sp.link === "unavailable" ? <div className="cm-note err" role="alert"><span className="ms f" aria-hidden="true">error</span>{w.errorNotReady}</div> : null}
              <form action={linkAction}><button type="submit" className="cm-btn n"><span className="ms" aria-hidden="true">link</span>{w.linkAccount}</button></form>
            </>
          )}
        </section>
        <section className="cm-card cm-set">
          <h2>{w.emails}</h2>
          <p className="cm-muted">{w.emailsHint}</p>
          <ActionForm action={prefsAction}>
            <input type="hidden" name="kinds" value={kinds.join(",")} />
            <div className="cm-grid2">
              {kinds.map((k) => (
                <label key={k} className="cm-check" style={{ marginTop: 8 }}>
                  <input type="checkbox" name={`email_${k}`} value="1" defaultChecked={prefs[k]} />
                  {kindLabel(w, k)}
                </label>
              ))}
            </div>
            <button type="submit" className="cm-btn g" style={{ marginTop: 14 }}>{w.saveChanges}</button>
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
          <h2>{d.formTitle}</h2>
          <p className="cm-muted">{d.formIntro}</p>
          <div className="cm-row">
            <Link href={cmLinks.deleteAccountForm()} className="cm-btn g" data-testid="cm-settings-delete"><span className="ms" aria-hidden="true">delete</span>{d.formTitle}</Link>
            <Link href={cmLinks.privacy()} className="cm-btn g"><span className="ms" aria-hidden="true">shield</span>{d.privacy}</Link>
          </div>
        </section>
        <section className="cm-card cm-set">
          <form action={signOutAction}>
            <button type="submit" className="cm-am-row cm-quiet"><span className="ms" aria-hidden="true">logout</span>{w.logOut}</button>
          </form>
        </section>
      </div>
    </SitePage>
  );
}
