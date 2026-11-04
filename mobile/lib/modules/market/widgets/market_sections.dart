import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import 'market_look.dart';

/// 115 A Studio `market` element: one marketplace section, drawn from the
/// marketplace's data. The owner places, words and colours it in the
/// Studio editor: its title and text are the element's own, its colour the
/// element's `color` (else the brand's).
class MarketSectionView extends ConsumerWidget {
  const MarketSectionView({
    super.key,
    required this.node,
    required this.market,
    this.color,
  });

  final StudioNode node;
  final StudioMarket market;

  /// The element's own colour, for its accents.
  final Color? color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final home = ref.watch(marketHomeProvider).value;
    if (home == null) return const SizedBox(height: 120);
    final accent = color ?? context.palette.primary;
    return switch (market.section) {
      StudioMarketSection.address => _Hero(
        node: node,
        home: home,
        color: accent,
      ),
      StudioMarketSection.kinds => _Kinds(node: node, home: home),
      StudioMarketSection.offers => _Offers(node: node, home: home),
      StudioMarketSection.cuisines => _Cuisines(node: node, home: home),
      StudioMarketSection.club => _Club(node: node, home: home),
      StudioMarketSection.vendors => _Vendors(
        node: node,
        market: market,
        vendors: _pick(home.vendors, market),
      ),
      StudioMarketSection.reorder => _Reorders(node: node, home: home),
    };
  }
}

List<MarketVendor> _pick(List<MarketVendor> all, StudioMarket market) {
  final picked = [
    for (final v in all)
      if ((market.kind == StudioMarketKind.all ||
              (market.kind == StudioMarketKind.restaurant) ==
                  (v.kind == MarketVendorKind.restaurant)) &&
          (!market.freeDelivery || v.freeDelivery) &&
          (market.tag == null || v.tags.contains(market.tag)))
        v,
  ];
  int open(MarketVendor v) => v.state == MarketVendorState.closed ? 1 : 0;
  picked.sort((a, b) {
    final byOpen = open(a) - open(b);
    if (byOpen != 0) return byOpen;
    return switch (market.sort) {
      StudioMarketSort.fastest => a.etaMin - b.etaMin,
      StudioMarketSort.rating => b.rating.compareTo(a.rating),
      StudioMarketSort.nearest => (a.distanceKm ?? 99).compareTo(
        b.distanceKm ?? 99,
      ),
      StudioMarketSort.recommended || StudioMarketSort.newest => 0,
    };
  });
  return picked.take(market.limit).toList();
}

void _openVendor(BuildContext context, MarketVendor vendor) =>
    context.push(Paths.marketVendor(vendor.id));

// ------------------------------------------------------------------ Hero

/// The address to deliver to, the greeting and the search, on the brand
/// colour with soft shapes.
class _Hero extends StatelessWidget {
  const _Hero({required this.node, required this.home, required this.color});

  final StudioNode node;
  final MarketHome home;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final deep = marketDeeper(color, 0.32);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: AlignmentDirectional.topStart,
              end: AlignmentDirectional.bottomEnd,
              colors: [color, deep],
            ),
          ),
          child: Stack(
            children: [
              // Soft shapes behind the words.
              PositionedDirectional(
                top: -60,
                end: -40,
                child: _Blob(size: 200, color: Colors.white, alpha: 0.10),
              ),
              PositionedDirectional(
                bottom: -70,
                start: -30,
                child: _Blob(size: 170, color: p.accent, alpha: 0.22),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 14, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(13),
                          ),
                          alignment: Alignment.center,
                          child: const AppIcon(
                            Symbols.location_on_rounded,
                            size: 20,
                            color: Colors.white,
                            filled: true,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.marketDeliverTo,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white.withValues(alpha: 0.75),
                                ),
                              ),
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      home.address,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const AppIcon(
                                    Symbols.keyboard_arrow_down_rounded,
                                    size: 20,
                                    color: Colors.white,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        _HeroButton(icon: Symbols.notifications_rounded),
                        const SizedBox(width: 8),
                        _HeroButton(
                          icon: Symbols.shopping_bag_rounded,
                          badge: '2',
                        ),
                      ],
                    ),
                    if (node.title case final title? when title.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 18),
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 25,
                            height: 1.12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.6,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    _SearchField(hint: node.text ?? l10n.marketSearchHint),
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

class _Blob extends StatelessWidget {
  const _Blob({required this.size, required this.color, required this.alpha});

