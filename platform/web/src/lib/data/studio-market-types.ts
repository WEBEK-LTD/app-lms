/**
 * 106 Studio Market: whole app designs made in Studio by designers, shared
 * on the market and applied to other owners' Studio projects. A template is
 * a published snapshot of a Studio project's design (lib/studio/design-file.ts);
 * its first publish is reviewed by Yallapp's team, later versions go live
 * at once. A licence is a buyer's right to a template (free for now); an
 * application is the template on one of the buyer's apps, with the design
 * the app had before kept to go back to.
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

/** 106.2 A paid plan (stage 2); none yet: every template is free for now. */
export interface MarketPlanPrice {
  period: "1m" | "3m" | "6m" | "1y" | "2y" | "life";
  /** US cents. */
  cents: number;
}

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
  /** 106.2 Paid plans; empty while every template is free. */
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

/** 106.2 Free for now; the paid periods come with checkout. */
export type TemplateLicencePlan = "free" | MarketPlanPrice["period"];

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
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateLicencePatch = Partial<Pick<TemplateLicence, "status" | "appId" | "versionId" | "endsAt" | "movedAt">>;

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
