/**
 * 114 Email campaigns from the admin to the people registered on Yallapp
 * (and the admin's own contacts, who aren't):
 * the email's design (blocks or HTML), the campaign, its audience, the
 * recipients and what they did, and the addresses never mailed again.
 */

export type MailLang = "en" | "ar" | "tr";
export const MAIL_LANGS: readonly MailLang[] = ["en", "ar", "tr"];

// The design -----------------------------------------------------------------

export type MailBlockType =
  | "header"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "imageText"
  | "social"
  | "video"
  | "quote"
  | "cards"
  | "coupon"
  | "badges"
  | "list"
  | "html"
  | "footer";

/** "left" is the start of the line and "right" its end: mirrored in right-to-left emails. */
export type MailAlign = "left" | "center" | "right";

/** What every block can change about how it looks. */
export interface MailBlockStyle {
  /** Text color. */
  color?: string;
  /** The block's background (the full row). */
  background?: string;
  /** The inner box's background (a card, a button). */
  surface?: string;
  align?: MailAlign;
  /** Padding in px: top, right, bottom, left. */
  padding?: [number, number, number, number];
  radius?: number;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  font?: MailFont;
  /** The row spans the email's whole width (no side padding). */
  fullWidth?: boolean;
  borderColor?: string;
}

export type MailFont = "brand" | "system" | "serif" | "mono";

export interface MailLink {
  label: string;
  url: string;
}

export interface MailCard {
  title: string;
  text: string;
  /** A short highlight on top of the card: a price the admin writes, "New", a number. */
  kicker?: string;
  button?: MailLink | null;
  image?: string | null;
}

/** One block. Its fields are the ones its type reads; the rest are ignored. */
export interface MailBlock {
  id: string;
  type: MailBlockType;
  style?: MailBlockStyle;
  /** heading, text (simple HTML: b, i, u, a, br, ul, ol, li, p), quote, coupon, footer. */
  text?: string;
  /** heading: 1-3. */
  level?: 1 | 2 | 3;
  /** image, imageText, video: the picture's address. */
  src?: string;
  alt?: string;
  /** image, video, header: where a tap goes. */
  href?: string;
  /** image: width in px (at most the email's width). */
  width?: number;
  /** button, coupon. */
  button?: MailLink | null;
  /** header: show the logo; its dark or light version. */
  logo?: "dark" | "light" | "none";
  /** header: links on the right. */
  links?: MailLink[];
  /** spacer, divider: height or thickness in px. */
  size?: number;
  /** columns: 2 or 3 columns of blocks. */
  columns?: MailBlock[][];
  /** imageText: the picture on this side. */
  imageSide?: "left" | "right";
  /** imageText, quote: a title; quote: the person's name. */
  title?: string;
  /** quote: the person's role or business. */
  caption?: string;
  /** social: profile links by network. */
  social?: { network: MailSocialNetwork; url: string }[];
  /** cards: two or three cards side by side. */
  cards?: MailCard[];
  /** coupon: the code. */
  code?: string;
  /** badges: the store links. */
  stores?: { store: MailStore; url: string }[];
  /** list: points with a check. */
  items?: string[];
  /** html: the admin's own HTML (sanitized when sent). */
  html?: string;
}

export type MailSocialNetwork = "facebook" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok" | "whatsapp" | "website";
export type MailStore = "google_play" | "app_store" | "galaxy_store" | "appgallery" | "getapps";

export interface MailTheme {
  /** The page around the email. */
  background: string;
  /** The email's own background. */
  body: string;
  text: string;
  muted: string;
  /** Buttons and headings. */
  brand: string;
  /** Links and small accents. */
  accent: string;
  font: MailFont;
  /** 480 to 720; 600 by default. */
  width: number;
  radius: number;
}

export interface MailDoc {
  version: 1;
  theme: MailTheme;
  blocks: MailBlock[];
}

/** One language of an email: written with blocks, or as the admin's own HTML. */
export interface MailContent {
  subject: string;
  /** The line inboxes show after the subject. */
  preview: string;
  mode: "blocks" | "html";
  /** Text direction. Set to "rtl" by itself for Arabic; the admin can change it. */
  dir: "ltr" | "rtl";
  doc: MailDoc | null;
  html: string | null;
}

export type MailContents = Partial<Record<MailLang, MailContent>>;

// The audience ---------------------------------------------------------------

export type MailAccountState = "active" | "pending" | "expired" | "suspended";

/**
 * Who a campaign goes to: Yallapp accounts, the admin's own contacts, or
 * both (an address in both gets one email). Every list is "any of"; an empty
 * or missing list means anyone.
 */
export interface MailAudience {
  /** Accounts (the default: campaigns from before contacts), contacts, or both. */
  people?: MailAudiencePeople;
  states?: MailAccountState[];
  /** Plan ids of the account's apps. */
  plans?: string[];
  /** Accounts with an app in Yallapp Studio, or with a regular one. */
  sections?: ("regular" | "studio")[];
  appTypes?: string[];
  langs?: MailLang[];
  /** ISO 3166-1 alpha-2, upper case. */
  countries?: string[];
  /** yyyy-mm-dd, both included. */
  signedUpFrom?: string | null;
  signedUpTo?: string | null;
  /** An app of the account was published to a store (or built for one), or none was. */
  published?: "yes" | "no" | null;
  /** Signed in in the last N days, or not in the last N days. */
  activeWithinDays?: number | null;
  inactiveForDays?: number | null;
  /**
   * 114 Also the people the account invited to its team (off by default:
   * they didn't sign up to Yallapp themselves). Without it, only account owners.
   */
  includeTeam?: boolean;
  /** Contacts with any of these tags. */
  contactTags?: string[];
  /** Contacts in these languages. */
  contactLangs?: MailLang[];
  /** Contacts in these countries (ISO 3166-1 alpha-2, upper case). */
  contactCountries?: string[];
  /** Only these addresses (a test list), ignoring the rest. Applies to accounts and contacts. */
  emails?: string[];
}

