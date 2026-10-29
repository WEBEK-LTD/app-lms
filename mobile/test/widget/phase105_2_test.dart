import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/rides/data/rides_providers.dart';
import 'package:yallapp/modules/rides/rides_routes.dart';
import 'package:yallapp/modules/rides/widgets/ride_widgets.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

class FakeLocator implements Locator {
  int reads = 0;

  @override
  Future<LocateResult> current() async {
    reads++;
    return const LocateResult.found((lat: 30.0459, lng: 31.2243, accuracy: 8));
  }
}

FakeApi ridesApi({
  List<String> roles = const [],
  String driverApp = 'same',
  bool pin = true,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      // No map: its attribution doesn't fit the test font.
      'rides': {
        ...ridesConfigJson(driverApp: driverApp, pin: pin),
        'map': {'tiles_url': null, 'attribution': null},
      },
    },
  );
  api.me = {...userJson(), 'roles': roles};
  return api;
}

TestApp ridesApp(
  FakeApi api, {
  bool signedIn = true,
  AppRole role = AppRole.customer,
  FakeLocator? locator,
  List<String>? shared,
}) => TestApp(
  api: api,
  appType: AppType.rides,
  signedIn: signedIn,
  guest: !signedIn,
  build: (b) => b.copyWith(role: role),
  overrides: [
    locatorProvider.overrideWithValue(locator ?? FakeLocator()),
    shareRideProvider.overrideWithValue((text) async => shared?.add(text)),
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

/// Scrolls the list with this key until the finder shows.
Future<void> scrollTo(WidgetTester tester, Finder target, String list) async {
  await tester.scrollUntilVisible(
    target,
    200,
    scrollable: find
        .descendant(
          of: find.byKey(ValueKey(list)),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await TestApp.settle(tester);
}

List<String?> tabPaths(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.path).toList();

void main() {
  group('105.2 Driver tab', () {
    ShellTab tab(String path) =>
        ShellTab(location: path, label: (_) => path, icon: Icons.circle);

    test('is added before Account, for drivers only', () {
      final tabs = [tab(Paths.ride), tab(Paths.myRides), tab(Paths.account)];
      expect(withDriverTab(tabs, true).map((t) => t.path), [
        Paths.ride,
        Paths.myRides,
        Paths.driver,
        Paths.account,
      ]);
      expect(withDriverTab(tabs, false).map((t) => t.path), [
        Paths.ride,
        Paths.myRides,
        Paths.account,
      ]);
      expect(withDriverTab(tabs, null), same(tabs));
      expect(driverTab.path, Paths.driver);
    });

    test('notifications open the ride and the driver\'s screen', () {
      expect(
        pushTargetLocation({'type': 'ride_update', 'ride_id': '7'}),
        Paths.rideFollow(7),
      );
      expect(pushTargetLocation({'type': 'ride_update'}), Paths.myRides);
      expect(
        pushTargetLocation({'type': 'ride_offer', 'ride_id': 7}),
        Paths.driver,
      );
    });

    test('a ride and the driver\'s screens need an account', () {
      expect(Paths.requiresAuth(Paths.rideFollow(3)), isTrue);
      expect(Paths.requiresAuth(Paths.myRides), isTrue);
      expect(Paths.requiresAuth(Paths.driver), isTrue);
      expect(Paths.requiresAuth(Paths.driverRide(3)), isTrue);
      // Where to: anyone can look before signing in.
      expect(Paths.requiresAuth(Paths.ride), isFalse);
    });
  });

  testWidgets('105.2 a rider sets both places, sees the fares and asks for '
      'a ride', (tester) async {
    usePhone(tester);
    final api = ridesApi()..rides = [];
    final app = ridesApp(api);
    await app.pump(tester);
    expect(tabPaths(app), [Paths.ride, Paths.myRides, Paths.account]);
    await go(app, tester, Paths.ride);
    expect(find.text('Where to?'), findsOneWidget);
    expect(api.count('estimateRide'), 0);

    await tapKey(tester, 'pickup-here');
    expect(
      tester
          .widget<TextField>(find.byKey(const ValueKey('pickup-address')))
          .controller!
          .text,
      'My location',
    );
    await tester.enterText(
      find.byKey(const ValueKey('dropoff-address')),
      'Tahrir Square',
    );
    await tapKey(tester, 'dropoff-paste');
    await tester.enterText(
      find.byKey(const ValueKey('paste-link-field')),
      '30.0444, 31.2357',
    );
    await tester.tap(find.text('Use this place'));
    await tester.pump(const Duration(milliseconds: 500));
    await TestApp.settle(tester);

    expect(api.rideEstimates, isNotEmpty);
    await scrollTo(
      tester,
      find.byKey(const ValueKey('ride-type-2')),
      'ride-form',
    );
    expect(find.text('Economy'), findsOneWidget);
    expect(find.text('E£96.00'), findsOneWidget);
    expect(find.textContaining('4 min away'), findsOneWidget);
    expect(find.textContaining('No car nearby now'), findsOneWidget);

    await tapKey(tester, 'ride-type-2');
    await tapKey(tester, 'ride-request');
    final asked = api.rideRequests.single;
    expect(asked.vehicleTypeId, 2);
    expect(asked.pickup.lat, 30.0459);
    expect(asked.dropoff.lng, 31.2357);
    expect(asked.payment, PaymentMethod.cash);
    expect(asked.scheduledAt, isNull);
    // The new ride opens, looking for a driver.
    expect(find.text('Ride R-2001'), findsOneWidget);
    expect(find.text('Looking for a driver'), findsWidgets);
    expect(find.byKey(const ValueKey('ride-cancel')), findsOneWidget);
  });

  testWidgets('105.2 signed out, the fares ask to sign in first', (
    tester,
  ) async {
    usePhone(tester);
    final api = ridesApi();
    final app = ridesApp(api, signedIn: false);
    await app.pump(tester);
    await go(app, tester, Paths.ride);
    await scrollTo(tester, find.text('Sign in to see the fares.'), 'ride-form');
    expect(find.text('Sign in to see the fares.'), findsOneWidget);
    expect(api.count('estimateRide'), 0);
    expect(api.count('listMyRides'), 0);
  });

  testWidgets('105.2 a rider follows the driver, shares the ride and sees '
      'the code', (tester) async {
    usePhone(tester);
    final shared = <String>[];
    final api = ridesApi();
    final app = ridesApp(api, shared: shared);
    await app.pump(tester);
    await push(app, tester, Paths.rideFollow(1));
    expect(find.text('Driver on the way'), findsWidgets);
    expect(find.text('4 min away'), findsOneWidget);
    expect(find.text('Mahmoud Adel'), findsOneWidget);
    expect(find.text('White Toyota Corolla'), findsOneWidget);
    expect(find.text('4821'), findsOneWidget);
    await tapKey(tester, 'ride-share');
    expect(shared.single, 'Follow my ride: https://yallapp.com.tr/r/abc123');
    expect(find.byKey(const ValueKey('ride-sos')), findsOneWidget);
  });

  testWidgets('105.2 a rider cancels with a reason', (tester) async {
    usePhone(tester);
    final api = ridesApi()..rides = [rideJson(status: 'searching')];
    final app = ridesApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.rideFollow(1));
    await tapKey(tester, 'ride-cancel');
    expect(find.text('Why are you cancelling?'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('ride-reason-wrongPlace')));
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('ride-cancel-yes')));
    await TestApp.settle(tester);
    expect(api.count('cancelMyRide'), 1);
    expect(api.rides.first['cancellation']['reason'], 'wrong_place');
    expect(find.text('Cancelled'), findsWidgets);
    expect(find.byKey(const ValueKey('ride-cancel')), findsNothing);
  });

  testWidgets('105.2 a completed card ride is paid and the driver rated', (
    tester,
  ) async {
    usePhone(tester);
    final api = ridesApi()
      ..rides = [rideJson(status: 'completed', method: 'card')];
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.myRides);
    expect(find.text('Economy'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);

    await push(app, tester, Paths.rideFollow(1));
    expect(find.byKey(const ValueKey('ride-pay')), findsOneWidget);
    expect(find.text('Fare'), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-sos')), findsNothing);
    await tapKey(tester, 'rate-driver-5');
    await tapKey(tester, 'rate-send');
    expect(api.rideRatings.single, (id: 1, driver: 5));
    expect(find.byKey(const ValueKey('ride-rated')), findsOneWidget);
  });

  testWidgets('105.2 no driver found: the rider tries again', (tester) async {
    usePhone(tester);
    final api = ridesApi()..rides = [rideJson(status: 'no_driver')];
    final app = ridesApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.rideFollow(1));
    expect(find.text('No driver found'), findsWidgets);
    await tapKey(tester, 'ride-again');
    expect(find.text('Where to?'), findsOneWidget);
  });

  testWidgets('105.2 drivers get the Driver tab; going online shares their '
      'position', (tester) async {
    usePhone(tester);
    final locator = FakeLocator();
    final api = ridesApi(roles: ['driver']);
    final app = ridesApp(api, locator: locator);
    await app.pump(tester);
    expect(app.container.read(isDriverProvider), isTrue);
    expect(tabPaths(app), [
      Paths.ride,
      Paths.myRides,
      Paths.driver,
      Paths.account,
    ]);

    await go(app, tester, Paths.driver);
    expect(find.text('Go online to get rides.'), findsOneWidget);
    expect(api.driverLocations, isEmpty);
    await tapKey(tester, 'driver-online');
    expect(api.count('setDriverOnline'), 1);
    expect(find.textContaining('6 rides today'), findsOneWidget);
    expect(api.driverLocations, isNotEmpty);

    // An offer shows on the next ask, with the time left to take it.
    api.driverOffers = [
      driverRideJson(
        id: 5,
        status: 'searching',
        offerExpiresAt: DateTime.now()
            .add(const Duration(seconds: 15))
            .toUtc()
            .toIso8601String(),
      ),
    ];
    await tester.pump(const Duration(seconds: 3));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('driver-offer')), findsOneWidget);
    expect(find.textContaining('1.2 km to the pickup'), findsOneWidget);
    await tapKey(tester, 'driver-accept');
    expect(api.driverMoves.single, (id: 5, move: 'accept', pin: null));
    expect(find.text('Ride R-2005'), findsOneWidget);
    expect(find.text('Karim'), findsOneWidget);

    // Arrived, then started with the rider's code, then ended.
    await tapKey(tester, 'driver-next');
    expect(api.driverMoves.last.move, 'arrived');
    await tapKey(tester, 'driver-next');
    await tester.enterText(find.byKey(const ValueKey('driver-pin')), '4821');
    await tester.tap(find.byKey(const ValueKey('driver-pin-ok')));
    await TestApp.settle(tester);
    expect(api.driverMoves.last, (id: 5, move: 'in_progress', pin: '4821'));
    await tapKey(tester, 'driver-next');
    expect(api.driverMoves.last.move, 'completed');
    expect(find.text('Collect E£96.00 in cash.'), findsWidgets);
    expect(find.byKey(const ValueKey('driver-next')), findsNothing);
  });

  testWidgets('105.2 a driver declines an offer', (tester) async {
    usePhone(tester);
    final api = ridesApi(roles: ['driver'])
      ..driver = driverJson(online: true)
      ..driverOffers = [driverRideJson(id: 6, status: 'searching')];
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.driver);
    await tapKey(tester, 'driver-decline');
    expect(api.driverMoves.single, (id: 6, move: 'decline', pin: null));
    expect(find.byKey(const ValueKey('driver-offer')), findsNothing);
  });

  testWidgets('105.2 a driver sees what they made', (tester) async {
    usePhone(tester);
    final api = ridesApi(roles: ['driver']);
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.driver);
    await tester.tap(find.text('Earnings'));
    await TestApp.settle(tester);
    expect(find.text('E£540.00'), findsOneWidget);
    expect(find.text('Cash collected'), findsOneWidget);
    expect(api.count('getDriverEarnings'), 1);
  });

  testWidgets('105.2 someone who isn\'t a driver opening the driver\'s '
      'screen', (tester) async {
    usePhone(tester);
    final api = ridesApi();
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.driver);
    expect(find.text('For our drivers'), findsOneWidget);
    expect(api.count('getDriver'), 0);
    expect(api.count('listDriverOffers'), 0);
  });

  testWidgets('105.2 Account opens My rides, and the driver mode for '
      'drivers', (tester) async {
    usePhone(tester);
    final app = ridesApp(ridesApi(roles: ['driver']));
    await app.pump(tester);
    await go(app, tester, Paths.account);
    expect(find.byKey(const ValueKey('account-rides')), findsOneWidget);
    await tapKey(tester, 'account-driver');
    expect(find.text('Online'), findsOneWidget);
  });

  group('105.2 A ride company\'s drivers\' app', () {
    testWidgets('opens on the driver\'s screen, with Driver and Account '
        'only', (tester) async {
      usePhone(tester);
      final api = ridesApi(roles: ['driver'], driverApp: 'bundle');
      final app = ridesApp(api, role: AppRole.driver);
      await app.pump(tester);
      expect(find.text('Online'), findsOneWidget);
      expect(tabPaths(app), [Paths.driver, Paths.account]);
      expect(api.count('listMyRides'), 0);
    });

    testWidgets('leaves the Driver tab out of the riders\' app', (
      tester,
    ) async {
      usePhone(tester);
      final api = ridesApi(roles: ['driver'], driverApp: 'bundle');
      final app = ridesApp(api);
      await app.pump(tester);
      expect(tabPaths(app), isNot(contains(Paths.driver)));
      expect(app.container.read(isDriverProvider), isFalse);
    });
  });
}
