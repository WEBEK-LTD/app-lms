import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/review_prompt.dart';
import 'package:yallapp/core/services/share_links.dart';
import 'package:yallapp/core/storage/local_settings.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 46 Links that open the app, Share, and the rating prompt in the running app.

const _appId = '00000000-0000-0000-0000-000000000046';

TestApp _app({
  bool signedIn = false,
  bool guest = true,
  Map<String, Object> preferences = const {},
  FakeApi? api,
  List<String>? shared,
}) => TestApp(
  signedIn: signedIn,
  guest: guest,
  preferences: preferences,
  api: api,
  build: (b) => b.copyWith(
    appId: _appId,
    linkBaseUrl: 'https://yallapp.com.tr/a/$_appId',
    siteLinkBaseUrl: 'https://your-academy.com/a',
  ),
  overrides: [
    if (shared != null)
      shareTextProvider.overrideWithValue((text) async => shared.add(text)),
  ],
);

/// What the engine sends when the phone opens a link in the app (Flutter's
/// deep linking): Android the path, iOS the whole address.
Future<void> _openLink(WidgetTester tester, String location) async {
  await tester.binding.defaultBinaryMessenger.handlePlatformMessage(
    'flutter/navigation',
    const JSONMethodCodec().encodeMethodCall(
      MethodCall('pushRouteInformation', {'location': location, 'state': null}),
    ),
    (_) {},
  );
  await TestApp.settle(tester);
}

String _location(TestApp app) => app.container
    .read(appRouterProvider)
    .routerDelegate
    .currentConfiguration
    .uri
    .toString();

void main() {
  testWidgets('a link opens its screen, from the site and from Yallapp', (
    tester,
  ) async {
    final app = _app();
    await app.pump(tester);
    await _openLink(tester, '/a/course/1');
    expect(_location(app), '/course/1');
    expect(find.text(courseDetailJson()['title'] as String), findsWidgets);

    await _openLink(tester, 'https://yallapp.com.tr/a/$_appId/page/home');
    expect(_location(app), '/page/home');

    // Another app's link, or a kind this app doesn't have: the home page.
    await _openLink(tester, '/a/product/3');
    expect(_location(app), '/home');
  });

  testWidgets('a link opens without signing in: the screens it opens are '
      'public', (tester) async {
    final app = _app(guest: false);
    await app.pump(tester);
    expect(Uri.parse(_location(app)).path, '/sign-in');
    await _openLink(tester, '/a/course/1');
    expect(_location(app), '/course/1');
  });

  testWidgets('Share on a course shares the link that opens it', (
    tester,
  ) async {
    final shared = <String>[];
    final app = _app(shared: shared);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Share'));
    await TestApp.settle(tester);
    expect(shared, [
      '${courseDetailJson()['title']}\nhttps://your-academy.com/a/course/1',
    ]);
  });

  testWidgets('a finished lesson asks for a rating once the app has been '
      'used a while', (tester) async {
    var requests = 0;
    final app = TestApp(
      signedIn: true,
      guest: true,
      preferences: {
        'review.sessions': 5,
        'review.first_opened': '2026-01-01T00:00:00Z',
      },
      overrides: [
        reviewPrompterProvider.overrideWith(
          (ref) => ReviewPrompter(
            preferences: ref.watch(sharedPreferencesProvider),
            allowed: () => true,
            preview: false,
            isAvailable: () async => true,
            request: () async => requests++,
          ),
        ),
      ],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/lesson/108');
    await TestApp.settle(tester);
    await tester.tap(find.text('Mark complete').first);
    await TestApp.settle(tester);
    expect(app.api.count('completeLesson'), 1);
    expect(requests, 1);
  });
}
