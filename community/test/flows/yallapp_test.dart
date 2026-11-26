import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/auth/session.dart';
import 'package:yallapp_community/core/auth/yallapp_sign_in.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  Future<TestApp> start(
    WidgetTester tester, {
    required FakeCommunityApi api,
    required FakeYallappAuthSession session,
    bool signedIn = false,
  }) => TestApp.start(
    tester,
    signedIn: signedIn,
    api: api,
    overrides: [yallappAuthSessionProvider.overrideWithValue(session)],
  );

  test('the PKCE challenge is RFC 7636\'s', () {
    expect(
      YallappSignIn.challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  testWidgets('welcome: Apple, Google, Yallapp, then email; one size', (
    tester,
  ) async {
    await TestApp.start(tester, signedIn: false);
    final rects = [
      for (final k in [
        'auth-apple',
        'auth-google',
        'auth-yallapp',
        'auth-email',
      ])
        tester.getRect(key(k)),
    ];
    for (var i = 1; i < rects.length; i++) {
      expect(rects[i - 1].bottom, lessThan(rects[i].top));
      expect(rects[i].size, rects[0].size);
    }
  });

  testWidgets('Continue with Yallapp signs in through the confirm page', (
    tester,
  ) async {
    final api = FakeCommunityApi();
    final session = FakeYallappAuthSession.confirming();
    final app = await start(tester, api: api, session: session);
    await tap(tester, 'auth-yallapp');
    // The page had the challenge and a state; the code came back with the
    // verifier that matches it (the fake refuses any other).
    expect(session.opened?.queryParameters['state'], api.yallappState);
    expect(
      api.calls,
      containsAllInOrder(['yallapp-start', 'yallapp:demo-code']),
    );
    expect(app.path, Paths.home);
    expect(app.tokens.session?.refreshToken, isNotNull);
  });

  testWidgets('an answer with another state is refused', (tester) async {
    final api = FakeCommunityApi();
    final app = await start(
      tester,
      api: api,
      session: FakeYallappAuthSession(
        (_) => Uri.parse('yallappcommunity://auth/yallapp?code=x&state=forged'),
      ),
    );
    await tap(tester, 'auth-yallapp');
    expect(api.calls.where((c) => c.startsWith('yallapp:')), isEmpty);
    expect(app.path, Paths.welcome);
  });

  for (final (name, back) in [
    ('closing the page', null),
    ('saying no on the page', 'error=access_denied'),
  ]) {
    testWidgets('$name stays on welcome', (tester) async {
      final api = FakeCommunityApi();
      final app = await start(
        tester,
        api: api,
        session: FakeYallappAuthSession(
          (page) => back == null
              ? null
              : Uri.parse(
                  'yallappcommunity://auth/yallapp?$back'
                  '&state=${page.queryParameters['state']}',
                ),
        ),
      );
      await tap(tester, 'auth-yallapp');
      expect(api.calls.where((c) => c.startsWith('yallapp:')), isEmpty);
      expect(app.path, Paths.welcome);
    });
  }

  group('link suggestion', () {
    FakeCommunityApi suggesting() => FakeCommunityApi()..suggestLink();

    testWidgets('Link links in one tap, on Home', (tester) async {
      final api = suggesting();
      final app = await start(
        tester,
        api: api,
        session: FakeYallappAuthSession.confirming(),
        signedIn: true,
      );
      expect(key('link-suggestion'), findsOneWidget);
      await tap(tester, 'link-suggestion-link');
      expect(api.calls, contains('suggestion-accept'));
      expect(key('link-suggestion'), findsNothing);
      expect(app.container.read(meProvider)?.yallappLinked, isTrue);
    });

    testWidgets('Dismiss hides it, in Settings', (tester) async {
      final api = suggesting();
      final app = await start(
        tester,
        api: api,
        session: FakeYallappAuthSession.confirming(),
        signedIn: true,
      );
      app.go(Paths.settings);
      await TestApp.settle(tester);
      await tap(tester, 'link-suggestion-dismiss');
      expect(api.calls, contains('suggestion-dismiss'));
      expect(key('link-suggestion'), findsNothing);
    });

    testWidgets('a suggestion that went meanwhile just goes', (tester) async {
      final api = suggesting()..suggestionGone = true;
      await start(
        tester,
        api: api,
        session: FakeYallappAuthSession.confirming(),
        signedIn: true,
      );
      await tap(tester, 'link-suggestion-link');
      expect(api.calls, contains('suggestion-accept'));
      expect(key('link-suggestion'), findsNothing);
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('none without a suggestion', (tester) async {
      await start(
        tester,
        api: FakeCommunityApi(),
        session: FakeYallappAuthSession.confirming(),
        signedIn: true,
      );
      expect(key('link-suggestion'), findsNothing);
    });
  });
}
