import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PANEL_WORDS, type PanelWords } from "@/lib/market/panel-words";

/**
 * 115.70 The vendor app's words come from the partner panel's
 * (lib/market/panel-words.ts): each of these ARB keys says exactly what its
 * panel word says, in English, Arabic and Turkish. A plural's other form is
 * the panel's word; its other forms are Arabic's dual and few.
 */
const VENDOR_APP_WORDS: Record<string, keyof PanelWords> = {
  vendorSignedInAs: "signedInAs",
  vendorRoleOwner: "role_owner",
  vendorRoleManager: "role_manager",
  vendorRoleOrders: "role_orders",
  vendorRolePicker: "role_picker",
  vendorNewCount: "newCount",
  vendorSoundOn: "soundOn",
  vendorSoundOff: "soundOff",
  vendorBusyAsk: "busyAsk",
  vendorBusyPlus: "busyPlus",
  vendorOrdersToday: "todayOrders",
  vendorSalesToday: "todaySales",
  vendorNewNow: "newNow",
  vendorTabNew: "newOrders",
  vendorTabPreparing: "preparing",
  vendorTabReady: "readyCol",
  vendorTabLater: "scheduled",
  vendorTabDone: "doneCol",
  vendorRinging: "ringing",
  vendorNewTag: "newTag",
  vendorAgo: "ago",
  vendorJustNow: "justNow",
  vendorByAppCourier: "appCourier",
  vendorByOwnDriver: "ownDriver",
  vendorPickupTag: "pickup",
  vendorPayCash: "payCash",
  vendorPayCard: "payCard",
  vendorPayWallet: "payWallet",
  vendorByWeight: "byWeight",
  vendorItemCount: "items",
  vendorWeighTag: "weighTag",
  vendorMoreItems: "moreItems",
  vendorReadyIn: "readyIn",
  vendorMin: "minShort",
  vendorAcceptReady: "acceptReady",
  vendorTurnDown: "reject",
  vendorRejectWhy: "rejectWhy",
  vendorWhyClosing: "why_closing",
  vendorWhyTooBusy: "why_too_busy",
  vendorWhyItems: "why_items_unavailable",
  vendorWhyTooFar: "why_outside_area",
  vendorWhyOther: "why_other",
  vendorOrderTitle: "orderTitle",
  vendorCourierComes: "courierComes",
  vendorReadyBy: "due",
  vendorPickingFor: "pickingFor",
  vendorAisle: "aisleOf",
  vendorOtherItems: "otherItems",
  vendorAsked: "asked",
  vendorIfOutSimilar: "ifOutSimilar",
  vendorIfOutChosen: "ifOutChosen",
  vendorIfOutRemove: "ifOutRemove",
  vendorActualWeight: "actualWeight",
  vendorPriceLabel: "priceLabel",
  vendorCapCard: "capCard",
  vendorCapWallet: "capWallet",
  vendorCapCash: "capCash",
  vendorOverCap: "overCap",
  vendorFromScale: "fromScale",
  vendorScaleLater: "scaleLater",
  vendorOut: "outBtn",
  vendorSwap: "swap",
  vendorPickedButton: "picked",
  vendorLineOut: "outOfStock",
  vendorAskedCustomer: "askedCustomer",
  vendorWeighed: "weighedOf",
  vendorPickedLine: "pickedLine",
  vendorTheirPick: "theirPick",
  vendorInsteadOf: "insteadOf",
  vendorLeftOut: "leftOut",
  vendorReadyForCourier: "readyForCourier",
  vendorReadyForPickup: "readyForPickup",
  vendorReadyForDriver: "readyForDriver",
  vendorLinesLeft: "linesLeft",
  vendorWaitingCustomer: "waitingCustomer",
  vendorSwapTitle: "swapTitle",
  vendorSwapRule: "swapRule",
  vendorSwapAsk: "swapAsk",
  vendorSwapNote: "swapNote",
  vendorSwapNone: "swapNone",
  vendorSwapAsked: "swapAsked",
  vendorBringTheirPick: "bringTheirPick",
  vendorStockSummary: "stockSummary",
  vendorStockHint: "stockHint",
  vendorFilterAll: "filterAll",
  vendorFilterOut: "outOfStock",
  vendorFilterWeight: "filterWeight",
  vendorFilterOffers: "tabOffers",
  vendorInStock: "inStock",
  vendorInStockLeft: "inStockLeft",
  vendorUnitKg: "unitKg",
  vendorUnitG: "unitG",
  vendorUnitL: "unitL",
  vendorUnitMl: "unitMl",
  vendorPerKg: "perKg",
  vendorNewPrice: "newPrice",
  vendorNewPricePer: "newPricePer",
  vendorShownAsWas: "shownAsWas",
  vendorShowOffer: "showOffer",
  vendorSave: "save",
  vendorCancel: "cancel",
  vendorPriceApplies: "priceApplies",
  vendorPriceUndo: "priceUndo",
  vendorPriceSaved: "priceSaved",
  vendorPriceInvalid: "priceInvalid",
  vendorWasAbove: "wasAbove",
  vendorScanned: "scanned",
  vendorOpen: "openIt",
  vendorScanNotFound: "scanNotFound",
  vendorScanTitle: "scanTitle",
  vendorScanTyped: "scanTyped",
  vendorScanFind: "scanFind",
  vendorAddProduct: "addProduct",
  vendorProductName: "name",
  vendorPrice: "price",
  vendorSoldByItem: "soldByItem",
  vendorSoldByKg: "soldByKg",
  vendorSku: "sku",
  vendorBarcode: "barcode",
  vendorAdd: "add",
  vendorProductAdded: "productAdded",
};

const ARB_DIR = join(__dirname, "../../../../mobile/lib/l10n");
const arb = (lang: string) => JSON.parse(readFileSync(join(ARB_DIR, `app_${lang}.arb`), "utf8")) as Record<string, unknown>;

/** The ICU plural's other form, else the text as it is. */
function otherForm(text: string): string {
  const m = /^\{(\w+), plural, (.*)\}$/s.exec(text);
  if (!m) return text;
  const body = m[2]!;
  const at = body.lastIndexOf("other{");
  let depth = 0;
  for (let i = at + 5; i < body.length; i++) {
    if (body[i] === "{") depth++;
    else if (body[i] === "}" && --depth === 0) return body.slice(at + 6, i);
  }
  return text;
}

describe("115.70 the vendor app's words", () => {
  for (const lang of ["en", "ar", "tr"] as const) {
    it(`are the partner panel's, in ${lang}`, () => {
      const app = arb(lang);
      const panel = PANEL_WORDS[lang];
      for (const [key, word] of Object.entries(VENDOR_APP_WORDS)) {
        expect(typeof app[key], `${key} in app_${lang}.arb`).toBe("string");
        expect(otherForm(app[key] as string), `${key} (${word})`).toBe(panel[word]);
      }
    });
  }

  it("have every placeholder of the panel's word", () => {
    const en = arb("en");
    for (const [key, word] of Object.entries(VENDOR_APP_WORDS)) {
      const names = [...PANEL_WORDS.en[word].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      const placeholders = Object.keys(((en[`@${key}`] as { placeholders?: Record<string, unknown> } | undefined)?.placeholders ?? {}));
      expect(placeholders.sort(), key).toEqual([...new Set(names)].sort());
    }
  });
});
