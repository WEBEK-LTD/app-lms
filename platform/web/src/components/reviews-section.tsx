import type { ReactNode } from "react";
import { LANG_INFO, type Lang } from "@/i18n/config";
import { formatMessage, formatNumber } from "@/i18n/format";
import type { Messages } from "@/i18n";
import { REVIEW_SOURCE_BRANDS } from "@/lib/brands";
import { reviewRows, type ReviewsView } from "@/lib/reviews/reviews";
import type { PublicReview } from "@/lib/reviews/types";
import { ReviewSourceMark } from "./brand-marks";
import { Icon } from "./icon";
import { ReviewsScore } from "./reviews-score";
import "./reviews-section.css";

export type ReviewsWords = Messages["reviews"];

/** The fewest cards in each half of a moving row, so it fills a wide screen. */
const HALF_MIN = 6;
/** Seconds each card takes to drift past. */
const SECONDS_PER_CARD = 10;

/** "What our <em>customers</em> say", the `<em>` part in ember. */
function withEm(text: string): ReactNode[] {
  return text.split(/(<em>[\s\S]*?<\/em>)/).map((part, i) =>
    part.startsWith("<em>") ? (
      <em key={i} className="text-ember not-italic">
        {part.slice(4, -5)}
      </em>
    ) : (
      part
    ),
  );
}

const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.4l6.6-.8z";

function Stars({ on, size }: { on: number; size: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className={n <= on ? "rv-star" : "rv-star-off"}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </>
  );
}

