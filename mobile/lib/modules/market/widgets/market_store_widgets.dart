import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import 'market_look.dart';

/// 115.40 The pieces a supermarket's screens share (designs 01–05 of
/// 18 November 2026): amounts by weight, the "By weight" badge, photos cut
/// as arches, the add button and its stepper, a product's tile, the store's
/// search with its barcode button and the cart bar.

/// "750 g", "1 kg", "1.5 kg", "2 L", or "3" for items: an amount of [unit].
/// Kilos under one are written in grams, as a scale reads them.
String marketAmountText(AppLocalizations l10n, MarketUnit unit, double q) {
  String n(double v) => ltrRun(
    v % 1 == 0
        ? v.toStringAsFixed(0)
        : v
              .toStringAsFixed(v * 10 % 1 == 0 ? 1 : 2)
              .replaceFirst(RegExp(r'0$'), ''),
  );
  return switch (unit) {
    MarketUnit.piece => n(q),
    MarketUnit.g => l10n.marketAmountG(n(q)),
    MarketUnit.l => l10n.marketAmountL(n(q)),
    MarketUnit.kg when q < 1 => l10n.marketAmountG(n(q * 1000)),
    MarketUnit.kg => l10n.marketAmountKg(n(q)),
  };
}

/// "/ kg", "/ g" or "/ L" after a weighed item's price.
String marketPerUnit(AppLocalizations l10n, MarketUnit unit) => switch (unit) {
  MarketUnit.g => l10n.marketPerGram,
  MarketUnit.l => l10n.marketPerLitre,
  _ => l10n.marketPerKg,
};

/// The weighing scale and "By weight".
class MarketByWeightBadge extends StatelessWidget {
  const MarketByWeightBadge({
    super.key,
    this.onPhoto = false,
    this.big = false,
  });

  /// Dark glass over a photo; otherwise the brand's tint.
  final bool onPhoto;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final color = onPhoto ? Colors.white : p.primary;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: big ? 12 : 9,
        vertical: big ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: onPhoto
            ? Colors.black.withValues(alpha: 0.55)
            : marketTint(p, p.primary, 0.12),
        borderRadius: BorderRadius.circular(big ? 14 : 10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(Symbols.scale_rounded, size: big ? 18 : 15, color: color),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              big ? l10n.marketSoldByWeight : l10n.marketByWeight,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: big ? 13.5 : 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A photo cut as an arch: round at the top, square at the foot.
class MarketArch extends StatelessWidget {
  const MarketArch({
    super.key,
    required this.url,
    required this.seed,
    this.width,
    this.height,
  });

  final String? url;
  final int seed;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    height: height,
    child: ClipRRect(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular((width ?? 80) / 2),
        bottom: const Radius.circular(6),
      ),
      child: AppNetworkImage(url: url, seed: seed),
    ),
  );
}

/// The round + over a product's photo, then − amount + once it's in.
class MarketAddStepper extends StatelessWidget {
  const MarketAddStepper({
    super.key,
    required this.item,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
  });

  final MarketItem item;
  final double quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final shadow = [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.18),
        blurRadius: 10,
        offset: const Offset(0, 3),
      ),
    ];
    if (quantity <= 0) {
      return Semantics(
        button: true,
        label: l10n.marketAdd,
        child: GestureDetector(
          onTap: onAdd,
          child: Container(
            key: ValueKey('market-add-${item.id}'),
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: p.surface,
              shape: BoxShape.circle,
              boxShadow: shadow,
            ),
            alignment: Alignment.center,
            child: AppIcon(Symbols.add_rounded, size: 24, color: p.primary),
          ),
        ),
      );
    }
    Widget tap(IconData icon, VoidCallback onTap, String key, String label) =>
        Semantics(
          button: true,
          label: label,
          child: InkResponse(
            key: ValueKey(key),
            onTap: onTap,
            radius: 20,
            child: SizedBox(
              width: 38,
              height: 38,
              child: AppIcon(icon, size: 20, color: p.onPrimary),
            ),
          ),
        );
    return Container(
      height: 38,
      constraints: const BoxConstraints(maxWidth: 140),
      decoration: BoxDecoration(
        color: p.primary,
        borderRadius: BorderRadius.circular(19),
        boxShadow: shadow,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          tap(Symbols.remove_rounded, onRemove, 'market-minus-${item.id}', '−'),
          Flexible(
            child: Text(
              marketAmountText(l10n, item.unit, quantity),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: p.onPrimary,
              ),
            ),
          ),
          tap(Symbols.add_rounded, onAdd, 'market-plus-${item.id}', '+'),
        ],
      ),
    );
  }
}

/// A product in a store's grid (design 02): the photo with its badge and
/// the add button over it, then the name, its words and the price.
class MarketProductCard extends StatelessWidget {
  const MarketProductCard({
    super.key,
    required this.item,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
    required this.onOpen,
  });

