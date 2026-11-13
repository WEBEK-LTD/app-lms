import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/session.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 125 The tabs of each engine (and no empty Orders tab for them), More's
/// Studio tools, the new pushes and where they open.
void main() {
  group('pushTarget', () {
    PushTarget t(Map<String, dynamic> data) => pushTarget(data);

    test('the Studio apps\' items open themselves', () {
      expect(
        t({'kind': 'new_food_order', 'app_id': 'a', 'food_order_id': '48'})
            .location,
        '/food-orders/48',
      );
      expect(
        t({'kind': 'shipment_waiting', 'app_id': 'a', 'shipment_id': '2031'})
            .location,
        '/shipments/2031',
      );
      expect(
        t({'kind': 'prime_alert', 'ride_id': '551'}).location,
        '/rides/551',
      );
      expect(
        t({'kind': 'new_complaint', 'complaint_id': 'k1'}).location,
        '/market/complaints/k1',
      );
      expect(
        t({
          'kind': 'prime_alert',
          'alert': 'order_waiting',
          'market_order_id': '42',
        }).location,
        '/market/orders/42',
      );
      expect(
        t({'kind': 'school_excuse', 'school_excuse_id': 'e1'}).location,
        '/school-review?kind=excuses&id=e1',
      );
      expect(
        t({'kind': 'school_report', 'school_report_id': 'p1'}).location,
        '/school-review?kind=reports&id=p1',
      );
      expect(
        t({'kind': 'leave_request', 'leave_id': 'l1'}).location,
        '/school-review?kind=leave&id=l1',
      );
    });

    test('kinds without an item open their list or Today', () {
      expect(t({'kind': 'new_food_order'}).location, Paths.foodOrders);
      expect(t({'kind': 'shipment_waiting'}).location, Paths.shipments);
      expect(t({'kind': 'new_complaint'}).location, '/market?tab=complaints');
      expect(t({'kind': 'morning_brief', 'app_id': 'a'}).location, Paths.today);
      expect(
        t({'kind': 'prime_alert', 'alert': 'shipment_unassigned'}).location,
        Paths.shipments,
      );
      expect(
        t({'kind': 'prime_alert', 'alert': 'ride_no_driver'}).location,
        Paths.rides,
      );
      expect(
        t({'kind': 'prime_alert', 'alert': 'sales_low'}).location,
        Paths.today,
      );
      // The ones before stay as they were.
      expect(
        t({'kind': 'new_order', 'order_id': '1042'}).location,
        '/orders/1042',
      );
    });
  });

  testWidgets('a tapped food order push opens it on its app', (tester) async {
    final push = FakePush();
    final app = TestApp(push: push);
    await app.pump(tester);
    push.openedController.add({
      'type': 'owner',
      'kind': 'new_food_order',
      'app_id': FakeOwnerApi.foodId,
      'food_order_id': '47',
    });
    await settle(tester);
    expect(find.text('F-1047'), findsOneWidget);
    expect(find.text('Pide House'), findsOneWidget);
  });

  testWidgets('a morning brief push shows on Today', (tester) async {
    final push = FakePush();
    final app = TestApp(push: push, appId: FakeOwnerApi.ridesId);
    await app.pump(tester);
    expect(find.textContaining('Morning brief'), findsNothing);
    push.foregroundController.add(
      const RemoteNotice(
        title: 'Morning brief',
        body: 'Yesterday: ₺12,900 from 88 rides.',
        data: {'kind': 'morning_brief', 'app_id': FakeOwnerApi.ridesId},
      ),
    );
    await settle(tester);
    expect(
      find.textContaining('Yesterday: ₺12,900 from 88 rides.'),
      findsWidgets,
    );
  });

  testWidgets('Studio apps have no catalog Orders tab (the 1.0.1 bug)', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.deliveryId);
    await app.pump(tester);
    for (final (id, tabs) in [
      (FakeOwnerApi.foodId, ['Today', 'Orders', 'Shipments', 'Chat', 'More']),
      (FakeOwnerApi.marketId, ['Today', 'Market', 'Shipments', 'Chat', 'More']),
      (
        FakeOwnerApi.deliveryId,
        ['Today', 'Shipments', 'Chat', 'Stats', 'More'],
      ),
      (FakeOwnerApi.ridesId, ['Today', 'Rides', 'Chat', 'Stats', 'More']),
      (FakeOwnerApi.schoolId, ['Today', 'School', 'Notify', 'Stats', 'More']),
    ]) {
      expect(
        app.api.apps.firstWhere((a) => a.id == id).features.orders,
        isFalse,
      );
      await app.api.app(id);
      app.container.read(selectedAppProvider.notifier).select(id);
      await settle(tester);
      final labels = [
        for (final d in tester.widgetList<NavigationDestination>(
          find.byType(NavigationDestination),
        ))
          d.label,
      ];
      expect(labels, tabs, reason: id);
    }
    // The food app's Orders tab is its food orders.
    app.container
        .read(selectedAppProvider.notifier)
        .select(FakeOwnerApi.foodId);
    await settle(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Orders'));
    expect(find.text('Food orders'), findsOneWidget);
  });

  testWidgets('More: the Studio tools that aren\'t tabs, Prime and VIP', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await go(tester, app, '/more');
    expect(find.text('Restaurants'), findsOneWidget);
    expect(find.text('Couriers'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('VIP service'), 200);
    expect(find.text('Smart alerts'), findsOneWidget);
    expect(find.text('Look'), findsOneWidget);
    await tapOn(tester, find.text('VIP service'));
    expect(find.text('Deniz Aksoy'), findsOneWidget);
  });

  testWidgets('a team member without Orders sees no food orders', (
    tester,
  ) async {
    final api = FakeOwnerApi()..joinAs(TeamRole.staff, areas: ['chat']);
    final app = TestApp(api: api, appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    expect(find.widgetWithText(NavigationDestination, 'Orders'), findsNothing);
    expect(
      find.widgetWithText(NavigationDestination, 'Shipments'),
      findsNothing,
    );
    // No Analytics: no Prime header.
    expect(find.text('Prime'), findsNothing);
  });

  testWidgets('notification settings list the Studio and Prime pushes', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.foodId);
    await app.pump(tester);
    await push(tester, app, '/settings/notifications');
    await tester.scrollUntilVisible(find.text('Morning brief'), 200);
    expect(find.text('New food orders'), findsOneWidget);
    expect(find.text('Shipments without a courier'), findsOneWidget);
    expect(find.text('Marketplace complaints'), findsOneWidget);
    expect(find.text('Smart alerts'), findsOneWidget);
  });
}
