import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/widgets/common.dart';
import '../data/travel_providers.dart';
import '../travel_paths.dart';
import '../widgets/travel_pickers.dart';
import '../widgets/travel_ui.dart';
import '../widgets/travel_words.dart';
import 'hotel_screens.dart';

/// 126 The travel app's first tab: Explore as approved for both (stays,
/// flights or both in one search, and destinations with the whole trip's
/// price), the stays' home for hotels only (or the one hotel's page), the
/// flights' search for flights only.
class TravelExploreScreen extends ConsumerWidget {
  const TravelExploreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(travelConfigProvider);
    return switch (config.mode) {
      TravelMode.flights => const FlightsHomeScreen(),
      TravelMode.hotels =>
        config.singleHotelId != null
            ? HotelDetailScreen(hotelId: config.singleHotelId!, alone: true)
            : const StaysHomeScreen(),
      TravelMode.both => const _BothExplore(),
    };
  }
}

enum _SearchKind { stays, flights, trip }

/// The brand's name with its gold dot, and the word after it ("Stays").
Widget brandMark(
  BuildContext context,
  WidgetRef ref,
  TravelTokens t, {
  String? word,
  Color? color,
}) {
  final name = ref.watch(appEnvironmentProvider).build.appName;
  return Text.rich(
    TextSpan(
      children: [
        TextSpan(text: name),
        TextSpan(
          text: '.',
          style: TextStyle(color: t.gold),
        ),
        if (word != null)
          TextSpan(
            text: ' $word',
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontStyle: FontStyle.italic,
            ),
          ),
      ],
    ),
    style: t.serif(26, weight: FontWeight.w700, color: color),
  );
}

String greeting(BuildContext context, String? name) {
  final l = context.l10n;
  final hour = DateTime.now().hour;
  final first = (name ?? '').trim().split(RegExp(r'\s+')).first;
  final part = hour < 12
      ? l.travelMorning
      : (hour < 18 ? l.travelAfternoon : l.travelEvening);
  return first.isEmpty ? part : l.travelGreeting(part, first);
}

class _BothExplore extends ConsumerStatefulWidget {
  const _BothExplore();

  @override
  ConsumerState<_BothExplore> createState() => _BothExploreState();
}

