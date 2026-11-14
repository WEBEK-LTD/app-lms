import 'dart:async';

import 'package:flutter/material.dart';

import '../api/models/commerce_models.dart';
import '../l10n/l10n.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';

/// 131 A product's sale, wherever a product shows: the share off on a
/// chip, the price before it struck through, a live countdown to the
/// sale's end and a stock bar ("Only 12 left"). Shared by the shop's own
/// screens and the Studio elements.

/// Ticks every second while [endsAt] is ahead, and calls [onEnded] once it
/// has passed. With reduced motion the numbers still change, nothing moves.
class SaleCountdown extends StatefulWidget {
  const SaleCountdown({
    super.key,
    required this.endsAt,
    this.color,
    this.compact = false,
    this.onEnded,
    this.onDark = false,
    this.now,
  });

  final DateTime endsAt;
  final Color? color;

  /// One small line ("Ends in 05:21:09") instead of the boxes.
  final bool compact;
  final VoidCallback? onEnded;

  /// Light boxes on a dark (or coloured) background.
  final bool onDark;

  /// For tests: the clock.
  final DateTime Function()? now;

  @override
  State<SaleCountdown> createState() => _SaleCountdownState();
}

class _SaleCountdownState extends State<SaleCountdown> {
  Timer? _timer;

  DateTime _now() => widget.now?.call() ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (!widget.endsAt.isAfter(_now())) {
        _timer?.cancel();
        widget.onEnded?.call();
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final left = widget.endsAt.difference(_now());
    if (left.isNegative || left == Duration.zero) {
      return const SizedBox.shrink();
    }
    final days = left.inDays;
    final hours = left.inHours % 24;
    final minutes = left.inMinutes % 60;
    final seconds = left.inSeconds % 60;
    String two(int n) => n.toString().padLeft(2, '0');
    final clock = [
      if (days > 0) '${days}d',
      two(hours),
      two(minutes),
      two(seconds),
    ].join(days > 0 ? ' ' : ':');
    final color = widget.color ?? p.accent;
    final label = context.l10n.saleEndsIn(clock);
    if (widget.compact) {
      return Semantics(
        label: label,
        excludeSemantics: true,
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: color,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      );
    }
    final parts = [
      if (days > 0) (days, context.l10n.countdownDays),
      (hours, context.l10n.countdownHours),
      (minutes, context.l10n.countdownMinutes),
      (seconds, context.l10n.countdownSeconds),
    ];
    return Semantics(
      label: label,
      excludeSemantics: true,
      // Days first in every language, like a clock.
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final (i, (value, unit)) in parts.indexed) ...[
              if (i > 0) const SizedBox(width: 4),
              Container(
                key: ValueKey('sale-countdown-$i'),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: widget.onDark
                      ? Colors.white.withValues(alpha: 0.18)
                      : color,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${two(value)} $unit',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The share off on a small chip ("20% off").
class SaleChip extends StatelessWidget {
  const SaleChip({super.key, required this.percentOff, this.color});

  final int percentOff;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bg = color ?? p.accent;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          context.l10n.saleOff(percentOff),
          maxLines: 1,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: contrastRatio(Colors.white, bg) >= 3 ? Colors.white : p.text,
          ),
        ),
      ),
    );
  }
}

/// The sale price, and the price before it struck through.
class SalePrice extends StatelessWidget {
  const SalePrice({
    super.key,
    required this.sale,
    this.size = 15,
    this.color,
    this.onDark = false,
  });

  final ProductSale sale;
  final double size;
  final Color? color;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      children: [
        Text(
          sale.nowFormatted,
          style: TextStyle(
            fontSize: size,
            fontWeight: FontWeight.w800,
            color: onDark ? Colors.white : (color ?? p.text),
          ),
        ),
        Text(
          sale.wasFormatted,
          semanticsLabel: context.l10n.wasPrice(sale.wasFormatted),
          style: TextStyle(
            fontSize: size - 3,
            color: onDark
                ? Colors.white.withValues(alpha: 0.75)
                : p.textTertiary,
            decoration: TextDecoration.lineThrough,
          ),
        ),
      ],
    );
  }
}

/// How much of a limited sale has sold, and what's left.
class SaleStockBar extends StatelessWidget {
  const SaleStockBar({
    super.key,
    required this.remaining,
    required this.total,
    this.color,
    this.onDark = false,
  });

  final int remaining;
  final int total;
  final Color? color;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = onDark ? Colors.white : (color ?? p.accent);
    final sold = total > 0
        ? ((total - remaining) / total).clamp(0.0, 1.0)
        : 0.0;
    final label = remaining > 0
        ? context.l10n.saleLeft(remaining)
        : context.l10n.saleSoldOut;
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              key: const ValueKey('sale-stock-bar'),
              value: sold,
              minHeight: 6,
              color: c,
              backgroundColor: c.withValues(alpha: 0.2),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: c,
            ),
          ),
        ],
      ),
    );
  }
}

