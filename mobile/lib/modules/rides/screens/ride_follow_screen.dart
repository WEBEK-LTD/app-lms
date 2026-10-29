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
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/widgets/delivery_map.dart';
import '../../delivery/widgets/delivery_widgets.dart'
    show CallButton, PlaceRow, pointUrl;
import '../../food/widgets/food_widgets.dart' show AmountRow, StarPicker;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/rides_providers.dart';
import '../widgets/ride_widgets.dart';

/// How often a ride that isn't over is asked about while its screen is open.
const rideFollowEvery = Duration(seconds: 5);

/// 105.2 Following a ride: its stage, the driver and their car, where the
/// driver is, the code to tell them, sharing the trip, the emergency
/// button; cancelling before it starts, paying a card ride, rating it.
class RideFollowScreen extends ConsumerStatefulWidget {
  const RideFollowScreen({super.key, required this.rideId});

  final int rideId;

  @override
  ConsumerState<RideFollowScreen> createState() => _RideFollowScreenState();
}

class _RideFollowScreenState extends ConsumerState<RideFollowScreen> {
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(rideFollowEvery, (_) {
      final current = ref.read(rideProvider(widget.rideId)).value;
      if (current == null || current.status.active) {
        ref.invalidate(rideProvider(widget.rideId));
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _reload() => ref
    ..invalidate(rideProvider(widget.rideId))
    ..invalidate(myRidesProvider)
    ..invalidate(activeRideProvider);

  Future<void> _pay() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final url = await ref.read(yallappApiProvider).payMyRide(widget.rideId);
      if (!mounted) return;
      final paid = await context.push<bool>(
        Paths.web,
        extra: WebPageArgs(
          url: url,
          title: l10n.checkout,
          completesOn: isOrderReceived,
        ),
      );
      if (!mounted) return;
      if (paid == true) showMessage(context, l10n.ridePaid);
      _reload();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel(Ride ride) async {
    final l10n = context.l10n;
    final config = ref.read(ridesConfigProvider);
    final reason = await showDialog<RiderCancelReason>(
      context: context,
      builder: (context) => _CancelDialog(
        fee: ride.driver != null ? config.cancelFeeFormatted : null,
        freeMinutes: config.freeCancelMinutes,
      ),
    );
    if (reason == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final cancelled = await ref
          .read(yallappApiProvider)
          .cancelMyRide(widget.rideId, reason: reason);
      if (!mounted) return;
      final fee = cancelled.cancellation?.feeFormatted;
      showMessage(
        context,
        fee == null ? l10n.rideCancelledToast : l10n.rideCancelledFee(fee),
      );
      _reload();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(rideProvider(widget.rideId));
    final ride = async.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          ride == null ? l10n.tabMyRides : l10n.rideHeading(ride.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final r?) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(rideProvider(widget.rideId)),
          child: _RideView(ride: r, onRated: _reload),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(rideProvider(widget.rideId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: ride == null
          ? null
          : ride.toPay
          ? BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('ride-pay'),
                label: l10n.payNow,
                icon: AppIcons.card,
                loading: _busy,
                onPressed: _pay,
              ),
            )
          : ride.status == RideStatus.noDriver
          ? BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('ride-again'),
                label: l10n.rideTryAgain,
                icon: AppIcons.ride,
                onPressed: () => context.go(Paths.ride),
              ),
            )
          : ride.status.cancellable
          ? BottomActionBar(
              child: TextButton(
                key: const ValueKey('ride-cancel'),
                onPressed: _busy ? null : () => _cancel(ride),
                child: Text(l10n.rideCancel),
              ),
            )
          : null,
    );
  }
}

class _RideView extends ConsumerWidget {
  const _RideView({required this.ride, required this.onRated});

