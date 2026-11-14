import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import 'market_look.dart';

/// 130 A `market` section of places drawn as a deck (`StudioMarket.style`
/// `deck`, the Zad B board): the open place as a photo card in front, its
/// club benefit (or its offer) on a chip, its name and facts over a shade
/// at its foot; the next two peeking behind it on the end side, smaller
/// and turned a little; a swipe brings the next one to the front (the
/// previous one back), round and round; the title with "1 / 3" at its end.
/// Still on phones that reduce motion; a tap opens the place.
class MarketVendorDeck extends StatefulWidget {
  const MarketVendorDeck({super.key, required this.vendors, this.title});

  final List<MarketVendor> vendors;
  final String? title;

  @override
  State<MarketVendorDeck> createState() => _MarketVendorDeckState();
}

class _MarketVendorDeckState extends State<MarketVendorDeck> {
  var _open = 0;

  void _turn(int by) {
    final n = widget.vendors.length;
    if (n < 2) return;
    setState(() => _open = (_open + by) % n);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final vendors = widget.vendors;
    if (vendors.isEmpty) return const SizedBox.shrink();
    final n = vendors.length;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final still = MediaQuery.of(context).disableAnimations;
    final behind = [
      for (var i = 1; i < n && i < 3; i++) vendors[(_open + i) % n],
    ];
    final title = widget.title;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Text(
                  title ?? '',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: p.text,
                  ),
                ),
              ),
              Text(
                '${_open + 1} / $n',
                key: const ValueKey('market-deck-count'),
                textDirection: TextDirection.ltr,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: p.textSecondary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 196,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              key: const ValueKey('market-deck'),
              behavior: HitTestBehavior.opaque,
              onHorizontalDragEnd: (d) {
                final v = d.primaryVelocity ?? 0;
                if (v.abs() < 50) return;
                // Toward the start brings the next one (mirrored in Arabic).
                _turn((v < 0) != rtl ? 1 : -1);
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  for (final (i, v) in behind.indexed.toList().reversed)
                    PositionedDirectional(
                      top: 12.0 * (i + 1),
                      bottom: 12.0 * (i + 1),
                      start: 0,
                      end: -12.0 * (i + 1),
                      child: ExcludeSemantics(
                        child: Transform.rotate(
                          angle: (rtl ? -1 : 1) * 0.035 * (i + 1),
                          child: _Card(vendor: v, behind: true),
                        ),
                      ),
                    ),
                  PositionedDirectional(
                    top: 0,
                    bottom: 0,
                    start: 0,
                    end: 44,
                    child: AnimatedSwitcher(
                      duration: still
                          ? Duration.zero
                          : const Duration(milliseconds: 260),
                      child: _Card(
                        key: ValueKey('market-deck-${vendors[_open].id}'),
                        vendor: vendors[_open],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({super.key, required this.vendor, this.behind = false});

  final MarketVendor vendor;
  final bool behind;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final chip = vendor.club
        ? (vendor.clubBenefit ?? context.l10n.marketClubFree)
        : vendor.promo;
    final eta = marketEtaText(context, vendor);
    final facts = [...vendor.tags.take(1), ?eta].join(' · ');
    final card = ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(url: vendor.coverUrl, seed: vendor.id.hashCode),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.35, 1],
                colors: [
                  Colors.black.withValues(alpha: behind ? 0.15 : 0),
                  Colors.black.withValues(alpha: behind ? 0.45 : 0.78),
                ],
              ),
            ),
          ),
          if (!behind) ...[
            if (chip != null && chip.isNotEmpty)
              PositionedDirectional(
                top: 12,
                start: 12,
                end: 40,
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: p.accent,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      chip,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1B2A20),
                      ),
                    ),
                  ),
                ),
              ),
            PositionedDirectional(
              start: 14,
              end: 14,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    vendor.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: Colors.white,
                    ),
                  ),
                  if (facts.isNotEmpty)
                    Text(
                      facts,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xE6FFFFFF),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
    final shadowed = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: behind ? 0.25 : 0.4),
            blurRadius: 24,
            offset: const Offset(0, 14),
            spreadRadius: -10,
          ),
        ],
      ),
      child: card,
    );
    if (behind) return shadowed;
    return Semantics(
      button: true,
      label: vendor.name,
      child: GestureDetector(
        onTap: () => context.push(Paths.marketVendor(vendor.id)),
        child: shadowed,
      ),
    );
  }
}
