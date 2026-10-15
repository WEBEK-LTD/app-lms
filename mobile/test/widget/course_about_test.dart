import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 30 The course page shows what the LMS says about a course beside its
/// description: what you'll learn, what it includes, the requirements, who
/// it's for and how many students take it.
void main() {
  final about = {
    ...courseDetailJson(),
    'student_count': 42,
    'about': {
      'learn': ['Plan a treatment', 'Read an X-ray'],
      'requirements': ['A dental degree'],
      'audience': ['General dentists'],
      'includes': ['12 hours of video'],
    },
  };

  testWidgets('visitors start on the overview with the lists', (tester) async {
    final app = TestApp(api: FakeApi(course: about));
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);

    expect(find.text('42 students'), findsOneWidget);
    for (final text in [
      "What you'll learn",
      'Read an X-ray',
      'This course includes',
      '12 hours of video',
      'Requirements',
      'A dental degree',
      'Who this course is for',
      'General dentists',
    ]) {
      await tester.scrollUntilVisible(find.text(text), 200);
      expect(find.text(text), findsOneWidget, reason: text);
    }
  });

  testWidgets('students start on the curriculum', (tester) async {
    final app = TestApp(
      signedIn: true,
      api: FakeApi(course: {...about, 'enrolled': true}),
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);

    expect(find.text('Module 1: Introduction'), findsOneWidget);
    expect(find.text("What you'll learn"), findsNothing);
  });

  testWidgets('without the lists the curriculum opens first', (tester) async {
    final app = TestApp(api: FakeApi());
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);

    expect(find.text('Module 1: Introduction'), findsOneWidget);
  });
}
