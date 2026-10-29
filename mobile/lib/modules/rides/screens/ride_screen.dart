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
import '../../shared/pages/app_header.dart'
    show headerIconOpens, openHeaderIcon;
import '../../shared/pages/side_menu.dart' show SideMenuButton;
import '../../taxi/data/taxi_providers.dart';
import '../../taxi/screens/place_search_screen.dart';
import '../../taxi/widgets/taxi_map.dart';
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

  /// 105.9 A taxi app's map: where the rider is, the route and the sheet.
  TaxiSpot? _here;
  List<TaxiSpot> _route = const [];
  int _routeGeneration = 0;
  final _sheet = DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _locateStart());
  }

  @override
  void dispose() {
    _sheet.dispose();
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
    _reroute();
  }

  /// 105.9 A taxi app starts from where the rider is.
  Future<void> _locateStart() async {
    if (!mounted || ref.read(taxiConfigProvider) == null) return;
    final found = await ref.read(locatorProvider).current();
    final p = found.position;
    if (!mounted || p == null) return;
    setState(() => _here = (lat: p.lat, lng: p.lng));
    if (_pickup.at == null && _pickup.address.text.trim().isEmpty) {
      _pickup.address.text = context.l10n.rideMyLocation;
      _setAt(_pickup, _here);
    }
  }

  /// 105.9 The route between both places: the company's when it has
  /// routes, else a straight line.
  Future<void> _reroute() async {
    final taxi = ref.read(taxiConfigProvider);
    final from = _pickup.at, to = _dropoff.at;
    final generation = ++_routeGeneration;
    if (taxi == null || from == null || to == null) {
      if (_route.isNotEmpty) setState(() => _route = const []);
      return;
    }
    var line = [from, to];
    if (taxi.map.routes) {
      try {
        final route = await ref.read(yallappApiProvider).getTaxiRoute(from, to);
        if (route.points.length > 1) line = route.points;
      } on ApiException {
        // A straight line.
      }
    }
    if (mounted && generation == _routeGeneration) {
      setState(() => _route = line);
    }
  }

  /// 105.9 Where from or to, from the company's place search.
  Future<void> _search(PlaceFields fields, TaxiConfig taxi) async {
    final l10n = context.l10n;
    final from = identical(fields, _pickup);
    final choice = await Navigator.of(context).push<TaxiChoice>(
      MaterialPageRoute(
        builder: (_) => TaxiPlaceSearchScreen(
          title: from ? l10n.taxiWhereFrom : l10n.rideWhereTo,
          map: taxi.map,
          near: _pickup.at ?? _here,
          myLocation: true,
        ),
      ),
    );
    if (choice == null || !mounted) return;
    fields.address.text = choice.name;
    fields.details.text = choice.address ?? '';
    _setAt(fields, (lat: choice.lat, lng: choice.lng));
    if (!from) _sizeSheet(0.62);
  }

  void _sizeSheet(double size) {
    if (!_sheet.isAttached) return;
    _sheet.animateTo(
      size,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  /// 105.9 Back to "Where to?".
  void _clearDropoff() {
    _dropoff.address.clear();
    _dropoff.details.clear();
    _setAt(_dropoff, null);
    _sizeSheet(0.34);
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
      _route = const [];
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
    final activeCard = [
      if (active != null) ...[
        AppCard(
          key: const ValueKey('ride-active'),
          padding: const EdgeInsets.all(16),
          color: p.primarySoft,
          onTap: () => context.push(Paths.rideFollow(active.id)),
          child: Row(
            children: [
              AppIcon(AppIcons.ride, size: 26, color: p.onPrimarySoft),
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
                        color: p.onPrimarySoft,
                      ),
                    ),
                    Text(
                      active.dropoff.address,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.onPrimaryMuted),
                    ),
                  ],
                ),
              ),
              AppIcon(AppIcons.forward, size: 22, color: p.onPrimaryMuted),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ],
    ];
    final places = [
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
    ];
    final when = [
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
    ];
    final fares = [
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
    ];
    final extras = [
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
        decoration: InputDecoration(labelText: l10n.rideNotes, counterText: ''),
      ),
      if (config.cash && config.card) ...[
        const SizedBox(height: 16),
        _SectionTitle(l10n.sendPayment),
        SegmentedTabs(
          labels: [l10n.ridePayCash, l10n.payCard],
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
    ];
    final taxi = ref.watch(taxiConfigProvider);
    if (taxi != null) {
      // 105.9 The fares right after where from and to, then when.
      return _taxiLayout(taxi, config, signedIn, activeCard, places, [
        ...fares,
        ...when,
        ...extras,
      ]);
    }
    final body = ListView(
      key: const ValueKey('ride-form'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [...activeCard, ...places, ...when, ...fares, ...extras],
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

extension on _RideScreenState {
  /// 105.9 A taxi app's screen: the map with the free taxis around the
  /// rider, and in a sheet over it "Where to?", then the route's fares and
  /// the rest of the form above.
  Widget _taxiLayout(
    TaxiConfig taxi,
    RidesConfig config,
    bool signedIn,
    List<Widget> activeCard,
    List<Widget> places,
    List<Widget> rest,
  ) {
    final l10n = context.l10n;
    final from = _pickup.at, to = _dropoff.at;
    final search = taxi.map.search;
    final chosen = !search || to != null;
    final spot = from ?? _here;
    // About 100 m: the rider moving a little keeps the same listeners.
    double round(double v) => (v * 1000).roundToDouble() / 1000;
    final taxis = spot == null
        ? const <NearbyTaxi>[]
        : ref
                  .watch(
                    nearbyTaxisProvider((
                      lat: round(spot.lat),
                      lng: round(spot.lng),
                    )),
                  )
                  .value ??
              const <NearbyTaxi>[];
    final type = _estimate?.options
        .where((o) => o.vehicleType.id == _typeId)
        .firstOrNull;
    final height = MediaQuery.sizeOf(context).height;
    // The sheet's size: "Where to?", the fares, or the whole form.
    final size = !search
        ? 0.5
        : to == null
        ? 0.34
        : 0.62;
    final sheet = [
      ...activeCard,
      if (!search) ...[
        ...places,
        const SizedBox(height: 12),
        _NearbyLine(taxis: taxis, at: spot),
      ] else if (to == null) ...[
        _WhereTo(onTap: () => _search(_dropoff, taxi)),
        const SizedBox(height: 12),
        _NearbyLine(taxis: taxis, at: spot),
      ] else
        _TaxiPlaces(
          from: _pickup.address.text,
          to: _dropoff.address.text,
          onFrom: () => _search(_pickup, taxi),
          onTo: () => _search(_dropoff, taxi),
        ),
      if (chosen) ...[const SizedBox(height: 4), ...rest],
    ];
    final notifications = headerIconOpens(ref, HeaderIcon.notifications);
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: TaxiMapView(
              map: taxi.map,
              focus: [
                if (from != null && to != null) ...[from, to],
                if (to == null && spot != null) spot,
              ],
              me: _here,
              taxis: taxis,
              pins: [
                if (from != null && to != null)
                  TaxiPin(
                    TaxiPinKind.from,
                    from.lat,
                    from.lng,
                    label: l10n.taxiFrom(_pickup.address.text),
                  ),
                if (to != null)
                  TaxiPin(
                    TaxiPinKind.to,
                    to.lat,
                    to.lng,
                    label: l10n.taxiTo(_dropoff.address.text),
                  ),
              ],
              route: _route,
              padding: EdgeInsets.only(top: 72, bottom: height * size),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: SizedBox(
                height: 48,
                child: NavigationToolbar(
                  leading: search && to != null
                      ? AppBackButton(onPressed: _clearDropoff)
                      : const SideMenuButton(),
                  middle: const TaxiAppChip(),
                  trailing: notifications
                      ? SquareIconButton(
                          key: const ValueKey('taxi-notifications'),
                          icon: AppIcons.notifications,
                          label: l10n.notifications,
                          bordered: false,
                          onPressed: () => openHeaderIcon(
                            context,
                            ref,
                            HeaderIcon.notifications,
                          ),
                        )
                      : null,
                ),
              ),
            ),
          ),
          DraggableScrollableSheet(
            controller: _sheet,
            initialChildSize: size,
            minChildSize: 0.2,
            maxChildSize: 0.92,
            builder: (context, controller) => TaxiSheet(
              controller: _sheet,
              child: ListView(
                key: const ValueKey('ride-form'),
                controller: controller,
                padding: const EdgeInsets.fromLTRB(20, 26, 20, 24),
                children: sheet,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: chosen
          ? BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('ride-request'),
                label: !signedIn
                    ? l10n.sendSignIn
                    : _later != null
                    ? l10n.rideBook
                    : type != null
                    ? l10n.taxiRequestType(type.vehicleType.name)
                    : l10n.rideRequest,
                icon: AppIcons.ride,
                loading: _asking,
                onPressed: () => _ask(config),
              ),
            )
          : null,
    );
  }
}

/// 105.9 "Where to?": opens the place search.
class _WhereTo extends StatelessWidget {
  const _WhereTo({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = context.l10n.rideWhereTo;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        key: const ValueKey('taxi-where-to'),
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: p.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 56,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 24, color: p.text),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 105.9 How many free taxis are around and how far the nearest is (at
/// about 25 km/h in town).
class _NearbyLine extends StatelessWidget {
  const _NearbyLine({required this.taxis, required this.at});

  final List<NearbyTaxi> taxis;
  final TaxiSpot? at;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final here = at;
    double? nearest;
    if (here != null) {
      for (final t in taxis) {
        final km = distanceKm(here, (lat: t.lat, lng: t.lng));
        if (nearest == null || km < nearest) nearest = km;
      }
    }
    return Row(
      children: [
        AppIcon(AppIcons.ride, size: 20, color: p.textSecondary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            [
              l10n.taxiNearby(taxis.length),
              if (nearest != null) l10n.taxiNearest(driveMinutes(nearest)),
            ].join(' · '),
            key: const ValueKey('taxi-nearby'),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        ),
      ],
    );
  }
}

/// 105.9 Where from and to, each opening the search to change it.
class _TaxiPlaces extends StatelessWidget {
  const _TaxiPlaces({
    required this.from,
    required this.to,
    required this.onFrom,
    required this.onTo,
  });

  final String from;
  final String to;
  final VoidCallback onFrom;
  final VoidCallback onTo;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget row(String key, IconData icon, String text, VoidCallback onTap) =>
        InkWell(
          key: ValueKey(key),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                AppIcon(icon, size: 22, color: p.textSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                ),
                AppIcon(AppIcons.edit, size: 18, color: p.textSecondary),
              ],
            ),
          ),
        );
    return AppCard(
      child: Column(
        children: [
          row('taxi-from', AppIcons.myLocation, l10n.taxiFrom(from), onFrom),
          const Divider(height: 1),
          row('taxi-to', AppIcons.location, l10n.taxiTo(to), onTo),
        ],
      ),
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
    // A chosen type sits on the soft brand colour: its words in the colours made for it.
    final strong = selected ? p.onPrimarySoft : p.text;
    final muted = selected ? p.onPrimaryMuted : p.textSecondary;
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
              color: selected ? p.onPrimarySoft : p.textSecondary,
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
                      color: strong,
                    ),
                  ),
                  Text(
                    [
                      l10n.rideSeats(type.seats),
                      option.available && option.pickupMinutes != null
                          ? l10n.ridePickupIn(option.pickupMinutes!)
                          : (option.available ? null : l10n.rideNoneNearby),
                    ].whereType<String>().join(' · '),
                    style: TextStyle(fontSize: 13, color: muted),
                  ),
                ],
              ),
            ),
            Text(
              option.fareFormatted,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: strong,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
