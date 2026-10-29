import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../food/widgets/food_widgets.dart' show AmountRow;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/rides_providers.dart';
import '../widgets/ride_widgets.dart';

/// 105.2 The driver's screen: online or offline, the ride offered now (with
/// the time left to take it), their rides and what they made. While online
/// the phone sends its position as long as this screen is open; nothing
/// runs in the background. Drivers who also ride switch back to the
/// riders' screens from here. Anyone else sees that it is for drivers only.
class DriverScreen extends ConsumerStatefulWidget {
  const DriverScreen({super.key});

  @override
  ConsumerState<DriverScreen> createState() => _DriverScreenState();
}

class _DriverScreenState extends ConsumerState<DriverScreen> {
  DriverLocationSharer? _sharer;
  Timer? _ticker;
  int _ticks = 0;
  int _tab = 0;
  bool _switching = false;
  bool _answering = false;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    // Sharing and asking for offers stop with the screen.
    _ticker?.cancel();
    _sharer?.stop();
    super.dispose();
  }

  void _tick() {
    if (!mounted || !ref.read(isDriverProvider)) return;
    _ticks++;
    final me = ref.read(driverProfileProvider).value;
    final free = me != null && me.online && me.activeRideId == null;
    if (free && _ticks % driverOfferEvery.inSeconds == 0) {
      ref.invalidate(driverOfferProvider);
    }
    // The offer's countdown.
    if (ref.read(driverOfferProvider).value != null) setState(() {});
  }

  Future<void> _setOnline(bool online) async {
    setState(() => _switching = true);
    try {
      await ref.read(yallappApiProvider).setDriverOnline(online);
      ref
        ..invalidate(driverProfileProvider)
        ..invalidate(driverOfferProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _switching = false);
    }
  }

  Future<void> _accept(DriverRide offer) async {
    setState(() => _answering = true);
    try {
      final ride = await ref
          .read(yallappApiProvider)
          .acceptDriverRide(offer.id);
      if (!mounted) return;
      ref
        ..invalidate(driverOfferProvider)
        ..invalidate(driverProfileProvider)
        ..invalidate(activeDriverRidesProvider);
      unawaited(context.push(Paths.driverRide(ride.id)));
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(context, e.message);
      ref.invalidate(driverOfferProvider);
    } finally {
      if (mounted) setState(() => _answering = false);
    }
  }

  Future<void> _decline(DriverRide offer) async {
    setState(() => _answering = true);
    try {
      await ref.read(yallappApiProvider).declineDriverRide(offer.id);
    } on ApiException {
      // Gone already: the next offer comes on its own.
    } finally {
      if (mounted) {
        ref.invalidate(driverOfferProvider);
        setState(() => _answering = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(
      title: l10n.driverTitle,
      // The drivers' app has no riders' screens to go back to.
      trailing: ref.watch(driverAppProvider)
          ? null
          : TextButton.icon(
              key: const ValueKey('driver-rider-view'),
              onPressed: () => context.go(Paths.home),
              icon: AppIcon(AppIcons.swap, size: 18, color: p.link),
              label: Text(l10n.riderView),
              style: TextButton.styleFrom(foregroundColor: p.link),
            ),
    );
    if (!ref.watch(isDriverProvider)) {
      // Nothing is asked of the server for someone who isn't a driver.
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.car,
                  title: l10n.notDriverTitle,
                  message: l10n.notDriverMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    final profile = ref.watch(driverProfileProvider);
    final me = profile.value;
    final online = me?.online ?? false;
    final sharer = ref.watch(driverLocationSharerProvider);
    _sharer = sharer;
    if (online) {
      sharer.start();
    } else {
      sharer.stop();
    }
    final offer = online && me?.activeRideId == null
        ? ref.watch(driverOfferProvider).value
        : null;
    final tabs = [l10n.driverCurrent, l10n.driverDone, l10n.driverEarnings];
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            switch (profile) {
              AsyncValue(value: final me?) => Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: AppCard(
                  padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              me.name,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: p.text,
                              ),
                            ),
                            Text(
                              me.online
                                  ? l10n.driverToday(
                                      me.ridesToday,
                                      me.earnedToday,
                                    )
                                  : l10n.driverOfflineHint,
                              key: const ValueKey('driver-today'),
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        l10n.driverOnline,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                      Switch(
                        key: const ValueKey('driver-online'),
                        value: me.online,
                        onChanged: _switching ? null : _setOnline,
                      ),
                    ],
                  ),
                ),
              ),
              AsyncValue(error: final e?) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(driverProfileProvider),
                ),
              ),
              _ => const SizedBox(height: 72),
            },
            if (online)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text(
                  offer == null && me?.activeRideId == null
                      ? l10n.driverWaiting
                      : l10n.driverSharing,
                  key: const ValueKey('driver-waiting'),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ),
            if (offer != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: _OfferCard(
                  offer: offer,
                  busy: _answering,
                  onAccept: () => _accept(offer),
                  onDecline: () => _decline(offer),
                ),
              ),
            if (me?.activeRideId != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: PrimaryButton(
                  key: const ValueKey('driver-open-ride'),
                  label: l10n.driverOpenRide,
                  icon: AppIcons.ride,
                  onPressed: () =>
                      context.push(Paths.driverRide(me!.activeRideId!)),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SegmentedTabs(
                labels: tabs,
                selected: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: switch (_tab) {
                0 => const _RideList(
                  key: ValueKey('driver-rides-0'),
                  scope: DriverRideScope.active,
                ),
                1 => const _RideList(
                  key: ValueKey('driver-rides-1'),
                  scope: DriverRideScope.done,
                ),
                _ => const _Earnings(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// The ride offered now: where from and to, the fare, how far the pickup
/// is, and the seconds left to take it.
class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.offer,
    required this.busy,
    required this.onAccept,
    required this.onDecline,
  });

  final DriverRide offer;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final left = offer.offerExpiresAt
        ?.difference(DateTime.now())
        .inSeconds
        .clamp(0, 600);
    return AppCard(
      key: const ValueKey('driver-offer'),
      padding: const EdgeInsets.all(16),
      color: p.primarySoft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.ride, size: 24, color: p.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.driverOffer,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              if (left != null)
                Text(
                  l10n.driverSecondsLeft(left),
                  key: const ValueKey('driver-offer-left'),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: left <= 5 ? p.danger : p.text,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          RideRoute(pickup: offer.pickup, dropoff: offer.dropoff),
          const SizedBox(height: 8),
          Text(
            [
              if (offer.pickupKm != null)
                l10n.driverPickupKm(offer.pickupKm!.toStringAsFixed(1)),
              l10n.rideTrip(offer.distanceKm.toStringAsFixed(1), offer.minutes),
              offer.payment == PaymentMethod.cash ? l10n.payCash : l10n.payCard,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            offer.fareFormatted,
            key: const ValueKey('driver-offer-fare'),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SecondaryButton(
                  key: const ValueKey('driver-decline'),
                  label: l10n.driverDecline,
                  onPressed: busy ? null : onDecline,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: PrimaryButton(
                  key: const ValueKey('driver-accept'),
                  label: l10n.driverAccept,
                  icon: AppIcons.check,
                  loading: busy,
                  onPressed: onAccept,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RideList extends ConsumerWidget {
  const _RideList({super.key, required this.scope});

  final DriverRideScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final NotifierProvider<PagedController<DriverRide>, PagedState<DriverRide>>
    provider = scope == DriverRideScope.active
        ? activeDriverRidesProvider
        : doneDriverRidesProvider;
    final state = ref.watch(provider);
    final notifier = ref.read(provider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingRides,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          children: [
            MessageView(
              icon: AppIcons.car,
              title: l10n.driverNoRides,
              message: l10n.driverNoRidesMessage,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => DriverRideTile(
            ride: state.items[i],
            onTap: () => context.push(Paths.driverRide(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}

/// What the driver made today, this week or this month.
class _Earnings extends ConsumerStatefulWidget {
  const _Earnings();

  @override
  ConsumerState<_Earnings> createState() => _EarningsState();
}

class _EarningsState extends ConsumerState<_Earnings> {
  EarningsPeriod _period = EarningsPeriod.today;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(driverEarningsProvider(_period));
    return ListView(
      key: const ValueKey('driver-earnings'),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        SegmentedTabs(
          labels: [l10n.earningsToday, l10n.earningsWeek, l10n.earningsMonth],
          selected: _period.index,
          radio: true,
          height: 38,
          onChanged: (i) => setState(() => _period = EarningsPeriod.values[i]),
        ),
        const SizedBox(height: 12),
        switch (async) {
          AsyncValue(value: final e?) => AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AmountRow(label: l10n.earningsRides, value: '${e.rides}'),
                AmountRow(label: l10n.earningsFares, value: e.faresFormatted),
                AmountRow(label: l10n.earningsCash, value: e.cashFormatted),
                AmountRow(
                  label: l10n.earningsCompany,
                  value: e.companyShareFormatted,
                ),
                const Divider(height: 16),
                AmountRow(
                  label: l10n.earningsEarned,
                  value: e.earnedFormatted,
                  strong: true,
                ),
                if (e.days.length > 1) ...[
                  const Divider(height: 24),
                  for (final d in e.days)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              d.date,
                              style: TextStyle(fontSize: 14, color: p.text),
                            ),
                          ),
                          Text(
                            '${l10n.earningsRidesCount(d.rides)} · ${d.earned}',
                            style: TextStyle(
                              fontSize: 14,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
          AsyncValue(error: final err?) => ErrorView(
            error: err,
            onRetry: () => ref.invalidate(driverEarningsProvider(_period)),
          ),
          _ => const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          ),
        },
      ],
    );
  }
}
