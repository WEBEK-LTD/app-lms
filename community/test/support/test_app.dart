import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp_community/app.dart';
import 'package:yallapp_community/core/api/community_api.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/api/models.dart';
import 'package:yallapp_community/core/auth/social_sign_in.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/features/home/data/home_api.dart';

/// The app on a 390 × 844 phone over the fake API, signed in or not, in a
/// language and a theme. Every widget test starts here; area E's too.
class TestApp {
  TestApp._(this.container, this.api, this.tokens);

  final ProviderContainer container;
  final FakeCommunityApi api;
  final MemoryTokenStore tokens;

  static Future<TestApp> start(
    WidgetTester tester, {
    bool signedIn = true,
    String language = 'en',
    ThemeMode theme = ThemeMode.light,
    FakeCommunityApi? api,
    HomeApi? home,
    SocialSignIn apple = const FakeSocialSignIn('apple-token'),
    SocialSignIn google = const FakeSocialSignIn('google-token'),
    List<Override> overrides = const [],
  }) async {
    tester.view
      ..devicePixelRatio = 2
      ..physicalSize = const Size(390, 844) * 2;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({
      'community.language': language,
      'community.theme': switch (theme) {
        ThemeMode.dark => 'dark',
        ThemeMode.light => 'light',
        ThemeMode.system => 'system',
      },
    });
    final prefs = await SharedPreferences.getInstance();
    final fake = api ?? FakeCommunityApi();
    final tokens = MemoryTokenStore(
      signedIn ? const Session(accessToken: 'test-token') : null,
    );
    final container = ProviderContainer(
      // A failed call shows its error at once, not after a retry.
      retry: (_, _) => null,
      overrides: [
        homeApiProvider.overrideWithValue(home ?? FakeHomeApi()),
        sharedPreferencesProvider.overrideWithValue(prefs),
        communityApiProvider.overrideWithValue(fake as CommunityApi),
        tokenStoreProvider.overrideWithValue(tokens),
        appleSignInProvider.overrideWithValue(apple),
        googleSignInProvider.overrideWithValue(google),
        ...overrides,
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const CommunityApp(),
      ),
    );
    await settle(tester);
    return TestApp._(container, fake, tokens);
  }

  /// Pumps frames for a while (the design's blurs and gradients animate
  /// nothing forever, but sheets and routes do).
  static Future<void> settle(WidgetTester tester, [int frames = 12]) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 60));
    }
  }
}
