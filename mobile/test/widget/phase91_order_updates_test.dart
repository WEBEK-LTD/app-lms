import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_registration.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/storage/local_settings.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'store_test.dart' show storeApi;

/// 91.2 Order updates: a switch for them in a shop's settings, and an
/// update in the inbox opens its order.
void main() {
  testWidgets('a shop has an Order updates switch, on until turned off', (
    tester,
  ) async {
    final app = TestApp(
      api: storeApi(),
      appType: AppType.store,
      signedIn: true,
      overrides: [pushEnabledProvider.overrideWithValue(true)],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Order updates'), findsOneWidget);
    expect(
      app.container.read(localSettingsProvider).notifications.orders,
      isTrue,
    );
    await tester.tap(find.text('Order updates'));
    await TestApp.settle(tester);
    final prefs = app.container.read(localSettingsProvider).notifications;
    expect(prefs.orders, isFalse);
    expect(prefs.toJson()['orders'], isFalse);
  });

  testWidgets('other apps have no Order updates switch', (tester) async {
    final app = TestApp(
      signedIn: true,
      overrides: [pushEnabledProvider.overrideWithValue(true)],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Order updates'), findsNothing);
  });

  test('an order update opens its order', () {
    final n = InboxNotification.fromJson({
      ...notificationJson(),
      'type': 'order_update',
      'order_id': 1042,
    });
    expect(n.type, NotificationType.orderUpdate);
    expect(n.orderId, 1042);
    expect(n.target, containsPair('order_id', 1042));
    expect(pushTargetLocation(n.target), Paths.order(1042));
    // Older servers: no order, and an older app reads the type as unknown.
    expect(NotificationPreferences.fromJson(const {}).orders, isTrue);
  });
}
