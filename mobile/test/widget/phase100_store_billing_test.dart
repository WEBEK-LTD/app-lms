import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/purchase/store_billing.dart';
import 'package:yallapp/core/purchase/store_billing_api.dart';
import 'package:yallapp/core/purchase/store_client.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fake_store.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 100 Courses and memberships bought through Google Play Billing and the
/// App Store: the store's price, a purchase sent to Yallapp and finished
/// only once it gave access, restore, the subscription terms.

class StoreApp {
  StoreApp(this.app, this.store, this.billing);

  final TestApp app;
  final FakeStoreClient store;
  final FakeStoreBillingApi billing;

  FakeApi get api => app.api;
}

Future<StoreApp> pumpStoreApp(
  WidgetTester tester, {
  DevicePlatform platform = DevicePlatform.android,
  bool storeBilling = true,
  Map<String, dynamic>? course,
  FakeStoreClient? store,
  FakeStoreBillingApi? billing,
  bool signedIn = true,
  String? open = '/course/1',
}) async {
  store ??= FakeStoreClient();
  billing ??= FakeStoreBillingApi();
  final app = TestApp(
    platform: platform,
    signedIn: signedIn,
    guest: true,
    api: FakeApi(
      config: {
        ...configJson(enrollButton: false),
        if (storeBilling) 'store_billing': storeBillingJson(),
      },
      course: course ?? storeCourseJson(courseDetailJson()),
    ),
    overrides: [
      storeClientProvider.overrideWithValue(storeBilling ? store : null),
      storeBillingApiProvider.overrideWithValue(storeBilling ? billing : null),
    ],
  );
  await app.pump(tester);
  if (open != null) {
    app.container.read(appRouterProvider).push(open);
    await TestApp.settle(tester);
  }
  return StoreApp(app, store, billing);
}

Map<String, dynamic> membershipCourseJson({List<String>? productIds}) => {
  ...courseDetailJson(action: 'none'),
  'membership': {
    'has_access': false,
    'plans': ['Gold'],
    'store_product_ids': productIds ?? ['plan_gold_month', 'plan_gold_year'],
  },
};

FakeStoreBillingApi membershipBilling() => FakeStoreBillingApi(
  products: [
    storeProductJson(),
    storeProductJson(
      id: 'plan_gold_month',
      type: 'subscription',
      kind: 'membership',
      courseId: null,
      planId: '2',
      period: 'month',
      title: 'Gold monthly',
    ),
    storeProductJson(
      id: 'plan_gold_year',
      type: 'subscription',
      kind: 'membership',
      courseId: null,
      planId: '2',
      period: 'year',
      title: 'Gold yearly',
    ),
  ],
);

FakeStoreClient membershipStore() => FakeStoreClient(
  prices: {
    'course_1': '₺449,99',
    'plan_gold_month': '₺99,99',
    'plan_gold_year': '₺999,99',
  },
);

