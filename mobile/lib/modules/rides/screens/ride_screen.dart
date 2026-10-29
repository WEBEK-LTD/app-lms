import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart'
    show LocateProblem, locatorProvider;
import '../../delivery/data/locate.dart';
import '../../delivery/screens/send_parcel_screen.dart'
    show PasteLinkDialog, PlaceEditor, PlaceFields;
import '../../delivery/widgets/delivery_map.dart' show MapPickerScreen;
import '../../real_estate/widgets/listing_widgets.dart'
    show TabHeader, signInFor;
import '../data/rides_providers.dart';
import '../widgets/ride_widgets.dart';

/// 105.2 Asking for a ride: where from and to (the phone's position, a maps
/// link or the map), now or later, the fare of each vehicle type, how to pay.
/// A ride that isn't over is shown on top, to follow it.
class RideScreen extends ConsumerStatefulWidget {
  const RideScreen({super.key});

  @override
  ConsumerState<RideScreen> createState() => _RideScreenState();
}

class _RideScreenState extends ConsumerState<RideScreen> {
  final _pickup = PlaceFields();
  final _dropoff = PlaceFields();
  final _promo = TextEditingController();
  final _notes = TextEditingController();
  DateTime? _later;
  int? _typeId;
  PaymentMethod? _payment;
  RideEstimate? _estimate;
  String? _estimateError;
  bool _estimating = false;
  bool _asking = false;
  int _generation = 0;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _pickup.dispose();
    _dropoff.dispose();
    _promo.dispose();
    _notes.dispose();
    super.dispose();
  }

  bool get _located => _pickup.at != null && _dropoff.at != null;

  RideRequest _request(RidesConfig config) => RideRequest(
    pickup: _pickup.place,
    dropoff: _dropoff.place,
    scheduledAt: _later,
    promoCode: _promo.text,
    vehicleTypeId: _typeId,
    payment:
        _payment ?? (config.cash ? PaymentMethod.cash : PaymentMethod.card),
    notes: _notes.text,
  );

  void _reestimate() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _estimateNow);
  }

  Future<void> _estimateNow() async {
    if (!mounted) return;
    if (!_located || !ref.read(authControllerProvider).isSignedIn) {
      setState(() {
        _estimate = null;
        _estimateError = null;
      });
      return;
    }
    final generation = ++_generation;
    setState(() => _estimating = true);
    try {
      final estimate = await ref
          .read(yallappApiProvider)
          .estimateRide(_request(ref.read(ridesConfigProvider)));
      if (!mounted || generation != _generation) return;
      setState(() {
        _estimate = estimate;
        _estimateError = null;
        final ids = estimate.options.map((o) => o.vehicleType.id);
        if (_typeId == null || !ids.contains(_typeId)) {
          _typeId = estimate.options.isEmpty
              ? null
              : (estimate.options.firstWhere(
                  (o) => o.available,
                  orElse: () => estimate.options.first,
                )).vehicleType.id;
        }
      });
    } on ApiException catch (e) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _estimate = null;
        _estimateError = e.message;
      });
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _estimating = false);
      }
    }
  }

  void _setAt(PlaceFields fields, ({double lat, double lng})? at) {
    setState(() => fields.at = at);
    _reestimate();
  }

  Future<void> _useMyLocation(PlaceFields fields) async {
    final l10n = context.l10n;
    final found = await ref.read(locatorProvider).current();
    if (!mounted) return;
    final p = found.position;
    if (p == null) {
      showMessage(context, switch (found.problem) {
        LocateProblem.off => l10n.locateOff,
        LocateProblem.denied => l10n.locateDenied,
        _ => l10n.locateFailed,
      });
      return;
    }
    if (fields.address.text.trim().isEmpty) {
      fields.address.text = l10n.rideMyLocation;
    }
    _setAt(fields, (lat: p.lat, lng: p.lng));
  }

  Future<void> _pasteLink(PlaceFields fields) async {
    final l10n = context.l10n;
    final text = await showDialog<String>(
      context: context,
      builder: (_) => const PasteLinkDialog(),
    );
    if (text == null || text.trim().isEmpty || !mounted) return;
    var at = coordinatesIn(text);
    if (at == null &&
        isMapsLink(text) &&
        ref.read(authControllerProvider).isSignedIn) {
      try {
        at = await ref.read(yallappApiProvider).locateMapLink(text);
      } on ApiException {
        at = null;
      }
    }
    if (!mounted) return;
    if (at == null) {
      showMessage(context, l10n.pasteLinkFailed);
      return;
    }
    _setAt(fields, at);
  }

  Future<void> _onMap(PlaceFields fields, RidesConfig config) async {
    final l10n = context.l10n;
    final at = await Navigator.of(context).push<({double lat, double lng})>(
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          config: config.mapConfig,
          start: fields.at ?? _pickup.at,
          title: l10n.mapPickTitle,
          confirmLabel: l10n.mapPickConfirm,
        ),
      ),
    );
    if (at != null && mounted) _setAt(fields, at);
  }

  Future<void> _pickLater() async {
    final now = DateTime.now();
    final first = now.add(const Duration(minutes: 30));
    final last = now.add(const Duration(days: 7));
    final day = await showDatePicker(
      context: context,
      initialDate: _later ?? first,
      firstDate: first,
      lastDate: last,
    );
    if (day == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_later ?? first),
    );
    if (time == null || !mounted) return;
    var at = DateTime(day.year, day.month, day.day, time.hour, time.minute);
    if (at.isBefore(first)) at = first;
    if (at.isAfter(last)) at = last;
    setState(() => _later = at);
    _reestimate();
  }

  Future<void> _ask(RidesConfig config) async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.ride);
      return;
    }
    if (!_located ||
        _pickup.address.text.trim().isEmpty ||
        _dropoff.address.text.trim().isEmpty) {
      showMessage(context, l10n.rideFillPlaces);
      return;
    }
    if (_typeId == null) {
      showMessage(context, l10n.rideChooseCar);
      return;
    }
    setState(() => _asking = true);
    try {
      final ride = await ref
          .read(yallappApiProvider)
          .requestRide(_request(config));
      if (!mounted) return;
      ref
        ..invalidate(activeRideProvider)
        ..invalidate(myRidesProvider);
      _reset();
      unawaited(context.push(Paths.rideFollow(ride.id)));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  void _reset() {
    for (final c in [
      _pickup.address,
      _pickup.details,
      _dropoff.address,
      _dropoff.details,
      _promo,
      _notes,
    ]) {
      c.clear();
    }
    setState(() {
      _pickup.at = null;
      _dropoff.at = null;
      _later = null;
      _estimate = null;
      _estimateError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(ridesConfigProvider);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final active = signedIn ? ref.watch(activeRideProvider).value : null;
    final payment =
        _payment ?? (config.cash ? PaymentMethod.cash : PaymentMethod.card);
    final estimate = _estimate;
    final body = ListView(
      key: const ValueKey('ride-form'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        if (active != null) ...[
          AppCard(
            key: const ValueKey('ride-active'),
            padding: const EdgeInsets.all(16),
            color: p.primarySoft,
            onTap: () => context.push(Paths.rideFollow(active.id)),
            child: Row(
              children: [
                AppIcon(AppIcons.ride, size: 26, color: p.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rideStatusLabel(l10n, active.status),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                      Text(
                        active.dropoff.address,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13, color: p.textBody),
                      ),
                    ],
                  ),
                ),
                AppIcon(AppIcons.forward, size: 22, color: p.textSecondary),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        _SectionTitle(l10n.ridePickup),
        PlaceEditor(
          keyPrefix: 'pickup',
          fields: _pickup,
          config: config.mapConfig,
          onMyLocation: () => _useMyLocation(_pickup),
          onPaste: () => _pasteLink(_pickup),
          onMap: () => _onMap(_pickup, config),
          onClear: () => _setAt(_pickup, null),
        ),
        const SizedBox(height: 16),
        _SectionTitle(l10n.rideDropoff),
        PlaceEditor(
          keyPrefix: 'dropoff',
          fields: _dropoff,
          config: config.mapConfig,
          onMyLocation: () => _useMyLocation(_dropoff),
          onPaste: () => _pasteLink(_dropoff),
          onMap: () => _onMap(_dropoff, config),
          onClear: () => _setAt(_dropoff, null),
        ),
        if (config.scheduling) ...[
          const SizedBox(height: 16),
          _SectionTitle(l10n.rideWhen),
          SegmentedTabs(
            labels: [l10n.rideNow, l10n.rideLater],
            selected: _later == null ? 0 : 1,
            radio: true,
            onChanged: (i) {
              if (i == 0) {
                setState(() => _later = null);
                _reestimate();
              } else {
                _pickLater();
              }
            },
          ),
          if (_later != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.rideScheduledFor(dayAndTime(_later!)),
                      key: const ValueKey('ride-later'),
                      style: TextStyle(fontSize: 14, color: p.text),
                    ),
                  ),
                  TextButton(onPressed: _pickLater, child: Text(l10n.edit)),
                ],
              ),
            ),
        ],
        const SizedBox(height: 16),
        _SectionTitle(l10n.rideChooseCar),
        if (!signedIn)
          Text(
            l10n.rideSignInForFares,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          )
        else if (!_located)
          Text(
            l10n.rideFillPlaces,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          )
        else if (_estimating && estimate == null)
          Text(
            l10n.sendPriceCalculating,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          )
        else if (estimate == null)
          Text(
            _estimateError ?? l10n.sendPriceMissing,
            key: const ValueKey('ride-estimate-error'),
            style: TextStyle(fontSize: 14, color: p.danger),
          )
        else ...[
          Text(
            [
              l10n.rideTrip(
                estimate.distanceKm.toStringAsFixed(1),
                estimate.minutes,
              ),
              if (config.fareMode == FareMode.metered) l10n.rideMeteredNote,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 8),
          for (final option in estimate.options)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _VehicleOption(
                option: option,
                selected: _typeId == option.vehicleType.id,
                onTap: () => setState(() => _typeId = option.vehicleType.id),
              ),
            ),
          if (estimate.discountFormatted != null)
            Text(
              l10n.rideDiscount(estimate.discountFormatted!),
              style: TextStyle(fontSize: 13, color: p.success),
            ),
          if (estimate.previousFeeFormatted != null)
            Text(
              l10n.ridePreviousFee(estimate.previousFeeFormatted!),
              key: const ValueKey('ride-previous-fee'),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
        ],
        const SizedBox(height: 12),
        TextField(
          key: const ValueKey('ride-promo'),
          controller: _promo,
          maxLength: 40,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: l10n.ridePromoCode,
            counterText: '',
          ),
          onSubmitted: (_) => _reestimate(),
          onEditingComplete: _reestimate,
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _notes,
          maxLength: 300,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: l10n.rideNotes,
            counterText: '',
          ),
        ),
        if (config.cash && config.card) ...[
          const SizedBox(height: 16),
          _SectionTitle(l10n.sendPayment),
          SegmentedTabs(
            labels: [l10n.payCash, l10n.payCard],
            selected: payment == PaymentMethod.cash ? 0 : 1,
            radio: true,
            onChanged: (i) => setState(
              () => _payment = i == 0 ? PaymentMethod.cash : PaymentMethod.card,
            ),
          ),
          if (payment == PaymentMethod.card)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l10n.rideCardAfter,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
        ],
      ],
    );
    final button = BottomActionBar(
      child: PrimaryButton(
        key: const ValueKey('ride-request'),
        label: !signedIn
            ? l10n.sendSignIn
            : (_later == null ? l10n.rideRequest : l10n.rideBook),
        icon: AppIcons.ride,
        loading: _asking,
        onPressed: () => _ask(config),
      ),
    );
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.rideWhereTo),
            Expanded(child: body),
          ],
        ),
      ),
      bottomNavigationBar: button,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Semantics(
      header: true,
      child: Text(
        text,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w800,
          color: context.palette.text,
        ),
      ),
    ),
  );
}

class _VehicleOption extends StatelessWidget {
  const _VehicleOption({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final RideOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final type = option.vehicleType;
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: AppCard(
        key: ValueKey('ride-type-${type.id}'),
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        color: selected ? p.primarySoft : null,
        child: Row(
          children: [
            AppIcon(
              vehicleIcon(type.icon),
              size: 28,
              color: selected ? p.primary : p.textSecondary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    type.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  Text(
                    [
                      l10n.rideSeats(type.seats),
                      option.available && option.pickupMinutes != null
                          ? l10n.ridePickupIn(option.pickupMinutes!)
                          : (option.available ? null : l10n.rideNoneNearby),
                    ].whereType<String>().join(' · '),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
              ),
            ),
            Text(
              option.fareFormatted,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
