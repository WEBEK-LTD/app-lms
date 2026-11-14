import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/models/market_api_models.dart' as market;
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import '../../taxi/data/taxi_providers.dart' show distanceKm, driveMinutes;
import 'content_blocks.dart' show pageClockProvider;
import 'studio_live_status.dart'
    show liveFoodOrderProvider, liveMarketOrderProvider;

/// 130 The live cards' premium looks (`StudioLiveStatus.style` and
/// `StudioTracking.style`: hero, ring, pill, steps), drawn from the
/// signed-in person's own order, shipment or ride: the minutes left as a
/// hero number beside the state over its four stages, a photo in a ring
/// filled as far as it is, a slim pill with a Track button, or the stages
/// as named dots on a line. The words take the element's text colour; the
/// live dot, stages and button its accent (the app's main colour without
/// one). A tap opens the order, shipment or ride.

/// What a live card in a premium look says, whatever it follows.
class LiveLookFacts {
  const LiveLookFacts({
    required this.state,
    required this.title,
    required this.line,
    required this.pillTitle,
    required this.pillLine,
    required this.stage,
    required this.stages,
    required this.location,
    this.tag,
    this.minutes,
    this.photo,
  });

  /// The reference, as a chip before the state (a shipment's).
  final String? tag;

  /// "On its way".
  final String state;

  /// What it is (the dish, the parcel's way, the driver), and where from.
  final String title;
  final String line;

  /// The pill's words: what is on its way, and who brings it.
  final String pillTitle;
  final String pillLine;
  final int? minutes;

  /// 1 to 4.
  final int stage;
  final List<String> stages;

  /// What a tap opens.
  final String location;

  /// The courier's or driver's own photo, or the restaurant's logo.
  final String? photo;
}

String _first(String name) => name.trim().split(RegExp(r'\s+')).first;

int? _minutesTo(CourierPosition? from, Place to) {
  if (from == null || !to.located) return null;
  return driveMinutes(
    distanceKm((lat: from.lat, lng: from.lng), (lat: to.lat!, lng: to.lng!)),
  );
}

int? _minutesUntil(DateTime? at, DateTime now) {
  if (at == null) return null;
  final left = at.difference(now).inMinutes;
  return left > 0 ? left : null;
}

/// A food order on its way (`live_status` of `food_order`).
LiveLookFacts foodLiveLook(AppLocalizations l10n, FoodOrder o, DateTime now) {
  final (String state, int stage, int? minutes) = switch (o.status) {
    FoodOrderStatus.accepted => (
      l10n.liveStateCooking,
      2,
      _minutesUntil(o.readyAt, now),
    ),
    FoodOrderStatus.ready => (l10n.liveStateReady, 2, null),
    FoodOrderStatus.pickedUp || FoodOrderStatus.onTheWay => (
      l10n.liveStateOnItsWay,
      3,
      _minutesTo(o.courierPosition, o.dropoff),
    ),
    _ => (l10n.liveStatePlaced, 1, null),
  };
  final count = o.lines.fold<int>(0, (n, l) => n + l.quantity);
  final courier = o.courierName;
  return LiveLookFacts(
    state: state,
    title: o.lines.isEmpty ? o.restaurantName : o.lines.first.name,
    line: o.restaurantName,
    pillTitle: l10n.liveLookOnItsWayFrom(o.restaurantName),
    pillLine: [
      if (courier != null && courier.isNotEmpty) courier,
      if (count > 0) l10n.liveLookItems(count),
    ].join(' · '),
    stage: stage,
    stages: [
      l10n.liveStatePlaced,
      l10n.liveStageCooking,
      l10n.liveStateOnItsWay,
      l10n.liveStateDelivered,
    ],
    minutes: minutes,
    location: Paths.foodOrder(o.id),
    photo: o.restaurantLogoUrl,
  );
}

