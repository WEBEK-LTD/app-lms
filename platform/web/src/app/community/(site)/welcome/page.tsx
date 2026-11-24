/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons: small files the site and the platform serve already sized. */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderButtons } from "@/components/community/site/auth-buttons";
import { LangSelect } from "@/components/community/site/client";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { authProviders } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";
import { POINTS } from "@/lib/community/qa";

export const metadata: Metadata = { title: "Welcome" };

/** 231 The welcome (the app design's first screen): Apple, Google, email, and Log in. */
export default async function WelcomePage() {
  const { lang, w, viewer } = await siteContext();
  if (viewer) redirect(cmLinks.home());
  return (
    <div className="cm-land welcome">
      <div className="cm-land-top">
        <span />
        <div className="cm-land-lang"><LangSelect lang={lang} label={w.language} /></div>
      </div>
      <main className="cm-welcome" id="cm-content">
        {/* The design's collage: two apps made with Yallapp and what members do here. */}
        <div className="cm-collage" aria-hidden="true">
          <div className="fl ph" style={{ insetInlineStart: -18, top: 40, transform: "rotate(-9deg)" }}><img src="/screens/beauty-sig-c-home.png" alt="" /></div>
          <div className="fl ph" style={{ insetInlineEnd: -16, top: 20, transform: "rotate(8deg)" }}><img src="/screens/crochet-sig-c-home.png" alt="" /></div>
          <div className="fl bub glass" style={{ insetInlineStart: 96, top: 4 }}><span className="ms f" style={{ color: "#FFD27A", fontSize: 22 }}>forum</span><div><b>{w.askTitle}</b>{w.bubbleAsk}</div></div>
          <div className="fl bub glass" style={{ insetInlineEnd: 14, top: 222 }}><span className="ms f" style={{ color: "#5BE7AE", fontSize: 22 }}>check_circle</span><div><b>{w.acceptedAnswer}</b>{fill(w.bubblePoints, { n: POINTS.answer_accepted })}</div></div>
          <div className="fl bub glass" style={{ insetInlineStart: 14, top: 300 }}><span className="ms f" style={{ color: "#7CC4FF", fontSize: 22 }}>menu_book</span><div><b>{w.navTutorials}</b>{w.bubbleLearn}</div></div>
        </div>
        <img className="lgo" src="/community/logo.svg" alt="Yallapp Community" />
        <h1>{w.welcomeTitle1}<br /><span>{w.welcomeTitle2}</span></h1>
        <p>{w.welcomeText}</p>
        <ProviderButtons w={w} providers={authProviders()} next={cmLinks.home()} emailHref={cmLinks.signUp()} />
        <div className="small">{w.alreadyMember} <Link href={cmLinks.signIn()}><b>{w.logIn}</b></Link></div>
      </main>
    </div>
  );
}
