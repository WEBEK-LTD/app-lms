import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/lms/courses/courses_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 Two screens at one address: an academy's search is its courses with
/// the search box open, its favourites a tab of My courses. The page drawn
/// around the courses is the courses' own, whichever comes first.
void main() {
  Map<String, dynamic> page(String slug, String title, String screen) => {
    ...appPageJson(slug: slug, title: title, blocks: []),
    'studio': {
      'header': {'type': 'title', 'title': title},
      'body': {'id': 'root', 'type': 'column', 'children': <dynamic>[]},
      'screen': screen,
    },
  };

  Map<String, dynamic> summary(String slug, String title, String screen) => {
    'slug': slug,
    'title': title,
    'updated_at': '2026-11-11T10:00:00Z',
    'screen': screen,
  };

  for (final searchFirst in [false, true]) {
    testWidgets("the courses tab shows the courses' page, not the search's "
        '(search ${searchFirst ? 'first' : 'after'})', (tester) async {
      final app = TestApp(
        appType: AppType.lms,
        api: FakeApi()
          ..navigation = {
            ...navigationJson(
              tabs: [
                navTabJson('home', 'Home', 'home', {
                  'type': 'page',
                  'page_slug': 'home',
                }),
                navTabJson('courses', 'Explore', 'explore', {
                  'type': 'screen',
                  'screen': 'courses',
                }),
                navTabJson('account', 'Me', 'person', {
                  'type': 'screen',
                  'screen': 'account',
                }),
              ],
            ),
            'pages': [
              {
                'slug': 'home',
                'title': 'Home',
                'updated_at': '2026-11-11T10:00:00Z',
              },
              // Either way round, the search's page doesn't take the courses' place.
              if (searchFirst) summary('search', 'Find a course', 'search'),
              summary('courses', 'All our courses', 'courses'),
              if (!searchFirst) summary('search', 'Find a course', 'search'),
            ],
          }
          ..pages = {
            'home': appPageJson(blocks: []),
            'search': page('search', 'Find a course', 'search'),
            'courses': page('courses', 'All our courses', 'courses'),
          },
        signedIn: true,
      );
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      await tester.tap(find.text('Explore').last);
      await TestApp.settle(tester, 20);
      expect(find.byType(CoursesScreen), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-header-title')), findsOneWidget);
      expect(find.text('All our courses'), findsOneWidget);
      expect(find.text('Find a course'), findsNothing);
    });
  }
}