/// How the list's own cards below show a product's sale (`sale_badge` of a
/// Studio products list); missing, a chip in the app's accent colour.
class SaleBadgeScope extends InheritedWidget {
  const SaleBadgeScope({super.key, required this.badge, required super.child});

  final StudioSaleBadge badge;

  static StudioSaleBadge of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SaleBadgeScope>()?.badge ??
      const StudioSaleBadge();

  @override
  bool updateShouldNotify(SaleBadgeScope oldWidget) => oldWidget.badge != badge;
}

/// A product card's sale over its picture: a chip, or a ribbon across the
/// corner; nothing for `price` (the card's text shows the prices).
class SaleCorner extends StatelessWidget {
  const SaleCorner({super.key, required this.sale});

  final ProductSale sale;

  @override
  Widget build(BuildContext context) {
    final badge = SaleBadgeScope.of(context);
    final color = parseHexColor(badge.color) ?? context.palette.accent;
    switch (badge.style) {
      case SaleBadgeStyle.price:
        return const SizedBox.shrink();
      case SaleBadgeStyle.chip:
        return PositionedDirectional(
          top: 8,
          start: 8,
          child: SaleChip(percentOff: sale.percentOff, color: color),
        );
      case SaleBadgeStyle.ribbon:
        return PositionedDirectional(
          top: 0,
          end: 0,
          child: ClipRect(
            child: SizedBox(
              width: 72,
              height: 72,
              child: Align(
                alignment: AlignmentDirectional.topEnd,
                child: Transform.translate(
                  offset: Offset(
                    Directionality.of(context) == TextDirection.rtl ? -18 : 18,
                    14,
                  ),
                  child: Transform.rotate(
                    angle: Directionality.of(context) == TextDirection.rtl
                        ? -0.785
                        : 0.785,
                    child: Container(
                      key: const ValueKey('sale-ribbon'),
                      width: 96,
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      color: color,
                      alignment: Alignment.center,
                      child: Text(
                        context.l10n.saleOff(sale.percentOff),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
    }
  }
}

/// 131 A flash sale on a product's own page: the "−25%" badge, the new
/// price with the old one struck through, the countdown to its end
/// (hours, minutes and seconds) and, for a limited sale, "8 left" with its
/// stock bar. Hidden once it has ended.
class ProductFlashSale extends StatefulWidget {
  const ProductFlashSale({
    super.key,
    required this.sale,
    this.color,
    this.radius,
    this.now,
  });

  final ProductSale sale;

  /// The sale's colour (a Studio look's accent); missing, the app's.
  final Color? color;
  final double? radius;

  /// For tests: the clock.
  final DateTime Function()? now;

  @override
  State<ProductFlashSale> createState() => _ProductFlashSaleState();
}

class _ProductFlashSaleState extends State<ProductFlashSale> {
  bool _ended = false;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final sale = widget.sale;
    final at = widget.now?.call() ?? DateTime.now();
    if (_ended || !sale.liveAt(at)) return const SizedBox.shrink();
    final c = widget.color ?? p.accent;
    final radius = BorderRadius.circular(widget.radius ?? 16);
    return Container(
      key: const ValueKey('product-flash-sale'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.08),
        borderRadius: radius,
        border: Border.all(color: c.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.flashSale, size: 18, color: c),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l10n.flashSaleTitle,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: c,
                  ),
                ),
              ),
              DecoratedBox(
                key: const ValueKey('product-flash-percent'),
                decoration: BoxDecoration(
                  color: c,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  child: Text(
                    l10n.salePercentBadge(sale.percentOff),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: contrastRatio(Colors.white, c) >= 3
                          ? Colors.white
                          : p.text,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SalePrice(sale: sale, size: 22),
          if (sale.endsAt != null) ...[
            const SizedBox(height: 10),
            Text(
              l10n.flashEndsIn,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            const SizedBox(height: 4),
            // Smaller on a narrow screen rather than cut.
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: AlignmentDirectional.centerStart,
              child: SaleCountdown(
                endsAt: sale.endsAt!,
                color: c,
                now: widget.now,
                onEnded: () {
                  if (mounted) setState(() => _ended = true);
                },
              ),
            ),
          ],
          if (sale.remaining != null && sale.total != null) ...[
            const SizedBox(height: 12),
            SaleStockBar(
              remaining: sale.remaining!,
              total: sale.total!,
              color: c,
            ),
          ],
        ],
      ),
    );
  }
}
