import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/lms/cart/course_cart.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The academy's course cart (`purchases.course_cart`, `looks` `cart:
/// premium`): "Join now" puts the course in the cart; the cart prices its
/// courses, takes a coupon of the site's, shows the saved card, and pays for
/// all of them in one checkout with that card chosen.
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

  FakeApi api({bool cart = true}) {
    final config = configJson(enrollButton: true);
    config['purchases'] = {
      ...(config['purchases'] as Map<String, dynamic>),
      'course_cart': cart,
    };
    config['screens'] = {
      'looks': {'cart': 'premium'},
    };
    return FakeApi(config: config)..cartTitles.addAll({1: 'UI design basics'});
  }

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    String ids = '[1,2]',
  }) async {
    final app = TestApp(
      api: api,
      signedIn: true,
      preferences: {'lms.course_cart': ids},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course-cart');
    await TestApp.settle(tester, 10);
    return app;
  }

  testWidgets('the courses, the saved card, a coupon and one checkout', (
    tester,
  ) async {
    final fake = api();
    await open(tester, fake);
    expect(find.text('Cart'), findsOneWidget);
    expect(find.text('2 courses'), findsOneWidget);
    expect(find.text('UI design basics'), findsOneWidget);
    expect(find.text('EGP 390.00'), findsOneWidget);
    expect(find.text('EGP 840.00'), findsOneWidget);
    expect(find.text('••••  ••••  ••••  4821'), findsOneWidget);
    expect(find.text('08/28'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('course-cart-coupon')),
      'NOOR20',
    );
    await tester.tap(find.byKey(const ValueKey('course-cart-coupon-apply')));
    await TestApp.settle(tester, 5);
    expect(find.text('− EGP 168.00'), findsOneWidget);
    expect(find.text('Pay EGP 672.00 securely'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('course-cart-pay')));
    await TestApp.settle(tester, 10);
    expect(fake.cartCheckouts.single.courses, [1, 2]);
    expect(fake.cartCheckouts.single.coupon, 'NOOR20');
    expect(fake.cartCheckouts.single.card, '7');
  });

  testWidgets('a course they have stays out of the total and the checkout', (
    tester,
  ) async {
    final fake = api()..cartOwned.add(2);
    await open(tester, fake);
    expect(find.text('You already have this course.'), findsOneWidget);
    expect(find.text('Pay EGP 390.00 securely'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('course-cart-pay')));
    await TestApp.settle(tester, 10);
    expect(fake.cartCheckouts.single.courses, [1]);
  });

  testWidgets('without a saved card, the card is entered on the checkout', (
    tester,
  ) async {
    final fake = api()..savedCards = [];
    await open(tester, fake);
    expect(
      find.text('Your card is entered on the secure checkout'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('course-cart-pay')));
    await TestApp.settle(tester, 10);
    expect(fake.cartCheckouts.single.card, isNull);
  });

  testWidgets('"Enroll now" puts the course in the cart and opens it', (
    tester,
  ) async {
    final fake = api()..course = courseDetailJson(action: 'checkout');
    final app = TestApp(
      api: fake,
      signedIn: true,
      platform: DevicePlatform.android,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('cta-checkout')));
    await TestApp.settle(tester, 10);
    expect(app.container.read(courseCartProvider), [1]);
    expect(find.byKey(const ValueKey('course-cart')), findsOneWidget);
    expect(fake.count('createCheckoutLink'), 0);
  });

  testWidgets('an empty cart says so', (tester) async {
    await open(tester, api(), ids: '[]');
    expect(find.text('Your cart is empty'), findsOneWidget);
    expect(find.byKey(const ValueKey('course-cart-pay')), findsNothing);
  });
}
