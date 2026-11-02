import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { CERTIFICATE_TEXT, certificateDate, certificateLanguage, loadCertificate } from "@/lib/courses/certificates";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 90.1 /a/<app_id>/certificate/<code>: the certificate of a student who
 * finished a course managed in Yallapp (every lesson completed, every quiz
 * passed, 112.5 every assignment graded), in the app's branding, with 112.5
 * the course's signature line and its PDF file, ready to print. The code is
 * signed, so the page also proves the certificate is real.
 */

type Params = { params: Promise<{ appId: string; code: string }> };

async function load(appId: string, code: string) {
  return loadCertificate(await getStore(), signingSecret(), appId, code);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { appId, code } = await params;
  const found = await load(appId, code);
  return { title: { absolute: found ? `${found.course.title} · ${found.name}` : "Certificate" }, robots: { index: false } };
}

export default async function CertificatePage({ params }: Params) {
  const { appId, code } = await params;
  const found = await load(appId, code);
  if (!found) notFound();
  const { app, course, name, completedAt } = found;
  const lang = certificateLanguage(null, (await headers()).get("accept-language"));
  const t = CERTIFICATE_TEXT[lang];
  const date = certificateDate(lang, completedAt);
  const logo = app.logoAssetId ?? app.iconAssetId;
  return (
    <main lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto flex min-h-screen w-full max-w-[860px] items-center bg-white px-4 py-8 print:p-0">
      <section
        className="flex w-full flex-col items-center gap-5 rounded-3xl border-[6px] bg-white px-6 py-12 text-center sm:px-14"
        style={{ borderColor: app.primaryColor }}
        data-certificate=""
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(logo)} alt="" className="h-16 w-auto max-w-[220px] object-contain" />
        ) : null}
        <p className="m-0 text-sm font-semibold tracking-wide text-ink-4 uppercase">{app.appName ?? app.storeTitle}</p>
        <h1 className="m-0 text-[30px] leading-tight font-extrabold sm:text-[38px]" style={{ color: app.primaryColor }}>
          {t.heading}
        </h1>
        <p className="m-0 text-[16px] text-ink-4">{t.given}</p>
        <p className="m-0 border-b-2 border-line px-6 pb-2 text-[28px] font-bold sm:text-[34px]" data-certificate-name="">
          {name}
        </p>
        <p className="m-0 text-[16px] text-ink-4">{t.finished}</p>
        <p className="m-0 text-[22px] font-bold sm:text-[26px]" data-certificate-course="">
          {course.title}
        </p>
        <p className="m-0 text-[15px] text-ink-4">{t.on.replace("{date}", date)}</p>
        {/* 112.5 Who signs it. */}
        {course.certificateSigner ? (
          <div className="mt-4 flex flex-col items-center gap-1" data-certificate-signer="">
            <span className="min-w-[220px] border-b border-ink-4 pb-1 text-[18px] italic">{course.certificateSigner}</span>
            <span className="text-xs text-muted">{t.signed}</span>
          </div>
        ) : null}
        <p className="m-0 text-xs text-muted" dir="ltr">
          {t.code.replace("{code}", code)}
        </p>
        <p className="m-0 text-xs text-muted">{t.verified.replace("{app}", app.appName ?? app.storeTitle ?? "")}</p>
        {/* 112.5 The certificate as a PDF file. */}
        <a href={`/a/${app.id}/certificate/${code}/pdf?lang=${lang}`} className="text-sm font-semibold print:hidden" data-certificate-pdf="">
          {t.download}
        </a>
      </section>
    </main>
  );
}
