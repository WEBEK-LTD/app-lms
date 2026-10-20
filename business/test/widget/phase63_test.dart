import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 63 Course questions and reviews in the Inbox, a gym's members at the door,
/// and the fixes found in the demo (statuses and Needs you in the app's
/// language, plurals, Arabic lines kept whole, Markdown in the updates,
/// storage sizes, events without a capacity).
void main() {
  group('63 questions and reviews', () {
    testWidgets('Today says what waits, and the Inbox answers a question', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      expect(find.text('2 course questions to answer'), findsOneWidget);
      await tapOn(tester, find.text('2 course questions to answer'));
      expect(find.text('Waiting for you'), findsWidgets);
      expect(find.text('Omar Said'), findsOneWidget);
      expect(find.text('in Arabic for Beginners'), findsWidgets);
      expect(find.text('No answers yet'), findsOneWidget);

      await tapOn(tester, find.text('Omar Said'));
      await tester.enterText(find.byType(TextField), 'Yes, in the lesson.');
      await tapOn(tester, find.byTooltip('Send'));
      expect(app.api.calls, contains('answerQuestion'));
      expect(find.text('Answer sent. The student is told.'), findsOneWidget);
      expect(find.text('Yes, in the lesson.'), findsOneWidget);
      expect(find.text('You'), findsOneWidget);

      await tester.pageBack();
      await settle(tester);
      // Answered: no longer waiting.
      expect(find.text('Omar Said'), findsNothing);
      await tapOn(tester, find.text('Answered'));
      expect(find.text('Omar Said'), findsOneWidget);
    });

    testWidgets('reviews: the average, reply, hide and show again', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      await go(tester, app, Paths63.reviews);
      expect(find.text('4 out of 5 from 3 reviews'), findsOneWidget);
      expect(find.text('Fatma Şahin'), findsOneWidget);
      expect(
        find.text('Thank you, Youssef! New email examples arrive next week.'),
        findsOneWidget,
      );

      await tapOn(tester, find.text('Reply').first);
      await tester.enterText(find.byType(TextField), 'Thank you, Fatma!');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(app.api.calls, contains('replyReview'));
      expect(find.text('Thank you, Fatma!'), findsOneWidget);

      await tapOn(tester, find.text('Hide').first);
      expect(app.api.calls, contains('setReviewHidden'));
      expect(find.text('Hidden from others'), findsOneWidget);
      await tapOn(tester, find.text('Hidden'));
      expect(find.text('Show again'), findsNWidgets(2));
      await tapOn(tester, find.text('Show again').first);
      expect(find.text('It shows in the app again.'), findsOneWidget);
    });

    testWidgets('Staff with Messages only: questions, no reviews', (
      tester,
    ) async {
      final api = FakeOwnerApi()..joinAs(TeamRole.staff, areas: ['messages']);
      final app = TestApp(api: api, appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      await go(tester, app, '/inbox');
      expect(find.text('Omar Said'), findsOneWidget);
      // One kind only: no tabs between kinds.
      expect(find.text('Reviews'), findsNothing);
      expect(find.text('Questions'), findsNothing);
    });

    testWidgets('the Inbox in Arabic', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.academyId, language: 'ar');
      await app.pump(tester);
      await go(tester, app, '/inbox');
      expect(find.text('الأسئلة'), findsOneWidget);
      expect(find.text('التقييمات'), findsOneWidget);
      expect(find.text('بانتظارك'), findsWidgets);
      expect(find.text('لا إجابات بعد'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    test('a push opens the question, or the reviews', () {
      expect(
        pushTarget({'kind': 'new_message', 'question_id': '31'}).location,
        '/inbox/questions/31',
      );
      expect(
        pushTarget({'kind': 'new_review', 'review_id': '41'}).location,
        '/inbox?tab=reviews',
      );
    });
  });

  group('63 a gym at the door', () {
    testWidgets('Today counts members in; the scanner lets in once a day', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.gymId);
      await app.pump(tester);
      expect(find.text('Members in today'), findsOneWidget);
      expect(find.text('3'), findsWidgets);
      await tapOn(tester, find.text('Scan'));
      expect(find.byKey(const ValueKey('camera')), findsOneWidget);

      app.scanner.see(FakeOwnerApi.memberQr);
      await settle(tester);
      expect(find.text('Welcome in'), findsOneWidget);
      expect(find.text('Sara Adel'), findsOneWidget);
      expect(find.textContaining('Monthly unlimited'), findsOneWidget);
      expect(find.text('4 members came in today'), findsOneWidget);

      // Typed again: in already, with when.
      await tapOn(tester, find.text('Type the code'));
      await tester.enterText(find.byType(TextField), 'q4mz-7kp2-xh9d');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Check'));
      expect(find.text('Already in today'), findsOneWidget);
      expect(find.textContaining('Checked in today at'), findsOneWidget);

      // A QR code this app didn't make.
      app.scanner.see('YM1.2.${FakeOwnerApi.memberCode}');
      await settle(tester);
      expect(find.text('Not a member code of this app'), findsOneWidget);
    });

    testWidgets('Members: find by name, check in, ended and used-up ones', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.gymId);
      await app.pump(tester);
      await push(tester, app, '/members');
      expect(find.text('Came in today'), findsOneWidget);
      expect(find.text('3 members came in today'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'sara');
      await tester.pump(const Duration(milliseconds: 400));
      await settle(tester);
      await tapOn(tester, find.text('Check in Sara Adel'));
      expect(app.api.calls, contains('checkInMember'));
      expect(find.text('Welcome in'), findsOneWidget);
      await tester.tapAt(const Offset(10, 10));
      await settle(tester);

      await tester.enterText(find.byType(TextField), 'layla');
      await tester.pump(const Duration(milliseconds: 400));
      await settle(tester);
      await tapOn(tester, find.text('Check in Layla Samir'));
      expect(find.text('Membership ended'), findsOneWidget);
      await tester.tapAt(const Offset(10, 10));
      await settle(tester);

      await tester.enterText(find.byType(TextField), 'tarek');
      await tester.pump(const Duration(milliseconds: 400));
      await settle(tester);
      expect(find.text('10-class pack · No classes left'), findsNothing);
      await tapOn(tester, find.text('Check in Tarek Ali'));
      expect(find.text('No classes left'), findsWidgets);
    });

    testWidgets('the door in Arabic', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.gymId, language: 'ar');
      await app.pump(tester);
      expect(find.text('أعضاء حضروا اليوم'), findsOneWidget);
      await push(tester, app, '/scan/members');
      app.scanner.see(FakeOwnerApi.memberQr);
      await settle(tester);
      expect(find.text('أهلًا بك، تفضّل'), findsOneWidget);
      expect(find.text('حضر 4 أعضاء اليوم'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('63 fixes found in the demo', () {
    testWidgets(
      'Arabic: Needs you and the order steps in Arabic, with plurals',
      (tester) async {
        final app = TestApp(language: 'ar');
        await app.pump(tester);
        expect(find.text('3 طلبات قيد التنفيذ'), findsOneWidget);
        expect(find.textContaining('orders in progress'), findsNothing);
        await go(tester, app, '/orders');
        expect(find.text('جديد'), findsWidgets);
        for (final english in ['New', 'Preparing', 'Ready', 'In progress']) {
          expect(find.text(english), findsNothing);
        }
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('Turkish: Needs you in Turkish', (tester) async {
      final app = TestApp(language: 'tr');
      await app.pump(tester);
      expect(find.text('Hazırlanan 3 sipariş'), findsOneWidget);
    });

    testWidgets('one order in progress is singular', (tester) async {
      final api = FakeOwnerApi();
      final app = TestApp(api: api);
      await app.pump(tester);
      final orders = (await api.orders(
        FakeOwnerApi.restaurantId,
        statuses: ['processing'],
      )).items;
      for (final o in orders.skip(1)) {
        await api.changeOrderStatus(
          FakeOwnerApi.restaurantId,
          o.id,
          'cancelled',
        );
      }
      await go(tester, app, '/orders');
      await go(tester, app, '/today');
      expect(find.text('1 order in progress'), findsOneWidget);
    });

    for (final (lang, path) in [
      ('en', '/scan/members'),
      ('ar', '/scan/members'),
      ('tr', '/scan/members'),
      ('ar', '/scan'),
    ]) {
      testWidgets(
        'no camera: the message stays inside the frame ($lang $path)',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          final app = TestApp(
            appId: path == '/scan' ? FakeOwnerApi.eventsId : FakeOwnerApi.gymId,
            language: lang,
          );
          app.scanner.denied = true;
          await app.pump(tester);
          await push(tester, app, path);
          final frame = tester.getRect(find.byType(AspectRatio).first);
          final message = find.descendant(
            of: find.byType(AspectRatio).first,
            matching: find.byType(Text),
          );
          expect(message, findsOneWidget);
          final text = tester.getRect(message);
          // The orange frame is 36 from each edge and 3 wide.
          expect(text.left, greaterThan(frame.left + 39));
          expect(text.right, lessThan(frame.right - 39));
          expect(tester.takeException(), isNull);
        },
      );
    }

    testWidgets('the reviews filter keeps each label on one line', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      for (final (lang, label, all) in [
        ('en', 'No reply', 'All'),
        ('ar', 'بلا رد', 'الكل'),
        ('tr', 'Yanıtsız', 'Tümü'),
      ]) {
        final app = TestApp(appId: FakeOwnerApi.academyId, language: lang);
        await app.pump(tester);
        await go(tester, app, Paths63.reviews);
        expect(
          tester.getSize(find.text(label)).height,
          tester.getSize(find.text(all).last).height,
          reason: lang,
        );
      }
    });

    test('items are kept whole in a right-to-left line', () {
      expect(
        isolate('2 × Chicken shawarma'),
        '\u20682 × Chicken shawarma\u2069',
      );
    });

    testWidgets('Updates: the title has room, and Markdown shows as bold', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/updates');
      expect(find.byTooltip('Mark all as read'), findsOneWidget);
      expect(find.textContaining('**'), findsNothing);
      expect(
        find.textContaining('The dashboard may be slow', findRichText: true),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('Plan & storage: MB under a GB, said once', (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/plan');
      expect(find.textContaining(' MB of 20 GB used'), findsOneWidget);
      expect(find.textContaining('0.0 GB'), findsNothing);
    });

    testWidgets('an event without a limit says so', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.eventsId, language: 'ar');
      await app.pump(tester);
      await go(tester, app, '/events');
      await tester.scrollUntilVisible(
        find.textContaining('دون حد للسعة'),
        200,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.textContaining('—'), findsNothing);
    });
  });
}

abstract final class Paths63 {
  static const reviews = '/inbox?tab=reviews';
}
