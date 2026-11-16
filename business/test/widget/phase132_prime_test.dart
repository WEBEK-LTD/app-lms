import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';
import 'package:yallapp_business/features/prime/prime_widgets.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 132 Prime's second set in Yallapp Business: the sales goal with Today's
/// ring, low stock and the goal in Smart alerts, the weekly report, customer
/// and product insights, ratings and reviews, the quick actions (a coupon, a
/// flash sale, a delivery time closed for today, a restaurant's busy mode),
/// Prime as a gift from Yallapp, and what a regular app sees (nothing to
/// buy). Light, dark, Arabic and Turkish.
///
/// `YB_SHOTS_DIR=<dir> flutter test test/widget/phase132_prime_test.dart`
/// writes 2x pictures of the Prime screens.

Finder down() => find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;

final _shots = Platform.environment['YB_SHOTS_DIR'] ?? '';
const _frame = ValueKey('prime-shot');

Future<void> _loadFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

Future<void> _shot(WidgetTester tester, String name) async {
  if (_shots.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frame),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$_shots/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Future<TestApp> _open(
  WidgetTester tester,
  String location, {
  FakeOwnerApi? api,
  String appId = FakeOwnerApi.flowersId,
  String language = 'en',
  Brightness? brightness,
  double height = 860,
}) async {
  final app = TestApp(
    api: (api ?? FakeOwnerApi())..language = language,
    appId: appId,
    language: language,
    brightness: brightness,
  );
  await app.pump(
    tester,
    size: Size(400, height),
    pixelRatio: 2,
    wrap: (root) => RepaintBoundary(key: _frame, child: root),
  );
  if (location != '/today') await go(tester, app, location);
  return app;
}

/// The fake API with a sales goal of [cents] a day on Leqaa.
Future<FakeOwnerApi> _withGoal(int cents) async {
  final api = FakeOwnerApi();
  final alerts = await api.primeAlerts(FakeOwnerApi.flowersId);
  await api.setPrimeAlerts(
    FakeOwnerApi.flowersId,
    alerts.copyWith(
      items: [
        for (final a in alerts.items)
          a.kind == 'sales_goal'
              ? a.copyWith(on: true, amountCents: cents, period: 'day')
              : a,
      ],
    ),
  );
  api.calls.clear();
  return api;
}

void main() {
  setUpAll(() async {
    if (_shots.isNotEmpty) await _loadFonts();
  });

  testWidgets('Today: the sales goal as a ring, and the customers tile', (
    tester,
  ) async {
    await _open(tester, '/today', api: await _withGoal(500000), height: 1400);
    expect(find.text("Today's goal"), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('Customers').first,
      200,
      scrollable: down(),
    );
    expect(find.text('Customers'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Smart alerts: a goal asks its amount and period; low stock; the weekly report',
    (tester) async {
      final app = await _open(tester, '/prime-alerts', height: 1500);
      expect(find.text('Sales goal'), findsOneWidget);
      expect(
        find.text('Set an amount for the day, week or month'),
        findsOneWidget,
      );
      expect(find.text('Low stock'), findsOneWidget);
      // Turning the goal on asks for its amount first.
      final goalSwitch = find.descendant(
        of: find
            .ancestor(
              of: find.text('Sales goal'),
              matching: find.byType(InkWell),
            )
            .first,
        matching: find.byType(PrimeSwitch),
      );
      await tapOn(tester, goalSwitch);
      await tester.enterText(find.byType(TextField).last, '5000');
      await tapOn(tester, find.text('week'));
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(app.api.calls, contains('setPrimeAlerts'));
      final saved = await app.api.primeAlerts(FakeOwnerApi.flowersId);
      expect(
        saved.items.firstWhere((a) => a.kind == 'sales_goal'),
        isA<AlertSetting>()
            .having((a) => a.on, 'on', isTrue)
            .having((a) => a.amountCents, 'amount', 500000)
            .having((a) => a.period, 'period', 'week'),
      );
      // The weekly report, to the owner's email.
      expect(find.text('Weekly report by email'), findsOneWidget);
      expect(find.textContaining('owner@example.com'), findsOneWidget);
      final weekly = find.descendant(
        of: find
            .ancestor(
              of: find.text('Weekly report by email'),
              matching: find.byType(Row),
            )
            .first,
        matching: find.byType(PrimeSwitch),
      );
      await tapOn(tester, weekly);
      expect(app.api.calls, contains('setWeeklyReport:false'));
    },
  );

  testWidgets('Customers: new and returning, the best, the ones away', (
    tester,
  ) async {
    final app = await _open(tester, '/prime-customers', height: 1400);
    expect(find.text('Best customers'), findsOneWidget);
    expect(find.text('Omar Nabil'), findsOneWidget);
    expect(find.text('9 away 30 to 60 days'), findsOneWidget);
    expect(find.text('14 away more than 60 days'), findsOneWidget);
    await tapOn(tester, find.text('This week'));
    expect(app.api.calls, contains('primeCustomers:week'));
  });

  testWidgets('Products: best sellers, slow movers, low and sold out', (
    tester,
  ) async {
    await _open(tester, '/prime-products', height: 1400);
    expect(find.text('Best sellers'), findsOneWidget);
    expect(find.text('Slow movers'), findsOneWidget);
    expect(find.text('Sold out'), findsOneWidget);
    expect(find.text('2 left'), findsOneWidget);
  });

  testWidgets('Ratings and reviews of a food app', (tester) async {
    await _open(
      tester,
      '/prime-reviews',
      appId: FakeOwnerApi.foodId,
      height: 1200,
    );
    expect(find.text('Average rating'), findsOneWidget);
    expect(find.text('“${isolate('The fries were cold.')}”'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.label == '2 stars out of 5',
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    'Quick actions: a coupon, a flash sale, a delivery time closed for today',
    (tester) async {
      final app = await _open(tester, '/prime-actions', height: 1400);
      await tapOn(tester, find.text('New coupon'));
      await tester.enterText(find.widgetWithText(TextField, 'Code'), 'leqaa10');
      await tester.enterText(
        find.widgetWithText(TextField, 'Percent off (1–100)'),
        '10',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(find.text('Coupon LEQAA10 is ready.'), findsOneWidget);
      // The same code again: the field says why.
      await tapOn(tester, find.text('New coupon'));
      await tester.enterText(find.widgetWithText(TextField, 'Code'), 'LEQAA10');
      await tester.enterText(
        find.widgetWithText(TextField, 'Percent off (1–100)'),
        '10',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(
        find.text('You already have a coupon with this code.'),
        findsOneWidget,
      );
      Navigator.of(
        tester.element(find.text('You already have a coupon with this code.')),
      ).pop();
      await settle(tester);

      await tapOn(tester, find.text('New flash sale'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Name'),
        'Rose hour',
      );
      await tapOn(
        tester,
        find.widgetWithText(CheckboxListTile, 'Blush Garden'),
      );
      expect(
        find.widgetWithText(CheckboxListTile, 'Belgian chocolate box'),
        findsNothing,
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(find.text('Rose hour is on.'), findsOneWidget);
      expect(
        app.api.flashSales[FakeOwnerApi.flowersId]!.single['product_ids'],
        [11],
      );

      await tester.scrollUntilVisible(
        find.text("Today's delivery times"),
        200,
        scrollable: down(),
      );
      await tapOn(tester, find.widgetWithText(SwitchListTile, '13:00–16:00'));
      expect(app.api.calls, contains('setSlotClosed:afternoon:true'));
      expect(find.text('Closed today'), findsOneWidget);
    },
  );

  testWidgets('Quick actions: busy mode for a restaurant', (tester) async {
    final app = await _open(
      tester,
      '/prime-actions',
      appId: FakeOwnerApi.foodId,
      height: 1200,
    );
    expect(find.text('Busy mode'), findsOneWidget);
    await tapOn(tester, find.byType(ListTile).first);
    await tapOn(tester, find.text('30 min'));
    expect(
      app.api.calls.where((c) => c.startsWith('setRestaurantBusy:')).single,
      endsWith(':30'),
    );
  });

  testWidgets('Prime as a gift from Yallapp shows on Today', (tester) async {
    final api = FakeOwnerApi();
    final i = api.apps.indexWhere((a) => a.id == FakeOwnerApi.flowersId);
    final a = api.apps[i];
    api.apps[i] = AppSummary(
      id: a.id,
      name: a.name,
      type: a.type,
      typeName: a.typeName,
      state: a.state,
      features: a.features,
      backend: a.backend,
      plan: a.plan,
      access: a.access,
      primeGift: true,
    );
    await _open(tester, '/today', api: api);
    expect(find.text('Prime · Gift from Yallapp'), findsOneWidget);
  });

  testWidgets('a regular app sees what Prime brings now, and nothing to buy', (
    tester,
  ) async {
    await _open(
      tester,
      '/prime',
      appId: FakeOwnerApi.restaurantId,
      height: 1700,
    );
    expect(find.text('Customers'), findsOneWidget);
    expect(find.text('Sales goal'), findsOneWidget);
    expect(find.text('Weekly report by email'), findsOneWidget);
    expect(find.text('Quick actions'), findsOneWidget);
    expect(find.textContaining('Buy'), findsNothing);
  });

  testWidgets('in Arabic, right to left; in Turkish', (tester) async {
    await _open(tester, '/prime-customers', language: 'ar', height: 1400);
    expect(find.text('أفضل العملاء'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('أفضل العملاء'))),
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Turkish', (tester) async {
    await _open(tester, '/prime-actions', language: 'tr', height: 1400);
    expect(find.text('Yeni kupon'), findsOneWidget);
    expect(find.text('Yeni flaş indirim'), findsOneWidget);
  });

  for (final (lang, dark) in [
    ('en', false),
    ('en', true),
    ('ar', false),
    ('ar', true),
  ]) {
    final tone = dark ? 'dark' : 'light';
    for (final (name, location, appId, height) in [
      ('prime-today', '/today', FakeOwnerApi.flowersId, 1200.0),
      ('prime-customers', '/prime-customers', FakeOwnerApi.flowersId, 1300.0),
      ('prime-actions', '/prime-actions', FakeOwnerApi.flowersId, 1100.0),
      ('prime-alerts', '/prime-alerts', FakeOwnerApi.flowersId, 1400.0),
      ('prime-products', '/prime-products', FakeOwnerApi.flowersId, 1200.0),
      ('prime-locked', '/prime', FakeOwnerApi.restaurantId, 1500.0),
    ]) {
      testWidgets('2x picture: $name, $lang, $tone', (tester) async {
        await _open(
          tester,
          location,
          api: name == 'prime-today' ? await _withGoal(500000) : null,
          appId: appId,
          language: lang,
          brightness: dark ? Brightness.dark : Brightness.light,
          height: height,
        );
        await _shot(tester, '$name-$lang-$tone');
        expect(tester.takeException(), isNull);
      });
    }
  }
}
