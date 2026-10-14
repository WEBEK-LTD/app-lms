import "server-only";
import { cache } from "react";
import { getStore } from "./data";
import type { ContactSetting } from "./data/types";
import { platformSetting } from "./settings/platform";

/** Yallapp's WhatsApp number and email, until the team changes them in the admin. */
export const DEFAULT_CONTACT: ContactSetting = { whatsapp: "+90 544 673 19 42", email: "info@yallapp.com.tr" };

export interface Contact {
  whatsappUrl: string;
  whatsappDisplay: string;
  email: string;
}

export function contactFrom(setting: ContactSetting): Contact {
  return { whatsappUrl: `https://wa.me/${setting.whatsapp.replace(/\D/g, "")}`, whatsappDisplay: setting.whatsapp, email: setting.email };
}

/** The contact details for this request. The defaults when the database can't be read (as during a build). */
export const getContact = cache(async (): Promise<Contact> => {
  try {
    return contactFrom((await platformSetting(await getStore(), "contact"))?.value ?? DEFAULT_CONTACT);
  } catch {
    return contactFrom(DEFAULT_CONTACT);
  }
});
