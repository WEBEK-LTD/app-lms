import type { Metadata } from "next";
import Link from "next/link";
import { siteContext, siteLang } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { CM_PRIVACY, CM_PRIVACY_UPDATED } from "@/components/community/site/privacy-words";
import { fill } from "@/components/community/site/words";
import { getContact } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = CM_PRIVACY[await siteLang()];
  return { title: t.title, description: t.description, alternates: { canonical: cmLinks.privacy() } };
}

/** 231 The Community's privacy policy (community.yallapp.com.tr/privacy), from what its code keeps (docs/community/privacy-answers.md). */
export default async function PrivacyPage() {
  const { lang } = await siteContext();
  const t = CM_PRIVACY[lang];
  const { email } = await getContact();
  const text = (s: string) => {
    const parts = fill(s, { email: "\u0000email\u0000", delete: "\u0000delete\u0000" }).split("\u0000");
    return parts.map((p, i) =>
      p === "email" ? <a key={i} href={`mailto:${email}`}>{email}</a>
      : p === "delete" ? <Link key={i} href={cmLinks.deleteAccountForm()}>community.yallapp.com.tr/settings/delete-account</Link>
      : p,
    );
  };
  return (
    <SitePage active="none">
      <article className="cm-card cm-doc" style={{ maxWidth: 760 }} data-testid="cm-privacy">
        <h1>{t.title}</h1>
        <p className="cm-muted">{t.updatedLabel}: <time dateTime={CM_PRIVACY_UPDATED}>{t.updated}</time></p>
        {t.prevails ? (
          <p className="cm-note"><span className="ms" aria-hidden="true">info</span>{t.prevails}</p>
        ) : null}
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((p, i) => <p key={i}>{text(p)}</p>)}
            {s.li ? <ul>{s.li.map((li, i) => <li key={i}>{text(li)}</li>)}</ul> : null}
          </section>
        ))}
      </article>
    </SitePage>
  );
}
