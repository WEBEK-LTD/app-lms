/**
 * 114 The ready-made campaign emails (Admin › Email campaigns › Templates),
 * in English (the owner's choice; the admin writes Arabic and Turkish
 * versions in the builder, right to left for Arabic). Each one is a design
 * in Yallapp's look with its own picture (public/email/templates). No prices
 * are written in them: a placeholder like {{discount}} or {{event_date}}
 * stays until the admin replaces it, and sending refuses while one is left.
 *
 * 124 Black Friday's three (English, Arabic right to left, Turkish) are the
 * exception: the owner fixed the offer (50% with BLACKFRIDAY50, 1 to 30
 * November 2026), so they say it. Their picture is a photograph, credited
 * in `credit` and in public/email/templates/CREDITS.md.
 */

import { BRAND_THEME, blockId, cloneBlock } from "./blocks";
import type { MailBlock, MailContent, MailDoc, MailLang, MailTheme } from "./types";

export interface MailTemplateDef {
  id: string;
  name: string;
  category: "Onboarding" | "Announcements" | "Offers" | "Retention" | "Newsletter" | "Events" | "Feedback";
  description: string;
  subject: string;
  preview: string;
  /** Its picture, under /email/templates/. */
  picture: string;
  theme?: Partial<MailTheme>;
  /** 124 The language it is written in (English when unset), and its direction: right to left for Arabic. */
  lang?: MailLang;
  dir?: "ltr" | "rtl";
  /** 124 The picture's credit, when it is someone's photograph (also in public/email/templates/CREDITS.md). */
  credit?: { creator: string; license: string; licenseUrl: string; source: string };
  blocks: (assets: string) => MailBlock[];
}

const P = (t: number, r: number, b: number, l: number): [number, number, number, number] => [t, r, b, l];
const MIDNIGHT = "#0E0D24";
const IVORY = "#F4EFE6";

const header = (extra: Partial<MailBlock> = {}): MailBlock => ({ id: blockId(), type: "header", logo: "dark", href: "https://yallapp.com.tr", links: [], style: { padding: P(28, 32, 20, 32) }, ...extra });
const darkHeader = (): MailBlock => ({ id: blockId(), type: "header", logo: "light", href: "https://yallapp.com.tr", links: [], style: { padding: P(28, 32, 20, 32), background: MIDNIGHT } });
const hero = (assets: string, file: string, alt: string, href = "{{sign_in_link}}"): MailBlock => ({ id: blockId(), type: "image", src: `${assets}/email/templates/${file}`, alt, href, width: 536, style: { padding: P(0, 32, 8, 32), radius: 18 } });
const kicker = (text: string, color = "#C2410C"): MailBlock => ({ id: blockId(), type: "text", text: `<p><b>${text}</b></p>`, style: { padding: P(22, 32, 0, 32), fontSize: 13, color } });
const h1 = (text: string, extra: Partial<MailBlock["style"]> = {}): MailBlock => ({ id: blockId(), type: "heading", level: 1, text, style: { padding: P(10, 32, 6, 32), ...extra } });
const h2 = (text: string, extra: Partial<MailBlock["style"]> = {}): MailBlock => ({ id: blockId(), type: "heading", level: 2, text, style: { padding: P(18, 32, 4, 32), ...extra } });
const text = (html: string, extra: Partial<MailBlock["style"]> = {}): MailBlock => ({ id: blockId(), type: "text", text: html, style: { padding: P(8, 32, 8, 32), ...extra } });
const button = (label: string, url = "{{sign_in_link}}", extra: Partial<MailBlock["style"]> = {}): MailBlock => ({ id: blockId(), type: "button", button: { label, url }, style: { align: "left", padding: P(16, 32, 24, 32), radius: 12, ...extra } });
const list = (items: string[]): MailBlock => ({ id: blockId(), type: "list", items, style: { padding: P(8, 32, 8, 32) } });
const divider = (): MailBlock => ({ id: blockId(), type: "divider", size: 1, style: { padding: P(18, 32, 18, 32), borderColor: "#ECE6DA" } });
const cards = (items: { kicker?: string; title: string; text: string; link?: string; url?: string }[], extra: Partial<MailBlock["style"]> = {}): MailBlock => ({
  id: blockId(),
  type: "cards",
  cards: items.map((c) => ({ kicker: c.kicker ?? "", title: c.title, text: c.text, button: c.link ? { label: c.link, url: c.url ?? "{{sign_in_link}}" } : null })),
  style: { padding: P(12, 32, 12, 32), ...extra },
});
const footer = (line = "Yallapp turns your website into a real mobile app, and you publish it in your own name."): MailBlock => ({
  id: blockId(),
  type: "footer",
  text: `<p>${line}</p><p>Questions? Just reply to this email.</p>`,
  style: { align: "center", padding: P(22, 32, 8, 32) },
});
const social = (): MailBlock => ({ id: blockId(), type: "social", social: [{ network: "website", url: "https://yallapp.com.tr" }], style: { align: "center", padding: P(4, 32, 4, 32) } });