function ReviewCard({ review, words, lang }: { review: PublicReview; words: ReviewsWords; lang: Lang }) {
  const source = !review.sample && review.source !== "direct" ? review.source : null;
  const badge = source ? (
    <>
      <ReviewSourceMark source={source} size={16} />
      {formatMessage(lang, words.reviewOn, { source: REVIEW_SOURCE_BRANDS[source].name })}
    </>
  ) : null;
  return (
    <article dir={LANG_INFO[lang].dir} data-review-card={review.sample ? "sample" : "real"} className="rv-card flex w-[290px] flex-none flex-col gap-3.5 rounded-[22px] p-[18px] sm:w-[360px] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        {/* A sample card has no rating, so no stars. */}
        {review.sample ? (
          <span />
        ) : (
          <span className="inline-flex gap-[3px]" role="img" aria-label={formatMessage(lang, words.stars, { rating: review.rating })}>
            <Stars on={review.rating} size={16} />
          </span>
        )}
        {review.about ? <span className="rv-chip rounded-lg px-2.5 py-1 text-xs font-semibold">{review.about}</span> : null}
      </div>
      <blockquote lang={review.textLang} dir="auto" className="m-0 text-[15.5px] leading-[1.75]">
        {review.text}
      </blockquote>
      <div className="mt-auto flex items-center gap-3">
        {review.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- The customer's own photo, from our files store.
          <img src={review.photoUrl} alt="" width={42} height={42} loading="lazy" className="h-[42px] w-[42px] flex-none rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className={`grid h-[42px] w-[42px] flex-none place-items-center rounded-full text-[15px] font-extrabold ${review.sample ? "rv-av-sample" : "rv-av"}`}>
            {review.sample ? <Icon name="person" size={20} /> : review.initial}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <b className="rv-name text-sm">
            <bdi>{review.name}</bdi>
            {review.sample ? <span className="rv-sample ms-1.5 inline-block rounded-[5px] px-1.5 text-[10.5px] font-bold">{words.sampleLabel}</span> : null}
          </b>
          {review.byline ? (
            <small className="rv-muted text-[12.5px]">
              <bdi>{review.byline}</bdi>
            </small>
          ) : null}
        </span>
      </div>
      {badge ? (
        <div className="rv-meta flex items-center pt-3">
          {review.sourceUrl ? (
            <a href={review.sourceUrl} target="_blank" rel="noopener nofollow" data-review-source={source!} className="group rv-muted inline-flex items-center gap-1.5 text-xs font-semibold no-underline hover:text-midnight">
              {badge}
            </a>
          ) : (
            <span data-review-source={source!} className="group rv-muted inline-flex items-center gap-1.5 text-xs font-semibold">
              {badge}
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** A row's cards repeated to fill half the track. */
function filled<T>(items: T[]): T[] {
  const out: T[] = [];
  while (out.length < HALF_MIN) out.push(...items);
  return out;
}

/**
 * The customer reviews section (the home page, and the preview in Admin ›
 * Reviews), as the owner approved it: a dark band with a big ember quote
 * mark, the real reviews' score (stars popping in, the average counting
 * up), and rows of glass cards drifting in turn left and right. It draws
 * the real shown reviews, or, until there is one, the labelled sample
 * cards (each says "Sample review", has no rating, badge or link, and the
 * section says they aren't real; there is no score then). Nothing without either.
 */
export function ReviewsSection({ view, words, lang }: { view: ReviewsView; words: ReviewsWords; lang: Lang }) {
  if (!view || !view.reviews.length) return null;
  const { moving, rows } = reviewRows(view.reviews);
  // With few reviews every row has them all: the rows after the first are read out as repeats.
  const shared = rows.length > 1 && rows.every((row) => row.length === view.reviews.length);
  // A card repeated to fill a row is read out once: its repeats are hidden from assistive technology.
  const card = (review: PublicReview, i: number, repeat: boolean | "row" = false) => (
    <li key={`${review.key}-${i}`} className={repeat === true ? "rv-repeat flex" : "flex"} {...(repeat ? { "aria-hidden": true, inert: true } : {})}>
      <ReviewCard review={review} words={words} lang={lang} />
    </li>
  );
  return (
    <section aria-labelledby="h-reviews" data-reviews={view.kind} className="rv-band pt-[72px] pb-20">
      <div className="mx-auto mb-11 grid max-w-[1200px] items-end gap-7 px-4 sm:px-6 md:grid-cols-[auto_1fr_auto]">
        <div className="rv-quote" aria-hidden="true">
          “
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-bold tracking-[1px] text-ember uppercase">{words.eyebrow}</span>
          <h2 id="h-reviews" className="m-0 text-[28px] leading-[1.2] font-bold text-balance sm:text-[46px]">
            {withEm(words.title)}
          </h2>
          <p className="rv-muted m-0 max-w-[46ch] leading-[1.7]">{words.text}</p>
          {view.kind === "samples" ? (
            <p data-reviews-samples-note="" className="rv-note m-0 max-w-[60ch] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-[1.7]">
              {words.samplesNote}
            </p>
          ) : null}
        </div>
        {view.kind === "real" ? (
          <ReviewsScore average={view.average} label={formatMessage(lang, words.average, { average: formatNumber(lang, view.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}>
            <span className="inline-flex gap-[3px]" aria-hidden="true">
              <Stars on={Math.round(view.average)} size={18} />
            </span>
            <small className="rv-muted order-last text-[12.5px]">{formatMessage(lang, words.count, { count: view.count })}</small>
          </ReviewsScore>
        ) : null}
      </div>
      {moving ? (
        <div className="rv-rows grid gap-[18px]">
          {rows.map((row, r) => {
            const half = filled(row);
            return (
              <div key={r} className="rv-row" data-drift={r % 2 === 0 ? "left" : "right"}>
                <div className="rv-track py-1" style={{ "--rv-duration": `${half.length * SECONDS_PER_CARD}s` } as React.CSSProperties}>
                  <ul className="m-0 flex list-none gap-[18px] p-0 pe-[18px]">{half.map((review, i) => card(review, i, i >= row.length ? true : shared && r > 0 ? "row" : false))}</ul>
                  <ul aria-hidden="true" inert className="rv-copy m-0 flex list-none gap-[18px] p-0 pe-[18px]">
                    {half.map((review, i) => card(review, i))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mx-auto m-0 flex max-w-[1200px] list-none flex-wrap justify-center gap-[18px] px-4 sm:px-6">{rows[0]!.map((review, i) => card(review, i))}</ul>
      )}
    </section>
  );
}
