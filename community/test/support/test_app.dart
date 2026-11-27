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
import 'package:yallapp_community/core/push/push.dart';
import 'package:yallapp_community/core/push/push_settings.dart';
import 'package:yallapp_community/core/push/push_wiring.dart';
import 'package:yallapp_community/features/groups/data/groups_api.dart';
import 'package:yallapp_community/features/messages/data/messages_api.dart';
import 'package:yallapp_community/features/messages/links.dart';
import 'package:yallapp_community/features/opening/opening_page.dart';
import 'package:yallapp_community/features/posts/data/posts_api.dart';
import 'package:yallapp_community/features/posts/ui/composer_screen.dart';

/// The app on a 390 × 844 phone over the fake API, signed in or not, in a
/// language and a theme. Every widget test starts here; area E's too.
class TestApp {
  TestApp._(
    this.container,
    this.api,
    this.tokens,
    this.posts,
    this.messages,
    this.groups,
    this.pushSettings,
    this.pushTokens,
  );

  final ProviderContainer container;
  final FakeCommunityApi api;
  final MemoryTokenStore tokens;

  /// Posts, the feed and stories (area D's 232.1 and 232.2).
  final FakePostsApi posts;

  /// Messages (232.4); no polling.
  final FakeMessagesApi messages;

  /// Groups (232.5).
  final FakeGroupsApi groups;

  /// Push (232.6): the tokens sent to the server, and the per-kind choices.
  final List<String> pushTokens;
  final FakePushSettingsApi pushSettings;

  static Future<TestApp> start(
    WidgetTester tester, {
    bool signedIn = true,
    String language = 'en',
    ThemeMode theme = ThemeMode.light,
    FakeCommunityApi? api,
    HomeApi? home,
    FakePostsApi? posts,
    FakeMessagesApi? messages,
    FakeGroupsApi? groups,
    PushService? push,
    MediaPicker? picker,
    SocialSignIn apple = const FakeSocialSignIn('apple-token'),
    SocialSignIn google = const FakeSocialSignIn('google-token'),
    List<Override> overrides = const [],
    bool opening = false,
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
    final postsApi = posts ?? FakePostsApi();
    final messagesApi = messages ?? FakeMessagesApi();
    final groupsApi = groups ?? FakeGroupsApi();
    final pushSettings = FakePushSettingsApi();
    final pushTokens = <String>[];
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
        postsApiProvider.overrideWithValue(postsApi),
        messagesApiProvider.overrideWithValue(messagesApi),
        groupsApiProvider.overrideWithValue(groupsApi),
        pushServiceProvider.overrideWithValue(
          push ?? FakePushService(deviceToken: null),
        ),
        pushTokenSenderProvider.overrideWithValue(
          (token) async => pushTokens.add(token),
        ),
        pushSettingsApiProvider.overrideWithValue(pushSettings),
        messagePollProvider.overrideWithValue((
          inbox: Duration.zero,
          thread: Duration.zero,
        )),
        mediaPickerProvider.overrideWithValue(picker ?? FakeMediaPicker()),
        ...overrides,
      ],
    );
    addTearDown(container.dispose);
    // The opening's 1.2s plays in its own test (test/flows/opening_test.dart).
    if (!opening) container.read(openingDoneProvider.notifier).done();
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const CommunityApp(),
      ),
    );
    await settle(tester);
    return TestApp._(
      container,
      fake,
      tokens,
      postsApi,
      messagesApi,
      groupsApi,
      pushSettings,
      pushTokens,
    );
  }

  /// Pumps frames for a while (the design's blurs and gradients animate
  /// nothing forever, but sheets and routes do).
  static Future<void> settle(WidgetTester tester, [int frames = 12]) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 60));
    }
  }
}

/// The gallery in tests: the app's own pictures.
class FakeMediaPicker implements MediaPicker {
  var picked = 0;

  @override
  Future<List<String>> photos(int max) async {
    picked++;
    return [
      'asset:assets/images/bath-set.jpg',
      'asset:assets/images/bed-bright.jpg',
    ].take(max).toList();
  }

  @override
  Future<String?> photo() async => 'asset:assets/images/bunny-knit.jpg';

  @override
  Future<String?> video() async => '/tmp/clip.mp4';
}
