import type { Pickable, PickableEntry } from "../hosted/pages/pickable";
import { itemWords } from "../hosted/pages/item-words";
import { DESIGN_ART } from "../demo/design-art";
import type { PictureName } from "../demo/pictures";
import { formatMinor } from "../market/currency";
import type { ItemSource } from "../pages/types";
import { SAMPLE_COURSES, SAMPLE_DELIVERY_SERVICES, SAMPLE_LANGS, SAMPLE_RESTAURANTS, SAMPLE_SCHOOL_NEWS, SAMPLE_VEHICLE_TYPES } from "../samples/content";

/**
 * Studio's canvas: the entries a list of the kinds' own designs (restaurants,
 * delivery services, vehicle types, a school's news, courses) shows while
 * the project has none, and on the templates' and projects' small phones.
 * They are the samples a project of that kind gets (lib/samples/content.ts),
 * drawn as the app's cards draw them (lib/hosted/pages/sources.ts): the
 * same picture, line, price and badge, with the drawn pictures in
 * public/design-pictures. Never offered to pick.
 */

type Entries = Partial<Record<ItemSource, PickableEntry[]>>;

/** A drawn picture's file in public/design-pictures, when it has one. */
function pictureOf(name: PictureName | null | undefined): string | null {
  const file = name ? `art-${name}.png` : null;
  return file && DESIGN_ART[file] ? `/design-pictures/${file}` : null;
}

/** 128.8 The samples' ratings, as courses with reviews show them. */
const SAMPLE_RATINGS = [4.9, 4.7, 4.8, 4.6];

function entriesIn(lang: (typeof SAMPLE_LANGS)[number], now: Date): Entries {
  return {
    // A restaurant: its cuisines under its name, its picture (as the app shows its cover, else its logo).
    restaurants: SAMPLE_RESTAURANTS.restaurants.map((r, i) => ({
      id: `sample-${i + 1}`,
      title: r.name[lang],
      subtitle: r.cuisines.map((c) => SAMPLE_RESTAURANTS.cuisines[c]?.[lang]).filter(Boolean).join(" · ") || r.description[lang],
      imageUrl: pictureOf(r.logo),
      price: null,
      badge: null,
    })),
    // A delivery service: when it arrives, and what it adds to the price.
    delivery_services: SAMPLE_DELIVERY_SERVICES.services.map((s, i) => ({
      id: `sample-${i + 1}`,
      title: s.name[lang],
      subtitle: s.eta[lang],
      imageUrl: pictureOf(s.picture),
      price: null,
      badge: s.extraCents > 0 ? `+${formatMinor(s.extraCents, SAMPLE_DELIVERY_SERVICES.currency)}` : null,
    })),
    // A vehicle type: what it is (the samples have no picture, as the app shows them).
    vehicle_types: SAMPLE_VEHICLE_TYPES.types.map((t, i) => ({ id: `sample-${i + 1}`, title: t.name[lang], subtitle: t.description[lang], imageUrl: null, price: null, badge: null })),
    // A school's news: its words and its day.
    school_news: SAMPLE_SCHOOL_NEWS.map((n, i) => ({
      id: `sample-${i + 1}`,
      title: n.title[lang],
      subtitle: n.body[lang].length > 140 ? `${n.body[lang].slice(0, 139)}…` : n.body[lang],
      imageUrl: null,
      price: null,
      badge: new Date(now.getTime() - n.daysAgo * 86_400_000).toISOString().slice(0, 10),
    })),
    // A course: its teacher, its picture and its price.
    courses: SAMPLE_COURSES.courses.map((c, i) => ({
      id: `sample-${i + 1}`,
      title: c.title[lang],
      subtitle: c.instructor[lang],
      imageUrl: pictureOf(c.picture),
      price: c.priceCents > 0 ? formatMinor(c.priceCents, SAMPLE_COURSES.currency) : itemWords(lang).free,
      badge: null,
      // 128.8 A sample rating for a card's `rating` element.
      rating: SAMPLE_RATINGS[i % SAMPLE_RATINGS.length],
    })),
  };
}

/** The samples in each language Studio's samples come in. */
export function sampleEntries(now: Date): NonNullable<Pickable["samples"]> {
  return Object.fromEntries(SAMPLE_LANGS.map((lang) => [lang, entriesIn(lang, now)]));
}
