import '../api/models/models.dart';

/// What the course page's main area shows.
enum CourseCta {
  /// "Continue learning" (enrolled).
  continueLearning,

  /// "Enroll for free".
  enrollFree,

  /// "Enroll now": the site's checkout. Android only.
  checkout,

  /// 100 "Enroll now" through Google Play Billing or the App Store, at the
  /// store's price. Both platforms, only when the app sells in the app.
  store,

  /// The neutral "This course isn't available on your account yet." line.
  unavailable,
}

/// Decides the course page's main action from the server's
/// `purchase.action`, the site's purchase rules and the platform.
///
/// The server already applies the platform rules; the app checks again so
/// iOS can never show a website checkout for a paid course, whatever the
/// server sends (Apple's digital goods rule). 100 A paid course is bought
/// through the store on both platforms (Apple's own In-App Purchase on iOS)
/// only when `Config.store_billing` is there ([storeBilling]); without it,
/// no purchase button for it at all on iOS.
CourseCta resolveCourseCta({
  required PurchaseAction serverAction,
  required DevicePlatform platform,
  required PurchaseRules rules,
  required bool enrolled,
  bool storeBilling = false,
  String? storeProductId,
}) {
  if (enrolled || serverAction == PurchaseAction.continueLearning) {
    return CourseCta.continueLearning;
  }
  switch (serverAction) {
    case PurchaseAction.enrollFree:
      return rules.freeEnrollment
          ? CourseCta.enrollFree
          : CourseCta.unavailable;
    case PurchaseAction.checkout:
      if (!canOpenCheckout(platform)) return CourseCta.unavailable;
      return rules.enrollButton ? CourseCta.checkout : CourseCta.unavailable;
    case PurchaseAction.store:
      return storeBilling && storeProductId != null
          ? CourseCta.store
          : CourseCta.unavailable;
    case PurchaseAction.none:
    case PurchaseAction.continueLearning:
      return CourseCta.unavailable;
  }
}

/// Only Android may ever request `/auth/checkout-link` or open a checkout.
bool canOpenCheckout(DevicePlatform platform) =>
    platform == DevicePlatform.android;

/// 28 What a ticket type's button does (Events & tickets apps), from the
/// server's `action`. A ticket to an event at a venue is a physical-world
/// service, bought on both platforms; a ticket to an online-only event is
/// digital content, so iOS never shows a buy button for a paid one, whatever
/// the server sends (Apple's rule). Free tickets work everywhere.
TicketAction resolveTicketAction({
  required TicketAction serverAction,
  required DevicePlatform platform,
  required EventSummary event,
  required TicketType type,
}) {
  if (serverAction == TicketAction.checkout &&
      platform == DevicePlatform.ios &&
      event.onlineOnly) {
    return TicketAction.none;
  }
  // A free ticket is never sold, and a paid one is never "registered".
  if (serverAction == TicketAction.register && !type.price.isFree) {
    return TicketAction.none;
  }
  return serverAction;
}

/// What the product page's main button does (Store apps).
enum ProductCta {
  /// "Add to cart".
  addToCart,

  /// A variable product before every option is chosen.
  chooseOptions,

  /// The chosen options don't make a product the shop sells.
  unavailableOption,

  outOfStock,

  /// Not sold in this app: digital goods on iOS (Apple's rule), and product
  /// types the app's cart doesn't handle (grouped, external).
  notInApp,
}

/// Decides the product page's main action. The server checks the same rules
/// when pricing the cart; the app checks first so iOS never offers digital
/// goods.
ProductCta resolveProductCta({
  required ProductSummary product,
  required DevicePlatform platform,
  bool choicesComplete = true,
  ProductVariation? variation,
}) {
  if (product.digital && platform == DevicePlatform.ios) {
    return ProductCta.notInApp;
  }
  switch (product.type) {
    case ProductType.simple:
      if (product.stockStatus == StockStatus.outOfStock) {
        return ProductCta.outOfStock;
      }
      return product.purchasable ? ProductCta.addToCart : ProductCta.notInApp;
    case ProductType.variable:
      if (product.stockStatus == StockStatus.outOfStock) {
        return ProductCta.outOfStock;
      }
      if (!choicesComplete) return ProductCta.chooseOptions;
      if (variation == null) return ProductCta.unavailableOption;
      if (variation.stockStatus == StockStatus.outOfStock) {
        return ProductCta.outOfStock;
      }
      return variation.purchasable
          ? ProductCta.addToCart
          : ProductCta.unavailableOption;
    case ProductType.grouped:
    case ProductType.external:
    case ProductType.other:
      return ProductCta.notInApp;
  }
}
