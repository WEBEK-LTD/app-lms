import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's My courses (`looks` `my_courses: premium`):
/// a large title, this week's learning, the lists as chips with how many
/// each has, the courses in a grid with rings, the certificates on a tile.
void main() {
  FakeApi api({bool premium = true}) =>
      FakeApi(
          config: {
            ...configJson(),
            'screens': {
              if (premium) 'looks': {'my_courses': 'premium'},
            },
          },
        )
        ..certificates = [
          {
            'course_id': 1,
            'course_title': 'Python for Beginners',
            'issued_at': '2026-10-01T09:00:00Z',
            'url': 'https://academy.test/certificate/1.pdf',
          },
        ];

  Future<TestApp> open(WidgetTester tester, FakeApi api) async {
    final app = TestApp(appType: AppType.lms, api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).go('/my-courses');
    await TestApp.settle(tester, 20);
    return app;
  }

  testWidgets('the week, the chips with counts, the grid with rings and the '
      'certificates', (tester) async {
    await open(tester, api());
    expect(find.byKey(const ValueKey('my-courses-title')), findsOneWidget);
    expect(find.byKey(const ValueKey('learning-week')), findsOneWidget);
    expect(find.text('3 h 20 min'), findsOneWidget);
    expect(find.text('Learning 1'), findsOneWidget);
    expect(find.byKey(const ValueKey('my-course-1')), findsOneWidget);
    expect(find.text('12 of 20'), findsOneWidget);
    expect(find.text('60%'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('my-courses-certificates')),
      findsOneWidget,
    );
    expect(find.text('1 certificate'), findsOneWidget);
  });

  testWidgets('without the look, the screen is as it was', (tester) async {
    await open(tester, api(premium: false));
    expect(find.byKey(const ValueKey('my-courses-title')), findsNothing);
    expect(find.byKey(const ValueKey('learning-week')), findsNothing);
  });
}
