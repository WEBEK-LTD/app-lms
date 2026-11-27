import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/community/community_paths.dart';

import '../support/fake_api.dart';
import '../support/community_fixtures.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 235 A Community app: the client's own community on the hosted API's
/// /community endpoints, in its five tabs.
TestApp _app({String lang = 'en', bool signedIn = true}) => TestApp(
  api: FakeApi(config: configJson(lms: null, languages: languagesJson()))
    ..communityHandler = communityAnswer,
  appType: AppType.community,
  signedIn: signedIn,
  preferences: {'settings.language': lang},
);

Future<void> _go(TestApp app, WidgetTester tester, String location) async {
  final router = app.container.read(appRouterProvider);
  if (app.container.read(appModuleProvider).isTabPath(location)) {
    router.go(location);
  } else {
    router.push(location);
  }
  await TestApp.settle(tester, 20);
}

void _phone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

void main() {
  testWidgets('235 the feed mixes posts and questions', (tester) async {
    _phone(tester);
    final app = _app();
    await app.pump(tester);
    await _go(app, tester, CommunityPaths.feed);
    expect(find.text('Our new spring menu is out'), findsOneWidget);
    expect(find.text('Do you deliver on Sundays?'), findsOneWidget);
    expect(find.text('3 comments'), findsOneWidget);
    expect(find.text('1 answer'), findsOneWidget);
  });

  testWidgets('235 a question opens with its answers, and an answer is sent', (
    tester,
  ) async {
    _phone(tester);
    final app = _app();
    await app.pump(tester);
    await _go(app, tester, CommunityPaths.question('q1'));
    expect(find.text('Yes, until 8 pm.'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Thanks!');
    await tester.tap(find.byTooltip('Send'));
    await TestApp.settle(tester, 20);
    final sent = app.api.communityRequests.where(
      (r) => r.method == 'POST' && r.path.endsWith('/answers'),
    );
    expect(sent.single.path, '/community/v1/qa/questions/q1/answers');
    expect(sent.single.body, {'body': 'Thanks!'});
  });

  testWidgets('235 groups, the profile and messages', (tester) async {
    _phone(tester);
    final app = _app();
    await app.pump(tester);
    await _go(app, tester, CommunityPaths.groups);
    expect(find.text('Home bakers'), findsOneWidget);
    expect(find.text('12 members'), findsOneWidget);
    await tester.tap(find.text('Join'));
    await TestApp.settle(tester, 20);
    expect(
      app.api.communityRequests.any(
        (r) =>
            r.method == 'PUT' && r.path == '/community/v1/groups/g1/membership',
      ),
      isTrue,
    );
    await _go(app, tester, CommunityPaths.profile);
    expect(find.text('Deniz'), findsOneWidget);
    await _go(app, tester, CommunityPaths.messages);
    expect(find.text('Selin'), findsOneWidget);
    expect(find.text('See you there'), findsOneWidget);
  });

  testWidgets('235 signed out, messages ask to sign in', (tester) async {
    _phone(tester);
    final app = _app(signedIn: false);
    await app.pump(tester);
    await _go(app, tester, CommunityPaths.messages);
    expect(find.text('Sign in to take part'), findsOneWidget);
  });

  testWidgets('235 the feed in Arabic', (tester) async {
    _phone(tester);
    final app = _app(lang: 'ar');
    await app.pump(tester);
    await _go(app, tester, CommunityPaths.feed);
    expect(find.text('المجتمع'), findsWidgets);
    expect(find.text('إجابة واحدة'), findsOneWidget);
  });
}
