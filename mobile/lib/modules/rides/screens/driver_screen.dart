import 'dart:async';
import 'dart:math' as math;

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
import '../../delivery/data/delivery_providers.dart' show locatorProvider;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../../taxi/data/taxi_providers.dart';
import '../../taxi/widgets/taxi_map.dart';
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

  /// 105.9 A taxi app's map: the offers' whole times, the sheet, where the
  /// driver is before going online.
  final _offerTotals = <int, int>{};
  final _sheet = DraggableScrollableController();
  TaxiSpot? _here;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    WidgetsBinding.instance.addPostFrameCallback((_) => _locateStart());
  }

  @override
  void dispose() {
    // Sharing and asking for offers stop with the screen.
    _ticker?.cancel();
    _sharer
      ?..onPosition = null
      ..stop();
    _sheet.dispose();
    super.dispose();
  }

  /// 105.9 The driver's car on the map before their first position is sent.
  Future<void> _locateStart() async {
    if (!mounted ||
        ref.read(taxiConfigProvider) == null ||
        !ref.read(isDriverProvider)) {
      return;
    }
    final p = (await ref.read(locatorProvider).current()).position;
    if (mounted && p != null) setState(() => _here = (lat: p.lat, lng: p.lng));
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
      // 105.9 Off the riders' map.
      if (!online && ref.read(taxiConfigProvider) != null) {
        unawaited(ref.read(driverLiveWriterProvider).clear());
      }
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
    final taxi = ref.watch(taxiConfigProvider);
    final now = DateTime.now();
    final left = offer?.offerExpiresAt?.difference(now).inSeconds.clamp(0, 600);
    final offerCard = offer == null
        ? null
        : _OfferCard(
            offer: offer,
            busy: _answering,
            onAccept: () => _accept(offer),
            onDecline: () => _decline(offer),
            // 105.9 The whole time to take it, for the taxi app's ring.
            total: left == null
                ? null
                : _offerTotals.putIfAbsent(offer.id, () => math.max(left, 1)),
            circular: taxi != null,
          );
    final waiting = online
        ? Text(
            offer == null && me?.activeRideId == null
                ? l10n.driverWaiting
                : l10n.driverSharing,
            key: const ValueKey('driver-waiting'),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          )
        : null;
    final openRide = me?.activeRideId == null
        ? null
        : PrimaryButton(
            key: const ValueKey('driver-open-ride'),
            label: l10n.driverOpenRide,
            icon: AppIcons.ride,
            onPressed: () => context.push(Paths.driverRide(me!.activeRideId!)),
          );
    final tabBar = SegmentedTabs(
      labels: tabs,
      selected: _tab,
      onChanged: (i) => setState(() => _tab = i),
    );
    Widget list([ScrollController? controller]) => switch (_tab) {
      0 => _RideList(
        key: const ValueKey('driver-rides-0'),
        scope: DriverRideScope.active,
        controller: controller,
      ),
      1 => _RideList(
        key: const ValueKey('driver-rides-1'),
        scope: DriverRideScope.done,
        controller: controller,
      ),
      _ => _Earnings(controller: controller),
    };
    if (taxi != null) {
      return _taxiLayout(
        taxi,
        sharer,
        profile,
        offer,
        offerCard,
        openRide,
        tabBar,
        list,
      );
    }
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
            if (waiting != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: waiting,
              ),
            if (offerCard != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: offerCard,
              ),
            if (openRide != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: openRide,
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: tabBar,
            ),
            const SizedBox(height: 8),
            Expanded(child: list()),
          ],
        ),
      ),
    );
  }
}

