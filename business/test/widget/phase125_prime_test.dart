import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/router.dart';
import 'package:yallapp_business/core/theme/theme.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

Finder down() => find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;

/// 125 Prime: Today's header, the morning brief, Insights, Smart alerts,
/// the looks; VIP; and Prime for an app without Studio.
void main() {
  testWidgets('Prime Today: the header, the comparison, the brief, the tiles', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    expect(find.text('Prime'), findsOneWidget);
    expect(find.textContaining('Layla'), findsOneWidget);
    expect(find.text('Yalla Food'), findsOneWidget);
    expect(find.text('₺18,420.00'), findsOneWidget);
    expect(find.text('Sales today'), findsOneWidget);
    expect(find.text('142'), findsOneWidget);
    expect(find.textContaining('▲ 12%'), findsOneWidget);
    expect(find.textContaining('▼ 4%'), findsOneWidget);
    expect(find.textContaining('Morning brief'), findsOneWidget);
    expect(find.text('2 new food orders'), findsOneWidget);
    expect(find.text('3 shipments need a courier'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Your account manager'),
      200,
      scrollable: down(),
    );
    expect(find.text('Insights'), findsOneWidget);
    expect(find.text('5 on'), findsOneWidget);
    await tapOn(tester, find.text('Message'));
    expect(app.opened.last, 'https://wa.me/905320000099');

    // What needs the owner opens its tab.
    await tester.scrollUntilVisible(
      find.text('2 new food orders'),
      -200,
      scrollable: down(),
    );
    await tapOn(tester, find.text('2 new food orders'));
    expect(find.text('Food orders'), findsOneWidget);
  });

  testWidgets('Insights: this week against last, peak hours, best sellers', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await tester.scrollUntilVisible(
      find.text('Insights'),
      200,
      scrollable: down(),
    );
    await tapOn(tester, find.text('Insights'));
    expect(find.text('This week'), findsWidgets);
    expect(find.text('₺112,840.00'), findsOneWidget);
    expect(find.text('▲ 9% vs last week'), findsOneWidget);
    expect(find.text('Peak hours'), findsOneWidget);
    expect(
      find.text('Busiest: Friday and Saturday 20:00–22:00'),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(find.text('Best sellers'), 200);
    expect(find.text('38%'), findsOneWidget);
    expect(find.text('▲ 3 points'), findsOneWidget);
    expect(find.text('same as last week'), findsOneWidget);
    expect(find.text('1 · Burger Lab'), findsOneWidget);
    await tapOn(tester, find.text('This month'));
    expect(app.api.calls, contains('primeInsights:month'));
  });

  testWidgets('Smart alerts: a switch, a number, the morning brief', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await push(tester, app, '/prime-alerts');
    expect(find.text('Smart alerts'), findsOneWidget);
    expect(find.text('An order waits to be accepted'), findsOneWidget);
    expect(find.text('After 5 minutes'), findsOneWidget);
    expect(find.text('Below ₺8,000 by 18:00'), findsOneWidget);
    expect(find.text('2 stars or less'), findsOneWidget);
    expect(
      find.text('Yesterday in one notification, every day at 08:30'),
      findsOneWidget,
    );
    // A ride alert is for a taxi app only.
    expect(find.text('A ride finds no driver'), findsNothing);

    await tapOn(
      tester,
      find.bySemanticsLabel('A shipment has no courier').last,
    );
    expect(app.api.calls, contains('setPrimeAlerts'));
    final saved = await app.api.primeAlerts(FakeOwnerApi.foodId);
    expect(
      saved.items.firstWhere((a) => a.kind == 'shipment_unassigned').on,
      isFalse,
    );

    await tapOn(tester, find.text('After 5 minutes'));
    await tester.enterText(find.byType(TextField), '8');
    await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
    expect(find.text('After 8 minutes'), findsOneWidget);
  });

  testWidgets('Look: Midnight gold changes the colors; the header turns off', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await push(tester, app, '/prime-look');
    for (final name in ['Classic', 'Midnight gold', 'Ember', 'Sage']) {
      expect(find.text(name), findsOneWidget);
    }
    await tapOn(tester, find.text('Midnight gold'));
    final context = tester.element(find.text('Look'));
    expect(Theme.of(context).extension<YbColors>(), YbColors.midnightGoldLight);
    expect(
      app.container.read(settingsProvider).primeLook(FakeOwnerApi.foodId),
      'midnightGold',
    );
    await tapOn(tester, find.bySemanticsLabel('Prime header on Today').last);
    await tester.pageBack();
    await settle(tester);
    // Today without the dark header: the classic one with the numbers.
    expect(find.text('Prime'), findsNothing);
    expect(find.text('Sales today'), findsOneWidget);
    expect(find.text('2 new food orders'), findsOneWidget);
  });

  testWidgets('a regular app sees what Prime is, and nothing is sold', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'More'));
    await tester.scrollUntilVisible(
      find.text('Prime comes with every Yallapp Studio app'),
      200,
    );
    await tapOn(tester, find.text('Prime comes with every Yallapp Studio app'));
    expect(
      find.textContaining('Your app “Bab Al Sham” is on the regular editor.'),
      findsOneWidget,
    );
    expect(find.text('Nothing is sold in this app.'), findsOneWidget);
    await tapOn(tester, find.text('Learn more on the website'));
    expect(app.opened.last, 'https://yallapp.com.tr/yallapp-studio');
    expect(
      find.textContaining(
        RegExp(r'\bbuy\b|purchase|subscribe|upgrade', caseSensitive: false),
      ),
      findsNothing,
    );
  });

  testWidgets('VIP: the account manager, WhatsApp, a call booked', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await push(tester, app, '/vip');
    expect(find.text('VIP service'), findsOneWidget);
    expect(find.text('Deniz Aksoy'), findsOneWidget);
    expect(find.text('Your account manager at Yallapp'), findsOneWidget);
    expect(find.text('Studio App Business'), findsOneWidget);
    expect(find.textContaining('09:00–21:00, Mon–Sat'), findsOneWidget);
    await tapOn(tester, find.text('WhatsApp'));
    expect(app.opened.last, 'https://wa.me/905320000099');
    await tester.scrollUntilVisible(find.text('14:30'), 200);
    await tapOn(tester, find.text('14:30'));
    final book = find.textContaining(RegExp(r'^Book \w+ 14:30$'));
    expect(book, findsOneWidget);
    await tapOn(tester, book);
    expect(app.api.bookedCalls.single.time, '14:30');
    expect(find.textContaining('Your manager confirms it.'), findsOneWidget);
  });

  testWidgets('Prime in Arabic is right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.foodId, language: 'ar');
    await app.pump(tester);
    expect(find.text('برايم'), findsOneWidget);
    expect(find.text('مبيعات اليوم'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('مبيعات اليوم'))),
      TextDirection.rtl,
    );
    await push(tester, app, '/prime-alerts');
    expect(find.text('التنبيهات الذكية'), findsOneWidget);
    app.container.read(routerProvider).pop();
    await settle(tester);
    await push(tester, app, '/prime-insights');
    expect(find.text('ساعات الذروة'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Prime in Turkish at 390 points: nothing overflows', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId, language: 'tr');
    await app.pump(tester, size: const Size(390, 844));
    expect(find.text('Bugünkü satışlar'), findsOneWidget);
    await push(tester, app, '/prime-look');
    expect(find.text('Gece altını'), findsOneWidget);
    app.container.read(routerProvider).pop();
    await settle(tester);
    await push(tester, app, '/vip');
    expect(find.text('VIP hizmet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
