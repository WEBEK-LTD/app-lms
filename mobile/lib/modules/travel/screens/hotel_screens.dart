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
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/travel_providers.dart';
import '../travel_paths.dart';
import '../widgets/travel_pickers.dart';
import '../widgets/travel_ui.dart';
import '../widgets/travel_words.dart';

/// 126 Hotels: the results as a list or on the map, a hotel's page, its
/// rooms and rates, and the saved hotels.

/// The heart on a hotel's card or page: saved for the person, or sign in first.
class SaveHotelButton extends ConsumerStatefulWidget {
  const SaveHotelButton({
    super.key,
    required this.hotel,
    required this.t,
    this.size = 38,
  });
  final TravelHotel hotel;
  final TravelTokens t;
  final double size;

  @override
  ConsumerState<SaveHotelButton> createState() => _SaveHotelButtonState();
}

class _SaveHotelButtonState extends ConsumerState<SaveHotelButton> {
  late bool _saved = widget.hotel.saved;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return TravelIconButton(
      icon: Symbols.favorite_rounded,
      selected: _saved,
      label: _saved ? l.travelUnsave : l.travelSaveHotel,
      t: widget.t,
      glass: true,
      size: widget.size,
      onTap: () async {
        if (!ref.read(authControllerProvider).isSignedIn) {
          context.push(
            Uri(
              path: Paths.signIn,
              queryParameters: {'from': TravelPaths.hotel(widget.hotel.id)},
            ).toString(),
          );
          return;
        }
        final next = !_saved;
        setState(() => _saved = next);
        try {
          await ref.read(travelApiProvider).save(widget.hotel.id, next);
          ref.invalidate(savedHotelsProvider);
        } on ApiException catch (e) {
          if (!context.mounted) return;
          setState(() => _saved = !next);
          showMessage(context, e.message);
        }
      },
    );
  }
}

