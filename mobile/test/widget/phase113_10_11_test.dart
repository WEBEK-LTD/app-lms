import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/widgets/file_viewer.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';

import '../support/bus_library_fixtures.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

class FakeLocator implements Locator {
  int reads = 0;

  @override
  Future<LocateResult> current() async {
    reads++;
    return const LocateResult.found((lat: 30.061, lng: 31.24, accuracy: 8));
  }
}

FakeApi schoolApi({
  List<String> roles = const ['parent'],
  bool bus = true,
  bool library = true,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': {
        ...schoolConfigJson(),
        'bus': bus,
        'library': library,
        'map': {
          'tiles_url': null,
          'attribution': null,
          'search': false,
          'routes': false,
        },
      },
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = schoolMeJson(roles: roles.where((r) => r != 'bus').toList());
  return api;
}

TestApp schoolApp(FakeApi api, {FakeLocator? locator}) => TestApp(
  api: api,
  appType: AppType.school,
  signedIn: true,
  overrides: [
    locatorProvider.overrideWithValue(locator ?? FakeLocator()),
    attachmentFetcherProvider.overrideWithValue(
      (url) async => Uint8List.fromList([1, 2, 3]),
    ),
  ],
);

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> go(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).go(location);
  await TestApp.settle(tester);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

void main() {
  test('113.10 and 113.11 notifications open the bus and the loans', () {
    expect(
      pushTargetLocation({'type': 'school_bus', 'student_id': '11'}),
      '/school/bus?student=11',
    );
    expect(
      pushTargetLocation({'type': 'school_library', 'student_id': '11'}),
      '/school/library-loans',
    );
  });

  test('113.10 and 113.11 the models read the contract', () {
    final trip = StudentBusTrip.fromJson(
      (studentBusJson()['items'] as List).first as Map<String, dynamic>,
    );
    expect(trip.trip, BusTrip.morning);
    expect(trip.stop.name, 'Garden Square');
    expect(trip.stops.map((s) => s.passed), [true, false]);
    expect(trip.run?.etaMinutes, 4);
    expect(trip.run?.student.status, isNull);
    final run = BusRun.fromJson(busRunJson(omar: 'boarded'));
    expect(run.running, isTrue);
    expect(run.boarded, 1);
    expect(run.stops.first.riders.first.mark.status, BusMarkStatus.boarded);
    final route = BusCrewRoute.fromJson(busCrewRouteJson());
    expect((route.driver, route.drives, route.trips.length), (true, true, 2));
    final book = LibraryBookDetail.fromJson(libraryBookDetailJson());
    expect(book.file?.name, 'The Little Prince.pdf');
    expect(book.borrowers.length, 2);
    final loans = LibraryLoans.fromJson(libraryLoansJson());
    expect(loans.current.single.overdue, isTrue);
    expect(loans.holds.single.status, LibraryHoldStatus.ready);
    final config = AppConfig.fromJson({
      ...configJson(lms: null),
      'school': {
        ...schoolConfigJson(),
        'bus': true,
        'library': true,
        'map': {'tiles_url': 'https://tiles.test/{z}/{x}/{y}.png'},
      },
    });
    expect(config.school?.bus, isTrue);
    expect(config.school?.tilesUrl, 'https://tiles.test/{z}/{x}/{y}.png');
    expect(
      User.fromJson({
        ...userJson(),
        'roles': ['bus'],
      }).isBusCrew,
      isTrue,
    );
  });

  group('113.10 The school bus', () {
    testWidgets('a parent follows the bus to their child\'s stop', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      await tapKey(tester, 'school-bus');
      expect(api.calls, contains('getStudentBus'));
      expect(find.text('Morning trip'), findsOneWidget);
      expect(find.text('Route 1 · ABC 123'), findsOneWidget);
      expect(find.text('Stop: Garden Square at 07:10'), findsOneWidget);
      expect(find.text('About 4 min to Garden Square'), findsOneWidget);
      expect(find.text('On its way'), findsOneWidget);
      // Without the platform's map, the stops as a list.
      expect(find.byKey(const ValueKey('bus-map')), findsNothing);
      expect(find.byKey(const ValueKey('bus-stop-1')), findsOneWidget);
    });

    testWidgets('a child on no route has no bus', (tester) async {
      usePhone(tester);
      final api = schoolApi()..studentBus = {'items': []};
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('bus', student: 11));
      expect(find.text('No bus for Omar Hassan'), findsOneWidget);
    });

    testWidgets('no bus tile when the school has no buses', (tester) async {
      usePhone(tester);
      final app = schoolApp(schoolApi(bus: false, library: false));
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-bus')), findsNothing);
      expect(find.byKey(const ValueKey('school-library')), findsNothing);
    });

    testWidgets('the driver starts the trip, shares the position, marks '
        'students and ends it', (tester) async {
      usePhone(tester);
      final locator = FakeLocator();
      final api = schoolApi(roles: ['teacher', 'bus']);
      final app = schoolApp(api, locator: locator);
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      await tapKey(tester, 'bus-duty');
      expect(find.text('Route 1 · ABC 123'), findsOneWidget);
      expect(find.text('Driver'), findsOneWidget);
      await tapKey(tester, 'bus-start-morning');
      expect(api.busStarted.single, (route: 5, trip: BusTrip.morning));
      expect(find.text('Route 1 · Morning trip'), findsOneWidget);
      expect(find.text('Nile Street'), findsOneWidget);
      expect(find.text('Laila Hassan'), findsOneWidget);
      // While the screen is open, the phone's position goes to the trip.
      expect(locator.reads, greaterThan(0));
      expect(api.busPositions.first, (run: 70, lat: 30.061, lng: 31.24));
      expect(
        find.text(
          "Your phone shares the bus's position while this screen is open.",
        ),
        findsOneWidget,
      );
      await tapKey(tester, 'mark-11-boarded');
      expect(api.busMarks.single, (
        run: 70,
        student: 11,
        status: BusMarkStatus.boarded,
      ));
      expect(find.text('1 on · 0 off · 0 absent · 2 in all'), findsOneWidget);
      await tapKey(tester, 'bus-end');
      expect(find.text('End the trip?'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, 'End the trip'));
      await TestApp.settle(tester);
      expect(api.calls, contains('endBusRun'));
      expect(find.text('This trip has ended.'), findsOneWidget);
      expect(find.byKey(const ValueKey('bus-end')), findsNothing);
    });

    testWidgets('a supervisor marks students but the driver starts the trip', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher', 'bus'])
        ..busCrewRoutes = [busCrewRouteJson(drives: false)];
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.busDuty);
      expect(find.text('Supervisor'), findsOneWidget);
      expect(find.byKey(const ValueKey('bus-start-morning')), findsNothing);
      expect(find.text('The driver starts this trip.'), findsNWidgets(2));
    });

    testWidgets("bus crew who don't teach find Bus duty in the Staff tab", (
      tester,
    ) async {
      usePhone(tester);
      final app = schoolApp(schoolApi(roles: ['staff', 'bus']));
      await app.pump(tester);
      await go(app, tester, Paths.staff);
      expect(find.byKey(const ValueKey('bus-duty')), findsOneWidget);
      await go(app, tester, Paths.account);
      expect(find.byKey(const ValueKey('bus-duty')), findsNothing);
    });

    testWidgets('parents have no Bus duty', (tester) async {
      usePhone(tester);
      final app = schoolApp(schoolApi());
      await app.pump(tester);
      await go(app, tester, Paths.account);
      expect(find.byKey(const ValueKey('bus-duty')), findsNothing);
    });
  });

  group('113.11 The library', () {
    testWidgets('books are searched and browsed by category', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      await tapKey(tester, 'school-library');
      expect(find.text('The Little Prince'), findsOneWidget);
      expect(find.text('1 on the shelf'), findsOneWidget);
      expect(find.text('All copies are out'), findsOneWidget);
      expect(find.text('E-book'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('library-search')),
        'prince',
      );
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await TestApp.settle(tester);
      expect(api.libraryQueries.last, (query: 'prince', category: ''));
      await tapKey(tester, 'library-category-Stories');
      expect(api.libraryQueries.last, (query: 'prince', category: 'Stories'));
    });

    testWidgets('a parent reserves a book for a child, cancels it, and '
        'reads the e-book in the app', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.libraryBook(40));
      expect(find.text('1 of 2 on the shelf'), findsOneWidget);
      expect(find.text('Shelf A3 · Stories · English'), findsOneWidget);
      await tapKey(tester, 'library-reserve');
      expect(find.text('Reserve it for'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('reserve-for-11')));
      await TestApp.settle(tester);
      expect(api.holdsPlaced.single, (book: 40, person: 11));
      expect(
        find.text('Held for you at the library until 4 Nov 2026.'),
        findsOneWidget,
      );
      expect(
        find.text('Held for Omar Hassan until 4 Nov 2026'),
        findsOneWidget,
      );
      await tester.tap(find.text('Cancel the reservation'));
      await TestApp.settle(tester);
      expect(api.holdsCancelled, [90]);
      await tapKey(tester, 'library-read');
      expect(find.byType(FileViewerScreen), findsOneWidget);
    });

    testWidgets("a parent sees their children's loans, overdue ones in red", (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('library'));
      await tapKey(tester, 'library-borrowed');
      expect(find.text('Books are lent for 14 days.'), findsOneWidget);
      expect(find.text('Atlas of Egypt'), findsOneWidget);
      expect(
        find.textContaining('Laila Hassan · Overdue since'),
        findsOneWidget,
      );
      expect(find.text('Reserved'), findsOneWidget);
      expect(
        find.text('Held for Omar Hassan until 4 Nov 2026'),
        findsOneWidget,
      );
    });

    testWidgets('teachers find the library in the Classroom tab', (
      tester,
    ) async {
      usePhone(tester);
      final app = schoolApp(schoolApi(roles: ['teacher']));
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      // 113.12 Below My payslips: scrolled to.
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('school-library')),
        300,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('classroom')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.byKey(const ValueKey('school-library')), findsOneWidget);
      expect(find.byKey(const ValueKey('bus-duty')), findsNothing);
    });
  });
}
