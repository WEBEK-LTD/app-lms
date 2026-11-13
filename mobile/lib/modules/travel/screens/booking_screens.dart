import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/json.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../../real_estate/widgets/listing_widgets.dart' show SignInPrompt;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/travel_providers.dart';
import '../travel_paths.dart';
import '../widgets/travel_pickers.dart';
import '../widgets/travel_ui.dart';
import '../widgets/travel_words.dart';
import 'flight_screens.dart' show carrierTile;

/// 126 Booking and after: a stay and a flight as one trip, the checkout,
/// the trips, a trip in one place, the boarding passes, changing or
/// cancelling, and reviewing the stay.

/// 126 Both · Stay + Flight: the flights both ways and the stay, chosen for the trip, with one price and what it saves.
class BundleScreen extends ConsumerStatefulWidget {
  const BundleScreen({super.key});

  @override
  ConsumerState<BundleScreen> createState() => _BundleScreenState();
}

class _BundleScreenState extends ConsumerState<BundleScreen> {
  bool _picking = false;
  String? _problem;
  TravelQuote? _quote;
  Json? _quoted;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _pick());
  }

  /// The best flight both ways and the best stay of the city, when the person hasn't chosen them.
  Future<void> _pick() async {
    final l = context.l10n;
    final choice = ref.read(tripChoiceProvider);
    if (choice.flight != null && choice.room != null) return _price();
    setState(() => _picking = true);
    final api = ref.read(travelApiProvider);
    final stay = ref.read(staySearchProvider);
    final flights = ref.read(flightSearchProvider);
    try {
      var next = choice;
      if (next.flight == null && flights.ready) {
        final found = await api.flights(flights.query);
        final best = found.items
            .where((o) => o.fares.any((f) => f.available))
            .firstOrNull;
        if (best != null) {
          final fare =
              best.fares
                  .where((f) => f.available && f.id == 'standard')
                  .firstOrNull ??
              best.fares.firstWhere((f) => f.available);
          next = next.copyWith(flight: best, fareId: fare.id);
        }
      }
      if (next.room == null) {
        final hotels = await api.hotels(stay.query);
        final hotel = hotels.items.where((h) => h.price != null).firstOrNull;
        if (hotel != null) {
          final page = await api.hotel(hotel.id, stay.stayQuery);
          final room = page.rooms
              .where((r) => r.available && r.rates.any((x) => x.price != null))
              .firstOrNull;
          final rate =
              room?.rates
                  .where((x) => x.price != null && x.refundable)
                  .firstOrNull ??
              room?.rates.where((x) => x.price != null).firstOrNull;
          if (room != null && rate != null) {
            next = next.copyWith(hotel: page, room: room, rate: rate);
          }
        }
      }
      ref.read(tripChoiceProvider.notifier).set(next);
      if (next.flight == null || next.room == null) {
        _problem = next.flight == null
            ? l.travelNoTripFlight
            : l.travelNoTripStay;
      }
    } on ApiException catch (e) {
      _problem = e.message;
    }
    if (mounted) setState(() => _picking = false);
    await _price();
  }

  Future<void> _price() async {
    final choice = ref.read(tripChoiceProvider);
    if (choice.flight == null && choice.room == null) return;
    final body = choice.body(
      ref.read(staySearchProvider),
      ref.read(flightSearchProvider),
    );
    if (jsonEncode(body) == jsonEncode(_quoted)) return;
    _quoted = body;
    try {
      final q = await ref.read(travelApiProvider).quote(body);
      if (mounted) {
        setState(() {
          _quote = q;
          _problem = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _problem = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final choice = ref.watch(tripChoiceProvider);
    final stay = ref.watch(staySearchProvider);
    final flights = ref.watch(flightSearchProvider);
    final config = ref.watch(travelConfigProvider);
    ref.listen(tripChoiceProvider, (_, _) => _price());
    final out = choice.flight?.outbound;
    final back = choice.flight?.inbound;
    Widget legRow(TravelLeg g) => Row(
      children: [
        Flexible(
          flex: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(g.departTime, style: t.ui(17, weight: FontWeight.w800)),
              Text(
                '${shortDay(g.departDay)} · ${g.from.code}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: t.ui(11.5, color: t.muted),
              ),
            ],
          ),
        ),
        Expanded(
          flex: 2,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Column(
              children: [
                Text(
                  g.stops == 0
                      ? durationLabel(context, g.minutes)
                      : l.travelViaTime(
                          g.via ?? '',
                          durationLabel(context, g.minutes),
                        ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: t.ui(11.5, color: t.muted),
                ),
                Container(
                  height: 1,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  color: t.line,
                ),
              ],
            ),
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(g.arriveTime, style: t.ui(17, weight: FontWeight.w800)),
            Text(g.to.code, style: t.ui(11.5, color: t.muted)),
          ],
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
              title: route(
                flights.from?.city ?? '',
                flights.to?.city ?? stay.city ?? '',
              ),
              subtitle:
                  '${dayRange(stay.checkIn, stay.checkOut)} · ${l.travelAdults(flights.adults)} · ${l.travelRooms(stay.rooms)}',
              trailing: TravelIconButton(
                icon: Symbols.notifications_rounded,
                label: l.travelWatchTrip,
                t: t,
                onTap: () => _watch(context),
              ),
            ),
            if (_picking)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (_problem != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  _problem!,
                  style: t.ui(14, weight: FontWeight.w700, color: t.danger),
                ),
              ),
            Container(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              decoration: BoxDecoration(
                color: const Color(0xFF0E1424),
                borderRadius: BorderRadius.circular(26),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: 40,
                    child: CustomPaint(painter: _ArcPainter(t.gold)),
                  ),
                  Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            out?.from.code ?? flights.from?.code ?? '',
                            style: t.serif(26, color: Colors.white),
                          ),
                          Text(
                            out?.from.city ?? '',
                            style: t.ui(11.5, color: const Color(0xFFC7CAD5)),
                          ),
                        ],
                      ),
                      Expanded(
                        child: out == null
                            ? const SizedBox()
                            : Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                ),
                                child: Center(
                                  child: TravelPill(
                                    out.stops == 0
                                        ? '${l.travelDirect} · ${durationLabel(context, out.minutes)}'
                                        : '${l.travelStops(out.stops)} · ${durationLabel(context, out.minutes)}',
                                    t: t,
                                    tone: PillTone.glass,
                                  ),
                                ),
                              ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            out?.to.code ?? flights.to?.code ?? '',
                            style: t.serif(26, color: Colors.white),
                          ),
                          Text(
                            out?.to.city ?? '',
                            style: t.ui(11.5, color: const Color(0xFFC7CAD5)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Divider(
                    height: 28,
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Eyebrow(l.travelOnePrice, color: t.gold),
                            Text(
                              _quote?.totalFormatted ?? '—',
                              style: t.serif(32, color: Colors.white),
                            ),
                            Text(
                              l.travelOnePriceText(
                                flights.adults,
                                stay.nights ?? 0,
                              ),
                              style: t.ui(11.5, color: const Color(0xFFC7CAD5)),
                            ),
                          ],
                        ),
                      ),
                      if (_quote?.savingFormatted != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: t.gold,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            l.travelSave(_quote!.savingFormatted!),
                            style: t.ui(
                              12,
                              weight: FontWeight.w800,
                              color: const Color(0xFF0E1424),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (out != null)
              TravelCard(
                t: t,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        TravelPill(
                          l.travelTabFlights,
                          t: t,
                          tone: PillTone.sea,
                          icon: Symbols.flight_rounded,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${out.carrier.name} · ${choice.fare?.name ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.ui(13, weight: FontWeight.w800),
                          ),
                        ),
                        TextButton(
                          onPressed: () =>
                              context.push(TravelPaths.flightResults),
                          child: Text(l.travelChange),
                        ),
                      ],
                    ),
                    legRow(out),
                    if (back != null) ...[
                      const SizedBox(height: 8),
                      legRow(back),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      children: [
                        if (choice.fare != null)
                          TravelPill(
                            choice.fare!.bags > 0
                                ? l.travelBagIncluded(choice.fare!.bagKg)
                                : l.travelCabinOnly,
                            t: t,
                            tone: choice.fare!.bags > 0
                                ? PillTone.ok
                                : PillTone.coral,
                          ),
                        TravelPill(
                          l.travelChooseSeats,
                          t: t,
                          tone: PillTone.gold,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            if (choice.hotel != null && choice.room != null)
              TravelCard(
                t: t,
                padding: const EdgeInsets.all(10),
                onTap: () => context.push(TravelPaths.hotel(choice.hotel!.id)),
                child: Row(
                  children: [
                    SizedBox(
                      width: 104,
                      height: 118,
                      child: TravelPhoto(
                        url: choice.hotel!.photoUrls.firstOrNull,
                        radius: 16,
                        scrim: false,
                        label: choice.hotel!.name,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              TravelPill(
                                l.travelStay,
                                t: t,
                                tone: PillTone.gold,
                                icon: Symbols.bed_rounded,
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: () => context.push(TravelPaths.hotels),
                                child: Text(
                                  l.travelChange,
                                  style: t.ui(
                                    13,
                                    weight: FontWeight.w800,
                                    color: t.ink,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            choice.hotel!.name,
                            style: t.ui(15, weight: FontWeight.w800),
                          ),
                          Text(
                            '${choice.hotel!.area ?? choice.hotel!.city} · ${choice.room!.name}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.ui(12, color: t.muted),
                          ),
                          if (choice.hotel!.score != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Row(
                                children: [
                                  ScoreBadge(choice.hotel!.score!, t: t),
                                  const SizedBox(width: 6),
                                  Text(
                                    scoreWord(context, choice.hotel!.score!),
                                    style: t.ui(13, weight: FontWeight.w800),
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      l.travelReviews(choice.hotel!.reviews),
                                      style: t.ui(11.5, color: t.muted),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (choice.rate != null)
                            Text(
                              [
                                boardName(context, choice.rate!.board),
                                if (choice.rate!.freeCancelUntil != null)
                                  l.travelFreeCancelUntil(
                                    shortDay(
                                      parseIsoDate(
                                        choice.rate!.freeCancelUntil!,
                                      ),
                                    ),
                                  ),
                              ].join(' · '),
                              style: t.ui(
                                11.5,
                                weight: FontWeight.w800,
                                color: t.ok,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            if (config.transfer != null) ...[
              const SizedBox(height: 12),
              TravelCard(
                t: t,
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                child: SizedBox(
                  height: 52,
                  child: Row(
                    children: [
                      Icon(Symbols.airport_shuttle_rounded, color: t.text),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l.travelTransfer,
                              style: t.ui(14, weight: FontWeight.w800),
                            ),
                            if (config.transfer!.note != null)
                              Text(
                                config.transfer!.note!,
                                style: t.ui(11.5, color: t.muted),
                              ),
                          ],
                        ),
                      ),
                      Text(
                        '+${config.transfer!.priceFormatted}',
                        style: t.ui(14, weight: FontWeight.w800),
                      ),
                      const SizedBox(width: 10),
                      TravelToggle(
                        t: t,
                        on: choice.transfer,
                        label: l.travelTransfer,
                        onChanged: (v) => ref
                            .read(tripChoiceProvider.notifier)
                            .set(choice.copyWith(transfer: v)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: _quote == null
          ? null
          : TravelPriceBar(
              t: t,
              price: _quote!.totalFormatted,
              caption: l.travelTotalFor(flights.adults),
              button: TravelButton(
                t: t,
                label: l.travelReserveTrip,
                onPressed: choice.flight == null || choice.room == null
                    ? null
                    : () => context.push(TravelPaths.book),
              ),
            ),
    );
  }

  Future<void> _watch(BuildContext context) async {
    final l = context.l10n;
    final flights = ref.read(flightSearchProvider);
    final stay = ref.read(staySearchProvider);
    if (!ref.read(authControllerProvider).isSignedIn) {
      return showMessage(context, l.travelSignInToWatch);
    }
    if (flights.from == null || flights.to == null) return;
    try {
      await ref.read(travelApiProvider).addAlert({
        'kind': 'trip',
        'from': flights.from!.code,
        'to': flights.to!.code,
        'month': stay.checkIn == null
            ? null
            : isoDate(stay.checkIn!).substring(0, 7),
        'nights': stay.nights,
        'travellers': flights.adults,
      });
      ref.invalidate(travelAlertsProvider);
      if (context.mounted) showMessage(context, l.travelTracking);
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }
}

class _ArcPainter extends CustomPainter {
  _ArcPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.07, size.height)
      ..cubicTo(
        size.width * 0.3,
        -size.height * 0.4,
        size.width * 0.7,
        -size.height * 0.4,
        size.width * 0.93,
        size.height,
      );
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 9) {
        canvas.drawPath(metric.extractPath(d, d + 4), paint);
      }
      final mid = metric.getTangentForOffset(metric.length * 0.5);
      if (mid != null) {
        final icon = TextPainter(
          text: TextSpan(
            text: String.fromCharCode(Symbols.flight_rounded.codePoint),
            style: TextStyle(
              fontFamily: Symbols.flight_rounded.fontFamily,
              package: Symbols.flight_rounded.fontPackage,
              fontSize: 20,
              color: color,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        canvas.save();
        canvas.translate(mid.position.dx, mid.position.dy);
        canvas.rotate(1.5708);
        icon.paint(canvas, Offset(-icon.width / 2, -icon.height / 2));
        canvas.restore();
      }
    }
  }

  @override
  bool shouldRepaint(covariant _ArcPainter old) => old.color != color;
}

/// 126 Hotels · Checkout, and a flight's or a trip's: who travels, how they pay, the price line by line.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _first = <TextEditingController>[];
  final _last = <TextEditingController>[];
  final _requests = <String>{};
  bool _atHotel = false;
  bool _busy = false;
  TravelQuote? _quote;
  String? _problem;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).user;
    final choice = ref.read(tripChoiceProvider);
    final count = choice.flight == null
        ? 1
        : ref.read(flightSearchProvider).adults;
    final parts = (user?.name ?? '').trim().split(RegExp(r'\s+'));
    for (var i = 0; i < count; i++) {
      _first.add(
        TextEditingController(
          text: i == 0 && parts.isNotEmpty ? parts.first : '',
        ),
      );
      _last.add(
        TextEditingController(
          text: i == 0 && parts.length > 1 ? parts.sublist(1).join(' ') : '',
        ),
      );
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _price());
  }

  @override
  void dispose() {
    for (final c in [..._first, ..._last]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _price() async {
    try {
      final q = await ref
          .read(travelApiProvider)
          .quote(
            ref
                .read(tripChoiceProvider)
                .body(
                  ref.read(staySearchProvider),
                  ref.read(flightSearchProvider),
                ),
          );
      if (mounted) {
        setState(() {
          _quote = q;
          _problem = null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _problem = e.message);
    }
  }

  Future<void> _book() async {
    final l = context.l10n;
    final user = ref.read(authControllerProvider).user;
    if (user == null) {
      context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': GoRouterState.of(context).uri.toString()},
        ).toString(),
      );
      return;
    }
    if ([..._first, ..._last].any((c) => c.text.trim().isEmpty)) {
      return showMessage(context, l.travelNamesNeeded);
    }
    setState(() => _busy = true);
    final api = ref.read(travelApiProvider);
    try {
      final body = {
        ...ref
            .read(tripChoiceProvider)
            .body(ref.read(staySearchProvider), ref.read(flightSearchProvider)),
        'travellers': [
          for (var i = 0; i < _first.length; i++)
            {
              'first_name': _first[i].text.trim(),
              'last_name': _last[i].text.trim(),
            },
        ],
        'contact': {
          'name': user.name,
          'email': user.email,
          'phone': user.phone.isEmpty ? null : user.phone,
        },
        'requests': _requests.toList(),
        'payment': _atHotel ? 'at_hotel' : 'now',
      };
      final booking = await api.book(body);
      ref.invalidate(travelBookingsProvider);
      if (!mounted) return;
      if (booking.dueFormatted != null) {
        final url = await api.pay(booking.id);
        if (!mounted) return;
        final paid = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: url,
            title: l.checkout,
            completesOn: isOrderReceived,
          ),
        );
        if (!mounted) return;
        if (paid == true) showMessage(context, l.travelBooked);
      } else {
        showMessage(context, l.travelBooked);
      }
      ref.read(tripChoiceProvider.notifier).clear();
      ref.invalidate(travelBookingsProvider);
      context.go(TravelPaths.trip(booking.id));
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
    final choice = ref.watch(tripChoiceProvider);
    final stay = ref.watch(staySearchProvider);
    final user = ref.watch(authControllerProvider).user;
    final config = ref.watch(travelConfigProvider);
    final canAtHotel = (_quote?.payAtHotel ?? false) && choice.flight == null;
    final payNow = _quote?.payNow ?? config.payNow;
    if (!payNow && canAtHotel && !_atHotel) _atHotel = true;
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            TravelTopBar(
              t: t,
              title: l.travelConfirmPay,
              subtitle: l.travelSecureCheckout,
            ),
            if (choice.hotel != null)
              TravelCard(
                t: t,
                padding: const EdgeInsets.all(10),
                radius: 20,
                child: Row(
                  children: [
                    SizedBox(
                      width: 64,
                      height: 64,
                      child: TravelPhoto(
                        url: choice.hotel!.photoUrls.firstOrNull,
                        radius: 14,
                        scrim: false,
                        label: choice.hotel!.name,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            choice.hotel!.name,
                            style: t.ui(14, weight: FontWeight.w800),
                          ),
                          Text(
                            '${choice.room?.name ?? ''} · ${choice.rate?.name ?? ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.ui(12, color: t.muted),
                          ),
                          Text(
                            '${shortDay(stay.checkIn)} → ${shortDay(stay.checkOut)}',
                            style: t.ui(12, weight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                    if (choice.hotel!.score != null)
                      ScoreBadge(choice.hotel!.score!, t: t),
                  ],
                ),
              ),
            if (choice.flight != null) ...[
              const SizedBox(height: 10),
              TravelCard(
                t: t,
                radius: 20,
                child: Row(
                  children: [
                    carrierTile(t, choice.flight!.outbound.carrier),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${choice.flight!.outbound.number} · ${route(choice.flight!.outbound.from.code, choice.flight!.outbound.to.code)}',
                            style: t.ui(14, weight: FontWeight.w800),
                          ),
                          Text(
                            '${shortDay(choice.flight!.outbound.departDay)} ${choice.flight!.outbound.departTime}${choice.flight!.inbound == null ? '' : ' · ${shortDay(choice.flight!.inbound!.departDay)} ${choice.flight!.inbound!.departTime}'}',
                            style: t.ui(12, color: t.muted),
                          ),
                          Text(
                            choice.fare?.name ?? '',
                            style: t.ui(12, weight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 10),
            TravelCard(
              t: t,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          choice.flight == null
                              ? l.travelGuest
                              : l.travelTravellersAsPassport,
                          style: t.ui(14, weight: FontWeight.w800),
                        ),
                      ),
                      if (user != null)
                        TravelPill(
                          l.travelSavedTraveller,
                          t: t,
                          tone: PillTone.sea,
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (user != null && choice.flight == null)
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: t.gold,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            user.name.isEmpty
                                ? ''
                                : user.name.characters.first.toUpperCase(),
                            style: t.ui(
                              14,
                              weight: FontWeight.w800,
                              color: const Color(0xFF0E1424),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.name,
                                style: t.ui(14, weight: FontWeight.w800),
                              ),
                              Text(
                                [user.email, user.phone]
                                    .whereType<String>()
                                    .where((x) => x.isNotEmpty)
                                    .join(' · '),
                                style: t.ui(12, color: t.muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  if (choice.flight != null || user == null)
                    for (var i = 0; i < _first.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _first[i],
                                textCapitalization: TextCapitalization.words,
                                decoration: InputDecoration(
                                  labelText: l.travelFirstName(i + 1),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _last[i],
                                textCapitalization: TextCapitalization.words,
                                decoration: InputDecoration(
                                  labelText: l.travelLastName,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  if (choice.hotel != null) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final r in const [
                          'late_arrival',
                          'high_floor',
                          'airport_pickup',
                          'quiet_room',
                        ])
                          TravelChip(
                            t: t,
                            label: requestName(context, r),
                            selected: _requests.contains(r),
                            onTap: () => setState(
                              () => _requests.contains(r)
                                  ? _requests.remove(r)
                                  : _requests.add(r),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 10),
            TravelCard(
              t: t,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (canAtHotel && payNow)
                    TravelSegments<bool>(
                      t: t,
                      values: const [false, true],
                      selected: _atHotel,
                      label: (v) => v ? l.travelPayAtHotel : l.travelPayNow,
                      onChanged: (v) => setState(() => _atHotel = v),
                    ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 26,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0E1424),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(
                          _atHotel
                              ? Symbols.apartment_rounded
                              : Symbols.credit_card_rounded,
                          size: 16,
                          color: t.gold,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _atHotel ? l.travelAtHotelText : l.travelPayNowText,
                          style: t.ui(13, weight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            if (_problem != null)
              Text(
                _problem!,
                style: t.ui(14, weight: FontWeight.w700, color: t.danger),
              ),
            if (_quote != null) _Lines(quote: _quote!, t: t),
          ],
        ),
      ),
      bottomNavigationBar: _quote == null
          ? null
          : Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                12,
                20,
                12 + MediaQuery.paddingOf(context).bottom,
              ),
              child: TravelButton(
                t: t,
                busy: _busy,
                icon: Symbols.lock_rounded,
                label: _atHotel
                    ? l.travelConfirmAtHotel
                    : l.travelConfirmAndPay(_quote!.totalFormatted),
                onPressed: _book,
              ),
            ),
    );
  }
}

class _Lines extends StatelessWidget {
  const _Lines({required this.quote, required this.t});
  final TravelQuote quote;
  final TravelTokens t;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return TravelCard(
      t: t,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final line in quote.lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      lineLabel(context, line),
                      style: t.ui(
                        13,
                        weight: line.kind == 'member' || line.kind == 'bundle'
                            ? FontWeight.w800
                            : FontWeight.w500,
                        color: line.kind == 'member' || line.kind == 'bundle'
                            ? t.goldText
                            : t.muted,
                      ),
                    ),
                  ),
                  Text(
                    line.amountFormatted,
                    style: t.ui(
                      13,
                      weight: FontWeight.w700,
                      color: line.kind == 'member' || line.kind == 'bundle'
                          ? t.goldText
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          Divider(color: t.line),
          Row(
            children: [
              Expanded(
                child: Text(
                  l.travelTotal,
                  style: t.ui(15, weight: FontWeight.w800),
                ),
              ),
              Text(quote.totalFormatted, style: t.serif(22)),
            ],
          ),
          if (quote.freeCancelUntil != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l.travelFreeCancelUntilHotel(
                  shortDay(parseIsoDate(quote.freeCancelUntil!)),
                ),
                style: t.ui(12, weight: FontWeight.w800, color: t.ok),
              ),
            ),
        ],
      ),
    );
  }
}

/// 126 Trips (and Bookings for hotels only): the next trip in full, the others under it, the past ones.
class TripsScreen extends ConsumerWidget {
  const TripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final hotelsOnly =
        ref.watch(travelConfigProvider).mode == TravelMode.hotels;
    if (!signedIn) {
      return Scaffold(
        backgroundColor: t.page,
        body: SafeArea(
          child: SignInPrompt(
            icon: Symbols.luggage_rounded,
            title: hotelsOnly ? l.travelBookingsSignIn : l.travelTripsSignIn,
            message: l.travelTripsSignInText,
            from: TravelPaths.trips,
          ),
        ),
      );
    }
    final upcoming = ref.watch(travelBookingsProvider(false));
    final past = ref.watch(travelBookingsProvider(true));
    return travelAsync(
      upcoming,
      onRetry: () => ref.invalidate(travelBookingsProvider(false)),
      (data) {
        final next = data.items
            .where((b) => b.status != 'cancelled')
            .firstOrNull;
        if (next != null) {
          return TripView(
            booking: next,
            others: data.items.where((b) => b != next).toList(),
            past: past.value?.items ?? const [],
            tab: true,
          );
        }
        return Scaffold(
          backgroundColor: t.page,
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (!StudioScreenScope.hidesTitleOf(context)) ...[
                  Text(
                    hotelsOnly ? l.travelTabBookings : l.travelTabTrips,
                    style: t.serif(28),
                  ),
                  const SizedBox(height: 12),
                ],
                MessageView(
                  icon: Symbols.luggage_rounded,
                  title: l.travelNoTrips,
                  message: l.travelNoTripsText,
                  compact: true,
                ),
                for (final b in past.value?.items ?? const <TravelBooking>[])
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: _BookingRow(b: b, t: t),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _BookingRow extends StatelessWidget {
  const _BookingRow({required this.b, required this.t});
  final TravelBooking b;
  final TravelTokens t;

  @override
  Widget build(BuildContext context) {
    final title =
        b.stay?.hotelName ??
        (b.flights.isEmpty
            ? b.reference
            : route(b.flights.first.from.city, b.flights.first.to.city));
    return TravelCard(
      t: t,
      padding: const EdgeInsets.all(10),
      onTap: () => context.push(TravelPaths.trip(b.id)),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            height: 52,
            child: TravelPhoto(
              url: b.stay?.photoUrl,
              radius: 14,
              scrim: false,
              label: title,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: t.ui(14, weight: FontWeight.w800)),
                Text(
                  '${b.reference} · ${_statusName(context, b.status)}',
                  style: t.ui(12, color: t.muted),
                ),
              ],
            ),
          ),
          Text(b.totalFormatted, style: t.ui(14, weight: FontWeight.w800)),
          if (b.status == 'cancelled') ...[
            const SizedBox(width: 6),
            Icon(Symbols.cancel_rounded, size: 18, color: t.muted),
          ],
          Icon(
            Directionality.of(context) == TextDirection.rtl
                ? Symbols.chevron_left_rounded
                : Symbols.chevron_right_rounded,
            color: t.muted,
          ),
        ],
      ),
    );
  }
}

String _statusName(BuildContext context, String status) {
  final l = context.l10n;
  return switch (status) {
    'awaiting_payment' => l.travelAwaitingPayment,
    'cancelled' => l.travelCancelled,
    'completed' => l.travelCompleted,
    _ => l.travelConfirmed,
  };
}

/// 126 A booking's own page (opened from a notification or the list).
class TripScreen extends ConsumerWidget {
  const TripScreen({super.key, required this.bookingId});
  final int bookingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    return Scaffold(
      backgroundColor: t.page,
      body: travelAsync(
        ref.watch(travelBookingProvider(bookingId)),
        onRetry: () => ref.invalidate(travelBookingProvider(bookingId)),
        (b) => TripView(booking: b),
      ),
    );
  }
}

/// 126 Both · Your trip: the photo and the countdown, then the flight, the transfer, the check-in and the way back, one under the other.
class TripView extends ConsumerWidget {
  const TripView({
    super.key,
    required this.booking,
    this.others = const [],
    this.past = const [],
    this.tab = false,
  });
  final TravelBooking booking;
  final List<TravelBooking> others;
  final List<TravelBooking> past;
  final bool tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final base = travelTokens(context, ref);
    // The trip is drawn by night, as approved.
    final t = base.dark ? base : nightTokens(base);
    final l = context.l10n;
    final b = booking;
    final starts = DateTime.tryParse(
      b.starts.length == 10 ? '${b.starts}T00:00' : b.starts,
    );
    final left = starts?.difference(DateTime.now());
    final city =
        b.stay?.city ?? (b.flights.isEmpty ? '' : b.flights.first.to.city);
    final travellers = b.travellers.length;
    final steps = <Widget>[];
    void step(
      IconData icon,
      Color bg,
      Color fg,
      String when,
      Widget body, {
      bool last = false,
    }) => steps.add(
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 34,
              child: Column(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: bg,
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(icon, size: 18, color: fg),
                  ),
                  if (!last)
                    Expanded(
                      child: Container(
                        width: 2,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        color: const Color(0xFF2A3350),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      when.toUpperCase(),
                      style: t.ui(11.5, weight: FontWeight.w800, color: t.gold),
                    ),
                    const SizedBox(height: 6),
                    body,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
    Widget panel(Widget child) => Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1B2338),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF2A3350)),
      ),
      child: child,
    );
    Widget fact(String k, String v) => Padding(
      padding: const EdgeInsetsDirectional.only(end: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(k, style: t.ui(11, color: const Color(0xFF9AA0B2))),
          Text(
            v,
            style: t.ui(14, weight: FontWeight.w800, color: Colors.white),
          ),
        ],
      ),
    );
    for (final g in b.flights.where((f) => f.leg == 'out')) {
      step(
        Symbols.flight_takeoff_rounded,
        const Color(0xFF1F6F8B),
        Colors.white,
        '${shortDay(g.departDay)} · ${g.departTime}',
        _flightPanel(context, t, b, g, panel, fact),
      );
    }
    if (b.hasTransfer) {
      step(
        Symbols.airport_shuttle_rounded,
        const Color(0xFF2A3350),
        Colors.white,
        '${b.flights.firstOrNull?.arriveTime ?? ''} · ${l.travelTransfer}',
        Text(
          b.transferNote ?? l.travelTransfer,
          style: t.ui(14, weight: FontWeight.w800, color: Colors.white),
        ),
      );
    }
    if (b.stay case final s?) {
      step(
        Symbols.bed_rounded,
        t.gold,
        const Color(0xFF0E1424),
        '${s.checkInTime} · ${l.travelCheckIn}',
        panel(
          Row(
            children: [
              SizedBox(
                width: 58,
                height: 58,
                child: TravelPhoto(
                  url: s.photoUrl,
                  radius: 14,
                  scrim: false,
                  label: s.hotelName,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.hotelName,
                      style: t.ui(
                        14,
                        weight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      '${dayRange(parseIsoDate(s.checkIn), parseIsoDate(s.checkOut))} · ${s.roomName}',
                      style: t.ui(12, color: const Color(0xFFB4B8C6)),
                    ),
                    Text(
                      boardName(context, s.board),
                      style: t.ui(12, color: const Color(0xFFB4B8C6)),
                    ),
                  ],
                ),
              ),
              TravelIconButton(
                icon: Symbols.chat_rounded,
                label: l.travelMessageHotel,
                t: t,
                glass: true,
                onTap: () => context.push(Paths.chat),
              ),
            ],
          ),
        ),
        last: !b.flights.any((f) => f.leg == 'back'),
      );
    }
    for (final g in b.flights.where((f) => f.leg == 'back')) {
      step(
        Symbols.flight_land_rounded,
        const Color(0xFF1F6F8B),
        Colors.white,
        '${shortDay(g.departDay)} · ${g.departTime}',
        _flightPanel(context, t, b, g, panel, fact),
        last: true,
      );
    }
    return Theme(
      data: Theme.of(context).copyWith(brightness: Brightness.dark),
      child: Scaffold(
        backgroundColor: const Color(0xFF0E1424),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(travelBookingsProvider);
            ref.invalidate(travelBookingProvider(b.id));
          },
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              SizedBox(
                height: 300,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(url: b.stay?.photoUrl, semanticLabel: city),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Color(0x800E1424),
                            Color(0x000E1424),
                            Color(0x660E1424),
                            Color(0xFF0E1424),
                          ],
                          stops: [0, 0.35, 0.6, 1],
                        ),
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        child: Row(
                          children: [
                            if (!tab)
                              TravelIconButton(
                                icon:
                                    Directionality.of(context) ==
                                        TextDirection.rtl
                                    ? Symbols.chevron_right_rounded
                                    : Symbols.chevron_left_rounded,
                                label: l.travelBack,
                                t: t,
                                glass: true,
                                onTap: () => context.canPop()
                                    ? context.pop()
                                    : context.go(TravelPaths.trips),
                              ),
                            if (!tab) const SizedBox(width: 10),
                            Expanded(
                              child: Eyebrow(
                                tab
                                    ? l.travelTripsUpcoming(1 + others.length)
                                    : b.reference,
                                color: const Color(0xFFF3E8D4),
                              ),
                            ),
                            TravelIconButton(
                              icon: Symbols.tune_rounded,
                              label: l.travelManage,
                              t: t,
                              glass: true,
                              onTap: () =>
                                  context.push(TravelPaths.manage(b.id)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      start: 20,
                      end: 20,
                      bottom: 18,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (left != null &&
                              !left.isNegative &&
                              b.status != 'cancelled')
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: t.accent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  l.travelStartsIn(
                                    left.inDays,
                                    left.inHours % 24,
                                  ),
                                  style: t.ui(
                                    13,
                                    weight: FontWeight.w800,
                                    color: const Color(0xFFF3E8D4),
                                  ),
                                ),
                              ],
                            ),
                          if (b.status != 'confirmed' &&
                              b.status != 'completed')
                            Text(
                              _statusName(context, b.status),
                              style: t.ui(
                                13,
                                weight: FontWeight.w800,
                                color: t.accent,
                              ),
                            ),
                          const SizedBox(height: 8),
                          Text(
                            city,
                            style: t.serif(
                              40,
                              weight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              if (b.stay != null)
                                TravelPill(
                                  dayRange(
                                    parseIsoDate(b.stay!.checkIn),
                                    parseIsoDate(b.stay!.checkOut),
                                  ),
                                  t: t,
                                  tone: PillTone.glass,
                                )
                              else if (b.flights.isNotEmpty)
                                TravelPill(
                                  shortDay(b.flights.first.departDay),
                                  t: t,
                                  tone: PillTone.glass,
                                ),
                              TravelPill(
                                l.travelTravellersCount(travellers),
                                t: t,
                                tone: PillTone.glass,
                              ),
                              TravelPill(
                                b.totalFormatted,
                                t: t,
                                tone: PillTone.glass,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (b.dueFormatted != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: TravelButton(
                          t: t,
                          gold: true,
                          label: l.travelPayDue(b.dueFormatted!),
                          onPressed: () => payBooking(context, ref, b.id),
                        ),
                      ),
                    ...steps,
                    if (b.stay?.canReview ?? false)
                      TravelButton(
                        t: t,
                        gold: true,
                        icon: Symbols.star_rounded,
                        label: l.travelReviewStay,
                        onPressed: () => context.push(TravelPaths.review(b.id)),
                      ),
                    for (final o in [...others, ...past])
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Theme(
                          data: Theme.of(context),
                          child: _BookingRow(b: o, t: t),
                        ),
                      ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _flightPanel(
    BuildContext context,
    TravelTokens t,
    TravelBooking b,
    TravelLeg g,
    Widget Function(Widget) panel,
    Widget Function(String, String) fact,
  ) {
    final l = context.l10n;
    final late = g.status == 'delayed' || g.status == 'cancelled';
    return panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  route(g.from.city, g.to.city),
                  style: t.ui(16, weight: FontWeight.w800, color: Colors.white),
                ),
              ),
              TravelPill(
                flightStatusName(context, g.status),
                t: t,
                tone: late ? PillTone.coral : PillTone.ok,
              ),
            ],
          ),
          Text(g.number, style: t.ui(12.5, color: const Color(0xFFB4B8C6))),
          if (g.statusNote != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                g.statusNote!,
                style: t.ui(
                  12.5,
                  weight: FontWeight.w700,
                  color: const Color(0xFFFFD2C2),
                ),
              ),
            ),
          const SizedBox(height: 10),
          Wrap(
            runSpacing: 8,
            children: [
              if (g.from.terminal != null)
                fact(l.travelTerminalLabel, g.from.terminal!),
              fact(l.travelGate, g.gate ?? '—'),
              fact(
                l.travelSeatsLabel,
                g.seats.whereType<String>().join(' · ').isEmpty
                    ? '—'
                    : g.seats.whereType<String>().join(' · '),
              ),
              fact(l.travelBoards, g.boardsAt ?? '—'),
            ],
          ),
          const SizedBox(height: 12),
          TravelButton(
            t: t,
            gold: true,
            height: 44,
            label: l.travelBoardingPasses,
            onPressed: b.passesOpen
                ? () => context.push(TravelPaths.passes(b.id))
                : null,
          ),
          if (!b.passesOpen)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l.travelPassesLater,
                style: t.ui(11.5, color: const Color(0xFF9AA0B2)),
              ),
            ),
        ],
      ),
    );
  }
}

/// The night tokens of the dark screens (the trip, the boarding pass), whatever the phone's theme.
TravelTokens nightTokens(TravelTokens day) => TravelTokens(
  dark: true,
  page: const Color(0xFF0E1424),
  surface: const Color(0xFF1B2338),
  line: const Color(0xFF2A3350),
  text: const Color(0xFFF4EFE6),
  muted: const Color(0xFFB4B8C6),
  ink: day.gold,
  onInk: const Color(0xFF0E1424),
  gold: day.gold,
  goldSoft: day.gold.withValues(alpha: 0.18),
  goldText: day.gold,
  sea: const Color(0xFF6FB9D2),
  seaSoft: const Color(0x471F6F8B),
  ok: const Color(0xFF6FD3A0),
  okSoft: const Color(0x471B7A4B),
  danger: const Color(0xFFFF9C80),
  accent: day.accent,
  display: day.display,
);

/// Pays what is due on a booking on the company's payment page, then reloads it.
Future<void> payBooking(BuildContext context, WidgetRef ref, int id) async {
  final l = context.l10n;
  try {
    final url = await ref.read(travelApiProvider).pay(id);
    if (!context.mounted) return;
    final paid = await context.push<bool>(
      Paths.web,
      extra: WebPageArgs(
        url: url,
        title: l.checkout,
        completesOn: isOrderReceived,
      ),
    );
    if (!context.mounted) return;
    if (paid == true) showMessage(context, l.travelBooked);
  } on ApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
  }
  ref.invalidate(travelBookingProvider(id));
  ref.invalidate(travelBookingsProvider);
}

/// 126 Flights · Boarding pass: each traveller's, the flight's live status and gate; kept on the phone to show without a connection.
class BoardingPassScreen extends ConsumerStatefulWidget {
  const BoardingPassScreen({super.key, required this.bookingId});
  final int bookingId;

  @override
  ConsumerState<BoardingPassScreen> createState() => _BoardingPassScreenState();
}

class _BoardingPassScreenState extends ConsumerState<BoardingPassScreen> {
  List<TravelBoardingPass>? _kept;
  int _at = 0;

  String get _key => 'travel.passes.${widget.bookingId}';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      final raw = p.getString(_key);
      if (raw == null || !mounted) return;
      try {
        setState(
          () => _kept = [
            for (final j in jsonDecode(raw) as List)
              TravelBoardingPass.fromJson(asJson(j)),
          ],
        );
      } on Object {
        // A pass kept by an older version: shown again once fetched.
      }
    });
  }

  Future<void> _keep(List<TravelBoardingPass> passes, Object raw) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(raw));
  }

  @override
  Widget build(BuildContext context) {
    final base = travelTokens(context, ref);
    final t = base.dark ? base : nightTokens(base);
    final l = context.l10n;
    final fetched = ref.watch(boardingPassesProvider(widget.bookingId));
    final passes = fetched.value ?? _kept;
    ref.listen(boardingPassesProvider(widget.bookingId), (_, next) {
      final value = next.value;
      if (value != null) {
        _keep(value, [
          for (final p in value)
            {
              'leg': p.leg,
              'passenger': p.passenger,
              'seat': p.seat,
              'group': p.group,
              'fare_name': p.fareName,
              'code': p.code,
              'flight': {
                'flight_id': p.flight.flightId,
                'number': p.flight.number,
                'carrier': {
                  'name': p.flight.carrier.name,
                  'code': p.flight.carrier.code,
                  'color': p.flight.carrier.color,
                },
                'from': {
                  'code': p.flight.from.code,
                  'city': p.flight.from.city,
                },
                'to': {'code': p.flight.to.code, 'city': p.flight.to.city},
                'departs': p.flight.departs,
                'arrives': p.flight.arrives,
                'status': p.flight.status,
                'status_note': p.flight.statusNote,
                'gate': p.flight.gate,
                'boards_at': p.flight.boardsAt,
              },
            },
        ]);
      }
    });
    return Scaffold(
      backgroundColor: const Color(0xFF0E1424),
      body: SafeArea(
        child: Column(
          children: [
            TravelTopBar(
              t: t,
              light: true,
              title: l.travelBoardingPasses,
              subtitle: passes == null
                  ? null
                  : l.travelPassOf(_at + 1, passes.length),
            ),
            Expanded(
              child: passes == null
                  ? (fetched.hasError
                        ? ErrorView(
                            error: fetched.error!,
                            onRetry: () => ref.invalidate(
                              boardingPassesProvider(widget.bookingId),
                            ),
                          )
                        : const Center(child: CircularProgressIndicator()))
                  : PageView(
                      onPageChanged: (i) => setState(() => _at = i),
                      children: [
                        for (final p in passes)
                          _Pass(pass: p, t: t, bookingId: widget.bookingId),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pass extends StatelessWidget {
  const _Pass({required this.pass, required this.t, required this.bookingId});
  final TravelBoardingPass pass;
  final TravelTokens t;
  final int bookingId;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = pass.flight;
    const ink = Color(0xFF0E1424);
    final light = TravelTokens(
      dark: false,
      page: const Color(0xFFF7F3EC),
      surface: Colors.white,
      line: const Color(0xFFE6DFD2),
      text: ink,
      muted: const Color(0xFF5F6472),
      ink: ink,
      onInk: Colors.white,
      gold: t.gold,
      goldSoft: const Color(0xFFF3E8D4),
      goldText: const Color(0xFF7F5B1C),
      sea: const Color(0xFF1F6F8B),
      seaSoft: const Color(0xFFE1F0F4),
      ok: const Color(0xFF1B7A4B),
      okSoft: const Color(0xFFE2F3EA),
      danger: const Color(0xFFB2381A),
      accent: t.accent,
      display: t.display,
    );
    Widget fact(String k, String v, {Color? color}) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            k,
            style: light.ui(11.5, weight: FontWeight.w800, color: light.muted),
          ),
          Text(
            v,
            style: light.ui(18, weight: FontWeight.w800, color: color),
          ),
        ],
      ),
    );
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        if (f.statusNote != null || f.gate != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: t.accent.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: t.accent.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: t.accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    f.statusNote ??
                        l.travelGateStatus(
                          f.gate!,
                          flightStatusName(context, f.status),
                        ),
                    style: t.ui(
                      13,
                      weight: FontWeight.w800,
                      color: const Color(0xFFFFD2C2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: ColoredBox(
            color: const Color(0xFFF7F3EC),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          carrierTile(light, f.carrier, size: 30),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${f.carrier.name} · ${f.number}',
                              style: light.ui(13, weight: FontWeight.w800),
                            ),
                          ),
                          TravelPill(
                            flightStatusName(context, f.status),
                            t: light,
                            tone:
                                f.status == 'delayed' || f.status == 'cancelled'
                                ? PillTone.coral
                                : PillTone.ok,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                f.from.code,
                                style: light.serif(46, height: 1),
                              ),
                              Text(
                                '${f.from.city} · ${f.departTime}',
                                style: light.ui(11.5, color: light.muted),
                              ),
                            ],
                          ),
                          Expanded(
                            child: SizedBox(
                              height: 40,
                              child: CustomPaint(painter: _ArcPainter(ink)),
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                f.to.code,
                                style: light.serif(46, height: 1),
                              ),
                              Text(
                                '${f.to.city} · ${f.arriveTime}',
                                style: light.ui(11.5, color: light.muted),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: CustomPaint(
                    size: const Size(double.infinity, 2),
                    painter: _DashPainter(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          fact(
                            l.travelGate,
                            f.gate ?? '—',
                            color: light.danger,
                          ),
                          fact(l.travelBoards, f.boardsAt ?? '—'),
                          fact(l.travelSeat, pass.seat ?? '—'),
                          fact(l.travelGroup, '${pass.group}'),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.travelPassenger,
                                  style: light.ui(
                                    11.5,
                                    weight: FontWeight.w800,
                                    color: light.muted,
                                  ),
                                ),
                                Text(
                                  pass.passenger,
                                  style: light.ui(15, weight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                l.travelClass,
                                style: light.ui(
                                  11.5,
                                  weight: FontWeight.w800,
                                  color: light.muted,
                                ),
                              ),
                              Text(
                                pass.fareName,
                                style: light.ui(15, weight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Semantics(
                          label: l.travelPassCode,
                          child: QrImageView(
                            data: pass.code,
                            size: 150,
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TravelButton(
                t: t,
                gold: true,
                height: 50,
                icon: Symbols.offline_pin_rounded,
                label: l.travelWorksOffline,
                onPressed: () => showMessage(context, l.travelKeptOffline),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 50,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B2338),
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF2A3350)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => context.push(TravelPaths.manage(bookingId)),
                  child: Text(l.travelChangeSeat),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DashPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color(0xFFD9D1C2)
      ..strokeWidth = 2;
    for (var x = 0.0; x < size.width; x += 10) {
      canvas.drawLine(Offset(x, 0), Offset(x + 5, 0), p);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 126 Changing or cancelling a booking from the app: new dates for the stay, seats, cancelling with what it refunds.
class ManageBookingScreen extends ConsumerStatefulWidget {
  const ManageBookingScreen({super.key, required this.bookingId});
  final int bookingId;

  @override
  ConsumerState<ManageBookingScreen> createState() =>
      _ManageBookingScreenState();
}

class _ManageBookingScreenState extends ConsumerState<ManageBookingScreen> {
  bool _busy = false;

  Future<void> _run(Future<TravelBooking> Function() op, String done) async {
    setState(() => _busy = true);
    try {
      await op();
      ref.invalidate(travelBookingProvider(widget.bookingId));
      ref.invalidate(travelBookingsProvider);
      if (mounted) showMessage(context, done);
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
    final api = ref.read(travelApiProvider);
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        child: travelAsync(
          ref.watch(travelBookingProvider(widget.bookingId)),
          (b) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              TravelTopBar(t: t, title: l.travelManage, subtitle: b.reference),
              TravelCard(
                t: t,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final line in b.lines)
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              lineLabel(context, line),
                              style: t.ui(13, color: t.muted),
                            ),
                          ),
                          Text(
                            line.amountFormatted,
                            style: t.ui(13, weight: FontWeight.w700),
                          ),
                        ],
                      ),
                    Divider(color: t.line),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l.travelTotal,
                            style: t.ui(15, weight: FontWeight.w800),
                          ),
                        ),
                        Text(b.totalFormatted, style: t.serif(20)),
                      ],
                    ),
                    if (b.paidFormatted != null)
                      Text(
                        l.travelPaid(b.paidFormatted!),
                        style: t.ui(12.5, color: t.ok, weight: FontWeight.w800),
                      ),
                    if (b.dueFormatted != null)
                      Text(
                        l.travelDue(b.dueFormatted!),
                        style: t.ui(
                          12.5,
                          color: t.danger,
                          weight: FontWeight.w800,
                        ),
                      ),
                    if (b.refundFormatted != null)
                      Text(
                        l.travelRefund(b.refundFormatted!),
                        style: t.ui(
                          12.5,
                          color: t.goldText,
                          weight: FontWeight.w800,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (b.dueFormatted != null) ...[
                TravelButton(
                  t: t,
                  label: l.travelPayDue(b.dueFormatted!),
                  onPressed: () => payBooking(context, ref, b.id),
                ),
                const SizedBox(height: 10),
              ],
              if (b.stay != null && b.canChange && b.stay!.refundable)
                TravelCard(
                  t: t,
                  onTap: _busy
                      ? null
                      : () async {
                          final range = await pickDates(
                            context,
                            from: parseIsoDate(b.stay!.checkIn),
                            to: parseIsoDate(b.stay!.checkOut),
                          );
                          if (range == null) return;
                          await _run(
                            () => api.change(b.id, {
                              'check_in': isoDate(range.start),
                              'check_out': isoDate(range.end),
                            }),
                            l.travelChanged,
                          );
                        },
                  child: Row(
                    children: [
                      Icon(Symbols.calendar_month_rounded, color: t.text),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l.travelChangeDates,
                              style: t.ui(15, weight: FontWeight.w800),
                            ),
                            Text(
                              l.travelChangeDatesText,
                              style: t.ui(12, color: t.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              for (final g in b.flights)
                if (g.hasSeatMap && b.status == 'confirmed' ||
                    g.hasSeatMap && b.status == 'awaiting_payment')
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: TravelCard(
                      t: t,
                      onTap: _busy ? null : () => _seats(context, b, g),
                      child: Row(
                        children: [
                          Icon(
                            Symbols.airline_seat_recline_normal_rounded,
                            color: t.text,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.travelChangeSeatOn(g.number),
                                  style: t.ui(15, weight: FontWeight.w800),
                                ),
                                Text(
                                  l.travelSeatsOf(
                                    g.seats
                                            .whereType<String>()
                                            .join(', ')
                                            .isEmpty
                                        ? '—'
                                        : g.seats.whereType<String>().join(
                                            ', ',
                                          ),
                                  ),
                                  style: t.ui(12, color: t.muted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              const SizedBox(height: 18),
              if (b.canCancel)
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: t.danger,
                    minimumSize: const Size.fromHeight(50),
                    side: BorderSide(color: t.danger),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: _busy
                      ? null
                      : () async {
                          final ok = await confirmAction(
                            context,
                            title: l.travelCancelTitle,
                            message: b.cancelRefundFormatted == null
                                ? l.travelCancelNoRefund
                                : l.travelCancelRefund(
                                    b.cancelRefundFormatted!,
                                  ),
                            confirmLabel: l.travelCancelBooking,
                            destructive: true,
                          );
                          if (ok) {
                            await _run(
                              () => api.cancel(b.id),
                              l.travelCancelledDone,
                            );
                          }
                        },
                  icon: const Icon(Symbols.cancel_rounded),
                  label: Text(l.travelCancelBooking),
                )
              else if (b.status == 'cancelled')
                Text(
                  b.refundFormatted == null
                      ? l.travelCancelled
                      : l.travelCancelledRefund(b.refundFormatted!),
                  style: t.ui(14, weight: FontWeight.w800, color: t.muted),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _seats(
    BuildContext context,
    TravelBooking b,
    TravelLeg g,
  ) async {
    final l = context.l10n;
    final map = await ref
        .read(seatMapProvider(g.flightId).future)
        .catchError((_) => const TravelSeatMap(flightId: 0));
    if (!context.mounted || map.rows.isEmpty) return;
    final picked = <String?>[...g.seats];
    final free = [
      for (final r in map.rows)
        ...r.seats
            .where((s) => !s.taken || g.seats.contains(s.id))
            .map((s) => s.id),
    ];
    final chosen = await showModalBottomSheet<List<String?>>(
      context: context,
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, set) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < picked.length; i++)
                  DropdownButtonFormField<String?>(
                    initialValue: picked[i],
                    decoration: InputDecoration(
                      labelText: b.travellers.length > i
                          ? b.travellers[i]
                          : l.travelTravellerN(i + 1),
                    ),
                    items: [
                      DropdownMenuItem(
                        value: null,
                        child: Text(l.travelAtAirport),
                      ),
                      for (final s in free)
                        DropdownMenuItem(value: s, child: Text(s)),
                    ],
                    onChanged: (v) => set(() => picked[i] = v),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(picked),
                  child: Text(l.travelDone),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (chosen == null) return;
    await _run(
      () =>
          ref.read(travelApiProvider).changeSeats(b.id, g.leg ?? 'out', chosen),
      l.travelChanged,
    );
  }
}

/// 126 Reviewing the stay after check-out: a score, the parts, the kind of trip, a few words.
class ReviewStayScreen extends ConsumerStatefulWidget {
  const ReviewStayScreen({super.key, required this.bookingId});
  final int bookingId;

  @override
  ConsumerState<ReviewStayScreen> createState() => _ReviewStayScreenState();
}

class _ReviewStayScreenState extends ConsumerState<ReviewStayScreen> {
  final _scores = {
    'score': 9,
    'staff': 9,
    'clean': 9,
    'location': 9,
    'value': 8,
  };
  String? _trip;
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final names = {
      'score': l.travelOverall,
      'staff': l.travelScoreStaff,
      'clean': l.travelScoreClean,
      'location': l.travelScoreLocation,
      'value': l.travelScoreValue,
    };
    final trips = {
      'couple': l.travelTripCouple,
      'family': l.travelTripFamily,
      'friends': l.travelTripFriends,
      'solo': l.travelTripSolo,
      'business': l.travelTripBusiness,
    };
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            TravelTopBar(t: t, title: l.travelReviewStay),
            for (final e in names.entries)
              TravelCard(
                t: t,
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            e.value,
                            style: t.ui(14, weight: FontWeight.w800),
                          ),
                        ),
                        ScoreBadge(_scores[e.key]!.toDouble(), t: t),
                      ],
                    ),
                    Slider(
                      value: _scores[e.key]!.toDouble(),
                      min: 1,
                      max: 10,
                      divisions: 9,
                      label: '${_scores[e.key]}',
                      onChanged: (v) =>
                          setState(() => _scores[e.key] = v.round()),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in trips.entries)
                  TravelChip(
                    t: t,
                    label: e.value,
                    selected: _trip == e.key,
                    onTap: () =>
                        setState(() => _trip = _trip == e.key ? null : e.key),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _text,
              maxLines: 4,
              maxLength: 600,
              decoration: InputDecoration(labelText: l.travelReviewWords),
            ),
            const SizedBox(height: 10),
            TravelButton(
              t: t,
              busy: _busy,
              label: l.travelSendReview,
              onPressed: () async {
                setState(() => _busy = true);
                try {
                  await ref.read(travelApiProvider).review(widget.bookingId, {
                    ..._scores,
                    'trip': _trip,
                    'text': _text.text.trim().isEmpty
                        ? null
                        : _text.text.trim(),
                  });
                  ref.invalidate(travelBookingProvider(widget.bookingId));
                  if (!context.mounted) return;
                  showMessage(context, l.travelThanksReview);
                  context.pop();
                } on ApiException catch (e) {
                  if (context.mounted) showMessage(context, e.message);
                } finally {
                  if (mounted) setState(() => _busy = false);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
