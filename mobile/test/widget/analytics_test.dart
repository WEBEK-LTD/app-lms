import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/analytics.dart';
import 'package:yallapp/core/services/analytics_providers.dart';
import 'package:yallapp/core/storage/local_settings.dart';

import '../support/test_app.dart';

/// 44 Usage statistics in the running app: the session and the screens,
/// Settings › Share usage statistics, and the preview that never sends.
void main() {
  late List<Map<String, Object?>> sent;

  setUp(() {
    sent = [];
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

  TestApp appWith({bool analytics = true, PreviewSession? preview}) => TestApp(
    signedIn: true,
    analytics: analytics,
    preview: preview,
    overrides: [
      analyticsSendEveryProvider.overrideWithValue(null),
      analyticsSenderProvider.overrideWithValue((url, key, body) async {
        sent.add(body);
        return const AnalyticsResponse(202);
      }),
    ],
  );

  testWidgets('counts the first open and each screen by its kind', (
    tester,
  ) async {
    final app = appWith();
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.course(1));
    await TestApp.settle(tester);
    final analytics = app.container.read(analyticsProvider);
    final types = analytics.queued
        .map((e) => '${e['type']} ${e['screen'] ?? e['first_open'] ?? ''}')
        .toList();
    expect(types.first, 'app_open true');
    expect(types, containsAll(['screen_view home', 'screen_view course']));
    expect(await analytics.flush(), greaterThan(0));
    expect(analytics.queued, isEmpty);
    expect(sent, isNotEmpty);
    expect(
      sent.expand((b) => b['events']! as List).map((e) => (e as Map)['screen']),
      isNot(contains('/course/1')),
    );
  });

  testWidgets(
    'Settings has Share usage statistics, on; off stops it and empties the queue',
    (tester) async {
      final app = appWith();
      await app.pump(tester);
      final analytics = app.container.read(analyticsProvider);
      app.container.read(appRouterProvider).push(Paths.settings);
      await TestApp.settle(tester);
      expect(analytics.queued, isNotEmpty);

      final tile = find.byKey(const ValueKey('share-usage'));
      await tester.scrollUntilVisible(tile, 200);
      expect(find.text('Share usage statistics'), findsOneWidget);
      expect(
        find.textContaining(
          'Your name, phone number and email address are never sent.',
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<Switch>(
              find.descendant(of: tile, matching: find.byType(Switch)),
            )
            .value,
        isTrue,
      );

      await tester.tap(tile);
      await TestApp.settle(tester);
      expect(app.container.read(localSettingsProvider).shareUsage, isFalse);
      expect(analytics.enabled, isFalse);
      expect(analytics.queued, isEmpty);
      app.container.read(appRouterProvider).push(Paths.course(2));
      await TestApp.settle(tester);
      expect(analytics.queued, isEmpty);
      expect(await analytics.flush(), 0);
      expect(sent, isEmpty);
    },
  );

  testWidgets('the app preview never counts, and has no switch', (
    tester,
  ) async {
    final app = appWith(
      preview: const PreviewSession(
        appId: '11111111-2222-4333-8444-555555555555',
        platformUrl: 'https://yallapp.com.tr',
        contentSource: PreviewContentSource.wordpress,
      ),
    );
    await app.pump(tester);
    final analytics = app.container.read(analyticsProvider);
    expect(analytics.available, isFalse);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('share-usage')), findsNothing);
    expect(analytics.queued, isEmpty);
    expect(await analytics.flush(), 0);
    expect(sent, isEmpty);
  });

  testWidgets('a build without analytics has no switch', (tester) async {
    final app = appWith(analytics: false);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('share-usage')), findsNothing);
    expect(app.container.read(analyticsProvider).queued, isEmpty);
  });
}
