import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { VendorBoard, type BoardData } from "@/components/vendor-board";
import { getStore } from "@/lib/data";
import { panelCookie, panelStaff } from "@/lib/market/panel";
import { boardData } from "@/lib/market/panel-board";
import { fill, PANEL_WORDS, panelLang, type PanelLang, type PanelWords } from "@/lib/market/panel-words";
import { requestPanelCode, signOutOfPanel, verifyPanelCode } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partner panel", robots: { index: false, follow: false } };

/** 115.7 The vendors' web panel of one marketplace app: its sign-in, then the live orders board. */
export default async function PartnerPanel(props: PageProps<"/partner/[appId]">) {
  const { appId } = await props.params;
  const search = await props.searchParams;
  const lang = panelLang(typeof search.lang === "string" ? search.lang : null, (await headers()).get("accept-language"));
  const w = PANEL_WORDS[lang];
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app || app.connector?.kind !== "restaurants") notFound();
  const jar = await cookies();
  const staff = await panelStaff(store, app, jar.get(panelCookie(appId))?.value, new Date());
  if (staff) {
    const data = await boardData(store, app, staff);
    if (data) return <VendorBoard initial={data as BoardData} words={w} lang={lang} endpoint={`/api/partner/${encodeURIComponent(appId)}/board`} signOutAction={signOutOfPanel.bind(null, appId, lang)} />;
  }
  const pending = (jar.get(`${panelCookie(appId)}_pending`)?.value ?? "").split("|")[1] ?? "";
  const step = search.step === "code" && pending ? "code" : "email";
  const error = typeof search.error === "string" ? search.error : null;
  return <SignIn appName={app.appName ?? ""} lang={lang} w={w} step={step} email={pending} error={error} request={requestPanelCode.bind(null, appId, lang)} verify={verifyPanelCode.bind(null, appId, lang)} />;
}

function SignIn({ appName, lang, w, step, email, error, request, verify }: { appName: string; lang: PanelLang; w: PanelWords; step: "email" | "code"; email: string; error: string | null; request: (f: FormData) => Promise<void>; verify: (f: FormData) => Promise<void> }) {
  const message = error === "wrong" ? w.wrongCode : error === "expired" ? w.expiredCode : error === "too_many" ? w.tooMany : null;
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="grid min-h-screen bg-ivory lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-midnight p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -end-24 h-[28rem] w-[28rem] rounded-full bg-ember/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -start-20 h-96 w-96 rounded-full bg-[#6d5dfc]/30 blur-3xl" />
        <p className="relative m-0 text-sm font-bold tracking-[1.4px] text-night-muted uppercase">{appName}</p>
        <div className="relative flex flex-col gap-5">
          <h1 className="m-0 max-w-md text-5xl leading-[1.05] font-extrabold tracking-[-1.5px]">{w.title}</h1>
          <div className="flex flex-col gap-3">
            {[
              { icon: "notifications" as const, text: w.emptyNew },
              { icon: "timer" as const, text: w.emptyPreparing },
              { icon: "delivery_dining" as const, text: w.emptyReady },
            ].map((r) => (
              <div key={r.text} className="flex max-w-md items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ember">
                  <Icon name={r.icon} size={20} />
                </span>
                <span className="text-[15px] font-semibold text-night-text">{r.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative m-0 max-w-md text-sm text-night-muted">{w.noContact}</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 shadow-[0_30px_60px_-40px_rgba(14,13,36,0.5)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-peach text-accent">
            <Icon name={step === "code" ? "mail" : "storefront"} size={24} />
          </span>
          <h2 className="mt-5 mb-2 text-2xl font-extrabold tracking-[-0.5px] text-midnight">{step === "code" ? w.codeTitle : w.signInTitle}</h2>
          <p className="m-0 text-[15px] leading-relaxed text-muted">{step === "code" ? fill(w.codeText, { email }) : w.signInText}</p>
          {step === "code" ? <p className="mt-2 text-[13px] text-faint">{w.codeSentAnyway}</p> : null}
          {message ? <p className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{message}</p> : null}
          {step === "email" ? (
            <form action={request} className="mt-6 flex flex-col gap-3">
              <label className="text-sm font-bold text-ink-2" htmlFor="email">
                {w.email}
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="h-12 rounded-xl border border-line px-4 text-base" />
              <button className="mt-2 h-12 rounded-xl bg-midnight text-base font-bold text-white hover:bg-ink-3">{w.sendCode}</button>
            </form>
          ) : (
            <form action={verify} className="mt-6 flex flex-col gap-3">
              <label className="text-sm font-bold text-ink-2" htmlFor="code">
                {w.code}
              </label>
              <input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" dir="ltr" className="h-14 rounded-xl border border-line px-4 text-center font-mono text-2xl font-bold tracking-[0.5em]" />
              <button className="mt-2 h-12 rounded-xl bg-midnight text-base font-bold text-white hover:bg-ink-3">{w.verify}</button>
              <a href="?step=email" className="text-center text-sm font-semibold text-accent">
                {w.anotherEmail}
              </a>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
