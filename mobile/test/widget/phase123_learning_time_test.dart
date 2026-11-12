import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/lms/home/learning_cards.dart';
import 'package:yallapp/modules/lms/lesson/learning_clock.dart';

import '../support/fake_api.dart';
import '../support/test_app.dart';

/// 123 The time a student spends in a lesson: counted while it is open and
/// sent about once a minute and when it closes; and this week's learning
/// time, each day of it, against the week before.
void main() {
  testWidgets('a lesson open for two and a half minutes sends its time', (
    tester,
  ) async {
    final api = FakeApi();
    final app = TestApp(api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: app.container,
        child: const MaterialApp(
          home: LearningClock(courseId: 1, child: Text('lesson')),
        ),
      ),
    );
    await tester.pump(const Duration(minutes: 1));
    await tester.pump(const Duration(minutes: 1));
    await tester.pump(const Duration(seconds: 30));
    // Closing the lesson sends the rest.
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
    expect(api.learningSent.map((s) => s.courseId).toSet(), {1});
    final sent = api.learningSent.fold<int>(0, (n, s) => n + s.seconds);
    expect(sent, 150);
  });

  testWidgets('nothing is counted signed out', (tester) async {
    final api = FakeApi();
    final app = TestApp(api: api, signedIn: false, guest: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: app.container,
        child: const MaterialApp(
          home: LearningClock(courseId: 1, child: Text('lesson')),
        ),
      ),
    );
    await tester.pump(const Duration(minutes: 2));
    await tester.pumpWidget(const SizedBox());
    expect(api.learningSent, isEmpty);
  });

  testWidgets('this week: the time, each day, against the week before', (
    tester,
  ) async {
    final time = LearningTime.fromJson(FakeApi().learningTime);
    expect(time.change, 25);
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: LearningWeek(time: time, color: null, title: null),
        ),
      ),
    );
    expect(find.text('3 h 20 min'), findsOneWidget);
    expect(find.text('+25% on last week'), findsOneWidget);
  });
}
