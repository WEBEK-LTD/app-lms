import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/analytics.dart';
import 'package:yallapp/core/services/analytics_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// `Config` with the owner's screen protection.
Map<String, dynamic> _protection(String mode) {
  final config = configJson();
  (config['app'] as Map<String, dynamic>)['screen_protection'] = mode;
  return config;
}

/// Roadmap 62: what the app counts for the owner's Analytics.
void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  Future<TestApp> start(WidgetTester tester, String mode) async {
    final app = TestApp(
      signedIn: true,
      analytics: true,
      api: FakeApi(
        config: _protection(mode),
        course: courseDetailJson(enrolled: true, action: 'continue'),
        lesson: textLessonJson(),
      ),
      overrides: [
        analyticsSendEveryProvider.overrideWithValue(null),
        analyticsSenderProvider.overrideWithValue(
          (url, key, body) async => const AnalyticsResponse(202),
        ),
      ],
    );
    await app.pump(tester);
    return app;
  }

  List<Map<String, Object?>> screenshots(TestApp app) => app.container
      .read(analyticsProvider)
      .queued
      .where((e) => e['type'] == 'screenshot')
      .toList();

  testWidgets('a screenshot of a protected lesson is counted with the lesson', (
    tester,
  ) async {
    final app = await start(tester, 'content');
    // Nothing protected on the home screen: not counted.
    app.security.shots.add(null);
    await tester.pump();
    await tester.pump();
    expect(screenshots(app), isEmpty);

    app.container.read(appRouterProvider).push('/lesson/108');
    await TestApp.settle(tester);
    app.security.shots.add(null);
    await tester.pump();
    await tester.pump();
    expect(screenshots(app), hasLength(1));
    expect(screenshots(app).single, containsPair('item_kind', 'lesson'));
    expect(screenshots(app).single, containsPair('item_id', '108'));
    expect(
      screenshots(app).single,
      containsPair('title', 'Writing your first function'),
    );

    // Back home, the lesson is no longer open.
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester);
    app.security.shots.add(null);
    await tester.pump();
    await tester.pump();
    expect(screenshots(app), hasLength(1));
  });

  testWidgets('with the whole app protected, one elsewhere is counted alone', (
    tester,
  ) async {
    final app = await start(tester, 'app');
    app.security.shots.add(null);
    await tester.pump();
    await tester.pump();
    expect(screenshots(app), hasLength(1));
    expect(screenshots(app).single.containsKey('item_id'), isFalse);
  });

  group('a course with a password on the website', () {
    Future<TestApp> openCourse(
      WidgetTester tester, {
      required DevicePlatform platform,
      bool free = false,
      bool enrolled = false,
    }) async {
      final app = TestApp(
        platform: platform,
        signedIn: true,
        api: FakeApi(
          course: {
            ...courseDetailJson(
              action: enrolled ? 'continue' : 'none',
              free: free,
              enrolled: enrolled,
            ),
            'password_protected': true,
            'website_url': 'https://your-academy.com/courses/ui-design/',
          },
        ),
      );
      await app.pump(tester);
      app.container.read(appRouterProvider).push('/course/1');
      await TestApp.settle(tester);
      return app;
    }

    testWidgets('says so and opens the website for the password, never asks', (
      tester,
    ) async {
      await openCourse(tester, platform: DevicePlatform.android);
      expect(find.text('This course has a password'), findsOneWidget);
      expect(find.byKey(const ValueKey('cta-open-website')), findsOneWidget);
      expect(find.text('Open on the website'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      expect(find.byKey(const ValueKey('cta-checkout')), findsNothing);
    });

    testWidgets('on iPhone a paid one has no link to the website', (
      tester,
    ) async {
      await openCourse(tester, platform: DevicePlatform.ios);
      expect(find.text('This course has a password'), findsOneWidget);
      expect(find.text("It can't be opened in the app."), findsOneWidget);
      expect(find.byKey(const ValueKey('cta-open-website')), findsNothing);
    });

    testWidgets('on iPhone a free one opens the website', (tester) async {
      await openCourse(tester, platform: DevicePlatform.ios, free: true);
      expect(find.byKey(const ValueKey('cta-open-website')), findsOneWidget);
    });

    testWidgets('a student in it learns as usual', (tester) async {
      await openCourse(tester, platform: DevicePlatform.ios, enrolled: true);
      expect(find.text('This course has a password'), findsNothing);
      expect(find.byKey(const ValueKey('cta-continue')), findsOneWidget);
    });
  });
}