export type MailAudiencePeople = "accounts" | "contacts" | "both";

// Contacts ---------------------------------------------------------------------

/** Where the admin knows a contact from (every contact has one). */
export type MailContactSource = "customer" | "met" | "event" | "website" | "other";

export const MAIL_CONTACT_SOURCES: readonly { value: MailContactSource; label: string }[] = [
  { value: "customer", label: "Existing customer" },
  { value: "met", label: "Met in person / call" },
  { value: "event", label: "Event" },
  { value: "website", label: "Website form" },
  { value: "other", label: "Other" },
];

/** What the admin ticks to add or import contacts (kept with each contact as who added them and when). */
export const MAIL_CONTACT_AGREEMENT = "These people are our customers or business contacts, or agreed to receive our emails";

/**
 * A business the admin talks to that has no Yallapp account (a customer, a
 * lead): campaigns can go to them too. One per address (lower case). The
 * addresses never to be mailed (unsubscribed, bounced, complained) are the
 * same list as for accounts, and stay when a contact is deleted.
 */
export interface MailContact {
  id: string;
  /** Lower case, unique. */
  email: string;
  name: string;
  company: string | null;
  lang: MailLang;
  /** ISO 3166-1 alpha-2, upper case. */
  country: string | null;
  /** Lower case, sorted, unique. */
  tags: string[];
  source: MailContactSource;
  /** The free text of "Other" (required then), or a detail of the source (the event's name). */
  sourceNote: string | null;
  /** The admin who added or imported it, having ticked MAIL_CONTACT_AGREEMENT. */
  addedBy: string;
  /** When they did. */
  addedAt: Date;
  updatedAt: Date;
  /** When they unsubscribed from a campaign email; null when they didn't (or subscribed again). */
  unsubscribedAt: Date | null;
}

export interface MailSegment {
  id: string;
  name: string;
  audience: MailAudience;
  createdAt: Date;
  updatedAt: Date;
}

// The campaign ---------------------------------------------------------------

export type MailCampaignStatus = "draft" | "scheduled" | "sending" | "paused" | "sent" | "cancelled";

export interface MailCampaign {
  id: string;
  name: string;
  status: MailCampaignStatus;
  archived: boolean;
  audience: MailAudience;
  /** The saved segment it came from, if any (the audience is copied in). */
  segmentId: string | null;
  fromName: string | null;
  replyTo: string | null;
  contents: MailContents;
  /** The language sent to people whose language has no version. */
  defaultLang: MailLang;
  /** Opens and clicks are counted. */
  track: boolean;
  /** At most this many of its emails a minute (60 unless changed). */
  perMinute: number;
  scheduledAt: Date | null;
  /** IANA zone the schedule was chosen in (shown back to the admin). */
  timeZone: string | null;
  /** How many recipients were listed when it started. */
  recipients: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export type MailRecipientStatus = "queued" | "sending" | "sent" | "failed" | "skipped";

export interface MailRecipient {
  id: number;
  campaignId: string;
  /** Lower case. */
  email: string;
  userId: string | null;
  clientId: string | null;
  name: string;
  lang: MailLang;
  status: MailRecipientStatus;
  attempts: number;
  error: string | null;
  /** When a failed one is tried again; null: not again. */
  nextAttemptAt: Date | null;
  /** While "sending": the run that took it and until when. Past it, the run is taken as lost. */
  claim: string | null;
  leaseUntil: Date | null;
  sentAt: Date | null;
  /** Team member (not the account's owner). */
  team: boolean;
  /** One of the admin's contacts (not an account); null for an account. */
  contactId: string | null;
}

/** One sending run of a campaign (a call of the minute job): how many it sent in how long. */
export interface MailRun {
  id: number;
  campaignId: string;
  startedAt: Date;
  finishedAt: Date;
  sent: number;
  failed: number;
  attempted: number;
}

/** How long the opens, clicks and per-person sending records are kept (the privacy policy says so). */
export const MAIL_HISTORY_MONTHS = 12;

export type MailEventKind = "open" | "click" | "unsubscribe" | "bounce" | "complaint";

export interface MailEvent {
  campaignId: string;
  email: string;
  kind: MailEventKind;
  url: string | null;
  at: Date;
}

export interface MailEventStats {
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  links: { url: string; clicks: number; unique: number }[];
}

export type MailSuppressionReason = "unsubscribed" | "bounced" | "complained" | "admin";

export interface MailSuppression {
  email: string;
  reason: MailSuppressionReason;
  campaignId: string | null;
  createdAt: Date;
}

/** The admin's own saved designs (the ready ones, in English, are in code: lib/mailing/templates). */
export interface MailTemplate {
  id: string;
  name: string;
  category: string;
  contents: MailContents;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A new campaign's sending rate (the owner's choice); each campaign can change it. */
export const DEFAULT_MAIL_PER_MINUTE = 60;
export const MAX_MAIL_PER_MINUTE = 600;
export const DEFAULT_MAIL_FROM_NAME = "Yallapp";
