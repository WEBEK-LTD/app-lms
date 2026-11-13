import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../../real_estate/widgets/listing_widgets.dart' show SignInPrompt;
import '../data/travel_providers.dart';
import '../travel_paths.dart';
import '../widgets/travel_pickers.dart';
import '../widgets/travel_ui.dart';
import '../widgets/travel_words.dart';

/// 126 Flights · Price alerts: the routes, trips and "anywhere under" prices
/// the person watches, today's price and how it moved; the person is told on
/// their phone when it drops.
class PriceAlertsScreen extends ConsumerWidget {
  const PriceAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    if (!ref.watch(authControllerProvider).isSignedIn) {
      return Scaffold(
        backgroundColor: t.page,
        body: SafeArea(
          child: SignInPrompt(
            icon: Symbols.notifications_active_rounded,
            title: l.travelAlertsSignIn,
            message: l.travelAlertsSignInText,
            from: TravelPaths.alerts,
          ),
        ),
      );
    }
    final alerts = ref.watch(travelAlertsProvider);
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(travelAlertsProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Eyebrow(l.travelAlertsEyebrow, color: t.goldText),
                        if (!StudioScreenScope.hidesTitleOf(context))
                          Text(l.travelTabAlerts, style: t.serif(28)),
                      ],
                    ),
                  ),
                  TravelChip(
                    t: t,
                    selected: true,
                    icon: Symbols.add_rounded,
                    label: l.travelNewAlert,
                    onTap: () => newAlert(context, ref),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              travelAsync(
                alerts,
                onRetry: () => ref.invalidate(travelAlertsProvider),
                (items) {
                  if (items.isEmpty) {
                    return MessageView(
                      icon: Symbols.notifications_active_rounded,
                      title: l.travelNoAlerts,
                      message: l.travelNoAlertsText,
                      compact: true,
                    );
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Lead(alert: items.first, t: t),
                      for (final a in items.skip(1))
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: _AlertRow(alert: a, t: t),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Cairo → Dubai", "Cairo ⇄ Istanbul", "Santorini · stay + flight", "Anywhere under $600".
String alertTitle(BuildContext context, TravelAlert a) {
  final l = context.l10n;
  return switch (a.kind) {
    'anywhere' => l.travelAnywhereUnder(a.maxPriceFormatted ?? ''),
    'trip' => l.travelStayAndFlightTo(a.to?.city ?? ''),
    _ =>
      a.roundTrip
          ? '${a.from.city} ⇄ ${a.to?.city ?? ''}'
          : route(a.from.city, a.to?.city ?? ''),
  };
}

/// "Return · any dates in December", "June · 4 nights · 2 people", "From Cairo · any dates".
String alertSubtitle(BuildContext context, TravelAlert a) {
  final l = context.l10n;
  final first = a.month == null ? null : parseIsoDate('${a.month}-01');
  final month = first == null ? null : monthName(first);
  return switch (a.kind) {
    'anywhere' => [
      l.travelFromCity(a.from.city),
      month == null ? l.travelAnyDates : l.travelAnyDatesIn(month),
    ].join(' · '),
    'trip' => [
      month ?? l.travelAnyDates,
      if (a.nights != null) l.travelNights(a.nights!),
      l.travelPeople(a.travellers),
    ].join(' · '),
    _ => [
      a.roundTrip ? l.travelReturn : l.travelOneWay,
      month == null ? l.travelAnyDates : l.travelAnyDatesIn(month),
      if (a.travellers > 1) l.travelAdults(a.travellers),
    ].join(' · '),
  };
}

/// Opens the flights or the trip the alert watches, searched for its route and month.
void openAlert(BuildContext context, WidgetRef ref, TravelAlert a) {
  if (a.to == null) {
    ref
        .read(flightSearchProvider.notifier)
        .set(ref.read(flightSearchProvider).copyWith(from: a.from));
    context.go(TravelPaths.flights);
    return;
  }
  final current = ref.read(flightSearchProvider);
  final start = a.month == null ? current.depart : _firstAhead(a.month!);
  final back = start == null || !a.roundTrip
      ? null
      : addDays(start, a.nights ?? 7);
  ref
      .read(flightSearchProvider.notifier)
      .set(
        FlightSearch(
          from: a.from,
          to: a.to,
          depart: start,
          back: back,
          roundTrip: a.roundTrip,
          adults: a.travellers,
        ),
      );
  if (a.kind == 'trip' && start != null && back != null) {
    ref
        .read(staySearchProvider.notifier)
        .set(
          ref
              .read(staySearchProvider)
              .copyWith(
                city: a.to!.city,
                checkIn: start,
                checkOut: back,
                guests: a.travellers,
              ),
        );
    ref.read(tripChoiceProvider.notifier).clear();
    context.push(TravelPaths.bundle);
    return;
  }
  context.push(TravelPaths.flightResults);
}

DateTime _firstAhead(String month) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final first = parseIsoDate('$month-01') ?? today;
  return first.isBefore(today) ? addDays(today, 1) : first;
}

Color _changeColor(TravelTokens t, TravelAlert a, {bool onDark = false}) =>
    switch (a.direction) {
      'down' => onDark ? const Color(0xFF8FE3B8) : t.ok,
      'up' => onDark ? const Color(0xFFFF9C80) : t.danger,
      _ => onDark ? const Color(0xFFB4B8C6) : t.muted,
    };

class _Lead extends ConsumerWidget {
  const _Lead({required this.alert, required this.t});
  final TravelAlert alert;
  final TravelTokens t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final a = alert;
    return Dismissible(
      key: ValueKey('alert-${a.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _remove(context, ref, a),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0E1424),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    alertTitle(context, a),
                    style: t.ui(
                      15,
                      weight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
                if (a.changeFormatted != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: _changeColor(
                        t,
                        a,
                        onDark: true,
                      ).withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      l.travelChangeSince(a.changeFormatted!),
                      style: t.ui(
                        11.5,
                        weight: FontWeight.w800,
                        color: _changeColor(t, a, onDark: true),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        a.priceFormatted ?? l.travelNothingOnSale,
                        style: t.serif(
                          a.priceFormatted == null ? 20 : 34,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        alertSubtitle(context, a),
                        style: t.ui(11.5, color: const Color(0xFFB4B8C6)),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: 150,
                  height: 56,
                  child: CustomPaint(
                    painter: TrendPainter(
                      direction: a.direction,
                      color: t.gold,
                      end: _changeColor(t, a, onDark: true),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF1B2338),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Icon(Symbols.schedule_rounded, size: 18, color: t.gold),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: a.advice == 'book_now'
                                ? '${l.travelFewSeatsAtPrice} '
                                : (a.direction == 'down'
                                      ? '${l.travelPriceDropped} '
                                      : '${l.travelWeWatch} '),
                          ),
                          if (a.advice == 'book_now' || a.direction == 'down')
                            TextSpan(
                              text: l.travelGoodTimeToBook,
                              style: TextStyle(
                                color: t.gold,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                        ],
                      ),
                      style: t.ui(13, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            TravelButton(
              t: t,
              gold: true,
              height: 44,
              label: a.kind == 'trip' ? l.travelSeeTrip : l.travelSeeFlights,
              onPressed: () => openAlert(context, ref, a),
            ),
          ],
        ),
      ),
    );
  }
}

class _AlertRow extends ConsumerWidget {
  const _AlertRow({required this.alert, required this.t});
  final TravelAlert alert;
  final TravelTokens t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final a = alert;
    final photo = a.kind != 'flight' && a.photoUrl != null;
    return Dismissible(
      key: ValueKey('alert-${a.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _remove(context, ref, a),
      background: Container(
        alignment: AlignmentDirectional.centerEnd,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: t.danger,
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(Symbols.delete_rounded, color: Colors.white),
      ),
      child: TravelCard(
        t: t,
        padding: EdgeInsets.all(photo ? 10 : 14),
        onTap: () => openAlert(context, ref, a),
        child: Row(
          children: [
            if (photo) ...[
              SizedBox(
                width: 52,
                height: 52,
                child: TravelPhoto(
                  url: a.photoUrl,
                  radius: 14,
                  scrim: false,
                  label: a.to?.city,
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alertTitle(context, a),
                    style: t.ui(14, weight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    alertSubtitle(context, a),
                    style: t.ui(11.5, color: t.muted),
                  ),
                ],
              ),
            ),
            if (a.kind == 'flight')
              SizedBox(
                width: 80,
                height: 30,
                child: CustomPaint(
                  painter: TrendPainter(
                    direction: a.direction,
                    color: _changeColor(t, a),
                    end: _changeColor(t, a),
                  ),
                ),
              ),
            const SizedBox(width: 10),
            if (a.kind == 'anywhere')
              TravelPill(
                l.travelNewMatches(a.matches ?? 0),
                t: t,
                tone: PillTone.gold,
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    a.priceFormatted ?? '—',
                    style: t.ui(15, weight: FontWeight.w800),
                  ),
                  if (a.changeFormatted != null)
                    Text(
                      a.changeFormatted!,
                      style: t.ui(
                        11.5,
                        weight: FontWeight.w800,
                        color: _changeColor(t, a),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

Future<bool> _remove(BuildContext context, WidgetRef ref, TravelAlert a) async {
  final l = context.l10n;
  final ok = await confirmAction(
    context,
    title: l.travelStopWatching,
    message: alertTitle(context, a),
    confirmLabel: l.travelStopWatching,
    destructive: true,
  );
  if (!ok) return false;
  try {
    await ref.read(travelApiProvider).deleteAlert(a.id);
    ref.invalidate(travelAlertsProvider);
    return true;
  } on ApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
    return false;
  }
}

/// How the price moved, drawn as a line that ends low when it went down.
class TrendPainter extends CustomPainter {
  const TrendPainter({
    required this.direction,
    required this.color,
    required this.end,
  });
  final String? direction;
  final Color color;
  final Color end;

  static const _down = [
    0.46,
    0.39,
    0.5,
    0.32,
    0.36,
    0.18,
    0.29,
    0.25,
    0.46,
    0.61,
    0.82,
  ];
  static const _up = [
    0.7,
    0.62,
    0.66,
    0.5,
    0.56,
    0.4,
    0.46,
    0.34,
    0.3,
    0.24,
    0.16,
  ];
  static const _flat = [
    0.5,
    0.44,
    0.52,
    0.46,
    0.5,
    0.42,
    0.5,
    0.46,
    0.5,
    0.48,
    0.5,
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final ys = switch (direction) {
      'down' => _down,
      'up' => _up,
      _ => _flat,
    };
    final path = Path();
    for (var i = 0; i < ys.length; i++) {
      final p = Offset(
        4 + (size.width - 8) * i / (ys.length - 1),
        size.height * ys[i],
      );
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawCircle(
      Offset(size.width - 4, size.height * ys.last),
      4,
      Paint()..color = end,
    );
  }

  @override
  bool shouldRepaint(covariant TrendPainter old) =>
      old.direction != direction || old.color != color || old.end != end;
}

/// The new alert: a route, a stay and flight, or anywhere under a price.
Future<void> newAlert(BuildContext context, WidgetRef ref) async {
  final made = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _NewAlertSheet(),
  );
  if (made == true && context.mounted) {
    showMessage(context, context.l10n.travelTracking);
  }
}

class _NewAlertSheet extends ConsumerStatefulWidget {
  const _NewAlertSheet();

  @override
  ConsumerState<_NewAlertSheet> createState() => _NewAlertSheetState();
}

class _NewAlertSheetState extends ConsumerState<_NewAlertSheet> {
  String _kind = 'flight';
  TravelAirport? _from;
  TravelAirport? _to;
  String? _month;
  bool _return = true;
  int _travellers = 1;
  int _nights = 4;
  final _max = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final search = ref.read(flightSearchProvider);
    _from = search.from;
    _to = search.to;
    _travellers = search.adults;
  }

  @override
  void dispose() {
    _max.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l = context.l10n;
    if (_from == null || (_kind != 'anywhere' && _to == null)) {
      return showMessage(context, l.travelChooseRoute);
    }
    if (_kind == 'anywhere' && _max.text.trim().isEmpty) {
      return showMessage(context, l.travelChooseMax);
    }
    setState(() => _busy = true);
    try {
      await ref.read(travelApiProvider).addAlert({
        'kind': _kind,
        'from': _from!.code,
        if (_kind != 'anywhere') 'to': _to!.code,
        'month': _month,
        'return': _kind == 'trip' ? true : _return,
        if (_kind == 'trip' || _return) 'nights': _nights,
        'travellers': _travellers,
        if (_kind == 'anywhere') 'max_price': _max.text.trim(),
      });
      ref.invalidate(travelAlertsProvider);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final hotels = ref.watch(travelConfigProvider).hotels;
    final now = DateTime.now();
    final months = [
      for (var i = 0; i < 12; i++) DateTime(now.year, now.month + i),
    ];
    final kinds = ['flight', if (hotels) 'trip', 'anywhere'];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.travelNewAlert, style: t.serif(24)),
              const SizedBox(height: 12),
              TravelSegments<String>(
                t: t,
                values: kinds,
                selected: _kind,
                label: (k) => switch (k) {
                  'trip' => l.travelAlertTrip,
                  'anywhere' => l.travelAlertAnywhere,
                  _ => l.travelAlertRoute,
                },
                onChanged: (k) => setState(() => _kind = k),
              ),
              const SizedBox(height: 12),
              TravelField(
                t: t,
                icon: Symbols.flight_takeoff_rounded,
                label: l.travelFrom,
                value: _from == null
                    ? l.travelChoose
                    : '${_from!.city} · ${_from!.code}',
                onTap: () async {
                  final a = await pickAirport(
                    context,
                    ref,
                    title: l.travelFrom,
                  );
                  if (a != null) setState(() => _from = a);
                },
              ),
              if (_kind != 'anywhere') ...[
                const SizedBox(height: 8),
                TravelField(
                  t: t,
                  icon: Symbols.flight_land_rounded,
                  label: l.travelTo,
                  value: _to == null
                      ? l.travelChoose
                      : '${_to!.city} · ${_to!.code}',
                  onTap: () async {
                    final a = await pickAirport(
                      context,
                      ref,
                      title: l.travelTo,
                    );
                    if (a != null) setState(() => _to = a);
                  },
                ),
              ],
              if (_kind == 'anywhere') ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _max,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: l.travelMaxPrice(
                      ref.watch(travelConfigProvider).currency,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Text(
                l.travelWhen,
                style: t.ui(13, weight: FontWeight.w800, color: t.muted),
              ),
              const SizedBox(height: 6),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: TravelChip(
                        t: t,
                        label: l.travelAnyDates,
                        selected: _month == null,
                        onTap: () => setState(() => _month = null),
                      ),
                    ),
                    for (final m in months)
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 8),
                        child: TravelChip(
                          t: t,
                          label: monthName(m),
                          selected: _month == isoDate(m).substring(0, 7),
                          onTap: () => setState(
                            () => _month = isoDate(m).substring(0, 7),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (_kind == 'flight')
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _return,
                  title: Text(l.travelReturn),
                  onChanged: (v) => setState(() => _return = v),
                ),
              Row(
                children: [
                  Expanded(
                    child: _Stepper(
                      t: t,
                      label: _kind == 'trip'
                          ? l.travelPeopleLabel
                          : l.travelTravellersLabel,
                      value: _travellers,
                      min: 1,
                      max: 9,
                      onChanged: (v) => setState(() => _travellers = v),
                    ),
                  ),
                  if (_kind == 'trip' || _return) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Stepper(
                        t: t,
                        label: l.travelNightsLabel,
                        value: _nights,
                        min: 1,
                        max: 30,
                        onChanged: (v) => setState(() => _nights = v),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              TravelButton(
                t: t,
                busy: _busy,
                icon: Symbols.notifications_active_rounded,
                label: l.travelWatchPrice,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.t,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });
  final TravelTokens t;
  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return TravelCard(
      t: t,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      radius: 16,
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: t.ui(13, weight: FontWeight.w700)),
          ),
          IconButton(
            tooltip: l.travelLess,
            onPressed: value > min ? () => onChanged(value - 1) : null,
            icon: const Icon(Symbols.remove_rounded, size: 18),
          ),
          Text('$value', style: t.ui(15, weight: FontWeight.w800)),
          IconButton(
            tooltip: l.travelMore,
            onPressed: value < max ? () => onChanged(value + 1) : null,
            icon: const Icon(Symbols.add_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}
