/**
 * 130.1–130.6 The words of Sofra Eats's, Zad's and Sahm Express's
 * Signature looks (sofra-signature.ts, zad-signature.ts,
 * sahm-signature.ts): Studio's own (`w_<word>` in
 * i18n/dashboard/studio.ts, English, Arabic and Turkish), so a template
 * made in one language keeps the others as translations. The dishes,
 * places and prices are the demos' own (lib/demo/content.ts,
 * lib/demo/marketplace.ts).
 */
export type FoodSignatureWord =
  // The looks' names, as the boards' directions.
  | "sigSofraA"
  // A · Editorial menu: tonight's three dishes, the order, the sections and the price list.
  | "sofTonight1"
  | "sofDish1"
  | "sofDish1Line"
  | "sofTonight2"
  | "sofDish2"
  | "sofDish2Line"
  | "sofTonight3"
  | "sofDish3"
  | "sofDish3Line"
  | "sofOnItsWay"
  | "sofOpenNear"
  | "sofFromMenus"
  | "sofDeliveryFee"
  | "sofMargherita"
  | "sofForno"
  | "sofShish"
  | "sofSahara"
  | "sofPrice140"
  | "sofPrice150"
  // B · Bento table: the evening's question, the cuisines' bento and the band of dishes.
  | "sigSofraB"
  | "sofDinner"
  | "sofGrill"
  | "sofGrillChip"
  | "sofPizza"
  | "sofDesserts"
  | "sofEgyptian"
  | "sofEgyptianLine"
  | "sofTicker"
  | "sofNearYou"
  // Zad · A Market arches: the offers, the departments.
  | "sigZadA"
  | "zadOfferKicker"
  | "zadOffer1Big"
  | "zadOffer1Line"
  | "zadOffer1Code"
  | "zadOffer1Min"
  | "zadOffer2Kicker"
  | "zadOffer2Big"
  | "zadOffer2Line"
  | "zadOffer2Code"
  | "zadOffer2Min"
  | "zadOffer3Kicker"
  | "zadOffer3Big"
  | "zadOffer3Line"
  | "zadDepartments"
  | "zadFruitVeg"
  | "zadDairy"
  | "zadBakery"
  | "zadPantry"
  | "zadPantryLine"
  // Zad · B Night aisle: the week's shop and the departments as stories.
  | "sigZadB"
  | "zadVegetables"
  | "zadAllDepartments"
  | "zadBKicker"
  | "zadBHeadline"
  | "zadBMinutes"
  | "zadBMin"
  | "zadBTo";
