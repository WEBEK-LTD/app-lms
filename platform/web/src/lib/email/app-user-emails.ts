import type { Lang } from "@/i18n/config";
import { appEmailHtml, cardRow, escapeHtml, heading, hexColour, paragraph, pill, tintColour } from "./app-email-shell";

/**
 * 199 The emails a client's app sends the people who use it, in the app's
 * look (app-email-shell.ts: its logo and name, never Yallapp's, its colour,
 * light and dark), in their language: the welcome after signing up, and the
 * code that signs them in or lets them set a new password. Each has its
 * plain-text part with the same words.
 */

export interface AppBrand {
  lang: Lang;
  appName: string;
  logoUrl: string | null;
  brand: string;
}

export interface RenderedAppEmail {
  subject: string;
  text: string;
  html: string;
}

/** What the code is for: signing in (or verifying an address), or setting a forgotten password again. */
export type CodePurpose = "sign_in" | "reset";

interface CodeWords {
  subject: (code: string, app: string) => string;
  pill: string;
  title: Record<CodePurpose, string>;
  intro: Record<CodePurpose, (app: string) => string>;
  expires: (minutes: string) => string;
  ignore: (app: string) => string;
  footer: (app: string) => string;
}

const CODE: Record<Lang, CodeWords> = {
  en: {
    subject: (code, app) => `${code} is your ${app} code`,
    pill: "Verification code",
    title: { sign_in: "Your code", reset: "Reset your password" },
    intro: { sign_in: (app) => `Use this code to sign in to ${app}.`, reset: (app) => `Use this code in ${app} to choose a new password.` },
    expires: (m) => `It expires in ${m} minutes. Don't share it with anyone.`,
    ignore: (app) => `If you didn't ask for it in ${app}, you can ignore this email.`,
    footer: (app) => `Sent by ${app}`,
  },
  ar: {
    subject: (code, app) => `${code} هو رمزك في ${app}`,
    pill: "رمز التحقق",
    title: { sign_in: "رمزك", reset: "إعادة تعيين كلمة المرور" },
    intro: { sign_in: (app) => `استخدم هذا الرمز لتسجيل الدخول إلى ${app}.`, reset: (app) => `استخدم هذا الرمز في ${app} لاختيار كلمة مرور جديدة.` },
    expires: (m) => `تنتهي صلاحيته خلال ${m} دقائق. لا تشاركه مع أي أحد.`,
    ignore: (app) => `إن لم تطلبه في ${app}، فيمكنك تجاهل هذا البريد.`,
    footer: (app) => `أُرسل من ${app}`,
  },
  tr: {
    subject: (code, app) => `${app} kodunuz: ${code}`,
    pill: "Doğrulama kodu",
    title: { sign_in: "Kodunuz", reset: "Şifrenizi sıfırlayın" },
    intro: { sign_in: (app) => `${app} uygulamasına giriş yapmak için bu kodu kullanın.`, reset: (app) => `Yeni bir şifre seçmek için bu kodu ${app} uygulamasında kullanın.` },
    expires: (m) => `${m} dakika içinde geçerliliğini yitirir. Kimseyle paylaşmayın.`,
    ignore: (app) => `Bunu ${app} uygulamasında siz istemediyseniz bu e-postayı yok sayabilirsiniz.`,
    footer: (app) => `${app} tarafından gönderildi`,
  },
};

interface WelcomeWords {
  subject: (app: string) => string;
  preheader: (app: string) => string;
  pill: string;
  title: (app: string) => string;
  hello: (name: string) => string;
  ready: (app: string) => string;
  open: string;
  footer: (app: string) => string;
}

