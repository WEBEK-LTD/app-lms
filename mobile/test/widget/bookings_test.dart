import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi bookingsApi({bool staffChoice = true, int? cancelBefore = 60}) =>
    FakeApi(
      config: configJson(
        lms: null,
        bookings: true,
        staffChoice: staffChoice,
        cancelBeforeMinutes: cancelBefore,
      ),
    );

/// A phone tall enough to show a whole service page without scrolling.
void tallPhone(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(780, 2800)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

String location(TestApp app) => app.container
    .read(appRouterProvider)
    .routerDelegate
    .currentConfiguration
    .last
    .matchedLocation;

Future<TestApp> openService(
  WidgetTester tester, {
  FakeApi? api,
  bool signedIn = true,
}) async {
  tallPhone(tester);
  final app = TestApp(
    signedIn: signedIn,
    guest: !signedIn,
    appType: AppType.booking,
    api: api ?? bookingsApi(),
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).push('/service/1');
  await TestApp.settle(tester);
  return app;
}

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  final cases = [
    for (final size in sizes.entries)
      for (final template in AppTemplate.values)
        for (final dark in [false, true]) (size, template, dark, 1.0),
    for (final template in AppTemplate.values)
      (sizes.entries.elementAt(1), template, false, 1.5),
  ];

  // Every Bookings screen on each size, template and theme: any overflow or
  // build error fails.
  for (final (size, template, dark, textScale) in cases) {
    final name =
        'bookings screens: ${size.key}, ${template.name}, '
        '${dark ? 'dark' : 'light'}'
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
        appType: AppType.booking,
        api: bookingsApi(),
        preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
      );
      void clean(String step) =>
          expect(tester.takeException(), isNull, reason: step);

      await app.pump(tester);
      clean('home');
      expect(find.text('Book an appointment'), findsOneWidget);
      expect(find.text('Your next appointment'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Book').last);
      await TestApp.settle(tester);
      clean('services');
      expect(find.text('Massage'), findsWidgets);

      await tester.tap(find.bySemanticsLabel('Appointments').last);
      await TestApp.settle(tester);
      clean('appointments');
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Haircut'), findsWidgets);

      await tester.tap(find.bySemanticsLabel('Account').last);
      await TestApp.settle(tester);
      clean('account');
      expect(find.text('Learning'), findsNothing);
      expect(find.text('Shopping'), findsNothing);

      final router = app.container.read(appRouterProvider);
      for (final (location, marker) in [
        ('/service/1', 'Choose a time'),
        ('/appointment/7', 'Appointment'),
        ('/account/settings', 'Appearance'),
      ]) {
        router.push(location);
        await TestApp.settle(tester);
        clean(location);
        expect(find.text(marker), findsWidgets, reason: location);
        router.pop();
        await TestApp.settle(tester);
      }
    });
  }

  testWidgets('home skips sections it does not know', (tester) async {
    final app = TestApp(
      signedIn: true,
      appType: AppType.booking,
      api: bookingsApi(),
    );
    await app.pump(tester);
    expect(find.text('From a newer plugin'), findsNothing);
    expect(find.text('Popular'), findsOneWidget);
  });

  testWidgets('books a time with the chosen stylist and a note', (
    tester,
  ) async {
    final api = bookingsApi();
    final app = await openService(tester, api: api);
    expect(find.text('Choose a time'), findsWidgets);

    await tester.tap(find.bySemanticsLabel('Mehmet Demir, ₺350.00'));
    await TestApp.settle(tester);
    expect(api.lastAvailability?.staff, 2);
    expect(find.text('30 min · ₺350.00'), findsOneWidget);

    await tester.tap(find.text('09:30'));
    await TestApp.settle(tester);
    await tester.tap(find.textContaining(RegExp(r'^Book .*09:30$')));
    await TestApp.settle(tester);
    expect(find.text('Confirm your booking'), findsOneWidget);
    expect(find.text('Mehmet Demir'), findsWidgets);

    await tester.enterText(find.byType(TextField), 'First visit');
    await tester.tap(find.text('Confirm booking'));
    await TestApp.settle(tester);

    final booking = api.lastBooking!;
    expect(booking.service, 1);
    expect(booking.staff, 2);
    expect(booking.notes, 'First visit');
    expect(booking.start.isUtc, isTrue);
    expect(booking.start.minute, 30);
    expect(location(app), '/appointment/7');
    expect(find.text('Your appointment is booked.'), findsOneWidget);
  });

  testWidgets('anyone available sends no staff member', (tester) async {
    final api = bookingsApi();
    await openService(tester, api: api);
    await tester.tap(find.text('09:00'));
    await TestApp.settle(tester);
    await tester.tap(find.textContaining(RegExp(r'^Book ')));
    await TestApp.settle(tester);
    expect(find.text('Anyone available'), findsOneWidget);
    await tester.tap(find.text('Confirm booking'));
    await TestApp.settle(tester);
    expect(api.lastBooking?.staff, isNull);
  });

  testWidgets('a time someone else took asks for another one', (tester) async {
    final api = bookingsApi();
    await openService(tester, api: api);
    final loads = api.count('getAvailability');
    await tester.tap(find.text('10:00'));
    await TestApp.settle(tester);
    await tester.tap(find.textContaining(RegExp(r'^Book ')));
    await TestApp.settle(tester);
    api.failures['bookAppointment'] = const ApiException(
      code: 'slot_taken',
      message: 'This time was just taken.',
      statusCode: 409,
    );
    await tester.tap(find.text('Confirm booking'));
    await TestApp.settle(tester);
    expect(find.text('Confirm your booking'), findsNothing);
    expect(
      find.text('This time was just taken. Please choose another one.'),
      findsOneWidget,
    );
    expect(api.count('getAvailability'), greaterThan(loads));
    expect(find.text('Choose a time'), findsWidgets);
  });

  testWidgets('guests sign in before booking', (tester) async {
    final api = bookingsApi();
    final app = await openService(tester, api: api, signedIn: false);
    await tester.tap(find.text('09:00'));
    await TestApp.settle(tester);
    await tester.tap(find.textContaining(RegExp(r'^Book ')));
    await TestApp.settle(tester);
    expect(api.count('bookAppointment'), 0);
    expect(location(app), '/sign-in');
  });

  testWidgets('no staff picker when the plugin assigns staff', (tester) async {
    await openService(tester, api: bookingsApi(staffChoice: false));
    expect(find.text('Anyone'), findsNothing);
    expect(find.text('With'), findsNothing);
  });

  testWidgets('a week without free times offers the next one', (tester) async {
    final api = bookingsApi()..noFreeTimes = true;
    await openService(tester, api: api);
    expect(find.text('No free times this week'), findsOneWidget);
    final from = api.lastAvailability!.from;
    await tester.tap(find.text('Next week'));
    await TestApp.settle(tester);
    expect(api.lastAvailability!.from, isNot(from));
  });

  testWidgets('cancels an appointment after confirming', (tester) async {
    final api = bookingsApi();
    final app = TestApp(signedIn: true, appType: AppType.booking, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/appointment/7');
    await TestApp.settle(tester);
    expect(find.text('Approved'), findsOneWidget);
    expect(find.textContaining('You can cancel up to 1 h'), findsOneWidget);

    await tester.tap(find.text('Cancel appointment'));
    await TestApp.settle(tester);
    expect(find.text('Cancel this appointment?'), findsOneWidget);
    await tester.tap(find.text('Cancel appointment').last);
    await TestApp.settle(tester);

    expect(api.count('cancelMyAppointment'), 1);
    expect(find.text('Cancelled'), findsOneWidget);
    expect(find.text('Cancel appointment'), findsNothing);
  });

  testWidgets('too late to cancel says to contact the business', (
    tester,
  ) async {
    final api = bookingsApi()..appointment = appointmentJson(canCancel: false);
    final app = TestApp(signedIn: true, appType: AppType.booking, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/appointment/7');
    await TestApp.settle(tester);
    expect(find.text('Cancel appointment'), findsNothing);
    expect(find.textContaining("It's too late to cancel"), findsOneWidget);
  });

  group('21 clinics', () {
    FakeApi clinicApi() {
      final api = FakeApi(config: clinicConfigJson());
      api.service = serviceDetailJson(
        staff: [
          doctorJson(),
          staffJson(id: 2, name: 'Mehmet Demir'),
        ],
      );
      return api;
    }

    testWidgets('use doctor, patient and visit words', (tester) async {
      final app = TestApp(
        signedIn: true,
        appType: AppType.booking,
        api: clinicApi(),
      );
      await app.pump(tester);
      expect(find.text('Book a visit'), findsOneWidget);
      expect(find.text('Your next visit'), findsOneWidget);
      expect(find.text('Book an appointment'), findsNothing);
      await tester.scrollUntilVisible(
        find.text('Our doctors'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Our doctors'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Visits').last);
      await TestApp.settle(tester);
      expect(find.text('Visits'), findsWidgets);

      app.container.read(appRouterProvider).push('/appointment/7');
      await TestApp.settle(tester);
      expect(find.text('Visit'), findsOneWidget);
      expect(find.text('Cancel visit'), findsOneWidget);
    });

    testWidgets('a doctor shows their profile', (tester) async {
      await openService(tester, api: clinicApi());
      expect(find.text('Doctor'), findsOneWidget);
      expect(find.text('Any doctor'), findsOneWidget);
      expect(find.text('View profile'), findsNothing);

      await tester.tap(find.text('Dr. Ayşe Demir'));
      await TestApp.settle(tester);
      expect(find.text('View profile'), findsOneWidget);
      expect(
        find.text("Dentist · Orthodontics · Children's dentistry"),
        findsOneWidget,
      );
      await tester.tap(find.text('View profile'));
      await TestApp.settle(tester);
      expect(find.text('Specialties'), findsOneWidget);
      expect(find.text('Turkish · English'), findsWidgets);
      expect(find.text('About Dr. Ayşe Demir'), findsOneWidget);
      expect(find.textContaining('Twelve years in Istanbul'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('asks the intake questions, checks them and books with them', (
      tester,
    ) async {
      final api = clinicApi();
      final app = await openService(tester, api: api);
      await tester.tap(find.text('09:00'));
      await TestApp.settle(tester);
      await tester.tap(find.textContaining(RegExp(r'^Book ')));
      await TestApp.settle(tester);

      expect(find.text('A few questions'), findsOneWidget);
      expect(
        find.text(
          'Answer these before you book. Only you and Your Academy see your '
          'answers.',
        ),
        findsOneWidget,
      );
      expect(find.text('Optional'), findsNothing);
      expect(find.textContaining('Optional'), findsWidgets);

      // Required questions are checked first, and nothing is booked.
      await tester.tap(find.text('Continue'));
      await TestApp.settle(tester);
      expect(find.text('Please answer this.'), findsOneWidget);
      expect(find.text('Please choose one.'), findsOneWidget);
      expect(api.count('bookAppointment'), 0);

      await tester.enterText(
        find.byKey(const ValueKey('intake-reason')),
        '  Pain on the left side ',
      );
      await tester.tap(find.text('Yes'));
      await tester.enterText(
        find.byKey(const ValueKey('intake-heard')),
        'A friend',
      );
      await tester.tap(find.text('Continue'));
      await TestApp.settle(tester);
      expect(find.text('A few questions'), findsNothing);
      expect(find.text('Confirm your visit'), findsOneWidget);
      expect(find.text('Any available doctor'), findsOneWidget);

      await tester.tap(find.text('Confirm booking'));
      await TestApp.settle(tester);
      expect(api.lastBooking?.answers, {
        'reason': 'Pain on the left side',
        'first_visit': 'Yes',
        'heard': 'A friend',
      });
      expect(location(app), '/appointment/7');
      expect(find.text('Your visit is booked.'), findsOneWidget);
    });

    testWidgets('going back from the questions books nothing', (tester) async {
      final api = clinicApi();
      await openService(tester, api: api);
      await tester.tap(find.text('09:30'));
      await TestApp.settle(tester);
      await tester.tap(find.textContaining(RegExp(r'^Book ')));
      await TestApp.settle(tester);
      await tester.tap(find.byTooltip('Close'));
      await TestApp.settle(tester);
      expect(find.text('A few questions'), findsNothing);
      expect(find.text('Confirm your visit'), findsNothing);
      expect(api.count('bookAppointment'), 0);
    });

    testWidgets('the questions fit a small phone with large text', (
      tester,
    ) async {
      final api = clinicApi();
      await openService(tester, api: api);
      await tester.tap(find.text('09:00'));
      await TestApp.settle(tester);
      await tester.tap(find.textContaining(RegExp(r'^Book ')));
      await TestApp.settle(tester);
      tester.view
        ..physicalSize = const Size(640, 1136)
        ..devicePixelRatio = 2;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await TestApp.settle(tester);
      expect(find.text('A few questions'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Continue'));
      await TestApp.settle(tester);
      expect(tester.takeException(), isNull);
    });

    testWidgets("a visit shows the patient's own answers", (tester) async {
      final api = clinicApi()
        ..appointment = appointmentJson(
          answers: [
            {
              'id': 'reason',
              'label': 'Reason for your visit',
              'value': 'Pain on the left side',
            },
            {'id': 'birth', 'label': 'Date of birth', 'value': '1990-04-02'},
          ],
        );
      final app = TestApp(signedIn: true, appType: AppType.booking, api: api);
      await app.pump(tester);
      app.container.read(appRouterProvider).push('/appointment/7');
      await TestApp.settle(tester);
      await tester.scrollUntilVisible(find.text('Your answers'), 200);
      expect(find.text('Pain on the left side'), findsOneWidget);
      expect(find.text('2 April 1990'), findsOneWidget);
      expect(
        find.text('Only you and Your Academy see these answers.'),
        findsOneWidget,
      );
    });
  });

  testWidgets('appointments need an account', (tester) async {
    final app = TestApp(
      guest: true,
      appType: AppType.booking,
      api: bookingsApi(),
    );
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('Appointments').last);
    await TestApp.settle(tester);
    expect(location(app), '/sign-in');
  });
}
