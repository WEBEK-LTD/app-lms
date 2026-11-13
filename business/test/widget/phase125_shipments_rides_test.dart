import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

Finder down() => find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;

/// 125 Shipments with the courier sheet, and rides with the driver sheet.
void main() {
  testWidgets('shipments: counts, waiting, give one to the closest courier', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await tapOn(
      tester,
      find.widgetWithText(NavigationDestination, 'Shipments'),
    );
    expect(find.text('On duty'), findsOneWidget);
    expect(find.text('On the way'), findsOneWidget);
    expect(find.text('S-2031'), findsOneWidget);
    expect(find.text('Needs a courier'), findsNWidgets(3));
    expect(
      find.text('Food order F-1043 · cash ${isolate('₺412.00')} to collect'),
      findsOneWidget,
    );

    await tapOn(tester, find.text('S-2031'));
    expect(find.text('Give S-2031 to'), findsOneWidget);
    expect(find.text('Closest first. Couriers on duty only.'), findsOneWidget);
    expect(find.text('Mehmet Kaya'), findsOneWidget);
    expect(find.text('Ayşe Demir'), findsOneWidget);
    // Off duty: not offered.
    expect(find.text('Can Öz'), findsNothing);
    expect(find.text('Give it to Mehmet'), findsOneWidget);
    await tapOn(tester, find.text('Emre Şahin'));
    await tapOn(tester, find.text('Give it to Emre'));
    expect(app.api.calls, contains('assignShipment:c3'));
    expect(find.text('S-2031 given to Emre Şahin'), findsOneWidget);
    expect(find.text('S-2031'), findsNothing);
    await tapOn(tester, find.text('Active'));
    expect(find.text('S-2031'), findsOneWidget);
  });

  testWidgets('a shipment on its way is delivered from its screen', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.deliveryId);
    await app.pump(tester);
    // A delivery company: Today, Shipments, Chat, Stats, More.
    for (final label in ['Today', 'Shipments', 'Chat', 'Stats', 'More']) {
      expect(find.widgetWithText(NavigationDestination, label), findsOneWidget);
    }
    expect(find.widgetWithText(NavigationDestination, 'Orders'), findsNothing);
    await go(tester, app, '/shipments/2028');
    expect(find.text('S-2028'), findsOneWidget);
    expect(find.text('Ayşe Demir'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Delivered'));
    expect(app.api.calls, contains('moveShipment:delivered'));
    expect(find.text('S-2028: Delivered'), findsOneWidget);
  });

  testWidgets('couriers: on duty first, with a call', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.deliveryId);
    await app.pump(tester);
    await go(tester, app, '/shipments');
    await tapOn(tester, find.text('Couriers'));
    expect(find.text('Mehmet Kaya'), findsOneWidget);
    expect(find.text('On duty · free'), findsWidgets);
    expect(find.text('off duty'), findsOneWidget);
    await tapOn(tester, find.byTooltip('Call').first);
    expect(app.opened.last, 'tel:+905322000001');
  });

  testWidgets('shipments in Arabic are right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.deliveryId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/shipments');
    expect(find.text('الشحنات'), findsWidgets);
    expect(find.text('في الخدمة'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('في الخدمة'))),
      TextDirection.rtl,
    );
    await tapOn(tester, find.text('S-2031'));
    expect(find.text('إسناد S-2031 إلى'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('rides: free drivers, searching, give one to a driver', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.ridesId);
    await app.pump(tester);
    for (final label in ['Today', 'Rides', 'Chat', 'Stats', 'More']) {
      expect(find.widgetWithText(NavigationDestination, label), findsOneWidget);
    }
    expect(find.widgetWithText(NavigationDestination, 'Orders'), findsNothing);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Rides'));
    expect(find.text('Free drivers'), findsOneWidget);
    expect(find.text('R-551'), findsOneWidget);
    expect(find.text('Searching · 3 min'), findsOneWidget);
    expect(find.textContaining('quoted'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text(
        ['Ali Yılmaz', '34 ABC 128', 'Toyota Corolla'].map(isolate).join(' · '),
      ),
      200,
      scrollable: down(),
    );
    await tester.scrollUntilVisible(
      find.text('R-551'),
      -200,
      scrollable: down(),
    );
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Give to a driver').first,
    );
    expect(find.text('Give R-551 to'), findsOneWidget);
    expect(find.text('Selim Kurt'), findsOneWidget);
    // Not free: not offered.
    expect(find.text('Hakan Er'), findsNothing);
    await tapOn(tester, find.text('Give it to Selim'));
    expect(app.api.calls, contains('assignRide:d2'));
  });

  testWidgets('a searching ride is cancelled after asking; call a driver', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.ridesId);
    await app.pump(tester);
    await go(tester, app, '/rides/551');
    expect(find.text('R-551'), findsOneWidget);
    expect(find.text('Deniz Çelik'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Cancel ride'));
    expect(find.text('Cancel R-551?'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Cancel ride'));
    expect(app.api.calls, contains('cancelRide'));
    expect(find.text('R-551 cancelled'), findsOneWidget);

    await go(tester, app, '/rides');
    await tester.scrollUntilVisible(
      find.text('Call driver'),
      200,
      scrollable: down(),
    );
    await tapOn(tester, find.text('Call driver').first);
    expect(app.opened.last, startsWith('tel:'));
  });

  testWidgets('rides in Arabic are right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.ridesId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/rides');
    expect(find.text('سائقون متاحون'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('سائقون متاحون'))),
      TextDirection.rtl,
    );
    expect(find.text('R-551'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('drivers: free first', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.ridesId);
    await app.pump(tester);
    await go(tester, app, '/rides');
    await tapOn(tester, find.text('Drivers'));
    expect(find.text('Selim Kurt'), findsOneWidget);
    expect(find.text('Hakan Er'), findsOneWidget);
    final selim = tester.getTopLeft(find.text('Selim Kurt')).dy;
    final hakan = tester.getTopLeft(find.text('Hakan Er')).dy;
    expect(selim, lessThan(hakan));
  });
}
