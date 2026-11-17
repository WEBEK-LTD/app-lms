import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManualPaymentsForm } from "@/app/dashboard/catalog/forms";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { KitWayRow, KitWaySwitch } from "@/components/studio-page/way-row";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";

/**
 * 132.180 Payments in the console: a way to pay is a setting row whose
 * details stay in the page (a form still sends them) but show only while
 * it's on; its switch is the console's (a switch button named by the row)
 * and sends "on" only while on; bank transfer and the owner's own way are
 * each on or off on their own, the days to pay shown while either is on.
 */

/** The markup of `node` in the dashboard's language, as a page of the dashboard has it. */
function html(node: ReactNode, lang: "en" | "ar" = "en"): string {
  const props: ComponentProps<typeof DashboardI18n> = { lang, messages: dashboardMessages(lang), knownEnglish: lang === "en" ? {} : knownEnglish(), children: node };
  return renderToStaticMarkup(createElement(DashboardI18n, props));
}

/** The element with this id, as markup (its opening tag). */
const tagOf = (markup: string, id: string) => new RegExp(`<[a-z]+[^>]*\\bid="${id}"[^>]*>`).exec(markup)?.[0] ?? "";

describe("132.180 KitWayRow and KitWaySwitch", () => {
  it("keeps a closed way's details in the page, hidden; an open one's shown", () => {
    const row = (open: boolean) =>
      html(
        createElement(KitWayRow, { titleId: "h-bank", title: "Bank transfer", icon: "receipt_long", open, bodyId: "bank-body", inline: true, control: createElement("span", null, "switch") }, createElement("textarea", { name: "bankTransfer", defaultValue: "IBAN" })),
      );
    expect(row(false)).toMatch(/<section[^>]*aria-labelledby="h-bank"/);
    expect(row(false)).toContain('<h3 id="h-bank"');
    expect(tagOf(row(false), "bank-body")).toContain("hidden");
    expect(row(false)).toContain('name="bankTransfer"');
    expect(tagOf(row(true), "bank-body")).not.toContain("hidden");
  });

  it("is the console's switch, named by the row, and sends its field only while on", () => {
    const on = html(createElement(KitWaySwitch, { name: "customOn", checked: true, onChange: () => {}, labelledBy: "h-own" }));
    const off = html(createElement(KitWaySwitch, { name: "customOn", checked: false, onChange: () => {}, labelledBy: "h-own" }));
    expect(on).toMatch(/<button[^>]*role="switch"[^>]*aria-checked="true"[^>]*aria-labelledby="h-own"[^>]*class="kit-switch"/);
    expect(on).toContain('<input type="hidden" name="customOn" value="on"/>');
    expect(off).toMatch(/aria-checked="false"/);
    expect(off).not.toContain('name="customOn"');
  });
});

describe("132.180 bank transfer and the owner's own way, each on or off", () => {
  const values = { bankTransfer: "Nour Flowers LLC", customName: "Cash on delivery", customInstructions: "Pay the courier.", payWithinDays: "3" };

  it("shows a way's details only while it's on, and the days to pay while either is", () => {
    const bankOnly = html(createElement(ManualPaymentsForm, { values, on: { bank: true, custom: false }, status: "On: Bank transfer" }));
    expect(tagOf(bankOnly, "way-bank-transfer")).not.toContain("hidden");
    expect(tagOf(bankOnly, "way-own-method")).toContain("hidden");
    // Kept while off: saving keeps its details.
    expect(bankOnly).toContain('name="customName"');
    expect(bankOnly).toContain('name="bankTransferOn" value="on"');
    expect(bankOnly).not.toContain('name="customOn"');
    expect(bankOnly).toMatch(/<div class="kit-reveal border-t[^"]*"><section/);
    expect(bankOnly).toContain("On: Bank transfer");

    const none = html(createElement(ManualPaymentsForm, { values, on: { bank: false, custom: false } }));
    expect(none).toMatch(/<div hidden="" class="kit-reveal border-t/);
    expect(none).toContain('name="payWithinDays"');
  });

  it("names each switch by its way, in Arabic too", () => {
    const ar = html(createElement(ManualPaymentsForm, { values, on: { bank: true, custom: true } }), "ar");
    expect(ar).toMatch(/role="switch" aria-checked="true" aria-labelledby="h-bank-transfer"/);
    expect(ar).toMatch(/role="switch" aria-checked="true" aria-labelledby="h-own-method"/);
    expect(ar).toContain(`id="h-bank-transfer" class="m-0 text-[15px] leading-snug font-bold text-(--sp-ink)">${dashboardMessages("ar").orders.bankTransfer}</h3>`);
  });
});
