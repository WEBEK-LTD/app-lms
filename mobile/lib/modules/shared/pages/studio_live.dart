import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/star_text.dart';
import '../../delivery/data/delivery_providers.dart';
import '../../rides/data/rides_providers.dart';
import '../../taxi/data/taxi_providers.dart';
import 'content_blocks.dart' show pageClockProvider;

/// 128 The live elements of a Studio page (platform/web/src/lib/pages/
/// types.ts `STUDIO_LIVE_TYPES`), drawn from the signed-in person: their
/// shipment on its way with its stages, their ride with the driver, the car
/// and a call button, the free taxis near them, and a greeting with their
/// first name. Each shows nothing when there is nothing of theirs to show
/// (Studio's canvas draws a sample: components/studio/tracking.tsx).

/// The signed-in customer's shipment still on its way, the newest first.
final activeShipmentProvider = FutureProvider.autoDispose<Shipment?>((
  ref,
) async {
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  final page = await ref.read(yallappApiProvider).listMyShipments(active: true);
  for (final shipment in page.items) {
    if (shipment.status.active) return shipment;
  }
  return null;
});

/// Where the person is, for the taxis near them; null when the phone can't
/// say (location off or refused). Only in a taxi app, and 128.10 only
/// signed in: nothing of the person's is drawn signed out (the contract's
/// `StudioTracking`), nor is the phone asked where it is.
final studioHereProvider = FutureProvider.autoDispose<TaxiSpot?>((ref) async {
  if (ref.watch(taxiConfigProvider) == null) return null;
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  final found = await ref.read(locatorProvider).current();
  final at = found.position;
  if (at == null) return null;
  // About 100 m: moving a little keeps the same listeners.
  double round(double v) => (v * 1000).roundToDouble() / 1000;
  return (lat: round(at.lat), lng: round(at.lng));
});

/// The free taxis near the person, once the phone says where they are.
final studioNearbyTaxisProvider =
    Provider.autoDispose<({TaxiSpot at, List<NearbyTaxi> taxis})?>((ref) {
      final at = ref.watch(studioHereProvider).value;
      if (at == null) return null;
      final taxis = ref.watch(nearbyTaxisProvider(at)).value;
      return taxis == null ? null : (at: at, taxis: taxis);
    });

/// Whether a live element has something of the person's to show.
bool studioLiveShows(StudioNode node, WidgetRef ref) {
  if (node.type == StudioNodeType.greeting) return true;
  final tracking = node.tracking;
  if (tracking == null) return false;
  return switch (tracking.kind) {
    StudioTrackingKind.shipment =>
      ref.watch(activeShipmentProvider).value != null,
    StudioTrackingKind.ride => ref.watch(activeRideProvider).value != null,
    StudioTrackingKind.nearbyTaxis =>
      ref.watch(studioNearbyTaxisProvider) != null,
  };
}

/// A `tracking` element, in the app's main colour (a line's icon in its
/// second colour); its background, padding and corners are the element's.
class StudioTrackingView extends ConsumerWidget {
  const StudioTrackingView({super.key, required this.node});

  final StudioNode node;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tracking = node.tracking;
    if (tracking == null) return const SizedBox.shrink();
    switch (tracking.kind) {
      case StudioTrackingKind.nearbyTaxis:
        final near = ref.watch(studioNearbyTaxisProvider);
        if (near == null) return const SizedBox.shrink();
        return _NearbyTaxis(at: near.at, taxis: near.taxis);
      case StudioTrackingKind.shipment:
        final shipment = ref.watch(activeShipmentProvider).value;
        if (shipment == null) return const SizedBox.shrink();
        return _Live(
          look: tracking.look,
          live: _shipmentLive(context, shipment),
          photo: node.imageUrl,
        );
      case StudioTrackingKind.ride:
        final ride = ref.watch(activeRideProvider).value;
        if (ride == null) return const SizedBox.shrink();
        return _Live(
          look: tracking.look,
          live: _rideLive(context, ride),
          photo: node.imageUrl,
        );
    }
  }
}

