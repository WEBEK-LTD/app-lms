import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('Preview your app opens the preview link in the app', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/preview');
    expect(
      find.byKey(
        ValueKey(
          'web:https://yallapp.com.tr/preview-app/?app=${FakeOwnerApi.restaurantId}',
        ),
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.text('Show unpublished pages'));
    expect(
      find.byKey(
        ValueKey(
          'web:https://yallapp.com.tr/preview-app/?app=${FakeOwnerApi.restaurantId}&draft=1',
        ),
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.byTooltip('Open in the browser'));
    expect(app.opened.single, contains('draft=1'));
  });

  testWidgets('Builds & publishing: read-only, downloads open in the browser', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/builds');
    expect(find.text('We publish for you'), findsOneWidget);
    expect(find.text('In review'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Google Play (AAB)'), 200);
    await tapOn(tester, find.text('Google Play (AAB)'));
    expect(app.opened, ['https://yallapp.com.tr/d/aab']);
    await tester.scrollUntilVisible(
      find.text('The iOS signing certificate has expired.'),
      200,
    );
    expect(
      find.textContaining(
        RegExp('start a build|new build now', caseSensitive: false),
      ),
      findsNothing,
    );
  });

  testWidgets('More: the tools, plan & storage read-only, help and legal', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'More'));
    expect(find.text('Kitchen mode'), findsOneWidget);
    expect(find.text('Media'), findsOneWidget);
    expect(find.text('App users'), findsOneWidget);
    expect(find.text('Scan tickets'), findsNothing);

    await tapOn(tester, find.text('Plan & storage'));
    expect(find.text('Growth'), findsOneWidget);
    expect(find.text('Push notifications'), findsOneWidget);
    await tapOn(tester, find.text('Manage on yallapp.com.tr'));
    expect(app.opened.last, 'https://yallapp.com.tr/dashboard/license');
    // Nothing is bought in the app.
    expect(
      find.textContaining(
        RegExp(r'\bbuy\b|purchase|subscribe|upgrade', caseSensitive: false),
      ),
      findsNothing,
    );
    await tester.pageBack();
    await settle(tester);

    await tester.scrollUntilVisible(find.text('Talk to us on WhatsApp'), 200);
    await tapOn(tester, find.text('Talk to us on WhatsApp'));
    expect(app.opened.last, 'https://wa.me/201000000000');
    await tester.scrollUntilVisible(find.text('Privacy policy'), 200);
    await tapOn(tester, find.text('Privacy policy'));
    expect(app.opened.last, 'https://yallapp.com.tr/privacy');
    await tester.scrollUntilVisible(find.text('Delete my account'), 200);
    await tapOn(tester, find.text('Delete my account'));
    expect(app.opened.last, 'https://yallapp.com.tr/delete-account');
    await tester.scrollUntilVisible(find.text('Version 1.0.0 (1)'), 200);
  });

  testWidgets('iOS: plan & storage read-only, without the website link', (
    tester,
  ) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      final app = TestApp();
      await app.pump(tester);
      await tapOn(tester, find.widgetWithText(NavigationDestination, 'More'));
      await tapOn(tester, find.text('Plan & storage'));
      expect(find.text('Growth'), findsOneWidget);
      expect(
        find.text('Your plan and storage are shown here for your information.'),
        findsOneWidget,
      );
      expect(find.text('Manage on yallapp.com.tr'), findsNothing);
      expect(find.textContaining('yallapp.com.tr'), findsNothing);
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  });

  testWidgets('iOS: Media shows storage without the website link', (
    tester,
  ) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      final app = TestApp();
      await app.pump(tester);
      await tapOn(tester, find.widgetWithText(NavigationDestination, 'More'));
      await tapOn(tester, find.text('Media'));
      expect(find.text('Storage'), findsWidgets);
      expect(find.text('Manage on yallapp.com.tr'), findsNothing);
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  });

  testWidgets('Language: Turkish for the app and the account', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/settings/language');
    await tapOn(tester, find.text('Türkçe'));
    expect(app.api.language, 'tr');
    expect(find.text('Dil'), findsOneWidget);
    await go(tester, app, '/today');
    expect(find.text('Şimdi sizi bekleyenler'), findsOneWidget);
  });

  testWidgets('Legal links follow the language', (tester) async {
    final app = TestApp(language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/more');
    await tester.scrollUntilVisible(find.text('شروط الخدمة'), 200);
    await tapOn(tester, find.text('شروط الخدمة'));
    expect(app.opened.last, 'https://yallapp.com.tr/ar/terms');
  });

  testWidgets('Notifications: one switch per kind', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/settings/notifications');
    expect(find.text('New orders'), findsOneWidget);
    // 63 Reviews of courses push too now.
    expect(find.text('New reviews'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(SwitchListTile, 'Builds'));
    expect(app.api.preferences.isOn(PushKind.buildFinished), isFalse);
    expect(app.api.preferences.isOn(PushKind.newOrder), isTrue);
  });

  testWidgets('Signed-in devices: sign one out, then sign out', (tester) async {
    final app = TestApp();
    app.api.devicesList.insert(
      0,
      Device(
        id: 'd0000000-0000-4000-8000-000000000001',
        name: 'Pixel 8',
        platform: 'android',
        createdAt: DateTime.now(),
        lastSeenAt: DateTime.now(),
        current: true,
        push: true,
      ),
    );
    await app.pump(tester);
    await push(tester, app, '/settings/devices');
    expect(find.textContaining('This phone'), findsOneWidget);
    expect(find.text('iPad of Layla'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(TextButton, 'Sign out'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Sign out'));
    expect(find.text('iPad of Layla'), findsNothing);

    await tapOn(tester, find.text('Sign out every phone'));
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Sign out every phone'),
    );
    expect(
      find.text('Use the email and password of your Yallapp dashboard.'),
      findsOneWidget,
    );
    expect(app.api.calls, contains('signOutAll'));
  });

  testWidgets('Sign out from More', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/more');
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Sign out'),
      200,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Sign out'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Sign out'));
    expect(find.text('Sign in'), findsWidgets);
    expect(app.api.calls, contains('signOut'));
  });

  testWidgets(
    'the biometric switch asks for the fingerprint before turning on',
    (tester) async {
      final bio = FakeBiometrics();
      final app = TestApp(biometrics: bio, biometricLock: false);
      await app.pump(tester);
      await go(tester, app, '/more');
      final tile = find.widgetWithText(
        SwitchListTile,
        'Unlock with fingerprint or face',
      );
      await tester.scrollUntilVisible(tile, 200);
      await tapOn(tester, tile);
      expect(bio.prompts, 1);
      expect(tester.widget<SwitchListTile>(tile).value, isTrue);
    },
  );
}