const _enrolled = "You're enrolled. Happy learning!";

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('the course page shows the store price, never the site price', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    expect(find.byKey(const ValueKey('cta-store')), findsOneWidget);
    expect(find.text('₺449,99'), findsOneWidget);
    expect(find.text('₺450'), findsNothing);
    expect(find.byKey(const ValueKey('cta-checkout')), findsNothing);
    expect(find.text('Restore purchases'), findsOneWidget);
    expect(s.api.count('createCheckoutLink'), 0);
  });

  testWidgets('a purchase is sent and finished only after Yallapp gave the '
      'access, and the course opens as enrolled', (tester) async {
    final s = await pumpStoreApp(tester);
    await tester.tap(find.byKey(const ValueKey('cta-store-buy')));
    await TestApp.settle(tester);
    expect(s.store.bought, ['course_1']);
    expect(s.billing.sent, isEmpty);

    s.api.course = courseDetailJson(action: 'continue', enrolled: true);
    final purchase = s.store.transaction('course_1');
    expect(s.store.finished, isEmpty);
    s.store.deliver([purchase]);
    await TestApp.settle(tester);

    expect(s.billing.sent.single.productId, 'course_1');
    expect(s.billing.sent.single.token, 'token-course_1');
    expect(s.billing.sent.single.signed, isNull);
    expect(s.store.finished, ['token-course_1']);
    expect(find.text(_enrolled), findsOneWidget);
    expect(find.byKey(const ValueKey('cta-continue')), findsOneWidget);
  });

  testWidgets('store_unavailable keeps the purchase unfinished and sends it '
      'again later', (tester) async {
    final s = await pumpStoreApp(tester);
    s.billing.answers.add(storeError(503, StoreBillingErrors.storeUnavailable));
    s.store.deliver([s.store.transaction('course_1')]);
    await TestApp.settle(tester);
    expect(s.billing.sent, hasLength(1));
    expect(s.store.finished, isEmpty);
    expect(
      find.text(
        "Your purchase went through. We couldn't confirm it just now and "
        'will try again automatically.',
      ),
      findsOneWidget,
    );

    // A minute later it goes again, and is finished once confirmed.
    await tester.pump(const Duration(minutes: 1));
    await TestApp.settle(tester);
    expect(s.billing.sent, hasLength(2));
    expect(s.store.finished, ['token-course_1']);
  });

  testWidgets('no network: the store delivering it again sends it again', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    s.billing.answers.add(storeError(0, 'network_error'));
    final purchase = s.store.transaction('course_1');
    s.store.deliver([purchase]);
    await TestApp.settle(tester);
    expect(s.store.finished, isEmpty);

    s.store.deliver([purchase]);
    await TestApp.settle(tester);
    expect(s.billing.sent, hasLength(2));
    expect(s.store.finished, ['token-course_1']);
    // The retry timer is no longer needed.
    await tester.pump(const Duration(minutes: 1));
    await TestApp.settle(tester);
    expect(s.billing.sent, hasLength(2));
  });

  testWidgets('a purchase not finished in an earlier run is sent at start', (
    tester,
  ) async {
    final store = FakeStoreClient();
    store.transaction('course_1');
    final s = await pumpStoreApp(tester, store: store, open: null);
    expect(s.billing.sent.single.token, 'token-course_1');
    expect(s.store.finished, ['token-course_1']);
  });

  testWidgets('invalid_receipt finishes it and says it couldn\'t be used', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    s.billing.answers.add(storeError(400, StoreBillingErrors.invalidReceipt));
    s.store.deliver([s.store.transaction('course_1')]);
    await TestApp.settle(tester);
    expect(s.store.finished, ['token-course_1']);
    expect(
      find.text(
        "This purchase couldn't be used. If you were charged, contact us.",
      ),
      findsOneWidget,
    );
  });

  testWidgets('purchase_in_use says it belongs to another account', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    s.billing.answers.add(storeError(409, StoreBillingErrors.purchaseInUse));
    s.store.deliver([s.store.transaction('course_1')]);
    await TestApp.settle(tester);
    expect(
      find.text(
        'This purchase belongs to another account in this app. Sign in with '
        'that account to use it.',
      ),
      findsOneWidget,
    );
    expect(find.text(_enrolled), findsNothing);
  });

  testWidgets('a pending payment gives nothing yet and stays unfinished', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    s.billing.answers.add(grantJson(status: 'pending'));
    s.store.deliver([
      s.store.transaction('course_1', status: StoreTransactionStatus.pending),
    ]);
    await TestApp.settle(tester);
    expect(s.billing.sent, hasLength(1));
    expect(s.store.finished, isEmpty);
    expect(
      find.text(
        "Waiting for payment. You'll get access once the payment is complete.",
      ),
      findsOneWidget,
    );
    expect(find.text(_enrolled), findsNothing);
  });

  testWidgets('a cancelled purchase sends nothing', (tester) async {
    final s = await pumpStoreApp(tester);
    s.store.deliver([
      s.store.transaction(
        'course_1',
        status: StoreTransactionStatus.canceled,
        proof: '',
        needsFinish: false,
      ),
    ]);
    await TestApp.settle(tester);
    expect(s.billing.sent, isEmpty);
  });

  testWidgets('Restore purchases on the course page sends the store\'s '
      'purchases and reloads the course', (tester) async {
    final s = await pumpStoreApp(tester);
    s.store.ownedList = [
      s.store.transaction(
        'course_1',
        status: StoreTransactionStatus.restored,
        needsFinish: false,
      ),
    ];
    s.billing.restoreGrants = [grantJson()];
    final before = s.api.count('getCourse');
    await tester.tap(find.text('Restore purchases'));
    await TestApp.settle(tester);
    expect(s.billing.restores.single.tokens, ['token-course_1']);
    expect(s.billing.restores.single.signed, isEmpty);
    expect(find.text('Your purchases are restored.'), findsOneWidget);
    expect(s.api.count('getCourse'), greaterThan(before));
  });

  testWidgets('Restore purchases with nothing for this account says so', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester);
    await tester.tap(find.text('Restore purchases'));
    await TestApp.settle(tester);
    expect(s.store.ownedCalls, 1);
    expect(s.billing.restores, isEmpty);
    expect(
      find.text('There are no purchases to restore for this account.'),
      findsOneWidget,
    );
  });

  testWidgets('iOS without store_billing shows no purchase button', (
    tester,
  ) async {
    await pumpStoreApp(
      tester,
      platform: DevicePlatform.ios,
      storeBilling: false,
    );
    expect(find.byKey(const ValueKey('cta-store')), findsNothing);
    expect(find.text('Enroll now'), findsNothing);
    expect(find.text('Restore purchases'), findsNothing);
    expect(
      find.text("This course isn't available on your account yet."),
      findsOneWidget,
    );
  });

  testWidgets('iOS with store_billing buys through the App Store and sends '
      'the signed transaction', (tester) async {
    final s = await pumpStoreApp(tester, platform: DevicePlatform.ios);
    expect(find.text('₺449,99'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('cta-store-buy')));
    await TestApp.settle(tester);
    s.store.deliver([s.store.transaction('course_1', proof: 'eyJ.jws.sig')]);
    await TestApp.settle(tester);
    expect(s.billing.sent.single.signed, 'eyJ.jws.sig');
    expect(s.billing.sent.single.token, isNull);
    expect(s.store.finished, ['eyJ.jws.sig']);
  });

  testWidgets('a course the store doesn\'t offer shows no purchase button', (
    tester,
  ) async {
    await pumpStoreApp(tester, store: FakeStoreClient(prices: {}));
    expect(find.byKey(const ValueKey('cta-store-buy')), findsNothing);
    expect(
      find.text("This course isn't available on your account yet."),
      findsOneWidget,
    );
    expect(find.text('Restore purchases'), findsOneWidget);
  });

  testWidgets('a membership\'s subscriptions show the store prices per '
      'period with the terms Apple asks for', (tester) async {
    final s = await pumpStoreApp(
      tester,
      platform: DevicePlatform.ios,
      course: membershipCourseJson(),
      store: membershipStore(),
      billing: membershipBilling(),
    );
    expect(find.byKey(const ValueKey('cta-store-membership')), findsOneWidget);
    expect(find.text('See memberships on the website'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('store-subscribe')));
    await TestApp.settle(tester);

    expect(find.text('Gold monthly'), findsOneWidget);
    expect(find.text('₺99,99 / month'), findsOneWidget);
    expect(find.text('₺999,99 / year'), findsOneWidget);
    final terms = tester.widget<Text>(
      find.byKey(const ValueKey('store-terms')),
    );
    expect(terms.data, contains('renews automatically'));
    expect(terms.data, contains('until you cancel it'));
    expect(terms.data, contains('App Store'));
    expect(find.text('Terms & Conditions'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
    expect(find.text('Restore purchases'), findsWidgets);

    await tester.tap(
      find.byKey(const ValueKey('store-subscribe-plan_gold_year')),
    );
    await TestApp.settle(tester);
    expect(s.store.bought, ['plan_gold_year']);
    s.billing.answers.add(
      grantJson(
        productId: 'plan_gold_year',
        kind: 'membership',
        courseId: null,
        planId: '2',
      ),
    );
    s.store.deliver([s.store.transaction('plan_gold_year')]);
    await TestApp.settle(tester);
    expect(s.store.finished, ['token-plan_gold_year']);
    expect(find.text('Your membership is active.'), findsOneWidget);
  });

  testWidgets('Android: no website memberships '
      'where the app sells in the app', (tester) async {
    await pumpStoreApp(
      tester,
      course: {
        ...membershipCourseJson(productIds: []),
        'website_url': 'https://your-academy.com/courses/ui',
      },
      store: membershipStore(),
      billing: membershipBilling(),
    );
    expect(find.byKey(const ValueKey('cta-membership')), findsOneWidget);
    expect(find.text('See memberships on the website'), findsNothing);
  });

  testWidgets('Settings has Restore purchases and Manage subscription', (
    tester,
  ) async {
    final s = await pumpStoreApp(tester, open: Paths.settings);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('settings-restore-purchases')),
      200,
    );
    expect(find.text('Purchases'), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('settings-restore-purchases')));
    await TestApp.settle(tester);
    expect(s.store.ownedCalls, 1);
  });

  testWidgets('Settings without store_billing has no purchases group', (
    tester,
  ) async {
    await pumpStoreApp(tester, storeBilling: false, open: Paths.settings);
    expect(find.text('Restore purchases'), findsNothing);
    expect(
      find.byKey(const ValueKey('settings-restore-purchases')),
      findsNothing,
    );
  });
}
