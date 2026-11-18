import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/account/notifications_screen.dart';
import 'package:yallapp/modules/shared/auth/password_screens.dart';
import 'package:yallapp/modules/shared/auth/sign_in_screen.dart';

import '../screenshots/support/leqaa.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 160 The owner (18 November): the four ways an owner picks on App
/// sign-in, each as its words say, alone and together. "Phone number and
/// a code" and "Email address and a code": a 6-digit code every time, no
/// password anywhere (no field, no "Forgot password"). "Email address and
/// password" and "Phone number and password": the password is mandatory,
/// sign-in is the password only (never a code), and "Forgot password"
/// opens the reset with a code by email, or on WhatsApp for the phone,
/// from every sign-in look, never another screen (Notifications).
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

  /// `Config.auth` as the hosted API serves the owner's ways.
  Map<String, dynamic> authFor({
    List<String> codes = const [],
    List<String> passwords = const [],
  }) {
    final channels = {
      ...codes,
      ...passwords,
    }.where((c) => c == 'phone' || c == 'email');
    return {
      ...(configJson()['auth'] as Map<String, dynamic>),
      'methods': [
        for (final c in ['phone', 'email'])
          if (channels.contains(c)) c,
      ],
      if (channels.contains('email')) 'email_sign_in': 'code',
      if (passwords.isNotEmpty)
        'password_sign_in': {
          'by': passwords,
          'codes': codes,
          'recovery': 'email',
          'min_length': 8,
        },
    };
  }

  FakeApi apiFor({
    List<String> codes = const [],
    List<String> passwords = const [],
    Map<String, dynamic>? screens,
    Map<String, dynamic>? verifyResult,
  }) {
    final config = configJson();
    config['auth'] = authFor(codes: codes, passwords: passwords);
    if (screens != null) config['screens'] = screens;
    return FakeApi(config: config, verifyResult: verifyResult);
  }

  Finder passwordField() => find.byType(PasswordField);
  final forgot = find.text('Forgot your password?');
  final forgotScreen = find.byKey(const ValueKey('forgot-password-screen'));

  group('the code ways: a code every time, no password', () {
    for (final codes in [
      ['phone'],
      ['email'],
      ['phone', 'email'],
    ]) {
      testWidgets('${codes.join(' and ')} and a code', (tester) async {
        final app = TestApp(api: apiFor(codes: codes));
        await app.pump(tester);
        expect(passwordField(), findsNothing);
        expect(find.text('Password'), findsNothing);
        expect(forgot, findsNothing);
        expect(find.text('Send code'), findsOneWidget);
        expect(
          find.text('Sign in with your password'),
          findsNothing,
          reason: 'no password to switch to',
        );
        // Both: the switch between them, each a code.
        expect(
          find.text('Email'),
          codes.length == 2 ? findsOneWidget : findsNothing,
        );
        if (codes.first == 'email') {
          await tester.enterText(find.byType(TextField), 'layla@example.com');
          await tester.pump();
          await tester.tap(find.text('Send code'));
          await TestApp.settle(tester);
          expect(app.api.count('requestEmailCode'), 1);
        } else {
          await tester.enterText(find.byType(TextField), '5321234567');
          await tester.pump();
          await tester.tap(find.text('Send code'));
          await TestApp.settle(tester);
          expect(app.api.count('requestOtp'), 1);
        }
        // The code screen next, its code signs in: no password asked.
        await tester.enterText(find.byType(TextField), '123456');
        await TestApp.settle(tester);
        expect(app.api.lastVerifyReset, isFalse);
        expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
        expect(app.api.calls, isNot(contains('signInWithPassword')));
      });
    }
  });

  group('the password ways: the password, never a code', () {
    testWidgets('Email address and password', (tester) async {
      final app = TestApp(api: apiFor(passwords: ['email']));
      await app.pump(tester);
      expect(find.text('Sign in with your password.'), findsOneWidget);
      expect(passwordField(), findsOneWidget);
      expect(forgot, findsOneWidget);
      expect(find.text('Send code'), findsNothing);
      expect(find.text('Sign in with a code instead'), findsNothing);
      expect(find.byKey(const ValueKey('sign-in-ways')), findsNothing);
      await tester.enterText(find.byType(TextField).at(0), 'layla@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
      await tester.pump();
      await tester.tap(find.text('Sign in').last);
      await TestApp.settle(tester);
      expect(app.api.lastEmail, 'layla@example.com');
      expect(app.api.lastPassword, 'Nile-river-2026');
      expect(app.api.calls, isNot(contains('requestEmailCode')));
      expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
    });

    testWidgets('Phone number and password', (tester) async {
      final app = TestApp(api: apiFor(passwords: ['phone']));
      await app.pump(tester);
      expect(passwordField(), findsOneWidget);
      expect(find.text('Mobile number'), findsWidgets);
      expect(find.text('Send code'), findsNothing);
      expect(find.text('Sign in with a code instead'), findsNothing);
      await tester.enterText(find.byType(TextField).at(0), '5321234567');
      await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
      await tester.pump();
      await tester.tap(find.text('Sign in').last);
      await TestApp.settle(tester);
      expect(app.api.lastPasswordPhone, '+905321234567');
      expect(app.api.calls, isNot(contains('requestOtp')));
    });

    testWidgets('both: Email and Phone, each with its password', (
      tester,
    ) async {
      final app = TestApp(api: apiFor(passwords: ['email', 'phone']));
      await app.pump(tester);
      expect(find.byKey(const ValueKey('sign-in-ways')), findsOneWidget);
      expect(passwordField(), findsOneWidget);
      await tester.tap(find.text('Phone'));
      await TestApp.settle(tester);
      expect(passwordField(), findsOneWidget);
      expect(find.text('Send code'), findsNothing);
      expect(find.text('Mobile number'), findsWidgets);
    });

    testWidgets(
      'a code and a password saved on one channel: the password only',
      (tester) async {
        // As an owner could save it before 160: both phone ways on.
        final config = configJson();
        config['auth'] = {
          ...authFor(passwords: ['phone']),
          'password_sign_in': {
            'by': ['phone'],
            'codes': ['phone'],
            'recovery': 'phone',
            'min_length': 8,
          },
        };
        final app = TestApp(api: FakeApi(config: config));
        await app.pump(tester);
        expect(
          app.container.read(appConfigProvider).auth.passwordSignIn!.codes,
          isEmpty,
        );
        expect(passwordField(), findsOneWidget);
        expect(find.text('Sign in with a code instead'), findsNothing);
        expect(find.byKey(const ValueKey('sign-in-ways')), findsNothing);
        expect(find.text('Send code'), findsNothing);
      },
    );

    testWidgets('a new account checks its address once and sets a password', (
      tester,
    ) async {
      final app = TestApp(
        api: apiFor(
          passwords: ['email'],
          verifyResult: {
            'signup_required': true,
            'signup_token': 'signup-1',
            'fields': ['name', 'password'],
          },
        ),
      );
      await app.pump(tester);
      await tester.tap(find.text('Create an account'));
      await TestApp.settle(tester);
      // The code is for creating the account only.
      expect(passwordField(), findsNothing);
      expect(find.text('Send code'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'layla@example.com');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      await tester.enterText(find.byType(TextField), '123456');
      await TestApp.settle(tester);
      expect(find.text('Create your account'), findsOneWidget);
      final fields = find.byType(TextFormField);
      expect(fields, findsNWidgets(3), reason: 'the name, the password twice');
      await tester.enterText(fields.at(0), 'Layla Hassan');
      await tester.tap(find.text('Create account'));
      await TestApp.settle(tester);
      expect(
        app.api.calls,
        isNot(contains('register')),
        reason: 'no account without its password',
      );
      await tester.enterText(fields.at(1), 'Nile-river-2026');
      await tester.enterText(fields.at(2), 'Nile-river-2026');
      await tester.tap(find.text('Create account'));
      await TestApp.settle(tester);
      expect(app.api.lastRegister?.password, 'Nile-river-2026');
    });
  });

  group('a code way and a password way together', () {
    testWidgets('Phone number and a code, with Email address and password', (
      tester,
    ) async {
      final app = TestApp(
        api: apiFor(codes: ['phone'], passwords: ['email']),
      );
      await app.pump(tester);
      final ways = find.byKey(const ValueKey('sign-in-ways'));
      expect(ways, findsOneWidget);
      // Email: its password, no code.
      expect(passwordField(), findsOneWidget);
      expect(find.text('Send code'), findsNothing);
      expect(forgot, findsOneWidget);
      // Phone: a code, no password, no Forgot password.
      await tester.tap(find.descendant(of: ways, matching: find.text('Phone')));
      await TestApp.settle(tester);
      expect(passwordField(), findsNothing);
      expect(forgot, findsNothing);
      expect(find.text('Send code'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '5321234567');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      expect(app.api.count('requestOtp'), 1);
      expect(app.api.calls, isNot(contains('requestEmailCode')));
    });

    testWidgets('Email address and a code, with Phone number and password', (
      tester,
    ) async {
      final app = TestApp(
        api: apiFor(codes: ['email'], passwords: ['phone']),
      );
      await app.pump(tester);
      final ways = find.byKey(const ValueKey('sign-in-ways'));
      expect(ways, findsOneWidget);
      expect(passwordField(), findsOneWidget, reason: 'the password first');
      expect(find.text('Mobile number'), findsWidgets);
      await tester.tap(find.descendant(of: ways, matching: find.text('Email')));
      await TestApp.settle(tester);
      expect(passwordField(), findsNothing);
      expect(forgot, findsNothing);
      expect(find.text('Send code'), findsOneWidget);
      await tester.tap(find.descendant(of: ways, matching: find.text('Phone')));
      await TestApp.settle(tester);
      expect(passwordField(), findsOneWidget);
      expect(find.text('Send code'), findsNothing);
    });

    testWidgets('the premium look: the same ways on its card', (tester) async {
      final app = TestApp(
        api: apiFor(
          codes: ['phone'],
          passwords: ['email'],
          screens: {
            'sign_in': {'style': 'premium', 'image_url': null},
          },
        ),
      );
      await app.pump(tester);
      expect(
        find.byKey(const ValueKey('sign-in-premium-card')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('sign-in-ways')), findsOneWidget);
      expect(find.byKey(const ValueKey('sign-in-other')), findsNothing);
      expect(passwordField(), findsOneWidget);
      await tester.tap(find.text('Phone'));
      await TestApp.settle(tester);
      expect(passwordField(), findsNothing);
      expect(find.byKey(const ValueKey('phone-field')), findsOneWidget);
    });
  });

  group('Forgot password opens the reset, from every sign-in look', () {
    final looks = <String, Map<String, dynamic>?>{
      'the classic look': null,
      'the photo look': {
        'sign_in': {'style': 'photo', 'image_url': 'https://x.test/p.jpg'},
      },
      'the card look': {
        'sign_in': {'style': 'card', 'image_url': 'https://x.test/p.jpg'},
      },
      'the minimal look': {
        'sign_in': {'style': 'minimal'},
      },
      'the premium look': {
        'sign_in': {'style': 'premium'},
      },
      'the system screens\' petal look': {
        'system': {'look': 'petal'},
      },
      'the system screens\' glass look': {
        'system': {'look': 'glass'},
      },
    };
    for (final MapEntry(key: name, value: screens) in looks.entries) {
      testWidgets(name, (tester) async {
        final app = TestApp(
          api: apiFor(passwords: ['email', 'phone'], screens: screens),
        );
        await app.pump(tester);
        await tester.ensureVisible(forgot);
        await tester.tap(forgot);
        await TestApp.settle(tester);
        expect(forgotScreen, findsOneWidget);
        expect(find.byType(NotificationsScreen), findsNothing);
        // The way in use: the email address, so the code goes by email.
        expect(find.text('Email address'), findsWidgets);
        expect(find.text('Mobile number'), findsNothing);
      });
    }

    testWidgets('the phone number: the code on WhatsApp', (tester) async {
      final app = TestApp(
        api: apiFor(
          passwords: ['email', 'phone'],
          verifyResult: {'reset_token': 'reset-1', 'expires_in_seconds': 900},
        ),
      );
      await app.pump(tester);
      await tester.tap(find.text('Phone'));
      await TestApp.settle(tester);
      await tester.tap(forgot);
      await TestApp.settle(tester);
      expect(forgotScreen, findsOneWidget);
      expect(find.text('Mobile number'), findsWidgets);
      await tester.enterText(find.byType(TextField), '5321234567');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      expect(app.api.count('requestOtp'), 1);
      expect(app.api.calls, isNot(contains('requestEmailCode')));
      await tester.enterText(find.byType(TextField), '481902');
      await TestApp.settle(tester);
      expect(app.api.lastVerifyReset, isTrue);
      expect(find.text('Choose a new password'), findsOneWidget);
    });

    testWidgets('the email address: the code by email', (tester) async {
      final app = TestApp(api: apiFor(passwords: ['email', 'phone']));
      await app.pump(tester);
      await tester.tap(forgot);
      await TestApp.settle(tester);
      await tester.enterText(find.byType(TextField), 'layla@example.com');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      expect(app.api.count('requestEmailCode'), 1);
      expect(app.api.lastEmail, 'layla@example.com');
    });

    testWidgets('a username: its own channel', (tester) async {
      final config = configJson();
      config['auth'] = {
        ...authFor(passwords: ['username']),
        'methods': ['phone'],
        'password_sign_in': {
          'by': ['username'],
          'codes': <String>[],
          'recovery': 'phone',
          'min_length': 8,
        },
      };
      final app = TestApp(api: FakeApi(config: config));
      await app.pump(tester);
      await tester.tap(forgot);
      await TestApp.settle(tester);
      expect(forgotScreen, findsOneWidget);
      expect(find.text('Mobile number'), findsWidgets);
      expect(find.text('Email address'), findsNothing);
    });

    testWidgets('Leqaa, with its Studio pages around Notifications', (
      tester,
    ) async {
      final api = leqaaStudioApi(look: leqaaDemo);
      api.config = {
        ...api.config,
        'auth': authFor(codes: ['phone'], passwords: ['email']),
      };
      final app = TestApp(api: api, appType: AppType.store);
      await app.pump(tester);
      final router = app.container.read(appRouterProvider);
      expect(find.byKey(const ValueKey('chrome-auth-petal')), findsOneWidget);
      await tester.ensureVisible(forgot);
      await tester.tap(forgot);
      await TestApp.settle(tester);
      expect(forgotScreen, findsOneWidget);
      expect(find.byType(NotificationsScreen), findsNothing);
      expect(
        router.routerDelegate.currentConfiguration.last.matchedLocation,
        Paths.signInForgot,
      );
    });
  });

  group('signed in from a sign-in opened over the app', () {
    // The root of "Forgot password opens Notifications": the bell of a
    // page's header pushes sign-in (`from=/notifications`); once signed in
    // its screens stayed (the redirect reads the place under them), and
    // "Forgot password" there, now signed in, was sent to Notifications.
    testWidgets('with the password: sign-in closes, Notifications opens', (
      tester,
    ) async {
      final app = TestApp(api: apiFor(passwords: ['email']), guest: true);
      await app.pump(tester);
      final router = app.container.read(appRouterProvider);
      router.push(Paths.notifications);
      await TestApp.settle(tester);
      expect(find.byType(SignInScreen), findsOneWidget);
      expect(find.byType(NotificationsScreen), findsNothing);
      await tester.enterText(find.byType(TextField).at(0), 'layla@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'Nile-river-2026');
      await tester.pump();
      await tester.tap(find.text('Sign in').last);
      await TestApp.settle(tester);
      expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
      expect(find.byType(SignInScreen), findsNothing);
      expect(forgot, findsNothing);
      expect(find.byType(NotificationsScreen), findsOneWidget);
      // Back to where the bell was.
      router.pop();
      await TestApp.settle(tester);
      expect(find.byType(NotificationsScreen), findsNothing);
      expect(
        Paths.isSignIn(
          router.routerDelegate.currentConfiguration.last.matchedLocation,
        ),
        isFalse,
      );
    });

    testWidgets(
      'after Forgot password: the new password signs in and every sign-in screen closes',
      (tester) async {
        final app = TestApp(
          api: apiFor(
            passwords: ['email', 'phone'],
            verifyResult: {'reset_token': 'reset-1', 'expires_in_seconds': 900},
          ),
          guest: true,
        );
        await app.pump(tester);
        final router = app.container.read(appRouterProvider);
        router.push(Paths.signIn);
        await TestApp.settle(tester);
        await tester.tap(forgot);
        await TestApp.settle(tester);
        expect(forgotScreen, findsOneWidget);
        await tester.enterText(find.byType(TextField), 'layla@example.com');
        await tester.pump();
        await tester.tap(find.text('Send code'));
        await TestApp.settle(tester);
        await tester.enterText(find.byType(TextField), '481902');
        await TestApp.settle(tester);
        final fields = find.byType(TextFormField);
        await tester.enterText(fields.at(0), 'Desert-wind-77');
        await tester.enterText(fields.at(1), 'Desert-wind-77');
        await tester.tap(find.text('Save and sign in'));
        await TestApp.settle(tester);
        expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
        expect(find.byType(SignInScreen), findsNothing);
        expect(find.byType(NewPasswordScreen), findsNothing);
        expect(forgotScreen, findsNothing);
        expect(find.byType(NotificationsScreen), findsNothing);
        expect(
          Paths.isSignIn(
            router.routerDelegate.currentConfiguration.last.matchedLocation,
          ),
          isFalse,
        );
      },
    );

    testWidgets('with a code: the code screen closes too', (tester) async {
      final app = TestApp(api: apiFor(codes: ['phone']), guest: true);
      await app.pump(tester);
      final router = app.container.read(appRouterProvider);
      router.push(Paths.notifications);
      await TestApp.settle(tester);
      await tester.enterText(find.byType(TextField), '5321234567');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      await tester.enterText(find.byType(TextField), '123456');
      await TestApp.settle(tester);
      expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
      expect(find.byType(SignInScreen), findsNothing);
      expect(find.byType(NotificationsScreen), findsOneWidget);
    });
  });

  test('reads which channel each way and Forgot password use', () {
    final rules = PasswordSignIn.fromJson({
      'by': ['phone', 'username'],
      'codes': ['phone', 'email'],
      'recovery': 'email',
    })!;
    expect(rules.codes, isEmpty, reason: 'both channels are passwords');
    expect(rules.resetChannelFor(PasswordWay.phone), SignInMethod.phone);
    expect(rules.resetChannelFor(PasswordWay.username), SignInMethod.email);
    final mixed = PasswordSignIn.fromJson({
      'by': ['email'],
      'codes': ['phone'],
    })!;
    expect(mixed.codes, [SignInMethod.phone]);
    expect(mixed.signInWays, [PasswordWay.email, PasswordWay.phone]);
  });
}
