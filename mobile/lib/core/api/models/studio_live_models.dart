import 'json.dart';
import 'page_models.dart';

/// 128 What the cover layouts and the live elements of a Studio page hold
/// (`StudioMapDrawing`, `StudioTracking` in the app API; the scrim over a
/// `photo_hero`'s photo is any element's, `StudioScrim` in page_models.dart).

/// For a `map_header`: its markers on the drawn map, their icon and
/// colours, the person's own dot, and whether the app shows the free taxis
/// near the person instead.
class StudioMapDrawing {
  const StudioMapDrawing({
    this.markers = const [],
    this.icon,
    this.accent,
    this.chip,
    this.me = false,
    this.live = false,
    this.style,
    this.marker,
    this.sign,
    this.meAt,
    this.places = const [],
    this.labels = const [],
    this.route,
  });

  static StudioMapDrawing? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final raw = json['markers'];
    return StudioMapDrawing(
      markers: [
        for (final m in raw is List ? raw.take(12) : const [])
          ?StudioPlace.tryParse(m),
      ],
      icon: optString(json, 'icon'),
      accent: optString(json, 'accent'),
      chip: optString(json, 'chip'),
      me: boolOr(json, 'me', false),
      live: boolOr(json, 'live', false),
      // 129.21–129.24 Its premium look; a look or marker this app doesn't
      // know is the plain map and its tiles.
      style: enumOrNull(StudioMapStyle.values, json['style']),
      marker: enumOrNull(StudioMapMarker.values, json['marker']),
      sign: optString(json, 'sign'),
      meAt: StudioPlace.tryParse(json['me_at']),
      places: [
        for (final p in _list(json['places'], 6)) ?StudioMapPin.tryParse(p),
      ],
      labels: [
        for (final l in _list(json['labels'], 8)) ?StudioMapLabel.tryParse(l),
      ],
      route: StudioMapRoute.tryParse(json['route']),
    );
  }

  static Iterable<Object?> _list(Object? raw, int most) =>
      raw is List ? raw.take(most) : const [];

  /// In percent from the start and the top.
  final List<StudioPlace> markers;

  /// A Material Symbols name; null, a taxi.
  final String? icon;

  /// #RRGGBB; null, taxi gold and navy.
  final String? accent;
  final String? chip;
  final bool me;
  final bool live;

  /// 129.21–129.24 How the map is drawn; null, the plain map.
  final StudioMapStyle? style;

  /// How the markers look; null, the style's own.
  final StudioMapMarker? marker;

  /// The word on a roof-sign marker; null, "TAXI" in the app's language.
  final String? sign;

  /// Where the person's dot is; null, a little under the middle.
  final StudioPlace? meAt;
  final List<StudioMapPin> places;
  final List<StudioMapLabel> labels;
  final StudioMapRoute? route;

  /// Whether there is more than 128's plain map to draw.
  bool get premium =>
      style != null ||
      marker != null ||
      sign != null ||
      meAt != null ||
      places.isNotEmpty ||
      labels.isNotEmpty ||
      route != null;

  /// The markers' look: the element's, else its style's own.
  StudioMapMarker get markerLook =>
      marker ??
      switch (style) {
        StudioMapStyle.natural || StudioMapStyle.horizon => StudioMapMarker.car,
        StudioMapStyle.twoInk => StudioMapMarker.sign,
        StudioMapStyle.lens => StudioMapMarker.token,
        null => StudioMapMarker.tile,
      };
}

/// 129.21–129.24 The drawn map's premium looks: a living map, a horizon in
/// perspective, two inks, a radar lens.
enum StudioMapStyle { natural, horizon, twoInk, lens }

/// How a map's markers look: a tile with the icon, a car from above, a roof
/// sign, a round token with a trail.
enum StudioMapMarker { tile, car, sign, token }

/// What a live route follows: the person's ride or shipment on its way.
enum StudioMapRouteLive { ride, shipment }

/// 129.21 A labelled pin (Home, Office), in percent from the start and the
/// top.
class StudioMapPin {
  const StudioMapPin({required this.at, required this.label, this.icon});

  static StudioMapPin? tryParse(Object? value) {
    final at = StudioPlace.tryParse(value);
    if (at == null || value is! Map) return null;
    final json = asJson(value);
    final label = optString(json, 'label')?.trim();
    if (label == null || label.isEmpty) return null;
    return StudioMapPin(at: at, label: label, icon: optString(json, 'icon'));
  }

  final StudioPlace at;
  final String label;
  final String? icon;
}

/// 129.21 A word on the map (a district, a river), its start at the spot.
class StudioMapLabel {
  const StudioMapLabel({required this.at, required this.text});

