import type { HostedSettings } from "../data/types";
import { parseAnyPhone } from "./phone";

export type HostedSettingsForm = Record<string, string>;

/** Field values for the App sign-in form from saved settings. */
export function hostedSettingsValues(settings: HostedSettings): HostedSettingsForm {
  return {
    signupAllowed: settings.signupAllowed ? "on" : "",
    askEmail: settings.signupFields.includes("email") ? "on" : "",
    askCity: settings.signupFields.includes("city") ? "on" : "",
    defaultCountryCode: settings.defaultCountryCode.replace(/^\+/, ""),
    deviceLimit: String(settings.deviceLimit),
    supportWhatsapp: settings.supportWhatsapp ?? "",
    termsUrl: settings.termsUrl ?? "",
    reviewPhone: settings.reviewPhone ?? "",
    reviewCode: settings.reviewCode ?? "",
  };
}

/** Validates the App sign-in form. */
export function parseHostedSettingsForm(
  values: HostedSettingsForm,
): { ok: true; value: HostedSettings } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cc = (values.defaultCountryCode ?? "").replace(/^\+/, "").trim();
  if (!/^[1-9]\d{0,2}$/.test(cc)) errors.defaultCountryCode = "Enter a country code, like 90.";
  const countryCode = `+${cc}`;
  const limit = Number(values.deviceLimit);
  if (!/^\d{1,2}$/.test(values.deviceLimit ?? "") || limit > 10) errors.deviceLimit = "Enter 0 to 10 (0 for no limit).";

  const whatsappRaw = (values.supportWhatsapp ?? "").trim();
  const whatsapp = whatsappRaw ? parseAnyPhone(whatsappRaw, countryCode) : null;
  if (whatsappRaw && !whatsapp) errors.supportWhatsapp = "Enter a phone number, like +90 532 123 45 67.";

  const termsRaw = (values.termsUrl ?? "").trim();
  let terms: string | null = null;
  if (termsRaw) {
    try {
      const url = new URL(termsRaw);
      if (url.protocol !== "https:") throw new Error("not https");
      terms = url.toString();
    } catch {
      errors.termsUrl = "Enter an https address, or leave it empty.";
    }
  }

  const reviewPhoneRaw = (values.reviewPhone ?? "").trim();
  const reviewCode = (values.reviewCode ?? "").trim();
  const reviewPhone = reviewPhoneRaw ? parseAnyPhone(reviewPhoneRaw, countryCode) : null;
  if (reviewPhoneRaw && !reviewPhone) errors.reviewPhone = "Enter a phone number, like +90 555 000 00 00.";
  if (reviewPhoneRaw && !/^\d{6}$/.test(reviewCode)) errors.reviewCode = "Enter the 6-digit code reviewers type.";
  if (!reviewPhoneRaw && reviewCode) errors.reviewPhone = "Enter the number reviewers sign in with, or clear the code.";

  if (Object.keys(errors).length) return { ok: false, errors };
  const signupFields: HostedSettings["signupFields"] = [];
  if (values.askEmail === "on") signupFields.push("email");
  if (values.askCity === "on") signupFields.push("city");
  return {
    ok: true,
    value: {
      signupAllowed: values.signupAllowed === "on",
      signupFields,
      defaultCountryCode: countryCode,
      deviceLimit: limit,
      supportWhatsapp: whatsapp?.e164 ?? null,
      termsUrl: terms,
      reviewPhone: reviewPhone?.e164 ?? null,
      reviewCode: reviewPhone ? reviewCode : null,
    },
  };
}
