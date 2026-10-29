import 'json.dart';

/// 105.9 Live taxi apps: `Config.taxi`, the token for the company's live
/// database, the free taxis around a place, places and routes (tag Taxi in
/// docs/api/openapi.yaml). Their rides are 105.2's (rides_models.dart).

/// Whose map the app draws (`TaxiConfig.map.provider`).
enum TaxiMapProvider { google, osm }

/// The company's map (`TaxiConfig.map`).
class TaxiMap {
  const TaxiMap({
    this.provider = TaxiMapProvider.osm,
    this.tilesUrl,
    this.attribution,
    this.search = false,
    this.routes = false,
  });

  factory TaxiMap.fromJson(Json json) => TaxiMap(
    provider: enumFrom(
      TaxiMapProvider.values,
      json['provider'],
      TaxiMapProvider.osm,
    ),
    tilesUrl: optString(json, 'tiles_url'),
    attribution: optString(json, 'attribution'),
    search: boolOr(json, 'search', false),
    routes: boolOr(json, 'routes', false),
  );

  final TaxiMapProvider provider;

  /// The tiles, with `{z}`, `{x}` and `{y}`; null: no map behind the taxis.
  final String? tilesUrl;
  final String? attribution;

  /// `GET /taxi/places` works.
  final bool search;

  /// `POST /taxi/route` works.
  final bool routes;
}

/// The company's Firebase Realtime Database (`TaxiConfig.live`).
class TaxiLive {
  const TaxiLive({required this.databaseUrl, required this.root});

  factory TaxiLive.fromJson(Json json) => TaxiLive(
    databaseUrl: reqString(json, 'database_url'),
    root: reqString(json, 'root'),
  );

  final String databaseUrl;

  /// `yallapp/<app_id>`: every path is under it.
  final String root;
}

/// `Config.taxi`.
class TaxiConfig {
  const TaxiConfig({
    this.map = const TaxiMap(),
    this.live,
    this.nearbyEverySeconds = 5,
  });

  factory TaxiConfig.fromJson(Json json) => TaxiConfig(
    map: optObject(json, 'map', TaxiMap.fromJson) ?? const TaxiMap(),
    live: optObject(json, 'live', TaxiLive.fromJson),
    nearbyEverySeconds: intOr(json, 'nearby_every_seconds', 5).clamp(2, 60),
  );

  final TaxiMap map;

  /// Null: no live database; the app asks Yallapp every [nearbyEverySeconds].
  final TaxiLive? live;
  final int nearbyEverySeconds;
}

/// Who the live token is for (`TaxiLiveToken.role`).
enum LiveRole { rider, driver }

/// `POST /taxi/live-token`: a Firebase custom token and what it may read.
class TaxiLiveToken {
  const TaxiLiveToken({
    required this.token,
    required this.databaseUrl,
    required this.root,
    required this.expiresAt,
    this.role = LiveRole.rider,
    this.driverKey,
    this.rideId,
    this.follow,
  });

  factory TaxiLiveToken.fromJson(Json json) => TaxiLiveToken(
    token: reqString(json, 'token'),
    databaseUrl: reqString(json, 'database_url'),
    root: reqString(json, 'root'),
    expiresAt: reqDate(json, 'expires_at'),
    role: enumFrom(LiveRole.values, json['role'], LiveRole.rider),
    driverKey: optString(json, 'driver_key'),
    rideId: optInt(json, 'ride_id'),
    follow: optString(json, 'follow'),
  );

  final String token;
  final String databaseUrl;
  final String root;
  final DateTime expiresAt;
  final LiveRole role;

  /// A driver's own key.
  final String? driverKey;

  /// The ride that isn't over.
  final int? rideId;

  /// That ride's driver's key, once a driver accepted it.
  final String? follow;
}

/// A free taxi on the map (`TaxiNearby.items`, or a live cell).
class NearbyTaxi {
  const NearbyTaxi({
    required this.driverKey,
    required this.lat,
    required this.lng,
    this.heading,
    this.vehicleTypeId,
  });

  factory NearbyTaxi.fromJson(Json json) => NearbyTaxi(
    driverKey: reqString(json, 'driver_key'),
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    heading: optDouble(json, 'heading'),
    vehicleTypeId: optInt(json, 'vehicle_type_id'),
  );

  final String driverKey;
  final double lat;
  final double lng;

  /// Degrees from north.
  final double? heading;
  final int? vehicleTypeId;
}

/// A place from the company's search (`TaxiPlace`); a Google one comes
/// without its position until it is asked for.
class TaxiPlace {
  const TaxiPlace({
    required this.id,
    required this.name,
    this.address,
    this.lat,
    this.lng,
  });

  factory TaxiPlace.fromJson(Json json) => TaxiPlace(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    address: optString(json, 'address'),
    lat: optDouble(json, 'lat'),
    lng: optDouble(json, 'lng'),
  );

  final String id;
  final String name;
  final String? address;
  final double? lat;
  final double? lng;

  bool get located => lat != null && lng != null;
}

/// The driving route between two places (`TaxiRoute`).
class TaxiRoute {
  const TaxiRoute({
    required this.distanceKm,
    required this.minutes,
    this.points = const [],
  });

  factory TaxiRoute.fromJson(Json json) => TaxiRoute(
    distanceKm: optDouble(json, 'distance_km') ?? 0,
    minutes: intOr(json, 'minutes', 0),
    points: [
      for (final point in (json['points'] as List<Object?>? ?? const []))
        if (point is List && point.length == 2)
          (
            lat: (point[0] as num).toDouble(),
            lng: (point[1] as num).toDouble(),
          ),
    ],
  );

  final double distanceKm;
  final int minutes;

  /// The route's line.
  final List<({double lat, double lng})> points;
}
