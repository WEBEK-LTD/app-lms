import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/bus_library_providers.dart';
import '../data/school_providers.dart';
import '../widgets/bus_map.dart';
import '../widgets/school_widgets.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 113.10 The school bus in the app: a family's view of their child's bus
/// (each trip, its stops on the map and the bus live while it runs, how
/// soon, and how the child was marked), and the bus's crew's: their routes,
/// a trip started, the students marked on and off, the trip ended. The
/// crew's screens are reached from `BusDutyTile` (the Classroom tab and
/// Account today; 113.3's Staff tab can take the same tile).

String busTripLabel(BuildContext context, BusTrip trip) =>
    trip == BusTrip.morning
    ? context.l10n.busMorningTrip
    : context.l10n.busAfternoonTrip;

/// Asks again every [busRefreshEvery] while the screen is open.
mixin _Refreshing<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  Timer? _timer;

  void refresh();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(busRefreshEvery, (_) {
      if (mounted) refresh();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

// Families

class StudentBusScreen extends ConsumerWidget {
  const StudentBusScreen({super.key, this.student});

  /// The student a notification is about.
  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: studioBar(
      context,
      AppBar(leading: appBarBack(context), title: Text(context.l10n.schoolBus)),
    ),
    body: SafeArea(
      top: false,
      child: StudentGate(
        wanted: student,
        builder: (context, me, s) => _StudentBus(student: s),
      ),
    ),
  );
}

class _StudentBus extends ConsumerStatefulWidget {
  const _StudentBus({required this.student});

  final SchoolStudent student;

  @override
  ConsumerState<_StudentBus> createState() => _StudentBusState();
}

class _StudentBusState extends ConsumerState<_StudentBus>
    with _Refreshing<_StudentBus> {
  @override
  void refresh() => ref.invalidate(studentBusProvider(widget.student.id));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final id = widget.student.id;
    final config = ref.watch(schoolConfigProvider) ?? const SchoolConfig();
    return switch (ref.watch(studentBusProvider(id))) {
      AsyncValue(value: final trips?) when trips.isEmpty => MessageView(
        key: const ValueKey('bus-none'),
        icon: AppIcons.bus,
        title: l10n.busNoTrips(widget.student.name),
        message: l10n.busNoTripsMessage(widget.student.name),
      ),
      AsyncValue(value: final trips?) => RefreshIndicator(
        onRefresh: () async => refresh(),
        child: ListView(
          key: const ValueKey('student-bus'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            for (final trip in trips) ...[
              _TripCard(trip: trip, config: config),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(error: e, onRetry: refresh),
      _ => const LoadingView(),
    };
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip, required this.config});

  final StudentBusTrip trip;
  final SchoolConfig config;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final run = trip.run;
    final running = run?.status == BusRunStatus.running;
    final bus = run?.bus;
    final lines = <String>[
      if (run == null)
        l10n.busNotStarted
      else if (!running)
        l10n.busEnded
      else if (bus == null)
        l10n.busWaitingPosition
      else if (run.etaMinutes != null)
        l10n.busEtaMinutes(run.etaMinutes!, trip.stop.name),
      if (run != null)
        switch (run.student.status) {
          BusMarkStatus.boarded => l10n.busOnSince(
            run.student.boardedAt == null
                ? ''
                : clockTime(run.student.boardedAt!),
          ),
          BusMarkStatus.off => l10n.busGotOffAt(
            run.student.offAt == null ? '' : clockTime(run.student.offAt!),
          ),
          BusMarkStatus.absent => l10n.busAbsentToday,
          null => '',
        },
    ].where((l) => l.isNotEmpty).toList();
    return AppCard(
      key: ValueKey('bus-trip-${trip.trip.name}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.bus, size: 22, color: p.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  busTripLabel(context, trip.trip),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              if (running)
                SchoolPill(label: l10n.busOnTheWay, tone: PillTone.good)
              else if (run != null)
                SchoolPill(label: l10n.busDone),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            l10n.busRouteLine(trip.routeName, trip.plate),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          Text(
            l10n.busYourStop(trip.stop.name, trip.stop.time ?? ''),
            style: TextStyle(fontSize: 14, color: p.text),
          ),
          if (running && config.tilesUrl != null) ...[
            const SizedBox(height: 12),
            BusMap(
              config: config,
              stops: trip.stops,
              bus: bus == null ? null : (lat: bus.lat, lng: bus.lng),
              mine: trip.stop.id,
            ),
          ],
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                line,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
            ),
          const SizedBox(height: 10),
          Text(
            l10n.busStops,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: p.textSecondary,
            ),
          ),
          BusStopList(stops: trip.stops, mine: trip.stop.id),
        ],
      ),
    );
  }
}

