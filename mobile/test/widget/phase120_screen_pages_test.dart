import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/studio_screen_scope.dart';
import 'package:yallapp/modules/lms/my_courses/my_courses_screen.dart';
import 'package:yallapp/modules/real_estate/widgets/listing_widgets.dart'
    show TabHeader;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 120 A Studio page drawn around one of the app's screens: the page's
/// header and elements over the screen, which still works under them, so
/// every page of the app can be changed in Studio.
void main() {
  Map<String, dynamic> learning({bool header = true}) => {
    ...appPageJson(slug: 'learning', title: 'My learning', blocks: []),
    'studio': {
      if (header)
        'header': {
          'type': 'title',
          'title': 'My learning',
          'buttons': ['notifications'],
        },
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {'id': 'tip', 'type': 'text', 'text': 'Pick up where you left off.'},
        ],
      },
      'screen': 'my_courses',
    },
  };

  Map<String, dynamic> navigation({bool around = true}) => {
    ...navigationJson(
      tabs: [
        navTabJson('t1', 'Discover', 'explore', {
          'type': 'page',
          'page_slug': 'home',
        }),
        // As the servers send a tab to a page drawn around a screen.
        navTabJson('t2', 'My learning', 'school', {
          'type': 'screen',
          'screen': 'my_courses',
        }),
        navTabJson('t4', 'Me', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
    ),
    'pages': [
      {
        'slug': 'home',
        'title': 'Discover',
        'updated_at': '2026-10-13T18:00:00Z',
      },
      {
        'slug': 'learning',
        'title': 'My learning',
        'updated_at': '2026-10-13T18:00:00Z',
        if (around) 'screen': 'my_courses',
      },
    ],
  };

  test('reads the screen a page is drawn around, and the title header', () {
    final page = AppPage.fromJson(learning());
    expect(page.studio!.screen, BuiltInScreen.myCourses);
    expect(page.studio!.header!.type, StudioHeaderType.title);
    final nav = Navigation.fromJson(navigation());
    expect(nav.pages.map((p) => p.screen), [null, BuiltInScreen.myCourses]);
    // A screen this app doesn't know: the page is its elements only.
    final unknown = AppPage.fromJson({
      ...learning(),
      'studio': {...learning()['studio'] as Map, 'screen': 'teleport'},
    });
    expect(unknown.studio!.screen, isNull);
  });

  testWidgets('the tab shows the page over its screen, the header standing for '
      "the screen's title", (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation()
        ..pages = {'home': appPageJson(blocks: []), 'learning': learning()},
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('My learning').last);
    await TestApp.settle(tester, 20);
    expect(find.byType(MyCoursesScreen), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-header-title')), findsOneWidget);
    expect(find.text('Pick up where you left off.'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('studio-screen-learning')),
      findsOneWidget,
    );
    // The screen's own title gives way to the header.
    expect(find.text('My courses'), findsNothing);
  });

  testWidgets('without a page around it the screen is as it was', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation(around: false)
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('My learning').last);
    await TestApp.settle(tester, 20);
    expect(find.byType(MyCoursesScreen), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-header-title')), findsNothing);
    expect(find.text('My courses'), findsOneWidget);
  });

  testWidgets("a tab's own title hides under a Studio page's header", (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(
          primary: const Color(0xFF1E6B52),
          secondary: const Color(0xFFF2A93B),
          brightness: Brightness.light,
          template: AppTemplate.classic,
          fontFamily: 'Outfit',
        ),
        home: const Material(
          child: Column(
            children: [
              StudioScreenScope(
                hidesTitle: true,
                child: TabHeader(title: 'Hidden title'),
              ),
              StudioScreenScope(
                hidesTitle: false,
                child: TabHeader(title: 'Shown title'),
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Hidden title'), findsNothing);
    expect(find.byKey(const ValueKey('tab-header-hidden')), findsOneWidget);
    expect(find.text('Shown title'), findsOneWidget);
  });
}
