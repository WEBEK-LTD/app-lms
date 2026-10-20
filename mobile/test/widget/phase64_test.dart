import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'community_test.dart' show go, openApp;
import 'fitness_test.dart' show gymApi, openGym;

/// Roadmap 64: a question or answer the business hid shows to its author
/// with a note; a frozen membership says Frozen and its code doesn't promise
/// to let them in.
void main() {
  Map<String, dynamic> withCode(Map<String, dynamic> m) => {
    ...m,
    'member_code': {
      'code': 'Q4MZ7KP2XH9D',
      'qr_payload': 'YM1.${m['id']}.Q4MZ7KP2XH9D',
    },
  };

  String iso(DateTime t) => t.toUtc().toIso8601String();

  testWidgets('a frozen membership says until when, and the code says so', (
    tester,
  ) async {
    final now = DateTime.now();
    final back = DateTime(now.year, now.month, now.day + 8);
    final api = gymApi()
      ..memberships = [
        {
          ...withCode(
            membershipJson(
              name: 'Monthly unlimited',
              period: 'month',
              creditsLeft: null,
              endsAt: iso(now.add(const Duration(days: 40))),
            ),
          ),
          'frozen': {
            'from': iso(now.subtract(const Duration(days: 2))),
            'until': iso(back),
          },
        },
      ];
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.text('Frozen'), findsOneWidget);
    expect(find.textContaining('Frozen until'), findsOneWidget);
    expect(find.text('Show this at the door'), findsNothing);
    expect(
      find.text(
        "Your membership is frozen, so this code won't let you in until it's back.",
      ),
      findsOneWidget,
    );
    // The code is still there for the desk.
    expect(find.text('Q4MZ-7KP2-XH9D'), findsOneWidget);
  });

  testWidgets('a freeze to come says when it starts; the door still lets in', (
    tester,
  ) async {
    final now = DateTime.now();
    final api = gymApi()
      ..memberships = [
        {
          ...withCode(
            membershipJson(endsAt: iso(now.add(const Duration(days: 40)))),
          ),
          'frozen': {
            'from': iso(now.add(const Duration(days: 3))),
            'until': null,
          },
        },
      ];
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.textContaining('Frozen from'), findsOneWidget);
    expect(find.text('Show this at the door'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
  });

  testWidgets('a hidden question and a hidden answer tell their author', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = await openApp(tester, qna: true, enrolled: true);
    app.api.questions = [
      {...questionJson(), 'hidden': true},
    ];
    app.api.thread = {
      ...questionThreadJson(),
      'hidden': true,
      'answers': [
        {
          'id': 4,
          'text': 'My second thought.',
          'author': personJson(),
          'created_at': '2026-10-03T11:00:00Z',
          'mine': true,
          'hidden': true,
        },
      ],
    };
    await go(app, tester, '/course/1');
    await tester.tap(find.text('Q&A'));
    await TestApp.settle(tester);
    expect(
      find.text('Hidden by the academy. Only you can see it.'),
      findsOneWidget,
    );
    await go(app, tester, '/question/3');
    expect(
      find.text('Hidden by the academy. Only you can see it.'),
      findsNWidgets(2),
    );
  });

  test(
    'the freeze and hidden flags read the contract; kept memberships too',
    () {
      final m = Membership.fromJson({
        ...membershipJson(),
        'frozen': {
          'from': '2026-10-10T21:00:00Z',
          'until': '2026-10-20T21:00:00Z',
        },
      });
      expect(m.frozenAt(DateTime.utc(2026, 10, 15)), isTrue);
      expect(m.frozenAt(DateTime.utc(2026, 10, 9)), isFalse);
      expect(m.frozenAt(DateTime.utc(2026, 10, 21)), isFalse);
      final again = Membership.fromJson(m.toJson());
      expect(again.frozenUntil, DateTime.utc(2026, 10, 20, 21));
      final open = Membership.fromJson({
        ...membershipJson(),
        'frozen': {'from': '2026-10-10T21:00:00Z', 'until': null},
      });
      expect(open.frozenAt(DateTime.utc(2027, 1, 1)), isTrue);
      expect(Membership.fromJson(membershipJson()).frozenFrom, isNull);
      expect(CourseQuestion.fromJson(questionJson()).hidden, isFalse);
      expect(
        QuestionAnswer.fromJson({
          'id': 1,
          'text': 'x',
          'author': personJson(),
          'created_at': '2026-10-03T11:00:00Z',
          'mine': true,
          'hidden': true,
        }).hidden,
        isTrue,
      );
    },
  );
}
