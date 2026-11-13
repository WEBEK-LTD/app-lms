import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 125 A Studio food app: Food orders (New, Active, Done, Problems), the
/// busy banner, accepting with the time to prepare, rejecting with why, the
/// order's screen and the restaurants.
/// The screen's vertical list (not the filters' row).
Finder down() => find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;

void main() {
  testWidgets('food orders: the tabs, the new ones, accept with the time', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    // The food app's tabs, as the design: no catalog Orders tab of its own.
    for (final label in ['Today', 'Orders', 'Shipments', 'Chat', 'More']) {
      expect(find.widgetWithText(NavigationDestination, label), findsOneWidget);
    }
    expect(find.byType(NavigationDestination), findsNWidgets(5));
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Orders'));
    expect(find.text('Food orders'), findsOneWidget);
    expect(find.text('F-1048'), findsOneWidget);
    expect(find.text('F-1047'), findsOneWidget);
    expect(find.text('F-1046'), findsNothing);
    expect(
      find.text('${isolate('Burger Lab')} → ${isolate('Selin Aydın')}'),
      findsOneWidget,
    );
    expect(find.text('2 × Smash burger, 1 × Fries, 2 × Ayran'), findsOneWidget);
    expect(find.textContaining('Cash on delivery'), findsOneWidget);
    // Burger Lab is busy: its delay ends from the banner.
    expect(find.textContaining('is busy until'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'End delay'));
    expect(app.api.calls, contains('endRestaurantDelay'));
    expect(find.textContaining('is busy until'), findsNothing);
    // The snack bar goes.
    await tester.pump(const Duration(seconds: 5));
    await settle(tester);
    await tester.scrollUntilVisible(
      find.text(
        'The restaurant accepts too, from its own app. Whoever taps first wins.',
      ),
      200,
      scrollable: down(),
    );

    await tapOn(tester, find.widgetWithText(FilledButton, 'Accept').first);
    expect(find.text('Ready in'), findsOneWidget);
    expect(
      find.text(
        'The customer sees the time. A courier job is made as soon as you accept.',
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.text('20 min'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Accept · 20 min'));
    expect(app.api.calls, contains('foodOrderStep:accept'));
    expect(find.text('F-1048 accepted · ready in 20 min'), findsOneWidget);
    expect(find.text('F-1048'), findsNothing);

    await tapOn(tester, find.text('Active'));
    expect(find.text('F-1048'), findsOneWidget);
    expect(find.text('F-1046'), findsOneWidget);
  });

  testWidgets('rejecting asks why', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await go(tester, app, '/food-orders');
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Reject').first);
    expect(find.text('Reject F-1048?'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Reject order'));
    expect(find.text('Choose why.'), findsOneWidget);
    expect(app.api.calls, isNot(contains('foodOrderStep:reject')));
    await tapOn(tester, find.text('Too busy right now'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Reject order'));
    expect(app.api.calls, contains('foodOrderStep:reject'));
    expect(find.text('F-1048 rejected'), findsOneWidget);
  });

  testWidgets('a food order: the places, the items, cash, Ready in', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await go(tester, app, '/food-orders/48');
    expect(find.text('F-1048'), findsOneWidget);
    expect(find.text('Burger Lab'), findsOneWidget);
    expect(find.text('Bağdat Cd. 214, Kadıköy'), findsOneWidget);
    expect(find.text('No onions · Extra cheddar'), findsOneWidget);
    expect(find.text('₺412.00'), findsWidgets);
    expect(
      find.text('Cash on delivery: the courier collects ${isolate('₺412.00')}'),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(
      find.textContaining('waiting for you or the restaurant'),
      200,
      scrollable: down(),
    );
    // The sheet at the foot: 15 minutes chosen.
    expect(
      find.widgetWithText(FilledButton, 'Accept · 15 min'),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Accept · 15 min'));
    expect(app.api.calls, contains('foodOrderStep:accept'));
    expect(find.text('Preparing'), findsOneWidget);
    // Now it can be marked ready, or cancelled after asking.
    await tapOn(tester, find.widgetWithText(FilledButton, 'Ready'));
    expect(app.api.calls, contains('foodOrderStep:ready'));
    expect(find.text('F-1048 is ready'), findsOneWidget);
  });

  testWidgets('restaurants: busy, open now', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await go(tester, app, '/food-orders');
    await tapOn(tester, find.text('Restaurants'));
    expect(find.text('Pide House'), findsOneWidget);
    expect(find.text('Busy'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Open now'));
    expect(app.api.calls, contains('openRestaurant'));
    expect(find.text('Burger Lab is open'), findsOneWidget);
  });

  testWidgets('food orders in Arabic are right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.foodId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/food-orders');
    expect(find.text('طلبات الطعام'), findsOneWidget);
    expect(find.text('جديدة'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('طلبات الطعام'))),
      TextDirection.rtl,
    );
    expect(
      find.text('${isolate('Burger Lab')} ← ${isolate('Selin Aydın')}'),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'قبول').first);
    expect(find.text('جاهز خلال'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('food orders in Turkish at 390 points: nothing overflows', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId, language: 'tr');
    await app.pump(tester, size: const Size(390, 844));
    await go(tester, app, '/food-orders');
    expect(find.text('Yemek siparişleri'), findsOneWidget);
    await go(tester, app, '/food-orders/48');
    expect(find.text('Hazır olma süresi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
