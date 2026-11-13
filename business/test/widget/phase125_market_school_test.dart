import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 125 The marketplace (Orders, Complaints, Vendors) and a school's day
/// with its excuses, reports and leave.
void main() {
  testWidgets('marketplace: complaints waiting, refund the suggested amount', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.marketId);
    await app.pump(tester);
    for (final label in ['Today', 'Market', 'Shipments', 'Chat', 'More']) {
      expect(find.widgetWithText(NavigationDestination, label), findsOneWidget);
    }
    expect(find.widgetWithText(NavigationDestination, 'Orders'), findsNothing);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Market'));
    expect(find.text('Marketplace'), findsOneWidget);
    expect(find.text('Complaints'), findsOneWidget);
    expect(find.text('Waiting for you'), findsOneWidget);
    expect(find.text('Waiting for the customer'), findsOneWidget);
    expect(find.text('Missing item: 1 × Olive oil 1 L'), findsOneWidget);
    expect(
      find.text('“The bag had everything else but no olive oil.”'),
      findsOneWidget,
    );
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Refund ${isolate('₺185.00')}'),
    );
    expect(find.text('Refund ${isolate('₺185.00')}?'), findsOneWidget);
    await tapOn(
      tester,
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(
          FilledButton,
          'Refund ${isolate('₺185.00')}',
        ),
      ),
    );
    expect(app.api.calls, contains('decideComplaint:partial_refund'));
    expect(find.text('Done: Refunded ₺185.00'), findsOneWidget);
  });

  testWidgets('a complaint: the messages and a reply', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.marketId);
    await app.pump(tester);
    await go(tester, app, '/market/complaints/k1');
    expect(find.text('M-1039'), findsOneWidget);
    expect(
      find.text('We are sorry, it was left on the counter.'),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextField), 'We are refunding it now.');
    await tapOn(tester, find.byTooltip('Send'));
    expect(app.api.calls, contains('replyComplaint'));
    expect(find.text('Reply sent'), findsOneWidget);
    expect(find.text('We are refunding it now.'), findsOneWidget);
  });

  testWidgets('marketplace orders and vendors', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.marketId);
    await app.pump(tester);
    await go(tester, app, '/market?tab=orders');
    expect(find.text('M-1042'), findsOneWidget);
    await tapOn(tester, find.text('M-1042'));
    expect(find.text('Olive oil 1 L'), findsNothing);
    expect(find.text('1 × Olive oil 1 L'), findsOneWidget);
    await tester.pageBack();
    await settle(tester);
    await tapOn(tester, find.text('Vendors'));
    expect(find.text('Fresh Mart'), findsOneWidget);
    expect(find.text('Grocery · 18 orders today'), findsOneWidget);
  });

  testWidgets('marketplace in Arabic is right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.marketId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/market');
    expect(find.text('السوق الإلكتروني'), findsOneWidget);
    expect(find.text('بانتظارك'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('بانتظارك'))),
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('school: who is in, what needs the head, the day', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.schoolId);
    await app.pump(tester);
    for (final label in ['Today', 'School', 'Notify', 'Stats', 'More']) {
      expect(find.widgetWithText(NavigationDestination, label), findsOneWidget);
    }
    expect(find.widgetWithText(NavigationDestination, 'Orders'), findsNothing);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'School'));
    expect(find.textContaining('check-in closes 08:30'), findsOneWidget);
    expect(find.text('466 in all'), findsOneWidget);
    expect(find.text('412'), findsOneWidget);
    expect(find.text('Not in yet'), findsOneWidget);
    expect(find.textContaining('38 of 40'), findsOneWidget);
    expect(find.text('3 absence excuses'), findsOneWidget);
    expect(find.text('2 teachers’ reports to read'), findsOneWidget);
    expect(find.text('1 leave request'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('61 fees not paid'), 200);
    expect(find.text('3 buses running'), findsOneWidget);
    expect(find.text('${isolate('Route 2')} is 6 min late'), findsOneWidget);
    expect(find.text('120 yes · 8 no · 32 waiting'), findsOneWidget);

    // The Notify tab sends notifications.
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Notify'));
    expect(find.text('Send a notification'), findsWidgets);
  });

  testWidgets('an absence excuse: decline needs a note, accept tells them', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.schoolId);
    await app.pump(tester);
    await go(tester, app, '/school');
    await tapOn(tester, find.text('3 absence excuses'));
    expect(find.text('Absence excuse'), findsOneWidget);
    expect(find.text('Excuses · 3'), findsOneWidget);
    expect(find.text('Reports · 2'), findsOneWidget);
    expect(find.text('Leave · 1'), findsOneWidget);
    expect(find.text('Omar Hassan'), findsOneWidget);
    expect(find.text('Grade 5 · Class B'), findsOneWidget);
    expect(find.text('Illness'), findsOneWidget);
    expect(find.text('Doctor’s note.pdf'), findsOneWidget);
    expect(
      find.text(
        'Accepting marks both days excused in the register and tells the parents.',
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(
      find.text('Write a note to the parents to decline.'),
      findsOneWidget,
    );
    expect(app.api.calls, isNot(contains('answerExcuse:declined')));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Accept'));
    expect(app.api.calls, contains('answerExcuse:accepted'));
    expect(find.text('Excuse accepted. The parents are told.'), findsOneWidget);
    // The next one.
    expect(find.text('Lina Saleh'), findsOneWidget);
    expect(find.text('Excuses · 2'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Please bring a note.');
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(app.api.calls, contains('answerExcuse:declined'));
  });

  testWidgets('a teacher’s report is approved; leave is approved', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.schoolId);
    await app.pump(tester);
    await push(tester, app, '/school-review?kind=reports');
    expect(find.text('Teacher’s report'), findsOneWidget);
    expect(find.text('Aylin Demir'), findsOneWidget);
    expect(app.api.calls, contains('report'));
    expect(find.text('Two late arrivals this week'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Return'));
    expect(find.text('Write what to change first.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await settle(tester);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Approve'));
    expect(app.api.calls, contains('reviewReport:approve'));
    expect(find.text('Report approved'), findsOneWidget);

    await tapOn(tester, find.text('Leave · 1'));
    expect(find.text('Leave request'), findsOneWidget);
    expect(find.text('Selin Arı'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Approve'));
    expect(app.api.calls, contains('answerLeave:approved'));
    expect(find.text('No leave requests waiting'), findsOneWidget);
  });

  testWidgets('school in Arabic is right to left', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.schoolId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/school');
    expect(find.text('المدرسة'), findsWidgets);
    expect(find.text('3 أعذار غياب'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('3 أعذار غياب'))),
      TextDirection.rtl,
    );
    await tapOn(tester, find.text('3 أعذار غياب'));
    expect(find.text('عذر غياب'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
