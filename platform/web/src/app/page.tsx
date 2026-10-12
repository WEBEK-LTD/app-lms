import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { WHATSAPP_URL } from "@/components/brand";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PLAN_INFO } from "@/lib/plans";

const WORKS_WITH = [
  "WordPress",
  "Tutor LMS",
  "LearnDash",
  "LearnPress",
  "LifterLMS",
  "MasterStudy",
  "Sensei",
  "Masteriyo",
  "Digits",
  "WooCommerce",
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "smartphone", title: "Your brand, your stores", text: "Your name, logo and colors, published under your own Google Play and App Store accounts." },
  { icon: "lock", title: "OTP sign-in with Digits", text: "Students use the same account as your website. Codes go through the SMS or WhatsApp gateway you already use." },
  { icon: "shield", title: "Protected video", text: "Temporary video links, a watermark with the student's number, and screen recording blocked." },
  { icon: "code", title: "HTML & code lessons", text: "Rich lesson content, shortcodes and code blocks with syntax highlighting look right on mobile." },
  { icon: "workspace_premium", title: "Quizzes, progress & certificates", text: "Progress syncs with the website, and premium LMS features appear automatically when active." },
  { icon: "notifications", title: "Push notifications", text: "New lessons, announcements and enrollment confirmations reach students instantly." },
];

const STEPS = [
  { title: "Talk to us & pick a plan", text: "Message us on WhatsApp. We activate your account once your plan is confirmed." },
  { title: "Install the plugin", text: "Upload our plugin to your WordPress site and paste your license key." },
  { title: "Enter your app details", text: "Name, logo, colors and store details. Your apps start building right away." },
  { title: "Download or auto-publish", text: "Get your APK, AAB and iOS build with step-by-step guides, or let us publish them for you." },
];

const FAQ = [
  {
    q: "Do I need my own Apple and Google developer accounts?",
    a: "Yes. Your apps are published under your own name. Apple charges a yearly fee and Google charges a one-time fee.",
  },
  {
    q: "Which LMS plugins are supported?",
    a: "Tutor LMS, LearnDash, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS and Masteriyo, in their free and pro editions, with current Digits versions. The plugin detects what's installed and adapts.",
  },
  {
    q: "Can students buy courses inside the app?",
    a: "On Android, through your site's existing checkout. On iOS, the app is for watching enrolled courses, in line with Apple's rules.",
  },
  {
    q: "What if my lessons contain custom HTML or code?",
    a: "Standard content is shown natively. Complex content such as embeds or page builders is shown exactly like your website.",
  },
];

function PhoneMock() {
  return (
    <div className="h-[560px] w-[280px] max-w-full rounded-[40px] bg-midnight p-3" aria-hidden="true">
      <div className="flex h-full w-full flex-col gap-3.5 overflow-hidden rounded-[30px] bg-ivory px-4 pt-7 pb-4">
        <span className="text-[11px] text-muted">Good morning</span>
        <span className="-mt-2.5 text-base font-bold">Your student</span>
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-midnight p-3.5 text-white">
          <span className="text-xs font-bold">Python Programming Basics</span>
          <span className="text-[10px] text-night-text">Lesson 7: Functions &amp; Variables</span>
          <div className="h-[5px] rounded-[3px] bg-night-3">
            <div className="h-full w-3/5 rounded-[3px] bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-[120px] rounded-xl bg-tile-1" />
          <div className="h-[120px] rounded-xl bg-tile-2" />
          <div className="h-[120px] rounded-xl bg-tile-3" />
          <div className="h-[120px] rounded-xl bg-tile-4" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const plans = [PLAN_INFO.starter, PLAN_INFO.pro];
  return (
    <div className="bg-white">
      <SiteHeader onLanding />
      <main>
        <section id="top" className="scroll-mt-4 bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-12 px-4 py-14 sm:px-6 sm:py-[72px]">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[22px]">
              <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">
                For WordPress LMS academies
              </span>
              <h1 className="m-0 text-[38px] leading-[1.08] font-extrabold tracking-[-1px] sm:text-[52px]">
                Your Tutor LMS academy, as a mobile app.
              </h1>
              <p className="m-0 max-w-[540px] text-lg leading-relaxed text-ink-4">
                Turn your WordPress site into branded Android and iOS apps. Students sign in with Digits OTP, watch protected lessons and track their progress, all synced with your website.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={WHATSAPP_URL} className="flex h-[52px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white">
                  <Icon name="chat" size={20} />
                  Get started on WhatsApp
                </a>
                <a href="#how" className="flex h-[52px] items-center rounded-xl border border-line-button bg-white px-[22px] text-base font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight">
                  See how it works
                </a>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span>Works with:</span>
                {WORKS_WITH.map((name) => (
                  <span key={name} className="font-semibold text-midnight">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-[1_1_280px] justify-center">
              <PhoneMock />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-4">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-9 px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex max-w-[640px] flex-col gap-2.5">
              <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.5px] sm:text-4xl">Everything your students need, in their pocket</h2>
              <p className="m-0 text-[17px] leading-relaxed text-ink-4">
                Your courses, lessons and quizzes stay in your LMS plugin. The app reads them live, so there&apos;s nothing to copy or maintain twice.
              </p>
            </div>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-2.5 rounded-2xl border border-line p-6">
                  <Icon name={feature.icon} size={28} />
                  <h3 className="m-0 text-lg font-bold">{feature.title}</h3>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-4 bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-9 px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.5px] sm:text-4xl">From website to app stores in four steps</h2>
            <ol className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight font-bold text-white">{index + 1}</span>
                  <h3 className="m-0 text-[17px] font-bold">{step.title}</h3>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-4">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-9 px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-2.5">
              <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.5px] sm:text-4xl">Pricing</h2>
              <p className="m-0 text-[17px] text-ink-4">Payments are arranged directly with our team on WhatsApp.</p>
            </div>
            <div className="grid max-w-[900px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
              {plans.map((plan) => {
                const featured = plan.id === "pro";
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col gap-[18px] rounded-[20px] p-7 ${featured ? "border-2 border-midnight bg-peach-soft" : "border border-line"}`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <h3 className="m-0 text-lg font-bold">{plan.name}</h3>
                      <span className="text-sm text-muted">{plan.tagline}</span>
                    </div>
                    <span className="text-[34px] font-extrabold">
                      {plan.price}
                      {plan.period ? <span className="text-[15px] font-medium text-muted"> / {plan.period}</span> : null}
                    </span>
                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
                      {plan.highlights.map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <Icon name="check" size={20} className="text-success" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={WHATSAPP_URL}
                      className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline ${
                        featured
                          ? "bg-midnight text-white hover:bg-ink-3 hover:text-white"
                          : "border border-midnight text-midnight hover:bg-ivory hover:text-midnight"
                      }`}
                    >
                      Contact us on WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-4 bg-ivory">
          <div className="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="m-0 text-[30px] font-extrabold tracking-[-0.5px] sm:text-4xl">Questions</h2>
            {FAQ.map((item, index) => (
              <details key={item.q} open={index === 0} className="group rounded-[14px] border border-line bg-white px-5 py-[18px]">
                <summary className="flex items-start justify-between gap-3 rounded-md text-[17px] font-bold">
                  {item.q}
                  <Icon name="expand_more" size={24} className="transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 mb-0 text-[15px] leading-relaxed text-ink-4">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter full />
    </div>
  );
}
