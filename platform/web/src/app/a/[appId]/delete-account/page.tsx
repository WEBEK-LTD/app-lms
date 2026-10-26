import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * 88.1 /a/<app_id>/delete-account: how the people who use an app delete
 * their account in it, and how to ask without the app. The address the
 * owner gives Google Play (Data safety) and the App Store; it is in the
 * app's own branding, in English, Arabic or Turkish as the browser asks.
 */
const TEXT = {
  en: {
    title: "Delete your {app} account",
    intro: "Your account in {app} belongs to the business that runs the app. You can delete it at any time.",
    inApp: "In the app",
    steps: ["Open {app} and sign in.", "Go to Account, then Settings.", "Choose Delete account and confirm."],
    without: "Without the app",
    ask: "Write to {email} from the email address or with the phone number you signed in with, and ask for your account to be deleted.",
    askNoEmail: "Contact the business that runs {app} and ask for your account to be deleted, giving the email address or phone number you signed in with.",
    whatTitle: "What is deleted",
    what: "Your account, your profile, your devices and your notifications are deleted, and every device is signed out. The business may keep what the law asks it to keep, like invoices for orders and payments.",
  },
  ar: {
    title: "حذف حسابك في {app}",
    intro: "حسابك في {app} يخص النشاط التجاري الذي يدير التطبيق. يمكنك حذفه في أي وقت.",
    inApp: "من داخل التطبيق",
    steps: ["افتح {app} وسجّل الدخول.", "اذهب إلى الحساب ثم الإعدادات.", "اختر حذف الحساب وأكّد."],
    without: "بدون التطبيق",
    ask: "راسل {email} من البريد الإلكتروني أو برقم الهاتف الذي سجّلت الدخول به، واطلب حذف حسابك.",
    askNoEmail: "تواصل مع النشاط التجاري الذي يدير {app} واطلب حذف حسابك، مع ذكر البريد الإلكتروني أو رقم الهاتف الذي سجّلت الدخول به.",
    whatTitle: "ما الذي يُحذف",
    what: "يُحذف حسابك وملفك الشخصي وأجهزتك وإشعاراتك، ويُسجَّل الخروج من كل الأجهزة. قد يحتفظ النشاط التجاري بما يفرض القانون الاحتفاظ به، مثل فواتير الطلبات والمدفوعات.",
  },
  tr: {
    title: "{app} hesabınızı silin",
    intro: "{app} uygulamasındaki hesabınız, uygulamayı işleten işletmeye aittir. İstediğiniz zaman silebilirsiniz.",
    inApp: "Uygulamada",
    steps: ["{app} uygulamasını açın ve giriş yapın.", "Hesap'a, ardından Ayarlar'a gidin.", "Hesabı sil'i seçin ve onaylayın."],
    without: "Uygulama olmadan",
    ask: "Giriş yaptığınız e-posta adresinden veya telefon numarasıyla {email} adresine yazın ve hesabınızın silinmesini isteyin.",
    askNoEmail: "{app} uygulamasını işleten işletmeyle iletişime geçin ve giriş yaptığınız e-posta adresini veya telefon numarasını belirterek hesabınızın silinmesini isteyin.",
    whatTitle: "Neler silinir",
    what: "Hesabınız, profiliniz, cihazlarınız ve bildirimleriniz silinir; tüm cihazlarda oturum kapatılır. İşletme, yasanın saklamasını istediği kayıtları (siparişlerin ve ödemelerin faturaları gibi) tutabilir.",
  },
} as const;

type Lang = keyof typeof TEXT;

/** The first of English, Arabic and Turkish the browser asks for; English otherwise. */
function pageLanguage(acceptLanguage: string | null): Lang {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code === "en" || code === "ar" || code === "tr") return code;
  }
  return "en";
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);

async function load(appId: string) {
  if (!UUID.test(appId)) return null;
  const app = await (await getStore()).getAppById(appId);
  const name = app?.appName ?? app?.storeTitle;
  return app && name ? { app, name } : null;
}

type Params = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load((await params).appId);
  if (!found) return { title: "Delete account" };
  const lang = pageLanguage((await headers()).get("accept-language"));
  return { title: { absolute: fill(TEXT[lang].title, { app: found.name }) }, robots: { index: false } };
}

export default async function AppDeleteAccountPage({ params }: Params) {
  const found = await load((await params).appId);
  if (!found) notFound();
  const { app, name } = found;
  const lang = pageLanguage((await headers()).get("accept-language"));
  const t = TEXT[lang];
  const values = { app: name };
  const email = app.supportEmail;
  const [before, after] = t.ask.split("{email}");
  return (
    <main
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-4 bg-white px-4 py-6 sm:my-8 sm:min-h-0 sm:rounded-2xl sm:border sm:border-line sm:px-7"
    >
      <header className="flex items-center gap-3">
        {app.iconAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(app.iconAssetId)} alt="" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
        ) : null}
        <span className="text-[18px] font-bold">{name}</span>
      </header>
      <h1 className="m-0 text-[24px] leading-tight font-extrabold">{fill(t.title, values)}</h1>
      <p className="m-0 text-[16px] leading-relaxed text-ink-4">{fill(t.intro, values)}</p>
      <h2 className="m-0 mt-2 text-[18px] font-bold" style={{ color: app.primaryColor }}>
        {t.inApp}
      </h2>
      <ol className="m-0 list-decimal space-y-1.5 ps-5 text-[16px] leading-relaxed" data-delete-steps="">
        {t.steps.map((step) => (
          <li key={step}>{fill(step, values)}</li>
        ))}
      </ol>
      <h2 className="m-0 mt-2 text-[18px] font-bold" style={{ color: app.primaryColor }}>
        {t.without}
      </h2>
      <p className="m-0 text-[16px] leading-relaxed" data-delete-ask="">
        {email ? (
          <>
            {before}
            <a href={`mailto:${email}`} dir="ltr">
              {email}
            </a>
            {after}
          </>
        ) : (
          fill(t.askNoEmail, values)
        )}
      </p>
      <h2 className="m-0 mt-2 text-[18px] font-bold" style={{ color: app.primaryColor }}>
        {t.whatTitle}
      </h2>
      <p className="m-0 text-[16px] leading-relaxed text-ink-4">{t.what}</p>
    </main>
  );
}
