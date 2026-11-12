/**
 * 124 The occasion pages (Admin › Occasions): Black Friday at
 * /black-friday in every language, told as one night: the reader's own,
 * the night the prices fall and the app they put off for years begins.
 * Each scene opens with a few lines of that story (`SceneText`) and holds
 * a real part of the offer and the system: the offer, the plans at their
 * price with it, the kinds of app, the four steps, everything included,
 * the terms and the questions. The words are
 * in src/content/occasions/<lang>.ts; the shape (icons, screens) is in
 * ./shape.ts, item by item. Every number on the page (the percentage, the
 * days, the code, the prices) comes from the saved occasion and the plans,
 * so the words only hold placeholders for them:
 *
 *   {percent} 50 · {code} BLACKFRIDAY50 · {from} 1 November 2026 ·
 *   {to} 30 November 2026 · {days} 1–30 November 2026 · {year} 2026
 */

/** The address of Black Friday's page, in English (lib/occasions `OCCASION_TEMPLATES.black_friday.slug`). */
export const BLACK_FRIDAY_PATH = "/black-friday";

/** [title, what it is], one per item icon in ./shape.ts. */
export type ExplainedItem = [string, string];

/**
 * A scene of the night: its moment on the clock and the lines the reader
 * lives in it, in the second person. Short lines; the facts stay in the
 * scene's own words after them.
 */
export interface SceneText {
  /** "21:07 · The price falls". */
  label: string;
  lines: string[];
}

export interface IncludedGroupText {
  title: string;
  text: string;
  items: ExplainedItem[];
}

export interface OccasionText {
  /** Its name in links, the breadcrumb and the footer ("Black Friday"). */
  navName: string;
  meta: {
    title: string;
    titleOver: string;
    description: string;
    descriptionUpcoming: string;
    descriptionOver: string;
  };
  og: { eyebrow: string; title: string; text: string; titleOver: string; textOver: string };
  hero: {
    eyebrow: string;
    title: string;
    /** Beside the big percentage: "off" after it, or before it where the language says so ("خصم 50%"). */
    off: string;
    offBefore: boolean;
    /** What the percentage is off, by the occasion's plans. */
    offAll: string;
    offRegular: string;
    offStudio: string;
    lead: string;
    leadUpcoming: string;
    overTitle: string;
    overText: string;
    /** "{days}, Istanbul time". */
    days: string;
    codeLabel: string;
    copy: string;
    copied: string;
    /** Upcoming: from when the code works. */
    codeSoon: string;
    start: string;
    startSignedIn: string;
    seePlans: string;
    seePricing: string;
    /** Under the phones: the screens are the real apps'. */
    screensNote: string;
    /** The opening, while the offer is on or about to start. */
    scene: SceneText;
    /** The opening once it's over or turned off. */
    sceneOver: SceneText;
  };
  countdown: {
    endsIn: string;
    startsIn: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    /** For screen readers, to the minute. */
    label: string;
  };
  plans: {
    eyebrow: string;
    title: string;
    text: string;
    titleOver: string;
    textOver: string;
    switchLabel: string;
    regular: string;
    studio: string;
    regularText: string;
    studioText: string;
    was: string;
    now: string;
    save: string;
    firstPayment: string;
    onRequest: string;
    studioNone: string;
    details: string;
    period: string;
    /** The price falling, while the offer is on. */
    scene: SceneText;
  };
  kinds: {
    eyebrow: string;
    title: string;
    text: string;
    listLabel: string;
    inStudio: string;
    regularApp: string;
    solution: string;
    demo: string;
    /** The shop window. */
    scene: SceneText;
    /** The shelf's buttons, and each display's highlights. */
    prev: string;
    next: string;
    more: string;
  };
  steps: {
    eyebrow: string;
    title: string;
    text: string;
    /** [title, what happens, how long], one per step in ./shape.ts. */
    items: [string, string, string][];
    /** The receipt the steps are printed on: its heading, its total and its last line. */
    scene: SceneText;
    receipt: string;
    total: string;
    thanks: string;
  };
  included: {
    eyebrow: string;
    title: string;
    text: string;
    groups: IncludedGroupText[];
    /** The gift box opening. */
    scene: SceneText;
    /** On each group: how many parts it holds. */
    count: string;
  };
  terms: {
    eyebrow: string;
    title: string;
    text: string;
    plansAll: string;
    plansRegular: string;
    plansStudio: string;
    /** The other terms, in order, one per icon in ./shape.ts. */
    items: string[];
    over: string;
    refund: string;
    /** The back of the coupon, and the stamp on it once the offer is over. */
    scene: SceneText;
    overStamp: string;
  };
  faq: {
    title: string;
    /** The answer about the plans depends on the occasion's: {plansAnswer}. */
    plansAll: string;
    plansRegular: string;
    plansStudio: string;
    items: { q: string; a: string }[];
    scene: SceneText;
  };
  /** The morning after. */
  final: { title: string; text: string; titleOver: string; textOver: string; scene: SceneText };
}
