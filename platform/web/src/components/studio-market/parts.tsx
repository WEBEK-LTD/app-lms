"use client";

import Link from "next/link";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import type { CoverView, DesignerCard, DesignerChip, TemplateCard } from "@/lib/studio-market/catalog";
import { formatUsd, ltr, type PriceTag } from "@/lib/studio-market/plans";
import { Countdown } from "./countdown";
import { TemplatePhone } from "./phone";
import "./market.css";

/**
 * 106 Studio Market's small parts, as the approved designs draw them: a
 * template's card (its cover page in a phone on the dotted board), a
 * designer's round picture and card, an app kind with its icon.
 */

export function DesignerAvatar({ designer, size = "xs", square = false }: { designer: Pick<DesignerChip, "initials" | "bg" | "fg">; size?: "xs" | "sm" | "md" | "lg" | "xl"; square?: boolean }) {
  const box = { xs: "h-[22px] w-[22px] text-[9.5px]", sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-[13px]", lg: "h-14 w-14 text-[19px] rounded-2xl", xl: "h-[72px] w-[72px] text-2xl rounded-[20px]" }[size];
  return (
    <span aria-hidden="true" className={`inline-flex flex-none items-center justify-center font-extrabold tracking-[0.02em] ${square ? "rounded-[10px]" : size === "lg" || size === "xl" ? "" : "rounded-full"} ${box}`} style={{ background: designer.bg, color: designer.fg }}>
      {designer.initials}
    </span>
  );
}

/** An app kind with its icon, its name in the dashboard's language (lib/app/kinds.ts names are known texts). */
export function KindTag({ kind }: { kind: { name: string; icon: string } }) {
  const known = useKnownText();
  return (
    <span className="inline-flex items-center gap-[5px] text-[12.5px] text-muted">
      <Icon name={kind.icon as IconName} size={16} />
      {known(kind.name)}
    </span>
  );
}

export function FreePrice({ big = false }: { big?: boolean }) {
  const t = useDashT();
  return <span className={`font-extrabold whitespace-nowrap text-success ${big ? "text-lg" : "text-[15px]"}`}>{t("studioMarket.free")}</span>;
}

/** 106.2 A template's price on its card: "Free", "From $4/mo" or "$149 once"; 106.12 the price before its discounts struck through beside it. */
export function PriceTagView({ price, big = false, wasCents = null }: { price: PriceTag; big?: boolean; wasCents?: number | null }) {
  const t = useDashT();
  const lang = useDashLang();
  if (price.kind === "free") return <FreePrice big={big} />;
  const tag = (
    <span data-price={price.kind} className={`font-extrabold whitespace-nowrap text-[var(--mk-ink)] ${big ? "text-lg" : "text-[15px]"}`}>
      {t(price.kind === "from" ? "studioMarket.fromPrice" : "studioMarket.oncePrice", { price: ltr(formatUsd(price.cents), lang) })}
    </span>
  );
  if (!wasCents) return tag;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {tag}
      <WasPrice text={price.kind === "from" ? t("studioMarket.perMonth", { price: ltr(formatUsd(wasCents), lang) }) : ltr(formatUsd(wasCents), lang)} />
    </span>
  );
}

/** 106.12 A price before its discount, struck through (read out as "Before: $8/mo"). */
export function WasPrice({ text, className = "" }: { text: string; className?: string }) {
  const t = useDashT();
  return (
    <s data-was className={`mk-muted text-[13px] font-semibold whitespace-nowrap ${className}`}>
      <span className="sr-only">{t("marketDiscounts.wasPrice", { price: text })}</span>
      <span aria-hidden="true">{text}</span>
    </s>
  );
}

