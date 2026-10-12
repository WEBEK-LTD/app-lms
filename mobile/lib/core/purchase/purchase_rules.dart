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
