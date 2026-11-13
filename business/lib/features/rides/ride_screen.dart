import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../studio/studio_widgets.dart';
import 'rides_screen.dart';

final rideProvider = FutureProvider.autoDispose.family<RideDetail, String>(
  (ref, id) => ref.watch(apiProvider).ride(ref.watch(appIdProvider), id),
);

/// 125 A ride: from, to, the rider, the price, the driver, its history;
/// give it to a driver or cancel it.
class RideScreen extends ConsumerWidget {
  const RideScreen({super.key, required this.rideId});

  final String rideId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(rideProvider(rideId));
    final r = value.value?.ride;
    Widget? foot;
    if (r != null && (r.givable || r.cancellable)) {
      foot = FootPanel(
        child: Row(
          children: [
            if (r.cancellable)
              Expanded(
                child: BigButton(
                  label: l10n.cancelRide,
                  danger: true,
                  onPressed: () async {
                    if (await cancelRide(context, ref, r) != null) {
                      ref.invalidate(rideProvider(rideId));
                    }
                  },
                ),
              ),
            if (r.cancellable && r.givable) const SizedBox(width: 10),
            if (r.givable)
              Expanded(
                flex: 2,
                child: BigButton(
                  label: l10n.giveToDriver,
                  onPressed: () async {
                    if (await giveToDriver(context, ref, r) != null) {
                      ref.invalidate(rideProvider(rideId));
                    }
                  },
                ),
              ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(r?.reference ?? ''),
        actions: [
          if (r != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 16),
              child: Center(
                child: Tag(
                  rideTag(context, r),
                  tone: rideTone(r.status),
                  big: true,
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: foot,
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(rideProvider(rideId)),
        builder: (d) {
          final ride = d.ride;
          final driver = ride.driver;
          return RefreshIndicator(
            onRefresh: () => ref.refresh(rideProvider(rideId).future),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Box(
                  radius: 18,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      IconLine(
                        AppIcons.origin,
                        [
                          ride.pickup.name,
                          if (ride.pickup.address != ride.pickup.name)
                            ride.pickup.address,
                        ].where((t) => t.isNotEmpty).map(isolate).join(' · '),
                      ),
                      const SizedBox(height: 8),
                      IconLine(
                        AppIcons.location,
                        [
                          isolate(ride.dropoff.name),
                          if (ride.distanceKm != null)
                            km(context, ride.distanceKm!),
                        ].join(' · '),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        l10n.riderLabel,
                        style: TextStyle(fontSize: 12, color: c.ink2),
                      ),
                      Text(
                        ride.riderName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 14),
                          children: [
                            TextSpan(
                              text: isolate(ride.quoted.formatted),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            TextSpan(
                              text:
                                  ' ${l10n.rideQuoted} · ${ride.paymentLabel}',
                            ),
                          ],
                        ),
                      ),
                      if (ride.finalPrice != null)
                        Text(
                          '${l10n.finalPrice}: ${isolate(ride.finalPrice!.formatted)}',
                          style: const TextStyle(fontSize: 14),
                        ),
                      if (ride.scheduledFor != null)
                        Text(
                          l10n.rideScheduledFor(
                            context.dateTime(ride.scheduledFor!),
                          ),
                          style: TextStyle(fontSize: 13, color: c.ink2),
                        ),
                    ],
                  ),
                ),
                if (driver != null) ...[
                  const SizedBox(height: 12),
                  Box(
                    radius: 18,
                    child: Row(
                      children: [
                        Initials(initialsOf(driver.name)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                driver.name,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                [
                                  ?driver.plate,
                                  ?driver.vehicle,
                                  if (ride.eta != null)
                                    l10n.arrivesAt(context.time(ride.eta!)),
                                ].map(isolate).join(' · '),
                                style: TextStyle(fontSize: 13, color: c.ink2),
                              ),
                            ],
                          ),
                        ),
                        if (driver.phone != null)
                          IconButton(
                            tooltip: l10n.callDriver,
                            icon: const Icon(AppIcons.phone),
                            onPressed: () =>
                                callNumber(context, ref, driver.phone),
                          ),
                      ],
                    ),
                  ),
                ],
                if (d.timeline.isNotEmpty) ...[
                  SectionTitle(l10n.historyTitle),
                  TimelineList(entries: d.timeline),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