/** The dotted board behind a template's phones (Studio's projects grid). */
export function Board({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`market-board ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * A template's card: one markup for both art directions (globals.css
 * `.mk-card`): a framed print on the wall in light, a glass case with a light
 * pool in dark. Lifts and tilts its phone on hover; "View template" fades in.
 */
export function TemplateCardView({ card, rank, phone = 170, height, pool }: { card: TemplateCard; rank?: number; phone?: number; height?: number; pool?: string }) {
  const t = useDashT();
  const known = useKnownText();
  const kind = card.kinds[0];
  return (
    <article className="mk-card" data-template-card={card.slug} style={pool ? ({ "--mk-pool": pool } as React.CSSProperties) : undefined}>
      <div className="mk-card-frame">
        <div className="mk-card-stage" style={height ? { height } : undefined}>
          <span className="mk-card-tags">
            {card.free ? <span className="mk-pill mk-pill-free">{t("studioMarket.free")}</span> : null}
            {rank ? <span className="mk-pill mk-pill-ink">{t("studioMarket.rank", { rank })}</span> : null}
            {/* 106.12 A flash sale or a price drop on it now. */}
            {card.flashEndsAt ? (
              <span className="mk-pill mk-pill-sale">
                <Icon name="bolt" size={15} filled />
                {t("marketDiscounts.flashPill")}
              </span>
            ) : card.wasCents ? (
              <span className="mk-pill mk-pill-sale">
                <Icon name="sell" size={15} />
                {t("marketDiscounts.salePill")}
              </span>
            ) : null}
          </span>
          <div className="mk-card-phone">
            <TemplatePhone view={card.cover} width={phone} />
          </div>
          <span className="mk-card-hover" aria-hidden="true">
            {t("studioMarket.viewTemplate")}
            <Icon name="arrow_forward" size={18} />
          </span>
        </div>
      </div>
      <div className="mk-card-cap">
        <div className="flex items-baseline justify-between gap-2">
          <Link href={`/dashboard/studio-market/t/${card.slug}`} dir="auto" className="mk-card-name min-w-0 truncate after:absolute after:inset-0">
            {card.title}
          </Link>
          <span className="mk-muted flex-none text-[13px] font-semibold whitespace-nowrap">{t("studioMarket.applies", { count: card.applies })}</span>
        </div>
        <span className="mk-card-by">
          <DesignerAvatar designer={card.designer} />
          <span dir="auto" className="truncate">
            {card.designer.name}
          </span>
          {kind ? (
            <>
              <span className="opacity-50">·</span>
              <span className="truncate">{known(kind.name)}</span>
            </>
          ) : null}
        </span>
        <div className="mk-card-foot">
          <PriceTagView price={card.price} wasCents={card.wasCents} />
          <Icon name="arrow_forward" size={18} className="mk-muted" />
        </div>
        {card.flashEndsAt ? <Countdown endsAt={card.flashEndsAt} className="mk-sale-time text-[12.5px]" size={15} /> : null}
      </div>
    </article>
  );
}

export function DesignerCardView({ designer, country }: { designer: DesignerCard; country: string }) {
  const t = useDashT();
  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-[18px]">
      <div className="flex items-center gap-3">
        <DesignerAvatar designer={designer} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/dashboard/studio-market?designer=${designer.slug}`} dir="auto" className="truncate text-base font-bold text-midnight no-underline hover:text-midnight">
            {designer.name}
          </Link>
          <span className="text-[13px] text-muted">{country}</span>
        </div>
      </div>
      <Board className="flex h-[92px] items-start justify-center gap-2 overflow-hidden rounded-xl px-2.5 pt-2.5">
        {designer.covers.map((cover: CoverView, i) => (
          <TemplatePhone key={i} view={cover} width={62} />
        ))}
      </Board>
      <div className="flex justify-between text-[13px]">
        <span className="flex flex-col">
          <b className="text-[15px]">{designer.templates}</b>
          <span className="text-muted">{t("studioMarket.templatesWord")}</span>
        </span>
        <span className="flex flex-col text-end">
          <b className="text-[15px]">{designer.applies}</b>
          <span className="text-muted">{t("studioMarket.appsWord")}</span>
        </span>
      </div>
    </article>
  );
}
