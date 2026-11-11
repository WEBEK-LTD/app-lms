import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/common.dart';
import 'package:yallapp/modules/lms/widgets/course_cards.dart';

import '../support/fake_api.dart';
import '../support/test_app.dart';

/// 122 The courses' card the owner designed in Studio (`Config.screens.
/// course_card`): its look in the catalog, the facts it leaves out, and the
/// app's own row without one.
void main() {
  test('reads the look, its corners and the facts it leaves out', () {
    final card = StudioScreens.fromJson({
      'course_card': {
        'style': 'cover',
        'radius': 20,
        'hide': ['lessons', 'teleport'],
      },
    })!.courseCard!;
    expect(card.style, CourseCardStyle.cover);
    expect(card.radius, 20);
    expect(card.hide, {CourseCardFact.lessons});
    expect(card.shows(CourseCardFact.price), isTrue);
    // A look this app doesn't know: the classic row.
    expect(
      StudioScreens.fromJson({
        'course_card': {'style': 'hologram'},
      })!.courseCard!.style,
      CourseCardStyle.classic,
    );
  });

  Future<void> catalog(WidgetTester tester, Map<String, dynamic>? card) async {
    final api = FakeApi();
    if (card != null) api.config['screens'] = {'course_card': card};
    final app = TestApp(api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).go(Paths.courses);
    await TestApp.settle(tester, 12);
  }

  for (final style in ['rich', 'cover', 'tile']) {
    testWidgets('the catalog shows the $style card', (tester) async {
      await catalog(tester, {'style': style, 'hide': <String>[]});
      expect(find.byKey(ValueKey('course-card-$style-1')), findsOneWidget);
    });
  }

  testWidgets('a card that leaves the price out shows none', (tester) async {
    await catalog(tester, {
      'style': 'tile',
      'hide': ['price', 'teacher', 'lessons'],
    });
    final card = find.byKey(const ValueKey('course-card-tile-1'));
    expect(card, findsOneWidget);
    expect(
      find.descendant(of: card, matching: find.byType(PriceLabel)),
      findsNothing,
    );
  });

  testWidgets("without a design the catalog keeps the app's own row", (
    tester,
  ) async {
    await catalog(tester, null);
    expect(find.byType(CourseListCard), findsWidgets);
    expect(find.byKey(const ValueKey('course-card-tile-1')), findsNothing);
  });

  test("122 reads a course page's look", () {
    final page = StudioScreens.fromJson({
      'course_page': {
        'cover': 'full',
        'bar': 'glass',
        'first_tab': 'curriculum',
        'hide': ['reviews', 'students', 'x'],
      },
    })!.coursePage!;
    expect(page.cover, CoursePageCover.full);
    expect(page.bar, CoursePageBar.glass);
    expect(page.firstTab, 'curriculum');
    expect(page.hide, {CoursePageFact.reviews, CoursePageFact.students});
  });

  Future<void> coursePage(
    WidgetTester tester,
    Map<String, dynamic>? page,
  ) async {
    final api = FakeApi();
    if (page != null) api.config['screens'] = {'course_page': page};
    final app = TestApp(api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).push(Paths.course(1));
    await TestApp.settle(tester, 14);
  }

  testWidgets("122 a course's page with the tall picture and the glass bar", (
    tester,
  ) async {
    await coursePage(tester, {
      'cover': 'full',
      'bar': 'glass',
      'hide': ['reviews'],
    });
    expect(find.byKey(const ValueKey('course-cover-full')), findsOneWidget);
    expect(find.byKey(const ValueKey('bottom-bar-glass')), findsOneWidget);
  });

  testWidgets("122 without a design a course's page is the app's own", (
    tester,
  ) async {
    await coursePage(tester, null);
    expect(find.byKey(const ValueKey('course-cover-classic')), findsOneWidget);
    expect(find.byKey(const ValueKey('bottom-bar-glass')), findsNothing);
  });
}
