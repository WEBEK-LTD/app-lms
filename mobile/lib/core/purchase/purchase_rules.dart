import '../api/models/models.dart';

/// What the course page's main area shows.
enum CourseCta {
  /// "Continue learning" (enrolled).
  continueLearning,

  /// "Enroll for free".
  enrollFree,

  /// "Enroll now": the site's checkout. Android only.
  checkout,

  /// The neutral "This course isn't available on your account yet." line.
  unavailable,
}

/// Decides the course page's main action from the server's
/// `purchase.action`, the site's purchase rules and the platform.
///
/// The server already applies the platform rules; the app checks again so
/// iOS can never show a purchase button for a paid course, whatever the
/// server sends (Apple's digital goods rule).
CourseCta resolveCourseCta({
  required PurchaseAction serverAction,
  required DevicePlatform platform,
  required PurchaseRules rules,
  required bool enrolled,
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
    case PurchaseAction.none:
    case PurchaseAction.continueLearning:
      return CourseCta.unavailable;
  }
}

/// Only Android may ever request `/auth/checkout-link` or open a checkout.
bool canOpenCheckout(DevicePlatform platform) =>
    platform == DevicePlatform.android;

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
