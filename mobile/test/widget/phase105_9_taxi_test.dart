import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/modules/rides/widgets/ride_widgets.dart';
import 'package:yallapp/modules/taxi/data/live_channel.dart';
import 'package:yallapp/modules/taxi/data/taxi_providers.dart';

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

/// The company's live database, in memory: the paths listened to, and the
/// writes.
class FakeLiveDatabase extends LiveDatabase {
  FakeLiveDatabase()
    : super(databaseUrl: 'https://live.example.com', root: 'r', apiKey: 'k');

  final streams = <String, StreamController<Object?>>{};
  final updates = <Map<String, Object?>>[];

  @override
  Future<void> signIn(String customToken) async {}

  @override
  Stream<Object?> listen(String path) =>
      (streams[path] ??= StreamController<Object?>()).stream;

  @override
  Future<void> update(Map<String, Object?> values) async => updates.add(values);
}

/// A container with a live session ([token]) on [db].
ProviderContainer liveContainer(
  FakeLiveDatabase db,
  TaxiLiveToken token, {
  FakeApi? api,
}) {
  final container = ProviderContainer(
    overrides: [
      taxiConfigProvider.overrideWithValue(
        const TaxiConfig(
          map: TaxiMap(tilesUrl: 'https://tiles.example.com/{z}/{x}/{y}.png'),
          live: TaxiLive(databaseUrl: 'https://live.example.com', root: 'r'),
        ),
      ),
      taxiLiveProvider.overrideWith((ref) async => TaxiLiveSession(db, token)),
      yallappApiProvider.overrideWithValue(api ?? FakeApi()),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

TaxiLiveToken liveToken({
  LiveRole role = LiveRole.rider,
  String? driverKey,
  int? rideId,
  String? follow,
}) => TaxiLiveToken(
  token: 'custom',
  databaseUrl: 'https://live.example.com',
  root: 'r',
  expiresAt: DateTime.now().add(const Duration(hours: 1)),
  role: role,
  driverKey: driverKey,
  rideId: rideId,
  follow: follow,
);

/// A live taxi app: `Config.taxi` with the map's tiles, no live database
/// (the free taxis are asked of Yallapp).
FakeApi taxiApi({
  List<String> roles = const [],
  bool search = true,
  bool routes = true,
  bool taxi = true,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'rides': {
        ...ridesConfigJson(),
        'map': {'tiles_url': null, 'attribution': null},
      },
      if (taxi)
        'taxi': {
          'map': {
            'provider': 'osm',
            'tiles_url': 'https://tiles.example.com/{z}/{x}/{y}.png',
            // Its words don't fit the test font.
            'attribution': null,
            'search': search,
            'routes': routes,
          },
          'live': null,
          'nearby_every_seconds': 5,
        },
    },
  );
  api
    ..me = {...userJson(), 'roles': roles}
    ..nearbyTaxis = [
      {
        'driver_key': 'd1',
        'lat': 30.0470,
        'lng': 31.2260,
        'heading': 45,
        'vehicle_type_id': 1,
      },
      {
        'driver_key': 'd2',
        'lat': 30.0520,
        'lng': 31.2300,
        'heading': null,
        'vehicle_type_id': 2,
      },
    ]
    ..taxiPlaces = [
      {
        'id': 'p1',
        'name': 'Tahrir Square',
        'address': 'Downtown, Cairo',
        'lat': 30.0444,
        'lng': 31.2357,
      },
    ]
    ..taxiRoute = {
      'distance_km': 7.4,
      'minutes': 18,
      'points': [
        [30.0459, 31.2243],
        [30.0450, 31.2300],
        [30.0444, 31.2357],
      ],
    };
  return api;
}

Map<String, dynamic> nearbyJson(String key) => {
  'driver_key': key,
  'lat': 30.045,
  'lng': 31.236,
  'heading': null,
  'vehicle_type_id': null,
};

TestApp taxiApp(FakeApi api, {FakeLocator? locator}) => TestApp(
  api: api,
  appType: AppType.rides,
  signedIn: true,
  overrides: [
    locatorProvider.overrideWithValue(locator ?? FakeLocator()),
    shareRideProvider.overrideWithValue((text) async {}),
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

/// Closes the app: the screens' listeners and polling stop with it (the
/// test then checks no timer is left).
Future<void> closeApp(TestApp app, WidgetTester tester) async {
  expect(app.api.count('getTaxiLiveToken'), 0);
  await tester.pumpWidget(const SizedBox());
  // Unmounted, the scope no longer runs the auto-dispose: as when the app
  // closes.
  app.container.dispose();
  await TestApp.settle(tester, 2);
}

/// The map's lines: the route and the driver's way to the pickup.
List<Polyline> lines(WidgetTester tester) => tester
    .widget<PolylineLayer>(find.byKey(const ValueKey('taxi-lines')))
    .polylines;

void main() {
  group('105.9 distances', () {
    test('minutes at about 25 km/h, and the heading', () {
      const a = (lat: 30.0459, lng: 31.2243);
      const b = (lat: 30.0444, lng: 31.2357);
      expect(distanceKm(a, b), closeTo(1.1, 0.05));
      expect(driveMinutes(distanceKm(a, b)), 3);
      expect(driveMinutes(0), 1);
      expect(bearing(a, (lat: 30.06, lng: 31.2243)), closeTo(0, 0.01));
      expect(bearing(a, (lat: 30.0459, lng: 31.3)), closeTo(90, 0.1));
    });

    test('a live node older than a minute is left out', () {
      final now = DateTime.now();
      final fresh = taxiFromNode('d1', {
        'lat': 30.0,
        'lng': 31.0,
        'at': now.millisecondsSinceEpoch - 5000,
        'heading': 90,
      }, now);
      expect((fresh?.driverKey, fresh?.heading), ('d1', 90.0));
      expect(
        taxiFromNode('d2', {
          'lat': 30.0,
          'lng': 31.0,
          'at': now.millisecondsSinceEpoch - 61000,
        }, now),
        isNull,
      );
      expect(taxiFromNode('d3', 'broken', now), isNull);
    });
  });

  group('105.9 the live database', () {
    const spot = (lat: 30.0444, lng: 31.2357);
    final cell = geohash(spot.lat, spot.lng);

    test('the free taxis come from the nine cells around, the stale ones '
        'left out; when it fails, Yallapp is asked', () async {
      final db = FakeLiveDatabase();
      final api = FakeApi()..nearbyTaxis = [nearbyJson('d7')];
      final container = liveContainer(db, liveToken(), api: api);
      final seen = <List<String>>[];
      container.listen(
        nearbyTaxisProvider(spot),
        (_, next) => seen.add([
          for (final t in next.value ?? const <NearbyTaxi>[]) t.driverKey,
        ]),
        fireImmediately: true,
      );
      await container.read(taxiLiveProvider.future);
      await pumpEventQueue();
      expect(db.streams.keys.toSet(), {
        for (final c in cellsAround(spot.lat, spot.lng)) 'cells/$c',
      });
      final now = DateTime.now().millisecondsSinceEpoch;
      db.streams['cells/$cell']!.add({
        'd1': {'lat': 30.045, 'lng': 31.236, 'at': now, 'heading': 30},
        'd2': {'lat': 30.046, 'lng': 31.237, 'at': now - 120000},
      });
      db.streams['cells/${cellsAround(spot.lat, spot.lng).first}']!.add({
        'd3': {'lat': 30.0, 'lng': 31.2, 'at': now},
      });
      await pumpEventQueue();
      expect(seen.last.toSet(), {'d1', 'd3'});
      expect(api.count('listNearbyTaxis'), 0);

      db.streams['cells/$cell']!.addError(StateError('closed'));
      await pumpEventQueue();
      expect(api.count('listNearbyTaxis'), 1);
      expect(seen.last, ['d7']);
    });

    test('the driver writes their cell and position, the old cell removed '
        'when they move, both when they go offline', () async {
      final db = FakeLiveDatabase();
      final container = liveContainer(
        db,
        liveToken(role: LiveRole.driver, driverKey: 'd9'),
      );
      container.listen(taxiLiveProvider, (_, _) {});
      await container.read(taxiLiveProvider.future);
      final writer = container
          .listen(driverLiveWriterProvider, (_, _) {})
          .read();

      await writer.write(spot.lat, spot.lng, vehicleTypeId: 2);
      expect(db.updates.single.keys, ['cells/$cell/d9', 'drivers/d9']);
      expect(
        (db.updates.single['cells/$cell/d9']! as Map)['vehicle_type_id'],
        2,
      );

      await writer.write(30.2, 31.5);
      final moved = geohash(30.2, 31.5);
      expect(db.updates.last['cells/$cell/d9'], isNull);
      expect(db.updates.last.containsKey('cells/$cell/d9'), isTrue);
      expect(db.updates.last.containsKey('cells/$moved/d9'), isTrue);
      expect(writer.position.value!.heading, isNotNull);

      // On a ride: out of the cells riders look in, still followed.
      await writer.write(30.2, 31.5, free: false);
      expect(db.updates.last.keys, ['drivers/d9', 'cells/$moved/d9']);
      expect(db.updates.last['cells/$moved/d9'], isNull);
      await writer.write(30.21, 31.5, free: false);
      expect(db.updates.last.keys, ['drivers/d9']);

      await writer.write(30.2, 31.5);
      await writer.clear();
      expect(db.updates.last, {'cells/$moved/d9': null, 'drivers/d9': null});
    });

    test('the rider follows their driver on their own ride only', () async {
      final db = FakeLiveDatabase();
      final container = liveContainer(db, liveToken(rideId: 12, follow: 'd3'));
      final seen = <NearbyTaxi?>[];
      container.listen(
        followedDriverProvider(12),
        (_, next) => seen.add(next.value),
      );
      await container.read(taxiLiveProvider.future);
      await pumpEventQueue();
      db.streams['drivers/d3']!.add({
        'lat': 30.05,
        'lng': 31.23,
        'at': DateTime.now().millisecondsSinceEpoch,
        'heading': 180,
      });
      await pumpEventQueue();
      expect((seen.last?.driverKey, seen.last?.heading), ('d3', 180.0));

      final other = <NearbyTaxi?>[];
      container.listen(
        followedDriverProvider(13),
        (_, next) => other.add(next.value),
        fireImmediately: true,
      );
      await pumpEventQueue();
      expect(other.whereType<NearbyTaxi>(), isEmpty);
      expect(db.streams.keys, ['drivers/d3']);
    });
  });

  testWidgets('105.9 a taxi app opens on the map with the free taxis around '
      'the rider', (tester) async {
    usePhone(tester);
    final locator = FakeLocator();
    final api = taxiApi();
    final app = taxiApp(api, locator: locator);
    await app.pump(tester);
    await go(app, tester, Paths.ride);

    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-me')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-taxi-d1')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-taxi-d2')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-where-to')), findsOneWidget);
    expect(
      find.text('2 taxis near you · the nearest 1 min away'),
      findsOneWidget,
    );
    // No live database: Yallapp is asked, around the rider.
    expect(api.count('getTaxiLiveToken'), 0);
    expect(api.nearbyAsked.first, (lat: 30.046, lng: 31.224));
    // The old form isn't there.
    expect(find.byKey(const ValueKey('pickup-address')), findsNothing);

    // And asked again every five seconds, the taxis moving.
    final asked = api.nearbyAsked.length;
    api.nearbyTaxis = [
      {'driver_key': 'd1', 'lat': 30.0465, 'lng': 31.2250, 'heading': 90},
    ];
    await tester.pump(const Duration(seconds: 5));
    await TestApp.settle(tester);
    expect(api.nearbyAsked.length, greaterThan(asked));
    expect(find.byKey(const ValueKey('taxi-taxi-d2')), findsNothing);
    expect(
      find.text('1 taxi near you · the nearest 1 min away'),
      findsOneWidget,
    );
    await closeApp(app, tester);
  });

  testWidgets('105.9 choosing where to draws the route and shows the fares', (
    tester,
  ) async {
    usePhone(tester);
    final api = taxiApi()..rides = [];
    final app = taxiApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);

    await tapKey(tester, 'taxi-where-to');
    await tester.enterText(
      find.byKey(const ValueKey('taxi-search-field')),
      'Tahrir',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester);
    expect(api.count('searchTaxiPlaces'), 1);
    await tapKey(tester, 'taxi-place-p1');
    await tester.pump(const Duration(milliseconds: 500));
    await TestApp.settle(tester);

    // The places on the map and in the sheet, the company's route between.
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-to')), findsOneWidget);
    expect(find.text('To: Tahrir Square'), findsNWidgets(2));
    expect(find.text('From: My location'), findsNWidgets(2));
    expect(api.count('getTaxiRoute'), 1);
    expect(api.count('getTaxiPlace'), 0);
    expect(lines(tester).single.points, hasLength(3));

    // The fares of each type, and the button names the chosen one.
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('ride-type-2')),
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('ride-form')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.text('E£96.00'), findsOneWidget);
    expect(find.text('E£130.00'), findsOneWidget);
    expect(find.text('Request Economy'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('ride-request')));
    await TestApp.settle(tester);
    final asked = api.rideRequests.single;
    expect(asked.pickup.address, 'My location');
    expect(asked.pickup.lat, 30.0459);
    expect(asked.dropoff.address, 'Tahrir Square');
    expect(asked.dropoff.lng, 31.2357);
    await closeApp(app, tester);
  });

  testWidgets('105.9 without routes, a straight line', (tester) async {
    usePhone(tester);
    final api = taxiApi(routes: false);
    final app = taxiApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);
    await tapKey(tester, 'taxi-where-to');
    await tester.enterText(
      find.byKey(const ValueKey('taxi-search-field')),
      'Tahrir',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester);
    await tapKey(tester, 'taxi-place-p1');
    expect(api.count('getTaxiRoute'), 0);
    expect(lines(tester).single.points, hasLength(2));
    await closeApp(app, tester);
  });

  testWidgets('105.9 without search, the sheet holds the usual places', (
    tester,
  ) async {
    usePhone(tester);
    final api = taxiApi(search: false);
    final app = taxiApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);
    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-where-to')), findsNothing);
    expect(find.byKey(const ValueKey('pickup-address')), findsOneWidget);
    // Filled with where the rider is.
    expect(
      tester
          .widget<TextField>(find.byKey(const ValueKey('pickup-address')))
          .controller!
          .text,
      'My location',
    );
    await closeApp(app, tester);
  });

  testWidgets('105.9 following a ride: the driver\'s car on the map, coming '
      'to the pickup', (tester) async {
    usePhone(tester);
    final api = taxiApi();
    final app = taxiApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.rideFollow(1));

    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-car')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.text('Arriving in 4 min'), findsOneWidget);
    expect(find.text('Ride R-2001'), findsOneWidget);
    // The dotted way from the car to the pickup.
    final way = lines(tester).single;
    expect(way.pattern, const StrokePattern.dotted());
    expect(way.points.first.longitude, 31.2290);
    expect(way.points.last.longitude, 31.2243);
    // The ride in the sheet, without a map of its own.
    expect(find.text('Mahmoud Adel'), findsOneWidget);
    expect(find.text('4821'), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-map')), findsNothing);
    expect(find.byKey(const ValueKey('ride-cancel')), findsOneWidget);
    // An old position from the ride: not live.
    expect(find.byKey(const ValueKey('taxi-live')), findsNothing);
    await closeApp(app, tester);
  });

  testWidgets('105.9 a driver sees the offer over the map and takes it', (
    tester,
  ) async {
    usePhone(tester);
    final api = taxiApi(roles: ['driver'])
      ..driver = driverJson(online: true)
      ..driverOffers = [
        driverRideJson(
          id: 6,
          status: 'searching',
          offerExpiresAt: DateTime.now()
              .add(const Duration(seconds: 15))
              .toUtc()
              .toIso8601String(),
        ),
      ];
    final app = taxiApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.driver);

    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.text('Available for requests'), findsOneWidget);
    expect(find.byKey(const ValueKey('driver-online')), findsOneWidget);
    expect(find.byKey(const ValueKey('driver-offer')), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('driver-offer')),
        matching: find.byType(CircularProgressIndicator),
      ),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('driver-offer-left')), findsOneWidget);
    expect(find.byKey(const ValueKey('driver-offer-fare')), findsOneWidget);
    // The driver's car, the pickup and the drop-off.
    expect(find.byKey(const ValueKey('taxi-car')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-to')), findsOneWidget);
    expect(api.driverLocations, isNotEmpty);

    await tapKey(tester, 'driver-accept');
    expect(api.driverMoves.single, (id: 6, move: 'accept', pin: null));
    await closeApp(app, tester);
  });

  testWidgets('105.9 a ride company without the live map keeps its screens', (
    tester,
  ) async {
    usePhone(tester);
    final api = taxiApi(taxi: false);
    final app = taxiApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);
    expect(find.byKey(const ValueKey('taxi-map')), findsNothing);
    expect(find.text('Where to?'), findsOneWidget);
    expect(find.byKey(const ValueKey('pickup-address')), findsOneWidget);
    expect(api.count('listNearbyTaxis'), 0);

    await push(app, tester, Paths.rideFollow(1));
    expect(find.byKey(const ValueKey('taxi-map')), findsNothing);
    expect(find.text('Mahmoud Adel'), findsOneWidget);
    await closeApp(app, tester);
  });
}
