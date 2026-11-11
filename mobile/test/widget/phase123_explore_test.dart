import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/lms/courses/explore_parts.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's Explore (`Config.screens.looks` `catalog:
/// explore`) and its course rows (`course_card` `premium`): the tab's name
/// as a large title, the search with the filters in it, the subjects as
/// icons, the chips in ink with the best rated, and each course with its
/// badge.
class _Catalog extends FakeApi {
  _Catalog({super.config});

  final queries = <CourseQuery>[];

  @override
  Future<Paged<CourseSummary>> listCourses(CourseQuery query) {
    queries.add(query);
    return super
        .listCourses(query)
        .then(
          (_) => Paged.fromJson(
            pageJson([
              {...courseSummaryJson(), 'badge': 'bestseller'},
            ]),
            CourseSummary.fromJson,
          ),
        );
  }
}

void main() {
  Map<String, dynamic> config({bool explore = true}) => {
    ...configJson(),
    'screens': {
      'course_card': {'style': 'premium', 'hide': <String>[]},
      if (explore) 'looks': {'catalog': 'explore'},
    },
  };

  _Catalog api({bool explore = true}) =>
      _Catalog(config: config(explore: explore))
        ..navigation = navigationJson(
          tabs: [
            navTabJson('courses', 'Explore', 'explore', {
              'type': 'screen',
              'screen': 'courses',
            }),
            navTabJson('account', 'Me', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        );

  testWidgets('Explore: the tab\'s name, the search with the filters, the '
      'subjects, the chips and the courses with their badges', (tester) async {
    final catalog = api();
    final app = TestApp(appType: AppType.lms, api: catalog, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('explore-title')), findsOneWidget);
    expect(find.text('Explore'), findsWidgets);
    expect(find.byKey(const ValueKey('explore-search')), findsOneWidget);
    expect(find.byKey(const ValueKey('explore-filters')), findsOneWidget);
    expect(find.byKey(const ValueKey('explore-subject-4')), findsOneWidget);
    expect(find.text('Design'), findsOneWidget);
    expect(find.text('Top rated'), findsOneWidget);
    expect(find.byKey(const ValueKey('course-card-premium-1')), findsOneWidget);
    expect(find.textContaining('Bestseller'), findsOneWidget);
    // The best rated first, then a subject.
    await tester.tap(find.byKey(const ValueKey('explore-chip-2')));
    await TestApp.settle(tester, 10);
    expect(catalog.queries.last.orderBy, CourseOrder.rating);
    await tester.tap(find.byKey(const ValueKey('explore-subject-4')));
    await TestApp.settle(tester, 10);
    expect(catalog.queries.last.category, 4);
  });

  testWidgets('without the look the catalog is as it was', (tester) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(explore: false),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('explore-title')), findsNothing);
    expect(find.text('All courses'), findsOneWidget);
  });

  test('a subject\'s icon comes from its name, in each language', () {
    expect(subjectIcon('UI Design'), subjectIcon('التصميم'));
    expect(subjectIcon('Programlama kod'), subjectIcon('البرمجة'));
    expect(subjectIcon('English'), subjectIcon('اللغات'));
    expect(subjectIcon('Something else'), isNot(subjectIcon('Design')));
  });
}
