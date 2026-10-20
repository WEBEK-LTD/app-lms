import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/router.dart';
import 'package:yallapp_business/core/theme/theme.dart';
import 'package:yallapp_business/features/orders/kitchen_screen.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 61 The dark theme, Kitchen mode keeping the screen on, moving an
/// appointment and notifications sent later.
void main() {
  Color page(WidgetTester tester) =>
      Theme.of(tester.element(find.byType(Scaffold).last))
          .scaffoldBackgroundColor;

  testWidgets('follows the phone into dark; Settings › Appearance chooses', (
    tester,
  ) async {
    final app = TestApp(brightness: Brightness.dark);
    await app.pump(tester);
    expect(page(tester), Brand.midnight);
    expect(find.text('Today'), findsWidgets);

    await go(tester, app, '/more');
    await tester.scrollUntilVisible(find.text('Appearance'), 200);
    await tapOn(tester, find.text('Appearance'));
    expect(find.text('Same as the phone'), findsOneWidget);
    await tapOn(tester, find.text('Light'));
    expect(page(tester), Brand.ivory);
    expect(app.container.read(settingsProvider).theme, 'light');
    await tapOn(tester, find.text('Dark'));
    expect(page(tester), Brand.midnight);
    await tapOn(tester, find.text('Same as the phone'));
    expect(app.container.read(settingsProvider).theme, isNull);
    expect(page(tester), Brand.midnight);
  });

  testWidgets('dark is kept on this phone, also with a light phone', (
    tester,
  ) async {
    final app = TestApp(preferences: const {'yb.theme': 'dark'});
    await app.pump(tester);
    expect(page(tester), Brand.midnight);
    await go(tester, app, '/more');
    await tester.scrollUntilVisible(find.text('Appearance'), 200);
    expect(find.text('Dark'), findsOneWidget); // Appearance's choice
  });

  for (final language in ['en', 'ar']) {
    testWidgets('screens draw in dark without overflow ($language)', (
      tester,
    ) async {
      final app = TestApp(brightness: Brightness.dark, language: language);
      await app.pump(tester);
      for (final path in ['/orders', '/orders/1042', '/more', '/notify']) {
        await go(tester, app, path);
        expect(tester.takeException(), isNull, reason: path);
        expect(page(tester), Brand.midnight, reason: path);
      }
      await go(tester, app, '/today');
      expect(tester.takeException(), isNull);
      // Text is Ivory on Midnight.
      final text = Theme.of(tester.element(find.byType(Scaffold).last))
          .textTheme
          .bodyMedium!;
      expect(text.color, Brand.ivory);
    });
  }

  testWidgets('Kitchen mode keeps the screen on while it is open', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    expect(app.wake.on, isFalse);
    await push(tester, app, '/kitchen');
    expect(find.byType(KitchenScreen), findsOneWidget);
    expect(app.wake.on, isTrue);
    app.container.read(routerProvider).pop();
    await settle(tester);
    expect(find.byType(KitchenScreen), findsNothing);
    expect(app.wake.on, isFalse);

    // A phone without a wake lock still runs the kitchen.
    app.wake.fail = true;
    await push(tester, app, '/kitchen');
    expect(find.text('New · 1'), findsOneWidget);
    expect(app.wake.on, isFalse);
  });

  testWidgets('an appointment moves to another free time', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.clinicId);
    await app.pump(tester);
    await go(tester, app, '/appointments');
    await tapOn(tester, find.text('Upcoming'));
    expect(find.text('Change time'), findsWidgets);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Change time'));
    expect(find.textContaining('Now on'), findsOneWidget);
    expect(find.text('Anyone free'), findsOneWidget);
    expect(app.api.calls, contains('rescheduleTimes'));

    // Only Dr. Karim's times.
    await tapOn(tester, find.text('Dr. Karim Nabil'));
    final slot = find.descendant(
      of: find.byType(OutlinedButton),
      matching: find.textContaining(RegExp(r'^\d\d:\d\d$')),
    );
    if (slot.evaluate().isEmpty) {
      await tapOn(tester, find.text('Next days'));
    }
    final time = (tester.widget<Text>(slot.first)).data!;
    await tapOn(tester, slot.first);
    expect(find.textContaining('Move to'), findsOneWidget);
    expect(find.textContaining('is told in the app'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Move'));
    expect(
      app.api.calls.where((c) => c.startsWith('reschedule:')).single,
      endsWith(time),
    );
    expect(find.textContaining('Moved to'), findsOneWidget);
    // Back on the list, with Dr. Karim.
    expect(find.text('Change the time'), findsNothing);
    expect(find.textContaining('Dr. Karim Nabil'), findsWidgets);
  });

  testWidgets('moving an appointment in Arabic', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.clinicId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/appointments');
    await tapOn(tester, find.text('القادمة'));
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'تغيير الموعد'));
    expect(find.text('أي شخص متاح'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a notification is scheduled, changed and cancelled', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/notify');
    expect(find.text('Nothing scheduled.'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, 'Title'),
      'Weekend brunch',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Message'),
      'Brunch from 10 on Saturday.',
    );
    await settle(tester, 2);
    await tapOn(tester, find.text('Later'));
    expect(
      find.textContaining("In your app's time zone, Africa/Cairo"),
      findsOneWidget,
    );
    expect(find.text('09:00'), findsOneWidget);
    // The time picker opens; keep 09:00.
    await tapOn(tester, find.text('09:00'));
    await tapOn(tester, find.text('OK'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Schedule'));
    expect(
      app.api.calls.where((c) => c.startsWith('scheduleNotification:')).single,
      endsWith(' 09:00'),
    );
    expect(find.textContaining('Scheduled for'), findsOneWidget);
    expect(find.text('Weekend brunch'), findsWidgets);
    expect(find.textContaining('Goes out'), findsOneWidget);
    expect(app.api.calls, isNot(contains('sendNotification')));

    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Edit'));
    expect(find.text('Change the notification'), findsOneWidget);
    await tester.enterText(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.widgetWithText(TextField, 'Title'),
      ),
      'Saturday brunch',
    );
    await tapOn(tester, find.text('Save changes'));
    expect(
      app.api.calls.where((c) => c.startsWith('editScheduledNotification:')),
      hasLength(1),
    );
    expect(find.text('Saturday brunch'), findsOneWidget);

    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Cancel it'));
    expect(find.text('Cancel this notification?'), findsOneWidget);
    await tapOn(
      tester,
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Cancel it'),
      ),
    );
    expect(app.api.calls, contains('cancelScheduledNotification'));
    expect(find.text('Nothing scheduled.'), findsOneWidget);
  });

  testWidgets('a time already past is refused with the field error', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    final made = app.api.scheduleNotification(
      FakeOwnerApi.restaurantId,
      title: 'Hi',
      body: 'There',
      date: '2020-01-01',
      time: '09:00',
    );
    await expectLater(made, throwsA(isA<Exception>()));
  });
}
