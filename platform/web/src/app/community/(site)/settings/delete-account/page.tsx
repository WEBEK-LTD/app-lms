import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/community/site/action-form";
import { siteContext } from "@/components/community/site/context";
import { isFreshSignIn } from "@/components/community/site/delete-check";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { CM_DELETE } from "@/components/community/site/privacy-words";
import { deletionInfo } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";
import { deleteAccountAction, signInAgainAction } from "../../delete-actions";

export const metadata: Metadata = { title: "Delete account", robots: { index: false } };

/** 231 Deleting the account on the website: what goes, then the password (or a fresh Apple/Google sign-in) and a typed DELETE. */
export default async function DeleteAccountFormPage() {
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.deleteAccountForm()));
  const d = CM_DELETE[lang];
  const info = await deletionInfo();
  if (!info) redirect(cmLinks.signIn(cmLinks.deleteAccountForm()));
  const provider = info.providers.includes("apple") ? "Apple" : "Google";
  const needsFresh = !info.hasPassword && !isFreshSignIn(info.signedInAt, new Date());
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 760 }}>
        <section className="cm-card cm-set" data-testid="cm-delete-form">
          <h1>{d.formTitle}</h1>
          <p>{d.formIntro}</p>
          <h2>{d.whatGoes}</h2>
          <ul>{d.goes.map((g) => <li key={g}>{g}</li>)}</ul>
          <p className="cm-muted">{d.stays}</p>
          {needsFresh ? (
            <>
              <p>{fill(d.freshSignIn, { provider })}</p>
              <form action={signInAgainAction}>
                <button type="submit" className="cm-btn n"><span className="ms" aria-hidden="true">login</span>{d.signInAgain}</button>
              </form>
            </>
          ) : (
            <ActionForm action={deleteAccountAction}>
              {info.hasPassword ? (
                <label className="cm-field">{d.password}<input name="password" type="password" required autoComplete="current-password" /></label>
              ) : null}
              <label className="cm-field">{d.typeDelete}<input name="confirm" required autoComplete="off" autoCapitalize="characters" spellCheck={false} /><small>{d.typeDeleteHint}</small></label>
              <div className="cm-row" style={{ marginTop: 14 }}>
                <button type="submit" className="cm-btn o"><span className="ms" aria-hidden="true">delete_forever</span>{d.submit}</button>
                <Link href={cmLinks.settings()} className="cm-btn g">{d.cancel}</Link>
              </div>
            </ActionForm>
          )}
        </section>
      </div>
    </SitePage>
  );
}
