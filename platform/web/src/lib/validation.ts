import { createPrivateKey } from "node:crypto";
import { z } from "zod";
import { APP_FONTS, APP_TEMPLATES, RULES } from "./build-config/types";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth/password-rules";
import { isHttpUrl } from "./license/site-url";
import { normalizeShopDomain } from "./hosted/connectors/shopify";
import { PLANS } from "./plans";
import { VERSION_PATTERN } from "./semver";

/**
 * Form rules. Wizard rules mirror docs/build-config.schema.json; the full
 * config is validated against the schema itself before a build is queued.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email.")
  .max(191, "This email is too long.")
  .pipe(z.email("Enter a valid email address."));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

const whatsapp = z
  .string()
  .trim()
  .min(1, "Enter your WhatsApp number.")
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter the number with its country code, e.g. +90 5XX XXX XX XX."));

const siteUrl = z
  .string()
  .trim()
  .min(1, "Enter your website address.")
  .max(255, "This address is too long.")
  .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
  .refine((value) => isHttpUrl(value), "Enter a full address, e.g. https://your-academy.com.");

const httpsSiteUrl = siteUrl.refine(
  (value) => RULES.httpsUrl.test(value),
  "Your website must use https. Apps can only connect to secure sites.",
);

/**
 * The website on sign-up is optional: apps also come from Shopify and other
 * platforms, or from no website. Empty is stored as "" (clients.site_url is
 * NOT NULL), and new apps start without a website (lib/app/setup.ts).
 */
const optionalSiteUrl = z
  .string()
  .trim()
  .max(255, "This address is too long.")
  .optional()
  .default("")
  .transform((value) => (value === "" || /^https?:\/\//i.test(value) ? value : `https://${value}`))
  .refine((value) => value === "" || isHttpUrl(value), "Enter a full address, e.g. https://your-site.com, or leave it empty.");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120, "This name is too long."),
  email,
  whatsapp,
  siteUrl: optionalSiteUrl,
  password,
  terms: z.literal("on", "Please confirm the terms and that you're signing up for your business."),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    token: z.string().min(20, "This link is invalid.").max(200),
    password,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { message: "The passwords don't match.", path: ["confirm"] });

const apiBaseUrl = z
  .string()
  .trim()
  .max(2048, "This address is too long.")
  .refine((value) => RULES.httpsUrl.test(value) && !/[?#]/.test(value), "Enter your API's https address, without ? or #.");

export const websiteSchema = z.discriminatedUnion("backend", [
  z.object({ backend: z.literal("wordpress"), siteUrl: httpsSiteUrl }),
  z.object({ backend: z.literal("custom_api"), siteUrl: httpsSiteUrl, apiBaseUrl }),
  z.object({
    backend: z.literal("shopify"),
    siteUrl: httpsSiteUrl,
    shopDomain: z
      .string()
      .trim()
      .max(255)
      .transform((value, ctx) => {
        const domain = normalizeShopDomain(value);
        if (!domain) ctx.addIssue({ code: "custom", message: "Enter your shop's address, like your-shop.myshopify.com." });
        return domain ?? "";
      }),
    // Empty keeps the saved token.
    storefrontToken: z.string().trim().max(200, "This token is too long.").optional().default(""),
    // Optional, for order history; empty keeps the saved one.
    adminToken: z.string().trim().max(200, "This token is too long.").optional().default(""),
    removeAdminToken: z.literal("on").optional(),
  }),
  z.object({ backend: z.literal("catalog") }),
  // The platform's own fields (p_<name>) are checked against its definition.
  z.object({ backend: z.literal("platform"), platform: z.string().trim().min(1, "Choose a platform.").max(40) }),
  z.object({
    backend: z.literal("setup_requested"),
    // 19 Optional: clients without any website ask us too. Empty is saved as null.
    siteUrl: z
      .string()
      .optional()
      .default("")
      .transform((value, ctx) => {
        if (!value.trim()) return null;
        const parsed = httpsSiteUrl.safeParse(value);
        if (parsed.success) return parsed.data;
        ctx.addIssue({ code: "custom", message: parsed.error.issues[0]?.message ?? "Enter a full address, e.g. https://your-academy.com." });
        return z.NEVER;
      }),
    setupNote: z.string().trim().max(1000, "Use at most 1000 characters.").optional().default(""),
  }),
]);

const color = z.string().trim().regex(RULES.color, "Use a hex color like #0E0D24.");

export const brandingSchema = z.object({
  appName: z.string().trim().min(1, "Enter your app name.").max(RULES.appNameMax, `Use at most ${RULES.appNameMax} characters.`),
  shortName: z
    .string()
    .trim()
    .min(1, "Enter the name shown under the app icon.")
    .max(RULES.shortNameMax, `Use at most ${RULES.shortNameMax} characters.`),
  primaryColor: color,
  splashColor: color,
  template: z.enum(APP_TEMPLATES, "Choose a template."),
  font: z.enum(APP_FONTS, "Choose a font."),
  iconAssetId: z.string().uuid("Upload your app icon."),
  logoAssetId: z.union([z.literal(""), z.string().uuid()]).transform((value) => value || null),
});

export const listingSchema = z.object({
  androidPackage: z
    .string()
    .trim()
    .max(150, "This package name is too long.")
    .regex(RULES.androidPackage, "Use lowercase words separated by dots, e.g. com.youracademy.app."),
  iosBundleId: z
    .string()
    .trim()
    .max(155, "This bundle ID is too long.")
    .regex(RULES.iosBundleId, "Use letters, numbers and dashes separated by dots, e.g. com.youracademy.app."),
  storeTitle: z.string().trim().min(2, "Enter the store title.").max(30, "Use at most 30 characters."),
  shortDescription: z.string().trim().min(10, "Write a short description.").max(80, "Use at most 80 characters."),
  fullDescription: z.string().trim().min(50, "Write at least 50 characters.").max(4000, "Use at most 4000 characters."),
  supportEmail: email,
  privacyUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => isHttpUrl(value, true), "Enter the https address of your privacy policy page."),
});

export const googlePlayKeySchema = z
  .string()
  .max(20_000, "This file is too large for a service account key.")
  .transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (parsed.type !== "service_account" || typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
        ctx.addIssue({ code: "custom", message: "This isn't a Google Cloud service account key (JSON)." });
        return z.NEVER;
      }
      return { json: value, clientEmail: parsed.client_email };
    } catch {
      ctx.addIssue({ code: "custom", message: "This file isn't valid JSON." });
      return z.NEVER;
    }
  });