  final Ride ride;
  final VoidCallback onRated;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(ridesConfigProvider);
    final ios = ref.watch(appEnvironmentProvider).isIos;
    final r = ride;
    final driver = r.driver;
    final position = r.driverLocation;
    final pins = [
      if (r.pickup.located && r.status != RideStatus.inProgress)
        MapPin(MapPinKind.pickup, r.pickup.lat!, r.pickup.lng!),
      if (r.dropoff.located)
        MapPin(MapPinKind.dropoff, r.dropoff.lat!, r.dropoff.lng!),
      if (position != null && r.status.withDriver)
        MapPin(MapPinKind.courier, position.lat, position.lng),
    ];
    TextStyle label() => TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    TextStyle value() => TextStyle(fontSize: 15, color: p.text);
    final subtitle = switch (r.status) {
      RideStatus.scheduled when r.scheduledAt != null => l10n.rideScheduledFor(
        dayAndTime(r.scheduledAt!),
      ),
      RideStatus.searching => l10n.rideSearchingHint,
      RideStatus.accepted when r.pickupMinutes != null => l10n.ridePickupIn(
        r.pickupMinutes!,
      ),
      RideStatus.arrived => l10n.rideArrivedHint,
      RideStatus.noDriver => l10n.rideNoDriverHint,
      _ => dayAndTime(r.createdAt),
    };
    return ListView(
      key: const ValueKey('ride-view'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          rideStatusLabel(l10n, r.status),
          key: const ValueKey('ride-status'),
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        Text(subtitle, style: TextStyle(fontSize: 14, color: p.textSecondary)),
        if (r.status == RideStatus.searching) ...[
          const SizedBox(height: 12),
          const LinearProgressIndicator(),
        ],
        // The code the rider tells the driver once in the car.
        if (r.pin != null && r.status.withDriver) ...[
          const SizedBox(height: 16),
          AppCard(
            key: const ValueKey('ride-pin'),
            padding: const EdgeInsets.all(16),
            color: p.accentSoft,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.ridePin, style: label()),
                      Text(
                        l10n.ridePinHint,
                        style: TextStyle(fontSize: 13, color: p.textBody),
                      ),
                    ],
                  ),
                ),
                Text(
                  r.pin!,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 4,
                    color: p.text,
                  ),
                ),
              ],
            ),
          ),
        ],
        if (driver != null) ...[
          const SizedBox(height: 16),
          AppCard(
            key: const ValueKey('ride-driver'),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    ClipOval(
                      child: driver.photoUrl != null
                          ? AppNetworkImage(
                              url: driver.photoUrl,
                              width: 48,
                              height: 48,
                            )
                          : Container(
                              width: 48,
                              height: 48,
                              color: p.placeholderFor(1),
                              alignment: Alignment.center,
                              child: AppIcon(
                                AppIcons.account,
                                size: 24,
                                color: p.text,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            driver.name,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                          if (driver.rating != null)
                            Row(
                              children: [
                                AppIcon(
                                  AppIcons.star,
                                  size: 16,
                                  filled: true,
                                  color: p.star,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  driver.rating!.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: p.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    if (driver.phone != null && r.status.withDriver)
                      CallButton(phone: driver.phone!, label: l10n.rideCall),
                  ],
                ),
                if (driver.car.isNotEmpty || driver.plate != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      AppIcon(
                        vehicleIcon(r.vehicleTypeIcon),
                        size: 22,
                        color: p.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          driver.car,
                          style: TextStyle(fontSize: 15, color: p.text),
                        ),
                      ),
                      if (driver.plate != null)
                        DecoratedBox(
                          decoration: BoxDecoration(
                            border: Border.all(color: p.border),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            child: Text(
                              driver.plate!,
                              key: const ValueKey('ride-plate'),
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: p.text,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
                if (r.status.withDriver) ...[
                  const SizedBox(height: 12),
                  if (config.tilesUrl != null && pins.isNotEmpty)
                    DeliveryMap(
                      key: const ValueKey('ride-map'),
                      config: config.mapConfig,
                      pins: pins,
                    ),
                  if (position != null)
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l10n.rideDriverSeen(clockTime(position.updatedAt)),
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => ref.read(openExternalProvider)(
                            pointUrl(position.lat, position.lng, ios: ios),
                          ),
                          icon: AppIcon(AppIcons.map, size: 18, color: p.link),
                          label: Text(l10n.trackingOpenMap),
                          style: TextButton.styleFrom(foregroundColor: p.link),
                        ),
                      ],
                    )
                  else
                    Text(
                      l10n.trackingNoPosition,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                ],
              ],
            ),
          ),
        ],
        // Sharing the trip and the emergency button while it isn't over.
        if (r.status.withDriver) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              if (r.shareUrl != null)
                Expanded(
                  child: OutlinedButton.icon(
                    key: const ValueKey('ride-share'),
                    onPressed: () => ref.read(shareRideProvider)(
                      l10n.rideShareText(r.shareUrl!),
                    ),
                    icon: AppIcon(AppIcons.share, size: 18, color: p.text),
                    label: Text(l10n.rideShare),
                  ),
                ),
              if (r.shareUrl != null) const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  key: const ValueKey('ride-sos'),
                  onPressed: () => _sos(context, ref, config),
                  icon: AppIcon(AppIcons.sos, size: 18, color: p.danger),
                  label: Text(l10n.rideSos),
                  style: OutlinedButton.styleFrom(foregroundColor: p.danger),
                ),
              ),
            ],
          ),
        ],
        if (r.cancellation != null) ...[
          const SizedBox(height: 12),
          Text(
            [
              r.cancellation!.by == 'rider'
                  ? l10n.rideCancelledByYou
                  : l10n.rideCancelledByCompany,
              if (r.cancellation!.feeFormatted != null)
                l10n.rideFeeCharged(r.cancellation!.feeFormatted!),
            ].join(' · '),
            key: const ValueKey('ride-cancellation'),
            style: TextStyle(fontSize: 14, color: p.danger),
          ),
        ],
        if (r.status == RideStatus.completed && driver != null) ...[
          const SizedBox(height: 16),
          r.rated != null
              ? Text(
                  l10n.rideRated(r.rated!),
                  key: const ValueKey('ride-rated'),
                  style: value(),
                )
              : _RateCard(ride: r, onRated: onRated),
        ],
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PlaceRow(
                label: l10n.ridePickup,
                place: r.pickup,
                icon: AppIcons.myLocation,
                directions: false,
              ),
              const SizedBox(height: 10),
              PlaceRow(
                label: l10n.rideDropoff,
                place: r.dropoff,
                icon: AppIcons.location,
                directions: false,
              ),
              const Divider(height: 24),
              AmountRow(
                label: r.isFinal ? l10n.rideFare : l10n.rideFareEstimate,
                value: r.fareFormatted,
                strong: true,
              ),
              Text(
                [
                  r.vehicleTypeName,
                  l10n.rideTrip(r.distanceKm.toStringAsFixed(1), r.minutes),
                  r.payment == PaymentMethod.cash ? l10n.payCash : l10n.payCard,
                  if (r.payment == PaymentMethod.card)
                    r.paid ? l10n.paymentPaid : l10n.paymentUnpaid,
                ].where((s) => s.isNotEmpty).join(' · '),
                key: const ValueKey('ride-payment'),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              if (r.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.rideNotes, style: label()),
                Text(r.notes!, style: value()),
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

  /// Calls the company's emergency number, or the phone's (112 works on
  /// every mobile network).
  Future<void> _sos(
    BuildContext context,
    WidgetRef ref,
    RidesConfig config,
  ) async {
    final l10n = context.l10n;
    final number = config.emergencyPhone ?? '112';
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.rideSosTitle),
        content: Text(l10n.rideSosMessage(number)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            key: const ValueKey('ride-sos-call'),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.rideSosCall),
          ),
        ],
      ),
    );
    if (yes == true) await ref.read(openExternalProvider)('tel:$number');
  }
}

