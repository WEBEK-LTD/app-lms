import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/app_router.dart' show openLocation;
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/star_text.dart';
import '../data/market_models.dart';
import '../data/market_place.dart';

/// 128 The marketplace's compact sections (Zad's approved home): the
/// address as a flat bar (`style: bar` of `address`) and the places as small
/// chips (`style: chips` of `vendors`).

/// The soonest time an open place in the area delivers in, in minutes.
int? soonestMinutes(List<MarketVendor> vendors) {
  int? soonest;
  for (final v in vendors) {
    final eta = v.etaMin;
    if (eta == null || v.state == MarketVendorState.closed || v.outsideArea) {
      continue;
    }
    if (soonest == null || eta < soonest) soonest = eta;
  }
  return soonest;
}

/// Where it delivers with the soonest time beside it and the search under
/// them, on the element's colour with its foot rounded.
class MarketAddressBar extends ConsumerWidget {
  const MarketAddressBar({
    super.key,
    required this.node,
    required this.home,
    required this.color,
  });

  final StudioNode node;
  final MarketHome home;
  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final soonest = soonestMinutes(home.vendors);
    // 128.10 The words on the bar readable on its colour; by night the
    // search field in the theme's dark colours, not a white field.
    final dark = Theme.of(context).brightness == Brightness.dark;
    final onBar = color.computeLuminance() > 0.5
        ? const Color(0xFF14231B)
        : Colors.white;
    // 130 On a bar of a dark colour of its own (a page's night), the field
    // that colour a step lighter, in the bar's family.
    final field = !dark
        ? Colors.white
        : color.computeLuminance() < 0.02
        ? Color.lerp(color, Colors.white, 0.08)!
        : p.surface;
    final fieldInk = dark ? p.textSecondary : const Color(0xFF5D6B63);
    return DecoratedBox(
      key: ValueKey('market-bar-${node.id}'),
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 22, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () =>
                        ref.read(marketPlaceProvider.notifier).useMyLocation(),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: onBar.withValues(alpha: 0.16),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: AppIcon(
                            Symbols.location_on_rounded,
                            size: 22,
                            color: onBar,
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
                                  fontSize: 12,
                                  color: onBar.withValues(alpha: 0.8),
                                ),
                              ),
                              Text(
                                home.address ?? l10n.marketChooseAddress,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: onBar,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (soonest != null) ...[
                  const SizedBox(width: 10),
                  Container(
                    key: const ValueKey('market-soonest'),
                    height: 32,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: p.accent,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppIcon(
                          Symbols.bolt_rounded,
                          size: 16,
                          color: Color(0xFF1B2A20),
                          filled: true,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          l10n.marketMinutes('$soonest'),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1B2A20),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 14),
            GestureDetector(
              key: const ValueKey('market-bar-search'),
              behavior: HitTestBehavior.opaque,
              onTap: () => openLocation(context, Paths.marketSearch),
              child: Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: field,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    AppIcon(Symbols.search_rounded, size: 22, color: fieldInk),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        node.text ?? l10n.marketSearchHint,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 15, color: fieldInk),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The places as small chips in a row: the place's photo beside its name,
/// its rating and soonest time; a tap opens it.
class MarketVendorChips extends StatelessWidget {
  const MarketVendorChips({
    super.key,
    required this.vendors,
    this.radius,
    this.showRating = true,
    this.showTime = true,
  });

  final List<MarketVendor> vendors;
  final double? radius;
  final bool showRating;
  final bool showTime;

  @override
  Widget build(BuildContext context) {
    if (vendors.isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    final l10n = context.l10n;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (final (i, v) in vendors.indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            GestureDetector(
              key: ValueKey('market-chip-${v.id}'),
              onTap: () => context.push(Paths.marketVendor(v.id)),
              child: Container(
                padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 12, 8),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(radius ?? 16),
                  border: Border.all(color: p.border),
                ),
                child: Row(
                  children: [
                    AppNetworkImage(
                      url: v.coverUrl,
                      seed: v.id.hashCode,
                      width: 40,
                      height: 40,
                      radius: 12,
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          v.name,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                        if (_facts(v, l10n) case final facts?)
                          StarText(
                            facts,
                            style: TextStyle(
                              fontSize: 11,
                              color: p.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String? _facts(MarketVendor v, AppLocalizations l10n) {
    final parts = [
      if (showRating && v.rating != null) '★ ${v.rating!.toStringAsFixed(1)}',
      if (showTime && v.etaMin != null) l10n.marketMinutes('${v.etaMin}'),
    ];
    return parts.isEmpty ? null : parts.join(' · ');
  }
}