// The bus's crew

/// The entry to the crew's screens, for whoever drives or supervises one
/// of the school's buses; nothing for anyone else.
class BusDutyTile extends ConsumerWidget {
  const BusDutyTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(isBusCrewProvider)) return const SizedBox.shrink();
    return SettingsTile(
      key: const ValueKey('bus-duty'),
      icon: AppIcons.bus,
      title: context.l10n.busDutyTitle,
      subtitle: context.l10n.busDutySubtitle,
      onTap: () => context.push(Paths.busDuty),
    );
  }
}

class BusDutyScreen extends ConsumerStatefulWidget {
  const BusDutyScreen({super.key});

  @override
  ConsumerState<BusDutyScreen> createState() => _BusDutyScreenState();
}

class _BusDutyScreenState extends ConsumerState<BusDutyScreen> {
  ({int route, BusTrip trip})? _starting;

  Future<void> _start(BusCrewRoute route, BusTrip trip) async {
    setState(() => _starting = (route: route.id, trip: trip));
    try {
      final run = await ref
          .read(yallappApiProvider)
          .startBusRun(route.id, trip);
      ref.invalidate(busCrewRoutesProvider);
      if (mounted) unawaited(context.push(Paths.busRun(run.id)));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _starting = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(leading: appBarBack(context), title: Text(l10n.busDutyTitle)),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(busCrewRoutesProvider)) {
          AsyncValue(value: final routes?) when routes.isEmpty => MessageView(
            icon: AppIcons.bus,
            title: l10n.busNoRoutes,
            message: l10n.busNoRoutesMessage,
          ),
          AsyncValue(value: final routes?) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(busCrewRoutesProvider),
            child: ListView(
              key: const ValueKey('bus-duty-routes'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                for (final route in routes) ...[
                  AppCard(
                    key: ValueKey('bus-route-${route.id}'),
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                l10n.busRouteLine(route.name, route.plate),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                            ),
                            SchoolPill(
                              label: route.driver
                                  ? l10n.busDriver
                                  : l10n.busSupervisor,
                            ),
                          ],
                        ),
                        for (final trip in route.trips)
                          _CrewTripRow(
                            route: route,
                            trip: trip,
                            starting:
                                _starting?.route == route.id &&
                                _starting?.trip == trip.trip,
                            onStart: () => _start(route, trip.trip),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(busCrewRoutesProvider),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _CrewTripRow extends StatelessWidget {
  const _CrewTripRow({
    required this.route,
    required this.trip,
    required this.starting,
    required this.onStart,
  });

  final BusCrewRoute route;
  final BusCrewTrip trip;
  final bool starting;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final run = trip.run;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  busTripLabel(context, trip.trip),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                Text(
                  run == null
                      ? l10n.busStudents(trip.riders)
                      : run.status == BusRunStatus.running
                      ? l10n.busOnTheWay
                      : l10n.busDone,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          if (run != null)
            OutlinedButton(
              key: ValueKey('bus-open-${trip.trip.name}'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(88, 40)),
              onPressed: () => context.push(Paths.busRun(run.id)),
              child: Text(l10n.busOpenTrip),
            )
          else if (route.drives)
            FilledButton(
              key: ValueKey('bus-start-${trip.trip.name}'),
              style: FilledButton.styleFrom(minimumSize: const Size(88, 40)),
              onPressed: starting || trip.stops == 0 ? null : onStart,
              child: starting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.busStart),
            )
          else
            Flexible(
              child: Text(
                l10n.busWaitingDriver,
                textAlign: TextAlign.end,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
        ],
      ),
    );
  }
}

/// A trip as its crew sees it: the students of each stop marked on, off or
/// absent; the driver's phone sends the bus's position while it is open.
class BusRunScreen extends ConsumerStatefulWidget {
  const BusRunScreen({super.key, required this.runId});

  final int runId;

  @override
  ConsumerState<BusRunScreen> createState() => _BusRunScreenState();
}

class _BusRunScreenState extends ConsumerState<BusRunScreen>
    with _Refreshing<BusRunScreen> {
  BusLocationSharer? _sharer;
  int? _marking;
  bool _ending = false;

  @override
  void refresh() => ref.invalidate(busRunProvider(widget.runId));

  @override
  void dispose() {
    // Sharing stops with the screen.
    _sharer?.stop();
    super.dispose();
  }

  Future<void> _mark(int studentId, BusMarkStatus status) async {
    setState(() => _marking = studentId);
    try {
      await ref
          .read(yallappApiProvider)
          .markBusRider(widget.runId, studentId, status);
      refresh();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _marking = null);
    }
  }

  Future<void> _end() async {
    final l10n = context.l10n;
    final sure = await confirmAction(
      context,
      title: l10n.busEndTitle,
      message: l10n.busEndMessage,
      confirmLabel: l10n.busEndTrip,
    );
    if (!sure || !mounted) return;
    setState(() => _ending = true);
    try {
      await ref.read(yallappApiProvider).endBusRun(widget.runId);
      _sharer?.stop();
      refresh();
      ref.invalidate(busCrewRoutesProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _ending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(schoolConfigProvider) ?? const SchoolConfig();
    final async = ref.watch(busRunProvider(widget.runId));
    final run = async.value;
    final sharer = ref.watch(busLocationSharerProvider);
    _sharer = sharer;
    if (run != null && run.drives && run.running) {
      sharer.start(run.id);
    } else if (run != null) {
      sharer.stop();
    }
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(
            run == null
                ? l10n.busDutyTitle
                : l10n.busTripTitle(
                    run.routeName,
                    busTripLabel(context, run.trip),
                  ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final run?) => RefreshIndicator(
            onRefresh: () async => refresh(),
            child: ListView(
              key: const ValueKey('bus-run'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Text(
                  l10n.busCounts(run.boarded, run.off, run.absent, run.riders),
                  key: const ValueKey('bus-counts'),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 6),
                if (!run.running)
                  Text(
                    l10n.busEnded,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  )
                else if (run.drives)
                  ValueListenableBuilder<bool>(
                    valueListenable: sharer.failed,
                    builder: (context, failed, _) => Text(
                      failed ? l10n.busLocationOff : l10n.busSharing,
                      key: const ValueKey('bus-sharing'),
                      style: TextStyle(
                        fontSize: 13,
                        color: failed ? p.danger : p.textSecondary,
                      ),
                    ),
                  ),
                if (run.running && config.tilesUrl != null) ...[
                  const SizedBox(height: 12),
                  ValueListenableBuilder(
                    valueListenable: sharer.position,
                    builder: (context, here, _) => BusMap(
                      config: config,
                      stops: [for (final s in run.stops) s.stop],
                      bus:
                          here ??
                          (run.bus == null
                              ? null
                              : (lat: run.bus!.lat, lng: run.bus!.lng)),
                    ),
                  ),
                ],
                for (final stop in run.stops) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      AppIcon(
                        stop.stop.passed
                            ? AppIcons.checkCircle
                            : AppIcons.location,
                        size: 20,
                        color: stop.stop.passed ? p.success : p.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          stop.stop.name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      if (stop.stop.time != null)
                        Text(
                          stop.stop.time!,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                    ],
                  ),
                  for (final rider in stop.riders)
                    _RiderRow(
                      rider: rider,
                      enabled: run.running && _marking != rider.student.id,
                      onMark: (status) => _mark(rider.student.id, status),
                    ),
                ],
                if (run.drives && run.running) ...[
                  const SizedBox(height: 24),
                  FilledButton(
                    key: const ValueKey('bus-end'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                    onPressed: _ending ? null : _end,
                    child: Text(l10n.busEndTrip),
                  ),
                ],
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(error: e, onRetry: refresh),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _RiderRow extends StatelessWidget {
  const _RiderRow({
    required this.rider,
    required this.enabled,
    required this.onMark,
  });

  final BusRider rider;
  final bool enabled;
  final ValueChanged<BusMarkStatus> onMark;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = rider.mark.status;
    Widget chip(BusMarkStatus value, String label) => ChoiceChip(
      key: ValueKey('mark-${rider.student.id}-${value.name}'),
      label: Text(label),
      selected: status == value,
      onSelected: enabled && status != value ? (_) => onMark(value) : null,
      visualDensity: VisualDensity.compact,
    );
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 28, top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            rider.student.name,
            style: TextStyle(fontSize: 14, color: p.text),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              chip(BusMarkStatus.boarded, l10n.busMarkOn),
              chip(BusMarkStatus.off, l10n.busMarkOff),
              chip(BusMarkStatus.absent, l10n.busMarkAbsent),
            ],
          ),
        ],
      ),
    );
  }
}
