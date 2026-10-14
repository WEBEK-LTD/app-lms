import type { SubMerchantType } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import type { SubMerchantInput } from "../payments/iyzico";

/**
 * Shops selling through Yallapp's iyzico account (iyzico marketplace): the
 * details iyzico needs to register a shop as a sub-merchant and pay it.
 */

export const SUB_MERCHANT_TYPES: { id: SubMerchantType; label: string }[] = [
  { id: "PERSONAL", label: "Individual" },
  { id: "PRIVATE_COMPANY", label: "Sole proprietorship (şahıs şirketi)" },
  { id: "LIMITED_OR_JOINT_STOCK_COMPANY", label: "Limited or joint-stock company" },
];

/** IBAN check digits (ISO 13616, mod 97). */
export function validIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** Turkish ID number (T.C. Kimlik No) check digits. */
export function validTurkishId(id: string): boolean {
  if (!/^[1-9]\d{10}$/.test(id)) return false;
  const d = [...id].map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

export type SubMerchantDetails = Omit<SubMerchantInput, "conversationId" | "subMerchantExternalId" | "currency">;

export function parseSubMerchantForm(
  values: Record<string, string>,
): { ok: true; details: SubMerchantDetails } | { ok: false; errors: Record<string, string> } {
  const v = (name: string) => (values[name] ?? "").trim();
  const errors: Record<string, string> = {};
  const type = v("type") as SubMerchantType;
  if (!SUB_MERCHANT_TYPES.some((t) => t.id === type)) errors.type = "Choose who gets paid.";
  const name = v("payeeName");
  if (name.length < 2 || name.length > 100) errors.payeeName = "Enter your shop's name.";
  const contact = v("contactName").split(/\s+/).filter(Boolean);
  if (contact.length < 2) errors.contactName = "Enter your first and last name.";
  const email = v("email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  const phone = parseAnyPhone(v("phone"), "+90");
  if (!phone) errors.phone = "Enter a valid mobile number.";
  const address = v("address");
  if (address.length < 8 || address.length > 300) errors.address = "Enter your full address.";
  const iban = v("iban").replace(/\s+/g, "").toUpperCase();
  if (!iban.startsWith("TR") || iban.length !== 26 || !validIban(iban)) errors.iban = "Enter a Turkish IBAN, like TR33 0006 1005 1978 6457 8413 26.";
  const identityNumber = v("identityNumber");
  const needsId = type === "PERSONAL" || type === "PRIVATE_COMPANY";
  if (needsId && !validTurkishId(identityNumber)) errors.identityNumber = "Enter your 11-digit T.C. ID number.";
  const company = type === "PRIVATE_COMPANY" || type === "LIMITED_OR_JOINT_STOCK_COMPANY";
  const taxOffice = v("taxOffice");
  const legalCompanyTitle = v("legalCompanyTitle");
  const taxNumber = v("taxNumber");
  if (company && taxOffice.length < 2) errors.taxOffice = "Enter your tax office.";
  if (company && legalCompanyTitle.length < 2) errors.legalCompanyTitle = "Enter the company's legal name.";
  if (type === "LIMITED_OR_JOINT_STOCK_COMPANY" && !/^\d{10}$/.test(taxNumber)) errors.taxNumber = "Enter the 10-digit tax number.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    details: {
      subMerchantType: type,
      name,
      contactName: contact.slice(0, -1).join(" "),
      contactSurname: contact[contact.length - 1]!,
      email,
      gsmNumber: phone!.e164,
      address,
      iban,
      ...(needsId ? { identityNumber } : {}),
      ...(company ? { taxOffice, legalCompanyTitle } : {}),
      ...(type === "LIMITED_OR_JOINT_STOCK_COMPANY" ? { taxNumber } : {}),
    },
  };
}