/** 124 Black Friday's page, on the site (each language's own address). */
const BLACK_FRIDAY_PAGE = { en: "https://yallapp.com.tr/black-friday", ar: "https://yallapp.com.tr/ar/black-friday", tr: "https://yallapp.com.tr/tr/black-friday" } as const;
const BLACK_FRIDAY_CODE = "BLACKFRIDAY50";
const EMBER = "#FF5A1F";
/** The gift box's photograph: Shixart1985 on Wikimedia Commons, CC BY 2.0, cropped and resized. */
const BLACK_FRIDAY_CREDIT = {
  creator: "Shixart1985",
  license: "CC BY 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  source: "https://commons.wikimedia.org/wiki/File:Brown_gift_box_with_red_ribbon_and_bow.jpg",
};
const BLACK_FRIDAY_THEME: Partial<MailTheme> = { background: MIDNIGHT, body: "#17153B", text: IVORY, muted: "#B9B4D3", accent: EMBER };

interface BlackFridayWords {
  alt: string;
  kicker: string;
  title: string;
  text: string;
  codeLabel: string;
  useCode: string;
  list: string[];
  seeOffer: string;
  terms: string;
  credit: string;
  footer: string;
}

/** One language of Black Friday's email: the offer, the code, the page and the terms in one line. */
function blackFridayBlocks(assets: string, lang: "en" | "ar" | "tr", w: BlackFridayWords): MailBlock[] {
  // "left" is where the line starts: the right side in the Arabic (right-to-left) email.
  const align = "left" as const;
  return [
    darkHeader(),
    { ...hero(assets, "black-friday.jpg", w.alt, BLACK_FRIDAY_PAGE[lang]), style: { padding: P(0, 32, 8, 32), radius: 18 } },
    { ...kicker(w.kicker, EMBER), style: { padding: P(22, 32, 0, 32), fontSize: 13, color: EMBER, align } },
    h1(w.title, { color: IVORY, align }),
    text(w.text, { color: "#D9D5EA", align }),
    { id: blockId(), type: "coupon", text: w.codeLabel, code: BLACK_FRIDAY_CODE, button: { label: w.useCode, url: "{{sign_in_link}}" }, style: { padding: P(12, 32, 12, 32) } },
    { ...list(w.list), style: { padding: P(8, 32, 8, 32), color: "#D9D5EA", align } },
    button(w.seeOffer, BLACK_FRIDAY_PAGE[lang], { align, surface: EMBER, color: MIDNIGHT }),
    text(w.terms, { fontSize: 13, color: "#B9B4D3", align }),
    text(w.credit, { fontSize: 11, color: "#8C889A", align }),
    { id: blockId(), type: "footer", text: w.footer, style: { align: "center", padding: P(22, 32, 8, 32), color: "#B9B4D3" } },
  ];
}

