import type { Metadata } from "next";
import { certificate } from "@/components/community/site/next";
import { siteContext } from "@/components/community/site/context";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Certificate" };

/** 233 A certificate's public check: who earned it, for which course and when, and its PDF. */
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code);
  const { lang } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const c = await certificate(code);
  const date = c ? new Date(c.issued_at).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { dateStyle: "long" }) : "";
  return (
    <SitePage active="academy">
      <section className="cm-card cm-cert" data-testid="cm-certificate">
        <span className={`ms f ${c ? "ok" : "bad"}`} aria-hidden="true">{c ? "verified" : "help"}</span>
        <h1>{c ? w2.certificateValid : w2.certificateNotFound}</h1>
        {c ? (
          <>
            <p className="cm-body">{fill(w2.issuedTo, { name: c.member_name, course: c.course_title, date })}</p>
            <p className="cm-muted cm-small">{code}</p>
            <a href={c.pdf_url} className="cm-btn g"><span className="ms" aria-hidden="true">download</span>{w2.downloadPdf}</a>
          </>
        ) : (
          <p className="cm-muted">{code}</p>
        )}
      </section>
    </SitePage>
  );
}
