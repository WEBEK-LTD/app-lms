import { isLang } from "@/i18n";
import type { User } from "../data/types";
import { sendTemplate } from "../email/send";
import { appUrl } from "../env";

/**
 * 70 The email that says two-step sign-in was turned on or off (by the
 * person, or reset by our team), in their dashboard language, with where to
 * manage it: Admin › Your account for our team, else Dashboard › Your account.
 * A failure to send is logged and never stops the change.
 */
export async function mailTwoStepChange(user: Pick<User, "email" | "name" | "language">, on: boolean, options: { admin: boolean; now?: Date }): Promise<void> {
  const lang = isLang(user.language) ? user.language : "en";
  const date = `${(options.now ?? new Date()).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const accountUrl = `${appUrl()}${options.admin ? "/admin/account" : "/dashboard/account"}`;
  await sendTemplate(on ? "two_step_on" : "two_step_off", user.email, { name: user.name, date, account_url: accountUrl }, { lang }).catch((error: unknown) =>
    console.error("[mail] two-step sign-in email failed", error),
  );
}
