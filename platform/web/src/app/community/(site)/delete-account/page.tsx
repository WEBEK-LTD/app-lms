import type { Metadata } from "next";
import Link from "next/link";
import { siteContext, siteLang } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { CM_DELETE } from "@/components/community/site/privacy-words";
import { fill } from "@/components/community/site/words";
import { getContact } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  const d = CM_DELETE[await siteLang()];
  return { title: d.publicTitle, description: d.publicDescription, alternates: { canonical: cmLinks.deleteAccount() } };
}

/**
 * 231 How to delete a Yallapp Community account, with or without the app
 * (the address Google Play asks for), and, after the website's deletion,
 * the done page (?done=1).
 */
export default async function DeleteAccountInfoPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { lang } = await siteContext();
  const d = CM_DELETE[lang];
  if ((await searchParams).done === "1") {
    return (
      <SitePage active="none">
        <div className="cm-card cm-set" style={{ maxWidth: 760 }} data-testid="cm-deleted">
          <span className="ms f" aria-hidden="true" style={{ fontSize: 40, color: "var(--cm-green, #1a7f37)" }}>check_circle</span>
          <h1>{d.doneTitle}</h1>
          <p>{d.doneText}</p>
          <Link href={cmLinks.home()} className="cm-btn n">{d.home}</Link>
        </div>
      </SitePage>
    );
  }
  const { email } = await getContact();
  const [before, after] = fill(d.noAccess, { email: "\u0000" }).split("\u0000");
  return (
    <SitePage active="none">
      <article className="cm-card cm-doc" style={{ maxWidth: 760 }} data-testid="cm-delete-info">
        <h1>{d.publicTitle}</h1>
        <p>{d.publicIntro}</p>
        <h2>{d.withApp}</h2>
        <p>{d.withAppSteps}</p>
        <h2>{d.withoutApp}</h2>
        <p>{d.withoutAppSteps}</p>
        <p><Link href={cmLinks.deleteAccountForm()} className="cm-btn g"><span className="ms" aria-hidden="true">delete</span>{d.start}</Link></p>
        <p className="cm-muted">{before}<a href={`mailto:${email}`}>{email}</a>{after}</p>
        <h2>{d.whatGoes}</h2>
        <ul>{d.goes.map((g) => <li key={g}>{g}</li>)}</ul>
        <p>{d.stays}</p>
        <p><Link href={cmLinks.privacy()}>{d.privacy}</Link></p>
      </article>
    </SitePage>
  );
}
