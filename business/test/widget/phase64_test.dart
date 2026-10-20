import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 64 Hidden course questions and answers in the Inbox, frozen memberships
/// on Members and at the door, and a push of another business switching to
/// it.
void main() {
  group('64 hidden questions and answers', () {
    testWidgets('hides a question: out of what waits, in Hidden with a note', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      expect(find.text('2 course questions to answer'), findsOneWidget);
      await go(tester, app, '/inbox');
      await tapOn(tester, find.text('Omar Said'));
      await tapOn(tester, find.byTooltip('Hide the question'));
      expect(app.api.calls, contains('setQuestionHidden'));
      expect(find.text('Hidden. Only its author sees it.'), findsOneWidget);
      expect(
        find.textContaining('only the student who asked sees it'),
        findsOneWidget,
      );
      await tester.pageBack();
      await settle(tester);
      expect(find.text('Omar Said'), findsNothing);
      await tapOn(tester, find.text('Hidden'));
      expect(find.text('Omar Said'), findsOneWidget);
      expect(find.text('Unknown visitor'), findsOneWidget);
      expect(find.text('Hidden from others'), findsNWidgets(2));
      await go(tester, app, '/today');
      expect(find.text('1 course question to answer'), findsOneWidget);
    });

    testWidgets("hides a student's answer, and shows one again", (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      await go(tester, app, '/inbox/questions/32');
      // The business's own answers can't be hidden: one button, Selin's.
      expect(find.text('Hide'), findsOneWidget);
      await tapOn(tester, find.text('Hide'));
      expect(app.api.calls, contains('setAnswerHidden'));
      expect(find.text('Hidden from others'), findsOneWidget);

      await go(tester, app, '/inbox/questions/33');
      expect(
        find.text('Message me for the answers to every quiz!'),
        findsOneWidget,
      );
      expect(find.text('Hidden from others'), findsOneWidget);
      await tapOn(tester, find.text('Show again'));
      expect(find.text('It shows in the app again.'), findsOneWidget);
      expect(find.text('Hidden from others'), findsNothing);
    });

    for (final (lang, hidden, waiting) in [
      ('en', 'Hidden', 'Waiting for you'),
      ('ar', 'مخفي', 'بانتظارك'),
      ('tr', 'Gizli', 'Sizi bekleyenler'),
    ]) {
      testWidgets('the questions filter stays on one line ($lang)', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        final app = TestApp(appId: FakeOwnerApi.academyId, language: lang);
        await app.pump(tester);
        await go(tester, app, '/inbox?tab=questions');
        expect(
          tester.getSize(find.text(hidden).first).height,
          tester.getSize(find.text(waiting).first).height,
        );
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('64 frozen memberships', () {
    testWidgets('Members: frozen until a day, unfreeze, and freeze another', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.gymId);
      await app.pump(tester);
      await push(tester, app, '/members');
      await tester.enterText(find.byType(TextField), 'nour');
      await tester.pump(const Duration(milliseconds: 400));
      await settle(tester);
      expect(find.text('Frozen'), findsOneWidget);
      expect(find.textContaining('Frozen until'), findsOneWidget);
      // Frozen: no check-in.
      expect(find.text('Check in Nour Hany'), findsNothing);
      await tapOn(tester, find.text('Unfreeze'));
      expect(app.api.calls, contains('unfreezeMember'));
      expect(
        find.text("The membership isn't frozen any more."),
        findsOneWidget,
      );
      expect(find.text('Check in Nour Hany'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'sara');
      await tester.pump(const Duration(milliseconds: 400));
      await settle(tester);
      await tapOn(tester, find.widgetWithText(OutlinedButton, 'Freeze').first);
      expect(find.text('First frozen day'), findsOneWidget);
      expect(find.text('Until you unfreeze it'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(FilledButton, 'Freeze'));
      expect(app.api.calls, contains('freezeMember'));
      expect(find.text('The membership is frozen.'), findsOneWidget);
      expect(find.text('Frozen until you unfreeze it'), findsOneWidget);
    });

    testWidgets('the door says Frozen until the day it is back', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.gymId);
      await app.pump(tester);
      await push(tester, app, '/scan/members');
      await tapOn(tester, find.text('Type the code'));
      await tester.enterText(find.byType(TextField), 'M7XK-P7QZ-2HD9');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Check'));
      expect(find.textContaining('Frozen until'), findsOneWidget);
      expect(find.text('Welcome in'), findsNothing);
    });

    for (final (lang, frozen) in [('ar', 'مجمّدة'), ('tr', 'Donduruldu')]) {
      testWidgets('Members in $lang', (tester) async {
        final app = TestApp(appId: FakeOwnerApi.gymId, language: lang);
        await app.pump(tester);
        await push(tester, app, '/members');
        expect(tester.takeException(), isNull);
        await tester.enterText(find.byType(TextField), 'nour');
        await tester.pump(const Duration(milliseconds: 400));
        await settle(tester);
        expect(find.text(frozen), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }

    test('the fake gives back the days a freeze no longer takes', () async {
      final api = FakeOwnerApi();
      final before = (await api.members(
        FakeOwnerApi.gymId,
        query: 'nour',
      )).page.items.single;
      final after = await api.unfreezeMember(FakeOwnerApi.gymId, 7);
      expect(after.status, 'active');
      expect(after.freezeSet, isFalse);
      expect(after.endsAt!.isBefore(before.endsAt!), isTrue);
      final door = await api.checkInMember(FakeOwnerApi.gymId, membershipId: 7);
      expect(door.outcome, 'admitted');
    });
  });

  testWidgets('a push of another business switches to it when tapped', (
    tester,
  ) async {
    final push = FakePush();
    final api = FakeOwnerApi()
      ..businesses = const [
        Business(
          id: 'own',
          name: 'Layla Café',
          role: TeamRole.owner,
          state: AccountState.active,
        ),
        Business(
          id: 'other',
          name: 'Omar Bakery',
          role: TeamRole.staff,
          state: AccountState.active,
        ),
      ];
    final app = TestApp(api: api, push: push);
    await app.pump(tester);
    push.openedController.add({
      'type': 'owner',
      'kind': 'new_order',
      'app_id': FakeOwnerApi.restaurantId,
      'order_id': '1041',
      'business_id': 'other',
      'business_name': 'Omar Bakery',
    });
    await settle(tester);
    expect(api.calls, contains('setBusiness'));
    expect(find.text('Now working on Omar Bakery'), findsOneWidget);

    // A push of the business the phone is on doesn't switch.
    api.calls.clear();
    push.openedController.add({
      'type': 'owner',
      'kind': 'new_order',
      'app_id': FakeOwnerApi.restaurantId,
      'order_id': '1041',
      'business_id': 'other',
      'business_name': 'Omar Bakery',
    });
    await settle(tester);
    expect(api.calls, isNot(contains('setBusiness')));
  });
}
