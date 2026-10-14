import { CATALOG_CURRENCIES, formatCents, parsePrice } from "../catalog/money";
import type { CatalogCurrency, Donation, DonationSettings } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { excerptOf, plainText } from "../news/html";
import { DONATION_MAX_CENTS, donationReference, PRESETS_MAX } from "./service";

/** 29 Checks of the dashboard's campaign, settings and update forms, and the donations export. */

export const CAMPAIGN_TITLE_MAX = 120;
export const CAMPAIGN_SUMMARY_MAX = 300;
export const CAMPAIGN_STORY_MAX = 50_000;
export const CAMPAIGN_IMAGES_MAX = 5;
export const CAMPAIGN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export interface CampaignFields {
  title: string;
  summary: string | null;
  story: string;
  goalCents: number | null;
  presetCents: number[];
  allowCustomAmount: boolean;
  minCents: number;
  endsAt: Date | null;
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** "150, 300, 600" (or one per line) as amounts in cents, smallest first, without repeats. */
export function parsePresets(text: string): number[] | null {
  const parts = text
    .split(/[\n;]+|,\s+|\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: number[] = [];
  for (const part of parts) {
    const cents = parsePrice(part);
    if (cents === null || cents < 1) return null;
    if (!out.includes(cents)) out.push(cents);
  }
  return out.sort((a, b) => a - b);
}

/** A day typed in the form ("2026-12-31") as the end of that day in Istanbul; null for none, or undefined when it isn't a date. */
export function parseEndDate(value: string): Date | null | undefined {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = new Date(`${text}T23:59:59.999+03:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** The form's value for an end date: its day in Istanbul. */
export function endDateValue(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function parseCampaignForm(values: Record<string, string>, now: Date, options: { newCampaign: boolean }): Result<CampaignFields> {
  const v = (name: string) => (values[name] ?? "").trim();
  const errors: Record<string, string> = {};
  const title = v("title").replace(/\s+/g, " ");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > CAMPAIGN_TITLE_MAX) errors.title = `Use at most ${CAMPAIGN_TITLE_MAX} characters.`;
  const summary = v("summary").replace(/\s+/g, " ");
  if (summary.length > CAMPAIGN_SUMMARY_MAX) errors.summary = `Use at most ${CAMPAIGN_SUMMARY_MAX} characters.`;
  const story = (values.story ?? "").replace(/\r\n?/g, "\n").trim();
  if (!story || !plainText(story)) errors.story = "Tell people what the campaign is for.";
  else if (story.length > CAMPAIGN_STORY_MAX) errors.story = `Use at most ${CAMPAIGN_STORY_MAX.toLocaleString("en-GB")} characters.`;
  const goal = v("goal") ? parsePrice(v("goal")) : null;
  if (v("goal") && (goal === null || goal < 1 || goal > 1_000_000_000_00)) errors.goal = "Enter the amount you want to raise, or leave it empty for no goal.";
  const presets = parsePresets(values.presets ?? "");
  if (presets === null) errors.presets = "Enter amounts separated by commas, like 150, 300, 600.";
  else if (presets.length > PRESETS_MAX) errors.presets = `Suggest up to ${PRESETS_MAX} amounts.`;
  else if (presets.some((p) => p > DONATION_MAX_CENTS)) errors.presets = "One of these amounts is too large.";
  const min = v("min") ? parsePrice(v("min")) : 1_00;
  if (min === null || min < 1) errors.min = "Enter the smallest donation, like 20.";
  const allowCustomAmount = values.allowCustom === "on";
  if (!allowCustomAmount && presets !== null && presets.length === 0) errors.presets = "Suggest at least one amount, or let people type their own.";
  if (presets && min !== null && presets.some((p) => p < min)) errors.presets = "Every suggested amount must be at least the smallest donation.";
  const endsAt = parseEndDate(values.endsAt ?? "");
  if (endsAt === undefined) errors.endsAt = "Choose a day, or leave it empty.";
  else if (endsAt && options.newCampaign && endsAt.getTime() <= now.getTime()) errors.endsAt = "Choose a day after today.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      summary: summary || excerptOf(plainText(story)),
      story,
      goalCents: goal,
      presetCents: presets!,
      allowCustomAmount,
      minCents: min!,
      endsAt: endsAt ?? null,
    },
  };
}

/** The app's donation settings from the form; the currency can't change once someone has given. */
export function parseDonationSettings(values: Record<string, string>, hasDonations: boolean, current: DonationSettings): Result<DonationSettings> {
  const currency = (values.currency ?? "") as CatalogCurrency;
  const errors: Record<string, string> = {};
  if (!CATALOG_CURRENCIES.includes(currency)) errors.currency = "Choose a currency.";
  else if (hasDonations && currency !== current.currency) errors.currency = "The currency can't change after the first donation.";
  const iosMode = values.iosMode === "off" ? "off" : values.iosMode === "browser" ? "browser" : null;
  if (!iosMode) errors.iosMode = "Choose how the iPhone app takes donations.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { currency, iosMode: iosMode! } };
}

/** A campaign update for its donors: a title and a few lines, as phones show them. */
export function parseCampaignUpdate(values: Record<string, string>): Result<{ title: string; body: string }> {
  const title = (values.title ?? "").trim().replace(/\s+/g, " ");
  const body = (values.body ?? "").trim().replace(/\s+/g, " ");
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Enter a title.";
  else if (title.length > NOTIFICATION_TITLE_MAX) errors.title = `Use at most ${NOTIFICATION_TITLE_MAX} characters.`;
  if (!body) errors.body = "Write the update.";
  else if (body.length > NOTIFICATION_BODY_MAX) errors.body = `Use at most ${NOTIFICATION_BODY_MAX} characters.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { title, body } };
}

/** A cell of the export: quoted when needed, and never read as a formula by a spreadsheet. */
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_DATE = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

/** The Donations page's export: one row per donation, as the charity sees it (anonymous donors included, for receipts). */
export function donationsCsv(donations: Donation[]): string {
  const header = ["Reference", "Date (UTC)", "Status", "Campaign", "Amount", "Currency", "Recurring", "Donor", "Email", "Phone", "Anonymous", "Message"];
  const rows = donations.map((d) => [
    donationReference(d),
    CSV_DATE(d.paidAt ?? d.createdAt),
    d.status,
    d.campaignTitle,
    (d.amountCents / 100).toFixed(2),
    d.currency,
    d.recurring === "monthly" ? "Monthly" : "One-off",
    d.donorName,
    d.donorEmail,
    d.donorPhone,
    d.anonymous ? "Yes" : "No",
    d.message,
  ]);
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export interface DonorRow {
  email: string;
  name: string | null;
  phone: string | null;
  donations: number;
  totalCents: number;
  firstAt: Date;
  lastAt: Date;
  campaigns: string[];
}

/** Paid donations grouped by email address, the most generous first. */
export function donorsOf(donations: Donation[]): DonorRow[] {
  const byEmail = new Map<string, DonorRow>();
  for (const d of donations) {
    if (d.status !== "paid" || !d.donorEmail) continue;
    const at = d.paidAt ?? d.createdAt;
    const row = byEmail.get(d.donorEmail) ?? { email: d.donorEmail, name: null, phone: null, donations: 0, totalCents: 0, firstAt: at, lastAt: at, campaigns: [] };
    row.donations += 1;
    row.totalCents += d.amountCents;
    if (at.getTime() <= row.firstAt.getTime()) row.firstAt = at;
    if (at.getTime() >= row.lastAt.getTime()) {
      row.lastAt = at;
      row.name = d.donorName ?? row.name;
      row.phone = d.donorPhone ?? row.phone;
    }
    if (!row.campaigns.includes(d.campaignTitle)) row.campaigns.push(d.campaignTitle);
    byEmail.set(d.donorEmail, row);
  }
  return [...byEmail.values()].sort((a, b) => b.totalCents - a.totalCents || b.lastAt.getTime() - a.lastAt.getTime());
}

/** "₺1,250.00 in 3 donations" */
export function donorTotal(row: Pick<DonorRow, "totalCents" | "donations">, currency: CatalogCurrency): string {
  return `${formatCents(row.totalCents, currency)} in ${row.donations} ${row.donations === 1 ? "donation" : "donations"}`;
}
