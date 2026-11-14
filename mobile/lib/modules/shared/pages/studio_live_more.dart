part of 'studio_live.dart';

/// 130.11 The live element's more looks (platform/web/src/lib/pages/
/// types.ts `STUDIO_TRACKING_STYLES`; Studio's canvas: components/studio/
/// tracking-more.tsx): the person's next trip in a travel app (the days
/// over its legs, its city over the first flight as a boarding pass, one
/// line, the days large), the free taxis around as a card (the nearest
/// one's minutes) or a headline (their count), and a ride's minutes to the
/// pickup large with the driver, the plate and a call button. Nothing
/// without one, as the others.

/// The signed-in person's next trip in a travel app: their soonest booking
/// still to come, not cancelled; null otherwise (or when it can't be read).
final studioNextTripProvider = FutureProvider.autoDispose<TravelBooking?>((
  ref,
) async {
  final gate = ref.watch(appGateProvider);
  if (gate is! GateReady || gate.config.travel == null) return null;
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  try {
    final page = await ref.watch(travelBookingsProvider(false).future);
    TravelBooking? next;
    for (final b in page.items) {
      final at = b.startsAt;
      if (b.cancelled || at == null) continue;
      if (next == null || at.isBefore(next.startsAt!)) next = b;
    }
    return next;
  } on Object {
    return null;
  }
});

const _mono = 'JetBrains Mono';

/// One leg of a trip: its icon, its day and a note (the flight, the city).
typedef _Leg = ({String icon, String day, String note});

/// What the trip's looks say, read from the booking.
class _TripFacts {
  _TripFacts(BuildContext context, this.trip, DateTime now) {
    final l = context.l10n;
    final stay = trip.stay;
    final out = trip.flights.firstOrNull;
    final back = trip.flights.length > 1 ? trip.flights.last : null;
    city = (stay?.city.isNotEmpty ?? false) ? stay!.city : (out?.to.city ?? '');
    final at = trip.startsAt?.toLocal() ?? now;
    days = math.max(
      0,
      DateTime(
        at.year,
        at.month,
        at.day,
      ).difference(DateTime(now.year, now.month, now.day)).inDays,
    );
    hotel = stay?.hotelName ?? '';
    nights = stay == null ? '' : l.travelNights(stay.nights);
    final board = stay == null ? '' : boardName(context, stay.board);
    stayLine = [nights, board].where((s) => s.isNotEmpty).join(' · ');
    String day(String iso) => switch (DateTime.tryParse(
      iso.length >= 10 ? iso.substring(0, 10) : '',
    )) {
      final DateTime d => '${shortWeekday(d)} ${d.day}',
      null => '',
    };
    legs = [
      if (out != null)
        (icon: 'flight_takeoff', day: day(out.departs), note: out.number),
      if (trip.hasTransfer)
        (
          icon: 'airport_shuttle',
          day: out != null ? day(out.arrives) : day(stay?.checkIn ?? ''),
          note: l.studioTripTransfer,
        ),
      if (stay != null) (icon: 'hotel', day: nights, note: stay.city),
      if (back != null)
        (icon: 'flight_land', day: day(back.departs), note: back.number),
    ].take(4).toList();
    flight = out;
  }

  final TravelBooking trip;
  late final String city;
  late final int days;
  late final String hotel;
  late final String nights;
  late final String stayLine;
  late final List<_Leg> legs;
  late final TravelLeg? flight;
}

class _TripView extends ConsumerWidget {
  const _TripView({required this.trip, required this.look});

