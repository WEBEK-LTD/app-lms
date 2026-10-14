import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/format/dates.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/bookings/screens/classes_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 27 A gym's app: the bookings engine with the fitness vertical and a timetable.
FakeApi gymApi({bool membershipRequired = true}) {
  final config = configJson(lms: null, bookings: true);
  config['vertical'] = 'fitness';
  (config['bookings'] as Map<String, dynamic>)['classes'] = classesConfigJson(
    membershipRequired: membershipRequired,
  );
  final today = isoDate(DateTime.now());
  return FakeApi(config: config)
    ..classes = [
      classJson(localDate: today, localTime: '07:30', name: 'Spin', id: 10),
      classJson(localDate: today),
      classJson(
        id: 12,
        localDate: today,
        localTime: '19:30',
        name: 'HIIT',
        spotsLeft: 0,
      ),
      classJson(
        id: 13,
        localDate: today,
        localTime: '20:30',
        name: 'Mat pilates',
        status: 'cancelled',
        spotsLeft: 0,
      ),
    ]
    ..memberships = [membershipJson()]
    ..plans = [
      planJson(),
      planJson(
        id: 31,
        name: '10-class pack',
        period: 'pack',
        credits: 10,
        amount: '1500.00',
        description: null,
      ),
    ];
}

/// The Book or Cancel button on a class's card.
Finder classButton(String name) => find.descendant(
  of: find.ancestor(of: find.text(name), matching: find.byType(ClassCard)),
  matching: find.byWidgetPredicate(
    (w) => w is FilledButton || w is OutlinedButton,
  ),
);

String location(TestApp app) => app.container
    .read(appRouterProvider)
    .routerDelegate
    .currentConfiguration
    .last
    .matchedLocation;

Future<TestApp> openGym(
  WidgetTester tester, {
  FakeApi? api,
  bool signedIn = true,
  DevicePlatform platform = DevicePlatform.android,
}) async {
  tester.view
    ..physicalSize = const Size(780, 2000)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final app = TestApp(
    signedIn: signedIn,
    guest: !signedIn,
    platform: platform,
    appType: AppType.booking,
    api: api ?? gymApi(),
  );
  await app.pump(tester);
  return app;
}

