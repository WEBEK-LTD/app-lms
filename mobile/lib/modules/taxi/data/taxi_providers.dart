import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import 'live_channel.dart';

/// 105.9 A live taxi app's data: the session with the company's live
/// database, the free taxis around the rider, the followed driver and the
/// driver's own position written there. Everything runs while a screen
/// watches it and stops when it closes; nothing runs in the background.

/// A place on the map.
typedef TaxiSpot = ({double lat, double lng});

/// `Config.taxi` when this ride company is a live taxi app (its map's tiles
/// are set); null: the ride screens stay as they are.
final taxiConfigProvider = Provider<TaxiConfig?>((ref) {
  final gate = ref.watch(appGateProvider);
  final taxi = gate is GateReady ? gate.config.taxi : null;
  return taxi?.map.tilesUrl == null ? null : taxi;
});

/// Signed in to the company's live database, with what the token may read.
class TaxiLiveSession {
  const TaxiLiveSession(this.db, this.token);

  final LiveDatabase db;
  final TaxiLiveToken token;
}

/// Makes the database client for a token. Tests replace it.
final liveDatabaseMakerProvider =
    Provider<LiveDatabase Function(TaxiLiveToken token, String apiKey)>(
      (ref) =>
          (token, apiKey) => LiveDatabase(
            databaseUrl: token.databaseUrl,
            root: token.root,
            apiKey: apiKey,
          ),
    );

/// The live session: a token from Yallapp traded for a Firebase sign-in,
/// asked again before it ends (and by the screens when the ride changes).
/// Null without a live database, signed out, or when it fails: the screens
/// ask Yallapp instead.
final taxiLiveProvider = FutureProvider.autoDispose<TaxiLiveSession?>((
  ref,
) async {
  final taxi = ref.watch(taxiConfigProvider);
  final signedIn = ref.watch(
    authControllerProvider.select((a) => a.isSignedIn),
  );
  if (taxi?.live == null || !signedIn) return null;
  final env = ref.watch(appEnvironmentProvider);
  final firebase = env.isIos
      ? env.build.firebaseIos
      : env.build.firebaseAndroid;
  if (firebase == null) return null;
  try {
    final token = await ref.read(yallappApiProvider).getTaxiLiveToken();
    final db = ref.read(liveDatabaseMakerProvider)(token, firebase.apiKey);
    await db.signIn(token.token);
    final left = token.expiresAt.difference(DateTime.now()).inSeconds - 60;
    final renew = Timer(
      Duration(seconds: math.max(left, 30)),
      ref.invalidateSelf,
    );
    ref.onDispose(renew.cancel);
    return TaxiLiveSession(db, token);
  } catch (_) {
    return null;
  }
});

/// How long a taxi's live position counts.
const liveStale = Duration(seconds: 60);

/// The distance between two places, in km.
double distanceKm(TaxiSpot a, TaxiSpot b) {
  const r = 6371.0;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(b.lat - a.lat);
  final dLng = rad(b.lng - a.lng);
  final h =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(a.lat)) *
          math.cos(rad(b.lat)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.min(1, math.sqrt(h)));
}

/// Minutes to drive [km] in town (about 25 km/h), at least one.
int driveMinutes(double km) => math.max(1, (km / 25 * 60).round());

/// The direction from [a] to [b], in degrees from north.
double bearing(TaxiSpot a, TaxiSpot b) {
  double rad(double d) => d * math.pi / 180;
  final y = math.sin(rad(b.lng - a.lng)) * math.cos(rad(b.lat));
  final x =
      math.cos(rad(a.lat)) * math.sin(rad(b.lat)) -
      math.sin(rad(a.lat)) *
          math.cos(rad(b.lat)) *
          math.cos(rad(b.lng - a.lng));
  return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
}