/// What a live card says, whatever it follows.
class _LiveFacts {
  const _LiveFacts({
    required this.title,
    required this.line,
    required this.facts,
    required this.stage,
    required this.icon,
    required this.open,
    this.phone,
    this.name,
    this.photo,
  });

  /// The shipment's or ride's state, and the line under it.
  final String title;
  final String line;

  /// The driver's rating and plate.
  final String? facts;

  /// Of 4 stages.
  final int stage;
  final String icon;
  final String open;
  final String? phone;
  final String? name;
  final String? photo;
}

String _first(String name) => name.trim().split(RegExp(r'\s+')).first;

_LiveFacts _shipmentLive(BuildContext context, Shipment s) {
  final l10n = context.l10n;
  final place = s.dropoff.address;
  final courier = s.courierName;
  return _LiveFacts(
    title: switch (s.status) {
      ShipmentStatus.assigned => l10n.studioTrackAssigned(s.reference),
      ShipmentStatus.pickedUp => l10n.studioTrackPickedUp(s.reference),
      ShipmentStatus.onTheWay => l10n.studioTrackOnTheWay(s.reference),
      _ => l10n.studioTrackWaiting(s.reference),
    },
    line: courier == null || courier.isEmpty
        ? l10n.studioTrackTo(place)
        : l10n.studioTrackBringing(_first(courier), place),
    facts: null,
    stage: switch (s.status) {
      ShipmentStatus.assigned => 1,
      ShipmentStatus.pickedUp => 2,
      ShipmentStatus.onTheWay => 3,
      ShipmentStatus.delivered => 4,
      _ => 0,
    },
    icon: 'local_shipping',
    open: Paths.shipment(s.id),
    phone: s.courierPhone,
    name: courier == null ? null : _first(courier),
  );
}

_LiveFacts _rideLive(BuildContext context, Ride r) {
  final l10n = context.l10n;
  final driver = r.driver;
  final car = [
    driver?.carColor,
    driver?.carModel,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' ');
  final rating = driver?.rating;
  return _LiveFacts(
    title: switch (r.status) {
      RideStatus.searching => l10n.studioRideSearching,
      RideStatus.arrived => l10n.studioRideHere,
      RideStatus.inProgress => l10n.studioRideOnBoard(r.dropoff.address),
      _ =>
        r.pickupMinutes != null
            ? l10n.studioRideArriving(r.pickupMinutes!)
            : l10n.studioRideComing,
    },
    line: driver == null
        ? r.vehicleTypeName
        : [_first(driver.name), if (car.isNotEmpty) car].join(' · '),
    facts: driver == null
        ? null
        : [
            if (rating != null) '★ ${rating.toStringAsFixed(1)}',
            ?driver.plate,
          ].join(' · '),
    stage: switch (r.status) {
      RideStatus.searching => 1,
      RideStatus.accepted => 2,
      RideStatus.arrived => 3,
      RideStatus.inProgress => 4,
      _ => 0,
    },
    icon: r.vehicleTypeIcon,
    open: Paths.rideFollow(r.id),
    phone: driver?.phone,
    name: driver == null ? null : _first(driver.name),
    photo: driver?.photoUrl,
  );
}

class _Live extends ConsumerWidget {
  const _Live({required this.look, required this.live, this.photo});

  final StudioTrackingStyle look;
  final _LiveFacts live;

