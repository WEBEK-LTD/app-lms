import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/auth/social_sign_in.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('welcome: Apple, then Google, then email, then Log in', (
    tester,
  ) async {
    await TestApp.start(tester, signedIn: false);
    final apple = tester.getRect(key('auth-apple'));
    final google = tester.getRect(key('auth-google'));
    final email = tester.getRect(key('auth-email'));
    expect(apple.bottom, lessThan(google.top));
    expect(google.bottom, lessThan(email.top));
    // Google is styled as Apple: the same size.
    expect(google.size, apple.size);
    expect(key('welcome-login'), findsOneWidget);
  });

  testWidgets('Continue with Apple signs in, with a nonce', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(
      tester,
      signedIn: false,
      api: api,
      apple: const _NonceSignIn(),
    );
    await tap(tester, 'auth-apple');
    expect(api.calls, contains('apple:nonce'));
    expect(app.path, Paths.home);
    expect(app.tokens.session?.refreshToken, isNotNull);
  });

  testWidgets('Continue with Google signs in', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, signedIn: false, api: api);
    await tap(tester, 'auth-google');
    expect(api.calls, contains('google'));
    expect(app.path, Paths.home);
  });

  testWidgets('closing the provider sheet stays on welcome', (tester) async {
    final app = await TestApp.start(
      tester,
      signedIn: false,
      google: const FakeSocialSignIn(null),
    );
    await tap(tester, 'auth-google');
    expect(app.path, Paths.welcome);
  });

  testWidgets('sign up with email', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, signedIn: false, api: api);
    await tap(tester, 'auth-email');
    expect(key('auth-name'), findsOneWidget);
    await tester.enterText(key('auth-name'), 'Sara Adel');
    await tester.enterText(key('auth-email-field'), 'sara@example.com');
    await tester.enterText(key('auth-password'), 'a-long-password');
    await tap(tester, 'auth-submit');
    expect(api.calls, contains('signup:sara@example.com'));
    expect(app.path, Paths.home);
  });

  testWidgets('log in with a wrong password shows the error', (tester) async {
    final app = await TestApp.start(tester, signedIn: false);
    await tap(tester, 'welcome-login');
    expect(key('auth-name'), findsNothing);
    await tester.enterText(key('auth-email-field'), 'mohamed@example.com');
    await tester.enterText(key('auth-password'), 'wrong-password');
    await tap(tester, 'auth-submit');
    expect(key('auth-error'), findsOneWidget);
    expect(app.path, isNot(Paths.home));
  });

  testWidgets('log in with email', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, signedIn: false, api: api);
    await tap(tester, 'welcome-login');
    await tester.enterText(key('auth-email-field'), 'mohamed@example.com');
    await tester.enterText(key('auth-password'), api.password);
    await tap(tester, 'auth-submit');
    expect(app.path, Paths.home);
  });

  testWidgets('forgot password sends the email', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, signedIn: false, api: api);
    app.go(Paths.forgot);
    await TestApp.settle(tester);
    await tester.enterText(key('auth-email-field'), 'mohamed@example.com');
    await tap(tester, 'auth-submit');
    expect(api.calls, contains('reset:mohamed@example.com'));
  });

  testWidgets('a signed-out member cannot open a member screen', (
    tester,
  ) async {
    final app = await TestApp.start(tester, signedIn: false);
    app.go(Paths.settings);
    await TestApp.settle(tester);
    expect(app.path, Paths.welcome);
  });

  testWidgets('Arabic runs right to left', (tester) async {
    await TestApp.start(tester, signedIn: false, language: 'ar');
    final context = tester.element(key('auth-apple'));
    expect(Directionality.of(context), TextDirection.rtl);
  });

  // A phone shorter than the design (an iPhone SE, 375 × 667): the words
  // stay above the buttons, the collage shrinks.
  for (final size in [const Size(375, 667), const Size(411, 731)]) {
    testWidgets('welcome fits ${size.width.toInt()} × ${size.height.toInt()}', (
      tester,
    ) async {
      await TestApp.start(tester, signedIn: false);
      tester.view.physicalSize = size * 2;
      await TestApp.settle(tester);
      expect(tester.takeException(), isNull);
      final pitch = tester.getRect(find.textContaining('app makers'));
      final apple = tester.getRect(key('auth-apple'));
      expect(pitch.bottom, lessThan(apple.top));
    });
  }
}

/// Apple's sheet, with the nonce it was given.
class _NonceSignIn implements SocialSignIn {
  const _NonceSignIn();

  @override
  Future<SocialCredential?> signIn() async =>
      const SocialCredential(token: 'apple-token', nonce: 'raw-nonce');
}
