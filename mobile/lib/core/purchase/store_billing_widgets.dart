import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../modules/lms/data/lms_providers.dart';
import '../api/models/models.dart';
import '../app_environment.dart';
import '../l10n/l10n.dart';
import '../widgets/common.dart';
import 'store_billing.dart';

/// 100 Tells the person what a store purchase came to, wherever they are in
/// the app, and reloads their courses once a purchase gave access. Sits
/// under the app's ScaffoldMessenger.
class StoreBillingMessages extends ConsumerWidget {
  const StoreBillingMessages({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<StoreOutcome?>(
      storeBillingProvider.select((state) => state.outcome),
      (previous, outcome) {
        if (outcome == null || outcome.serial == previous?.serial) return;
        if (outcome.kind == StoreOutcomeKind.granted ||
            outcome.kind == StoreOutcomeKind.restored) {
          // The course page opens as enrolled; a membership opens its courses.
          ref
            ..invalidate(courseDetailProvider)
            ..invalidate(curriculumProvider)
            ..invalidate(myCoursesProvider)
            ..invalidate(completedCourseIdsProvider)
            ..invalidate(homeSectionsProvider)
            ..invalidate(subscriptionsProvider);
        }
        final message = storeOutcomeMessage(context.l10n, outcome);
        if (message != null) showMessage(context, message);
      },
    );
    return child;
  }
}

/// What the person reads about [outcome]; null for nothing to say.
String? storeOutcomeMessage(AppLocalizations l10n, StoreOutcome outcome) =>
    switch (outcome.kind) {
      StoreOutcomeKind.granted =>
        outcome.grant?.kind == StoreProductKind.membership
            ? l10n.storeMembershipActive
            : l10n.enrolledMessage,
      StoreOutcomeKind.pending => l10n.storePending,
      StoreOutcomeKind.retryLater => l10n.storeRetryLater,
      StoreOutcomeKind.invalid => l10n.storeInvalidReceipt,
      StoreOutcomeKind.inUse => l10n.storePurchaseInUse,
      StoreOutcomeKind.ended => l10n.storePurchaseEnded,
      StoreOutcomeKind.failed =>
        (outcome.message?.isNotEmpty ?? false)
            ? outcome.message!
            : l10n.storePurchaseFailed,
      StoreOutcomeKind.unavailable => l10n.storeUnavailable,
      StoreOutcomeKind.preview => l10n.previewCheckoutNote,
      StoreOutcomeKind.restored => l10n.storeRestored,
      StoreOutcomeKind.nothingRestored => l10n.storeRestoredNone,
    };

/// The store's name in the subscription terms.
String storeName(DevicePlatform platform) =>
    platform == DevicePlatform.ios ? 'App Store' : 'Google Play';

/// The store's page of the person's subscriptions, where they change or
/// cancel one: Google Play's for this app (and [productId] when known), or
/// the App Store's.
String manageSubscriptionsUrl(AppEnvironment env, {String? productId}) {
  if (env.isIos) return 'https://apps.apple.com/account/subscriptions';
  return Uri.https('play.google.com', '/store/account/subscriptions', {
    'sku': ?productId,
    'package': env.build.androidPackage,
  }).toString();
}

/// Apple's standard licence agreement, the terms of an App Store purchase
/// when the app names none.
const appleStandardEula =
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/// The terms shown with a subscription: `store_billing.terms_url`, else the
/// site's terms, else (iOS) Apple's standard licence agreement.
String? subscriptionTermsUrl(AppConfig config, DevicePlatform platform) =>
    config.storeBilling?.termsUrl ??
    config.site.termsUrl ??
    (platform == DevicePlatform.ios ? appleStandardEula : null);

/// "Restore purchases" (Apple asks for it wherever the app sells).
class RestorePurchasesButton extends ConsumerWidget {
  const RestorePurchasesButton({super.key, this.onSignIn});

  /// Called instead when the person isn't signed in.
  final VoidCallback? onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restoring = ref.watch(
      storeBillingProvider.select((state) => state.restoring),
    );
    return TextButton(
      key: const ValueKey('store-restore'),
      onPressed: restoring
          ? null
          : onSignIn ?? () => ref.read(storeBillingProvider.notifier).restore(),
      child: Text(context.l10n.storeRestorePurchases),
    );
  }
}
