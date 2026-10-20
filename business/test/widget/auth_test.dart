import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/providers.dart';

import '../support/test_app.dart';

void main() {
  Future<void> signIn(
    WidgetTester tester,
    String email,
    String password,
  ) async {
    await tester.enterText(find.byType(TextFormField).at(0), email);
    await tester.enterText(find.byType(TextFormField).at(1), password);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Sign in'));
  }

  testWidgets('signs in with the dashboard email and password', (tester) async {
    final app = TestApp(signedIn: false);
    await app.pump(tester);
    expect(
      find.text('Use the email and password of your Yallapp dashboard.'),
      findsOneWidget,
    );

    await signIn(tester, FakeOwnerApi.demoEmail, FakeOwnerApi.demoPassword);
    expect(app.api.calls, containsAllInOrder(['signIn', 'me']));
    expect(
      find.text('Good morning, Layla').evaluate().isNotEmpty ||
          find.text('Good afternoon, Layla').evaluate().isNotEmpty ||
          find.text('Good evening, Layla').evaluate().isNotEmpty,
      isTrue,
    );
    expect(app.api.devicesList.first.name, 'Pixel 8');
  });

  testWidgets('a wrong password says so', (tester) async {
    final app = TestApp(signedIn: false);
    await app.pump(tester);
    await signIn(tester, FakeOwnerApi.demoEmail, 'nope');
    expect(find.text('The email or password is incorrect.'), findsOneWidget);
  });

  testWidgets('a staff-only account is sent to the website', (tester) async {
    final app = TestApp(signedIn: false)..api.staffOnly = true;
    await app.pump(tester);
    await signIn(tester, FakeOwnerApi.demoEmail, FakeOwnerApi.demoPassword);
    expect(
      find.text('This account has no apps. Use yallapp.com.tr.'),
      findsOneWidget,
    );
    await tapOn(tester, find.text('Open yallapp.com.tr'));
    expect(app.opened, ['https://yallapp.com.tr']);
  });

  testWidgets('shows and hides the password, and opens the reset page', (
    tester,
  ) async {
    final app = TestApp(signedIn: false);
    await app.pump(tester);
    EditableText password() => tester.widget<EditableText>(
      find.descendant(
        of: find.byType(TextFormField).at(1),
        matching: find.byType(EditableText),
      ),
    );
    expect(password().obscureText, isTrue);
    await tapOn(tester, find.byTooltip('Show password'));
    expect(password().obscureText, isFalse);
    await tapOn(tester, find.text('Forgot password?'));
    expect(app.opened, ['https://yallapp.com.tr/forgot-password']);
  });

  testWidgets(
    'the biometric lock turns on after the first sign-in and asks next time',
    (tester) async {
      final bio = FakeBiometrics();
      final app = TestApp(signedIn: false, biometrics: bio);
      await app.pump(tester);
      await signIn(tester, FakeOwnerApi.demoEmail, FakeOwnerApi.demoPassword);
      expect(app.container.read(settingsProvider).biometricLock, isTrue);
    },
  );

  testWidgets('the next launch is locked until the fingerprint matches', (
    tester,
  ) async {
    final again = TestApp(
      biometrics: FakeBiometrics(succeed: false),
      biometricLock: true,
    );
    await again.pump(tester);
    expect(find.text('Yallapp Business is locked'), findsOneWidget);
    expect(find.textContaining("That didn't work"), findsOneWidget);
    again.biometrics!.succeed = true;
    await tapOn(tester, find.text('Unlock'));
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('a pending account sees its state, not the data', (tester) async {
    final api = FakeOwnerApi()
      ..state = AccountState.pending
      ..stateMessage = 'We are checking your details.';
    await TestApp(api: api).pump(tester);
    expect(find.text('Your account is waiting for activation'), findsOneWidget);
    expect(find.text('We are checking your details.'), findsOneWidget);
    expect(api.calls, isNot(contains('today')));
  });

  testWidgets('a suspended account sees its state', (tester) async {
    final api = FakeOwnerApi()..state = AccountState.suspended;
    await TestApp(api: api).pump(tester);
    expect(find.text('Your account is suspended'), findsOneWidget);
  });

  testWidgets('several apps: the switcher comes first', (tester) async {
    final app = TestApp(appId: null);
    await app.pump(tester);
    expect(find.text('Choose an app'), findsOneWidget);
    await tapOn(tester, find.text('Nour Clinic'));
    expect(find.text('Needs you now'), findsOneWidget);
    expect(find.text('Appointments'), findsWidgets);
  });

  testWidgets('the sign-in screen in Arabic reads right to left', (
    tester,
  ) async {
    await TestApp(signedIn: false, language: 'ar').pump(tester);
    expect(find.text('تسجيل الدخول'), findsWidgets);
    final dir = tester.widget<Directionality>(
      find
          .ancestor(
            of: find.text('نسيت كلمة المرور؟'),
            matching: find.byType(Directionality),
          )
          .first,
    );
    expect(dir.textDirection, TextDirection.rtl);
  });

  testWidgets('the sign-in screen in Turkish', (tester) async {
    await TestApp(signedIn: false, language: 'tr').pump(tester);
    expect(find.text('Şifrenizi mi unuttunuz?'), findsOneWidget);
  });
}
