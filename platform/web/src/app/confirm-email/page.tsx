import type { Metadata } from "next";
import { confirmEmailAction } from "@/app/actions/email-confirm";
import { AuthShell } from "@/components/auth-shell";
import { btn } from "@/components/ui";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };

const WORDS = {
  en: { title: "Confirm your email", body: "Press Confirm to record that this email is yours.", button: "Confirm", done: "Your email is confirmed. You can close this page.", invalid: "This link isn't valid.", expired: "This link has expired. Ask for a new one.", used: "Your email is already confirmed." },
  ar: { title: "تأكيد بريدك الإلكتروني", body: "اضغط «تأكيد» لتسجيل أن هذا البريد الإلكتروني بريدك.", button: "تأكيد", done: "تم تأكيد بريدك الإلكتروني. يمكنك إغلاق هذه الصفحة.", invalid: "هذا الرابط غير صالح.", expired: "انتهت صلاحية هذا الرابط. اطلب رابطًا جديدًا.", used: "بريدك الإلكتروني مؤكد بالفعل." },
  tr: { title: "E-postanı onayla", body: "Bu e-postanın sana ait olduğunu kaydetmek için Onayla'ya bas.", button: "Onayla", done: "E-postan onaylandı. Bu sayfayı kapatabilirsin.", invalid: "Bu bağlantı geçerli değil.", expired: "Bu bağlantının süresi doldu. Yenisini iste.", used: "E-postan zaten onaylı." },
} as const;

/**
 * 231 yallapp.com.tr/confirm-email?token=…: the link from "Confirm your
 * email" (lib/auth/email-confirm.ts). It confirms only when pressed, so a
 * mail scanner opening the link confirms nothing.
 */
export default async function ConfirmEmailPage({ searchParams }: PageProps<"/confirm-email">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const lang = one("lang") === "ar" || one("lang") === "tr" ? (one("lang") as "ar" | "tr") : "en";
  const w = WORDS[lang];
  const error = one("error");
  const message = one("done") ? w.done : error === "expired" ? w.expired : error === "used" ? w.used : error ? w.invalid : null;
  return (
    <AuthShell footer={false} lang={lang}>
      <main lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
        <section className="flex w-full max-w-[520px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{w.title}</h1>
          {message ? (
            <p className="m-0 text-base leading-relaxed text-ink-4" role={one("done") ? "status" : "alert"}>{message}</p>
          ) : (
            <form action={confirmEmailAction} className="flex flex-col gap-3">
              <p className="m-0 text-base leading-relaxed text-ink-4">{w.body}</p>
              <input type="hidden" name="token" value={one("token")} />
              <button type="submit" className={`${btn.primary} h-[50px] w-full cursor-pointer`}>{w.button}</button>
            </form>
          )}
        </section>
      </main>
    </AuthShell>
  );
}
