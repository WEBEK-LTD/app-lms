import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's course page (`course_page` `look: premium`):
/// the subject and certificate on the cover, the teacher on a card to
/// follow, the tabs as chips with the curriculum first, the purchase in
/// gold.
class _Follows extends FakeApi {
  _Follows({super.config, super.course});

  final asked = <(int, bool)>[];

  @override
  Future<void> followTeacher(int id, {required bool follow}) async {
    asked.add((id, follow));
  }
}

void main() {
  Map<String, dynamic> config() => {
    ...configJson(),
    'screens': {
      'course_page': {
        'cover': 'full',
        'bar': 'glass',
        'hide': <String>[],
        'look': 'premium',
      },
    },
  };

  Map<String, dynamic> course({bool? following = false}) {
    final c = courseDetailJson();
    return {
      ...c,
      'categories': [
        {'id': 4, 'name': 'Design', 'count': 12},
      ],
      'has_certificate': true,
      'instructor': {
        ...(c['instructor'] as Map<String, dynamic>),
        'id': 9,
        'bio': 'Product designer',
        'following': ?following,
      },
    };
  }

  testWidgets('the premium page: tags on the cover, the teacher to follow, '
      'the curriculum first', (tester) async {
    final api = _Follows(config: config(), course: course());
    final app = TestApp(appType: AppType.lms, api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('course-cover-full')), findsOneWidget);
    expect(find.text('Design'), findsOneWidget);
    expect(find.text('Certified certificate'), findsOneWidget);
    expect(find.byKey(const ValueKey('course-teacher-card')), findsOneWidget);
    expect(find.text('Product designer'), findsOneWidget);
    // The tabs as chips, the curriculum first.
    expect(find.byKey(const ValueKey('ink-chip-0')), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('ink-chip-0')),
        matching: find.text('Curriculum'),
      ),
      findsOneWidget,
    );
    expect(find.text('About the course'), findsOneWidget);
    // Following the teacher.
    await tester.tap(find.byKey(const ValueKey('follow-teacher')));
    await TestApp.settle(tester, 5);
    expect(api.asked, [(9, true)]);
    expect(find.text('Following'), findsOneWidget);
  });

  testWidgets('no follow button where following isn\'t offered', (
    tester,
  ) async {
    final api = _Follows(config: config(), course: course(following: null));
    final app = TestApp(appType: AppType.lms, api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('course-teacher-card')), findsOneWidget);
    expect(find.byKey(const ValueKey('follow-teacher')), findsNothing);
  });
}
