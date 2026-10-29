import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 105.2 What the ride screens share: a ride's stage in words, its stages,
/// the vehicle types' icons.

String rideStatusLabel(AppLocalizations l10n, RideStatus status) =>
    switch (status) {
      RideStatus.scheduled => l10n.rideScheduled,
      RideStatus.searching => l10n.rideSearching,
      RideStatus.accepted => l10n.rideAccepted,
      RideStatus.arrived => l10n.rideArrived,
      RideStatus.inProgress => l10n.rideInProgress,
      RideStatus.completed => l10n.rideCompleted,
      RideStatus.cancelled => l10n.rideCancelled,
      RideStatus.noDriver => l10n.rideNoDriver,
    };

String riderCancelReasonLabel(
  AppLocalizations l10n,
  RiderCancelReason reason,
) => switch (reason) {
  RiderCancelReason.changedPlans => l10n.rideReasonChangedPlans,
  RiderCancelReason.driverLate => l10n.rideReasonDriverLate,
  RiderCancelReason.driverAsked => l10n.rideReasonDriverAsked,
  RiderCancelReason.wrongPlace => l10n.rideReasonWrongPlace,
  RiderCancelReason.other => l10n.rideReasonOther,
};

/// The icons the company can give its vehicle types (VEHICLE_ICONS in
/// platform/web/src/lib/rides/forms.ts).
const _vehicleIcons = <String, IconData>{
  'directions_car': Symbols.directions_car_rounded,
  'local_taxi': Symbols.local_taxi_rounded,
  'airport_shuttle': Symbols.airport_shuttle_rounded,
  'two_wheeler': Symbols.two_wheeler_rounded,
  'electric_car': Symbols.electric_car_rounded,
  'accessible': Symbols.accessible_rounded,
  'directions_bus': Symbols.directions_bus_rounded,
  'electric_rickshaw': Symbols.electric_rickshaw_rounded,
};

IconData vehicleIcon(String? name) => _vehicleIcons[name] ?? AppIcons.car;

/// Shares a ride's page with someone who follows it. Replaced in tests.
final shareRideProvider = Provider<Future<void> Function(String text)>(
  (ref) =>
      (text) async => SharePlus.instance.share(ShareParams(text: text)),
);

/// The stage as a coloured label.
class RideStatusChip extends StatelessWidget {
  const RideStatusChip({super.key, required this.status});

  final RideStatus status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (status) {
      RideStatus.completed => (p.successSoft, p.success),
      RideStatus.cancelled || RideStatus.noDriver => (p.surfaceMuted, p.danger),
      RideStatus.scheduled || RideStatus.searching => (p.accentSoft, p.text),
      _ => (p.primarySoft, p.onPrimarySoft),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          rideStatusLabel(context.l10n, status),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: fg,
          ),
        ),
      ),
    );
  }
}

/// The stages a ride went through, oldest first.
class RideStagesTimeline extends StatelessWidget {
  const RideStagesTimeline({super.key, required this.stages});

  final List<RideStage> stages;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < stages.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: i == stages.length - 1 ? p.primary : p.border,
                      shape: BoxShape.circle,
                    ),
                  ),
                  if (i < stages.length - 1)
                    Container(width: 2, height: 36, color: p.border),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rideStatusLabel(l10n, stages[i].status),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      Text(
                        dayAndTime(stages[i].at),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                      if (stages[i].note != null)
                        Text(
                          stages[i].note!,
                          style: TextStyle(fontSize: 13, color: p.textBody),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// From where to where, in two lines.
class RideRoute extends StatelessWidget {
  const RideRoute({
    super.key,
    required this.pickup,
    required this.dropoff,
    this.color,
    this.iconColor,
  });

  final Place pickup;
  final Place dropoff;

  /// On a coloured card: its colours instead of the page's.
  final Color? color;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget line(IconData icon, String text) => Row(
      children: [
        AppIcon(icon, size: 18, color: iconColor ?? p.textSecondary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: color ?? p.textBody),
          ),
        ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        line(AppIcons.myLocation, pickup.address),
        const SizedBox(height: 4),
        line(AppIcons.location, dropoff.address),
      ],
    );
  }
}

/// A ride in the rider's list.
class RideTile extends StatelessWidget {
  const RideTile({super.key, required this.ride, required this.onTap});

  final Ride ride;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(
                vehicleIcon(ride.vehicleTypeIcon),
                size: 22,
                color: p.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  ride.vehicleTypeName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: RideStatusChip(status: ride.status)),
            ],
          ),
          const SizedBox(height: 8),
          RideRoute(pickup: ride.pickup, dropoff: ride.dropoff),
          const SizedBox(height: 8),
          Text(
            [
              ride.reference,
              dayAndTime(ride.scheduledAt ?? ride.createdAt),
              if (ride.fareFormatted.isNotEmpty) ride.fareFormatted,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// A ride in the driver's lists.
class DriverRideTile extends StatelessWidget {
  const DriverRideTile({super.key, required this.ride, required this.onTap});

  final DriverRide ride;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  ride.reference,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: RideStatusChip(status: ride.status)),
            ],
          ),
          const SizedBox(height: 8),
          RideRoute(pickup: ride.pickup, dropoff: ride.dropoff),
          const SizedBox(height: 8),
          Text(
            [
              if (ride.riderName.isNotEmpty) ride.riderName,
              ride.timeline.isEmpty ? null : clockTime(ride.timeline.last.at),
              ride.fareFormatted,
            ].whereType<String>().join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}
