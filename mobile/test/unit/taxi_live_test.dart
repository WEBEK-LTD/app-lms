import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/taxi/data/live_channel.dart';

void main() {
  group('105.9 cells', () {
    test('a position\'s geohash, as everyone computes it', () {
      // The geohash example everyone uses: Jutland, u4pruydqqvj.
      expect(geohash(57.64911, 10.40744), 'u4pru');
      expect(geohash(57.64911, 10.40744, precision: 11), 'u4pruydqqvj');
      expect(geohash(30.0444, 31.2357), 'stq4y');
    });

    test('a rider listens to their cell and the eight around it', () {
      final cells = cellsAround(30.0444, 31.2357);
      expect(cells, hasLength(9));
      expect(cells, contains('stq4y'));
      expect(cells.toSet(), hasLength(9));
      // Across the date line too.
      expect(cellsAround(0, 179.99), hasLength(9));
    });
  });

  group('105.9 the live stream', () {
    test('splits Server-Sent Events, also across chunks', () {
      final splitter = EventSplitter();
      expect(
        splitter.add('event: put\ndata: {"path":"/","data":{"d1":{"lat":30'),
        isEmpty,
      );
      final events = splitter.add(
        ',"lng":31}}}\n\nevent: keep-alive\ndata: null\n\nevent: patch\r\ndata: {"path":"/d1","data":{"lat":30.1}}\r\n\r\n',
      );
      expect(events.map((e) => (e.kind, e.path)), [
        ('put', '/'),
        ('keep-alive', '/'),
        ('patch', '/d1'),
      ]);
      expect(events.first.data, {
        'd1': {'lat': 30, 'lng': 31},
      });
    });

    test('keeps the value up to date from puts and patches', () {
      final tree = LiveTree()
        ..apply(
          const LiveEvent('put', '/', {
            'd1': {'lat': 30.0, 'lng': 31.0},
            'd2': {'lat': 30.5, 'lng': 31.5},
          }),
        )
        ..apply(const LiveEvent('patch', '/d1', {'lat': 30.1}))
        ..apply(const LiveEvent('put', '/d2', null))
        ..apply(const LiveEvent('put', '/d3', {'lat': 29.9, 'lng': 31.2}));
      expect(tree.value, {
        'd1': {'lat': 30.1, 'lng': 31.0},
        'd3': {'lat': 29.9, 'lng': 31.2},
      });
      tree.apply(const LiveEvent('put', '/', null));
      expect(tree.value, isNull);
    });
  });

  group('105.9 the contract', () {
    test('reads Config.taxi and the live token', () {
      final config = TaxiConfig.fromJson({
        'map': {
          'provider': 'google',
          'tiles_url': 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=s&key=k',
          'attribution': 'Map data ©2026 Google',
          'search': true,
          'routes': true,
        },
        'live': {
          'database_url': 'https://lamha-taxi-default-rtdb.firebaseio.com',
          'root': 'yallapp/42',
        },
        'nearby_every_seconds': 5,
      });
      expect(config.map.provider, TaxiMapProvider.google);
      expect(config.map.routes, isTrue);
      expect(config.live?.root, 'yallapp/42');
      expect(TaxiConfig.fromJson(const {}).live, isNull);
      final token = TaxiLiveToken.fromJson({
        'token': 'a.b.c',
        'database_url': 'https://lamha-taxi-default-rtdb.firebaseio.com',
        'root': 'yallapp/42',
        'expires_at': '2026-10-29T11:00:00Z',
        'role': 'rider',
        'driver_key': null,
        'ride_id': 12,
        'follow': 'd3',
      });
      expect(
        (token.role, token.rideId, token.follow),
        (LiveRole.rider, 12, 'd3'),
      );
      final route = TaxiRoute.fromJson({
        'distance_km': 14.2,
        'minutes': 22,
        'points': [
          [30.0, 31.0],
          [30.1, 31.1],
        ],
      });
      expect(route.points.last, (lat: 30.1, lng: 31.1));
      expect(AppVertical.fromWire('taxi'), AppVertical.taxi);
    });
  });
}