/// A marketplace order on its way (`live_status` of `market_order`).
LiveLookFacts marketLiveLook(
  AppLocalizations l10n,
  market.MarketOrder o,
  DateTime now,
) {
  final (String state, int stage) = switch (o.status) {
    market.MarketOrderStatus.accepted ||
    market.MarketOrderStatus.picking => (l10n.liveStatePacking, 2),
    market.MarketOrderStatus.ready => (l10n.liveStateReady, 2),
    market.MarketOrderStatus.onTheWay => (l10n.liveStateOnItsWay, 3),
    _ => (l10n.liveStatePlaced, 1),
  };
  final count = o.lines.fold<int>(0, (n, l) => n + l.quantity.ceil());
  final courier = o.tracking?.courierName;
  final place = o.vendor.name;
  return LiveLookFacts(
    state: state,
    title: o.lines.isEmpty ? place : o.lines.first.name,
    line: place,
    pillTitle: l10n.liveLookOnItsWayFrom(place),
    pillLine: [
      if (courier != null && courier.isNotEmpty) courier,
      if (count > 0) l10n.liveLookItems(count),
    ].join(' · '),
    stage: stage,
    stages: [
      l10n.liveStatePlaced,
      l10n.liveStagePacking,
      l10n.liveStateOnItsWay,
      l10n.liveStateDelivered,
    ],
    minutes: _minutesUntil(o.eta, now),
    location: Paths.marketOrder(o.id),
    photo: o.tracking?.courierPhotoUrl,
  );
}

/// A shipment on its way (`tracking` of `shipment`).
LiveLookFacts shipmentLiveLook(AppLocalizations l10n, Shipment s) {
  final courier = s.courierName;
  final place = s.dropoff.address;
  final (String state, int stage) = switch (s.status) {
    ShipmentStatus.assigned => (l10n.liveStatePlaced, 1),
    ShipmentStatus.pickedUp => (l10n.liveStatePickedUp, 2),
    ShipmentStatus.onTheWay => (l10n.liveStateOnItsWay, 3),
    ShipmentStatus.delivered => (l10n.liveStateDelivered, 4),
    _ => (l10n.liveStatePlaced, 1),
  };
  return LiveLookFacts(
    tag: s.reference,
    state: state,
    title: courier == null || courier.isEmpty
        ? l10n.studioTrackTo(place)
        : l10n.liveLookHeading(_first(courier), place),
    line: place,
    pillTitle: l10n.studioTrackOnTheWay(s.reference),
    pillLine: [
      if (courier != null && courier.isNotEmpty) _first(courier),
      place,
    ].join(' · '),
    stage: stage,
    stages: [
      l10n.liveStatePlaced,
      l10n.liveStatePickedUp,
      l10n.liveStateOnItsWay,
      l10n.liveStateDelivered,
    ],
    minutes: _minutesTo(s.courierPosition, s.dropoff),
    location: Paths.shipment(s.id),
  );
}

/// A ride on its way (`tracking` of `ride`).
LiveLookFacts rideLiveLook(AppLocalizations l10n, Ride r) {
  final driver = r.driver;
  final car = [
    driver?.carColor,
    driver?.carModel,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' ');
  final name = driver == null ? null : _first(driver.name);
  final stage = switch (r.status) {
    RideStatus.searching => 1,
    RideStatus.accepted => 2,
    RideStatus.arrived => 3,
    RideStatus.inProgress => 4,
    _ => 1,
  };
  return LiveLookFacts(
    state: switch (r.status) {
      RideStatus.searching => l10n.studioRideSearching,
      RideStatus.arrived => l10n.studioRideHere,
      RideStatus.inProgress => l10n.liveStageOnBoard,
      _ => l10n.liveStageComing,
    },
    title: [?name, if (car.isNotEmpty) car].join(' · '),
    line: driver?.plate ?? r.vehicleTypeName,
    pillTitle: name ?? r.vehicleTypeName,
    pillLine: [if (car.isNotEmpty) car, ?driver?.plate].join(' · '),
    stage: stage,
    stages: [
      l10n.liveStageFinding,
      l10n.liveStageComing,
      l10n.liveStageHere,
      l10n.liveStageOnBoard,
    ],
    minutes: r.status == RideStatus.accepted ? r.pickupMinutes : null,
    location: Paths.rideFollow(r.id),
    photo: driver?.photoUrl,
  );
}

