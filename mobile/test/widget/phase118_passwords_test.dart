import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 118 Yallapp Studio apps that sign in with a password: the email, the
/// phone number or the username; creating an account with a code; a
/// forgotten password; changing it.
void main() {
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  Map<String, dynamic> studioConfig({
    List<String> by = const ['email', 'username'],
    List<String> codes = const [],
    List<String> methods = const ['email'],
  }) {
    final config = configJson();
    config['auth'] = {
      ...config['auth'] as Map<String, dynamic>,
      'methods': methods,
      'email_sign_in': 'code',
      'password_sign_in': {
        'by': by,
        'codes': codes,
        'recovery': 'email',
        'min_length': 8,
      },
    };
    return config;
  }

  test('reads Config.auth.password_sign_in', () {
    final rules = AuthRules.fromJson(
      studioConfig(by: ['email', 'phone', 'username'])['auth']
          as Map<String, dynamic>,
    );
    final passwords = rules.passwordSignIn!;
    expect(passwords.by, PasswordWay.values);
    expect(passwords.codes, isEmpty);
    expect(passwords.recovery, SignInMethod.email);
    expect(passwords.resetChannels, [SignInMethod.phone, SignInMethod.email]);
    expect(
      AuthRules.fromJson(configJson()['auth'] as Map<String, dynamic>)
          .passwordSignIn,
      isNull,
    );
    expect(
      VerifyResult.fromJson({'reset_token': 'r-1', 'expires_in_seconds': 900}),
      isA<PasswordReset>(),
    );
  });

  testWidgets('signs in with the email or the username and the password', (
    tester,
  ) async {
    final app = TestApp(api: FakeApi(config: studioConfig()));
    await app.pump(tester);

    expect(find.text('Sign in with your password.'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Username'), findsWidgets);
    expect(find.text('Send code'), findsNothing);
    expect(
      find.text('Sign in with a code instead'),
      findsNothing,
      reason: 'passwords only',
    );

    await tester.enterText(find.byType(TextField).at(0), 'layla@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
    await tester.pump();
    await tester.tap(find.text('Sign in').last);
    await TestApp.settle(tester);

    expect(app.api.lastEmail, 'layla@example.com');
    expect(app.api.lastPassword, 'Nile-river-2026');
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
  });

  testWidgets('signs in with a username', (tester) async {
    final app = TestApp(api: FakeApi(config: studioConfig()));
    await app.pump(tester);

    await tester.tap(find.text('Username').first);
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField).at(0), 'layla.h');
    await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
    await tester.pump();
    await tester.tap(find.text('Sign in').last);
    await TestApp.settle(tester);

    expect(app.api.lastUsername, 'layla.h');
    expect(app.api.lastEmail, isNull);
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
  });

  testWidgets('sets a forgotten password again with a code', (tester) async {
    final app = TestApp(
      api: FakeApi(
        config: studioConfig(),
        verifyResult: {'reset_token': 'reset-1', 'expires_in_seconds': 900},
      ),
    );
    await app.pump(tester);

    await tester.tap(find.text('Forgot your password?'));
    await TestApp.settle(tester);
    expect(find.text('Forgot your password?'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'layla@example.com');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    expect(app.api.lastEmail, 'layla@example.com');

    await tester.enterText(find.byType(TextField), '481902');
    await TestApp.settle(tester);
    expect(app.api.lastVerifyReset, isTrue);
    expect(find.text('Choose a new password'), findsOneWidget);

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'short');
    await tester.enterText(fields.at(1), 'short');
    await tester.tap(find.text('Save and sign in'));
    await TestApp.settle(tester);
    expect(find.text('At least 8 characters'), findsOneWidget);
    expect(app.api.calls, isNot(contains('resetPassword')));

    await tester.enterText(fields.at(0), 'Desert-wind-77');
    await tester.enterText(fields.at(1), 'Desert-wind-78');
    await tester.tap(find.text('Save and sign in'));
    await TestApp.settle(tester);
    expect(find.text("The passwords don't match."), findsOneWidget);

    await tester.enterText(fields.at(1), 'Desert-wind-77');
    await tester.tap(find.text('Save and sign in'));
    await TestApp.settle(tester);
    expect(app.api.lastResetToken, 'reset-1');
    expect(app.api.lastPassword, 'Desert-wind-77');
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
  });

  testWidgets('creates an account with a code, a username and a password', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeApi(
        config: studioConfig(),
        verifyResult: {
          'signup_required': true,
          'signup_token': 'signup-1',
          'fields': ['name', 'username', 'password'],
        },
      ),
    );
    await app.pump(tester);

    await tester.tap(find.text('Create an account'));
    await TestApp.settle(tester);
    expect(find.text('Send code'), findsOneWidget);
    expect(find.text('Sign in with your password'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'layla@example.com');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), '123456');
    await TestApp.settle(tester);

    expect(find.text('Create your account'), findsOneWidget);
    final fields = find.byType(TextFormField);
    expect(fields, findsNWidgets(4), reason: 'name, username, password twice');
    await tester.enterText(fields.at(0), 'Layla Hassan');
    await tester.enterText(fields.at(1), '1 bad name');
    await tester.enterText(fields.at(2), 'Nile-river-2026');
    await tester.enterText(fields.at(3), 'Nile-river-2026');
    await tester.tap(find.text('Create account'));
    await TestApp.settle(tester);
    expect(app.api.calls, isNot(contains('register')));

    await tester.enterText(fields.at(1), 'Layla.H');
    await tester.tap(find.text('Create account'));
    await TestApp.settle(tester);
    expect(app.api.lastRegister?.username, 'Layla.H');
    expect(app.api.lastRegister?.password, 'Nile-river-2026');
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
  });

  testWidgets('offers a code too where the owner kept codes', (tester) async {
    final app = TestApp(
      api: FakeApi(
        config: studioConfig(
          by: ['phone'],
          codes: ['phone'],
          methods: ['phone'],
        ),
      ),
    );
    await app.pump(tester);

    expect(find.text('Email'), findsNothing, reason: 'one way: no switch');
    await tester.tap(find.text('Sign in with a code instead'));
    await TestApp.settle(tester);
    expect(find.text('Send code'), findsOneWidget);
    await tester.tap(find.text('Sign in with your password'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField).at(0), '5321234567');
    await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
    await tester.pump();
    await tester.tap(find.text('Sign in').last);
    await TestApp.settle(tester);
    expect(app.api.lastPasswordPhone, '+905321234567');
  });

  testWidgets('changes the password from Settings', (tester) async {
    final app = TestApp(api: FakeApi(config: studioConfig()), signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    await tester.scrollUntilVisible(find.text('Change password'), 200);
    await tester.tap(find.text('Change password'));
    await TestApp.settle(tester);

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Nile-river-2026');
    await tester.enterText(fields.at(1), 'Desert-wind-77');
    await tester.enterText(fields.at(2), 'Desert-wind-77');
    await tester.tap(find.text('Change password').last);
    await TestApp.settle(tester);
    expect(app.api.lastCurrentPassword, 'Nile-river-2026');
    expect(app.api.lastPassword, 'Desert-wind-77');
    expect(
      find.text(
        'Your password was changed. Your other phones were signed out.',
      ),
      findsOneWidget,
    );
  });
}
