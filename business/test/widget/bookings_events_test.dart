import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

void main() {
  group('Appointments', () {
    testWidgets('today: confirm one, decline another after asking', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.clinicId);
      await app.pump(tester);
      await tapOn(
        tester,
        find.widgetWithText(NavigationDestination, 'Appointments'),
      );
      expect(find.text('Yusuf Kaya'), findsOneWidget);
      expect(find.text('Mariam Ali'), findsOneWidget);
      expect(find.text('Hasan Çelik'), findsNothing); // in two days

      await tapOn(tester, find.widgetWithText(FilledButton, 'Confirm'));
      expect(app.api.calls, contains('changeAppointmentStatus:approved'));
      expect(find.text('Appointment: Confirmed'), findsOneWidget);

      await tapOn(tester, find.text('Upcoming'));
      await tester.scrollUntilVisible(find.text('Hasan Çelik'), 200);
      await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
      expect(find.text('Decline this appointment?'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(FilledButton, 'Decline'));
      expect(app.api.calls, contains('changeAppointmentStatus:rejected'));
    });

    testWidgets('details: notes and answers, no reschedule', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.clinicId);
      await app.pump(tester);
      await go(tester, app, '/appointments');
      await tapOn(tester, find.text('Yusuf Kaya'));
      expect(find.text('First visit'), findsOneWidget);
      expect(find.textContaining('Reschedule'), findsNothing);
      expect(find.text('Insurance: None'), findsOneWidget);
    });

    testWidgets('in Arabic', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.clinicId, language: 'ar');
      await app.pump(tester);
      await go(tester, app, '/appointments');
      expect(find.text('اليوم'), findsWidgets);
      expect(find.widgetWithText(FilledButton, 'تأكيد'), findsOneWidget);
    });
  });

  group('Events and the door', () {
    testWidgets('events with their ticket counts', (tester) async {
      final semantics = tester.ensureSemantics();
      final app = TestApp(appId: FakeOwnerApi.eventsId);
      await app.pump(tester);
      await tapOn(tester, find.widgetWithText(NavigationDestination, 'Events'));
      expect(find.text('Jazz on the Nile'), findsOneWidget);
      expect(find.text('24 in · 118 to come · capacity 200'), findsOneWidget);
      expect(
        find.bySemanticsLabel(RegExp('24 of 142 tickets checked in')),
        findsOneWidget,
      );
      semantics.dispose();
    });

    testWidgets(
      'scanning: let in once, then already used; typed codes; flashlight',
      (tester) async {
        final app = TestApp(appId: FakeOwnerApi.eventsId);
        await app.pump(tester);
        await go(tester, app, '/events');
        await tapOn(tester, find.text('Scan for this event').first);
        expect(find.byKey(const ValueKey('camera')), findsOneWidget);

        app.scanner.see(FakeOwnerApi.ticketCode);
        await settle(tester);
        expect(find.text('Let in'), findsOneWidget);
        expect(find.text('Welcome, Karim Mostafa.'), findsOneWidget);
        await tester.scrollUntilVisible(
          find.text('25/142'),
          200,
          scrollable: find.byType(Scrollable).last,
        );

        // The camera sees it again a moment later: ignored.
        app.scanner.see(FakeOwnerApi.ticketCode);
        await settle(tester);
        expect(app.api.calls.where((c) => c == 'checkIn'), hasLength(1));

        // Typed: a used ticket says when.
        await tapOn(tester, find.text('Type the code'));
        await tester.enterText(find.byType(TextField), 'a7k2-used');
        await tapOn(tester, find.widgetWithText(FilledButton, 'Check'));
        expect(find.text('Already used'), findsOneWidget);
        expect(find.textContaining('Used '), findsOneWidget);

        // A ticket for the other event.
        app.scanner.see('B8Z1-OTHER');
        await settle(tester);
        expect(find.text('Ticket for another event'), findsOneWidget);

        await tapOn(tester, find.byTooltip('Turn the flashlight on'));
        expect(app.scanner.torchToggles, 1);
        expect(find.byTooltip('Turn the flashlight off'), findsOneWidget);
      },
    );

    testWidgets('an unknown code', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.eventsId);
      await app.pump(tester);
      await push(tester, app, '/scan');
      app.scanner.see('NOPE');
      await settle(tester);
      expect(find.text('Ticket not found'), findsOneWidget);
    });

    testWidgets('the scanner in Arabic', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.eventsId, language: 'ar');
      await app.pump(tester);
      await push(tester, app, '/scan');
      app.scanner.see(FakeOwnerApi.ticketCode);
      await settle(tester);
      expect(find.text('مسموح بالدخول'), findsOneWidget);
    });
  });

  group('Donations', () {
    testWidgets('totals by campaign, the donations, a filter', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.charityId);
      await app.pump(tester);
      await tapOn(
        tester,
        find.widgetWithText(NavigationDestination, 'Donations'),
      );
      expect(find.text('Winter blankets'), findsWidgets);
      expect(find.text('E£18,500.00'), findsOneWidget);
      expect(find.text('of E£25,000.00 · 214 donors'), findsOneWidget);
      expect(find.text('Hana'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Anonymous'), 200);
      await tester.scrollUntilVisible(find.text('Refunded'), 200);

      await tester.scrollUntilVisible(
        find.widgetWithText(ChoiceChip, 'School bags'),
        -200,
      );
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'School bags'));
      expect(find.text('Hana'), findsNothing);
      expect(find.text('Ali'), findsOneWidget);
    });
  });
}
