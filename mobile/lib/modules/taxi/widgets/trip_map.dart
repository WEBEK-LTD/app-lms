import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../data/taxi_providers.dart';
import 'taxi_map.dart';

/// 112.2 A delivery's map: the pickup and the drop-off with the road
/// between them, and the courier (live tracking) with their dotted way to
/// [toward]; on the app's tiles, else a plain background. In a card, at the
/// top of a shipment's, a food order's or a courier job's screen.
class TripMap extends ConsumerWidget {
  const TripMap({
    super.key,
    required this.map,
    this.from,
    this.to,
    this.courier,
    this.toward,
    this.height = 280,
  });

  final TaxiMap map;
  final Place? from;
  final Place? to;
  final TaxiSpot? courier;

  /// Where the courier goes now (the pickup, then the drop-off).
  final Place? toward;
  final double height;

  /// A delivery or food app's map ([DeliveryConfig.map]).
  static TaxiMap mapOf(DeliveryConfig config) => TaxiMap(
    tilesUrl: config.tilesUrl,
    attribution: config.attribution,
    search: config.search,
    routes: config.routes,
  );

  static TaxiSpot? spotOf(Place? place) => place != null && place.located
      ? (lat: place.lat!, lng: place.lng!)
      : null;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final a = spotOf(from), b = spotOf(to), next = spotOf(toward);
    final road = a != null && b != null
        ? ref
                  .watch(
                    routeLineProvider((from: roundSpot(a), to: roundSpot(b))),
                  )
                  .value ??
              [a, b]
        : const <TaxiSpot>[];
    final car = courier;
    return ClipRRect(
      borderRadius: BorderRadius.circular(context.shapes.card),
      child: SizedBox(
        height: height,
        child: TaxiMapView(
          key: const ValueKey('trip-map'),
          map: map,
          focus: [?a, ?b, ?car],
          car: car == null
              ? null
              : NearbyTaxi(driverKey: 'courier', lat: car.lat, lng: car.lng),
          carIcon: AppIcons.courier,
          pins: [
            if (a != null)
              TaxiPin(
                TaxiPinKind.from,
                a.lat,
                a.lng,
                label: l10n.taxiFrom(from!.address),
              ),
            if (b != null)
              TaxiPin(
                TaxiPinKind.to,
                b.lat,
                b.lng,
                label: l10n.taxiTo(to!.address),
              ),
          ],
          route: road,
          approach: car != null && next != null ? [car, next] : const [],
        ),
      ),
    );
  }
}

/// 112.2 Under the map while the courier has it: "On the way from (the
/// pickup) to you" and how soon (at about 25 km/h in town from where they are).
class OnTheWayLine extends StatelessWidget {
  const OnTheWayLine({
    super.key,
    required this.from,
    required this.to,
    required this.courier,
  });

  final Place from;
  final Place to;
  final TaxiSpot courier;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final door = TripMap.spotOf(to);
    final minutes = door == null
        ? null
        : driveMinutes(distanceKm(courier, door));
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        children: [
          AppIcon(AppIcons.courier, size: 22, color: p.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.trackingOnTheWayFrom(from.address),
                  key: const ValueKey('trip-on-the-way'),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (minutes != null)
                  Text(
                    l10n.trackingArrivesIn(minutes),
                    key: const ValueKey('trip-eta'),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