/** 124 Black Friday in English, Arabic and Turkish ("Offers"). */
const BLACK_FRIDAY_TEMPLATES: MailTemplateDef[] = [
  {
    id: "black_friday",
    name: "Black Friday",
    category: "Offers",
    description: "Black Friday 2026: 50% off every plan with BLACKFRIDAY50, 1 to 30 November, with a button to the offer's page.",
    subject: "Black Friday: 50% off every Yallapp plan",
    preview: "All of November, with the code BLACKFRIDAY50, monthly or yearly.",
    picture: "black-friday.jpg",
    theme: BLACK_FRIDAY_THEME,
    lang: "en",
    dir: "ltr",
    credit: BLACK_FRIDAY_CREDIT,
    blocks: (a) =>
      blackFridayBlocks(a, "en", {
        alt: "A gift box tied with a red ribbon",
        kicker: "BLACK FRIDAY · 1–30 NOVEMBER",
        title: "50% off every Yallapp plan",
        text: "<p>Hi {{first_name|there}}, all of November every Yallapp plan is half price with a code: Starter, Growth, Pro and Business for regular apps, and every Yallapp Studio plan, monthly or yearly.</p>",
        codeLabel: "Your code",
        useCode: "Use my code",
        list: ["Your own Android and iOS app, in your name on the stores", "From your website, a platform such as Shopify, or no website at all", "Published by you with our guides, or by us on the plans that include it"],
        seeOffer: "See the offer →",
        terms: "<p>From 1 to 30 November 2026, Istanbul time. On the payment you make with the code, once per account; the renewals after it are at the normal price.</p>",
        credit: "<p>Photo: Shixart1985, CC BY 2.0, Wikimedia Commons.</p>",
        footer: "<p>Yallapp turns your business into a real mobile app, and you publish it in your own name.</p><p>Questions? Just reply to this email.</p>",
      }),
  },
  {
    id: "black_friday_ar",
    name: "Black Friday (Arabic)",
    category: "Offers",
    description: "The Black Friday email in Arabic, right to left: 50% off every plan with BLACKFRIDAY50, 1 to 30 November.",
    subject: "الجمعة البيضاء: خصم 50% على كل باقات Yallapp",
    preview: "طوال شهر نوفمبر، بالرمز BLACKFRIDAY50، شهريًا أو سنويًا.",
    picture: "black-friday.jpg",
    theme: BLACK_FRIDAY_THEME,
    lang: "ar",
    dir: "rtl",
    credit: BLACK_FRIDAY_CREDIT,
    blocks: (a) =>
      blackFridayBlocks(a, "ar", {
        alt: "علبة هدية مربوطة بشريط أحمر",
        kicker: "الجمعة البيضاء · 1–30 نوفمبر",
        title: "خصم 50% على كل باقات Yallapp",
        text: "<p>مرحبًا {{first_name|بك}}، طوال شهر نوفمبر تحصل على خصم 50% على كل باقات Yallapp برمز قسيمة: Starter وGrowth وPro وBusiness للتطبيقات العادية، وكل باقات Yallapp Studio، شهريًا أو سنويًا.</p>",
        codeLabel: "رمز القسيمة",
        useCode: "استخدم الرمز",
        list: ["تطبيقك الخاص على Android وiOS، باسمك في المتاجر", "من موقعك الإلكتروني، أو من منصة مثل Shopify، أو من دون موقع إطلاقًا", "تنشره بنفسك بأدلتنا، أو ننشره نيابةً عنك في الباقات التي تتضمن ذلك"],
        seeOffer: "اطّلع على العرض ←",
        terms: "<p>من 1 إلى 30 نوفمبر 2026 بتوقيت إسطنبول. على الدفعة التي تستخدم فيها الرمز، مرة واحدة لكل حساب، والتجديدات التي تليها بالسعر المعتاد.</p>",
        credit: "<p>الصورة: Shixart1985، برخصة CC BY 2.0، من Wikimedia Commons.</p>",
        footer: "<p>يحوّل Yallapp نشاطك التجاري إلى تطبيق حقيقي على الهاتف، وتنشره باسمك.</p><p>لديك سؤال؟ ما عليك إلا الرد على هذه الرسالة.</p>",
      }),
  },
  {
    id: "black_friday_tr",
    name: "Black Friday (Turkish)",
    category: "Offers",
    description: "The Black Friday email in Turkish (Kara Cuma): 50% off every plan with BLACKFRIDAY50, 1 to 30 November.",
    subject: "Kara Cuma: tüm Yallapp paketlerinde %50 indirim",
    preview: "Kasım boyunca, BLACKFRIDAY50 koduyla, aylık ya da yıllık.",
    picture: "black-friday.jpg",
    theme: BLACK_FRIDAY_THEME,
    lang: "tr",
    dir: "ltr",
    credit: BLACK_FRIDAY_CREDIT,
    blocks: (a) =>
      blackFridayBlocks(a, "tr", {
        alt: "Kırmızı kurdeleyle bağlanmış bir hediye kutusu",
        kicker: "KARA CUMA · 1–30 KASIM",
        title: "Tüm Yallapp paketlerinde %50 indirim",
        text: "<p>Kasım ayı boyunca tüm Yallapp paketleri bir kodla %50 indirimli: normal uygulamalar için Starter, Growth, Pro ve Business ile tüm Yallapp Studio paketleri, aylık ya da yıllık.</p>",
        codeLabel: "Kodunuz",
        useCode: "Kodumu kullan",
        list: ["Mağazalarda kendi adınızla Android ve iOS uygulamanız", "Web sitenizden, Shopify gibi bir platformdan ya da hiç web sitesi olmadan", "Rehberlerimizle siz yayımlarsınız ya da bunu içeren paketlerde biz yayımlarız"],
        seeOffer: "Kampanyayı görün →",
        terms: "<p>İstanbul saatiyle 1–30 Kasım 2026. Kodu kullandığınız ödemede, hesap başına bir kez; sonraki yenilemeler normal fiyatla.</p>",
        credit: "<p>Fotoğraf: Shixart1985, CC BY 2.0, Wikimedia Commons.</p>",
        footer: "<p>Yallapp işletmenizi gerçek bir mobil uygulamaya dönüştürür, siz de onu kendi adınızla yayımlarsınız.</p><p>Sorunuz mu var? Bu e-postayı yanıtlamanız yeterli.</p>",
      }),
  },
];

