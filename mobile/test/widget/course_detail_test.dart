import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

Future<TestApp> openCourse(
  WidgetTester tester, {
  required DevicePlatform platform,
  required String action,
  bool free = false,
  bool signedIn = true,
}) async {
  final app = TestApp(
    platform: platform,
    signedIn: signedIn,
    guest: true,
    api: FakeApi(
      course: courseDetailJson(action: action, free: free),
    ),
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).push('/course/1');
  await TestApp.settle(tester);
  return app;
}

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

  testWidgets('Android shows "Enroll now" and opens the checkout link', (
    tester,
  ) async {
    final app = await openCourse(
      tester,
      platform: DevicePlatform.android,
      action: 'checkout',
    );

    expect(find.text('UI Design Fundamentals'), findsOneWidget);
    expect(find.text('Module 1: Introduction'), findsOneWidget);
    expect(find.text('Free preview'), findsOneWidget);
    expect(find.text('₺450'), findsOneWidget);
    expect(find.byKey(const ValueKey('cta-checkout')), findsOneWidget);
    expect(
      find.text("This course isn't available on your account yet."),
      findsNothing,
    );

    await tester.tap(find.text('Enroll now'));
    await TestApp.settle(tester);

    expect(app.api.count('createCheckoutLink'), 1);
    expect(find.text('Checkout'), findsOneWidget);
    expect(
      app.webViews.requests.last.url.toString(),
      'https://your-academy.com/checkout?token=once',
    );
  });

  testWidgets('iOS never shows a purchase button, even if the server asks', (
    tester,
  ) async {
    final app = await openCourse(
      tester,
      platform: DevicePlatform.ios,
      action: 'checkout',
    );

    expect(find.text('Enroll now'), findsNothing);
    expect(find.byKey(const ValueKey('cta-checkout')), findsNothing);
    expect(
      find.text("This course isn't available on your account yet."),
      findsOneWidget,
    );
    expect(app.api.count('createCheckoutLink'), 0);
  });

  testWidgets('iOS shows the neutral line for action "none"', (tester) async {
    await openCourse(tester, platform: DevicePlatform.ios, action: 'none');
    expect(
      find.text("This course isn't available on your account yet."),
      findsOneWidget,
    );
  });

  testWidgets('free enrollment works on iOS', (tester) async {
    final app = await openCourse(
      tester,
      platform: DevicePlatform.ios,
      action: 'enroll_free',
      free: true,
    );

    expect(find.text('Enroll for free'), findsOneWidget);
    await tester.tap(find.text('Enroll for free'));
    await TestApp.settle(tester);
    expect(app.api.count('enrollFree'), 1);
    expect(app.api.count('createCheckoutLink'), 0);
    expect(
      app.api.count('getCourse'),
      greaterThanOrEqualTo(2),
      reason: 'reloaded',
    );
  });

  testWidgets('enrolled students see "Continue learning"', (tester) async {
    await openCourse(
      tester,
      platform: DevicePlatform.android,
      action: 'continue',
    );
    expect(find.byKey(const ValueKey('cta-continue')), findsOneWidget);
    expect(find.text('Enroll now'), findsNothing);
  });
}
