import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/routing/router.dart';
import 'package:yallapp_business/core/services/live_activity.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/services/ringtones.dart';
import 'package:yallapp_business/core/session.dart';
import 'package:yallapp_business/features/food/food_orders_screen.dart';
import 'package:yallapp_business/features/food/food_sheets.dart';
import 'package:yallapp_business/features/orders/orders_screen.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

Future<void> reach(
  WidgetTester tester,
  Finder finder, {
  double delta = 200,
}) async {
  await tester.scrollUntilVisible(
    finder,
    delta,
    scrollable: find.byType(Scrollable).last,
  );
  await tester.ensureVisible(finder);
  await settle(tester);
}

/// 214 Yallapp Business 1.0.6: ring by order value, the end-of-day summary,
/// and Pause the shop.
void main() {
  group('ring by order value', () {
    test('picks the band of the value; none without bands or a value', () {
      const s = RingSettings(
        byValue: [
          ValueBand(0, 'pop'),
          ValueBand(500, 'cash_drawer'),
          ValueBand(2000, 'cha_ching'),
        ],
      );
      final now = DateTime(2026, 1, 1, 12);
      expect(s.soundAt(SoundGroup.orders, now, value: 120), 'pop');
      expect(s.soundAt(SoundGroup.orders, now, value: 500), 'cash_drawer');
      expect(s.soundAt(SoundGroup.orders, now, value: 2500), 'cha_ching');
      expect(s.soundAt(SoundGroup.orders, now), 'counter_bell');
      expect(s.soundAt(SoundGroup.messages, now, value: 9000), 'pop');
      expect(s.toApiJson()['by_value'], [
        {'from': 0, 'sound': 'pop'},
        {'from': 500, 'sound': 'cash_drawer'},
        {'from': 2000, 'sound': 'cha_ching'},
      ]);
      expect(const RingSettings().toApiJson()['by_value'], isNull);
      expect(const RingSettings().toApiJson()['summary'], {
        'on': true,
        'at': '23:00',
      });
      // Back from what the phone keeps; bands the server wouldn't take are none.
      expect(
        RingSettings.fromJson(s.toJson()).soundForValue(2500),
        'cha_ching',
      );
      expect(
        ValueBand.listFrom([
          {'from': 10, 'sound': 'pop'},
          {'from': 20, 'sound': 'pop'},
        ]),
        isNull,
      );
    });

    testWidgets('Settings: the mode, the bands and their sounds', (
      tester,
    ) async {
      final app = TestApp(push: FakePush());
      await app.pump(tester);
      await push(tester, app, Paths.ringtones);
      await reach(tester, find.byKey(const ValueKey('ring-mode-value')));
      await tester.tap(find.byKey(const ValueKey('ring-mode-value')));
      await settle(tester);
      expect(app.api.pushSounds!['by_value'], [
        {'from': 0, 'sound': 'counter_bell'},
        {'from': 500, 'sound': 'cash_drawer'},
        {'from': 2000, 'sound': 'cha_ching'},
      ]);
      expect(find.text('Under 500'), findsOneWidget);
      expect(find.text('500 to under 2,000'), findsOneWidget);
      expect(find.text('2,000 and more'), findsOneWidget);
      // The top band starts at 3,000 instead.
      await tester.tap(find.byKey(const ValueKey('ring-band-edit-2')));
      await settle(tester);
      await tester.enterText(
        find.byKey(const ValueKey('ring-band-amount')),
        '400',
      );
      await tester.tap(find.byKey(const ValueKey('ring-band-save')));
      await settle(tester);
      expect(
        find.text('Enter an amount between the bands before and after it.'),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const ValueKey('ring-band-amount')),
        '٣٠٠٠',
      );
      await tester.tap(find.byKey(const ValueKey('ring-band-save')));
      await settle(tester);
      expect(find.text('3,000 and more'), findsOneWidget);
      // Its sound from the picker.
      await tester.tap(find.text('3,000 and more'));
      await settle(tester);
      expect(find.text('Sound for this band'), findsOneWidget);
      final rush = find.byKey(const ValueKey('ringtone-rush_hour'));
      await reach(tester, rush);
      await tester.tap(rush);
      await settle(tester);
      expect(app.api.pushSounds!['by_value'][2], {
        'from': 3000,
        'sound': 'rush_hour',
      });
      // Two bands only, then back to one sound for all.
      await reach(tester, find.byKey(const ValueKey('ring-band-remove')));
      await tester.tap(find.byKey(const ValueKey('ring-band-remove')));
      await settle(tester);
      expect(app.api.pushSounds!['by_value'], hasLength(2));
      await reach(
        tester,
        find.byKey(const ValueKey('ring-mode-same')),
        delta: -200,
      );
      await tester.tap(find.byKey(const ValueKey('ring-mode-same')));
      await settle(tester);
      expect(app.api.pushSounds!['by_value'], isNull);
    });

    testWidgets('a new order rings with its band while the app is open', (
      tester,
    ) async {
      final push = FakePush();
      final app = TestApp(push: push);
      await app.pump(tester);
      await app.container
          .read(ringSettingsProvider.notifier)
          .set(
            const RingSettings(
              byValue: [ValueBand(0, 'pop'), ValueBand(1000, 'cha_ching')],
            ),
          );
      push.foregroundController.add(
        const RemoteNotice(
          title: 'New order 1050',
          body: '',
          data: {
            'kind': 'new_order',
            'order_id': '1040',
            'order_value': '1250',
          },
        ),
      );
      await settle(tester);
      expect(app.ringer.rang.single.$1, 'cha_ching');
    });
  });

  group('the end-of-day summary', () {
    testWidgets('its time in Notifications, sent with the ringtones', (
      tester,
    ) async {
      final app = TestApp(push: FakePush());
      await app.pump(tester);
      await push(tester, app, Paths.notifications);
      expect(find.text('End-of-day summary'), findsOneWidget);
      expect(find.textContaining('11:00 PM'), findsWidgets);
      await tester.tap(find.byKey(const ValueKey('summary-on')));
      await settle(tester);
      expect(app.api.pushSounds!['summary'], {'on': false, 'at': '23:00'});
    });

    testWidgets('the push opens the day, against the same weekday last week', (
      tester,
    ) async {
      final push = FakePush();
      final app = TestApp(push: push);
      await app.pump(tester);
      expect(
        pushTarget({
          'kind': 'daily_summary',
          'alert': 'daily_summary',
          'date': '2026-11-23',
        }).location,
        '/day-summary?date=2026-11-23',
      );
      push.openedController.add({
        'type': 'owner',
        'kind': 'daily_summary',
        'app_id': FakeOwnerApi.restaurantId,
        'date': '2026-11-23',
      });
      await settle(tester);
      expect(find.text('Day summary'), findsOneWidget);
      expect(find.byKey(const ValueKey('day-sales')), findsOneWidget);
      expect(find.text('₺2,425.00'), findsOneWidget);
      expect(find.text('20% more than last Monday'), findsOneWidget);
      expect(find.text('Chicken shawarma'), findsOneWidget);
      expect(app.api.calls, contains('daySummary'));
    });

    testWidgets('in Arabic, right to left, dark', (tester) async {
      final app = TestApp(language: 'ar', brightness: Brightness.dark);
      await app.pump(tester);
      app.container.read(routerProvider).push(Paths.daySummary());
      await settle(tester);
      expect(find.text('ملخّص اليوم'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('pause the shop', () {
    testWidgets('a shop pauses for 30 minutes with a reason, then reopens', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.restaurantId);
      await app.pump(tester);
      await tester.tap(find.byKey(const ValueKey('pause-shop')));
      await settle(tester);
      expect(find.text('For how long'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('pause-reason')),
        'Back after prayers',
      );
      await tester.tap(find.byKey(const ValueKey('pause-confirm')));
      await settle(tester);
      final paused = app.api.shopPauses[FakeOwnerApi.restaurantId]!;
      expect(paused.reason, 'Back after prayers');
      expect(
        paused.until!.difference(DateTime.now()).inMinutes,
        inInclusiveRange(28, 30),
      );
      expect(find.byKey(const ValueKey('paused-panel')), findsOneWidget);
      expect(find.text('Not taking new orders'), findsOneWidget);
      expect(find.text('Customers read: Back after prayers'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('reopen-shop')));
      await settle(tester);
      expect(app.api.shopPauses, isEmpty);
      expect(find.byKey(const ValueKey('pause-shop')), findsOneWidget);
    });

    testWidgets('a food app pauses one restaurant until reopened', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.foodId);
      await app.pump(tester);
      await tester.tap(find.byKey(const ValueKey('pause-shop')));
      await settle(tester);
      expect(find.text('Which place'), findsOneWidget);
      final chips = find.byWidgetPredicate(
        (w) =>
            w is ChoiceChip &&
            (w.key as ValueKey?)?.value.toString().startsWith('pause-place-') ==
                true &&
            (w.key as ValueKey).value != 'pause-place-all',
      );
      expect(chips, findsWidgets);
      await tester.tap(chips.first);
      await tester.tap(find.byKey(const ValueKey('pause-for-reopen')));
      await tester.tap(find.byKey(const ValueKey('pause-confirm')));
      await settle(tester);
      final paused = app.api.placePauses[FakeOwnerApi.foodId]!;
      expect(paused, hasLength(1));
      expect(paused.values.single.until, isNull);
      expect(find.text('1 paused'), findsOneWidget);
      expect(find.text('Until you reopen'), findsOneWidget);
    });

    testWidgets('the sheet in Arabic, right to left, dark', (tester) async {
      final app = TestApp(
        appId: FakeOwnerApi.restaurantId,
        language: 'ar',
        brightness: Brightness.dark,
      );
      await app.pump(tester);
      await tester.tap(find.byKey(const ValueKey('pause-shop')));
      await settle(tester);
      expect(find.text('حتى أعيد الفتح'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('the home-screen widget and the new order notification', () {
    testWidgets('signed in, the widget gets its own token; signed out, none', (
      tester,
    ) async {
      final app = TestApp(language: 'ar');
      await app.pump(tester);
      expect(app.api.calls, contains('widgetToken'));
      final first = app.homeWidget.configured.last;
      expect(first.token, 'yw1.demo-device.0.demo');
      expect(first.api, 'https://yallapp.com.tr/api/owner/v1');
      expect(first.lang, 'ar');
      await app.container.read(sessionProvider.notifier).signOut();
      await settle(tester);
      expect(app.homeWidget.configured.last.token, isNull);
    });

    testWidgets('tapped, it opens its app\'s orders', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.clinicId);
      await app.pump(tester);
      app.ringNative.tap({'widget': 'orders', 'app_id': FakeOwnerApi.foodId});
      await settle(tester);
      expect(find.byType(FoodOrdersScreen), findsOneWidget);
      app.ringNative.tap({
        'widget': 'orders',
        'app_id': FakeOwnerApi.restaurantId,
      });
      await settle(tester);
      expect(find.byType(OrdersScreen), findsOneWidget);
    });

    testWidgets('a new order while open: the widget reads again', (
      tester,
    ) async {
      final push = FakePush();
      final app = TestApp(push: push);
      await app.pump(tester);
      final before = app.homeWidget.refreshes;
      push.foregroundController.add(
        const RemoteNotice(
          title: 'New order 1050',
          body: '',
          data: {'kind': 'new_order', 'order_id': '1040'},
        ),
      );
      await settle(tester);
      expect(app.homeWidget.refreshes, before + 1);
    });

    test('Accept opens the order on its accept', () {
      expect(
        pushTarget({
          'kind': 'new_food_order',
          'food_order_id': '47',
          'yb_action': 'accept',
        }).location,
        '/food-orders/47?accept=1',
      );
      expect(
        pushTarget({
          'kind': 'new_order',
          'order_id': '1042',
          'yb_action': 'accept',
        }).location,
        '/orders/1042?accept=1',
      );
      expect(
        pushTarget({'kind': 'new_order', 'order_id': '1042'}).location,
        '/orders/1042',
      );
      expect(
        pushTarget({
          'kind': 'shipment_waiting',
          'shipment_id': 's1',
          'yb_action': 'accept',
        }).location,
        '/shipments/s1',
      );
    });

    testWidgets('Accept on a food order asks the time to prepare at once', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.foodId);
      await app.pump(tester);
      app.ringNative.tap({
        'type': 'owner',
        'kind': 'new_food_order',
        'app_id': FakeOwnerApi.foodId,
        'food_order_id': '47',
        'yb_action': 'accept',
      });
      await settle(tester);
      expect(find.byType(AcceptPanel), findsWidgets);
      expect(app.ringNative.done, [
        {'food_order_id': '47', 'kind': 'new_food_order'},
      ]);
    });

    testWidgets('Accept on a restaurant\'s new order sends it to the kitchen', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.restaurantId);
      await app.pump(tester);
      app.ringNative.tap({
        'type': 'owner',
        'kind': 'new_order',
        'app_id': FakeOwnerApi.restaurantId,
        'order_id': '1042',
        'yb_action': 'accept',
      });
      await settle(tester);
      expect(app.api.calls, contains('changeOrderStatus:preparing'));
      expect(
        app.ringNative.done,
        contains(equals({'order_id': '1042', 'kind': 'new_order'})),
      );
      expect(app.homeWidget.refreshes, greaterThan(0));
    });

    testWidgets('Android gets the words of Accept and Open', (tester) async {
      final app = TestApp(language: 'tr');
      await app.pump(tester);
      await settle(tester);
      expect(app.ringNative.words['accept'], isNotEmpty);
      expect(app.ringNative.words['open'], isNotEmpty);
      expect(app.ringNative.words['accept'], isNot('Accept'));
    });
  });

  group('the new order\'s Live Activity', () {
    testWidgets('signed in, the iPhone\'s tokens go to the server, and again', (
      tester,
    ) async {
      final app = TestApp();
      await app.pump(tester);
      expect(app.api.calls, contains('setLiveActivity'));
      expect(app.api.liveTokens!.start, 'a1a1a1a1a1a1a1a1');
      expect(app.api.liveTokens!.orders.single.orderId, '1040');
      app.live.tokensNow = const LiveTokens(start: 'c3c3c3c3c3c3c3c3');
      app.live.changes.add(null);
      await settle(tester);
      expect(app.api.liveTokens!.start, 'c3c3c3c3c3c3c3c3');
    });

    testWidgets('a new order while open shows on the lock screen', (
      tester,
    ) async {
      final push = FakePush();
      final app = TestApp(push: push, language: 'ar');
      await app.pump(tester);
      push.foregroundController.add(
        const RemoteNotice(
          title: 'طلب جديد F-1047',
          body: '',
          data: {
            'kind': 'new_food_order',
            'app_id': FakeOwnerApi.foodId,
            'food_order_id': '47',
            'order_number': 'F-1047',
            'order_customer': 'Kerem',
            'order_total': '₺246.00',
            'order_placed_at': '1795400000',
          },
        ),
      );
      await settle(tester);
      expect(app.live.started.single, {
        'app_id': FakeOwnerApi.foodId,
        'kind': 'new_food_order',
        'order_id': '47',
        'number': 'F-1047',
        'customer': 'Kerem',
        'total': '₺246.00',
        'placed_at': 1795400000.0,
        'lang': 'ar',
      });
    });

    test('only new orders start one', () {
      expect(
        liveStartArgs({'kind': 'new_message', 'order_id': '1'}, 'en'),
        isNull,
      );
      expect(liveStartArgs({'kind': 'new_order'}, 'en'), isNull);
      expect(
        liveStartArgs({'kind': 'new_order', 'order_id': '1040'}, 'tr'),
        containsPair('number', '1040'),
      );
    });
  });

  group('Time Sensitive (iPhone)', () {
    testWidgets('Ringtones says how order alerts get through Focus', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        final app = TestApp(language: 'tr');
        await app.pump(tester);
        await push(tester, app, Paths.ringtones);
        expect(find.byKey(const ValueKey('ring-focus')), findsOneWidget);
        expect(find.text('Odak modunda sipariş uyarıları'), findsOneWidget);
        await tester.tap(find.byKey(const ValueKey('ring-focus-open')));
        await settle(tester);
        expect(app.ringNative.settingsOpened, 1);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });

    testWidgets('not on Android', (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, Paths.ringtones);
      expect(find.byKey(const ValueKey('ring-focus')), findsNothing);
    });
  });
}