class _BothExploreState extends ConsumerState<_BothExplore> {
  _SearchKind _kind = _SearchKind.trip;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final explore = ref.watch(travelExploreProvider);
    final user = ref.watch(authControllerProvider).user;
    final data = explore.value;
    final hero =
        data?.destinations
            .where((d) => d.photoUrl != null)
            .firstOrNull
            ?.photoUrl ??
        data?.featured
            .where((h) => h.photoUrls.isNotEmpty)
            .firstOrNull
            ?.photoUrls
            .first;
    return Scaffold(
      backgroundColor: t.page,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(travelExploreProvider),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            SizedBox(
              height: 392,
              child: TravelPhoto(
                url: hero,
                label: l.travelHeroPhoto,
                children: [
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: brandMark(
                                  context,
                                  ref,
                                  t,
                                  color: Colors.white,
                                ),
                              ),
                              TravelIconButton(
                                icon: Symbols.notifications_rounded,
                                label: l.travelPriceAlerts,
                                t: t,
                                glass: true,
                                onTap: () => context.push(TravelPaths.alerts),
                              ),
                              const SizedBox(width: 10),
                              InkWell(
                                onTap: () => context.go(Paths.account),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: t.gold,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: user == null
                                      ? const Icon(
                                          Symbols.person_rounded,
                                          color: Color(0xFF0E1424),
                                        )
                                      : Text(
                                          _initials(user.name),
                                          style: t.ui(
                                            15,
                                            weight: FontWeight.w800,
                                            color: const Color(0xFF0E1424),
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 70),
                          Eyebrow(
                            greeting(context, user?.name),
                            color: const Color(0xFFF3E8D4),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            l.travelExploreTitle,
                            style: t.serif(
                              38,
                              weight: FontWeight.w700,
                              color: Colors.white,
                              height: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -92),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TravelCard(
                  t: t,
                  radius: 26,
                  shadow: true,
                  child: _SearchCard(
                    kind: _kind,
                    onKind: (k) => setState(() => _kind = k),
                  ),
                ),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -70),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            l.travelTrending,
                            style: t.ui(19, weight: FontWeight.w800),
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push(TravelPaths.hotels),
                          child: Text(l.travelSeeAll),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 190,
                    child: explore.when(
                      loading: () =>
                          const Center(child: CircularProgressIndicator()),
                      error: (e, _) => ErrorView(
                        error: e,
                        onRetry: () => ref.invalidate(travelExploreProvider),
                      ),
                      data: (data) => ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: data.destinations.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 12),
                        itemBuilder: (context, i) => _DestinationCard(
                          d: data.destinations[i],
                          t: t,
                          nights: data.nights,
                          from: data.from,
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
    );
  }
}

String _initials(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '';
  return (parts.first.characters.first +
          (parts.length > 1 ? parts.last.characters.first : ''))
      .toUpperCase();
}

class _DestinationCard extends ConsumerWidget {
  const _DestinationCard({
    required this.d,
    required this.t,
    required this.nights,
    this.from,
  });
  final TravelDestination d;
  final TravelTokens t;
  final int nights;
  final TravelAirport? from;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final line = d.tripFromFormatted != null
        ? l.travelTripFrom(d.tripFromFormatted!)
        : (d.stayFromFormatted != null
              ? l.travelNightFrom(d.stayFromFormatted!)
              : l.travelHotelsCount(d.hotels));
    return Semantics(
      button: true,
      label: '${d.city}, $line',
      child: ExcludeSemantics(
        child: GestureDetector(
          onTap: () {
            final stay = ref.read(staySearchProvider);
            ref
                .read(staySearchProvider.notifier)
                .set(stay.copyWith(city: d.city));
            if (d.code != null && from != null) {
              final f = ref.read(flightSearchProvider);
              ref
                  .read(flightSearchProvider.notifier)
                  .set(
                    f.copyWith(
                      from: from,
                      to: TravelAirport(code: d.code!, city: d.city),
                      depart: stay.checkIn,
                      back: stay.checkOut,
                      adults: stay.guests,
                    ),
                  );
              ref.read(tripChoiceProvider.notifier).clear();
              context.push(TravelPaths.bundle);
            } else {
              context.push(TravelPaths.hotels);
            }
          },
          child: SizedBox(
            width: 150,
            child: TravelPhoto(
              url: d.photoUrl,
              radius: 22,
              label: d.city,
              children: [
                PositionedDirectional(
                  start: 12,
                  end: 12,
                  bottom: 12,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(d.city, style: t.serif(19, color: Colors.white)),
                      Text(
                        line,
                        style: t.ui(
                          11.5,
                          weight: FontWeight.w600,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
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

/// Explore's search: stays, flights, or both as one trip.
class _SearchCard extends ConsumerWidget {
  const _SearchCard({required this.kind, required this.onKind});
  final _SearchKind kind;
  final ValueChanged<_SearchKind> onKind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final flight = ref.watch(flightSearchProvider);
    final nights = stay.nights ?? 0;
    Future<void> dates() async {
      final range = await pickDates(
        context,
        from: stay.checkIn,
        to: stay.checkOut,
      );
      if (range == null) return;
      ref
          .read(staySearchProvider.notifier)
          .set(stay.copyWith(checkIn: range.start, checkOut: range.end));
      ref
          .read(flightSearchProvider.notifier)
          .set(flight.copyWith(depart: range.start, back: range.end));
    }

    Future<void> people() async {
      final p = await pickPeople(
        context,
        ref,
        people: stay.guests,
        rooms: stay.rooms,
        withRooms: kind != _SearchKind.flights,
      );
      if (p == null) return;
      ref
          .read(staySearchProvider.notifier)
          .set(stay.copyWith(guests: p.people, rooms: p.rooms));
      ref
          .read(flightSearchProvider.notifier)
          .set(flight.copyWith(adults: p.people));
    }

    final flights = kind != _SearchKind.stays;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TravelSegments<_SearchKind>(
          t: t,
          values: _SearchKind.values,
          selected: kind,
          onChanged: onKind,
          label: (k) => switch (k) {
            _SearchKind.stays => l.travelTabStays,
            _SearchKind.flights => l.travelTabFlights,
            _SearchKind.trip => l.travelStayFlight,
          },
          icons: (k) => switch (k) {
            _SearchKind.stays => Symbols.bed_rounded,
            _SearchKind.flights => Symbols.flight_rounded,
            _SearchKind.trip => Symbols.luggage_rounded,
          },
        ),
        const SizedBox(height: 10),
        if (flights) ...[
          Stack(
            children: [
              Column(
                children: [
                  TravelField(
                    t: t,
                    icon: Symbols.flight_takeoff_rounded,
                    label: l.travelFrom,
                    value: flight.from == null
                        ? l.travelChoose
                        : '${flight.from!.city} · ${flight.from!.code}',
                    onTap: () async {
                      final a = await pickAirport(
                        context,
                        ref,
                        title: l.travelFrom,
                      );
                      if (a != null) {
                        ref
                            .read(flightSearchProvider.notifier)
                            .set(flight.copyWith(from: a));
                      }
                    },
                  ),
                  const SizedBox(height: 6),
                  TravelField(
                    t: t,
                    icon: Symbols.flight_land_rounded,
                    label: l.travelTo,
                    value: flight.to == null
                        ? l.travelChoose
                        : '${flight.to!.city} · ${flight.to!.code}',
                    onTap: () async {
                      final a = await pickAirport(
                        context,
                        ref,
                        title: l.travelTo,
                      );
                      if (a != null) {
                        ref
                            .read(flightSearchProvider.notifier)
                            .set(flight.copyWith(to: a));
                        ref
                            .read(staySearchProvider.notifier)
                            .set(stay.copyWith(city: a.city));
                      }
                    },
                  ),
                ],
              ),
              PositionedDirectional(
                end: 14,
                top: 40,
                child: TravelIconButton(
                  icon: Symbols.swap_vert_rounded,
                  label: l.travelSwap,
                  t: t,
                  size: 40,
                  onTap: () => ref
                      .read(flightSearchProvider.notifier)
                      .set(flight.swapped()),
                ),
              ),
            ],
          ),
        ] else
          TravelField(
            t: t,
            icon: Symbols.location_on_rounded,
            label: l.travelWhereTo,
            value: stay.city ?? l.travelAnywhere,
            onTap: () async {
              final city = await pickCity(context, ref);
              if (city != null) {
                ref
                    .read(staySearchProvider.notifier)
                    .set(stay.copyWith(city: city));
              }
            },
          ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: TravelField(
                t: t,
                label: kind == _SearchKind.flights
                    ? l.travelDates
                    : l.travelDatesNights(nights),
                value: dayRange(stay.checkIn, stay.checkOut),
                onTap: dates,
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: TravelField(
                t: t,
                label: kind == _SearchKind.flights
                    ? l.travelTravellers
                    : l.travelGuestsLabel,
                value: kind == _SearchKind.flights
                    ? l.travelAdults(flight.adults)
                    : l.travelGuestsRooms(stay.guests, stay.rooms),
                onTap: people,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TravelButton(
          t: t,
          icon: Symbols.search_rounded,
          label: switch (kind) {
            _SearchKind.stays => l.travelSearchStays,
            _SearchKind.flights => l.travelSearchFlights,
            _SearchKind.trip => l.travelFindTrip,
          },
          onPressed: () {
            switch (kind) {
              case _SearchKind.stays:
                context.push(TravelPaths.hotels);
              case _SearchKind.flights:
                if (!flight.ready) {
                  return showMessage(context, l.travelChooseRoute);
                }
                ref
                    .read(tripChoiceProvider.notifier)
                    .set(
                      ref
                          .read(tripChoiceProvider)
                          .copyWith(clearStay: true, clearFlight: true),
                    );
                context.push(TravelPaths.flightResults);
              case _SearchKind.trip:
                if (flight.from == null || flight.to == null) {
                  return showMessage(context, l.travelChooseRoute);
                }
                ref
                    .read(flightSearchProvider.notifier)
                    .set(
                      flight.copyWith(
                        depart: stay.checkIn,
                        back: stay.checkOut,
                        adults: stay.guests,
                        roundTrip: true,
                      ),
                    );
                ref
                    .read(staySearchProvider.notifier)
                    .set(stay.copyWith(city: flight.to!.city));
                ref.read(tripChoiceProvider.notifier).clear();
                context.push(TravelPaths.bundle);
            }
          },
        ),
        if (kind == _SearchKind.trip) ...[
          const SizedBox(height: 10),
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              TravelPill(l.travelTogether, t: t, tone: PillTone.gold),
              Text(l.travelOneBooking, style: t.ui(12.5, color: t.muted)),
            ],
          ),
        ],
      ],
    );
  }
}

/// 126 Hotels · Home: where to, when and who; the kinds of stay; the featured hotel.
class StaysHomeScreen extends ConsumerWidget {
  const StaysHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final config = ref.watch(travelConfigProvider);
    final stay = ref.watch(staySearchProvider);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final explore = ref.watch(travelExploreProvider);
    final featured = explore.value?.featured ?? const <TravelHotel>[];
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: Row(
                children: [
                  Expanded(
                    child: brandMark(context, ref, t, word: l.travelTabStays),
                  ),
                  if (config.memberOffPercent > 0)
                    TravelPill(
                      signedIn
                          ? l.travelMember
                          : l.travelMemberPrices(config.memberOffPercent),
                      t: t,
                      tone: PillTone.gold,
                      icon: Symbols.workspace_premium_rounded,
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: '${l.travelStaysTitle}\n'),
                    TextSpan(
                      text: l.travelStaysTitleEnd,
                      style: TextStyle(
                        fontStyle: FontStyle.italic,
                        color: t.goldText,
                      ),
                    ),
                  ],
                ),
                style: t.serif(36, weight: FontWeight.w700, height: 1.1),
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TravelCard(
                t: t,
                radius: 24,
                shadow: true,
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TravelField(
                      t: t,
                      icon: Symbols.location_on_rounded,
                      label: l.travelWhereTo,
                      value: stay.city ?? l.travelAnywhere,
                      onTap: () async {
                        final city = await pickCity(context, ref);
                        if (city != null) {
                          ref
                              .read(staySearchProvider.notifier)
                              .set(stay.copyWith(city: city));
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TravelField(
                            t: t,
                            icon: Symbols.calendar_month_rounded,
                            label: l.travelNights(stay.nights ?? 0),
                            value:
                                '${shortDay(stay.checkIn)} – ${stay.checkOut == null ? '' : stay.checkOut!.day}',
                            onTap: () async {
                              final range = await pickDates(
                                context,
                                from: stay.checkIn,
                                to: stay.checkOut,
                              );
                              if (range != null) {
                                ref
                                    .read(staySearchProvider.notifier)
                                    .set(
                                      stay.copyWith(
                                        checkIn: range.start,
                                        checkOut: range.end,
                                      ),
                                    );
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TravelField(
                            t: t,
                            icon: Symbols.group_rounded,
                            label: l.travelGuestsLabel,
                            value: l.travelGuestsRooms(stay.guests, stay.rooms),
                            onTap: () async {
                              final p = await pickPeople(
                                context,
                                ref,
                                people: stay.guests,
                                rooms: stay.rooms,
                              );
                              if (p != null) {
                                ref
                                    .read(staySearchProvider.notifier)
                                    .set(
                                      stay.copyWith(
                                        guests: p.people,
                                        rooms: p.rooms,
                                      ),
                                    );
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TravelButton(
                      t: t,
                      label: l.travelSearchStays,
                      onPressed: () => context.push(TravelPaths.hotels),
                    ),
                  ],
                ),
              ),
            ),
            if (config.themes.isNotEmpty) ...[
              const SizedBox(height: 16),
              SizedBox(
                height: 38,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    TravelChip(
                      t: t,
                      label: l.travelAll,
                      selected: stay.theme == null,
                      onTap: () => ref
                          .read(staySearchProvider.notifier)
                          .set(stay.copyWith(clearTheme: true)),
                    ),
                    for (final theme in config.themes) ...[
                      const SizedBox(width: 8),
                      TravelChip(
                        t: t,
                        label: theme,
                        selected: stay.theme == theme,
                        onTap: () {
                          ref
                              .read(staySearchProvider.notifier)
                              .set(stay.copyWith(theme: theme));
                          context.push(TravelPaths.hotels);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            for (final hotel in featured.take(3))
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                child: FeaturedHotelCard(hotel: hotel, t: t),
              ),
            if (explore.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// The featured hotel's large card on the stays' home.
class FeaturedHotelCard extends ConsumerWidget {
  const FeaturedHotelCard({super.key, required this.hotel, required this.t});
  final TravelHotel hotel;
  final TravelTokens t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final config = ref.watch(travelConfigProvider);
    return Semantics(
      button: true,
      label: hotel.name,
      child: GestureDetector(
        onTap: () => context.push(TravelPaths.hotel(hotel.id)),
        child: SizedBox(
          height: 236,
          child: TravelPhoto(
            url: hotel.photoUrls.firstOrNull,
            radius: 26,
            label: hotel.name,
            children: [
              PositionedDirectional(
                start: 14,
                end: 14,
                top: 14,
                child: Row(
                  children: [
                    if (hotel.memberPrice && config.memberOffPercent > 0)
                      TravelPill(
                        l.travelMemberOff(config.memberOffPercent),
                        t: t,
                        tone: PillTone.glass,
                      )
                    else if (hotel.badge != null)
                      TravelPill(hotel.badge!, t: t, tone: PillTone.glass),
                    const Spacer(),
                    SaveHotelButton(hotel: hotel, t: t),
                  ],
                ),
              ),
              PositionedDirectional(
                start: 16,
                end: 16,
                bottom: 14,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Eyebrow(
                      l.travelFeaturedIn(hotel.city),
                      color: const Color(0xFFF3E8D4),
                    ),
                    const SizedBox(height: 4),
                    Text(hotel.name, style: t.serif(23, color: Colors.white)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        if (hotel.score != null) ...[
                          ScoreBadge(hotel.score!, t: t, light: true),
                          const SizedBox(width: 6),
                          Text(
                            scoreWord(context, hotel.score!),
                            style: t.ui(
                              13,
                              weight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                        const Spacer(),
                        if (hotel.fromNightlyFormatted != null)
                          Text(
                            l.travelPerNight(hotel.fromNightlyFormatted!),
                            style: t.ui(
                              14,
                              weight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 126 Flights · Search: return or one way, from and to, the days on the price calendar, travellers, direct only; the alert gone down.
class FlightsHomeScreen extends ConsumerWidget {
  const FlightsHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final config = ref.watch(travelConfigProvider);
    final flight = ref.watch(flightSearchProvider);
    final explore = ref.watch(travelExploreProvider).value;
    const ink = Color(0xFF0E1424);
    const panel = Color(0xFF1B2338);
    const edge = Color(0xFF2A3350);
    final hero = explore?.destinations
        .where((d) => d.photoUrl != null)
        .firstOrNull
        ?.photoUrl;
    final lang = Localizations.localeOf(context).languageCode.toUpperCase();
    Widget box(Widget child, {VoidCallback? onTap, String? label}) => Semantics(
      button: onTap != null,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: ink,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: edge),
          ),
          child: child,
        ),
      ),
    );
    Future<void> pickFrom() async {
      final a = await pickAirport(context, ref, title: l.travelFrom);
      if (a != null) {
        ref.read(flightSearchProvider.notifier).set(flight.copyWith(from: a));
      }
    }

    Future<void> pickTo() async {
      final a = await pickAirport(context, ref, title: l.travelTo);
      if (a != null) {
        ref.read(flightSearchProvider.notifier).set(flight.copyWith(to: a));
      }
    }

    return Scaffold(
      backgroundColor: ink,
      body: Stack(
        children: [
          SizedBox(
            height: 420,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(url: hero, semanticLabel: l.travelHeroPhoto),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x8C0E1424), Color(0x400E1424), ink],
                      stops: [0, 0.4, 1],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: brandMark(
                          context,
                          ref,
                          t,
                          word: l.travelTabFlights,
                          color: Colors.white,
                        ),
                      ),
                      TravelPill(
                        '${config.currency} · $lang',
                        t: t,
                        tone: PillTone.glass,
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: '${l.travelFlightsTitle}\n'),
                        TextSpan(
                          text: l.travelFlightsTitleEnd,
                          style: TextStyle(
                            fontStyle: FontStyle.italic,
                            color: t.gold,
                          ),
                        ),
                      ],
                    ),
                    style: t.serif(
                      34,
                      weight: FontWeight.w700,
                      color: Colors.white,
                      height: 1.1,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: panel.withValues(alpha: 0.88),
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: edge),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TravelSegments<bool>(
                          t: t,
                          dark: true,
                          values: const [true, false],
                          selected: flight.roundTrip,
                          label: (v) => v ? l.travelReturn : l.travelOneWay,
                          onChanged: (v) => ref
                              .read(flightSearchProvider.notifier)
                              .set(flight.copyWith(roundTrip: v)),
                        ),
                        const SizedBox(height: 10),
                        box(
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: pickFrom,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l.travelFrom,
                                        style: t.ui(
                                          11.5,
                                          color: const Color(0xFF9AA0B2),
                                        ),
                                      ),
                                      Text(
                                        flight.from?.code ?? '—',
                                        style: t.serif(
                                          34,
                                          color: Colors.white,
                                          height: 1,
                                        ),
                                      ),
                                      Text(
                                        flight.from?.city ?? l.travelChoose,
                                        style: t.ui(
                                          11.5,
                                          color: const Color(0xFFC7CAD5),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              IconButton.outlined(
                                tooltip: l.travelSwap,
                                color: Colors.white,
                                onPressed: () => ref
                                    .read(flightSearchProvider.notifier)
                                    .set(flight.swapped()),
                                icon: const Icon(Symbols.swap_horiz_rounded),
                              ),
                              Expanded(
                                child: InkWell(
                                  onTap: pickTo,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        l.travelTo,
                                        style: t.ui(
                                          11.5,
                                          color: const Color(0xFF9AA0B2),
                                        ),
                                      ),
                                      Text(
                                        flight.to?.code ?? '—',
                                        style: t.serif(
                                          34,
                                          color: Colors.white,
                                          height: 1,
                                        ),
                                      ),
                                      Text(
                                        flight.to?.city ?? l.travelChoose,
                                        style: t.ui(
                                          11.5,
                                          color: const Color(0xFFC7CAD5),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: box(
                                label: l.travelDepart,
                                onTap: () =>
                                    flight.from != null && flight.to != null
                                    ? context.push(TravelPaths.calendar)
                                    : pickDay(
                                        context,
                                        initial: flight.depart,
                                      ).then(
                                        (d) => d == null
                                            ? null
                                            : ref
                                                  .read(
                                                    flightSearchProvider
                                                        .notifier,
                                                  )
                                                  .set(
                                                    flight.copyWith(depart: d),
                                                  ),
                                      ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l.travelDepart,
                                      style: t.ui(
                                        11.5,
                                        color: const Color(0xFF9AA0B2),
                                      ),
                                    ),
                                    Text(
                                      shortDay(flight.depart),
                                      style: t.ui(
                                        15,
                                        weight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (flight.roundTrip) ...[
                              const SizedBox(width: 8),
                              Expanded(
                                child: box(
                                  label: l.travelReturn,
                                  onTap: () =>
                                      pickDay(
                                        context,
                                        initial: flight.back,
                                        first: flight.depart,
                                      ).then(
                                        (d) => d == null
                                            ? null
                                            : ref
                                                  .read(
                                                    flightSearchProvider
                                                        .notifier,
                                                  )
                                                  .set(
                                                    flight.copyWith(back: d),
                                                  ),
                                      ),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l.travelReturn,
                                        style: t.ui(
                                          11.5,
                                          color: const Color(0xFF9AA0B2),
                                        ),
                                      ),
                                      Text(
                                        shortDay(flight.back),
                                        style: t.ui(
                                          15,
                                          weight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 8),
                        box(
                          onTap: () async {
                            final p = await pickPeople(
                              context,
                              ref,
                              people: flight.adults,
                              withRooms: false,
                            );
                            if (p != null) {
                              ref
                                  .read(flightSearchProvider.notifier)
                                  .set(flight.copyWith(adults: p.people));
                            }
                          },
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l.travelTravellersCabin,
                                      style: t.ui(
                                        11.5,
                                        color: const Color(0xFF9AA0B2),
                                      ),
                                    ),
                                    Text(
                                      l.travelAdultsEconomy(flight.adults),
                                      style: t.ui(
                                        15,
                                        weight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                l.travelDirectOnly,
                                style: t.ui(
                                  12,
                                  weight: FontWeight.w700,
                                  color: const Color(0xFFC7CAD5),
                                ),
                              ),
                              const SizedBox(width: 8),
                              TravelToggle(
                                t: t,
                                on: flight.direct,
                                label: l.travelDirectOnly,
                                onChanged: (v) => ref
                                    .read(flightSearchProvider.notifier)
                                    .set(flight.copyWith(direct: v)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        TravelButton(
                          t: t,
                          gold: true,
                          icon: Symbols.search_rounded,
                          label: l.travelSearchFlights,
                          onPressed: () {
                            if (!flight.ready) {
                              return showMessage(context, l.travelChooseRoute);
                            }
                            ref
                                .read(tripChoiceProvider.notifier)
                                .set(
                                  ref
                                      .read(tripChoiceProvider)
                                      .copyWith(
                                        clearFlight: true,
                                        clearStay: true,
                                      ),
                                );
                            context.push(TravelPaths.flightResults);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                if (explore?.alert case final alert?) ...[
                  const SizedBox(height: 14),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: InkWell(
                      onTap: () => context.push(TravelPaths.alerts),
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: panel,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: edge),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: const Color(0x401B7A4B),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Symbols.trending_down_rounded,
                                color: Color(0xFF6FD3A0),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l.travelAlertDropped(
                                      route(
                                        alert.from.code,
                                        alert.to?.code ?? '*',
                                      ),
                                      (alert.changeFormatted ?? '')
                                          .replaceFirst('−', ''),
                                    ),
                                    style: t.ui(
                                      14,
                                      weight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    l.travelAlertNow(
                                      alert.priceFormatted ?? '',
                                    ),
                                    style: t.ui(
                                      12,
                                      color: const Color(0xFFB4B8C6),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Symbols.chevron_right_rounded,
                              color: Color(0xFF9AA0B2),
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
        ],
      ),
    );
  }
}

/// Today's month, for the price calendar.
String monthOf(DateTime day) => isoDate(day).substring(0, 7);