void main() {
  testWidgets('a gym gets Classes and Membership tabs and its own words', (
    tester,
  ) async {
    final app = await openGym(tester);
    for (final tab in ['Home', 'Classes', 'Membership', 'Appointments']) {
      expect(find.bySemanticsLabel(tab), findsWidgets, reason: tab);
    }
    await tester.tap(find.bySemanticsLabel('Classes').last);
    await TestApp.settle(tester);
    expect(location(app), '/classes');
    expect(find.text('Yoga flow'), findsOneWidget);
    expect(find.text('with Selin Aydın'), findsWidgets);
    expect(find.text('4 spots left'), findsWidgets);
    expect(find.text('Full'), findsOneWidget);
    expect(find.text('Cancelled'), findsOneWidget);
    // The member's membership in one line above the classes.
    expect(find.text('10-class pack · 4 classes left'), findsOneWidget);
    // The week's classes, in one request.
    expect(app.api.lastClassesQuery?.from, isoDate(DateTime.now()));
    expect(app.api.lastClassesQuery?.to, isoDate(addDays(DateTime.now(), 6)));
    expect(tester.takeException(), isNull);
  });

  testWidgets('books a spot, then gives it back after confirming', (
    tester,
  ) async {
    final app = await openGym(tester);
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);

    await tester.tap(classButton('Yoga flow'));
    await TestApp.settle(tester);
    expect(app.api.count('bookClass'), 1);
    expect(find.text("You're booked for Yoga flow."), findsOneWidget);
    expect(find.text("You're booked"), findsOneWidget);
    expect(find.text('3 spots left'), findsNothing);

    await tester.tap(classButton('Yoga flow'));
    await TestApp.settle(tester);
    expect(find.text('Give back your spot?'), findsOneWidget);
    await tester.tap(find.text('Give back my spot'));
    await TestApp.settle(tester);
    expect(app.api.count('cancelClass'), 1);
    expect(find.text('Your spot is free again.'), findsOneWidget);
    expect(find.text("You're booked"), findsNothing);
  });

  testWidgets('a full or cancelled class has no Book button', (tester) async {
    final app = await openGym(tester);
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);
    final hiit = tester.widget<FilledButton>(classButton('HIIT'));
    expect(hiit.onPressed, isNull);
    expect(classButton('Mat pilates'), findsNothing);
    // Screen readers hear which class each button books.
    expect(
      find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.label == 'Book Yoga flow',
      ),
      findsOneWidget,
    );
  });

  testWidgets('without a membership, the plans are one tap away', (
    tester,
  ) async {
    final api = gymApi()..memberships = [];
    api.failures['bookClass'] = const ApiException(
      code: ApiException.membershipRequired,
      message: 'You need a membership to book classes.',
      statusCode: 403,
    );
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);
    expect(find.text('No membership yet'), findsOneWidget);

    await tester.tap(classButton('Yoga flow'));
    await TestApp.settle(tester);
    expect(find.text('You need a membership to book classes.'), findsOneWidget);
    await tester.tap(find.text('See plans'));
    await TestApp.settle(tester);
    expect(location(app), '/memberships');
    expect(find.text('Monthly unlimited'), findsOneWidget);
  });

  testWidgets('guests sign in before booking a spot', (tester) async {
    final app = await openGym(tester, signedIn: false);
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);
    await tester.tap(classButton('Yoga flow'));
    await TestApp.settle(tester);
    expect(location(app), '/sign-in');
    expect(app.api.count('bookClass'), 0);
  });

  testWidgets('My membership and the plans, bought on the payment page', (
    tester,
  ) async {
    final app = await openGym(tester);
    await tester.tap(find.bySemanticsLabel('Membership').last);
    await TestApp.settle(tester);
    expect(find.text('My membership'), findsOneWidget);
    expect(find.text('10-class pack'), findsWidgets);
    expect(find.text('4 classes left'), findsOneWidget);
    expect(find.text('No end date'), findsOneWidget);
    expect(find.text('₺1800.00 · a month'), findsOneWidget);
    expect(find.text('Unlimited classes'), findsOneWidget);
    expect(find.text('₺1500.00 · class pack'), findsOneWidget);
    expect(find.text('10 classes'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Buy Monthly unlimited'));
    await TestApp.settle(tester);
    expect(app.api.lastPlanBought, 30);
    final page = app.webViews.requests.last;
    expect(page.url.toString(), 'https://yallapp.com.tr/pay/token-1');
    page.onUrlChange!(
      Uri.parse('https://yallapp.com.tr/pay/token-1/order-received'),
    );
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Done'));
    await TestApp.settle(tester);
    expect(find.text('Your membership is active.'), findsOneWidget);
    expect(app.api.count('listMyMemberships'), greaterThan(1));
  });

  testWidgets('iPhones can buy a membership: it is used in person', (
    tester,
  ) async {
    final app = await openGym(tester, platform: DevicePlatform.ios);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Buy 10-class pack'));
    await TestApp.settle(tester);
    expect(app.api.lastPlanBought, 31);
  });

  testWidgets('classes fit a small phone with large text', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final app = await openGym(tester);
    tester.view.physicalSize = const Size(640, 1136);
    for (final path in ['/classes', '/memberships']) {
      app.container.read(appRouterProvider).go(path);
      await TestApp.settle(tester);
      expect(tester.takeException(), isNull, reason: path);
    }
  });

  testWidgets('a bookings app without a timetable keeps its tabs', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      appType: AppType.booking,
      api: FakeApi(config: configJson(lms: null, bookings: true)),
    );
    await app.pump(tester);
    expect(find.bySemanticsLabel('Book'), findsWidgets);
    expect(find.bySemanticsLabel('Classes'), findsNothing);
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);
    expect(find.text('No classes yet'), findsOneWidget);
  });

  test('reads classes, plans and memberships as the contract sends them', () {
    final session = ClassSession.fromJson(
      classJson(booked: true, canCancel: true, spotsLeft: 0),
    );
    expect(session.booked, isTrue);
    expect(session.full, isFalse);
    expect(session.durationMinutes, 60);
    expect(session.staff?.name, 'Selin Aydın');
    expect(ClassSession.fromJson(classJson(spotsLeft: 0)).full, isTrue);
    final plan = MembershipPlan.fromJson(planJson(period: 'week'));
    expect(plan.period, MembershipPeriod.unknown);
    expect(plan.credits, isNull);
    final m = Membership.fromJson(
      membershipJson(endsAt: '2026-11-01T09:00:00Z', creditsLeft: null),
    );
    expect(m.isActive, isTrue);
    expect(m.creditsLeft, isNull);
    expect(m.endsAt, DateTime.utc(2026, 11, 1, 9));
    final config = BookingsConfig.fromJson({
      ...bookingsConfigJson(),
      'classes': classesConfigJson(cancelBeforeMinutes: null),
    });
    expect(config.classes?.membershipRequired, isTrue);
    expect(config.classes?.cancelBeforeMinutes, isNull);
    expect(BookingsConfig.fromJson(bookingsConfigJson()).classes, isNull);
  });
}
