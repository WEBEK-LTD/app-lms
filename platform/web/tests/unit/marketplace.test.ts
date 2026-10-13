import { describe, expect, it } from "vitest";
import { parseSubMerchantForm, validIban, validTurkishId } from "@/lib/catalog/marketplace";
import { commissionOf } from "@/lib/catalog/settings";

const person = {
  type: "PERSONAL",
  payeeName: "Rose Shop",
  contactName: "Ayşe Nur Kaya",
  email: "ayse@rose.test",
  phone: "0532 123 45 67",
  address: "Moda Cd. 12, Kadıköy, Istanbul",
  iban: "tr33 0006 1005 1978 6457 8413 26",
  identityNumber: "10000000146",
};

describe("marketplace", () => {
  it("checks IBANs and Turkish ID numbers", () => {
    expect(validIban("TR330006100519786457841326")).toBe(true);
    expect(validIban("TR330006100519786457841327")).toBe(false);
    expect(validTurkishId("10000000146")).toBe(true);
    expect(validTurkishId("10000000147")).toBe(false);
    expect(validTurkishId("01234567890")).toBe(false);
  });

  it("turns the shop's details into iyzico's sub-merchant fields", () => {
    expect(parseSubMerchantForm(person)).toEqual({
      ok: true,
      details: {
        subMerchantType: "PERSONAL",
        name: "Rose Shop",
        contactName: "Ayşe Nur",
        contactSurname: "Kaya",
        email: "ayse@rose.test",
        gsmNumber: "+905321234567",
        address: "Moda Cd. 12, Kadıköy, Istanbul",
        iban: "TR330006100519786457841326",
        identityNumber: "10000000146",
      },
    });
    const company = parseSubMerchantForm({ ...person, type: "LIMITED_OR_JOINT_STOCK_COMPANY", identityNumber: "", taxOffice: "Kadıköy", legalCompanyTitle: "Rose Çiçekçilik Ltd. Şti.", taxNumber: "1234567890" });
    expect(company.ok && company.details).toMatchObject({ taxOffice: "Kadıköy", taxNumber: "1234567890", legalCompanyTitle: "Rose Çiçekçilik Ltd. Şti." });
    expect(company.ok && "identityNumber" in company.details).toBe(false);
  });

  it("asks for what's missing", () => {
    const parsed = parseSubMerchantForm({ ...person, type: "PRIVATE_COMPANY", contactName: "Ayşe", iban: "TR00 1234", identityNumber: "123" });
    expect(parsed.ok ? [] : Object.keys(parsed.errors).sort()).toEqual(["contactName", "iban", "identityNumber", "legalCompanyTitle", "taxOffice"]);
  });

  it("rounds the commission to the cent", () => {
    expect(commissionOf(90000, 10)).toBe(9000);
    expect(commissionOf(12345, 7.5)).toBe(926);
    expect(commissionOf(5000, 0)).toBe(0);
  });
});
