import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/api/models/page_models.dart';
import '../data/market_models.dart';

/// 115 What the marketplace's screens share: money, tints, a vendor's
/// mark, its facts (time, fee, smallest order) and the section heads.

/// "EGP 530.00": an amount the app adds up itself (the basket's running
/// total), in the app's currency and decimals. The server's amounts come
/// written already.
String marketAmount(double amount, String currency, [int decimals = 2]) {
  final text = NumberFormat.decimalPatternDigits(
    locale: 'en',
    decimalDigits: decimals,
  ).format(amount);
  return ltrRun('$currency $text');
}

/// "2.4k" for 2400 ratings.
String marketCount(int count) =>
    count >= 1000 ? '${(count / 1000).toStringAsFixed(1)}k' : '$count';

/// The brand colour over the card colour, lightly: chips and soft tiles.
Color marketTint(AppPalette p, Color color, [double amount = 0.12]) =>
    Color.alphaBlend(color.withValues(alpha: amount), p.surface);

/// A darker shade of [color], for the end of a gradient.
Color marketDeeper(Color color, [double amount = 0.28]) =>
    Color.alphaBlend(Colors.black.withValues(alpha: amount), color);

const _marks = [
  Color(0xFFE4572E),
  Color(0xFF2E86AB),
  Color(0xFF7B4DB6),
  Color(0xFF1F9D6B),
  Color(0xFFD9822B),
  Color(0xFFC2185B),
  Color(0xFF3D5A80),
];

/// A vendor's logo, else its initials on a colour of its own.
class MarketVendorMark extends StatelessWidget {
  const MarketVendorMark({super.key, required this.vendor, this.size = 44});

  final MarketVendor vendor;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = _marks[vendor.name.hashCode.abs() % _marks.length];
    final words = vendor.name
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty && RegExp(r'\w').hasMatch(w))
        .toList();
    final initials = words.take(2).map((w) => w.characters.first).join();
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        border: Border.all(color: p.surface, width: size > 40 ? 3 : 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: vendor.logoUrl.isNotEmpty
          ? AppNetworkImage(url: vendor.logoUrl, width: size, height: size)
          : Text(
              initials.toUpperCase(),
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.34,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
    );
  }
}

/// The stars and how many rated.
class MarketRating extends StatelessWidget {
  const MarketRating({super.key, required this.vendor, this.light = false});

  final MarketVendor vendor;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (!MarketCardLook.of(context).shows(StudioMarketFact.rating)) {
      return const SizedBox.shrink();
    }
    final rating = vendor.rating;
    if (rating == null) {
      return MarketPill(
        text: context.l10n.marketNew,
        background: marketTint(p, p.primary, 0.12),
        color: p.primary,
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(Symbols.star_rounded, size: 16, color: p.star, filled: true),
        const SizedBox(width: 3),
        Text(
          rating.toStringAsFixed(1),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: light ? Colors.white : p.text,
          ),
        ),
        const SizedBox(width: 3),
        Flexible(
          child: Text(
            context.l10n.marketRatingsCount(marketCount(vendor.ratings)),
            maxLines: 1,
            overflow: TextOverflow.clip,
            style: TextStyle(
              fontSize: 12,
              color: light ? Colors.white70 : p.textTertiary,
            ),
          ),
        ),
      ],
    );
  }
}

/// Time, delivery fee and smallest order, in one line.
class MarketVendorFacts extends StatelessWidget {
  const MarketVendorFacts({
    super.key,
    required this.vendor,
    this.wrap = true,
    this.eta = true,
  });

  final MarketVendor vendor;

  /// False: the first two facts only.
  final bool wrap;

