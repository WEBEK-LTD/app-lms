import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/purchase/purchase_rules.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113.1 Course bundles in the app: the bundle's page (its courses, the
/// price against the courses' total, buying it with a coupon), bundles on
/// the courses list and on an included course's page, and a coupon that
/// makes a course or a bundle free enrolling at once.

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

Map<String, dynamic> bundlesConfig() {
  final config = configJson(lms: 'yallapp');
  (config['features'] as Map<String, dynamic>)['bundles'] = true;
  return config;
}

void main() {
  test('113.1 a bundle is bought on the payment page on Android only', () {
    const rules = PurchaseRules(enrollButton: true, freeEnrollment: true);
    BundleCta cta(BundleAction action, DevicePlatform platform) =>
        resolveBundleCta(
          serverAction: action,
          platform: platform,
          rules: rules,
          storeBilling: true,
          storeProductId: action == BundleAction.store ? 'bundle_50' : null,
        );
    expect(
      cta(BundleAction.checkout, DevicePlatform.android),
      BundleCta.checkout,
    );
    // Never the payment page on iOS, whatever the server says.
    expect(
      cta(BundleAction.checkout, DevicePlatform.ios),
      BundleCta.unavailable,
    );
    expect(cta(BundleAction.store, DevicePlatform.ios), BundleCta.store);
    expect(cta(BundleAction.owned, DevicePlatform.ios), BundleCta.owned);
    expect(
      cta(BundleAction.none, DevicePlatform.android),
      BundleCta.unavailable,
    );
  });

  test('113.1 reads a bundle and a free coupon from the contract', () {
    final bundle = BundleDetail.fromJson(
      bundleDetailJson(ownedCount: 1, coupons: true),
    );
    expect(bundle.courseCount, 3);
    expect(bundle.price.label, '₺900');
    expect(bundle.compareAt!.label, '₺1,350');
    expect(bundle.ownedCount, 1);
    expect(bundle.owned, isFalse);
    expect(bundle.courses.map((c) => c.id), [1, 2, 3]);
    expect(bundle.action, BundleAction.checkout);
    expect(bundle.takesCoupons, isTrue);
    final link = CheckoutLink.fromJson({
      'url': 'https://yallapp.test/pay/x',
      'expires_at': '2026-11-02T10:05:00Z',
      'open_in': 'in_app',
      'enrolled': true,
      'course_ids': [1, 2, 3],
    });
    expect(link.enrolled, isTrue);
    expect(link.courseIds, [1, 2, 3]);
    expect(
      CourseDetail.fromJson({
        ...courseDetailJson(),
        'bundles': [bundleJson()],
      }).bundles.single.title,
      'Design, start to finish',
    );
  });

  testWidgets('113.1 a bundle\'s page: its courses, its price against their '
      'total, and a coupon that makes it free enrols at once', (tester) async {
    usePhone(tester);
    final api = FakeApi(config: bundlesConfig())
      ..bundle = bundleDetailJson(coupons: true, ownedCount: 1)
      ..freeCoupons = {'FREE'};
    final app = TestApp(signedIn: true, guest: true, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.bundle(50));
    expect(find.text('Design, start to finish'), findsOneWidget);
    expect(find.text('3 courses'), findsOneWidget);
    expect(find.text('₺1,350'), findsOneWidget);
    expect(find.text('Courses in this bundle'), findsOneWidget);
    expect(find.text('Colour and type'), findsOneWidget);
    // One of them is the student's already: it stays theirs.
    expect(
      find.text(
        'You have 1 of these courses already: they stay yours, and the '
        'bundle adds the others.',
      ),
      findsOneWidget,
    );
    await tapKey(tester, 'bundle-buy');
    expect(find.text('Have a coupon?'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('coupon-code')), 'free');
    await tapKey(tester, 'coupon-apply');
    expect(api.count('checkBundleCoupon'), 1);
    expect(
      find.text('The coupon makes it free: you pay nothing.'),
      findsOneWidget,
    );
    expect(find.text('Enroll for free'), findsOneWidget);
    await tapKey(tester, 'coupon-continue');
    expect(api.bundleCheckouts, [(50, 'FREE')]);
    expect(
      find.text("You're in every course of the bundle. Happy learning!"),
      findsOneWidget,
    );
    // Nothing to pay: no payment page opened.
    expect(find.text('Checkout'), findsNothing);
  });

  testWidgets('113.1 a bundle the student has opens My courses', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: bundlesConfig())
      ..bundle = bundleDetailJson(action: 'owned', ownedCount: 3);
    final app = TestApp(signedIn: true, guest: true, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.bundle(50));
    expect(find.text('Every course in this bundle is yours.'), findsOneWidget);
    expect(find.byKey(const ValueKey('bundle-my-courses')), findsOneWidget);
  });

  testWidgets('113.1 iOS sells a bundle in the store only', (tester) async {
    usePhone(tester);
    final ios = FakeApi(config: bundlesConfig())..bundle = bundleDetailJson();
    final iosApp = TestApp(
      platform: DevicePlatform.ios,
      signedIn: true,
      guest: true,
      api: ios,
    );
    await iosApp.pump(tester);
    await push(iosApp, tester, Paths.bundle(50));
    expect(find.byKey(const ValueKey('bundle-buy')), findsNothing);
    expect(find.byKey(const ValueKey('bundle-unavailable')), findsOneWidget);
  });

  testWidgets('113.1 bundles on the courses list and on an included '
      'course\'s page', (tester) async {
    usePhone(tester);
    final api = FakeApi(
      config: bundlesConfig(),
      course: {
        ...courseDetailJson(),
        'bundles': [bundleJson()],
      },
    )..bundles = [bundleJson()];
    final app = TestApp(signedIn: true, guest: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.courses);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('bundles-row')), findsOneWidget);
    expect(find.text('Bundles'), findsOneWidget);
    expect(find.byKey(const ValueKey('bundle-50')), findsOneWidget);

    await push(app, tester, Paths.course(1));
    expect(find.text('Also in a bundle'), findsOneWidget);
    await tapKey(tester, 'bundle-50');
    expect(api.count('getBundle'), 1);
    expect(find.text('Courses in this bundle'), findsOneWidget);
  });

  testWidgets('113.1 no bundles row where the academy has none', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: configJson(lms: 'yallapp'));
    final app = TestApp(signedIn: true, guest: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.courses);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('bundles-row')), findsNothing);
    expect(api.count('listBundles'), 0);
  });

  testWidgets('113.1 a coupon that makes a course free enrols without the '
      'payment page', (tester) async {
    usePhone(tester);
    final api = FakeApi(
      course: {
        ...courseDetailJson(),
        'purchase': {'action': 'checkout', 'coupons': true},
      },
    )..freeCoupons = {'FREE'};
    final app = TestApp(signedIn: true, guest: true, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    await tapKey(tester, 'cta-checkout');
    await tester.enterText(find.byKey(const ValueKey('coupon-code')), 'free');
    await tapKey(tester, 'coupon-apply');
    expect(find.text('Enroll for free'), findsOneWidget);
    await tapKey(tester, 'coupon-continue');
    expect(api.checkoutCoupons, ['FREE']);
    expect(find.text("You're enrolled. Happy learning!"), findsOneWidget);
    expect(api.count('getCourse'), greaterThan(1));
  });
}
