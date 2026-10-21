import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';

import '../support/test_app.dart';

/// 70 Two-step sign-in: an account that has it is asked for the code from
/// its authenticator app after the password (in English, Arabic and
/// Turkish), a wrong code says so, the right one signs in, and another
/// account goes back to the email and password. The fake answers
/// `two_factor_required` and `invalid_two_factor_code` like the server.
void main() {
  Future<void> signIn(WidgetTester tester, {String label = 'Sign in'}) async {
    await tester.enterText(
      find.byType(TextFormField).at(0),
      FakeOwnerApi.demoEmail,
    );
    await tester.enterText(
      find.byType(TextFormField).at(1),
      FakeOwnerApi.demoPassword,
    );
    await tapOn(tester, find.widgetWithText(FilledButton, label));
  }

  testWidgets('asks for the code after the password, once it is right', (
    tester,
  ) async {
    final app = TestApp(signedIn: false)..api.twoStepCode = '123456';
    await app.pump(tester);
    await signIn(tester);
    expect(find.text('Enter your code'), findsOneWidget);
    expect(
      find.text(
        'Your account uses two-step sign-in. Open your authenticator app and enter the 6-digit code it shows for Yallapp.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('Lost your phone? Enter one of your recovery codes instead.'),
      findsOneWidget,
    );
    // No device yet: the password alone isn't enough.
    expect(app.api.devicesList.where((d) => d.current), isEmpty);
    expect(find.byType(TextFormField), findsOneWidget);

    // Empty, then wrong, then right.
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Verify and sign in'),
    );
    expect(
      find.text(
        'Enter the 6-digit code from your authenticator app, or a recovery code.',
      ),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextFormField), '000000');
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Verify and sign in'),
    );
    expect(
      find.text("That code isn't right. Try again, or use a recovery code."),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextFormField), '123 456');
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Verify and sign in'),
    );
    expect(app.api.devicesList.first.current, isTrue);
    expect(find.text('Enter your code'), findsNothing);
    expect(
      app.api.calls.where((c) => c == 'signIn'),
      hasLength(3),
      reason: 'the password, the wrong code, the right code',
    );
  });

  testWidgets('another account goes back to the email and password', (
    tester,
  ) async {
    final app = TestApp(signedIn: false)..api.twoStepCode = '123456';
    await app.pump(tester);
    await signIn(tester);
    await tapOn(tester, find.text('Sign in with another account'));
    expect(find.text('Enter your code'), findsNothing);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
  });

  testWidgets('an account without it signs in with the password only', (
    tester,
  ) async {
    final app = TestApp(signedIn: false);
    await app.pump(tester);
    await signIn(tester);
    expect(find.text('Enter your code'), findsNothing);
    expect(app.api.devicesList.first.current, isTrue);
  });

  for (final (language, title, verify, signInLabel) in [
    ('ar', 'أدخل الرمز', 'تحقّق وسجّل الدخول', 'تسجيل الدخول'),
    ('tr', 'Kodunuzu girin', 'Doğrula ve giriş yap', 'Giriş yap'),
  ]) {
    testWidgets('asks for the code in $language', (tester) async {
      final app = TestApp(signedIn: false, language: language)
        ..api.twoStepCode = '654321';
      await app.pump(tester);
      await signIn(tester, label: signInLabel);
      expect(find.text(title), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.enterText(find.byType(TextFormField), '654321');
      await tapOn(tester, find.widgetWithText(FilledButton, verify));
      expect(app.api.devicesList.first.current, isTrue);
    });
  }

  test('the fake answers like the server', () async {
    final api = FakeOwnerApi()..twoStepCode = '111222';
    Future<void> attempt(String? otp) => api.signIn(
      email: FakeOwnerApi.demoEmail,
      password: FakeOwnerApi.demoPassword,
      device: const DeviceInfo(name: 'Pixel', platform: 'android'),
      otp: otp,
    );
    await expectLater(
      attempt(null),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          ApiException.twoFactorRequired,
        ),
      ),
    );
    await attempt('111222');
    // Each code once.
    await expectLater(
      attempt('111222'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          ApiException.invalidTwoFactorCode,
        ),
      ),
    );
  });
}