const WELCOME: Record<Lang, WelcomeWords> = {
  en: {
    subject: (app) => `Welcome to ${app}`,
    preheader: (app) => `Your ${app} account is ready.`,
    pill: "Account created",
    title: (app) => `Welcome to ${app}`,
    hello: (name) => (name ? `Hi ${name},` : "Hi,"),
    ready: (app) => `Thank you for joining ${app}. Your account is ready, and you're signed in on the app.`,
    open: "Open the app any time to pick up where you left off. If you have a question, reply to this email.",
    footer: (app) => `Sent by ${app}`,
  },
  ar: {
    subject: (app) => `مرحبًا بك في ${app}`,
    preheader: (app) => `حسابك في ${app} جاهز.`,
    pill: "تم إنشاء الحساب",
    title: (app) => `مرحبًا بك في ${app}`,
    hello: (name) => (name ? `أهلًا ${name}،` : "أهلًا،"),
    ready: (app) => `شكرًا لانضمامك إلى ${app}. حسابك جاهز، وأنت مسجّل الدخول في التطبيق.`,
    open: "افتح التطبيق في أي وقت لتكمل من حيث توقفت. إن كان لديك سؤال، فردّ على هذا البريد.",
    footer: (app) => `أُرسل من ${app}`,
  },
  tr: {
    subject: (app) => `${app} uygulamasına hoş geldiniz`,
    preheader: (app) => `${app} hesabınız hazır.`,
    pill: "Hesap oluşturuldu",
    title: (app) => `${app} uygulamasına hoş geldiniz`,
    hello: (name) => (name ? `Merhaba ${name},` : "Merhaba,"),
    ready: (app) => `${app} ailesine katıldığınız için teşekkür ederiz. Hesabınız hazır ve uygulamada oturumunuz açık.`,
    open: "Kaldığınız yerden devam etmek için uygulamayı istediğiniz zaman açın. Bir sorunuz olursa bu e-postayı yanıtlayın.",
    footer: (app) => `${app} tarafından gönderildi`,
  },
};

/** The sign-in or reset code email. */
export function appCodeEmail(brand: AppBrand, input: { code: string; minutes: number; purpose?: CodePurpose }): RenderedAppEmail {
  const w = CODE[brand.lang];
  const purpose = input.purpose ?? "sign_in";
  const minutes = String(input.minutes);
  const colour = hexColour(brand.brand);
  // The code large, its digits apart, left to right in every language, chosen whole with one tap.
  const box =
    `<div class="ylp-code" dir="ltr" style="margin:20px 0 18px 0;padding:18px 12px;border-radius:14px;background:${tintColour(colour, 0.9)};color:#24223A;text-align:center;` +
    `font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;line-height:1.2;font-weight:800;letter-spacing:8px;-webkit-user-select:all;user-select:all">${escapeHtml(input.code)}</div>`;
  const rows = cardRow(
    brand.lang,
    pill(colour, w.pill) +
      heading(w.title[purpose]) +
      paragraph(w.intro[purpose](brand.appName), { muted: true, margin: "0" }) +
      box +
      paragraph(w.expires(minutes), { strong: true, size: 14 }) +
      paragraph(w.ignore(brand.appName), { muted: true, size: 13, margin: "0" }),
    "30px 32px 30px 32px",
  );
  return {
    subject: w.subject(input.code, brand.appName),
    text: [w.title[purpose], "", w.intro[purpose](brand.appName), "", input.code, "", w.expires(minutes), "", w.ignore(brand.appName)].join("\n"),
    html: appEmailHtml({ ...brand, title: w.subject(input.code, brand.appName), preheader: `${w.intro[purpose](brand.appName)} ${w.expires(minutes)}`, rows, footer: w.footer(brand.appName) }),
  };
}

/** The welcome after signing up in the app. */
export function appWelcomeEmail(brand: AppBrand, input: { name: string }): RenderedAppEmail {
  const w = WELCOME[brand.lang];
  const colour = hexColour(brand.brand);
  const rows = cardRow(
    brand.lang,
    pill(colour, `✓ ${w.pill}`) +
      heading(w.title(brand.appName)) +
      paragraph(w.hello(input.name.trim()), { margin: "0 0 6px 0" }) +
      paragraph(w.ready(brand.appName)) +
      paragraph(w.open, { muted: true, size: 14, margin: "0" }),
    "30px 32px 30px 32px",
  );
  return {
    subject: w.subject(brand.appName),
    text: [w.hello(input.name.trim()), "", w.ready(brand.appName), "", w.open].join("\n"),
    html: appEmailHtml({ ...brand, title: w.subject(brand.appName), preheader: w.preheader(brand.appName), rows, footer: w.footer(brand.appName) }),
  };
}
