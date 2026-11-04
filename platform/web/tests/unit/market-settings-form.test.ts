import { describe, expect, it } from "vitest";
import { courierTermsFormValues, parseCourierTermsForm } from "@/lib/market/delivery-forms";
import { paymentSetupPlan, paymentSetupSteps } from "@/lib/market/payments";
import { DEFAULT_MARKET_SETTINGS, marketSettingsOf } from "@/lib/market/settings";
import { marketSettingsFormValues, parseMarketSettingsForm } from "@/lib/market/settings-form";
import { getDashT } from "@/i18n/dashboard";

const base = { country: "TR", currency: "TRY", tax_rate: "20", tax_label: "KDV", tax_included: "on", gateway: "stripe", cash: "on", cash_max: "2500", apple_pay: "on", google_pay: "on", pickup: "on", scheduling: "on", days_ahead: "5", club: "on", wallet: "on", weight_tolerance: "15", vendor_app: "bundle", require_photos: "on" };

describe("115.12 the marketplace settings form", () => {
  it("reads every field, in the currency's minor units", () => {
    const parsed = parseMarketSettingsForm(base, DEFAULT_MARKET_SETTINGS, "EGP");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({
      country: "TR",
      currency: "TRY",
      tax: { ratePercent: 20, included: true, onDelivery: false, label: "KDV" },
      payment: { gateway: "stripe", cash: true, cashMax: 250000, applePay: true, googlePay: true },
      pickup: true,
      scheduling: { enabled: true, daysAhead: 5 },
      club: true,
      wallet: true,
      weightTolerancePercent: 15,
      vendorApp: "bundle",
      requirePhotos: true,
    });
  });

  it("turns photos and the wallets off when unticked, and Apple or Google Pay need a gateway", () => {
    const parsed = parseMarketSettingsForm({ ...base, gateway: "", require_photos: "" }, DEFAULT_MARKET_SETTINGS, "EGP");
    expect(parsed.ok && parsed.value.requirePhotos).toBe(false);
    expect(parsed.ok && parsed.value.payment).toMatchObject({ gateway: null, applePay: false, googlePay: false });
  });

  it("refuses bad codes, rates and ranges, and a marketplace nobody can pay in", () => {
    const bad = (patch: Record<string, string>) => parseMarketSettingsForm({ ...base, ...patch }, DEFAULT_MARKET_SETTINGS, "EGP");
    expect(bad({ country: "Egypt" })).toMatchObject({ ok: false, field: "country" });
    expect(bad({ currency: "pounds" })).toMatchObject({ ok: false, field: "currency" });
    expect(bad({ tax_rate: "70" })).toMatchObject({ ok: false, field: "tax_rate" });
    expect(bad({ gateway: "bank" })).toMatchObject({ ok: false, field: "gateway" });
    expect(bad({ cash_max: "-5" })).toMatchObject({ ok: false, field: "cash_max" });
    expect(bad({ days_ahead: "30" })).toMatchObject({ ok: false, field: "days_ahead" });
    expect(bad({ weight_tolerance: "80" })).toMatchObject({ ok: false, field: "weight_tolerance" });
    expect(bad({ cash: "", gateway: "", wallet: "" })).toMatchObject({ ok: false, field: "cash" });
  });

  it("shows saved settings again as the form reads them", () => {
    const parsed = parseMarketSettingsForm(base, DEFAULT_MARKET_SETTINGS, "EGP");
    if (!parsed.ok) throw new Error(parsed.error);
    const again = parseMarketSettingsForm(marketSettingsFormValues({ marketApp: parsed.value }, "EGP"), DEFAULT_MARKET_SETTINGS, "EGP");
    expect(again).toEqual(parsed);
    expect(marketSettingsFormValues({ marketApp: undefined }, "EGP").require_photos).toBe("on");
    expect(marketSettingsOf({ marketApp: undefined }).requirePhotos).toBe(true);
  });

  it("the couriers' terms go round the form too", () => {
    const parsed = parseCourierTermsForm({ customer_fee: "percent", percent: "8", min_fee: "15", max_fee: "60", free_over: "400", vendor_charge: "fixed", vendor_charge_value: "5" }, "EGP");
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parseCourierTermsForm(courierTermsFormValues(parsed.value, "EGP"), "EGP")).toEqual(parsed);
    expect(courierTermsFormValues(undefined, "EGP")).toMatchObject({ customer_fee: "delivery_prices", vendor_charge: "none" });
  });

  it("the setup steps keep their English wording and are worded in every dashboard language", () => {
    const plan = paymentSetupPlan({ gateway: "iyzico", cash: true, cashMax: null, applePay: true, googlePay: true });
    expect(plan.map((s) => s.step)).toEqual(["add_keys", "apple_unsupported", "google_unsupported", "test_order"]);
    expect(paymentSetupSteps({ gateway: null, cash: true, cashMax: null, applePay: false, googlePay: false })[0]).toMatch(/pay in cash/);
    for (const lang of ["en", "ar", "tr"] as const) {
      const t = getDashT(lang);
      for (const step of ["choose_gateway", "add_keys", "apple_on", "apple_unsupported", "google_on", "google_unsupported", "test_order"]) {
        const text = t(`market.step_${step}` as never, { name: "Stripe" });
        expect(text).not.toContain("market.");
        if (step !== "choose_gateway" && step !== "test_order") expect(text).toContain("Stripe");
      }
    }
  });
});
