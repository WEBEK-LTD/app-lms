import { messagesFor, type Lang } from "@/i18n";
import { getStore } from "@/lib/data";
import { homeReviews, type ReviewsView } from "@/lib/reviews/reviews";
import { ReviewsSection } from "./reviews-section";

/**
 * The home page's customer reviews: the real reviews the team added in
 * Admin › Reviews with the customer's agreement and didn't hide; until one
 * is shown, the labelled sample cards if the team leaves them on. Without
 * either (or without the database, as during a build), no section at all.
 */
export async function HomeReviews({ lang }: { lang: Lang }) {
  let view: ReviewsView;
  try {
    view = await homeReviews(await getStore(), lang);
  } catch {
    return null;
  }
  if (!view) return null;
  return <ReviewsSection view={view} words={messagesFor(lang).reviews} lang={lang} />;
}
