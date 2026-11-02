import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/widgets/delivery_map.dart';
import '../../delivery/widgets/delivery_widgets.dart' show CallButton, PlaceRow;
import '../../food/widgets/food_widgets.dart' show AmountRow;
import '../../taxi/data/taxi_providers.dart';
import '../../taxi/widgets/navigate_button.dart';
import '../../taxi/widgets/taxi_map.dart';
import '../data/rides_providers.dart';
import '../widgets/ride_widgets.dart';

/// How often a ride that isn't over is asked about on the driver's screen.
const driverRideEvery = Duration(seconds: 10);

/// 105.2 A ride as its driver works it: the rider, the pickup and drop-off
/// with directions (112.1 on the map, with "Navigate" in Google Maps, Apple
/// Maps or Waze), the fare and the cash to collect; then, in order,
/// arrived, started (with the rider's code when the company asks for it)
/// and ended. Cancelling before it starts: the rider didn't come (after
/// the company's wait) or the driver can't make it.
class DriverRideScreen extends ConsumerStatefulWidget {
  const DriverRideScreen({super.key, required this.rideId});

  final int rideId;

  @override
  ConsumerState<DriverRideScreen> createState() => _DriverRideScreenState();
}

class _DriverRideScreenState extends ConsumerState<DriverRideScreen> {
  Timer? _timer;
  bool _busy = false;
  final _sheet = DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(driverRideEvery, (_) {
      final current = ref.read(driverRideProvider(widget.rideId)).value;
      if (current == null || current.status.active) {
        ref.invalidate(driverRideProvider(widget.rideId));
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _sheet.dispose();
    super.dispose();
  }

  Future<void> _move(
    DriverStep step, {
    String? pin,
    DriverCancelReason? reason,
  }) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final ride = await ref
          .read(yallappApiProvider)
          .moveDriverRide(widget.rideId, step, pin: pin, reason: reason);
      if (!mounted) return;
      ref
        ..invalidate(driverRideProvider(widget.rideId))
        ..invalidate(driverProfileProvider)
        ..invalidate(activeDriverRidesProvider)
        ..invalidate(doneDriverRidesProvider);
      if (step == DriverStep.completed) {
        showMessage(
          context,
          ride.collectFormatted != null
              ? l10n.driverCollect(ride.collectFormatted!)
              : l10n.driverCardRide,
        );
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() async {
    if (!ref.read(ridesConfigProvider).pin) {
      await _move(DriverStep.inProgress);
      return;
    }
    final pin = await showDialog<String>(
      context: context,
      builder: (_) => const _PinDialog(),
    );
    if (pin == null || !mounted) return;
    await _move(DriverStep.inProgress, pin: pin);
  }

  Future<void> _cancel(DriverRide ride) async {
    final l10n = context.l10n;
    final config = ref.read(ridesConfigProvider);
    final since = ride.waitingSince;
    final noShow =
        ride.status == RideStatus.arrived &&
        since != null &&
        DateTime.now().difference(since).inMinutes >= config.noShowMinutes;
    final reason = await showDialog<DriverCancelReason>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.driverCancelTitle),
        content: Text(
          noShow
              ? l10n.driverCancelNoShowHint
              : l10n.driverNoShowAfter(config.noShowMinutes),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(l10n.keepIt),
          ),
          TextButton(
            key: const ValueKey('driver-cancel-other'),
            onPressed: () =>
                Navigator.of(context).pop(DriverCancelReason.other),
            child: Text(l10n.driverCantMakeIt),
          ),
          if (noShow)
            FilledButton(
              key: const ValueKey('driver-cancel-no-show'),
              onPressed: () =>
                  Navigator.of(context).pop(DriverCancelReason.riderNoShow),
              child: Text(l10n.driverNoShow),
            ),
        ],
      ),
    );
    if (reason == null || !mounted) return;
    await _move(DriverStep.cancelled, reason: reason);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(driverRideProvider(widget.rideId));
    final ride = async.value;
    final (DriverStep? next, String? label) = switch (ride?.status) {
      RideStatus.accepted => (DriverStep.arrived, l10n.driverArrived),
      RideStatus.arrived => (DriverStep.inProgress, l10n.driverStart),
      RideStatus.inProgress => (DriverStep.completed, l10n.driverEnd),
      _ => (null, null),
    };
    final bar = ride == null || next == null
        ? null
        : BottomActionBar(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PrimaryButton(
                  key: const ValueKey('driver-next'),
                  label: label!,
                  icon: switch (next) {
                    DriverStep.arrived => AppIcons.location,
                    DriverStep.inProgress => AppIcons.play,
                    _ => AppIcons.flag,
                  },
                  loading: _busy,
                  onPressed: () =>
                      next == DriverStep.inProgress ? _start() : _move(next),
                ),
                if (ride.status != RideStatus.inProgress) ...[
                  const SizedBox(height: 4),
                  TextButton(
                    key: const ValueKey('driver-cancel'),
                    onPressed: _busy ? null : () => _cancel(ride),
                    child: Text(l10n.rideCancel),
                  ),
                ],
              ],
            ),
          );
    final taxi = ref.watch(taxiConfigProvider);
    if (taxi != null && ride != null) return _mapLayout(taxi, ride, bar);
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(
          ride == null ? l10n.driverTitle : l10n.rideHeading(ride.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final r?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(driverRideProvider(widget.rideId)),
          child: _DriverRideView(ride: r),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(driverRideProvider(widget.rideId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: bar,
    );
  }

  /// 112.1 On the map, like Uber's driver app: the driver's car, the way to
  /// the pickup (dotted) or the trip's road to the drop-off, and the ride
  /// in a sheet with "Navigate" in the phone's maps app.
  Widget _mapLayout(TaxiConfig taxi, DriverRide ride, Widget? bar) {
    final l10n = context.l10n;
    final writer = ref.watch(driverLiveWriterProvider);
    final pickup = ride.pickup.located
        ? (lat: ride.pickup.lat!, lng: ride.pickup.lng!)
        : null;
    final dropoff = ride.dropoff.located
        ? (lat: ride.dropoff.lat!, lng: ride.dropoff.lng!)
        : null;
    final onTrip = ride.status == RideStatus.inProgress;
    final trip = pickup != null && dropoff != null
        ? ref
                  .watch(
                    routeLineProvider((
                      from: roundSpot(pickup),
                      to: roundSpot(dropoff),
                    )),
                  )
                  .value ??
              [pickup, dropoff]
        : const <TaxiSpot>[];
    final height = MediaQuery.sizeOf(context).height;
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: ValueListenableBuilder<NearbyTaxi?>(
              valueListenable: writer.position,
              builder: (context, car, _) {
                final at = car == null ? null : (lat: car.lat, lng: car.lng);
                final target = onTrip ? dropoff : pickup;
                double round(double v) => (v * 1000).roundToDouble() / 1000;
                return TaxiMapView(
                  map: taxi.map,
                  focus: [
                    if (at != null && ride.status.active)
                      (lat: round(at.lat), lng: round(at.lng)),
                    if (!onTrip) ?pickup,
                    ?dropoff,
                  ],
                  car: ride.status.active ? car : null,
                  pins: [
                    if (pickup != null)
                      TaxiPin(
                        TaxiPinKind.from,
                        pickup.lat,
                        pickup.lng,
                        label: l10n.taxiFrom(ride.pickup.address),
                      ),
                    if (dropoff != null)
                      TaxiPin(
                        TaxiPinKind.to,
                        dropoff.lat,
                        dropoff.lng,
                        label: l10n.taxiTo(ride.dropoff.address),
                      ),
                  ],
                  route: trip,
                  approach: at != null && target != null && ride.status.active
                      ? [at, target]
                      : const [],
                  padding: EdgeInsets.only(top: 88, bottom: height * 0.45),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: SizedBox(
                height: 48,
                child: NavigationToolbar(
                  leading: const AppBackButton(),
                  middle: TaxiChip(label: l10n.rideHeading(ride.reference)),
                ),
              ),
            ),
          ),
          DraggableScrollableSheet(
            controller: _sheet,
            initialChildSize: 0.45,
            minChildSize: 0.2,
            maxChildSize: 0.92,
            builder: (context, controller) => TaxiSheet(
              controller: _sheet,
              child: _DriverRideView(
                ride: ride,
                controller: controller,
                onMap: true,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: bar,
    );
  }
}

class _DriverRideView extends ConsumerWidget {
  const _DriverRideView({
    required this.ride,
    this.controller,
    this.onMap = false,
  });

  final DriverRide ride;

  /// 112.1 In the sheet over the map: its scrolling, and no map of its own.
  final ScrollController? controller;
  final bool onMap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(ridesConfigProvider);
    final r = ride;
    final toPickup =
        r.status == RideStatus.accepted || r.status == RideStatus.arrived;
    final pins = [
      if (r.pickup.located)
        MapPin(MapPinKind.pickup, r.pickup.lat!, r.pickup.lng!),
      if (r.dropoff.located)
        MapPin(MapPinKind.dropoff, r.dropoff.lat!, r.dropoff.lng!),
    ];
    TextStyle label() => TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    // 112.1 Where to drive now: the pickup, then the drop-off.
    final target = !r.status.active
        ? null
        : toPickup
        ? r.pickup
        : (r.status == RideStatus.inProgress ? r.dropoff : null);
    return ListView(
      key: const ValueKey('driver-ride-view'),
      controller: controller,
      padding: EdgeInsets.fromLTRB(20, onMap ? 26 : 12, 20, 24),
      children: [
        Text(
          rideStatusLabel(l10n, r.status),
          key: const ValueKey('driver-ride-status'),
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        if (r.status == RideStatus.arrived && r.waitingSince != null)
          Text(
            l10n.driverWaitingSince(clockTime(r.waitingSince!)),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        if (r.status == RideStatus.completed)
          Text(
            r.collectFormatted != null
                ? l10n.driverCollect(r.collectFormatted!)
                : l10n.driverCardRide,
            key: const ValueKey('driver-ride-collect'),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: p.success,
            ),
          ),
        if (target != null && target.located) ...[
          const SizedBox(height: 12),
          NavigateButton(
            key: const ValueKey('driver-navigate'),
            lat: target.lat!,
            lng: target.lng!,
            label: toPickup ? l10n.navigateToPickup : l10n.navigateToDropoff,
          ),
        ],
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              AppIcon(AppIcons.account, size: 26, color: p.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.driverRider, style: label()),
                    Text(
                      r.riderName,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
              ),
              if (r.riderPhone != null && r.status.active)
                CallButton(phone: r.riderPhone!, label: l10n.rideCall),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (config.tilesUrl != null && pins.isNotEmpty && !onMap) ...[
          DeliveryMap(
            key: const ValueKey('driver-ride-map'),
            config: config.mapConfig,
            pins: pins,
          ),
          const SizedBox(height: 12),
        ],
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PlaceRow(
                label: l10n.ridePickup,
                place: r.pickup,
                icon: AppIcons.myLocation,
                directions: toPickup,
              ),
              const SizedBox(height: 10),
              PlaceRow(
                label: l10n.rideDropoff,
                place: r.dropoff,
                icon: AppIcons.location,
                directions: r.status == RideStatus.inProgress,
              ),
              const Divider(height: 24),
              AmountRow(
                label: r.isFinal ? l10n.rideFare : l10n.rideFareEstimate,
                value: r.fareFormatted,
                strong: true,
              ),
              Text(
                [
                  if (r.vehicleTypeName.isNotEmpty) r.vehicleTypeName,
                  l10n.rideTrip(r.distanceKm.toStringAsFixed(1), r.minutes),
                  r.payment == PaymentMethod.cash
                      ? l10n.ridePayCash
                      : l10n.payCard,
                ].join(' · '),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              if (r.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.rideNotes, style: label()),
                Text(r.notes!, style: TextStyle(fontSize: 15, color: p.text)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.shipmentStages,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        const SizedBox(height: 10),
        RideStagesTimeline(stages: r.timeline),
      ],
    );
  }
}

/// Asks for the rider's 4-digit code.
class _PinDialog extends StatefulWidget {
  const _PinDialog();

  @override
  State<_PinDialog> createState() => _PinDialogState();
}

class _PinDialogState extends State<_PinDialog> {
  final _pin = TextEditingController();

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.driverPinTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.driverPinHint),
          const SizedBox(height: 10),
          TextField(
            key: const ValueKey('driver-pin'),
            controller: _pin,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 4,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, letterSpacing: 8),
            decoration: const InputDecoration(counterText: ''),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          key: const ValueKey('driver-pin-ok'),
          onPressed: () {
            if (_pin.text.length == 4) Navigator.of(context).pop(_pin.text);
          },
          child: Text(l10n.driverStart),
        ),
      ],
    );
  }
}
