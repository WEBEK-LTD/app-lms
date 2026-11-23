import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { PublicRating } from "@/lib/studio-market/designer-public";
import { Stars } from "./parts";

/**
 * 106.14 Buyers' ratings as the pages show them (a template's page, the
 * designer's page, the website's and the dashboard's): the stars, the
 * name as given ("Ahmed K."), the day, the comment and the designer's one
 * answer under it. Inside the market's words (DashboardI18n) for the stars.
 * The words come from the page, in its language.
 */
export interface RatingWords {
  someone: string;
  replyFrom: (name: string) => string;
  onTemplate?: (title: string) => string;
  date: (date: Date) => string;
  edited: string;
}

export function RatingItem({ rating, words, designerName, templateHref, after }: { rating: PublicRating; words: RatingWords; designerName: string; templateHref?: string; after?: ReactNode }) {
  const changed = rating.updatedAt.getTime() - rating.createdAt.getTime() > 60_000;
  return (
    <li className="flex flex-col gap-2.5 border-t border-[var(--mk-hair)] py-5" data-rating-item={rating.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={rating.stars} size={18} />
        <b dir="auto" className="text-[15px]">
          {rating.authorName || words.someone}
        </b>
        <span className="mk-muted text-[13px]">
          {words.date(rating.updatedAt)}
          {changed ? ` · ${words.edited}` : ""}
        </span>
        {words.onTemplate && templateHref ? (
          <Link href={templateHref} dir="auto" className="mk-link text-[13px]">
            {words.onTemplate(rating.templateTitle)}
          </Link>
        ) : null}
      </div>
      {rating.comment ? (
        <p dir="auto" className="m-0 text-[15px] leading-relaxed whitespace-pre-line">
          {rating.comment}
        </p>
      ) : null}
      {rating.reply ? (
        <div className="mk-tile ms-4 flex gap-2.5 rounded-2xl px-4 py-3 md:ms-8" data-rating-reply="">
          <Icon name="forum" size={18} className="mt-0.5 flex-none text-[var(--mk-accent)]" />
          <span className="flex min-w-0 flex-col gap-1">
            <b dir="auto" className="text-[13px]">
              {words.replyFrom(designerName)}
            </b>
            <span dir="auto" className="text-sm leading-relaxed whitespace-pre-line">
              {rating.reply}
            </span>
          </span>
        </div>
      ) : null}
      {after}
    </li>
  );
}

export function RatingList({ ratings, words, designerName, templateHref, empty }: { ratings: readonly PublicRating[]; words: RatingWords; designerName: string; templateHref?: (slug: string) => string; empty: string }) {
  if (!ratings.length) return <p className="mk-muted m-0 text-[15px]">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0" data-ratings="">
      {ratings.map((r) => (
        <RatingItem key={r.id} rating={r} words={words} designerName={designerName} templateHref={templateHref?.(r.templateSlug)} />
      ))}
    </ul>
  );
}