/// A cell's or a driver's node: `{lat, lng, at, heading?, vehicle_type_id?}`.
NearbyTaxi? taxiFromNode(String key, Object? node, DateTime now) {
  if (node is! Map) return null;
  final lat = node['lat'], lng = node['lng'], at = node['at'];
  if (lat is! num || lng is! num) return null;
  if (at is num &&
      now.difference(DateTime.fromMillisecondsSinceEpoch(at.toInt())) >
          liveStale) {
    return null;
  }
  final heading = node['heading'], type = node['vehicle_type_id'];
  return NearbyTaxi(
    driverKey: key,
    lat: lat.toDouble(),
    lng: lng.toDouble(),
    heading: heading is num ? heading.toDouble() : null,
    vehicleTypeId: type is num ? type.toInt() : null,
  );
}

/// The free taxis around [spot]: live from the nine cells around it
/// (merged, those not seen for a minute left out), or asked of Yallapp
/// every `nearbyEverySeconds` without a live database or when it fails.
final nearbyTaxisProvider = StreamProvider.autoDispose
    .family<List<NearbyTaxi>, TaxiSpot>((ref, spot) {
      final taxi = ref.watch(taxiConfigProvider);
      final live = ref.watch(taxiLiveProvider);
      if (taxi == null || live.isLoading) return const Stream.empty();
      final feed = _NearbyFeed(
        ask: () =>
            ref.read(yallappApiProvider).listNearbyTaxis(spot.lat, spot.lng),
        db: live.value?.db,
        spot: spot,
        every: Duration(seconds: taxi.nearbyEverySeconds),
      );
      ref.onDispose(feed.close);
      return feed.stream;
    });

class _NearbyFeed {
  _NearbyFeed({
    required this.ask,
    required this.db,
    required this.spot,
    required this.every,
  }) {
    if (db == null) {
      _poll();
    } else {
      _listen(db!);
    }
  }

  final Future<List<NearbyTaxi>> Function() ask;
  final LiveDatabase? db;
  final TaxiSpot spot;
  final Duration every;
  final _out = StreamController<List<NearbyTaxi>>();
  final _cells = <String, Object?>{};
  final _subs = <StreamSubscription<Object?>>[];
  Timer? _timer;
  bool _closed = false;

  Stream<List<NearbyTaxi>> get stream => _out.stream;

  void _listen(LiveDatabase db) {
    for (final cell in cellsAround(spot.lat, spot.lng)) {
      _subs.add(
        db.listen('cells/$cell').listen((value) {
          _cells[cell] = value;
          _emitLive();
        }, onError: (Object _) => _fallBack()),
      );
    }
    // Taxis that stop sending leave the map.
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _emitLive());
  }

  void _emitLive() {
    if (_closed) return;
    final now = DateTime.now();
    final taxis = <String, NearbyTaxi>{};
    for (final cell in _cells.values) {
      if (cell is! Map) continue;
      for (final entry in cell.entries) {
        final taxi = taxiFromNode('${entry.key}', entry.value, now);
        if (taxi != null) taxis[taxi.driverKey] = taxi;
      }
    }
    _out.add(taxis.values.toList());
  }

  void _fallBack() {
    if (_closed || _subs.isEmpty) return;
    for (final sub in _subs) {
      sub.cancel();
    }
    _subs.clear();
    _timer?.cancel();
    _poll();
  }

  void _poll() {
    Future<void> once() async {
      try {
        final taxis = await ask();
        if (!_closed) _out.add(taxis);
      } catch (_) {
        // The next ask tries again.
      }
    }

    once();
    _timer = Timer.periodic(every, (_) => once());
  }

  void close() {
    _closed = true;
    _timer?.cancel();
    for (final sub in _subs) {
      sub.cancel();
    }
    _out.close();
  }
}

/// Where the rider's driver is, live from `drivers/<follow>` while the
/// token follows them on ride [rideId]; null otherwise (the ride's own
/// `driver_location` is used then).
final followedDriverProvider = StreamProvider.autoDispose
    .family<NearbyTaxi?, int>((ref, rideId) {
      final live = ref.watch(taxiLiveProvider).value;
      final key = live?.token.rideId == rideId ? live?.token.follow : null;
      if (live == null || key == null) return Stream.value(null);
      return live.db
          .listen('drivers/$key')
          .map((node) => taxiFromNode(key, node, DateTime.now()))
          .transform(_nullOnError());
    });

