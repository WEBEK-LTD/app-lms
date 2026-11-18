/**
 * 106 Studio Market: whole app designs made in Studio by designers, shared
 * on the market and applied to other owners' Studio projects. A template is
 * a published snapshot of a Studio project's design (lib/studio/design-file.ts);
 * its first publish is reviewed by Yallapp's team, later versions go live
 * at once. A licence is a buyer's right to a template (free, or 106.2 a paid
 * plan for a time or for good); an application is the template on one of
 * the buyer's apps, with the design the app had before kept to go back to.
 * 106.2 An order is one payment for a template (a purchase or a renewal),
 * with the sale split between the designer (75%) and Yallapp (25%).
 */

/** 106.1 A designer's profile: one per account. Studio is free for designers; publishing an app still needs a plan. */
export interface TemplateDesigner {
  id: string;
  /** The account (it signs in, designs in Studio and is paid). */
  clientId: string;
  /** Shown on the market: "Studio Nūr". */
  name: string;
  /** Their public address: yallapp.com.tr/designers/<slug>. */
  slug: string;
  /** ISO 3166-1 alpha-2: where they are paid (in US dollars by SWIFT). */
  country: string;
  /** A short line about them, or null. */
  bio: string | null;
  status: "active" | "suspended";
  /** When they agreed to the designer terms (Yallapp's 25% share included). */
  termsAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateDesignerPatch = Partial<Pick<TemplateDesigner, "name" | "slug" | "country" | "bio" | "status" | "termsAcceptedAt">>;

/** Draft → In review → Published, or Changes requested with the team's notes. */
export type MarketTemplateStatus = "draft" | "in_review" | "changes_requested" | "published";

/** What happens to a buyer's app when their plan ends: the design stays without updates, or the app goes back to its previous design. */
export type MarketAfterEnd = "keep" | "restore";

export type MarketTemplateLang = "en" | "ar" | "tr";

export interface MarketTemplateText {
  title: string;
  /** One short line under the title. */
  short: string;
  description: string;
}

/** 106.2 A paid plan the designer offers: its length (or for good) and its price. */
export interface MarketPlanPrice {
  period: "1m" | "3m" | "6m" | "1y" | "2y" | "life";
  /** US cents. */
  cents: number;
}

export type MarketPlanPeriod = MarketPlanPrice["period"];

export interface MarketTemplate {
  id: string;
  designerId: string;
  /** The designer's account. */
  clientId: string;
  /** The Studio project it is made from; null once that project is deleted. */
  sourceAppId: string | null;
  /** Its address on the market. */
  slug: string;
  status: MarketTemplateStatus;
  /** Its title, short line and description per language (English shows where one is missing). */
  texts: Partial<Record<MarketTemplateLang, MarketTemplateText>>;
  /** The app kinds it fits (lib/app/kinds.ts KINDS ids), up to 3, all of the source project's engine. */
  kinds: string[];
  tags: string[];
  free: boolean;
  /** 106.2 Its paid plans (empty when it is free); a change reaches only the next purchases. */
  plans: MarketPlanPrice[];
  afterEnd: MarketAfterEnd;
  /** The project's page addresses in the order the template's pictures show them; the first is the cover. Empty: the project's order. */
  screens: string[];
  /** When the designer confirmed they own, or have the rights to, every photo, font and icon in it. */
  rightsConfirmedAt: Date | null;
  /** The designer's note to the review team, sent with the template. */
  noteToTeam: string | null;
  /** The version buyers get; null until it is first published. */
  currentVersionId: string | null;
  /** The version waiting for the team (in review) or sent back (changes requested). */
  reviewVersionId: string | null;
  submittedAt: Date | null;
  publishedAt: Date | null;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketTemplatePatch = Partial<
  Pick<
    MarketTemplate,
    | "sourceAppId"
    | "slug"
    | "status"
    | "texts"
    | "kinds"
    | "tags"
    | "free"
    | "plans"
    | "afterEnd"
    | "screens"
    | "rightsConfirmedAt"
    | "noteToTeam"
    | "currentVersionId"
    | "reviewVersionId"
    | "submittedAt"
    | "publishedAt"
  >
>;

/** The cover drawn on the market's cards without reading the whole design: its first page and the look around it. */
export interface MarketTemplateCover {
  /** A Studio page (lib/pages/types.ts StudioPage), kept as the design has it. */
  page: unknown;
  lang: string;
  font: string;
  brand: string;
  accent: string | null;
  tabs: unknown[];
  tabBar?: unknown;
}

/** 106.1 A snapshot of the project's design: the design file is in the file store. */
export interface MarketTemplateVersion {
  id: string;
  templateId: string;
  /** 1, 2, … */
  number: number;
  blobKey: string;
  sizeBytes: number;
  /** How many pages it has, and how many elements in them. */
  pages: number;
  elements: number;
  /** The languages its texts are in. */
  languages: string[];
  cover: MarketTemplateCover | null;
  createdAt: Date;
  /** Email of whoever sent it. */
  createdBy: string | null;
}

export type MarketReviewDecision = "approved" | "changes_requested";

/** 106.1 The team's answer to a template sent for review. */
export interface MarketTemplateReview {
  id: number;
  templateId: string;
  versionId: string | null;
  decision: MarketReviewDecision;
  /** To the designer (emailed and shown on their templates). */
  notes: string | null;
  /** For the team only. */
  teamNote: string | null;
  /** The checklist's items the reviewer ticked (lib/studio-market/review.ts REVIEW_CHECKS). */
  checks: string[];
  reviewerEmail: string;
  reviewerName: string | null;
  createdAt: Date;
}

export type MarketTemplateReviewInput = Omit<MarketTemplateReview, "id">;

/** 106.2 Free, or the paid plan it has now (the last one bought). */
export type TemplateLicencePlan = "free" | MarketPlanPeriod;

/** 106.1 A buyer's right to a template, on one of their apps at a time. */
export interface TemplateLicence {
  id: string;
  templateId: string;
  /** The buyer's account. */
  clientId: string;
  plan: TemplateLicencePlan;
  status: "active" | "ended";
  /** The app it is applied to; null while it is on none. */
  appId: string | null;
  /** The version the buyer has. */
  versionId: string | null;
  startsAt: Date;
  /** Null for free and lifetime: they never end. */
  endsAt: Date | null;
  /** The last time it moved to another app (once every 30 days). */
  movedAt: Date | null;
  /** 106.2 What happens to the app when the plan ends, as the template said when it was bought; null when it never ends. */
  afterEnd: MarketAfterEnd | null;
  /** 106.2 The end date the reminder 14 days before went out for, and the one on its last day: once each per end date. */
  remindedEarlyFor: Date | null;
  remindedLastFor: Date | null;
  /** 106.2 When its plan ended (the daily job); null while it runs. */
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateLicencePatch = Partial<Pick<TemplateLicence, "status" | "appId" | "versionId" | "endsAt" | "movedAt" | "plan" | "afterEnd" | "remindedEarlyFor" | "remindedLastFor" | "endedAt">>;

/** 106.2 One paid period of a licence: each purchase or renewal adds one. */
export interface TemplateLicencePeriod {
  id: string;
  licenceId: string;
  orderId: string;
  plan: MarketPlanPeriod;
  startsAt: Date;
  /** Null for lifetime. */
  endsAt: Date | null;
  createdAt: Date;
}

export type TemplateOrderStatus = "pending" | "paid" | "failed";

/**
 * 106.2 One payment for a template, through Yallapp's own payment account
 * (Kashier, a one-time payment; card details stay with the gateway): a
 * purchase, or a renewal of a licence. Its price is the plan's when it was
 * bought, in US dollars; the gateway charged it in its own currency (pounds
 * through Kashier, at the team's rate). The sale is split here, ready for
 * the designer's ledger: 75% theirs, 25% Yallapp's (taxes and the gateway's
 * and transfers' fees included).
 */
export interface TemplateOrder {
  id: string;
  templateId: string;
  designerId: string;
  /** The buyer's account. */
  clientId: string;
  kind: "buy" | "renew";
  /** The licence it renews; for a purchase, the one it made once paid. */
  licenceId: string | null;
  plan: MarketPlanPeriod;
  /** A purchase: the app it goes on once paid; null to apply it later. */
  appId: string | null;
  /** The plan's price when bought, in US cents: the sale. */
  grossCents: number;
  /** The designer's 75% and Yallapp's 25% of it, in US cents (they add up to grossCents). */
  designerCents: number;
  yallappCents: number;
  /** What the gateway charged, in its currency ("EGP" through Kashier, or "USD"). */
  amountCents: number;
  currency: string;
  /** The team's rate used, pounds for one dollar; null when charged in dollars. */
  egpPerUsd: number | null;
  status: TemplateOrderStatus;
  /** SHA-256 of the payment link's token (the gateway calls back with it). */
  tokenHash: string;
  paymentProvider: string;
  /** The gateway's own reference, to read the payment back. */
  providerRef: string | null;
  /** The gateway's payment ID, once paid. */
  paymentId: string | null;
  /** When the buyer agreed that it is digital content applied right away, without refunds. */
  consentAt: Date;
  /** The period it paid for, once paid. */
  startsAt: Date | null;
  endsAt: Date | null;
  /** Once paid: when it went on the app, or why it couldn't (the buyer applies it from My templates). */
  appliedAt: Date | null;
  applyError: string | null;
  createdAt: Date;
  paidAt: Date | null;
  /**
   * 106.12 The discount it was bought with (a price drop, a flash sale or a
   * coupon code), or null (and missing on orders made before): `grossCents`
   * is then the price paid, the split is of it.
   */
  discount?: TemplateOrderDiscount | null;
}

/** 106.12 The discount an order got: what the plan cost before it and what came off, in US cents. */
export interface TemplateOrderDiscount {
  /** The discount's id (`MarketDiscount.id`): a coupon's uses are its paid orders. */
  id: string;
  kind: MarketDiscountKind;
  /** The coupon's code as the buyer used it (upper case); null for a price drop or a flash sale. */
  code: string | null;
  /** The plan's price before the discount; `grossCents` is after it. */
  listCents: number;
  /** listCents − grossCents. */
  offCents: number;
}

export type TemplateOrderPatch = Partial<Pick<TemplateOrder, "licenceId" | "startsAt" | "endsAt" | "appliedAt" | "applyError" | "providerRef">>;

/** 106.12 A price drop (automatic), a flash sale (automatic, with a countdown and the market's flash strip) or a coupon code the designer gives out. */
export type MarketDiscountKind = "drop" | "flash" | "coupon";

/**
 * 106.12 A designer's discount on one of their templates: an amount or a
 * percentage off, on some or all of its plans, from a start (or now) to an
 * end (or until it is ended). Nothing stacks: a buyer gets the better of
 * the automatic price (a drop or a flash sale) or their code. A price never
 * goes below the plans' lowest price ($1): a discount never makes a paid
 * plan free.
 */
export interface MarketDiscount {
  id: string;
  templateId: string;
  designerId: string;
  kind: MarketDiscountKind;
  /** A coupon's code in upper case (codes are read without regard to case); null for a drop or a flash sale. */
  code: string | null;
  /** A percentage (1 to 100) or an amount in US cents off. */
  offType: "percent" | "amount";
  offValue: number;
  /** The plans it is for; null for every plan the template offers (also those added later). */
  plans: MarketPlanPeriod[] | null;
  /** From then (inclusive), UTC; null: from when it was made. A flash sale always has both. */
  startsAt: Date | null;
  /** Until then (exclusive), UTC; null: until the designer ends it. */
  endsAt: Date | null;
  /** A coupon's most uses (paid orders); null for no limit. */
  usageLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Why an application ended. */
export type TemplateApplicationEnd = "moved" | "restored" | "replaced" | "ended";

/** 106.1 A template on an app: the design the app had before, kept in the file store to go back to. */
export interface TemplateApplication {
  id: string;
  licenceId: string;
  templateId: string;
  appId: string;
  versionId: string;
  /** The app's design before the template (lib/studio-market/apply.ts PreviousDesign), in the file store. */
  previousKey: string;
  /** The application on this app it replaced, if any. */
  replacedId: string | null;
  appliedAt: Date;
  endedAt: Date | null;
  endReason: TemplateApplicationEnd | null;
  /** Email of whoever applied it. */
  appliedBy: string | null;
}

export type TemplateApplicationPatch = Partial<Pick<TemplateApplication, "versionId" | "endedAt" | "endReason">>;