  static StudioMapLabel? tryParse(Object? value) {
    final at = StudioPlace.tryParse(value);
    if (at == null || value is! Map) return null;
    final text = optString(asJson(value), 'text')?.trim();
    if (text == null || text.isEmpty) return null;
    return StudioMapLabel(at: at, text: text);
  }

  final StudioPlace at;
  final String text;
}

/// 129.24 A route on the map: through its points, done up to [at] percent
/// of the way, with the vehicle there.
class StudioMapRoute {
  const StudioMapRoute({
    required this.points,
    this.at = 0,
    this.fromLabel,
    this.toLabel,
    this.eta,
    this.icon,
    this.color,
    this.darkColor,
    this.moving = false,
    this.live,
  });

  static StudioMapRoute? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final raw = json['points'];
    final points = [
      for (final p in raw is List ? raw.take(6) : const [])
        ?StudioPlace.tryParse(p),
    ];
    if (points.length < 2) return null;
    return StudioMapRoute(
      points: points,
      at: (optDouble(json, 'at') ?? 0).clamp(0, 100).toDouble(),
      fromLabel: optString(json, 'from_label'),
      toLabel: optString(json, 'to_label'),
      eta: optString(json, 'eta'),
      icon: optString(json, 'icon'),
      color: optString(json, 'color'),
      darkColor: optString(json, 'dark_color'),
      moving: boolOr(json, 'moving', false),
      live: enumOrNull(StudioMapRouteLive.values, json['live']),
    );
  }

  /// In percent from the start and the top.
  final List<StudioPlace> points;

  /// Where the vehicle is along the way, 0 to 100.
  final double at;
  final String? fromLabel;
  final String? toLabel;
  final String? eta;
  final String? icon;

  /// #RRGGBB; null, the markers' accent.
  final String? color;
  final String? darkColor;

  /// The vehicle drives on along the rest of the way (a sample).
  final bool moving;

  /// In the app, the person's ride or shipment on its way instead.
  final StudioMapRouteLive? live;
}

/// What a `tracking` element follows: the person's shipment or ride on its
/// way, or the free taxis near them; 130.11 their next trip (a travel app).
enum StudioTrackingKind { shipment, ride, nearbyTaxis, trip }

/// How it is drawn: a card with the stages, the driver and the car, or one
/// line; 130.11 a trip's first flight as a boarding pass (`ticket`, the
/// others' card) or the main number large (`headline`).
enum StudioTrackingStyle { card, driver, line, ticket, headline }

class StudioTracking {
  const StudioTracking({required this.kind, this.style});

  static StudioTracking? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final kind = enumOrNull(StudioTrackingKind.values, json['kind']);
    if (kind == null) return null;
    return StudioTracking(
      kind: kind,
      style: enumOrNull(StudioTrackingStyle.values, json['style']),
    );
  }

  final StudioTrackingKind kind;

  /// Null: a card for a shipment, the driver for a ride, a line for the
  /// taxis near the person.
  final StudioTrackingStyle? style;

  StudioTrackingStyle get look =>
      style ??
      switch (kind) {
        StudioTrackingKind.shipment => StudioTrackingStyle.card,
        StudioTrackingKind.ride => StudioTrackingStyle.driver,
        StudioTrackingKind.nearbyTaxis => StudioTrackingStyle.line,
        StudioTrackingKind.trip => StudioTrackingStyle.card,
      };
}

// ——— 130 Signature looks: the live cards' premium looks ———

/// 130 The live cards' premium looks (`StudioLiveStatus.style`,
/// `StudioTracking.style`): the minutes as a hero number over the stages
/// as segments, a photo in a progress ring, a slim pill with a Track
/// button, or the stages as named dots on a line.
enum StudioLiveLook { hero, ring, pill, steps }

/// 130 A live card in one of its premium looks, with the accent of its live
/// dot, stages and button by day and by night (#RRGGBB; null, the app's
/// main colour). Read from a `live_status`'s or a `tracking`'s object; null
/// when it is drawn in its own card.
class StudioLiveLookStyle {
  const StudioLiveLookStyle({required this.look, this.accent, this.darkAccent});

  static StudioLiveLookStyle? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final look = enumOrNull(StudioLiveLook.values, json['style']);
    if (look == null) return null;
    String? hex(String key) {
      final v = optString(json, key);
      return v != null && RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(v) ? v : null;
    }

    return StudioLiveLookStyle(
      look: look,
      accent: hex('accent'),
      darkAccent: hex('dark_accent'),
    );
  }

  final StudioLiveLook look;
  final String? accent;
  final String? darkAccent;
}

// ——— end 130 ———