/// A ride's node (`rides/<id>`), written by Yallapp: a change means the ride
/// changed (the screen asks for it again).
final liveRideNodeProvider = StreamProvider.autoDispose.family<Object?, int>((
  ref,
  rideId,
) {
  final live = ref.watch(taxiLiveProvider).value;
  if (live == null || live.token.rideId != rideId) return const Stream.empty();
  return live.db.listen('rides/$rideId');
});

/// The driver's offers node (`offers/<driver_key>`), written by Yallapp: a
/// change means a new offer to ask for.
final liveOfferNodeProvider = StreamProvider.autoDispose<Object?>((ref) {
  final live = ref.watch(taxiLiveProvider).value;
  final key = live?.token.driverKey;
  if (live == null || live.token.role != LiveRole.driver || key == null) {
    return const Stream.empty();
  }
  return live.db.listen('offers/$key');
});

StreamTransformer<T?, T?> _nullOnError<T>() =>
    StreamTransformer.fromHandlers(handleError: (_, _, sink) => sink.add(null));

/// The driver's position in the live database: `cells/<cell>/<key>` for
/// the riders around and `drivers/<key>` for their rider, the old cell's
/// entry removed when they move to another, both removed when they go
/// offline. Fed by the driver's screen with each position it sends to
/// Yallapp (every 8 s while online and the screen is open).
class DriverLiveWriter {
  DriverLiveWriter(this._ref);

  final Ref _ref;
  String? _cell;

  /// The driver's last position and heading, for their map.
  final position = ValueNotifier<NearbyTaxi?>(null);

  TaxiLiveSession? get _session {
    final TaxiLiveSession? live;
    try {
      live = _ref.read(taxiLiveProvider).value;
    } catch (_) {
      // The screen closed.
      return null;
    }
    final ok =
        live != null &&
        live.token.role == LiveRole.driver &&
        live.token.driverKey != null;
    return ok ? live : null;
  }

  /// [free]: no ride now. A driver on a ride is followed by their rider
  /// only (`drivers/<key>`) and leaves the cells riders look for taxis in.
  Future<void> write(
    double lat,
    double lng, {
    int? vehicleTypeId,
    bool free = true,
  }) async {
    final last = position.value;
    // The heading from the last position, once the car moved enough.
    final moved =
        last != null &&
        distanceKm((lat: last.lat, lng: last.lng), (lat: lat, lng: lng)) >
            0.015;
    final heading = moved
        ? bearing((lat: last.lat, lng: last.lng), (lat: lat, lng: lng))
        : last?.heading;
    position.value = NearbyTaxi(
      driverKey: last?.driverKey ?? '',
      lat: lat,
      lng: lng,
      heading: heading,
      vehicleTypeId: vehicleTypeId,
    );
    final live = _session;
    if (live == null) return;
    final key = live.token.driverKey!;
    final cell = geohash(lat, lng);
    final at = DateTime.now().millisecondsSinceEpoch;
    final node = {'lat': lat, 'lng': lng, 'at': at, 'heading': ?heading};
    try {
      await live.db.update({
        if (free)
          'cells/$cell/$key': {...node, 'vehicle_type_id': ?vehicleTypeId},
        'drivers/$key': node,
        if (_cell != null && (!free || _cell != cell))
          'cells/$_cell/$key': null,
      });
      _cell = free ? cell : null;
    } catch (_) {
      // The next position tries again.
    }
  }

  /// Off the map: the driver went offline.
  Future<void> clear() async {
    final live = _session;
    final cell = _cell;
    _cell = null;
    if (live == null) return;
    final key = live.token.driverKey!;
    try {
      await live.db.update({
        if (cell != null) 'cells/$cell/$key': null,
        'drivers/$key': null,
      });
    } catch (_) {
      // Riders drop it after a minute anyway.
    }
  }

  void dispose() => position.dispose();
}

final driverLiveWriterProvider = Provider.autoDispose<DriverLiveWriter>((ref) {
  final writer = DriverLiveWriter(ref);
  ref.onDispose(writer.dispose);
  return writer;
});
