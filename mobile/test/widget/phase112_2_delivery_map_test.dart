import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_9_taxi_test.dart' show FakeLocator, push, tapKey, usePhone;

Map<String, dynamic> mapJson({String? tiles, bool routes = true}) => {
  'tiles_url': tiles,
  'attribution': null,
  'search': false,
  'routes': routes,
};

const tiles = 'https://tiles.example.com/{z}/{x}/{y}.png';

/// The road the platform's map gives between the places.
const road = {
  'distance_km': 12.4,
  'minutes': 25,
  'points': [
    [30.0561, 31.3301],
    [30.01, 31.29],
    [29.9602, 31.2569],
  ],
};

FakeApi deliveryMapApi({
  String? tilesUrl = tiles,
  List<String> roles = const [],
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'delivery': {...deliveryConfigJson(), 'map': mapJson(tiles: tilesUrl)},
    },
  );
  api
    ..me = {...userJson(), 'roles': roles}
    ..taxiRoute = road;
  return api;
}

TestApp app(
  FakeApi api,
  AppType type, {
  List<String>? opened,
  AppRole role = AppRole.customer,
}) => TestApp(
  api: api,
  appType: type,
  signedIn: true,
  // 112.3 The courier's screens are in the courier app.
  build: (b) => b.copyWith(role: role),
  overrides: [
    locatorProvider.overrideWithValue(FakeLocator()),
    openExternalProvider.overrideWithValue((url) async {
      opened?.add(url);
      return true;
    }),
  ],
);

List<Polyline> lines(WidgetTester tester) => tester
    .widget<PolylineLayer>(find.byKey(const ValueKey('taxi-lines')))
    .polylines;

Future<void> close(TestApp app, WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  app.container.dispose();
  await TestApp.settle(tester, 2);
}

void main() {
  testWidgets('112.2 a shipment on the way: the courier on the map between '
      'the pickup and the door, the road, "on the way" and how soon', (
    tester,
  ) async {
    usePhone(tester);
    final api = deliveryMapApi()
      ..shipments = [shipmentJson(status: 'on_the_way', withPosition: true)];
    final test = app(api, AppType.delivery);
    await test.pump(tester);
    await push(test, tester, Paths.shipment(1));

    expect(find.byKey(const ValueKey('trip-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-to')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-car')), findsOneWidget);
    expect(find.byType(TileLayer), findsOneWidget);
    // The platform's road between the places, and the courier's dotted way to the door.
    expect(api.count('getTaxiRoute'), 1);
    expect(lines(tester).first.points, hasLength(3));
    expect(lines(tester).last.pattern, const StrokePattern.dotted());
    expect(
      find.text('On the way from 12 Abbas El Akkad St, Nasr City to you'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('trip-eta')), findsOneWidget);
    await close(test, tester);
  });

  testWidgets('112.2 without the platform\'s map, the places on a plain '
      'background; waiting for a courier, no courier on it', (tester) async {
    usePhone(tester);
    final api = deliveryMapApi(tilesUrl: null)
      ..shipments = [shipmentJson(status: 'pending', withCourier: false)];
    final test = app(api, AppType.delivery);
    await test.pump(tester);
    await push(test, tester, Paths.shipment(1));

    expect(find.byKey(const ValueKey('trip-map')), findsOneWidget);
    expect(find.byType(TileLayer), findsNothing);
    expect(find.byKey(const ValueKey('taxi-no-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-car')), findsNothing);
    expect(find.byKey(const ValueKey('trip-on-the-way')), findsNothing);
    await close(test, tester);
  });

  testWidgets('112.2 the courier\'s job: its road on the map and "Navigate" '
      'to the pickup in their maps app', (tester) async {
    usePhone(tester);
    final opened = <String>[];
    final api = deliveryMapApi(roles: ['courier'])
      ..courierJobs = {
        'active': [courierJobJson()],
        'available': [],
        'done': [],
      };
    final test = app(
      api,
      AppType.delivery,
      opened: opened,
      role: AppRole.courier,
    );
    await test.pump(tester);
    await push(test, tester, Paths.courierJob(1));

    expect(find.byKey(const ValueKey('job-map')), findsOneWidget);
    expect(lines(tester).first.points, hasLength(3));
    expect(find.text('Navigate to the pickup'), findsOneWidget);
    await tapKey(tester, 'job-navigate');
    await tapKey(tester, 'navigate-google');
    expect(opened.single, contains('destination=30.0561,31.3301'));
    await close(test, tester);
  });

  testWidgets('112.2 a food order on the way: from the restaurant to the '
      'door on the map', (tester) async {
    usePhone(tester);
    final api =
        FakeApi(
            config: {
              ...configJson(lms: null),
              'food': {...foodConfigJson(), 'map': mapJson(tiles: tiles)},
            },
          )
          ..taxiRoute = road
          ..foodOrders = [
            {
              ...foodOrderJson(status: 'on_the_way', withCourier: true),
              'pickup': {
                'address': 'Abou Tarek, Downtown',
                'details': null,
                'lat': 30.0505,
                'lng': 31.2410,
              },
              'courier_location': {
                'lat': 30.048,
                'lng': 31.232,
                'updated_at': '2026-10-28T10:30:00.000Z',
              },
            },
          ];
    final test = app(api, AppType.food);
    await test.pump(tester);
    await push(test, tester, Paths.foodOrder(1));

    expect(find.byKey(const ValueKey('food-order-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-car')), findsOneWidget);
    expect(
      find.text('On the way from Abou Tarek, Downtown to you'),
      findsOneWidget,
    );
    await close(test, tester);
  });
}
