import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/purchase/store_billing.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';
import '../widgets/bundle_cards.dart';
import '../widgets/course_cards.dart';
import 'course_detail_screen.dart' show CouponSheet;
import 'store_purchase_bars.dart';

/// 113.1 A course bundle's page: its courses, the bundle's price against
/// what they cost on their own, and "Buy the bundle" (the academy's payment
/// page on Android, the store where the app sells in the app), with a coupon
/// when the academy takes them. Once bought, every course is the student's
/// (one they had stays theirs) and My courses lists them.
class BundleScreen extends ConsumerStatefulWidget {
  const BundleScreen({super.key, required this.bundleId});

  final int bundleId;

  @override
  ConsumerState<BundleScreen> createState() => _BundleScreenState();
}

class _BundleScreenState extends ConsumerState<BundleScreen>
    with WidgetsBindingObserver {
  bool _busy = false;
  bool _awaitingCheckout = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back from the browser checkout: the bundle's courses may be theirs now.
    if (state == AppLifecycleState.resumed && _awaitingCheckout) {
      _awaitingCheckout = false;
      invalidateBundle(ref);
    }
  }

  bool get _signedIn => ref.read(authControllerProvider).isSignedIn;

  void _signIn() => context.push(
    Uri(
      path: Paths.signIn,
      queryParameters: {'from': Paths.bundle(widget.bundleId)},
    ).toString(),
  );

  Future<void> _checkout(BundleDetail bundle) async {
    final env = ref.read(appEnvironmentProvider);
    // Never on iOS, whatever the server said.
    if (!canOpenCheckout(env.platform)) return;
    if (!_signedIn) return _signIn();
    String? coupon;
    if (bundle.takesCoupons) {
      final asked = await showModalBottomSheet<({String? code})>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => CouponSheet(bundleId: bundle.id),
      );
      if (asked == null || !mounted) return;
      coupon = asked.code;
    }
    setState(() => _busy = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createBundleCheckoutLink(bundle.id, coupon: coupon);
      if (!mounted) return;
      // A coupon made it free: every course is theirs already.
      if (link.enrolled) {
        invalidateBundle(ref);
        showMessage(context, context.l10n.bundleEnrolled);
        return;
      }
      final rules = ref.read(appConfigProvider).purchases;
      final inApp =
          link.openIn == CheckoutTarget.inApp &&
          rules.checkoutOpensIn != CheckoutOpensIn.browser;
      if (inApp) {
        await context.push(
          Paths.web,
          extra: WebPageArgs(url: link.url, title: context.l10n.checkout),
        );
        if (mounted) invalidateBundle(ref);
      } else {
        _awaitingCheckout = true;
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          _awaitingCheckout = false;
          showMessage(context, context.l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(bundleDetailProvider(widget.bundleId));
    return switch (detail) {
      AsyncData(:final value) => _build(context, value),
      AsyncError(:final error) => Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(
                  error: error,
                  onRetry: () =>
                      ref.invalidate(bundleDetailProvider(widget.bundleId)),
                ),
              ),
            ],
          ),
        ),
      ),
      _ => Scaffold(body: SkeletonDetail(label: context.l10n.loadingBundle)),
    };
  }

  Widget _build(BuildContext context, BundleDetail bundle) {
    final p = context.palette;
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    final config = ref.watch(appConfigProvider);
    final storeBilling = ref.watch(storeClientProvider) != null;
    final cta = resolveBundleCta(
      serverAction: bundle.action,
      platform: env.platform,
      rules: config.purchases,
      storeBilling: storeBilling,
      storeProductId: bundle.storeProductId,
    );
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(bundleDetailProvider(bundle.id));
                await ref.read(bundleDetailProvider(bundle.id).future);
              },
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  SizedBox(
                    height: 200 + MediaQuery.paddingOf(context).top,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        AppNetworkImage(url: bundle.imageUrl, seed: bundle.id),
                        const HeroScrim(),
                        PositionedDirectional(
                          top: MediaQuery.paddingOf(context).top + 16,
                          start: 20,
                          child: const AppBackButton(),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: readablePadding(context, top: 20, bottom: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Semantics(
                          header: true,
                          child: Text(
                            bundle.title,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            AppIcon(
                              AppIcons.bundle,
                              size: 18,
                              color: p.textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              l10n.bundleCourseCount(bundle.courseCount),
                              style: TextStyle(
                                fontSize: 14,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        BundlePriceRow(bundle: bundle, size: 20),
                        if (bundle.owned || bundle.ownedCount > 0) ...[
                          const SizedBox(height: 14),
                          _Note(
                            key: const ValueKey('bundle-owned-note'),
                            text: bundle.owned
                                ? l10n.bundleOwned
                                : l10n.bundleOwnedSome(bundle.ownedCount),
                          ),
                        ],
                        if (bundle.descriptionHtml.trim().isNotEmpty) ...[
                          const SizedBox(height: 16),
                          HtmlContent(html: bundle.descriptionHtml),
                        ],
                        const SizedBox(height: 20),
                        SectionHeader(title: l10n.bundleCoursesIn, size: 17),
                        const SizedBox(height: 10),
                        for (final course in bundle.courses) ...[
                          CourseListCard(
                            course: course,
                            onTap: () => openCourse(context, course.id),
                          ),
                          const SizedBox(height: 12),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          switch (cta) {
            BundleCta.owned => BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('bundle-my-courses'),
                label: l10n.bundleMyCourses,
                icon: AppIcons.myCourses,
                height: 54,
                onPressed: () => context.go(Paths.myCourses),
              ),
            ),
            BundleCta.checkout => BottomActionBar(
              child: Row(
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.bundlePrice,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                      PriceLabel(bundle.price, size: 20),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: PrimaryButton(
                      key: const ValueKey('bundle-buy'),
                      label: l10n.bundleBuy,
                      icon: AppIcons.cart,
                      height: 54,
                      loading: _busy,
                      onPressed: () => unawaited(_checkout(bundle)),
                    ),
                  ),
                ],
              ),
            ),
            // 100 Bought through Google Play or the App Store, like a course.
            BundleCta.store => StoreCourseBar(
              productId: bundle.storeProductId!,
              onSignIn: _signIn,
            ),
            BundleCta.unavailable => BottomActionBar(
              key: const ValueKey('bundle-unavailable'),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
              child: _Note(text: l10n.bundleNotSold, icon: AppIcons.lock),
            ),
          },
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({super.key, required this.text, this.icon = AppIcons.info});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: p.divider,
            borderRadius: BorderRadius.circular(context.shapes.r(12)),
          ),
          alignment: Alignment.center,
          child: AppIcon(icon, size: 18, color: p.textSecondary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 14, height: 1.5, color: p.text),
          ),
        ),
      ],
    );
  }
}