  /// The element's photo, while the driver has none of their own.
  final String? photo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final ink = DefaultTextStyle.of(context).style.color ?? p.text;
    final accent = p.primary;
    void open() => context.push(live.open);
    final phone = live.phone;
    switch (look) {
      case StudioTrackingStyle.line:
        return InkWell(
          key: const ValueKey('studio-tracking-line'),
          onTap: open,
          child: Row(
            children: [
              AppIcon(symbolByName(live.icon), size: 18, color: accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${live.title} · ${live.line}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: ink),
                ),
              ),
            ],
          ),
        );
      case StudioTrackingStyle.driver:
        final picture = live.photo ?? photo;
        final soft = Color.lerp(accent, Colors.white, 0.6)!;
        return InkWell(
          key: const ValueKey('studio-tracking-driver'),
          onTap: open,
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: SizedBox(
                  width: 56,
                  height: 56,
                  child: picture != null
                      ? AppNetworkImage(url: picture)
                      : ColoredBox(
                          color: ink.withValues(alpha: 0.14),
                          child: Icon(symbolByName('person'), color: ink),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      live.title.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: soft,
                      ),
                    ),
                    Text(
                      live.line,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: ink,
                      ),
                    ),
                    if (live.facts case final facts? when facts.isNotEmpty)
                      // The rating's star as the icon, in every font.
                      StarText(
                        facts,
                        maxLines: 1,
                        style: TextStyle(
                          fontSize: 12,
                          color: ink.withValues(alpha: 0.85),
                        ),
                      ),
                  ],
                ),
              ),
              if (phone != null && phone.isNotEmpty) ...[
                const SizedBox(width: 12),
                Semantics(
                  button: true,
                  label: context.l10n.studioRideCall(live.name ?? ''),
                  child: InkResponse(
                    key: const ValueKey('studio-tracking-call'),
                    onTap: () => ref.read(openExternalProvider)('tel:$phone'),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: accent,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        symbolByName('call'),
                        size: 22,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      case StudioTrackingStyle.card:
        final track = Theme.of(context).brightness == Brightness.dark
            ? Colors.white.withValues(alpha: 0.14)
            : ink.withValues(alpha: 0.12);
        return InkWell(
          key: const ValueKey('studio-tracking-card'),
          onTap: open,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  AppIcon(symbolByName(live.icon), size: 22, color: accent),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          live.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: ink,
                          ),
                        ),
                        Text(
                          live.line,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: ink.withValues(alpha: 0.72),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    height: 30,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: accent,
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Text(
                      context.l10n.studioTrackButton,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: p.onPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  for (var i = 0; i < 4; i++) ...[
                    if (i > 0) const SizedBox(width: 4),
                    Expanded(
                      child: Container(
                        height: 5,
                        decoration: BoxDecoration(
                          color: i < live.stage ? accent : track,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        );
    }
  }
}

/// "7 taxis near you · the nearest 1 min away", the taxi in the app's
/// second colour.
class _NearbyTaxis extends ConsumerWidget {
  const _NearbyTaxis({required this.at, required this.taxis});

  final TaxiSpot at;
  final List<NearbyTaxi> taxis;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final ink = DefaultTextStyle.of(context).style.color ?? p.textSecondary;
    double? nearest;
    for (final t in taxis) {
      final km = distanceKm(at, (lat: t.lat, lng: t.lng));
      if (nearest == null || km < nearest) nearest = km;
    }
    return Row(
      key: const ValueKey('studio-tracking-nearby'),
      children: [
        AppIcon(symbolByName('local_taxi'), size: 18, color: p.accent),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            [
              ref.watch(isTaxiKindProvider)
                  ? l10n.taxiNearby(taxis.length)
                  : l10n.rideCarsNearby(taxis.length),
              if (nearest != null) l10n.taxiNearest(driveMinutes(nearest)),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: ink),
          ),
        ),
      ],
    );
  }
}

/// A `greeting`: good morning or good evening with the person's first name;
/// signed out, the greeting alone. Its font and colour are the element's.
class StudioGreetingView extends ConsumerWidget {
  const StudioGreetingView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final now = ref.watch(pageClockProvider)();
    final auth = ref.watch(authControllerProvider);
    final name = auth is SignedIn ? _first(auth.user?.name ?? '') : '';
    final morning = now.hour < 12;
    return Text(
      name.isEmpty
          ? (morning
                ? l10n.studioGreetingMorningAlone
                : l10n.studioGreetingEveningAlone)
          : (morning
                ? l10n.studioGreetingMorning(name)
                : l10n.studioGreetingEvening(name)),
      key: const ValueKey('studio-greeting-element'),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
