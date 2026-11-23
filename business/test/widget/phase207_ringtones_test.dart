import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/routing/router.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/services/ringtones.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// Scrolls the screen's list until [finder] is in full view.
Future<void> reach(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.byType(Scrollable).last,
  );
  await tester.ensureVisible(finder);
  await settle(tester);
}

/// 207 Ringtones: the choices, what reaches the server and Android, and the
/// in-app ring of a new order.
void main() {
  group('the choices', () {
    test('each push kind has its group, as the server says', () {
      expect(soundGroupOf({'kind': 'new_order'}), SoundGroup.orders);
      expect(soundGroupOf({'kind': 'new_food_order'}), SoundGroup.orders);
      expect(soundGroupOf({'kind': 'new_market_order'}), SoundGroup.orders);
      expect(soundGroupOf({'kind': 'shipment_waiting'}), SoundGroup.orders);
      expect(soundGroupOf({'kind': 'new_booking'}), SoundGroup.bookings);
      expect(soundGroupOf({'kind': 'order_cancelled'}), SoundGroup.cancelled);
      expect(soundGroupOf({'kind': 'new_chat_message'}), SoundGroup.messages);
      expect(soundGroupOf({'kind': 'build_finished'}), SoundGroup.other);
      // The server's own word wins.
      expect(
        soundGroupOf({'kind': 'new_order', 'yb_group': 'messages'}),
        SoundGroup.messages,
      );
    });

    test('defaults, quiet hours past midnight, and the server JSON', () {
      const s = RingSettings();
      expect(s.soundOf(SoundGroup.orders), 'counter_bell');
      expect(s.rings(SoundGroup.orders), isTrue);
      expect(s.rings(SoundGroup.messages), isFalse);
      final night = s.copyWith(quiet: const QuietHours(23 * 60, 7 * 60));
      expect(night.quiet!.contains(DateTime(2026, 1, 1, 23, 30)), isTrue);
      expect(night.quiet!.contains(DateTime(2026, 1, 1, 6, 59)), isTrue);
      expect(night.quiet!.contains(DateTime(2026, 1, 1, 7)), isFalse);
      // Only orders ring in the quiet hours.
      expect(
        night.soundAt(SoundGroup.messages, DateTime(2026, 1, 1, 1)),
        soundSilent,
      );
      expect(
        night.soundAt(SoundGroup.orders, DateTime(2026, 1, 1, 1)),
        'counter_bell',
      );
      final json = night
          .copyWith(
            sounds: {SoundGroup.orders: 'rush_hour'},
            ring: {SoundGroup.orders, SoundGroup.bookings},
            ringMinutes: 5,
          )
          .toApiJson(timeZone: 'Europe/Istanbul');
      expect(json, {
        'sounds': {
          'orders': 'rush_hour',
          'bookings': 'doorbell',
          'cancelled': 'knock',
          'messages': 'pop',
          'other': 'default',
        },
        'ring': ['orders', 'bookings'],
        'ring_minutes': 5,
        'vibrate': true,
        'alarm_volume': false,
        'quiet': {'from': '23:00', 'to': '07:00'},
        'time_zone': 'Europe/Istanbul',
        // 214 The same sound for every order; the summary at 23:00.
        'by_value': null,
        'summary': {'on': true, 'at': '23:00'},
      });
      // Back from what the phone keeps; unknown sounds and groups dropped.
      expect(RingSettings.fromJson(json), isA<RingSettings>());
      expect(
        RingSettings.fromJson(json).soundOf(SoundGroup.orders),
        'rush_hour',
      );
      final odd = RingSettings.fromJson({
        'sounds': {'orders': 'trumpet', 'kitchen': 'harp'},
        'ring': ['messages'],
        'ring_minutes': 7,
      });
      expect(odd.soundOf(SoundGroup.orders), 'counter_bell');
      expect(odd.ring, isEmpty);
      expect(odd.ringMinutes, 3);
    });

    test('pushes of the new kinds open their screens', () {
      expect(
        pushTarget({'kind': 'new_market_order', 'market_order_id': '12'})
            .location,
        Paths.marketOrder('12'),
      );
      expect(
        pushTarget({'kind': 'new_market_order'}).location,
        Paths.marketTab('orders'),
      );
      expect(
        pushTarget({'kind': 'order_cancelled', 'food_order_id': '3'}).location,
        Paths.foodOrder('3'),
      );
    });
  });

  testWidgets('sends the ringtones to the server after signing in', (
    tester,
  ) async {
    final app = TestApp(push: FakePush());
    await app.pump(tester);
    expect(app.api.pushSounds, isNotNull);
    expect(app.api.pushSounds!['ring'], ['orders']);
    expect(app.api.pushSounds!['time_zone'], 'Europe/Istanbul');
    // Android got the words of its channels.
    expect(app.ringNative.words['group_orders'], 'New orders');
    expect(app.ringNative.words['silence'], 'Silence');
  });

  testWidgets(
    'Settings › Ringtones: choose a sound, ring until opened, quiet hours',
    (tester) async {
      final app = TestApp(push: FakePush());
      await app.pump(tester);
      await push(tester, app, Paths.ringtones);
      expect(find.text('Ringtones'), findsOneWidget);
      expect(find.textContaining('Counter bell'), findsOneWidget);

      // Choose the orders' sound: it plays and is saved everywhere.
      await tester.tap(find.byKey(const ValueKey('ring-group-orders')));
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('ringtone-play-harp')));
      await settle(tester);
      expect(app.ringer.played.last, 'harp');
      await tester.ensureVisible(
        find.byKey(const ValueKey('ringtone-rush_hour')),
      );
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('ringtone-rush_hour')));
      await settle(tester);
      expect(
        app.container.read(ringSettingsProvider).soundOf(SoundGroup.orders),
        'rush_hour',
      );
      expect(app.api.pushSounds!['sounds']['orders'], 'rush_hour');
      expect(
        app.ringNative.configured!.soundOf(SoundGroup.orders),
        'rush_hour',
      );
      await tester.pageBack();
      await settle(tester);
      expect(find.textContaining('Rush hour'), findsOneWidget);

      // Test ring: rings on until stopped.
      await tester.tap(find.byKey(const ValueKey('ring-test')));
      await settle(tester);
      expect(app.ringer.rang.last.$1, 'rush_hour');
      expect(app.ringer.rang.last.$2, const Duration(minutes: 3));
      expect(find.text('Stop'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ring-test')));
      await settle(tester);
      expect(app.ringer.ringing.value, isFalse);

      // Bookings ring too, for at most 5 minutes.
      await reach(tester, find.byKey(const ValueKey('ring-bookings')));
      await tester.tap(find.byKey(const ValueKey('ring-bookings')));
      await settle(tester);
      await reach(tester, find.byKey(const ValueKey('ring-minutes-5')));
      await tester.tap(find.byKey(const ValueKey('ring-minutes-5')));
      await settle(tester);
      expect(app.api.pushSounds!['ring'], ['orders', 'bookings']);
      expect(app.api.pushSounds!['ring_minutes'], 5);

      // Quiet hours, 23:00 to 07:00 to start with.
      await reach(tester, find.byKey(const ValueKey('ring-quiet')));
      await tester.tap(find.byKey(const ValueKey('ring-quiet')));
      await settle(tester);
      expect(app.api.pushSounds!['quiet'], {'from': '23:00', 'to': '07:00'});

      // Android: a real notification to hear.
      await tester.ensureVisible(
        find.byKey(const ValueKey('ring-test-notification')),
      );
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('ring-test-notification')));
      await settle(tester);
      expect(app.ringNative.tests, [SoundGroup.orders]);
      expect(find.textContaining('Lock the phone'), findsOneWidget);
    },
  );

  testWidgets('the screen in Arabic, right to left, and dark', (tester) async {
    final app = TestApp(
      push: FakePush(),
      language: 'ar',
      brightness: Brightness.dark,
    );
    await app.pump(tester);
    await push(tester, app, Paths.ringtones);
    expect(find.text('النغمات'), findsOneWidget);
    expect(find.text('الطلبات الجديدة'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('النغمات'))),
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'a new order while the app is open rings until opened or silenced',
    (tester) async {
      final push = FakePush();
      final app = TestApp(push: push);
      await app.pump(tester);
      push.foregroundController.add(
        const RemoteNotice(
          title: 'New order 1042',
          body: 'Moda Café: ₺1.250,00',
          data: {'kind': 'new_order', 'order_id': '1042'},
        ),
      );
      await settle(tester);
      expect(app.ringer.rang.single.$1, 'counter_bell');
      expect(find.byKey(const ValueKey('ring-banner')), findsOneWidget);
      expect(find.text('New order 1042\nModa Café: ₺1.250,00'), findsOneWidget);
      await tester.tap(find.text('Silence'));
      await settle(tester);
      expect(app.ringer.ringing.value, isFalse);
      expect(find.byKey(const ValueKey('ring-banner')), findsNothing);

      // A message plays once, with no banner.
      push.foregroundController.add(
        const RemoteNotice(
          title: 'Ali',
          body: 'Hi',
          data: {'kind': 'new_chat_message', 'conversation_id': 'c1'},
        ),
      );
      await settle(tester);
      expect(app.ringer.played.last, 'pop');
      expect(find.byKey(const ValueKey('ring-banner')), findsNothing);

      // Open from the banner: it stops and opens the order.
      push.foregroundController.add(
        const RemoteNotice(
          title: 'New order 1043',
          body: '',
          data: {'kind': 'new_order', 'order_id': '1043'},
        ),
      );
      await settle(tester);
      await tester.tap(
        find.descendant(
          of: find.byKey(const ValueKey('ring-banner')),
          matching: find.text('Open'),
        ),
      );
      await settle(tester);
      expect(app.ringer.ringing.value, isFalse);
      expect(app.container.read(routerProvider).state.uri.path, '/orders/1043');
    },
  );

  testWidgets('a ringing notification of Android tapped opens its screen', (
    tester,
  ) async {
    final app = TestApp(push: FakePush());
    await app.pump(tester);
    final stopsBefore = app.ringNative.stops;
    app.ringNative.tap({
      'kind': 'new_food_order',
      'food_order_id': '7',
      'yb_title': 'New food order F-1007',
    });
    await settle(tester);
    expect(
      app.container.read(routerProvider).state.uri.path,
      Paths.foodOrder('7'),
    );
    expect(app.ringNative.stops, greaterThanOrEqualTo(stopsBefore));
  });
}