/// The person's order for [source] in a premium look, once known; null
/// while loading or without one.
LiveLookFacts? watchLiveLookOrder(
  BuildContext context,
  WidgetRef ref,
  StudioLiveSource source,
) {
  final l10n = context.l10n;
  final now = ref.watch(pageClockProvider)();
  return switch (source) {
    StudioLiveSource.foodOrder => switch (ref
        .watch(liveFoodOrderProvider)
        .value) {
      final o? => foodLiveLook(l10n, o, now),
      null => null,
    },
    StudioLiveSource.marketOrder => switch (ref
        .watch(liveMarketOrderProvider)
        .value) {
      final o? => marketLiveLook(l10n, o, now),
      null => null,
    },
  };
}

/// The card, in [style]'s look.
class StudioLiveLookCard extends StatelessWidget {
  const StudioLiveLookCard({
    super.key,
    required this.node,
    required this.style,
    required this.facts,
    this.color,
  });

  final StudioNode node;
  final StudioLiveLookStyle style;
  final LiveLookFacts facts;

  /// The element's text colour; null, the page's.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final ink = color ?? DefaultTextStyle.of(context).style.color ?? p.text;
    final accent =
        parseHexColor(
          dark ? (style.darkAccent ?? style.accent) : style.accent,
        ) ??
        p.primary;
    final soft = ink.withValues(alpha: 0.72);
    final track = ink.withValues(alpha: 0.16);
    final onAccent = accent.computeLuminance() > 0.45
        ? const Color(0xFF14110E)
        : Colors.white;
    final photo = node.imageUrl ?? facts.photo;
    final f = facts;

    Widget minutes({required bool short}) => f.minutes == null
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsetsDirectional.only(start: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${f.minutes}',
                  style: TextStyle(
                    fontSize: 46,
                    height: 0.95,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.8,
                    color: ink,
                  ),
                ),
                Text(
                  short ? l10n.liveOrderMin : l10n.liveLookMinAway,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: soft,
                  ),
                ),
              ],
            ),
          );

    Widget kicker(String words) => Row(
      children: [
        if (f.tag case final tag?) ...[
          Container(
            height: 24,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: track,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              tag,
              style: TextStyle(
                fontFamily: 'JetBrains Mono',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: ink,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ] else ...[
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: accent,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: accent.withValues(alpha: 0.22),
                  spreadRadius: 4,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            words.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: accent,
            ),
          ),
        ),
      ],
    );

    Widget avatar(double size) => ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: photo != null
            ? AppNetworkImage(url: photo)
            : ColoredBox(
                color: accent.withValues(alpha: 0.2),
                child: Icon(
                  symbolByName(node.icon ?? 'two_wheeler'),
                  color: accent,
                  size: size * 0.45,
                ),
              ),
      ),
    );

    final Widget body;
    switch (style.look) {
      case StudioLiveLook.pill:
        body = Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.25),
                shape: BoxShape.circle,
              ),
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
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
                    f.pillTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: ink,
                    ),
                  ),
                  if (f.pillLine.isNotEmpty)
                    Text(
                      f.pillLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: soft),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(19),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(
                    symbolByName(node.icon ?? 'two_wheeler'),
                    size: 18,
                    color: const Color(0xFF10201A),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    l10n.studioTrackButton,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF10201A),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      case StudioLiveLook.ring:
        final share = ((f.stage - 0.3) / 4).clamp(0.08, 1.0);
        body = Row(
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 80,
                    height: 80,
                    child: CircularProgressIndicator(
                      value: share,
                      strokeWidth: 5,
                      backgroundColor: track,
                      color: accent,
                    ),
                  ),
                  avatar(66),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  kicker('${l10n.liveLookLive} · ${f.state}'),
                  const SizedBox(height: 5),
                  Text(
                    f.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                  Text(
                    '${f.line} · ${l10n.liveLookStep(f.stage)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: soft),
                  ),
                ],
              ),
            ),
            minutes(short: true),
          ],
        );
      case StudioLiveLook.hero || StudioLiveLook.steps:
        final steps = style.look == StudioLiveLook.steps;
        final top = Row(
          children: [
            if (steps) ...[avatar(46), const SizedBox(width: 12)],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  kicker(f.state),
                  const SizedBox(height: 6),
                  Text(
                    f.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                  if (!steps)
                    Text(
                      f.line,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: soft),
                    ),
                ],
              ),
            ),
            minutes(short: false),
            if (!steps && node.icon != null) ...[
              const SizedBox(width: 12),
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: AppIcon(
                  symbolByName(node.icon),
                  size: 22,
                  color: onAccent,
                  filled: true,
                ),
              ),
            ],
          ],
        );
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            top,
            const SizedBox(height: 12),
            if (steps)
              _Steps(
                stages: f.stages,
                stage: f.stage,
                accent: accent,
                ink: ink,
                soft: soft,
                track: track,
              )
            else
              _Segments(stage: f.stage, accent: accent, track: track),
          ],
        );
    }
    return Semantics(
      button: true,
      label: '${f.state}, ${f.title}',
      child: GestureDetector(
        key: ValueKey('studio-live-look-${node.id}'),
        behavior: HitTestBehavior.opaque,
        onTap: () => context.push(f.location),
        child: body,
      ),
    );
  }
}