  final TravelBooking trip;
  final StudioTrackingStyle look;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final ink = DefaultTextStyle.of(context).style.color ?? p.text;
    final accent = p.accent;
    final f = _TripFacts(context, trip, ref.watch(pageClockProvider)());
    void open() => context.push(TravelPaths.trip(trip.id));
    if (look == StudioTrackingStyle.line) {
      return InkWell(
        key: const ValueKey('studio-trip-line'),
        onTap: open,
        child: Row(
          children: [
            AppIcon(symbolByName('flight'), size: 18, color: accent),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                [
                  f.city,
                  l.studioTripIn(f.days),
                  f.hotel,
                ].where((s) => s.isNotEmpty).join(' · '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: ink),
              ),
            ),
          ],
        ),
      );
    }
    final head = Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          '${f.days}',
          style: TextStyle(
            fontSize: 56,
            height: 0.86,
            fontWeight: FontWeight.w700,
            letterSpacing: -2.6,
            color: accent,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l.studioTripDaysTo(f.days, f.city).toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.8,
                  color: accent,
                ),
              ),
              if (f.hotel.isNotEmpty)
                Text(
                  f.hotel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
              if (f.stayLine.isNotEmpty)
                Text(
                  f.stayLine,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: ink.withValues(alpha: 0.75),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
    if (look == StudioTrackingStyle.headline) {
      return InkWell(
        key: const ValueKey('studio-trip-headline'),
        onTap: open,
        child: head,
      );
    }
    if (look == StudioTrackingStyle.ticket && f.flight != null) {
      return _TripTicket(facts: f, flight: f.flight!, onOpen: open);
    }
    return InkWell(
      key: const ValueKey('studio-trip-card'),
      onTap: open,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          head,
          if (f.legs.isNotEmpty) ...[
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (i, leg) in f.legs.indexed) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 3,
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: i == 0 ? 1 : 0.35),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            AppIcon(
                              symbolByName(leg.icon),
                              size: 15,
                              color: accent,
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                leg.day,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: ink,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          leg.note,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: _mono,
                            fontSize: 10,
                            color: ink.withValues(alpha: 0.75),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The trip's city large over its first flight as a boarding pass.
class _TripTicket extends StatelessWidget {
  const _TripTicket({
    required this.facts,
    required this.flight,
    required this.onOpen,
  });

  final _TripFacts facts;
  final TravelLeg flight;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final ink = DefaultTextStyle.of(context).style.color ?? p.text;
    final accent = p.accent;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final card = p.surface;
    final cardInk = p.text;
    final soft = p.textSecondary;
    String when(String iso) => switch (DateTime.tryParse(
      iso.length >= 10 ? iso.substring(0, 10) : '',
    )) {
      final DateTime d => shortDayLabel(d),
      null => '',
    };
    final seats = flight.seats.whereType<String>().join(' ');
    final code = TextStyle(
      fontSize: 30,
      height: 1,
      fontWeight: FontWeight.w800,
      color: cardInk,
    );
    final via = flight.via;
    return InkWell(
      key: const ValueKey('studio-trip-ticket'),
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${l.studioTripNext} · ${l.studioTripIn(facts.days)}'.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              color: accent,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            facts.city,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 64,
              height: 0.95,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.2,
              color: ink,
            ),
          ),
          if (facts.hotel.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              l.studioTripStay(facts.nights, facts.hotel),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: ink.withValues(alpha: 0.92),
              ),
            ),
          ],
          const SizedBox(height: 18),
          Container(
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: dark ? 0.5 : 0.16),
                  blurRadius: 40,
                  offset: const Offset(0, 20),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 0),
                  // Airport codes read left to right in every language.
                  child: Directionality(
                    textDirection: TextDirection.ltr,
                    child: Row(
                      children: [
                        Text(flight.from.code, style: code),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Row(
                            children: [
                              Expanded(child: _Dashes(color: accent)),
                              const SizedBox(width: 6),
                              Flexible(
                                flex: 3,
                                child: Text(
                                  [
                                    flight.number,
                                    if (via != null && via.isNotEmpty)
                                      l.studioTripVia(via),
                                  ].join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: _mono,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: soft,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              RotatedBox(
                                quarterTurns: 1,
                                child: AppIcon(
                                  symbolByName('flight'),
                                  size: 18,
                                  color: accent,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Expanded(child: _Dashes(color: accent)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(flight.to.code, style: code),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(16, 4, 16, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _TimeAt(
                        time: flight.departTime,
                        day: when(flight.departs),
                        ink: cardInk,
                        soft: soft,
                      ),
                      _TimeAt(
                        time: flight.arriveTime,
                        day: when(flight.arrives),
                        ink: cardInk,
                        soft: soft,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _Dashes(color: soft.withValues(alpha: 0.4)),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(16, 10, 10, 12),
                  child: Row(
                    children: [
                      if (seats.isNotEmpty) ...[
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(text: '${l.travelSeatsLabel} '),
                              TextSpan(
                                text: seats,
                                style: TextStyle(
                                  fontFamily: _mono,
                                  fontWeight: FontWeight.w700,
                                  color: cardInk,
                                ),
                              ),
                            ],
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: soft,
                          ),
                        ),
                        const SizedBox(width: 14),
                      ],
                      if (flight.minutes > 0)
                        Text(
                          l.travelDuration(
                            flight.minutes ~/ 60,
                            (flight.minutes % 60).toString().padLeft(2, '0'),
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: soft,
                          ),
                        ),
                      const Spacer(),
                      Semantics(
                        button: true,
                        child: InkResponse(
                          key: const ValueKey('studio-trip-pass'),
                          onTap: () =>
                              context.push(TravelPaths.passes(facts.trip.id)),
                          child: Container(
                            height: 36,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: dark ? accent : cardInk,
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppIcon(
                                  symbolByName('qr_code_2'),
                                  size: 17,
                                  color: dark ? cardInk : card,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  l.studioTripPass,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: dark ? p.background : card,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeAt extends StatelessWidget {
  const _TimeAt({
    required this.time,
    required this.day,
    required this.ink,
    required this.soft,
  });

  final String time;
  final String day;
  final Color ink;
  final Color soft;

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(
          text: time,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: ink,
          ),
        ),
        if (day.isNotEmpty) TextSpan(text: ' · $day'),
      ],
    ),
    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: soft),
  );
}

/// A dashed line across.
class _Dashes extends StatelessWidget {
  const _Dashes({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: 2, child: CustomPaint(painter: _DashPainter(color)));
}

class _DashPainter extends CustomPainter {
  const _DashPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    for (var x = 0.0; x < size.width; x += 9) {
      canvas.drawLine(
        Offset(x, size.height / 2),
        Offset(math.min(x + 5, size.width), size.height / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}

/// A number large with its unit small after it ("1 min").
class _BigNumber extends StatelessWidget {
  const _BigNumber({required this.value, required this.unit, this.size = 64});

  final String value;
  final String unit;
  final double size;

  @override
  Widget build(BuildContext context) {
    final ink =
        DefaultTextStyle.of(context).style.color ?? context.palette.text;
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: size,
            height: 0.95,
            fontWeight: FontWeight.w800,
            letterSpacing: -size * 0.05,
            color: ink,
          ),
        ),
        const SizedBox(width: 3),
        Text(
          unit,
          style: TextStyle(
            fontSize: size / 3.4,
            fontWeight: FontWeight.w800,
            color: ink.withValues(alpha: 0.75),
          ),
        ),
      ],
    );
  }
}

/// The free taxis around: the nearest one's minutes large over how many
/// are around (a card), or their count in the second colour before the
/// words, at the element's font (a headline).
class _NearbyMore extends ConsumerWidget {
  const _NearbyMore({
    required this.at,
    required this.taxis,
    required this.headline,
  });

  final TaxiSpot at;
  final List<NearbyTaxi> taxis;
  final bool headline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final style = DefaultTextStyle.of(context).style;
    final ink = style.color ?? p.text;
    if (headline) {
      final size = style.fontSize ?? 44;
      return Text.rich(
        TextSpan(
          children: [
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: size * 0.14),
                margin: EdgeInsetsDirectional.only(end: size * 0.2),
                decoration: BoxDecoration(
                  color: p.accent,
                  borderRadius: BorderRadius.circular(size * 0.2),
                ),
                child: Text(
                  '${taxis.length}',
                  style: style.copyWith(color: p.onPrimary, height: 1.15),
                ),
              ),
            ),
            TextSpan(text: l.studioTaxisFreeAround(taxis.length)),
          ],
        ),
        key: const ValueKey('studio-tracking-nearby-headline'),
      );
    }
    double? nearest;
    for (final t in taxis) {
      final km = distanceKm(at, (lat: t.lat, lng: t.lng));
      if (nearest == null || km < nearest) nearest = km;
    }
    return Row(
      key: const ValueKey('studio-tracking-nearby-card'),
      children: [
        if (nearest != null) ...[
          _BigNumber(
            value: '${driveMinutes(nearest)}',
            unit: l.studioMinutesShort,
            size: 56,
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l.studioTaxiNearestFree,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: ink,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                l.studioTaxisAroundLive(taxis.length),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: ink.withValues(alpha: 0.72),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A ride's minutes to the pickup large (a car while there are none), the
/// driver, the plate and the car, and a button that calls them.
class _RideHeadline extends ConsumerWidget {
  const _RideHeadline({required this.ride, required this.live});

  final Ride ride;
  final _LiveFacts live;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final ink = DefaultTextStyle.of(context).style.color ?? p.text;
    final driver = ride.driver;
    final minutes = ride.pickupMinutes;
    final car = [
      driver?.carColor,
      driver?.carModel,
    ].whereType<String>().where((s) => s.isNotEmpty).join(' ');
    final rating = driver?.rating;
    final phone = live.phone;
    return InkWell(
      key: const ValueKey('studio-tracking-ride-headline'),
      onTap: () => context.push(live.open),
      child: Row(
        children: [
          if (minutes != null && ride.status == RideStatus.accepted)
            _BigNumber(value: '$minutes', unit: l.studioMinutesShort, size: 56)
          else
            AppIcon(symbolByName(live.icon), size: 40, color: p.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  (ride.status == RideStatus.accepted
                          ? l.studioRideOnTheWayShort
                          : live.title)
                      .toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                    color: p.primary,
                  ),
                ),
                Text(
                  live.name ?? ride.vehicleTypeName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
                if (driver != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        if (driver.plate case final plate?
                            when plate.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: ink.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              plate,
                              textDirection: TextDirection.ltr,
                              style: TextStyle(
                                fontFamily: _mono,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: ink,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        Flexible(
                          child: Text(
                            [
                              if (car.isNotEmpty) car,
                              if (rating != null) rating.toStringAsFixed(1),
                            ].join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: ink.withValues(alpha: 0.75),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (phone != null && phone.isNotEmpty) ...[
            const SizedBox(width: 12),
            Semantics(
              button: true,
              label: l.studioRideCall(live.name ?? ''),
              child: InkResponse(
                key: const ValueKey('studio-tracking-call'),
                onTap: () => ref.read(openExternalProvider)('tel:$phone'),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: ink.withValues(alpha: 0.18)),
                  ),
                  child: Icon(symbolByName('call'), size: 22, color: p.primary),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
