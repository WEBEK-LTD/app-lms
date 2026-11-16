import { setMarketingEmailsAction } from "@/app/actions/account";
import type { MailLang } from "@/lib/mailing/types";
import { btn } from "./ui";
import { KitSettingRow, KitStatus } from "./studio-page";

const TEXT: Record<MailLang, { title: string; text: string; on: string; off: string; turnOn: string; turnOff: string; staff: string; pillOn: string; pillOff: string; more: string }> = {
  en: {
    title: "Emails from Yallapp",
    text: "News, tips and offers from Yallapp. Emails about your account, like sign-in codes, receipts and plan reminders, always come.",
    on: "You get Yallapp's news and offers.",
    off: "You don't get Yallapp's news and offers.",
    turnOn: "Get news and offers",
    turnOff: "Stop news and offers",
    staff: "Only the person themselves can change this.",
    // 132.133 The state as a pill, and the "?" that opens the text.
    pillOn: "On",
    pillOff: "Off",
    more: "More about this",
  },
  ar: {
    title: "رسائل Yallapp",
    text: "أخبار ونصائح وعروض من Yallapp. أما رسائل حسابك، مثل رموز الدخول والإيصالات وتذكيرات الباقة، فتصلك دائمًا.",
    on: "تصلك أخبار Yallapp وعروضها.",
    off: "لا تصلك أخبار Yallapp وعروضها.",
    turnOn: "استلام الأخبار والعروض",
    turnOff: "إيقاف الأخبار والعروض",
    staff: "لا يغيّر هذا إلا صاحب الحساب نفسه.",
    pillOn: "مفعّلة",
    pillOff: "مش مفعّلة",
    more: "اعرف أكتر",
  },
  tr: {
    title: "Yallapp'ten e-postalar",
    text: "Yallapp'ten haberler, ipuçları ve teklifler. Giriş kodları, makbuzlar ve paket hatırlatmaları gibi hesabınızla ilgili e-postalar her zaman gelir.",
    on: "Yallapp'in haberlerini ve tekliflerini alıyorsunuz.",
    off: "Yallapp'in haberlerini ve tekliflerini almıyorsunuz.",
    turnOn: "Haberleri ve teklifleri al",
    turnOff: "Haberleri ve teklifleri durdur",
    staff: "Bunu yalnızca kişinin kendisi değiştirebilir.",
    pillOn: "Açık",
    pillOff: "Kapalı",
    more: "Daha fazlası",
  },
};

/** 114 Your account › Emails from Yallapp: marketing emails on or off for the signed-in person's address. */
export function MarketingEmails({ allowed, lang, readOnly, look = "card" }: { allowed: boolean; lang: string; readOnly: boolean; look?: "card" | "row" }) {
  const t = TEXT[lang === "ar" || lang === "tr" ? lang : "en"];
  const toggle = readOnly ? (
    <p className="m-0 text-sm text-muted">{t.staff}</p>
  ) : (
    <form action={setMarketingEmailsAction}>
      {allowed ? null : <input type="hidden" name="allowed" value="on" />}
      <button type="submit" className={`${btn.secondary} ${look === "row" ? "h-10 px-4 text-sm" : "h-11 px-4"} cursor-pointer`} data-testid="marketing-toggle">
        {allowed ? t.turnOff : t.turnOn}
      </button>
    </form>
  );
  // 132.133 As a settings row: on or off as a pill, the toggle as its one action, the text behind "?".
  if (look === "row") {
    return (
      <KitSettingRow
        titleId="h-marketing"
        icon="mail"
        title={t.title}
        status={<KitStatus tone={allowed ? "success" : "neutral"}>{allowed ? t.pillOn : t.pillOff}</KitStatus>}
        help={
          <>
            <span className="mb-1 block font-semibold" data-testid="marketing-state">
              {allowed ? t.on : t.off}
            </span>
            {t.text}
          </>
        }
        helpLabel={t.more}
        action={toggle}
      />
    );
  }
  return (
    <section aria-labelledby="h-marketing" className="flex max-w-[720px] flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-marketing" className="m-0 text-lg font-bold">
        {t.title}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">{t.text}</p>
      <p className="m-0 text-sm font-semibold text-midnight" data-testid="marketing-state">
        {allowed ? t.on : t.off}
      </p>
      {toggle}
    </section>
  );
}
