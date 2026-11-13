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
    );
  }

  /// In percent from the start and the top.
  final List<StudioPlace> markers;

  /// A Material Symbols name; null, a taxi.
  final String? icon;

  /// #RRGGBB; null, taxi gold and navy.
  final String? accent;
  final String? chip;
  final bool me;
  final bool live;
}

/// What a `tracking` element follows: the person's shipment or ride on its
/// way, or the free taxis near them.
enum StudioTrackingKind { shipment, ride, nearbyTaxis }

/// How it is drawn: a card with the stages, the driver and the car, or one
/// line.
enum StudioTrackingStyle { card, driver, line }

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
      };
}