extension on _DriverScreenState {
  /// 105.9 A taxi app: the map with the driver's car (and an offer's pickup,
  /// drop-off and way there), "Available for requests" on top, the offer as
  /// a card over the map, the rest in a sheet. The driver's positions also
  /// go to the company's live database while this screen is open.
  Widget _taxiLayout(
    TaxiConfig taxi,
    DriverLocationSharer sharer,
    AsyncValue<DriverProfile> profile,
    DriverRide? offer,
    Widget? offerCard,
    Widget? openRide,
    Widget tabBar,
    Widget Function([ScrollController? controller]) list,
  ) {
    final p = context.palette;
    final l10n = context.l10n;
    final me = profile.value;
    final writer = ref.watch(driverLiveWriterProvider);
    // The live session lives while the screen is open; a new offer there
    // means asking for it now.
    ref.watch(taxiLiveProvider);
    ref.listen(
      liveOfferNodeProvider,
      (_, _) => ref.invalidate(driverOfferProvider),
    );
    sharer.onPosition = (lat, lng) => writer.write(
      lat,
      lng,
      vehicleTypeId: me?.vehicleTypeId,
      free: me?.activeRideId == null && openRide == null,
    );
    final pickup = offer != null && offer.pickup.located
        ? (lat: offer.pickup.lat!, lng: offer.pickup.lng!)
        : null;
    final dropoff = offer != null && offer.dropoff.located
        ? (lat: offer.dropoff.lat!, lng: offer.dropoff.lng!)
        : null;
    final height = MediaQuery.sizeOf(context).height;
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: ValueListenableBuilder<NearbyTaxi?>(
              valueListenable: writer.position,
              builder: (context, position, _) {
                final here = _here;
                final car =
                    position ??
                    (here == null
                        ? null
                        : NearbyTaxi(
                            driverKey: 'me',
                            lat: here.lat,
                            lng: here.lng,
                          ));
                final at = car == null ? null : (lat: car.lat, lng: car.lng);
                double round(double v) => (v * 1000).roundToDouble() / 1000;
                return TaxiMapView(
                  map: taxi.map,
                  focus: [
                    if (at != null) (lat: round(at.lat), lng: round(at.lng)),
                    ?pickup,
                    ?dropoff,
                  ],
                  car: car,
                  pins: [
                    if (pickup != null)
                      TaxiPin(
                        TaxiPinKind.from,
                        pickup.lat,
                        pickup.lng,
                        label: l10n.taxiFrom(offer!.pickup.address),
                      ),
                    if (dropoff != null)
                      TaxiPin(
                        TaxiPinKind.to,
                        dropoff.lat,
                        dropoff.lng,
                        label: l10n.taxiTo(offer!.dropoff.address),
                      ),
                  ],
                  route: pickup != null && dropoff != null
                      ? [pickup, dropoff]
                      : const [],
                  approach: at != null && pickup != null
                      ? [at, pickup]
                      : const [],
                  padding: EdgeInsets.only(
                    top: 88,
                    bottom: height * (offerCard != null ? 0.5 : 0.4),
                  ),
                );
              },
            ),
          ),
          DraggableScrollableSheet(
            controller: _sheet,
            initialChildSize: 0.4,
            minChildSize: 0.2,
            maxChildSize: 0.92,
            builder: (context, controller) => TaxiSheet(
              controller: _sheet,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 26),
                  if (me != null && me.online)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                      child: Text(
                        '${me.name} · '
                        '${l10n.driverToday(me.ridesToday, me.earnedToday)}',
                        key: const ValueKey('driver-today'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: tabBar,
                  ),
                  const SizedBox(height: 8),
                  Expanded(child: list(controller)),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  if (!ref.watch(driverAppProvider)) ...[
                    SquareIconButton(
                      key: const ValueKey('driver-rider-view'),
                      icon: AppIcons.swap,
                      label: l10n.riderView,
                      bordered: false,
                      onPressed: () => context.go(Paths.home),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: switch (profile) {
                      AsyncValue(value: final me?) => AppCard(
                        padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: me.online ? p.success : p.textTertiary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l10n.taxiAvailable,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: p.text,
                                    ),
                                  ),
                                  Text(
                                    !me.online
                                        ? l10n.driverOfflineHint
                                        : offer == null &&
                                              me.activeRideId == null
                                        ? l10n.driverWaiting
                                        : l10n.driverSharing,
                                    key: const ValueKey('driver-waiting'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: p.textSecondary,
                                    ),
                                  ),
                                ],
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
                      AsyncValue(error: final e?) => AppCard(
                        padding: const EdgeInsets.all(8),
                        child: ErrorView(
                          error: e,
                          onRetry: () => ref.invalidate(driverProfileProvider),
                        ),
                      ),
                      _ => const SizedBox(height: 56),
                    },
                  ),
                ],
              ),
            ),
          ),
          if (offerCard ?? openRide case final card?)
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: SafeArea(top: false, child: card),
            ),
        ],
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
    this.total,
    this.circular = false,
  });

  final DriverRide offer;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  /// 105.9 The seconds it had when it came, and the time left as a ring
  /// (the taxi app's map).
  final int? total;
  final bool circular;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final left = offer.offerExpiresAt
        ?.difference(DateTime.now())
        .inSeconds
        .clamp(0, 600);
    // On the soft brand colour: words in the colours made for it.
    final strong = p.onPrimarySoft;
    final muted = p.onPrimaryMuted;
    return AppCard(
      key: const ValueKey('driver-offer'),
      padding: const EdgeInsets.all(16),
      color: p.primarySoft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.ride, size: 24, color: strong),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.driverOffer,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: strong,
                  ),
                ),
              ),
              if (left != null && circular)
                SizedBox(
                  width: 52,
                  height: 52,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CircularProgressIndicator(
                        value: left / math.max(total ?? left, 1),
                        strokeWidth: 4,
                        color: left <= 5 ? p.danger : strong,
                        backgroundColor: muted.withValues(alpha: 0.25),
                      ),
                      Center(
                        child: Text(
                          l10n.driverSecondsLeft(left),
                          key: const ValueKey('driver-offer-left'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: left <= 5 ? p.danger : strong,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else if (left != null)
                Text(
                  l10n.driverSecondsLeft(left),
                  key: const ValueKey('driver-offer-left'),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: left <= 5 ? p.danger : strong,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          RideRoute(
            pickup: offer.pickup,
            dropoff: offer.dropoff,
            color: strong,
            iconColor: muted,
          ),
          const SizedBox(height: 8),
          Text(
            [
              if (offer.pickupKm != null)
                l10n.driverPickupKm(offer.pickupKm!.toStringAsFixed(1)),
              l10n.rideTrip(offer.distanceKm.toStringAsFixed(1), offer.minutes),
              offer.payment == PaymentMethod.cash
                  ? l10n.ridePayCash
                  : l10n.payCard,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: muted),
          ),
          const SizedBox(height: 4),
          Text(
            offer.fareFormatted,
            key: const ValueKey('driver-offer-fare'),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: strong,
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
  const _RideList({super.key, required this.scope, this.controller});

  final DriverRideScope scope;

  /// 105.9 The taxi app's sheet's scrolling.
  final ScrollController? controller;

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
          controller: controller,
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
          controller: controller,
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
  const _Earnings({this.controller});

  /// 105.9 The taxi app's sheet's scrolling.
  final ScrollController? controller;

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
      controller: widget.controller,
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
