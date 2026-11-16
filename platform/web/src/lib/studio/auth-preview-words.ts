/**
 * 132.9 The app's own words on sign-in, the code screen and a new account,
 * as the app says them (mobile/lib/l10n/app_*.arb: Arabic in Modern
 * Standard Arabic), for Studio › Screens' pictures of them: each picture
 * reads in the app's language, as the app does.
 */
export interface AuthWords {
  welcome: string;
  intro: string;
  mobileNumber: string;
  sendCode: string;
  /** The premium look's button. */
  continueAction: string;
  notNow: string;
  enterCode: string;
  codeSent: string;
  verify: string;
  createYourAccount: string;
  fullName: string;
  createAccount: string;
}

const EN: AuthWords = {
  welcome: "Welcome",
  intro: "Sign in with your mobile number and we'll send you a verification code.",
  mobileNumber: "Mobile number",
  sendCode: "Send code",
  continueAction: "Continue",
  notNow: "Not now",
  enterCode: "Enter verification code",
  codeSent: "We sent a code to +90 532 123 45 67",
  verify: "Verify & sign in",
  createYourAccount: "Create your account",
  fullName: "Full name",
  createAccount: "Create account",
};

const AR: AuthWords = {
  welcome: "مرحبًا",
  intro: "سجّل الدخول برقم جوالك وسنرسل إليك رمز تحقق.",
  mobileNumber: "رقم الجوال",
  sendCode: "إرسال الرمز",
  continueAction: "متابعة",
  notNow: "ليس الآن",
  enterCode: "أدخل رمز التحقق",
  codeSent: "أرسلنا رمزًا إلى ‎+90 532 123 45 67",
  verify: "تحقّق وسجّل الدخول",
  createYourAccount: "أنشئ حسابك",
  fullName: "الاسم الكامل",
  createAccount: "إنشاء الحساب",
};

const TR: AuthWords = {
  welcome: "Hoş geldiniz",
  intro: "Cep telefonu numaranızla giriş yapın, size bir doğrulama kodu gönderelim.",
  mobileNumber: "Cep telefonu numarası",
  sendCode: "Kodu gönder",
  continueAction: "Devam et",
  notNow: "Şimdi değil",
  enterCode: "Doğrulama kodunu girin",
  codeSent: "+90 532 123 45 67 numarasına bir kod gönderdik",
  verify: "Doğrula ve giriş yap",
  createYourAccount: "Hesabınızı oluşturun",
  fullName: "Ad soyad",
  createAccount: "Hesap oluştur",
};

/** The words in an app language (its base language), English for the others. */
export function authWords(lang: string | null | undefined): AuthWords {
  const base = (lang ?? "en").split(/[-_]/)[0];
  return base === "ar" ? AR : base === "tr" ? TR : EN;
}

/** Whether the app's language reads right to left. */
export function rtlLanguage(lang: string | null | undefined): boolean {
  return ["ar", "fa", "he", "ur", "ku", "ps"].includes((lang ?? "").split(/[-_]/)[0] ?? "");
}