export const appStoreKeySchema = z.object({
  issuerId: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "The Issuer ID looks like 69a6de7e-…, from App Store Connect › Users and Access › Integrations."),
  keyId: z.string().trim().regex(/^[A-Z0-9]{10}$/, "The Key ID is 10 letters and numbers."),
  privateKey: z
    .string()
    .max(10_000, "This file is too large for a .p8 key.")
    .refine(isAppStoreConnectKey, "This isn't an App Store Connect .p8 key. Download it again from App Store Connect › Users and Access › Integrations."),
});

/** App Store Connect keys are P-256 elliptic-curve private keys in PEM. */
function isAppStoreConnectKey(value: string): boolean {
  if (!/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(value)) return false;
  try {
    const key = createPrivateKey(value);
    return key.asymmetricKeyType === "ec" && key.asymmetricKeyDetails?.namedCurve === "prime256v1";
  } catch {
    return false;
  }
}

export const startBuildSchema = z.object({
  versionName: z.string().trim().regex(VERSION_PATTERN, "Use a version like 1.0.0."),
});

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Choose a valid date.");

export const activateSchema = z.object({
  clientId: z.string().uuid(),
  plan: z.enum(PLANS, "Choose a plan."),
  activeUntil: date,
  paymentNote: z.string().trim().max(500, "Keep the note under 500 characters."),
});

export const addClientSchema = z.object({
  name: z.string().trim().min(2, "Enter the client's name.").max(120),
  email,
  whatsapp,
  siteUrl: optionalSiteUrl,
});

export const clientDetailsSchema = addClientSchema.omit({ email: true }).extend({
  clientId: z.string().regex(/^[0-9a-f-]{36}$/i),
});

export const releaseSchema = z.object({
  version: z.string().trim().regex(VERSION_PATTERN, "Use a version like 0.2.0."),
  requiresWp: z.string().trim().regex(/^\d+\.\d+(\.\d+)?$/, "Use a version like 6.0."),
  requiresPhp: z.string().trim().regex(/^\d+\.\d+(\.\d+)?$/, "Use a version like 7.4."),
  testedWp: z.string().trim().regex(/^\d+\.\d+(\.\d+)?$/, "Use a version like 6.8."),
  changelog: z.string().trim().min(1, "Describe what changed.").max(20_000),
  published: z.union([z.literal("on"), z.literal("")]).optional().transform((value) => value === "on"),
});

// 11.7 Admin team
export const inviteAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter their name.").max(120),
  email,
  role: z.enum(["owner", "admin", "support", "viewer"], { error: "Choose a role." }),
});