/// A hotel in the results: its photos, name and stars, where it is, its score, what its rates give and the stay's price.
class HotelCard extends ConsumerWidget {
  const HotelCard({
    super.key,
    required this.hotel,
    required this.t,
    this.nights,
    this.totals = true,
  });
  final TravelHotel hotel;
  final TravelTokens t;
  final int? nights;
  final bool totals;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final config = ref.watch(travelConfigProvider);
    final price = hotel.price;
    final gives = [
      if (hotel.freeCancellation) l.travelFreeCancellation,
      if (hotel.breakfast) l.travelAmenityBreakfast,
    ].join(' · ');
    return TravelCard(
      t: t,
      radius: 24,
      padding: EdgeInsets.zero,
      onTap: () => context.push(TravelPaths.hotel(hotel.id)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(23),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 178,
              child: _PhotoPager(
                urls: hotel.photoUrls,
                label: hotel.name,
                overlay: PositionedDirectional(
                  start: 12,
                  end: 12,
                  top: 12,
                  child: Row(
                    children: [
                      if (price?.member ?? false)
                        TravelPill(
                          l.travelMemberPrice,
                          t: t,
                          tone: PillTone.glass,
                        )
                      else if (hotel.badge != null)
                        TravelPill(hotel.badge!, t: t, tone: PillTone.glass)
                      else if (hotel.memberPrice && config.memberOffPercent > 0)
                        TravelPill(
                          l.travelMemberPrice,
                          t: t,
                          tone: PillTone.glass,
                        ),
                      const Spacer(),
                      SaveHotelButton(hotel: hotel, t: t, size: 36),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          hotel.name,
                          style: t.ui(17, weight: FontWeight.w800),
                        ),
                      ),
                      if (hotel.stars > 0) Stars(hotel.stars, color: t.gold),
                    ],
                  ),
                  Text(
                    [
                      hotel.area,
                      hotel.landmark,
                    ].whereType<String>().join(' · '),
                    style: t.ui(12, color: t.muted),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (hotel.score != null)
                              Row(
                                children: [
                                  ScoreBadge(hotel.score!, t: t),
                                  const SizedBox(width: 6),
                                  Text(
                                    scoreWord(context, hotel.score!),
                                    style: t.ui(13, weight: FontWeight.w800),
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      l.travelReviews(hotel.reviews),
                                      style: t.ui(12, color: t.muted),
                                    ),
                                  ),
                                ],
                              ),
                            if (gives.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                gives,
                                style: t.ui(
                                  12,
                                  weight: FontWeight.w800,
                                  color: t.ok,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (price?.wasTotalFormatted != null)
                            Text(
                              price!.wasTotalFormatted!,
                              style: t
                                  .ui(12, color: t.muted)
                                  .copyWith(
                                    decoration: TextDecoration.lineThrough,
                                  ),
                            ),
                          if (price != null)
                            Text(
                              totals
                                  ? price.totalFormatted
                                  : price.nightlyFormatted,
                              style: t.serif(22),
                            )
                          else if (hotel.fromNightlyFormatted != null)
                            Text(
                              l.travelPerNight(hotel.fromNightlyFormatted!),
                              style: t.serif(18),
                            ),
                          if (price != null)
                            Text(
                              totals
                                  ? (hotel.payAtHotel
                                        ? l.travelNightsAtHotel(price.nights)
                                        : l.travelNightsTaxes(price.nights))
                                  : l.travelANight,
                              style: t.ui(11.5, color: t.muted),
                            ),
                        ],
                      ),
                    ],
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

/// A hotel's photos, swiped, with their dots.
class _PhotoPager extends StatefulWidget {
  const _PhotoPager({required this.urls, required this.label, this.overlay});
  final List<String> urls;
  final String label;
  final Widget? overlay;

  @override
  State<_PhotoPager> createState() => _PhotoPagerState();
}

class _PhotoPagerState extends State<_PhotoPager> {
  int _at = 0;

  @override
  Widget build(BuildContext context) {
    final urls = widget.urls.isEmpty ? const <String?>[null] : widget.urls;
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          itemCount: urls.length,
          onPageChanged: (i) => setState(() => _at = i),
          itemBuilder: (_, i) => AppNetworkImage(
            url: urls[i],
            seed: i,
            semanticLabel: widget.label,
          ),
        ),
        ?widget.overlay,
        if (urls.length > 1)
          Positioned(
            bottom: 10,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < math.min(urls.length, 6); i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    width: i == _at ? 16 : 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: i == _at
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// 126 Hotels · Results: the search on top, the filters, the stays with their whole price.
class HotelResultsScreen extends ConsumerStatefulWidget {
  const HotelResultsScreen({super.key});

  @override
  ConsumerState<HotelResultsScreen> createState() => _HotelResultsScreenState();
}

class _HotelResultsScreenState extends ConsumerState<HotelResultsScreen> {
  bool _totals = true;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final config = ref.watch(travelConfigProvider);
    final results = ref.watch(hotelSearchProvider(stay));
    void set(StaySearch s) => ref.read(staySearchProvider.notifier).set(s);
    final pool = config.amenities.any((a) => a.id == 'pool');
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              child: Row(
                children: [
                  TravelIconButton(
                    icon: Directionality.of(context) == TextDirection.rtl
                        ? Symbols.chevron_right_rounded
                        : Symbols.chevron_left_rounded,
                    label: l.travelBack,
                    t: t,
                    onTap: () => context.pop(),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TravelCard(
                      t: t,
                      radius: 16,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      onTap: () async {
                        final range = await pickDates(
                          context,
                          from: stay.checkIn,
                          to: stay.checkOut,
                        );
                        if (range != null) {
                          set(
                            stay.copyWith(
                              checkIn: range.start,
                              checkOut: range.end,
                            ),
                          );
                        }
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stay.city ?? l.travelAnywhere,
                            style: t.ui(14, weight: FontWeight.w800),
                          ),
                          Text(
                            '${dayRange(stay.checkIn, stay.checkOut)} · ${l.travelGuestsRooms(stay.guests, stay.rooms)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.ui(11.5, color: t.muted),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  TravelIconButton(
                    icon: Symbols.map_rounded,
                    label: l.travelShowMap,
                    t: t,
                    filled: true,
                    onTap: () => context.push(TravelPaths.map),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  TravelChip(
                    t: t,
                    label: l.travelSort,
                    icon: Symbols.tune_rounded,
                    onTap: () => _sort(context, stay),
                  ),
                  const SizedBox(width: 8),
                  TravelChip(
                    t: t,
                    label: l.travelFreeCancellation,
                    selected: stay.freeCancellation,
                    onTap: () => set(
                      stay.copyWith(freeCancellation: !stay.freeCancellation),
                    ),
                  ),
                  if (config.payAtHotel) ...[
                    const SizedBox(width: 8),
                    TravelChip(
                      t: t,
                      label: l.travelPayAtHotel,
                      selected: stay.payAtHotel,
                      onTap: () =>
                          set(stay.copyWith(payAtHotel: !stay.payAtHotel)),
                    ),
                  ],
                  const SizedBox(width: 8),
                  TravelChip(
                    t: t,
                    label: l.travelSuperbPlus,
                    selected: stay.minScore != null,
                    onTap: () => set(
                      stay.minScore != null
                          ? stay.copyWith(clearScore: true)
                          : stay.copyWith(minScore: 9),
                    ),
                  ),
                  if (pool) ...[
                    const SizedBox(width: 8),
                    TravelChip(
                      t: t,
                      label: l.travelAmenityPool,
                      selected: stay.theme == null && false,
                      onTap: () => set(stay.copyWith(theme: stay.theme)),
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: l.travelStaysCount(results.value?.total ?? 0),
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          TextSpan(
                            text:
                                ' · ${l.travelSortedBy(_sortName(context, stay.sort))}',
                            style: TextStyle(color: t.muted),
                          ),
                        ],
                      ),
                      style: t.ui(13),
                    ),
                  ),
                  Text(
                    l.travelTotalPrice,
                    style: t.ui(12, weight: FontWeight.w700, color: t.muted),
                  ),
                  const SizedBox(width: 8),
                  TravelToggle(
                    t: t,
                    on: _totals,
                    label: l.travelTotalPrice,
                    onChanged: (v) => setState(() => _totals = v),
                  ),
                ],
              ),
            ),
            Expanded(
              child: travelAsync(
                results,
                onRetry: () => ref.invalidate(hotelSearchProvider(stay)),
                (data) => data.items.isEmpty
                    ? MessageView(
                        icon: Symbols.bed_rounded,
                        title: l.travelNoStays,
                        message: l.travelNoStaysText,
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        itemCount: data.items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (context, i) => HotelCard(
                          hotel: data.items[i],
                          t: t,
                          nights: data.nights,
                          totals: _totals,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _sortName(BuildContext context, String sort) {
    final l = context.l10n;
    return switch (sort) {
      'price' => l.travelSortPrice,
      'score' => l.travelSortScore,
      'stars' => l.travelSortStars,
      _ => l.travelSortRecommended,
    };
  }

  Future<void> _sort(BuildContext context, StaySearch stay) async {
    final chosen = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final s in const ['recommended', 'price', 'score', 'stars'])
              ListTile(
                title: Text(_sortName(context, s)),
                trailing: stay.sort == s
                    ? const Icon(Symbols.check_rounded)
                    : null,
                onTap: () => Navigator.of(context).pop(s),
              ),
          ],
        ),
      ),
    );
    if (chosen != null) {
      ref.read(staySearchProvider.notifier).set(stay.copyWith(sort: chosen));
    }
  }
}

/// 126 Hotels · Map: the stays' prices where they are, the chosen one's card at the foot.
class HotelMapScreen extends ConsumerStatefulWidget {
  const HotelMapScreen({super.key});

  @override
  ConsumerState<HotelMapScreen> createState() => _HotelMapScreenState();
}

class _HotelMapScreenState extends ConsumerState<HotelMapScreen> {
  int? _picked;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final results = ref.watch(hotelSearchProvider(stay)).value;
    final placed = (results?.items ?? const <TravelHotel>[])
        .where((h) => h.lat != null && h.lng != null)
        .toList();
    final chosen =
        placed.where((h) => h.id == _picked).firstOrNull ?? placed.firstOrNull;
    return Scaffold(
      backgroundColor: t.page,
      body: Stack(
        children: [
          Positioned.fill(
            child: LayoutBuilder(
              builder: (context, box) {
                if (placed.isEmpty) return CustomPaint(painter: _MapPainter(t));
                final lats = placed.map((h) => h.lat!);
                final lngs = placed.map((h) => h.lng!);
                final minLat = lats.reduce(math.min),
                    maxLat = lats.reduce(math.max),
                    minLng = lngs.reduce(math.min),
                    maxLng = lngs.reduce(math.max);
                Offset at(TravelHotel h) {
                  final x = maxLng == minLng
                      ? 0.5
                      : (h.lng! - minLng) / (maxLng - minLng);
                  final y = maxLat == minLat
                      ? 0.5
                      : 1 - (h.lat! - minLat) / (maxLat - minLat);
                  return Offset(
                    40 + x * (box.maxWidth - 140),
                    180 + y * (box.maxHeight - 420),
                  );
                }

                return Stack(
                  children: [
                    Positioned.fill(
                      child: CustomPaint(painter: _MapPainter(t)),
                    ),
                    for (final h in placed)
                      Positioned(
                        left: at(h).dx,
                        top: at(h).dy,
                        child: Semantics(
                          button: true,
                          selected: h == chosen,
                          label:
                              '${h.name}, ${h.price?.totalFormatted ?? h.fromNightlyFormatted ?? ''}',
                          child: GestureDetector(
                            onTap: () => setState(() => _picked = h.id),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: h == chosen ? t.ink : t.surface,
                                borderRadius: BorderRadius.circular(999),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.16),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Text(
                                h == chosen && h.price != null
                                    ? l.travelPinNights(
                                        h.price!.totalFormatted,
                                        h.price!.nights,
                                      )
                                    : (h.price?.totalFormatted ??
                                          h.fromNightlyFormatted ??
                                          ''),
                                style: t.ui(
                                  12.5,
                                  weight: FontWeight.w800,
                                  color: h == chosen ? t.onInk : t.text,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  TravelIconButton(
                    icon: Symbols.list_rounded,
                    label: l.travelBackToList,
                    t: t,
                    onTap: () => context.pop(),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TravelCard(
                      t: t,
                      radius: 16,
                      shadow: true,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${stay.city ?? l.travelAnywhere} · ${dayRange(stay.checkIn, stay.checkOut)}',
                            style: t.ui(14, weight: FontWeight.w800),
                          ),
                          Text(
                            l.travelMapCount(
                              results?.total ?? 0,
                              stay.nights ?? 0,
                            ),
                            style: t.ui(11.5, color: t.muted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (chosen != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 30 + MediaQuery.paddingOf(context).bottom,
              child: TravelCard(
                t: t,
                radius: 24,
                shadow: true,
                padding: const EdgeInsets.all(10),
                onTap: () => context.push(TravelPaths.hotel(chosen.id)),
                child: Row(
                  children: [
                    SizedBox(
                      width: 112,
                      height: 124,
                      child: TravelPhoto(
                        url: chosen.photoUrls.firstOrNull,
                        radius: 18,
                        scrim: false,
                        label: chosen.name,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            chosen.name,
                            style: t.ui(15, weight: FontWeight.w800),
                          ),
                          Text(
                            [
                              chosen.area,
                              chosen.city,
                            ].whereType<String>().join(' · '),
                            style: t.ui(12, color: t.muted),
                          ),
                          const SizedBox(height: 4),
                          if (chosen.score != null)
                            Row(
                              children: [
                                ScoreBadge(chosen.score!, t: t),
                                const SizedBox(width: 6),
                                Text(
                                  scoreWord(context, chosen.score!),
                                  style: t.ui(13, weight: FontWeight.w800),
                                ),
                              ],
                            ),
                          if (chosen.freeCancellation)
                            Text(
                              l.travelFreeCancellation,
                              style: t.ui(
                                12,
                                weight: FontWeight.w800,
                                color: t.ok,
                              ),
                            ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  chosen.price?.totalFormatted ??
                                      chosen.fromNightlyFormatted ??
                                      '',
                                  style: t.serif(20),
                                ),
                              ),
                              TravelPill(
                                l.travelView,
                                t: t,
                                tone: PillTone.ink,
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
        ],
      ),
    );
  }
}

/// The map's drawing: blocks, roads and water, without tiles.
class _MapPainter extends CustomPainter {
  _MapPainter(this.t);
  final TravelTokens t;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..color = t.dark ? const Color(0xFF151C2E) : const Color(0xFFEDE7DC),
    );
    final water = Path()
      ..moveTo(size.width * 0.55, 0)
      ..cubicTo(
        size.width * 0.45,
        size.height * 0.3,
        size.width * 0.7,
        size.height * 0.6,
        size.width * 0.5,
        size.height,
      );
    canvas.drawPath(
      water,
      Paint()
        ..color = t.dark ? const Color(0xFF1F3A4F) : const Color(0xFFC9E2EA)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 46,
    );
    final road = Paint()
      ..color = t.dark ? const Color(0xFF232C44) : Colors.white
      ..strokeWidth = 8;
    for (var i = 1; i < 7; i++) {
      canvas.drawLine(
        Offset(0, size.height * i / 7),
        Offset(size.width, size.height * i / 7 + 40),
        road,
      );
      canvas.drawLine(
        Offset(size.width * i / 5, 0),
        Offset(size.width * i / 5 - 30, size.height),
        road,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MapPainter old) => old.t.dark != t.dark;
}

/// 126 Hotels · The hotel: its photos, scores, amenities and a guest's words; message the hotel, choose a room.
class HotelDetailScreen extends ConsumerWidget {
  const HotelDetailScreen({
    super.key,
    required this.hotelId,
    this.alone = false,
  });
  final int hotelId;

  /// The app's only hotel, as its first tab: no way back.
  final bool alone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final hotel = ref.watch(hotelProvider((id: hotelId, search: stay)));
    return Scaffold(
      backgroundColor: t.page,
      body: travelAsync(
        hotel,
        onRetry: () =>
            ref.invalidate(hotelProvider((id: hotelId, search: stay))),
        (h) => _HotelPage(hotel: h, t: t, alone: alone),
      ),
      bottomNavigationBar: hotel.value == null
          ? null
          : TravelPriceBar(
              t: t,
              leading: TravelIconButton(
                icon: Symbols.chat_rounded,
                label: l.travelMessageHotel,
                t: t,
                size: 54,
                onTap: () => context.push(Paths.chat),
              ),
              price: hotel.value!.fromNightlyFormatted,
              caption: hotel.value!.fromNightlyFormatted == null
                  ? null
                  : l.travelFromANight,
              button: TravelButton(
                t: t,
                label: l.travelChooseRoom,
                onPressed: () => context.push(TravelPaths.rooms(hotelId)),
              ),
            ),
    );
  }
}

class _HotelPage extends ConsumerWidget {
  const _HotelPage({required this.hotel, required this.t, required this.alone});
  final TravelHotel hotel;
  final TravelTokens t;
  final bool alone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final scores = {
      'staff': l.travelScoreStaff,
      'clean': l.travelScoreClean,
      'location': l.travelScoreLocation,
      'value': l.travelScoreValue,
    };
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        SizedBox(
          height: 332,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _PhotoPager(urls: hotel.photoUrls, label: hotel.name),
              const IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x660E1424),
                        Color(0x000E1424),
                        Color(0x990E1424),
                      ],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      if (!alone && Navigator.of(context).canPop())
                        TravelIconButton(
                          icon: Directionality.of(context) == TextDirection.rtl
                              ? Symbols.chevron_right_rounded
                              : Symbols.chevron_left_rounded,
                          label: l.travelBack,
                          t: t,
                          glass: true,
                          onTap: () => context.pop(),
                        ),
                      const Spacer(),
                      SaveHotelButton(hotel: hotel, t: t, size: 44),
                    ],
                  ),
                ),
              ),
              PositionedDirectional(
                end: 16,
                bottom: 16,
                child: TravelPill(
                  l.travelPhotosCount(hotel.photoUrls.length),
                  t: t,
                  tone: PillTone.glass,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  if (hotel.stars > 0) ...[
                    Stars(hotel.stars, color: t.gold),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      '${hotelKindName(context, hotel.kind)} · ${[hotel.area, hotel.city].whereType<String>().join(', ')}',
                      style: t.ui(
                        12.5,
                        weight: FontWeight.w700,
                        color: t.muted,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(hotel.name, style: t.serif(28)),
              const SizedBox(height: 14),
              if (hotel.score != null)
                TravelCard(
                  t: t,
                  child: Row(
                    children: [
                      SizedBox(
                        width: 74,
                        child: Column(
                          children: [
                            ScoreBadge(hotel.score!, t: t, large: true),
                            const SizedBox(height: 4),
                            Text(
                              scoreWord(context, hotel.score!),
                              style: t.ui(13, weight: FontWeight.w800),
                            ),
                            Text(
                              l.travelReviews(hotel.reviews),
                              style: t.ui(11.5, color: t.muted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Wrap(
                          runSpacing: 8,
                          children: [
                            for (final e in scores.entries)
                              if (hotel.scores[e.key] != null)
                                FractionallySizedBox(
                                  widthFactor: 0.5,
                                  child: Padding(
                                    padding: const EdgeInsetsDirectional.only(
                                      end: 14,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.stretch,
                                      children: [
                                        // 128.11 The name on its own line(s)
                                        // and the score after its bar: the
                                        // two never run into each other nor
                                        // is a word cut, in Arabic too.
                                        Text(
                                          e.value,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: t.ui(
                                            11.5,
                                            weight: FontWeight.w700,
                                            color: t.muted,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Row(
                                          key: ValueKey('hotel-score-${e.key}'),
                                          children: [
                                            Expanded(
                                              child: ClipRRect(
                                                borderRadius:
                                                    BorderRadius.circular(3),
                                                child: LinearProgressIndicator(
                                                  value:
                                                      hotel.scores[e.key]! / 10,
                                                  minHeight: 4,
                                                  backgroundColor: t.dark
                                                      ? t.line
                                                      : const Color(0xFFEFE9DE),
                                                  color:
                                                      hotel.scores[e.key]! < 9
                                                      ? t.gold
                                                      : t.ink,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              hotel.scores[e.key]!
                                                  .toStringAsFixed(1),
                                              style: t.ui(
                                                11.5,
                                                weight: FontWeight.w800,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              if (hotel.amenities.isNotEmpty) ...[
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 10,
                  children: [
                    for (final a in hotel.amenities.take(10))
                      SizedBox(
                        width: 62,
                        child: Column(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: t.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: t.line),
                              ),
                              child: Icon(amenityIcon(a), color: t.text),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              amenityName(context, a),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              style: t.ui(11.5, weight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
              if (hotel.quote case final quote?) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: t.goldSoft,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '“${quote.text}”',
                        style: t.serif(
                          16,
                          weight: FontWeight.w500,
                          style: FontStyle.italic,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        l.travelQuoteBy(quote.name, quote.stayed),
                        style: t.ui(
                          11.5,
                          weight: FontWeight.w800,
                          color: t.goldText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (hotel.description != null) ...[
                const SizedBox(height: 14),
                Text(
                  hotel.description!,
                  style: t.ui(15, weight: FontWeight.w500, height: 1.5),
                ),
              ],
              const SizedBox(height: 14),
              TravelCard(
                t: t,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.travelCheckInOut(hotel.checkInTime, hotel.checkOutTime),
                      style: t.ui(14, weight: FontWeight.w700),
                    ),
                    if (hotel.address != null)
                      Text(hotel.address!, style: t.ui(13, color: t.muted)),
                    if (hotel.policies != null) ...[
                      const SizedBox(height: 6),
                      Text(hotel.policies!, style: t.ui(13, color: t.muted)),
                    ],
                  ],
                ),
              ),
              if (stay.checkIn == null) ...[
                const SizedBox(height: 10),
                Text(l.travelPickDates, style: t.ui(13, color: t.muted)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// 126 Hotels · Rooms: each room with its rates, refundable or cheaper, the meals, and the stay's price.
class RoomSelectScreen extends ConsumerStatefulWidget {
  const RoomSelectScreen({super.key, required this.hotelId});
  final int hotelId;

  @override
  ConsumerState<RoomSelectScreen> createState() => _RoomSelectScreenState();
}

class _RoomSelectScreenState extends ConsumerState<RoomSelectScreen> {
  int? _room;
  String? _rate;
  final _open = <int>{};

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final stay = ref.watch(staySearchProvider);
    final hotel = ref.watch(hotelProvider((id: widget.hotelId, search: stay)));
    final h = hotel.value;
    final rooms = h?.rooms ?? const <TravelRoom>[];
    final room =
        rooms.where((r) => r.id == _room).firstOrNull ??
        rooms
            .where((r) => r.available && r.rates.any((x) => x.price != null))
            .firstOrNull;
    final rate =
        room?.rates.where((r) => r.id == _rate).firstOrNull ??
        room?.rates.where((r) => r.popular && r.price != null).firstOrNull ??
        room?.rates.where((r) => r.price != null).firstOrNull;
    if (room != null && !_open.contains(room.id) && _room == null) {
      _open.add(room.id);
    }
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            TravelTopBar(
              t: t,
              title: l.travelChooseYourRoom,
              subtitle:
                  '${dayRange(stay.checkIn, stay.checkOut)} · ${l.travelNights(stay.nights ?? 0)} · ${l.travelGuests(stay.guests)}',
              trailing: TravelIconButton(
                icon: Symbols.calendar_month_rounded,
                label: l.travelDates,
                t: t,
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
            Expanded(
              child: travelAsync(
                hotel,
                (h) => ListView(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  children: [
                    for (final r in h.rooms)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _open.contains(r.id)
                            ? _roomCard(context, t, r, room, rate)
                            : _roomRow(context, t, r),
                      ),
                    if (h.rooms.isEmpty)
                      MessageView(
                        icon: Symbols.bed_rounded,
                        title: l.travelNoRooms,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: rate?.price == null || room == null || h == null
          ? null
          : TravelPriceBar(
              t: t,
              price: rate!.price!.totalFormatted,
              caption: l.travelNightsTaxes(rate.price!.nights),
              button: TravelButton(
                t: t,
                label: l.travelReserve,
                onPressed: () {
                  final choice = ref.read(tripChoiceProvider);
                  ref
                      .read(tripChoiceProvider.notifier)
                      .set(choice.copyWith(hotel: h, room: room, rate: rate));
                  context.push(
                    choice.flight != null
                        ? TravelPaths.bundle
                        : TravelPaths.checkout,
                  );
                },
              ),
            ),
    );
  }

  Widget _roomRow(BuildContext context, TravelTokens t, TravelRoom r) {
    final l = context.l10n;
    final from = r.rates
        .map((x) => x.price)
        .whereType<TravelPrice>()
        .firstOrNull;
    return TravelCard(
      t: t,
      radius: 22,
      padding: const EdgeInsets.all(10),
      onTap: () => setState(() => _open.add(r.id)),
      child: Row(
        children: [
          SizedBox(
            width: 76,
            height: 64,
            child: TravelPhoto(
              url: r.photoUrls.firstOrNull,
              radius: 14,
              scrim: false,
              label: r.name,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.name, style: t.ui(14, weight: FontWeight.w800)),
                Text(_facts(context, r), style: t.ui(12, color: t.muted)),
              ],
            ),
          ),
          if (!r.available)
            Text(
              l.travelSoldOut,
              style: t.ui(12, weight: FontWeight.w800, color: t.danger),
            )
          else if (from != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(l.travelFrom, style: t.ui(11, color: t.muted)),
                Text(
                  from.totalFormatted,
                  style: t.ui(15, weight: FontWeight.w800),
                ),
              ],
            ),
        ],
      ),
    );
  }

  String _facts(BuildContext context, TravelRoom r) => [
    if (r.sizeM2 != null) '${r.sizeM2} m²',
    ...r.features.take(2),
    context.l10n.travelSleeps(r.sleeps),
  ].join(' · ');

  Widget _roomCard(
    BuildContext context,
    TravelTokens t,
    TravelRoom r,
    TravelRoom? room,
    TravelRate? rate,
  ) {
    final l = context.l10n;
    return TravelCard(
      t: t,
      radius: 24,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 150,
            child: TravelPhoto(
              url: r.photoUrls.firstOrNull,
              label: r.name,
              children: [
                if (r.left != null)
                  PositionedDirectional(
                    start: 12,
                    bottom: 12,
                    child: TravelPill(
                      l.travelLeftAtPrice(r.left!),
                      t: t,
                      tone: PillTone.glass,
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(r.name, style: t.ui(17, weight: FontWeight.w800)),
                Text(_facts(context, r), style: t.ui(12, color: t.muted)),
                if (!r.available)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      l.travelSoldOut,
                      style: t.ui(13, weight: FontWeight.w800, color: t.danger),
                    ),
                  ),
                for (final x in r.rates)
                  if (x.price != null && r.available)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: _rateRow(
                        context,
                        t,
                        r,
                        x,
                        room?.id == r.id && rate?.id == x.id,
                      ),
                    ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _rateRow(
    BuildContext context,
    TravelTokens t,
    TravelRoom r,
    TravelRate x,
    bool on,
  ) {
    final l = context.l10n;
    final cancel = x.refundable && x.freeCancelUntil != null
        ? l.travelFreeCancelUntil(shortDay(parseIsoDate(x.freeCancelUntil!)))
        : l.travelNonRefundable;
    return Semantics(
      selected: on,
      button: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() {
          _room = r.id;
          _rate = x.id;
        }),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: on ? t.ink : t.line,
                  width: on ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: on ? t.ink : t.line,
                        width: on ? 7 : 2,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(x.name, style: t.ui(14, weight: FontWeight.w800)),
                        Text(
                          cancel,
                          style: t.ui(
                            12,
                            weight: FontWeight.w800,
                            color: x.refundable ? t.ok : t.danger,
                          ),
                        ),
                        if (x.payAtHotel && x.payNow)
                          Text(
                            l.travelPayNowOrAtHotel,
                            style: t.ui(12, color: t.muted),
                          )
                        else if (x.payAtHotel)
                          Text(
                            l.travelPayAtHotel,
                            style: t.ui(12, color: t.muted),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        x.price!.totalFormatted,
                        style: t.ui(15, weight: FontWeight.w800),
                      ),
                      Text(l.travelTotal, style: t.ui(11.5, color: t.muted)),
                    ],
                  ),
                ],
              ),
            ),
            if (x.popular)
              PositionedDirectional(
                top: -12,
                start: 12,
                child: TravelPill(
                  l.travelMostChosen,
                  t: t,
                  tone: PillTone.gold,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 126 The hotels the person saved (the Saved tab for hotels only).
class SavedHotelsScreen extends ConsumerWidget {
  const SavedHotelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      backgroundColor: t.page,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l.travelTabSaved),
            Expanded(
              child: !signedIn
                  ? SignInPrompt(
                      icon: Symbols.favorite_rounded,
                      title: l.travelSavedSignIn,
                      message: l.travelSavedSignInText,
                      from: TravelPaths.saved,
                    )
                  : travelAsync(
                      ref.watch(savedHotelsProvider),
                      onRetry: () => ref.invalidate(savedHotelsProvider),
                      (items) => items.isEmpty
                          ? MessageView(
                              icon: Symbols.favorite_rounded,
                              title: l.travelNoSaved,
                              message: l.travelNoSavedText,
                              actionLabel: l.travelSearchStays,
                              onAction: () => context.push(TravelPaths.hotels),
                            )
                          : RefreshIndicator(
                              onRefresh: () async =>
                                  ref.invalidate(savedHotelsProvider),
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  4,
                                  16,
                                  24,
                                ),
                                itemCount: items.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(height: 14),
                                itemBuilder: (context, i) =>
                                    HotelCard(hotel: items[i], t: t),
                              ),
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Today's day as the API writes it.
String todayIso() => isoDate(DateTime.now());
