import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../shipments/shipments_screen.dart' show PersonChoice;
import '../studio/studio_widgets.dart';

Tone rideTone(String status) => switch (status) {
  'searching' => Tone.warn,
  'in_progress' || 'completed' => Tone.good,
  'assigned' || 'arrived' || 'scheduled' => Tone.info,
  'cancelled' || 'no_driver' => Tone.bad,
  _ => Tone.neutral,
};

/// A ride's tag: its status, with how long it has searched.
String rideTag(BuildContext context, Ride r) => r.searchingMinutes == null
    ? r.statusLabel
    : '${r.statusLabel} · ${context.l10n.minutesShort(r.searchingMinutes!)}';

/// 125 Rides and taxi (the Rides board): free drivers, rides on the way and
/// searching; a searching ride is given to a driver or cancelled.
class RidesScreen extends ConsumerStatefulWidget {
  const RidesScreen({super.key, this.initialFilter});

  final String? initialFilter;

  @override
  ConsumerState<RidesScreen> createState() => _RidesScreenState();
}

class _RidesScreenState extends ConsumerState<RidesScreen> {
  static const filters = ['now', 'scheduled', 'done', 'problems'];
  late int _filter = filters.indexOf(widget.initialFilter ?? '').clamp(0, 3);
  int _version = 0;
  bool _searching = false;
  String? _query;
  Map<String, int> _counts = const {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final api = ref.watch(apiProvider);
    final filter = filters[_filter];
    String n(String key) => context.number(_counts[key] ?? 0);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            StudioHeader(
              title: l10n.ridesTitle,
              actions: [
                IconButton(
                  tooltip: l10n.searchAction,
                  icon: const Icon(AppIcons.search),
                  onPressed: () => setState(() => _searching = !_searching),
                ),
                HeaderLink(
                  icon: AppIcons.drivers,
                  label: l10n.driversTitle,
                  onPressed: () => context.push(Paths.drivers),
                ),
              ],
            ),
            if (_searching)
              SearchBarField(
                hint: l10n.searchRidesHint,
                onSubmitted: (q) => setState(() {
                  _query = q;
                  _version++;
                }),
                onClose: () => setState(() {
                  _searching = false;
                  if (_query != null) _version++;
                  _query = null;
                }),
              ),
            CountRow(
              tiles: [
                CountTile(
                  value: n('free'),
                  label: l10n.freeDrivers,
                  tone: Tone.good,
                ),
                CountTile(value: n('on_ride'), label: l10n.onARide),
                CountTile(
                  value: n('searching'),
                  label: l10n.searchingLabel,
                  tone: Tone.warn,
                ),
              ],
            ),
            FilterTabs(
              gap: 18,
              labels: [
                l10n.filterNow,
                l10n.filterScheduled,
                l10n.filterDone,
                l10n.filterProblems,
              ],
              selected: _filter,
              onSelected: (i) => setState(() => _filter = i),
            ),
            Expanded(
              child: PagedList<Ride>(
                key: ValueKey('${app.id}-$filter-$_query-$_version'),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                spacing: 12,
                load: (page) async {
                  final result = await api.rides(
                    app.id,
                    filter: filter,
                    query: _query,
                    page: page,
                  );
                  if (mounted && result.counts.isNotEmpty) {
                    setState(() => _counts = result.counts);
                  }
                  return result;
                },
                empty: EmptyState(
                  icon: AppIcons.rides,
                  title: l10n.noRides,
                  text: l10n.noRidesText,
                ),
                itemBuilder: (context, r) => RideCard(
                  ride: r,
                  onChanged: () => setState(() => _version++),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RideCard extends ConsumerWidget {
  const RideCard({super.key, required this.ride, required this.onChanged});

  final Ride ride;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final r = ride;
    final driver = r.driver;
    return Box(
      onTap: () async {
        await context.push(Paths.ride(r.id));
        onChanged();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                r.reference,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Tag(rideTag(context, r), tone: rideTone(r.status)),
              ),
              const Spacer(),
              if (r.vehicleType != null)
                Text(
                  r.vehicleType!,
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (driver == null) ...[
            IconLine(AppIcons.origin, isolate(r.pickup.name)),
            const SizedBox(height: 8),
            IconLine(
              AppIcons.location,
              [
                isolate(r.dropoff.name),
                if (r.distanceKm != null) km(context, r.distanceKm!),
              ].join(' · '),
            ),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                style: const TextStyle(fontSize: 14),
                children: [
                  TextSpan(
                    text: isolate(r.quoted.formatted),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(
                    text:
                        ' ${l10n.rideQuoted} · ${isolate(r.riderName)} · ${r.paymentLabel}',
                  ),
                ],
              ),
            ),
            if (r.scheduledFor != null) ...[
              const SizedBox(height: 4),
              Text(
                l10n.rideScheduledFor(context.dateTime(r.scheduledFor!)),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ] else ...[
            Text(
              [
                driver.name,
                if (driver.plate != null) driver.plate!,
                if (driver.vehicle != null) driver.vehicle!,
              ].map(isolate).join(' · '),
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 6),
            Text(
              [
                '${isolate(r.pickup.name)} → ${isolate(r.dropoff.name)}',
                if (r.eta != null) l10n.arrivesAt(context.time(r.eta!)),
              ].join(' · '),
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
          ],
          if (r.cancellable || r.givable || driver?.phone != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (r.cancellable && driver == null)
                  SmallButton(
                    label: l10n.cancelRide,
                    onPressed: () async {
                      if (await cancelRide(context, ref, r) != null) {
                        onChanged();
                      }
                    },
                  ),
                if (r.givable)
                  SmallButton(
                    label: l10n.giveToDriver,
                    filled: true,
                    onPressed: () async {
                      if (await giveToDriver(context, ref, r) != null) {
                        onChanged();
                      }
                    },
                  ),
                if (driver?.phone != null)
                  SmallButton(
                    label: l10n.callDriver,
                    icon: AppIcons.phone,
                    quiet: true,
                    onPressed: () => callNumber(context, ref, driver!.phone),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Asks, then cancels the ride.
Future<RideDetail?> cancelRide(
  BuildContext context,
  WidgetRef ref,
  Ride ride,
) async {
  final l10n = context.l10n;
  final ok = await confirm(
    context,
    title: l10n.cancelTitle(ride.reference),
    text: l10n.cancelRideText,
    action: l10n.cancelRide,
    destructive: true,
  );
  if (!ok || !context.mounted) return null;
  try {
    final after = await ref
        .read(apiProvider)
        .cancelRide(ref.read(appIdProvider), ride.id);
    if (context.mounted) {
      showMessage(context, l10n.rideCancelled(ride.reference));
    }
    return after;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// What a driver is doing, in a few words.
String driverState(BuildContext context, Driver d) {
  final l10n = context.l10n;
  return switch (d.state) {
    'free' => l10n.driverFree,
    'on_ride' => l10n.driverOnRide,
    'suspended' => l10n.driverSuspended,
    _ => l10n.driverOffline,
  };
}

/// "Give R-551 to": free drivers, closest and the same vehicle type first.
Future<RideDetail?> giveToDriver(
  BuildContext context,
  WidgetRef ref,
  Ride ride,
) async {
  final appId = ref.read(appIdProvider);
  final api = ref.read(apiProvider);
  final chosen = await showFootSheet<Driver>(
    context,
    (sheet) => _DriverPicker(
      ride: ride,
      load: () => api.drivers(appId, rideId: ride.id),
    ),
  );
  if (chosen == null || !context.mounted) return null;
  try {
    final after = await api.assignRide(appId, ride.id, chosen.id);
    if (context.mounted) {
      showMessage(context, context.l10n.rideGiven(ride.reference, chosen.name));
    }
    return after;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

class _DriverPicker extends StatefulWidget {
  const _DriverPicker({required this.ride, required this.load});

  final Ride ride;
  final Future<List<Driver>> Function() load;

  @override
  State<_DriverPicker> createState() => _DriverPickerState();
}

class _DriverPickerState extends State<_DriverPicker> {
  late Future<List<Driver>> _drivers = widget.load();
  Driver? _chosen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.7,
      ),
      child: FutureBuilder<List<Driver>>(
        future: _drivers,
        builder: (context, snapshot) {
          final header = [
            Semantics(
              header: true,
              child: Text(
                l10n.giveTo(widget.ride.reference),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.closestSameType,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
            const SizedBox(height: 10),
          ];
          if (snapshot.hasError) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...header,
                SizedBox(
                  height: 220,
                  child: ErrorState(
                    error: snapshot.error!,
                    onRetry: () => setState(() => _drivers = widget.load()),
                  ),
                ),
              ],
            );
          }
          if (!snapshot.hasData) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [...header, const LoadingState()],
            );
          }
          final free = [
            for (final d in snapshot.data!)
              if (d.state == 'free') d,
          ];
          final chosen = _chosen ?? free.firstOrNull;
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ...header,
              if (free.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(l10n.noFreeDrivers),
                )
              else
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final d in free)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: PersonChoice(
                            initials: d.initials.isEmpty
                                ? initialsOf(d.name)
                                : d.initials,
                            name: d.name,
                            line: [
                              if (d.distanceKm != null)
                                kmAway(context, d.distanceKm!),
                              ?d.plate,
                              ?d.type,
                            ].map(isolate).join(' · '),
                            dot: d.sameType ? c.success : c.warning,
                            chosen: d.id == chosen?.id,
                            onTap: () => setState(() => _chosen = d),
                          ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              BigButton(
                label: chosen == null
                    ? l10n.giveToDriver
                    : l10n.giveItTo(chosen.name.split(' ').first),
                onPressed: chosen == null
                    ? null
                    : () => Navigator.pop(context, chosen),
              ),
            ],
          );
        },
      ),
    );
  }
}

final driversProvider = FutureProvider.autoDispose<List<Driver>>(
  (ref) => ref.watch(apiProvider).drivers(ref.watch(appIdProvider)),
);

/// 125 Every driver: free first, their car, a call.
class DriversScreen extends ConsumerWidget {
  const DriversScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.driversTitle)),
      body: AsyncBody(
        value: ref.watch(driversProvider),
        onRetry: () => ref.invalidate(driversProvider),
        builder: (items) => items.isEmpty
            ? EmptyState(icon: AppIcons.drivers, title: l10n.noDrivers)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(driversProvider.future),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    for (final d in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Box(
                          padding: const EdgeInsets.all(12),
                          radius: 16,
                          child: Row(
                            children: [
                              Initials(
                                d.initials.isEmpty
                                    ? initialsOf(d.name)
                                    : d.initials,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      d.name,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      [
                                        driverState(context, d),
                                        ?d.plate,
                                        ?d.model,
                                      ].map(isolate).join(' · '),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: c.ink2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (d.phone != null)
                                IconButton(
                                  tooltip: l10n.call,
                                  icon: const Icon(AppIcons.phone),
                                  onPressed: () =>
                                      callNumber(context, ref, d.phone),
                                ),
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: switch (d.state) {
                                    'free' => c.success,
                                    'on_ride' => c.warning,
                                    'suspended' => c.danger,
                                    _ => c.outline,
                                  },
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