/// The four stages as segments: the ones done filled, the one now partly.
class _Segments extends StatelessWidget {
  const _Segments({
    required this.stage,
    required this.accent,
    required this.track,
  });

  final int stage;
  final Color accent;
  final Color track;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < 4; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: SizedBox(
                height: 4,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ColoredBox(color: i < stage - 1 ? accent : track),
                    ),
                    if (i == stage - 1)
                      FractionallySizedBox(
                        widthFactor: 0.7,
                        heightFactor: 1,
                        alignment: AlignmentDirectional.centerStart,
                        child: ColoredBox(color: accent),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// The four stages as dots on a line, each named, the one now ringed.
class _Steps extends StatelessWidget {
  const _Steps({
    required this.stages,
    required this.stage,
    required this.accent,
    required this.ink,
    required this.soft,
    required this.track,
  });

  final List<String> stages;
  final int stage;
  final Color accent;
  final Color ink;
  final Color soft;
  final Color track;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < stages.length; i++)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 16,
                  child: Stack(
                    clipBehavior: Clip.none,
                    alignment: AlignmentDirectional.centerStart,
                    children: [
                      if (i < stages.length - 1)
                        PositionedDirectional(
                          start: 7,
                          end: -7,
                          child: Container(
                            height: 2,
                            color: i < stage - 1 ? accent : track,
                          ),
                        ),
                      Container(
                        width: i == stage - 1 ? 14 : 10,
                        height: i == stage - 1 ? 14 : 10,
                        decoration: BoxDecoration(
                          color: i < stage ? accent : Colors.transparent,
                          shape: BoxShape.circle,
                          border: i < stage
                              ? null
                              : Border.all(color: track, width: 2),
                          boxShadow: i == stage - 1
                              ? [
                                  BoxShadow(
                                    color: accent.withValues(alpha: 0.3),
                                    spreadRadius: 4,
                                  ),
                                ]
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  stages[i],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: i == stage - 1
                        ? FontWeight.w800
                        : FontWeight.w600,
                    color: i == stage - 1 ? ink : soft,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