  /// False where the time shows already (on the card's picture).
  final bool eta;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final style = TextStyle(
      fontSize: 12.5,
      fontWeight: FontWeight.w600,
      color: p.textSecondary,
    );
    Widget fact(IconData icon, String text, {Color? color}) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(icon, size: 15, color: color ?? p.textTertiary),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: style.copyWith(color: color),
          ),
        ),
      ],
    );
    final minutes = marketEtaText(context, vendor);
    final look = MarketCardLook.of(context);
    final facts = [
      if (eta && minutes != null && look.shows(StudioMarketFact.time))
        fact(Symbols.schedule_rounded, minutes),
      if (!look.shows(StudioMarketFact.fee))
        ...const <Widget>[]
      else if (vendor.freeDelivery)
        fact(
          Symbols.two_wheeler_rounded,
          l10n.marketFreeDelivery,
          color: p.success,
        )
      else if (vendor.deliveryFee case final fee?)
        fact(Symbols.two_wheeler_rounded, l10n.marketDeliveryFee(ltrRun(fee))),
      if (vendor.minOrder case final min?
          when look.shows(StudioMarketFact.minOrder))
        fact(Symbols.shopping_bag_rounded, l10n.marketMinOrder(ltrRun(min))),
    ];
    if (!wrap) {
      // One line: each fact takes its share and ends in "…" when it must.
      return Row(
        children: [
          for (final (i, f) in facts.take(2).indexed) ...[
            if (i > 0) const SizedBox(width: 12),
            Flexible(child: f),
          ],
        ],
      );
    }
    return Wrap(
      spacing: 12,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: facts,
    );
  }
}

/// "20–30 min", or null without the customer's position.
String? marketEtaText(BuildContext context, MarketVendor vendor) {
  final min = vendor.etaMin;
  final max = vendor.etaMax;
  if (min == null || max == null) return null;
  return context.l10n.marketEta(min, max);
}

/// A small coloured label: an offer, Club, Busy.
class MarketPill extends StatelessWidget {
  const MarketPill({
    super.key,
    required this.text,
    required this.background,
    required this.color,
    this.icon,
  });

  final String text;
  final Color background;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 10, 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            AppIcon(icon!, size: 14, color: color, filled: true),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: color,
                letterSpacing: 0.1,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// A section's title, its line under it and "See all".
class MarketSectionHead extends StatelessWidget {
  const MarketSectionHead({
    super.key,
    required this.title,
    this.subtitle,
    this.color,
    this.onSeeAll,
  });

  final String? title;
  final String? subtitle;
  final Color? color;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final heading = title;
    if (heading == null || heading.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 12, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  heading,
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: color ?? p.text,
                  ),
                ),
                if (subtitle case final s? when s.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    s,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
              ],
            ),
          ),
          if (onSeeAll != null)
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                foregroundColor: p.primary,
                visualDensity: VisualDensity.compact,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    context.l10n.marketSeeAll,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    ),
                  ),
                  const SizedBox(width: 2),
                  AppIcon(AppIcons.forward, size: 16, color: p.primary),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Presses in a little under the finger.
class MarketPressable extends StatefulWidget {
  const MarketPressable({super.key, required this.child, this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  State<MarketPressable> createState() => _MarketPressableState();
}

class _MarketPressableState extends State<MarketPressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTap: widget.onTap,
    onTapDown: (_) => setState(() => _down = true),
    onTapUp: (_) => setState(() => _down = false),
    onTapCancel: () => setState(() => _down = false),
    child: AnimatedScale(
      scale: _down ? 0.97 : 1,
      duration: const Duration(milliseconds: 140),
      curve: Curves.easeOut,
      child: widget.child,
    ),
  );
}

/// Editor audit 3.4: the card look the owner chose for a section of places
/// (`StudioMarket.card`). Outside a section (a vendor's own page), the
/// usual card with every fact.
class MarketCardLook extends InheritedWidget {
  const MarketCardLook({super.key, required this.card, required super.child});

  final StudioMarketCard card;

  static StudioMarketCard of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<MarketCardLook>()?.card ??
      const StudioMarketCard();

  @override
  bool updateShouldNotify(MarketCardLook oldWidget) => oldWidget.card != card;
}