  final double size;
  final Color color;
  final double alpha;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            color.withValues(alpha: alpha),
            color.withValues(alpha: 0),
          ],
        ),
      ),
    ),
  );
}

class _HeroButton extends StatelessWidget {
  const _HeroButton({required this.icon, this.badge});

  final IconData icon;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.16),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: AppIcon(icon, size: 21, color: Colors.white),
        ),
        if (badge != null)
          PositionedDirectional(
            top: -2,
            end: -2,
            child: Container(
              constraints: const BoxConstraints(minWidth: 18),
              height: 18,
              padding: const EdgeInsets.symmetric(horizontal: 5),
              decoration: BoxDecoration(
                color: p.accent,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                badge!,
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.hint});

  final String hint;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(16, 0, 6, 0),
      child: Row(
        children: [
          AppIcon(Symbols.search_rounded, size: 22, color: p.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              hint,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14.5,
                color: p.textTertiary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: marketTint(p, p.primary, 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            alignment: Alignment.center,
            child: AppIcon(Symbols.tune_rounded, size: 20, color: p.primary),
          ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------- Kinds

/// Food, Market and the rest as tiles: the first two large, the others in
/// a row under them.
class _Kinds extends StatelessWidget {
  const _Kinds({required this.node, required this.home});

  final StudioNode node;
  final MarketHome home;

  @override
  Widget build(BuildContext context) {
    final kinds = home.kinds;
    if (kinds.isEmpty) return const SizedBox.shrink();
    final big = kinds.take(2).toList();
    final small = kinds.skip(2).take(4).toList();
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          MarketSectionHead(title: node.title, subtitle: node.text),
          Row(
            children: [
              for (final (i, k) in big.indexed) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(
                  child: _KindTile(kind: k, large: true, index: i),
                ),
              ],
            ],
          ),
          if (small.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                for (final (i, k) in small.indexed) ...[
                  if (i > 0) const SizedBox(width: 10),
                  Expanded(
                    child: _KindTile(kind: k, large: false, index: i + 2),
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

class _KindTile extends StatelessWidget {
  const _KindTile({
    required this.kind,
    required this.large,
    required this.index,
  });

  final MarketKindTile kind;
  final bool large;
  final int index;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tint = index.isEven
        ? marketTint(p, p.primary, 0.10)
        : marketTint(p, p.accent, 0.14);
    final picture = ClipRRect(
      borderRadius: BorderRadius.circular(large ? 20 : 14),
      child: AppNetworkImage(url: kind.imageUrl, seed: kind.id.hashCode),
    );
    final title = Text(
      kind.title,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: large ? 20 : 13,
        fontWeight: FontWeight.w800,
        letterSpacing: large ? -0.4 : 0,
        color: p.text,
      ),
    );
    return MarketPressable(
      onTap: () {},
      child: Container(
        height: large ? 156 : 100,
        decoration: BoxDecoration(
          color: tint,
          borderRadius: BorderRadius.circular(large ? 26 : 22),
        ),
        clipBehavior: Clip.antiAlias,
        child: large
            ? Stack(
                children: [
                  PositionedDirectional(
                    end: -14,
                    bottom: -14,
                    width: 116,
                    height: 88,
                    child: Transform.rotate(angle: -0.08, child: picture),
                  ),
                  if (kind.badge != null)
                    PositionedDirectional(
                      top: 12,
                      end: 12,
                      child: MarketPill(
                        text: kind.badge!,
                        background: p.accent,
                        color: Colors.white,
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      14,
                      14,
                      14,
                      14,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        title,
                        if (kind.subtitle != null) ...[
                          const SizedBox(height: 2),
                          SizedBox(
                            width: 110,
                            child: Text(
                              kind.subtitle!,
                              maxLines: 2,
                              style: TextStyle(
                                fontSize: 12.5,
                                height: 1.25,
                                fontWeight: FontWeight.w600,
                                color: p.textSecondary,
                              ),
                            ),
                          ),
                        ],
                        const Spacer(),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: p.surface,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: AppIcon(
                            AppIcons.forward,
                            size: 17,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            : Padding(
                padding: const EdgeInsets.fromLTRB(8, 10, 8, 8),
                child: Column(
                  children: [
                    SizedBox(width: 62, height: 50, child: picture),
                    const Spacer(),
                    title,
                  ],
                ),
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------- Offers

/// The offers, one card at a time, with the next one peeking in.
class _Offers extends StatefulWidget {
  const _Offers({required this.node, required this.home});

  final StudioNode node;
  final MarketHome home;

  @override
  State<_Offers> createState() => _OffersState();
}

class _OffersState extends State<_Offers> {
  final _controller = PageController(viewportFraction: 0.88);
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final offers = widget.home.offers;
    if (offers.isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MarketSectionHead(title: widget.node.title, subtitle: widget.node.text),
        SizedBox(
          height: 186,
          child: PageView.builder(
            controller: _controller,
            padEnds: false,
            itemCount: offers.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) => Padding(
              padding: EdgeInsetsDirectional.only(
                start: i == 0 ? 16 : 6,
                end: i == offers.length - 1 ? 16 : 6,
                bottom: 22,
              ),
              child: _OfferCard(offer: offers[i]),
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < offers.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _page ? 22 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: i == _page ? p.primary : p.border,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.offer});

  final MarketOffer offer;

  @override
  Widget build(BuildContext context) {
    final from = parseHexColor(offer.from) ?? context.palette.primary;
    final to = parseHexColor(offer.to) ?? marketDeeper(from);
    return MarketPressable(
      onTap: () {},
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(26),
          gradient: LinearGradient(
            begin: AlignmentDirectional.topStart,
            end: AlignmentDirectional.bottomEnd,
            colors: [from, to],
          ),
          boxShadow: [
            BoxShadow(
              color: to.withValues(alpha: 0.30),
              blurRadius: 22,
              spreadRadius: -8,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            PositionedDirectional(
              end: -26,
              top: 14,
              bottom: 14,
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.18),
                  ),
                  padding: const EdgeInsets.all(10),
                  child: ClipOval(
                    child: AppNetworkImage(
                      url: offer.imageUrl,
                      seed: offer.id.hashCode,
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(18, 14, 112, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 22,
                      height: 1.05,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.6,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Flexible(
                    child: Text(
                      offer.text,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withValues(alpha: 0.88),
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (offer.code case final code?)
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        child: Text(
                          context.l10n.marketCode(code),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: to,
                          ),
                        ),
                      ),
                    )
                  else
                    AppIcon(
                      AppIcons.forward,
                      size: 22,
                      color: Colors.white.withValues(alpha: 0.9),
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

// -------------------------------------------------------------- Cuisines

/// Round pictures to browse by cuisine or aisle.
class _Cuisines extends StatelessWidget {
  const _Cuisines({required this.node, required this.home});

  final StudioNode node;
  final MarketHome home;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final list = home.cuisines;
    if (list.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MarketSectionHead(title: node.title, subtitle: node.text),
        SizedBox(
          height: 96,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (context, i) => MarketPressable(
              onTap: () {},
              child: SizedBox(
                width: 66,
                child: Column(
                  children: [
                    Container(
                      width: 66,
                      height: 66,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: i == 0 ? p.primary : p.border,
                          width: i == 0 ? 2.5 : 1,
                        ),
                      ),
                      padding: const EdgeInsets.all(3),
                      child: ClipOval(
                        child: AppNetworkImage(
                          url: list[i].imageUrl,
                          seed: list[i].id.hashCode,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      list[i].name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: i == 0 ? FontWeight.w800 : FontWeight.w600,
                        color: i == 0 ? p.text : p.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ------------------------------------------------------------------ Club

/// The delivery club: what it gives, in the owner's words, and Join. No
/// price here: the club's own screen shows the owner's plans.
class _Club extends StatelessWidget {
  const _Club({required this.node, required this.home});

  final StudioNode node;
  final MarketHome home;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final background =
        parseHexColor(node.background) ?? const Color(0xFF17152E);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: MarketPressable(
        onTap: () {},
        child: Container(
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(26),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              PositionedDirectional(
                end: -30,
                top: -40,
                child: _Blob(size: 190, color: p.accent, alpha: 0.45),
              ),
              PositionedDirectional(
                end: 18,
                bottom: 14,
                child: Transform.rotate(
                  angle: -math.pi / 14,
                  child: AppIcon(
                    Symbols.two_wheeler_rounded,
                    size: 66,
                    color: Colors.white.withValues(alpha: 0.9),
                    filled: true,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(18, 16, 100, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MarketPill(
                      text: l10n.marketClub.toUpperCase(),
                      background: p.accent,
                      color: Colors.white,
                      icon: Symbols.workspace_premium_rounded,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      node.title ?? '',
                      style: const TextStyle(
                        fontSize: 19,
                        height: 1.15,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        color: Colors.white,
                      ),
                    ),
                    if (node.text case final text? when text.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        text,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.35,
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        child: Text(
                          home.clubMember
                              ? l10n.marketClubMember
                              : l10n.marketJoinClub,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: background,
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
      ),
    );
  }
}

// --------------------------------------------------------------- Vendors

/// Restaurants or shops: large cards to swipe, full cards, tiles or a list.
class _Vendors extends StatelessWidget {
  const _Vendors({
    required this.node,
    required this.market,
    required this.vendors,
  });

  final StudioNode node;
  final StudioMarket market;
  final List<MarketVendor> vendors;

  @override
  Widget build(BuildContext context) {
    if (vendors.isEmpty) return const SizedBox.shrink();
    final head = MarketSectionHead(
      title: node.title,
      subtitle: node.text,
      onSeeAll: () {},
    );
    switch (market.style) {
      case StudioMarketStyle.spotlight:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head,
            SizedBox(
              height: 252,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: vendors.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => SizedBox(
                  width: 286,
                  child: MarketVendorCard(vendor: vendors[i]),
                ),
              ),
            ),
          ],
        );
      case StudioMarketStyle.cards:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head,
            for (final v in vendors)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: MarketVendorCard(vendor: v, tall: true),
              ),
          ],
        );
      case StudioMarketStyle.tiles:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head,
            SizedBox(
              height: 196,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: vendors.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => _VendorTile(vendor: vendors[i]),
              ),
            ),
          ],
        );
      case StudioMarketStyle.list:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head,
            for (final v in vendors) _VendorRow(vendor: v),
          ],
        );
    }
  }
}

/// A restaurant or a shop: its picture with the offer and the time on it,
/// its mark, name, rating and facts.
class MarketVendorCard extends StatelessWidget {
  const MarketVendorCard({super.key, required this.vendor, this.tall = false});

  final MarketVendor vendor;
  final bool tall;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final closed = vendor.state == MarketVendorState.closed;
    return MarketPressable(
      onTap: () => _openVendor(context, vendor),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: tall ? 176 : 150,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: ColorFiltered(
                      colorFilter: closed
                          ? const ColorFilter.matrix(_greyscale)
                          : const ColorFilter.mode(
                              Colors.transparent,
                              BlendMode.dst,
                            ),
                      child: AppNetworkImage(
                        url: vendor.coverUrl,
                        seed: vendor.id.hashCode,
                      ),
                    ),
                  ),
                ),
                if (closed || vendor.state == MarketVendorState.busy)
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.42),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Center(
                        child: MarketPill(
                          text: closed
                              ? (vendor.opensAt != null
                                    ? l10n.marketClosedOpens(vendor.opensAt!)
                                    : l10n.marketClosed)
                              : l10n.marketBusy,
                          background: Colors.white,
                          color: p.text,
                          icon: closed
                              ? Symbols.lock_clock_rounded
                              : Symbols.hourglass_top_rounded,
                        ),
                      ),
                    ),
                  ),
                if (vendor.promo case final promo?)
                  PositionedDirectional(
                    top: 10,
                    start: 10,
                    end: 56,
                    child: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: MarketPill(
                        text: promo,
                        background: p.accent,
                        color: Colors.white,
                        icon: Symbols.local_offer_rounded,
                      ),
                    ),
                  ),
                PositionedDirectional(
                  top: 8,
                  end: 8,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: p.surface.withValues(alpha: 0.94),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: AppIcon(
                      Symbols.favorite_rounded,
                      size: 19,
                      filled: vendor.favorited,
                      color: vendor.favorited ? p.danger : p.text,
                    ),
                  ),
                ),
                PositionedDirectional(
                  bottom: 10,
                  end: 10,
                  child: _EtaBadge(vendor: vendor),
                ),
                if (vendor.club)
                  PositionedDirectional(
                    top: vendor.promo == null ? 10 : 42,
                    start: 10,
                    child: MarketPill(
                      text: l10n.marketClubFree,
                      background: p.surface,
                      color: p.text,
                      icon: Symbols.workspace_premium_rounded,
                    ),
                  ),
                PositionedDirectional(
                  start: 12,
                  bottom: -20,
                  child: MarketVendorMark(vendor: vendor, size: 46),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(64, 6, 4, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    vendor.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                      color: p.text,
                    ),
                  ),
                ),
                MarketRating(vendor: vendor),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(64, 1, 4, 0),
            child: Text(
              [
                ...vendor.tags,
                if (vendor.distanceKm != null)
                  l10n.marketKm(vendor.distanceKm!.toStringAsFixed(1)),
              ].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12.5, color: p.textTertiary),
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4),
            child: MarketVendorFacts(vendor: vendor, wrap: false, eta: false),
          ),
        ],
      ),
    );
  }
}

const _greyscale = <double>[
  0.2126, 0.7152, 0.0722, 0, 0, //
  0.2126, 0.7152, 0.0722, 0, 0, //
  0.2126, 0.7152, 0.0722, 0, 0, //
  0, 0, 0, 1, 0,
];

/// The time to deliver, and how: live on the map, or the vendor's own.
class _EtaBadge extends StatelessWidget {
  const _EtaBadge({required this.vendor});

  final MarketVendor vendor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final live = vendor.deliveredBy == MarketDeliveredBy.app;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.14),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(
              live ? Symbols.near_me_rounded : Symbols.storefront_rounded,
              size: 14,
              color: live ? p.primary : p.textSecondary,
              filled: true,
            ),
            const SizedBox(width: 4),
            Text(
              context.l10n.marketEta(vendor.etaMin, vendor.etaMax),
              style: TextStyle(
                fontSize: 12,
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

/// A shop as a tile: its picture, mark, name and time.
class _VendorTile extends StatelessWidget {
  const _VendorTile({required this.vendor});

  final MarketVendor vendor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return MarketPressable(
      onTap: () => _openVendor(context, vendor),
      child: SizedBox(
        width: 136,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 112,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: AppNetworkImage(
                        url: vendor.coverUrl,
                        seed: vendor.id.hashCode,
                      ),
                    ),
                  ),
                  if (vendor.freeDelivery)
                    PositionedDirectional(
                      top: 8,
                      start: 8,
                      child: MarketPill(
                        text: l10n.marketFreeDelivery,
                        background: p.success,
                        color: Colors.white,
                      ),
                    ),
                  PositionedDirectional(
                    end: 8,
                    bottom: -14,
                    child: MarketVendorMark(vendor: vendor, size: 36),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              vendor.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                AppIcon(Symbols.schedule_rounded, size: 14, color: p.primary),
                const SizedBox(width: 3),
                Text(
                  l10n.marketEta(vendor.etaMin, vendor.etaMax),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: p.textSecondary,
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

/// A vendor in a list: a small picture and its facts.
class _VendorRow extends StatelessWidget {
  const _VendorRow({required this.vendor});

  final MarketVendor vendor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return MarketPressable(
      onTap: () => _openVendor(context, vendor),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        child: Row(
          children: [
            SizedBox(
              width: 84,
              height: 84,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: AppNetworkImage(
                  url: vendor.coverUrl,
                  seed: vendor.id.hashCode,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    vendor.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      MarketRating(vendor: vendor),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          vendor.tags.join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: p.textTertiary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  MarketVendorFacts(vendor: vendor, wrap: false),
                  if (vendor.state != MarketVendorState.open) ...[
                    const SizedBox(height: 6),
                    MarketPill(
                      text: vendor.state == MarketVendorState.busy
                          ? context.l10n.marketBusy
                          : (vendor.opensAt != null
                                ? context.l10n.marketClosedOpens(
                                    vendor.opensAt!,
                                  )
                                : context.l10n.marketClosed),
                      background: marketTint(p, p.danger, 0.12),
                      color: p.danger,
                      icon: Symbols.hourglass_top_rounded,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --------------------------------------------------------------- Reorder

/// Past orders to order again in one tap.
class _Reorders extends StatelessWidget {
  const _Reorders({required this.node, required this.home});

  final StudioNode node;
  final MarketHome home;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final rows = [
      for (final r in home.reorders)
        if (home.vendor(r.vendorId) case final v?) (r, v),
    ];
    if (rows.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MarketSectionHead(title: node.title, subtitle: node.text),
        SizedBox(
          height: 128,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final (order, vendor) = rows[i];
              return Container(
                width: 262,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: p.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        MarketVendorMark(vendor: vendor, size: 36),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                vendor.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: p.text,
                                ),
                              ),
                              Text(
                                order.when,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: p.textTertiary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      order.summary,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            marketMoney(order.totalCents, order.currency),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          children: [
                            AppIcon(
                              Symbols.replay_rounded,
                              size: 16,
                              color: p.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              l10n.marketOrderAgain,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: p.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