/// Why the rider cancels; the fee when the driver has had the ride too long.
class _CancelDialog extends StatefulWidget {
  const _CancelDialog({required this.fee, required this.freeMinutes});

  final String? fee;
  final int freeMinutes;

  @override
  State<_CancelDialog> createState() => _CancelDialogState();
}

class _CancelDialogState extends State<_CancelDialog> {
  RiderCancelReason _reason = RiderCancelReason.changedPlans;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    return AlertDialog(
      title: Text(l10n.rideCancelConfirm),
      content: SingleChildScrollView(
        child: RadioGroup<RiderCancelReason>(
          groupValue: _reason,
          onChanged: (v) => setState(() => _reason = v ?? _reason),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.fee != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    l10n.rideCancelFeeNote(widget.fee!, widget.freeMinutes),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ),
              for (final reason in RiderCancelReason.values)
                RadioListTile<RiderCancelReason>(
                  key: ValueKey('ride-reason-${reason.name}'),
                  value: reason,
                  contentPadding: EdgeInsets.zero,
                  title: Text(riderCancelReasonLabel(l10n, reason)),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.keepIt),
        ),
        FilledButton(
          key: const ValueKey('ride-cancel-yes'),
          onPressed: () => Navigator.of(context).pop(_reason),
          child: Text(l10n.rideCancel),
        ),
      ],
    );
  }
}

/// Rating the driver of a completed ride.
class _RateCard extends ConsumerStatefulWidget {
  const _RateCard({required this.ride, required this.onRated});

  final Ride ride;
  final VoidCallback onRated;

  @override
  ConsumerState<_RateCard> createState() => _RateCardState();
}

class _RateCardState extends ConsumerState<_RateCard> {
  final _comment = TextEditingController();
  int _stars = 0;
  bool _sending = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    if (_stars == 0) {
      showMessage(context, l10n.ratePickStars);
      return;
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .rateMyRide(widget.ride.id, driver: _stars, comment: _comment.text);
      if (!mounted) return;
      showMessage(context, l10n.rateThanks);
      widget.onRated();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: const ValueKey('ride-rate'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.rideRateTitle,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          StarPicker(
            keyPrefix: 'rate-driver',
            value: _stars,
            onChanged: (v) => setState(() => _stars = v),
          ),
          TextField(
            controller: _comment,
            maxLength: 500,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: l10n.rateComment,
              counterText: '',
            ),
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            key: const ValueKey('rate-send'),
            label: l10n.rateSend,
            icon: AppIcons.star,
            loading: _sending,
            onPressed: _send,
          ),
        ],
      ),
    );
  }
}
