import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 165 Stories from Dashboard › Stories in the app: the server fills the
/// rings (the ring's name as `heading`), and the viewer shows each story's
/// small line, title, line and button words; its button opens the shop on
/// the story's category. Stories as designed before (only `heading` and
/// `subheading`) show as they did, with "Open".
void main() {
  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  final stories = {
    'id': 'st',
    'type': 'stories',
    'stories_source': 'dashboard',
    'interval_ms': 5000,
    'slides': [
      {
        'image_url': 'https://cdn.example.com/love.jpg',
        'heading': 'Love',
        'subheading': null,
        'kicker': 'For love',
        'title': 'Love, said in flowers',
        'line': 'Hand-tied today',
        'button_label': 'See roses',
        'icon': 'favorite',
        'action': {'type': 'screen', 'screen': 'courses', 'category_id': '12'},
      },
      {
        'image_url': 'https://cdn.example.com/old.jpg',
        'heading': 'Offers',
        'subheading': 'This week only',
        'action': {'type': 'screen', 'screen': 'courses'},
      },
    ],
  };

  Future<TestApp> open(WidgetTester tester, String language) async {
    final api =
        FakeApi(
            config: configJson(
              languages: languagesJson(available: const ['en', 'ar', 'tr']),
            ),
          )
          ..navigation = navigationJson(
            tabs: [
              navTabJson('home', 'Home', 'home', {
                'type': 'page',
                'page_slug': 'home',
              }),
              navTabJson('shop', 'Shop', 'storefront', {
                'type': 'screen',
                'screen': 'courses',
              }),
            ],
          )
          ..pages = {
            'home': page([stories]),
          };
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      preferences: {'settings.language': language},
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  String location(TestApp app) => app.container
      .read(appRouterProvider)
      .routerDelegate
      .currentConfiguration
      .uri
      .toString();

  test('reads the story fields and the category, older ones as before', () {
    final entry = StudioStoryEntry.tryParse(
      (stories['slides']! as List).first as Map<String, dynamic>,
    )!;
    expect(entry.kicker, 'For love');
    expect(entry.viewerTitle, 'Love, said in flowers');
    expect(entry.viewerLine, 'Hand-tied today');
    expect(entry.buttonLabel, 'See roses');
    expect(entry.action?.categoryId, 12);
    final old = StudioStoryEntry.tryParse({
      'image_url': 'https://cdn.example.com/a.jpg',
      'heading': 'New',
      'subheading': 'Soon',
    })!;
    expect(old.viewerTitle, 'New');
    expect(old.viewerLine, 'Soon');
    expect(old.buttonLabel, isNull);
    // A story with only its video is still one.
    expect(
      StudioStoryEntry.tryParse({'video_url': 'https://cdn.example.com/v.mp4'})
          ?.hasMedia,
      isTrue,
    );
  });

  for (final language in ['en', 'ar']) {
    testWidgets('shows a dashboard story full screen and opens the shop on its '
        'category ($language)', (tester) async {
      final app = await open(tester, language);
      // The ring's name under it.
      expect(find.text('Love'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('studio-story-st-0')));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('studio-story-viewer-st')), findsOne);
      expect(find.byKey(const ValueKey('studio-story-kicker')), findsOne);
      expect(find.text('FOR LOVE'), findsOneWidget);
      expect(find.text('Love, said in flowers'), findsOneWidget);
      expect(find.text('Hand-tied today'), findsOneWidget);
      expect(find.text('See roses'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('studio-story-open')));
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('studio-story-viewer-st')),
        findsNothing,
      );
      expect(location(app), '/shop?category=12');
    });
  }

  testWidgets('a story as designed shows its heading and line, with Open, '
      'and opens the shop', (tester) async {
    final app = await open(tester, 'en');
    await tester.tap(find.byKey(const ValueKey('studio-story-st-1')));
    await TestApp.settle(tester);
    expect(find.text('This week only'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-story-kicker')), findsNothing);
    expect(find.text('Open'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('studio-story-open')));
    await TestApp.settle(tester, 20);
    expect(location(app), startsWith('/shop'));
    expect(location(app), isNot(contains('category')));
  });
}
