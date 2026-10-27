import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/store_billing.dart';
import '../../../core/purchase/store_billing_widgets.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';

/// 100 The course page's bar for a paid course sold through Google Play or
/// the App Store: the store's price in the person's currency (never the
/// site's), "Enroll now", and "Restore purchases". Once the purchase gives
/// access, [StoreBillingMessages] reloads the course and it opens as
/// enrolled.
class StoreCourseBar extends ConsumerWidget {
  const StoreCourseBar({
    super.key,
    required this.productId,
    required this.onSignIn,
  });

  final String productId;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final offers = ref.watch(storeOffersProvider);
    final buying = ref.watch(storeBillingProvider.select((s) => s.buying));
    final signedIn = ref.watch(
      authControllerProvider.select((s) => s.isSignedIn),
    );
    final offer = offers.value?[productId];
    if (offer == null && !offers.isLoading) {
      return _StoreUnavailableBar(onSignIn: signedIn ? null : onSignIn);
    }
    final price = offer?.price;
    return BottomActionBar(
      key: const ValueKey('cta-store'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (price != null) ...[
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.coursePrice,
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                    Text(
                      price,
                      key: const ValueKey('store-price'),
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
              ],
              Expanded(
                child: PrimaryButton(
                  key: const ValueKey('cta-store-buy'),
                  label: l10n.enrollNow,
                  icon: AppIcons.cart,
                  height: 54,
                  loading: offer == null || buying == productId,
                  onPressed: offer == null || buying != null
                      ? null
                      : signedIn
                      ? () => ref.read(storeBillingProvider.notifier).buy(offer)
                      : onSignIn,
                ),
              ),
            ],
          ),
          RestorePurchasesButton(onSignIn: signedIn ? null : onSignIn),
        ],
      ),
    );
  }
}

/// The store doesn't offer the course here (not approved yet, no store on
/// this phone): the usual line, and "Restore purchases".
class _StoreUnavailableBar extends StatelessWidget {
  const _StoreUnavailableBar({this.onSignIn});

  final VoidCallback? onSignIn;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return BottomActionBar(
      key: const ValueKey('cta-unavailable'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.divider,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: AppIcon(AppIcons.lock, size: 20, color: p.textSecondary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.l10n.errorPurchaseNotAllowed,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: p.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          RestorePurchasesButton(onSignIn: onSignIn),
        ],
      ),
    );
  }
}

/// 100 The course page's bar for a course that comes with a membership the
/// student doesn't have, whose plans are sold in the app: "Subscribe" shows
/// the plans' subscriptions with the store's prices and the terms.
class StoreMembershipBar extends ConsumerWidget {
  const StoreMembershipBar({
    super.key,
    required this.membership,
    required this.onSignIn,
  });

  final CourseMembership membership;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final offers = ref.watch(storeOffersProvider);
    final signedIn = ref.watch(
      authControllerProvider.select((s) => s.isSignedIn),
    );
    final available = [
      for (final id in membership.storeProductIds) ?offers.value?[id],
    ];
    final none = available.isEmpty && !offers.isLoading;
    return BottomActionBar(
      key: const ValueKey('cta-store-membership'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.divider,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: AppIcon(
                  AppIcons.membership,
                  size: 20,
                  color: p.textSecondary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.courseMembershipTitle,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      none
                          ? (membership.plans.isEmpty
                                ? l10n.errorPurchaseNotAllowed
                                : membership.plans.join(', '))
                          : l10n.storeMembershipSubscribe,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: p.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!none) ...[
            const SizedBox(height: 12),
            PrimaryButton(
              key: const ValueKey('store-subscribe'),
              label: l10n.storeSubscribe,
              height: 54,
              loading: available.isEmpty,
              onPressed: available.isEmpty
                  ? null
                  : signedIn
                  ? () => showStoreSubscriptions(context, available)
                  : onSignIn,
            ),
          ],
          RestorePurchasesButton(onSignIn: signedIn ? null : onSignIn),
        ],
      ),
    );
  }
}

/// Shows [offers] (a membership's subscriptions) to buy one.
Future<void> showStoreSubscriptions(
  BuildContext context,
  List<StoreOffer> offers,
) => showModalBottomSheet<void>(
  context: context,
  showDragHandle: true,
  isScrollControlled: true,
  builder: (context) => StoreSubscriptionSheet(offers: offers),
);

/// 100 A membership's subscriptions sold in the app, each with its price per
/// month or year from the store, and what Apple asks for beside the buy
/// buttons: that it renews until cancelled, where to manage or cancel it,
/// the terms and the privacy policy.
class StoreSubscriptionSheet extends ConsumerWidget {
  const StoreSubscriptionSheet({super.key, required this.offers});

  final List<StoreOffer> offers;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    final config = ref.watch(appConfigProvider);
    final terms = subscriptionTermsUrl(config, env.platform);
    final privacy = config.site.privacyUrl;
    final buying = ref.watch(storeBillingProvider.select((s) => s.buying));
    final linkStyle = TextButton.styleFrom(foregroundColor: p.link);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.courseMembershipTitle,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            for (final offer in offers) ...[
              const SizedBox(height: 12),
              _SubscriptionRow(
                offer: offer,
                busy: buying != null,
                onBuy: () {
                  Navigator.of(context).pop();
                  ref.read(storeBillingProvider.notifier).buy(offer);
                },
              ),
            ],
            const SizedBox(height: 14),
            Text(
              l10n.storeSubscriptionTerms(storeName(env.platform)),
              key: const ValueKey('store-terms'),
              style: TextStyle(
                fontSize: 12,
                height: 1.5,
                color: p.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 4,
              children: [
                if (terms != null)
                  TextButton(
                    key: const ValueKey('store-terms-link'),
                    style: linkStyle,
                    onPressed: () => openExternal(terms),
                    child: Text(l10n.termsAndConditions),
                  ),
                if (privacy != null)
                  TextButton(
                    key: const ValueKey('store-privacy-link'),
                    style: linkStyle,
                    onPressed: () => openExternal(privacy),
                    child: Text(l10n.privacyPolicy),
                  ),
                TextButton(
                  key: const ValueKey('store-manage'),
                  style: linkStyle,
                  onPressed: () => openExternal(
                    manageSubscriptionsUrl(
                      env,
                      productId: offers.length == 1
                          ? offers.single.productId
                          : null,
                    ),
                  ),
                  child: Text(l10n.storeManageSubscription),
                ),
              ],
            ),
            const RestorePurchasesButton(),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionRow extends StatelessWidget {
  const _SubscriptionRow({
    required this.offer,
    required this.busy,
    required this.onBuy,
  });

  final StoreOffer offer;
  final bool busy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final price = offer.price;
    final perPeriod = price == null
        ? null
        : switch (offer.product.period) {
            StorePeriod.month => l10n.storePricePerMonth(price),
            StorePeriod.year => l10n.storePricePerYear(price),
            null => price,
          };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  offer.product.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                if (perPeriod != null)
                  Text(
                    perPeriod,
                    key: ValueKey('store-price-${offer.productId}'),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 140,
            child: PrimaryButton(
              key: ValueKey('store-subscribe-${offer.productId}'),
              label: l10n.storeSubscribe,
              height: 46,
              onPressed: busy ? null : onBuy,
            ),
          ),
        ],
      ),
    );
  }
}
