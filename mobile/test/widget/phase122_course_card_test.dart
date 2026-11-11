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
}
