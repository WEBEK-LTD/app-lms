import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// Renders every main screen on small, regular and tablet sizes, in each
/// template and in light and dark mode. Any layout overflow or build error
/// fails the test.
void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  const homeMarker = {
    AppTemplate.classic: 'Search for a course',
    AppTemplate.bold: 'What do you want to learn?',
    AppTemplate.minimal: 'Learn',
  };

  final cases = [
    for (final size in sizes.entries)
      for (final template in AppTemplate.values)
        for (final dark in [false, true]) (size, template, dark, 1.0),
    // Large accessibility text.
    for (final template in AppTemplate.values)
      (sizes.entries.elementAt(1), template, false, 1.5),
  ];

  for (final (size, template, dark, textScale) in cases) {
    final name =
        '${size.key}, ${template.name}, ${dark ? 'dark' : 'light'}'
        '${textScale == 1 ? '' : ', text x$textScale'}';
    testWidgets(name, (tester) async {
      final view = tester.view
        ..physicalSize = size.value * 2
        ..devicePixelRatio = 2;
      tester.platformDispatcher.textScaleFactorTestValue = textScale;
      addTearDown(view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      final app = TestApp(
        signedIn: true,
        template: template,
        preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
        api: FakeApi(lesson: videoLessonJson()),
      );
      final semantics = tester.ensureSemantics();
      void clean(String step) =>
          expect(tester.takeException(), isNull, reason: step);

      await app.pump(tester);
      clean('home');
      expect(find.text(homeMarker[template]!), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Courses').last);
      await TestApp.settle(tester);
      clean('courses');
      expect(find.text('All courses'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('My courses').last);
      await TestApp.settle(tester);
      clean('my courses');
      expect(
        find.text('Next: Lesson 7: Functions & Variables'),
        findsOneWidget,
      );

      await tester.tap(find.bySemanticsLabel('Account').last);
      await TestApp.settle(tester);
      clean('account');
      expect(find.text('Sara Yilmaz'), findsOneWidget);

      final router = app.container.read(appRouterProvider);
      for (final (location, marker) in [
        ('/account/settings', 'Appearance'),
        ('/account/settings/devices', 'Pixel 8 (this device)'),
        ('/course/1', 'UI Design Fundamentals'),
        ('/quiz/201', 'Start a new attempt'),
        ('/lesson/107', 'Lesson 7: Functions & Variables'),
        ('/notifications', 'Exam on Friday'),
        ('/account/orders', 'Order #1042'),
        ('/question/3', 'It returns a range object.'),
      ]) {
        router.push(location);
        await TestApp.settle(tester);
        clean(location);
        expect(find.text(marker), findsWidgets, reason: location);
        router.pop();
        await TestApp.settle(tester);
      }

      router.push('/quiz/201');
      await TestApp.settle(tester);
      await tester.tap(find.text('Start a new attempt'));
      await TestApp.settle(tester);
      clean('quiz attempt');
      expect(find.text('Question 1 of 2'), findsOneWidget);
      await tester.tap(find.text('def'));
      await tester.tap(find.text('Next question'));
      await TestApp.settle(tester);
      clean('quiz question 2');
      expect(find.text('Put the steps in order'), findsOneWidget);
      await tester.tap(find.text('Submit quiz'));
      await TestApp.settle(tester);
      clean('quiz result');
      expect(find.text('You passed'), findsOneWidget);
      semantics.dispose();
    });
  }
}
