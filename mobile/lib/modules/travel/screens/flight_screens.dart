import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/widgets/common.dart';
import '../data/travel_providers.dart';
import '../travel_paths.dart';
import '../widgets/travel_ui.dart';
import '../widgets/travel_words.dart';
import 'explore_screens.dart' show monthOf;

/// 126 Flights: the month's prices, the results, a flight's fares, the
/// seats, and the extra bags and meals.

/// 126 Flights · Price calendar: each day's price, the cheapest in green; a cheaper day nearby.
class PriceCalendarScreen extends ConsumerStatefulWidget {
  const PriceCalendarScreen({super.key});

  @override
  ConsumerState<PriceCalendarScreen> createState() =>
      _PriceCalendarScreenState();
}

class _PriceCalendarScreenState extends ConsumerState<PriceCalendarScreen> {
  late DateTime _month;
  bool _graph = false;
  bool _pickingBack = false;

  @override
  void initState() {
    super.initState();
    final d = ref.read(flightSearchProvider).depart ?? DateTime.now();
    _month = DateTime(d.year, d.month);
  }

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final search = ref.watch(flightSearchProvider);
    final nights =
        search.roundTrip && search.depart != null && search.back != null
        ? math.max(1, search.back!.difference(search.depart!).inDays)
        : null;
    final key = (
      from: search.from?.code ?? '',
      to: search.to?.code ?? '',
      month: monthOf(_month),
      nights: nights,
      depart: search.depart == null ? null : isoDate(search.depart!),
      adults: search.adults,
    );
    final calendar = search.from == null || search.to == null
        ? null
        : ref.watch(flightCalendarProvider(key));
    final cheapest = calendar?.value?.days
        .where(
          (d) =>
              d.priceFormatted != null &&
              d.date == (search.depart == null ? '' : isoDate(search.depart!)),
        )
        .firstOrNull
        ?.priceFormatted;
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            TravelTopBar(
              t: t,
              title: search.roundTrip
                  ? '${search.from?.code ?? ''} ⇄ ${search.to?.code ?? ''}'
                  : route(search.from?.code ?? '', search.to?.code ?? ''),
              subtitle: search.roundTrip
                  ? l.travelReturnPricesFor(search.adults)
                  : l.travelOneWayPricesFor(search.adults),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TravelSegments<bool>(
                t: t,
                values: const [false, true],
                selected: _graph,
                label: (v) => v ? l.travelPriceGraph : l.travelCalendar,
                onChanged: (v) => setState(() => _graph = v),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TravelCard(
                t: t,
                radius: 24,
                padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
                child: Column(
                  children: [
                    Row(
                      children: [
                        TravelIconButton(
                          icon: Directionality.of(context) == TextDirection.rtl
                              ? Symbols.chevron_right_rounded
                              : Symbols.chevron_left_rounded,
                          label: l.travelPreviousMonth,
                          t: t,
                          size: 36,
                          onTap: () => setState(
                            () => _month = DateTime(
                              _month.year,
                              _month.month - 1,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            monthLabel(_month),
                            textAlign: TextAlign.center,
                            style: t.serif(20),
                          ),
                        ),
                        TravelIconButton(
                          icon: Directionality.of(context) == TextDirection.rtl
                              ? Symbols.chevron_left_rounded
                              : Symbols.chevron_right_rounded,
                          label: l.travelNextMonth,
                          t: t,
                          size: 36,
                          onTap: () => setState(
                            () => _month = DateTime(
                              _month.year,
                              _month.month + 1,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (calendar == null)
                      Text(l.travelChooseRoute, style: t.ui(14, color: t.muted))
                    else
                      travelAsync(
                        calendar,
                        onRetry: () =>
                            ref.invalidate(flightCalendarProvider(key)),
                        (c) => _graph
                            ? _bars(context, t, c, search)
                            : _grid(context, t, c, search),
                      ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 14,
                      alignment: WrapAlignment.center,
                      children: [
                        _legend(t, t.ok, l.travelLowest),
                        _legend(t, t.goldText, l.travelAverage),
                        _legend(t, t.danger, l.travelHigher),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (calendar?.value?.tipDate case final tip?) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () {
                    final day = parseIsoDate(tip);
                    if (day == null) return;
                    final back = search.back == null || search.depart == null
                        ? null
                        : addDays(
                            day,
                            search.back!.difference(search.depart!).inDays,
                          );
                    ref
                        .read(flightSearchProvider.notifier)
                        .set(search.copyWith(depart: day, back: back));
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: t.okSoft,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: t.ok,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Symbols.lightbulb_rounded,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l.travelLeaveInstead(
                                  shortDay(parseIsoDate(tip)),
                                  calendar!.value!.tipSaving ?? '',
                                ),
                                style: t.ui(
                                  14,
                                  weight: FontWeight.w800,
                                  color: t.ok,
                                ),
                              ),
                              if (nights != null)
                                Text(
                                  l.travelSameNights(nights),
                                  style: t.ui(12, color: t.ok),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: TravelPriceBar(
        t: t,
        leading: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 170),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                search.roundTrip
                    ? '${shortDay(search.depart)} → ${shortDay(search.back)}'
                    : shortDay(search.depart),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: t.ui(14, weight: FontWeight.w800),
              ),
              if (cheapest != null)
                Text(
                  l.travelFromPerPerson(cheapest),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: t.ui(12, color: t.muted),
                ),
            ],
          ),
        ),
        button: TravelButton(
          t: t,
          label: l.travelShowFlights,
          onPressed: search.ready
              ? () => context.push(TravelPaths.flightResults)
              : null,
        ),
      ),
    );
  }

  Widget _legend(TravelTokens t, Color c, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: t.ui(12, weight: FontWeight.w700)),
    ],
  );

  Color _level(TravelTokens t, String? level) => switch (level) {
    'low' => t.ok,
    'high' => t.danger,
    _ => t.goldText,
  };

  void _pick(String date, FlightSearch search) {
    final day = parseIsoDate(date);
    if (day == null) return;
    if (search.roundTrip &&
        _pickingBack &&
        search.depart != null &&
        day.isAfter(search.depart!)) {
      ref.read(flightSearchProvider.notifier).set(search.copyWith(back: day));
      setState(() => _pickingBack = false);
    } else {
      final keep = search.depart != null && search.back != null
          ? search.back!.difference(search.depart!).inDays
          : 6;
      ref
          .read(flightSearchProvider.notifier)
          .set(search.copyWith(depart: day, back: addDays(day, keep)));
      setState(() => _pickingBack = search.roundTrip);
    }
  }

  Widget _grid(
    BuildContext context,
    TravelTokens t,
    TravelCalendar c,
    FlightSearch search,
  ) {
    final first = DateTime(_month.year, _month.month);
    final lead = (first.weekday + 6) % 7;
    final names = [
      for (var i = 0; i < 7; i++) shortWeekday(DateTime(2024, 1, 1 + i)),
    ];
    final depart = search.depart == null ? null : isoDate(search.depart!);
    final back = search.back == null ? null : isoDate(search.back!);
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 0.78,
      children: [
        for (final n in names)
          Center(
            child: Text(
              n,
              style: t.ui(11, weight: FontWeight.w800, color: t.muted),
            ),
          ),
        for (var i = 0; i < lead; i++) const SizedBox(),
        for (final d in c.days)
          Builder(
            builder: (context) {
              final picked =
                  d.date == depart || (search.roundTrip && d.date == back);
              final inRange =
                  depart != null &&
                  back != null &&
                  search.roundTrip &&
                  d.date.compareTo(depart) > 0 &&
                  d.date.compareTo(back) < 0;
              return Semantics(
                button: d.priceFormatted != null,
                selected: picked,
                label: '${d.date} ${d.priceFormatted ?? ''}',
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: d.priceFormatted == null
                      ? null
                      : () => _pick(d.date, search),
                  child: Container(
                    decoration: BoxDecoration(
                      color: picked
                          ? t.ink
                          : (inRange
                                ? (t.dark ? t.line : const Color(0xFFEFE9DE))
                                : Colors.transparent),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${int.parse(d.date.substring(8))}',
                          style: t.ui(
                            13,
                            weight: FontWeight.w800,
                            color: picked
                                ? t.onInk
                                : (d.priceFormatted == null ? t.muted : t.text),
                          ),
                        ),
                        if (d.priceFormatted != null)
                          FittedBox(
                            child: Text(
                              d.priceFormatted!,
                              style: t.ui(
                                9.5,
                                weight: FontWeight.w800,
                                color: picked ? t.gold : _level(t, d.level),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _bars(
    BuildContext context,
    TravelTokens t,
    TravelCalendar c,
    FlightSearch search,
  ) {
    final priced = c.days.where((d) => d.priceFormatted != null).toList();
    if (priced.isEmpty) {
      return Text(
        context.l10n.travelNoFlightsMonth,
        style: t.ui(14, color: t.muted),
      );
    }
    double value(TravelCalendarDay d) =>
        double.tryParse(
          (d.priceFormatted ?? '').replaceAll(RegExp(r'[^0-9.]'), ''),
        ) ??
        0;
    final top = priced.map(value).reduce(math.max);
    return SizedBox(
      height: 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final d in c.days)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 1),
                child: d.priceFormatted == null
                    ? const SizedBox()
                    : Tooltip(
                        message: '${d.date} · ${d.priceFormatted}',
                        child: InkWell(
                          onTap: () => _pick(d.date, search),
                          child: Container(
                            height: 20 + 120 * value(d) / (top == 0 ? 1 : top),
                            decoration: BoxDecoration(
                              color: _level(t, d.level),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The carrier's square with its code.
Widget carrierTile(TravelTokens t, TravelCarrier c, {double size = 36}) {
  final bg = hexColor(c.color, t.ink);
  return Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(size / 3),
    ),
    child: Text(
      c.code,
      style: TextStyle(
        fontSize: size * 0.3,
        fontWeight: FontWeight.w800,
        color: ThemeData.estimateBrightnessForColor(bg) == Brightness.dark
            ? Colors.white
            : const Color(0xFF0E1424),
      ),
    ),
  );
}

String _stopsLabel(BuildContext context, TravelLeg leg) => leg.stops == 0
    ? context.l10n.travelDirect
    : context.l10n.travelStopsVia(leg.stops, leg.via ?? '');

/// 126 Flights · Results: the best, cheapest and fastest; how the price compares; each option both ways with its luggage and its price.
class FlightResultsScreen extends ConsumerStatefulWidget {
  const FlightResultsScreen({super.key});

  @override
  ConsumerState<FlightResultsScreen> createState() =>
      _FlightResultsScreenState();
}

class _FlightResultsScreenState extends ConsumerState<FlightResultsScreen> {
  String _sort = 'best';
  bool _tracking = false;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final search = ref.watch(flightSearchProvider);
    final results = ref.watch(flightSearchResultsProvider(search));
    final data = results.value;
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TravelTopBar(
              t: t,
              title: search.roundTrip
                  ? '${search.from?.city ?? ''} ⇄ ${search.to?.city ?? ''}'
                  : route(search.from?.city ?? '', search.to?.city ?? ''),
              subtitle:
                  '${search.roundTrip ? dayRange(search.depart, search.back) : shortDay(search.depart)} · ${l.travelAdultsEconomy(search.adults)}',
              trailing: TravelIconButton(
                icon: Symbols.calendar_month_rounded,
                label: l.travelCalendar,
                t: t,
                onTap: () => context.push(TravelPaths.calendar),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TravelSegments<String>(
                t: t,
                values: const ['best', 'cheapest', 'fastest'],
                selected: _sort,
                onChanged: (v) => setState(() => _sort = v),
                label: (v) => switch (v) {
                  'cheapest' => l.travelCheapest,
                  'fastest' => l.travelFastest,
                  _ => l.travelBest,
                },
                sub: (v) => switch (v) {
                  'cheapest' => data?.cheapestFormatted ?? '',
                  'fastest' =>
                    data?.fastestMinutes == null
                        ? ''
                        : durationLabel(context, data!.fastestMinutes!),
                  _ => data?.bestFormatted ?? '',
                },
              ),
            ),
            if (data?.priceLevel != null) ...[
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TravelCard(
                  t: t,
                  color: t.dark ? t.surface : const Color(0xFFFBF8F2),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(text: l.travelPricesAre),
                                  TextSpan(
                                    text:
                                        ' ${data!.priceLevel == 'low'
                                            ? l.travelLow
                                            : data.priceLevel == 'high'
                                            ? l.travelHigh
                                            : l.travelTypical} ',
                                    style: TextStyle(
                                      color: data.priceLevel == 'low'
                                          ? t.ok
                                          : data.priceLevel == 'high'
                                          ? t.danger
                                          : t.goldText,
                                    ),
                                  ),
                                  TextSpan(text: l.travelForYourDates),
                                ],
                              ),
                              style: t.ui(14, weight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            LayoutBuilder(
                              builder: (context, box) => SizedBox(
                                height: 14,
                                child: Stack(
                                  children: [
                                    Positioned(
                                      left: 0,
                                      right: 0,
                                      top: 4,
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Container(
                                              height: 6,
                                              color: t.ok,
                                            ),
                                          ),
                                          Expanded(
                                            child: Container(
                                              height: 6,
                                              color: t.gold,
                                            ),
                                          ),
                                          Expanded(
                                            child: Container(
                                              height: 6,
                                              color: t.danger,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    PositionedDirectional(
                                      start:
                                          (box.maxWidth - 14) *
                                          (data.position ?? 0.5),
                                      child: Container(
                                        width: 14,
                                        height: 14,
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: t.ink,
                                            width: 3,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              l.travelUsually(
                                data.usualFrom ?? '',
                                data.usualTo ?? '',
                              ),
                              style: t.ui(12, color: t.muted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        children: [
                          TravelToggle(
                            t: t,
                            on: _tracking,
                            label: l.travelTrack,
                            onChanged: (v) => _track(v, search),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l.travelTrack,
                            style: t.ui(11.5, weight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
            Expanded(
              child: travelAsync(
                results,
                onRetry: () =>
                    ref.invalidate(flightSearchResultsProvider(search)),
                (data) {
                  final items = [...data.items];
                  double price(TravelFlightOption o) => o.fares
                      .where((f) => f.available)
                      .map((f) => f.price)
                      .fold(double.infinity, math.min);
                  if (_sort == 'cheapest') {
                    items.sort((a, b) => price(a).compareTo(price(b)));
                  }
                  if (_sort == 'fastest') {
                    items.sort((a, b) => a.minutes.compareTo(b.minutes));
                  }
                  if (items.isEmpty) {
                    return MessageView(
                      icon: Symbols.flight_rounded,
                      title: l.travelNoFlights,
                      message: l.travelNoFlightsText,
                      actionLabel: l.travelCalendar,
                      onAction: () => context.push(TravelPaths.calendar),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 22, 16, 24),
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 18),
                    itemBuilder: (context, i) =>
                        _OptionCard(option: items[i], t: t),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _track(bool on, FlightSearch search) async {
    final l = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': TravelPaths.flightResults},
        ).toString(),
      );
      return;
    }
    if (!on) return setState(() => _tracking = false);
    setState(() => _tracking = true);
    try {
      await ref.read(travelApiProvider).addAlert({
        'kind': 'flight',
        'from': search.from!.code,
        'to': search.to!.code,
        'month': search.depart == null ? null : monthOf(search.depart!),
        'return': search.roundTrip,
        'nights':
            search.roundTrip && search.back != null && search.depart != null
            ? math.max(1, search.back!.difference(search.depart!).inDays)
            : null,
        'travellers': search.adults,
      });
      ref.invalidate(travelAlertsProvider);
      if (mounted) showMessage(context, l.travelTracking);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _tracking = false);
      showMessage(context, e.message);
    }
  }
}

class _OptionCard extends ConsumerWidget {
  const _OptionCard({required this.option, required this.t});
  final TravelFlightOption option;
  final TravelTokens t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final best = option.tags.contains('best');
    final cheapest = option.fares
        .where((f) => f.available)
        .fold<TravelFare?>(
          null,
          (a, f) => a == null || f.price < a.price ? f : a,
        );
    Widget leg(TravelLeg g) => Row(
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(text: '${g.departTime} → ${g.arriveTime}'),
              if (g.daysLater > 0)
                TextSpan(
                  text: ' +${g.daysLater}',
                  style: TextStyle(fontSize: 11, color: t.danger),
                ),
            ],
          ),
          style: t.ui(15, weight: FontWeight.w800),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            '${durationLabel(context, g.minutes)} · ${_stopsLabel(context, g)}',
            textAlign: TextAlign.end,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: t.ui(12.5, color: t.muted),
          ),
        ),
      ],
    );
    return Stack(
      clipBehavior: Clip.none,
      children: [
        TravelCard(
          t: t,
          border: best ? t.ink : null,
          onTap: () {
            final choice = ref.read(tripChoiceProvider);
            ref
                .read(tripChoiceProvider.notifier)
                .set(
                  choice.copyWith(
                    flight: option,
                    fareId: cheapest?.id ?? 'standard',
                    seatsOut: const [],
                    seatsBack: const [],
                  ),
                );
            context.push(TravelPaths.fares);
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  carrierTile(t, option.outbound.carrier),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      children: [
                        leg(option.outbound),
                        if (option.inbound != null) ...[
                          const SizedBox(height: 6),
                          leg(option.inbound!),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (cheapest != null)
                          TravelPill(
                            cheapest.bags > 0
                                ? l.travelCabinBag(cheapest.bagKg)
                                : l.travelCabinOnly,
                            t: t,
                            tone: cheapest.bags > 0
                                ? PillTone.sea
                                : PillTone.coral,
                          ),
                        if (option.fares.any(
                          (f) =>
                              f.changeAllowed && f.changeFeeFormatted == null,
                        ))
                          TravelPill(
                            l.travelFreeChanges,
                            t: t,
                            tone: PillTone.ok,
                          ),
                        if (option.tags.contains('cheapest'))
                          TravelPill(l.travelCheapest, t: t),
                        if (option.tags.contains('fastest'))
                          TravelPill(
                            l.travelFastest,
                            t: t,
                            tone: PillTone.gold,
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(option.fromPriceFormatted, style: t.serif(21)),
                      Text(
                        l.travelPerPerson,
                        style: t.ui(11.5, color: t.muted),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        if (best)
          PositionedDirectional(
            top: -12,
            start: 14,
            child: TravelPill(l.travelBestValue, t: t, tone: PillTone.ink),
          ),
      ],
    );
  }
}

/// 126 Flights · Fares: both legs, then the light, standard and flex fares with what each allows.
class FaresScreen extends ConsumerWidget {
  const FaresScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final choice = ref.watch(tripChoiceProvider);
    final search = ref.watch(flightSearchProvider);
    final option = choice.flight;
    if (option == null) {
      return Scaffold(
        backgroundColor: t.page,
        body: MessageView(
          icon: Symbols.flight_rounded,
          title: l.travelChooseFlightFirst,
          actionLabel: l.travelSearchFlights,
          onAction: () => context.go(TravelPaths.flights),
        ),
      );
    }
    final fare = choice.fare;
    Widget legBlock(TravelLeg g, String tag) => Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: t.text, width: 2),
              ),
            ),
            Container(width: 2, height: 54, color: t.line),
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(shape: BoxShape.circle, color: t.text),
            ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${g.departTime} · ${g.from.code}',
                      style: t.ui(17, weight: FontWeight.w800),
                    ),
                  ),
                  TravelPill(tag, t: t, tone: PillTone.sea),
                ],
              ),
              Text(
                [
                  shortDay(g.departDay),
                  g.from.airport,
                  if (g.from.terminal != null)
                    l.travelTerminal(g.from.terminal!),
                ].whereType<String>().join(' · '),
                style: t.ui(12, color: t.muted),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: t.page,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  [
                    g.number,
                    g.aircraft,
                    durationLabel(context, g.minutes),
                    ...g.amenities.map(
                      (a) => a == 'wifi'
                          ? l.travelWifi
                          : a == 'meal'
                          ? l.travelMeal
                          : a,
                    ),
                  ].whereType<String>().join(' · '),
                  style: t.ui(11.5, color: t.muted),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${g.arriveTime} · ${g.to.code}',
                style: t.ui(17, weight: FontWeight.w800),
              ),
              Text(g.to.airport ?? g.to.city, style: t.ui(12, color: t.muted)),
            ],
          ),
        ),
      ],
    );
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            TravelTopBar(
              t: t,
              title: option.outbound.carrier.name,
              subtitle:
                  '${option.inbound == null ? _stopsLabel(context, option.outbound) : l.travelBothWays(_stopsLabel(context, option.outbound))} · ${l.travelAdults(search.adults)}',
            ),
            TravelCard(
              t: t,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  legBlock(option.outbound, l.travelOut),
                  if (option.inbound != null) ...[
                    Divider(height: 24, color: t.line),
                    legBlock(option.inbound!, l.travelBack),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Text(
                    l.travelChooseFare,
                    style: t.ui(17, weight: FontWeight.w800),
                  ),
                ),
                Text(
                  option.inbound == null
                      ? l.travelPerPerson
                      : l.travelPerPersonReturn,
                  style: t.ui(12, weight: FontWeight.w700, color: t.muted),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final f in option.fares) ...[
                  Expanded(
                    child: _FareCard(
                      fare: f,
                      t: t,
                      on: f.id == choice.fareId,
                      onTap: f.available
                          ? () => ref
                                .read(tripChoiceProvider.notifier)
                                .set(choice.copyWith(fareId: f.id))
                          : null,
                    ),
                  ),
                  if (f != option.fares.last) const SizedBox(width: 8),
                ],
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: fare == null
          ? null
          : TravelPriceBar(
              t: t,
              price: '${fare.priceFormatted} × ${search.adults}',
              caption: l.travelFareTravellers(fare.name, search.adults),
              button: TravelButton(
                t: t,
                label:
                    option.outbound.hasSeatMap ||
                        (option.inbound?.hasSeatMap ?? false)
                    ? l.travelChooseSeats
                    : l.travelContinue,
                onPressed: () => context.push(
                  option.outbound.hasSeatMap
                      ? TravelPaths.seats
                      : (option.inbound?.hasSeatMap ?? false)
                      ? '${TravelPaths.seats}?back=1'
                      : TravelPaths.extras,
                ),
              ),
            ),
    );
  }
}

class _FareCard extends StatelessWidget {
  const _FareCard({
    required this.fare,
    required this.t,
    required this.on,
    this.onTap,
  });
  final TravelFare fare;
  final TravelTokens t;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final fg = on ? t.onInk : t.text;
    Widget line(bool yes, String text) => Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 14,
            child: Text(
              yes ? '✓' : '–',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: yes ? t.ok : t.danger,
              ),
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: t.ui(
                11.5,
                weight: FontWeight.w700,
                color: fg,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
    return Semantics(
      button: true,
      selected: on,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Opacity(
          opacity: fare.available ? 1 : 0.5,
          child: Container(
            constraints: const BoxConstraints(minHeight: 196),
            padding: const EdgeInsets.fromLTRB(10, 12, 10, 12),
            decoration: BoxDecoration(
              color: on ? t.ink : t.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: on ? t.ink : t.line, width: on ? 2 : 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(fare.name, color: on ? t.gold : t.goldText),
                const SizedBox(height: 4),
                FittedBox(
                  child: Text(
                    fare.priceFormatted,
                    style: t.serif(22, color: fg),
                  ),
                ),
                line(true, l.travelCabinKg(fare.cabinKg)),
                line(
                  fare.bags > 0,
                  fare.bags > 0
                      ? l.travelBagsKg(fare.bags, fare.bagKg)
                      : l.travelNoCheckedBag,
                ),
                line(
                  fare.changeAllowed,
                  fare.changeAllowed
                      ? (fare.changeFeeFormatted == null
                            ? l.travelFreeChanges
                            : l.travelChangeFor(fare.changeFeeFormatted!))
                      : l.travelNoChanges,
                ),
                line(
                  fare.refundAllowed && fare.refundFeeFormatted == null,
                  fare.refundAllowed
                      ? (fare.refundFeeFormatted == null
                            ? l.travelFullRefund
                            : l.travelRefundAtFee)
                      : l.travelNoRefund,
                ),
                line(
                  fare.seat != 'fee',
                  fare.seat == 'any'
                      ? l.travelAnySeat
                      : fare.seat == 'standard'
                      ? l.travelStandardSeat
                      : l.travelSeatAtFee,
                ),
                if (fare.seatsLeft != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      l.travelSeatsLeft(fare.seatsLeft!),
                      style: t.ui(
                        11,
                        weight: FontWeight.w800,
                        color: on ? t.gold : t.danger,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 126 Flights · Seats: each traveller's seat on the plane's map, extra legroom at its price.
class SeatMapScreen extends ConsumerStatefulWidget {
  const SeatMapScreen({super.key, this.back = false});

  /// The flight back of a return.
  final bool back;

  @override
  ConsumerState<SeatMapScreen> createState() => _SeatMapScreenState();
}

class _SeatMapScreenState extends ConsumerState<SeatMapScreen> {
  int _active = 0;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final choice = ref.watch(tripChoiceProvider);
    final search = ref.watch(flightSearchProvider);
    final leg = widget.back ? choice.flight?.inbound : choice.flight?.outbound;
    if (leg == null) {
      return Scaffold(
        backgroundColor: t.page,
        body: MessageView(
          icon: Symbols.airline_seat_recline_normal_rounded,
          title: l.travelChooseFlightFirst,
        ),
      );
    }
    final seats = [...(widget.back ? choice.seatsBack : choice.seatsOut)];
    while (seats.length < search.adults) {
      seats.add(null);
    }
    final map = ref.watch(seatMapProvider(leg.flightId));
    void next() {
      if (!widget.back && (choice.flight?.inbound?.hasSeatMap ?? false)) {
        context.push('${TravelPaths.seats}?back=1');
      } else {
        context.push(TravelPaths.extras);
      }
    }

    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            TravelTopBar(
              t: t,
              title: l.travelSeatsOn(route(leg.from.code, leg.to.code)),
              subtitle: [
                leg.number,
                leg.aircraft,
              ].whereType<String>().join(' · '),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  for (var i = 0; i < search.adults; i++) ...[
                    Expanded(
                      child: Semantics(
                        button: true,
                        selected: i == _active,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => setState(() => _active = i),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: t.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: i == _active ? t.ink : t.line,
                                width: i == _active ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: i == _active ? t.ink : t.goldSoft,
                                    borderRadius: BorderRadius.circular(11),
                                  ),
                                  child: Text(
                                    seats[i] ?? '–',
                                    style: t.ui(
                                      12,
                                      weight: FontWeight.w800,
                                      color: i == _active
                                          ? t.onInk
                                          : t.goldText,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Flexible(
                                  child: Text(
                                    l.travelTravellerN(i + 1),
                                    style: t.ui(13, weight: FontWeight.w800),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (i < search.adults - 1) const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
            Expanded(
              child: map.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => MessageView(
                  icon: Symbols.airline_seat_recline_normal_rounded,
                  title: l.travelSeatsAtAirport,
                  actionLabel: l.travelContinue,
                  onAction: next,
                ),
                data: (m) => ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: [
                    Center(
                      child: Container(
                        width: 300,
                        padding: const EdgeInsets.fromLTRB(10, 64, 10, 20),
                        decoration: BoxDecoration(
                          color: t.surface,
                          border: Border.all(color: t.line),
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(150),
                            bottom: Radius.circular(28),
                          ),
                        ),
                        child: Directionality(
                          textDirection: TextDirection.ltr,
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  for (final c in m.columns)
                                    SizedBox(
                                      width: c.isEmpty ? 26 : 40,
                                      child: Text(
                                        c,
                                        textAlign: TextAlign.center,
                                        style: t.ui(
                                          11,
                                          weight: FontWeight.w800,
                                          color: t.muted,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              for (final row in m.rows)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 7),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      for (final (i, c) in m.columns.indexed)
                                        if (c.isEmpty)
                                          SizedBox(
                                            width: 26,
                                            child: Text(
                                              '${row.number}',
                                              textAlign: TextAlign.center,
                                              style: t.ui(
                                                11,
                                                weight: FontWeight.w800,
                                                color: t.muted,
                                              ),
                                            ),
                                          )
                                        else
                                          Builder(
                                            builder: (context) {
                                              final seatIndex = m.columns
                                                  .sublist(0, i)
                                                  .where((x) => x.isNotEmpty)
                                                  .length;
                                              final s = row.seats[seatIndex];
                                              final owner = seats.indexOf(s.id);
                                              final mine = owner >= 0;
                                              return Padding(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 3,
                                                    ),
                                                child: Semantics(
                                                  button: !s.taken,
                                                  label: s.taken
                                                      ? l.travelSeatTaken(s.id)
                                                      : (row.extraLegroom
                                                            ? l.travelSeatExtra(
                                                                s.id,
                                                              )
                                                            : s.id),
                                                  selected: mine,
                                                  child: GestureDetector(
                                                    onTap: s.taken || mine
                                                        ? null
                                                        : () {
                                                            final next = [
                                                              ...seats,
                                                            ]..[_active] = s.id;
                                                            ref
                                                                .read(
                                                                  tripChoiceProvider
                                                                      .notifier,
                                                                )
                                                                .set(
                                                                  widget.back
                                                                      ? choice.copyWith(
                                                                          seatsBack:
                                                                              next,
                                                                        )
                                                                      : choice.copyWith(
                                                                          seatsOut:
                                                                              next,
                                                                        ),
                                                                );
                                                            setState(
                                                              () => _active =
                                                                  (_active +
                                                                      1) %
                                                                  search.adults,
                                                            );
                                                          },
                                                    child: Container(
                                                      width: 34,
                                                      height: 34,
                                                      alignment:
                                                          Alignment.center,
                                                      decoration: BoxDecoration(
                                                        color: mine
                                                            ? t.ink
                                                            : (s.taken
                                                                  ? (t.dark
                                                                        ? t.line
                                                                        : const Color(
                                                                            0xFFEFE9DE,
                                                                          ))
                                                                  : (row.extraLegroom
                                                                        ? t.goldSoft
                                                                        : t.surface)),
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              9,
                                                            ),
                                                        border: Border.all(
                                                          color: mine
                                                              ? t.ink
                                                              : (s.taken
                                                                    ? Colors
                                                                          .transparent
                                                                    : (row.extraLegroom
                                                                          ? t.gold
                                                                          : t.line)),
                                                        ),
                                                      ),
                                                      child: Text(
                                                        mine
                                                            ? '${owner + 1}'
                                                            : (s.taken
                                                                  ? ''
                                                                  : c),
                                                        style: t.ui(
                                                          11,
                                                          weight:
                                                              FontWeight.w800,
                                                          color: mine
                                                              ? t.onInk
                                                              : (row.extraLegroom
                                                                    ? t.goldText
                                                                    : t.muted),
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 14,
                      children: [
                        _legend(t, t.surface, t.line, l.travelFree),
                        if (m.extraPriceFormatted != null)
                          _legend(
                            t,
                            t.goldSoft,
                            t.gold,
                            l.travelExtraLegroom(m.extraPriceFormatted!),
                          ),
                        _legend(
                          t,
                          t.dark ? t.line : const Color(0xFFEFE9DE),
                          Colors.transparent,
                          l.travelTaken,
                        ),
                      ],
                    ),
                    if (m.seatPriceFormatted != null &&
                        choice.fare?.seat == 'fee')
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          l.travelSeatFee(m.seatPriceFormatted!),
                          textAlign: TextAlign.center,
                          style: t.ui(12, color: t.muted),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: TravelPriceBar(
        t: t,
        caption: l.travelSeatsNext,
        button: TravelButton(t: t, label: l.travelContinue, onPressed: next),
      ),
    );
  }

  Widget _legend(TravelTokens t, Color bg, Color border, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(color: border),
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: t.ui(12, weight: FontWeight.w700)),
    ],
  );
}

/// 126 The extra bags and meals, before paying.
class ExtrasScreen extends ConsumerWidget {
  const ExtrasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final choice = ref.watch(tripChoiceProvider);
    final search = ref.watch(flightSearchProvider);
    final legs = choice.flight?.inbound == null ? 1 : 2;
    Widget stepper(
      IconData icon,
      String title,
      String text,
      int value,
      int max,
      ValueChanged<int> set,
    ) => TravelCard(
      t: t,
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: t.seaSoft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: t.sea),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: t.ui(15, weight: FontWeight.w800)),
                Text(text, style: t.ui(12, color: t.muted)),
              ],
            ),
          ),
          IconButton.outlined(
            tooltip: l.travelLess,
            onPressed: value > 0 ? () => set(value - 1) : null,
            icon: const Icon(Symbols.remove_rounded),
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: t.ui(17, weight: FontWeight.w800),
            ),
          ),
          IconButton.outlined(
            tooltip: l.travelMore,
            onPressed: value < max ? () => set(value + 1) : null,
            icon: const Icon(Symbols.add_rounded),
          ),
        ],
      ),
    );
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            TravelTopBar(
              t: t,
              title: l.travelBagsMeals,
              subtitle: l.travelBagsMealsText,
            ),
            stepper(
              Symbols.luggage_rounded,
              l.travelExtraBags,
              l.travelExtraBagsText(legs),
              choice.bags,
              search.adults * 2 * legs,
              (v) => ref
                  .read(tripChoiceProvider.notifier)
                  .set(choice.copyWith(bags: v)),
            ),
            const SizedBox(height: 10),
            stepper(
              Symbols.restaurant_rounded,
              l.travelMeals,
              l.travelMealsText(legs),
              choice.meals,
              search.adults * legs,
              (v) => ref
                  .read(tripChoiceProvider.notifier)
                  .set(choice.copyWith(meals: v)),
            ),
          ],
        ),
      ),
      bottomNavigationBar: TravelPriceBar(
        t: t,
        button: TravelButton(
          t: t,
          label: l.travelContinue,
          onPressed: () => context.push(
            choice.hotel != null ? TravelPaths.bundle : TravelPaths.book,
          ),
        ),
      ),
    );
  }
}