export const MAIL_TEMPLATES: MailTemplateDef[] = [
  {
    id: "welcome",
    name: "Welcome",
    category: "Onboarding",
    description: "A warm hello for new accounts, with the three steps to their first app.",
    subject: "Welcome to Yallapp, {{first_name|there}}",
    preview: "Your website is about to become an app. Here's how to start.",
    picture: "welcome.jpg",
    blocks: (a) => [
      header(),
      hero(a, "welcome.jpg", "A phone showing a new app"),
      kicker("WELCOME TO YALLAPP"),
      h1("Hi {{first_name|there}}, your app starts here"),
      text("<p>Thanks for joining Yallapp. In a few steps, your website becomes a real Android and iPhone app that your customers download, use every day and get your news on.</p>"),
      list(["Connect your website or add your products and services", "Choose your colors, logo and the screens you want", "Build the app and publish it on the stores in your name"]),
      button("Open my dashboard →"),
      divider(),
      cards([
        { kicker: "Guide", title: "Start in 10 minutes", text: "A short walk through the setup, screen by screen.", link: "Read the guide →", url: "https://yallapp.com.tr/docs" },
        { kicker: "Help", title: "We're here", text: "Stuck on a step? Reply to this email and we'll help.", link: "Contact us →", url: "https://yallapp.com.tr/contact" },
      ]),
      footer(),
    ],
  },
  {
    id: "launch",
    name: "New feature",
    category: "Announcements",
    description: "Announce a launch: a bold picture, what's new, and why it matters.",
    subject: "New in Yallapp: {{feature_name}}",
    preview: "Something new just landed in your dashboard.",
    picture: "launch.jpg",
    blocks: (a) => [
      darkHeader(),
      { ...hero(a, "launch.jpg", "A rocket taking off"), width: 600, style: { padding: P(0, 0, 0, 0), fullWidth: true, background: MIDNIGHT, radius: 0 } },
      kicker("JUST LAUNCHED"),
      h1("Meet {{feature_name}}"),
      text("<p>Write one or two lines about what it does and who it's for. Lead with what your customers get, not with how it works.</p>"),
      cards([
        { kicker: "01", title: "Faster", text: "What gets quicker for them." },
        { kicker: "02", title: "Simpler", text: "What they no longer need to do." },
        { kicker: "03", title: "Yours", text: "What they can now make their own." },
      ]),
      button("Try it now →"),
      footer(),
    ],
  },
  {
    id: "offer",
    name: "Offer with a code",
    category: "Offers",
    description: "A time-limited offer with a coupon code. Write the code and the offer yourself.",
    subject: "{{first_name|Hi}}, an offer for your app",
    preview: "A code for your next plan, for a few days only.",
    picture: "offer.jpg",
    blocks: (a) => [
      header(),
      hero(a, "offer.jpg", "A coupon"),
      kicker("A LIMITED OFFER"),
      h1("{{discount}} off your next plan"),
      text("<p>Use the code below when you choose or renew a plan for {{app_name|your app}}. Write here how long it lasts and which plans it's for.</p>"),
      { id: blockId(), type: "coupon", text: "Your code", code: "{{coupon_code}}", button: { label: "Use my code", url: "{{sign_in_link}}" }, style: { padding: P(12, 32, 12, 32) } },
      text("<p>The code works once per account. Write the offer's end date and terms here.</p>", { fontSize: 13, color: "#5B5873" }),
      footer(),
    ],
  },
  ...BLACK_FRIDAY_TEMPLATES,
  {
    id: "renewal",
    name: "Renewal reminder",
    category: "Retention",
    description: "Reminds the account that its plan ends soon, with the date and a renew button.",
    subject: "Your {{plan}} plan ends on {{expiry_date}}",
    preview: "Renew now so your app keeps working without a break.",
    picture: "renewal.jpg",
    blocks: (a) => [
      header(),
      hero(a, "renewal.jpg", "A calendar with the end date marked"),
      kicker("YOUR PLAN"),
      h1("Keep {{app_name|your app}} running"),
      text("<p>Hi {{first_name|there}}, your <b>{{plan}}</b> plan ends on <b>{{expiry_date}}</b>. Renew before then and your app, its notifications and its updates keep working without a break.</p>"),
      list(["Your customers keep using the app", "Your notifications keep reaching them", "Your settings and data stay as they are"]),
      button("Renew my plan →"),
      text("<p>Already renewed? Thank you, you can ignore this email.</p>", { fontSize: 13, color: "#5B5873" }),
      footer(),
    ],
  },
  {
    id: "winback",
    name: "We miss you",
    category: "Retention",
    description: "For accounts that haven't signed in for a while: what's new since, and a way back.",
    subject: "{{first_name|Hi}}, it's been a while",
    preview: "Here's what's new since you last signed in.",
    picture: "winback.jpg",
    blocks: (a) => [
      header(),
      hero(a, "winback.jpg", "A heart"),
      kicker("WE MISS YOU"),
      h1("Your app is waiting for you"),
      text("<p>Hi {{first_name|there}}, you haven't been to your dashboard in a while. A lot has changed since then, and your app is still a few clicks away.</p>"),
      h2("What's new since you left"),
      list(["Write the first thing that's new", "Write the second thing", "Write the third thing"]),
      button("Pick up where I left off →"),
      footer(),
    ],
  },
  {
    id: "newsletter",
    name: "Monthly newsletter",
    category: "Newsletter",
    description: "A month's news: a lead story, three short pieces and a tip.",
    subject: "Yallapp this month: {{headline}}",
    preview: "What's new, a story from a customer and one tip for your app.",
    picture: "newsletter.jpg",
    blocks: (a) => [
      header({ links: [{ label: "Dashboard", url: "{{sign_in_link}}" }, { label: "Docs", url: "https://yallapp.com.tr/docs" }] }),
      hero(a, "newsletter.jpg", "This month's news"),
      kicker("THIS MONTH AT YALLAPP"),
      h1("The lead story's headline"),
      text("<p>Two or three lines that make them want to read on. Keep the newsletter short: one lead story, a few small ones, one tip.</p>"),
      button("Read the story →", "https://yallapp.com.tr"),
      divider(),
      h2("In short"),
      cards([
        { kicker: "Product", title: "A small update", text: "One line about it.", link: "More →", url: "https://yallapp.com.tr" },
        { kicker: "Customers", title: "A customer's win", text: "One line about it.", link: "More →", url: "https://yallapp.com.tr" },
        { kicker: "Guide", title: "A how-to", text: "One line about it.", link: "More →", url: "https://yallapp.com.tr/docs" },
      ]),
      { id: blockId(), type: "quote", text: "This month's tip: send a notification when you add something new. People open apps when they're told there's something worth seeing.", title: "The Yallapp team", caption: "Tip of the month", style: { padding: P(16, 32, 8, 32) } },
      social(),
      footer(),
    ],
  },
  {
    id: "studio",
    name: "Yallapp Studio",
    category: "Announcements",
    description: "Introduces Yallapp Studio: design an app screen by screen, without a website.",
    subject: "Design your own app with Yallapp Studio",
    preview: "Screen by screen, your colors, your layout, no website needed.",
    picture: "studio.jpg",
    theme: { background: "#ECE7F9" },
    blocks: (a) => [
      header(),
      hero(a, "studio.jpg", "Yallapp Studio's editor"),
      kicker("YALLAPP STUDIO", "#4C3FD1"),
      h1("Build the app you have in mind"),
      text("<p>Yallapp Studio is for apps that don't start from a website: delivery, rides, schools, academies and more. You design each screen, choose what it shows, and Yallapp builds it.</p>"),
      { id: blockId(), type: "imageText", src: `${a}/email/templates/first-app.jpg`, alt: "A finished app", imageSide: "left", title: "Ready-made projects", text: "<p>Start from a project made for your kind of business, then change anything.</p>", button: null, style: { padding: P(12, 32, 12, 32) } },
      list(["Your own screens, colors and menus", "Ready-made projects for your kind of business", "Published in your name on Google Play and the App Store"]),
      button("Open Yallapp Studio →", "{{sign_in_link}}", { surface: "#4C3FD1" }),
      footer(),
    ],
  },
  {
    id: "case_study",
    name: "Customer story",
    category: "Newsletter",
    description: "One customer's story with their words, their numbers and what they did.",
    subject: "How {{customer_name}} grew with their app",
    preview: "A real story, in their own words.",
    picture: "case-study.jpg",
    blocks: (a) => [
      header(),
      hero(a, "case-study.jpg", "A chart going up"),
      kicker("CUSTOMER STORY"),
      h1("How {{customer_name}} grew with their app"),
      text("<p>Two lines about the business: what they sell, where, and what they wanted the app for.</p>"),
      { id: blockId(), type: "quote", text: "Write the customer's own words here, with their permission.", title: "{{customer_name}}", caption: "Their role, their business", style: { padding: P(12, 32, 12, 32) } },
      cards([
        { kicker: "Result", title: "{{result_one}}", text: "What the number means." },
        { kicker: "Result", title: "{{result_two}}", text: "What the number means." },
      ]),
      h2("What they did"),
      list(["The first thing they set up", "How they told their customers", "What they send notifications about"]),
      button("Do the same for my app →"),
      footer(),
    ],
  },
  {
    id: "webinar",
    name: "Webinar invite",
    category: "Events",
    description: "Invites to a live session: the topic, the date, what they'll learn and a sign-up button.",
    subject: "Live: {{event_title}}, {{event_date}}",
    preview: "Join us live and bring your questions.",
    picture: "webinar.jpg",
    blocks: (a) => [
      darkHeader(),
      { ...hero(a, "webinar.jpg", "A live video session", "{{event_link}}"), width: 600, style: { padding: P(0, 0, 0, 0), fullWidth: true, background: MIDNIGHT, radius: 0 } },
      kicker("LIVE SESSION"),
      h1("{{event_title}}"),
      cards([
        { kicker: "When", title: "{{event_date}}", text: "Write the time and the time zone." },
        { kicker: "Where", title: "Online", text: "The link comes when you sign up." },
      ]),
      h2("What you'll learn"),
      list(["The first thing they'll learn", "The second thing", "Live questions and answers"]),
      button("Save my seat →", "{{event_link}}"),
      footer(),
    ],
  },
  {
    id: "first_app",
    name: "Publish your first app",
    category: "Onboarding",
    description: "Nudges accounts that haven't built an app yet, with the steps that are left.",
    subject: "{{first_name|Hi}}, your app is one build away",
    preview: "You're almost there. Here's what's left.",
    picture: "first-app.jpg",
    blocks: (a) => [
      header(),
      hero(a, "first-app.jpg", "A finished app ready for the stores"),
      kicker("ALMOST THERE"),
      h1("Your app is one build away"),
      text("<p>Hi {{first_name|there}}, you've started setting up {{app_name|your app}}. Here's what's left before your customers can download it:</p>"),
      cards([
        { kicker: "Step 1", title: "Check the look", text: "Colors, logo and the home screen." },
        { kicker: "Step 2", title: "Build", text: "One click; it takes a few minutes." },
        { kicker: "Step 3", title: "Publish", text: "We can publish it for you." },
      ]),
      button("Finish my app →"),
      text("<p>Want us to do it with you? Reply and we'll set up a call.</p>", { fontSize: 14, color: "#5B5873" }),
      footer(),
    ],
  },
  {
    id: "seasonal",
    name: "Season's greetings",
    category: "Announcements",
    description: "A short greeting for a holiday or season, with an optional gift.",
    subject: "Warm wishes from Yallapp",
    preview: "A short note from all of us.",
    picture: "seasonal.jpg",
    theme: { background: MIDNIGHT, body: "#17153B", text: IVORY, muted: "#B9B4D3", accent: "#FFB26B" },
    blocks: (a) => [
      { ...darkHeader(), style: { padding: P(28, 32, 20, 32) } },
      { ...hero(a, "seasonal.jpg", "A crescent moon and stars"), style: { padding: P(0, 32, 8, 32), radius: 18 } },
      { ...kicker("SEASON'S GREETINGS", "#FFB26B"), style: { padding: P(24, 32, 0, 32), fontSize: 13, color: "#FFB26B", align: "center" } },
      h1("Warm wishes to you and your customers", { align: "center", color: IVORY }),
      text("<p>Write a short greeting for the season. Thank them for being with Yallapp, and wish their business a good season.</p>", { align: "center", color: "#D9D5EA" }),
      button("Send my customers a greeting →", "{{sign_in_link}}", { align: "center", surface: IVORY, color: MIDNIGHT }),
      { ...footer("With thanks, the Yallapp team."), style: { align: "center", padding: P(22, 32, 8, 32), color: "#B9B4D3" } },
    ],
  },
  {
    id: "survey",
    name: "Quick survey",
    category: "Feedback",
    description: "Asks for feedback in one click: a rating row and a link to a short survey.",
    subject: "{{first_name|Hi}}, how are we doing?",
    preview: "One click, one minute. It helps us make Yallapp better.",
    picture: "survey.jpg",
    blocks: (a) => [
      header(),
      hero(a, "survey.jpg", "Five stars", "{{survey_link}}"),
      kicker("ONE MINUTE"),
      h1("How likely are you to recommend Yallapp?"),
      text("<p>Your answer goes straight to the team, and we read every one.</p>"),
      {
        id: blockId(),
        type: "columns",
        columns: [1, 2, 3].map((n) => [{ id: blockId(), type: "button", button: { label: ["Not likely", "Maybe", "Very likely"][n - 1]!, url: "{{survey_link}}" }, style: { align: "center", padding: P(0, 0, 0, 0), radius: 12, surface: ["#5B5873", "#C2410C", MIDNIGHT][n - 1]! } } as MailBlock]),
        style: { padding: P(12, 32, 12, 32) },
      },
      text("<p>Have more to say? <a href=\"{{survey_link}}\">Take the 1-minute survey</a> or just reply to this email.</p>", { align: "center", fontSize: 14 }),
      footer(),
    ],
  },
  {
    id: "courier",
    name: "Yallapp Courier, coming soon",
    category: "Announcements",
    description: "Teases Yallapp Courier, the app for delivery companies' couriers, before launch.",
    subject: "Coming soon: Yallapp Courier",
    preview: "One app for your couriers: jobs, routes and proof of delivery.",
    picture: "courier.jpg",
    blocks: (a) => [
      darkHeader(),
      { ...hero(a, "courier.jpg", "A delivery route on a map"), width: 600, style: { padding: P(0, 0, 0, 0), fullWidth: true, background: MIDNIGHT, radius: 0 } },
      kicker("COMING SOON"),
      h1("Yallapp Courier"),
      text("<p>One app for your couriers and drivers: they see their jobs, follow the route and confirm each delivery, while you watch it all from your dashboard.</p>"),
      cards([
        { kicker: "Jobs", title: "Every job in one list", text: "Pick-ups and drops, in order." },
        { kicker: "Routes", title: "The way there", text: "Open the map in one tap." },
        { kicker: "Proof", title: "Delivered", text: "A photo or a code at the door." },
      ]),
      button("Tell me when it's ready →", "{{sign_in_link}}"),
      footer(),
    ],
  },
];

export function mailTemplate(id: string): MailTemplateDef | null {
  return MAIL_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** A template as an email to edit: new block ids each time. */
export function templateContent(def: MailTemplateDef, assets: string): MailContent {
  const theme = { ...BRAND_THEME, ...def.theme };
  const doc: MailDoc = { version: 1, theme, blocks: def.blocks(assets.replace(/\/+$/, "")).map(cloneBlock) };
  return { subject: def.subject, preview: def.preview, mode: "blocks", dir: def.dir ?? "ltr", doc, html: null };
}