  final MarketItem item;
  final double quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final off = item.badge;
    final words = [
      ?item.brand,
      ?item.description,
    ].where((w) => w.isNotEmpty).join(' · ');
    return Opacity(
      opacity: item.inStock ? 1 : 0.6,
      child: Material(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned.fill(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(19),
                          child: AppNetworkImage(
                            url: item.imageUrl,
                            seed: item.id.hashCode,
                          ),
                        ),
                      ),
                      PositionedDirectional(
                        top: 8,
                        start: 8,
                        end: 8,
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: off != null
                              ? MarketPill(
                                  text: percentText(off),
                                  background: p.accent,
                                  color: p.onAccent,
                                )
                              : item.byWeight
                              ? const MarketByWeightBadge(onPhoto: true)
                              : const SizedBox.shrink(),
                        ),
                      ),
                      PositionedDirectional(
                        end: 8,
                        bottom: 8,
                        start: quantity > 0 ? 8 : null,
                        child: Align(
                          alignment: quantity > 0
                              ? Alignment.center
                              : AlignmentDirectional.centerEnd,
                          child: item.inStock
                              ? MarketAddStepper(
                                  item: item,
                                  quantity: quantity,
                                  onAdd: onAdd,
                                  onRemove: onRemove,
                                )
                              : MarketPill(
                                  text: l10n.marketSoldOut,
                                  background: p.text,
                                  color: p.background,
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(6, 10, 6, 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      if (words.isNotEmpty)
                        Text(
                          words,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: p.textSecondary,
                          ),
                        ),
                      const SizedBox(height: 4),
                      MarketPriceLine(item: item),
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

/// "EGP 35.00 /kg EGP 42.00": the price, per unit for weighed items, and
/// the price before the discount struck through.
class MarketPriceLine extends StatelessWidget {
  const MarketPriceLine({super.key, required this.item, this.size = 16});

  final MarketItem item;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: ltrRun(item.price),
            style: TextStyle(
              fontSize: size,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          if (item.byWeight)
            TextSpan(
              text: ' ${marketPerUnit(l10n, item.unit)}',
              style: TextStyle(
                fontSize: size * 0.75,
                fontWeight: FontWeight.w600,
                color: p.textSecondary,
              ),
            ),
          if (item.oldPrice case final was?)
            TextSpan(
              text: '  ${ltrRun(was)}',
              style: TextStyle(
                fontSize: size * 0.75,
                color: p.textTertiary,
                decoration: TextDecoration.lineThrough,
              ),
            ),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// This store's search, with the barcode button beside it.
class MarketStoreSearch extends StatelessWidget {
  const MarketStoreSearch({
    super.key,
    required this.storeName,
    required this.onSearch,
    required this.onScan,
    this.initial,
  });

  final String storeName;
  final ValueChanged<String> onSearch;
  final VoidCallback onScan;
  final String? initial;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            key: const ValueKey('market-store-search'),
            initialValue: initial,
            textInputAction: TextInputAction.search,
            onFieldSubmitted: (q) {
              if (q.trim().isNotEmpty) onSearch(q.trim());
            },
            decoration: InputDecoration(
              hintText: l10n.marketSearchStore(storeName),
              filled: true,
              fillColor: p.surface,
              prefixIcon: AppIcon(
                Symbols.search_rounded,
                color: p.textSecondary,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(26),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(26),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Semantics(
          button: true,
          label: l10n.marketScanBarcode,
          child: Material(
            color: p.primary,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              key: const ValueKey('market-scan'),
              borderRadius: BorderRadius.circular(18),
              onTap: onScan,
              child: SizedBox(
                width: 52,
                height: 52,
                child: AppIcon(
                  Symbols.barcode_scanner_rounded,
                  size: 26,
                  color: p.onPrimary,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// The cart bar of a store's pages: how many, the estimate before
/// weighing, and the way to the checkout.
class MarketCartBar extends StatelessWidget {
  const MarketCartBar({
    super.key,
    required this.count,
    required this.estimate,
    required this.onTap,
  });

  final int count;
  final String estimate;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final deep = marketDeeper(p.primary, 0.32);
    return Semantics(
      button: true,
      child: GestureDetector(
        key: const ValueKey('market-cart-bar'),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsetsDirectional.fromSTEB(10, 8, 8, 8),
          decoration: BoxDecoration(
            color: deep,
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: deep.withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '$count',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.marketViewBasket,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      l10n.marketEstimatedAmount(estimate),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: p.accent,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      l10n.marketGoCheckout,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: p.onAccent,
                      ),
                    ),
                    const SizedBox(width: 6),
                    AppIcon(AppIcons.forward, size: 18, color: p.onAccent),
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

/// A round glass button over a photo (back, share, close, favourite).
class MarketGlassButton extends StatelessWidget {
  const MarketGlassButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.label,
    this.filled = false,
    this.color,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String? label;
  final bool filled;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: p.surface.withValues(alpha: 0.82),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: AppIcon(
            icon,
            size: 22,
            color: color ?? p.text,
            filled: filled,
          ),
        ),
      ),
    );
  }
}
