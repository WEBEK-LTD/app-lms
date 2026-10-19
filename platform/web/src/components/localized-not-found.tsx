"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { SiteNavEntry } from "@/lib/site-nav";
import { isPrefixedLang, type PrefixedLang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { LogoLink } from "./brand";
import { Icon } from "./icon";
import { LanguageList, type LanguageLabels } from "./language-switcher";
import { SiteNav, type SiteNavLabels } from "./site-nav";
import { btn } from "./ui";

/** 55 What the Arabic and Turkish "page not found" says, given by the server (src/app/[lang]/not-found.tsx). */
export interface NotFoundText {
  nav: SiteNavEntry[];
  labels: SiteNavLabels;
  languages: LanguageLabels;
  title: string;
  text: string;
  home: string;
  guides: string;
  legalLine: string;
}

/**
 * 55 The "page not found" of /ar/… and /tr/…: a not-found page gets no
 * route parameters, so it picks its language here from the address.
 */
export function LocalizedNotFound({ texts }: { texts: Record<PrefixedLang, NotFoundText> }) {
  const params = useParams<{ lang?: string }>();
  const lang: PrefixedLang = isPrefixedLang(params?.lang) ? params.lang : "ar";
  const t = texts[lang];
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header data-site-theme="" className="relative z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1160px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:gap-6">
          <LogoLink href={localePath(lang, "/")} adaptive alt={t.labels.logoHome} />
          <SiteNav lang={lang} nav={t.nav} labels={t.labels} languages={t.languages} />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-[20px] border border-line bg-white px-6 py-10 sm:px-9">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-accent">
            <Icon name="link_off" size={32} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{t.title}</h1>
            <p className="m-0 text-base leading-relaxed text-ink-4">{t.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={localePath(lang, "/")} className={`${btn.primary} h-[50px] flex-[1_1_180px]`}>
              {t.home}
            </Link>
            <Link href={localePath(lang, "/docs")} className={`${btn.secondary} h-[50px] flex-[1_1_160px]`}>
              {t.guides}
            </Link>
          </div>
        </section>
      </main>
      <footer className="on-dark bg-midnight text-night-text">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6">
          <span>{t.legalLine}</span>
          <LanguageList lang={lang} labels={t.languages} tone="dark" />
        </div>
      </footer>
    </div>
  );
}
