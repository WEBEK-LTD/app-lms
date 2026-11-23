import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';

/// 209 What a product's page tells besides its description
/// (`ProductDetail.info`, `badges`, `expiry`, `age_months` and the facts,
/// its attributes not chosen): its promises as small badges under the
/// price with the ages it is for and its expiry, its parts in its own words
/// (ingredients, how to use it, safety, materials, care, what is in the
/// box) each under the app's title, the first one open, and its facts as a
/// table. A choice whose options have swatch colours (a lipstick's shades)
/// shows them as swatches ([SwatchChip]). An app before 209 shows none of
/// it; a product without them shows nothing more.

/// The ages a product is for, in the app's words.
String productAgesLabel(BuildContext context, ProductAges ages) {
  final l = context.l10n;
  final min = ages.min;
  final max = ages.max;
  int years(int months) => months ~/ 12;
  if (max == null) {
    return min < 24
        ? l.productAgePlusMonths(min)
        : l.productAgePlusYears(years(min));
  }
  if (max < 24) return l.productAgeMonths(min, max);
  if (min < 24) return l.productAgeMixed(min, years(max));
  return l.productAgeYears(years(min), years(max));
}

/// `2027-06` as the app's language writes a month and a year (06/2027).
String productExpiryLabel(BuildContext context, String expiry) {
  final parts = expiry.split('-');
  return context.l10n.productExpiry(
    parts.length == 2 ? '${parts[1]}/${parts[0]}' : expiry,
  );
}

IconData productBadgeIcon(ProductBadge badge) => switch (badge) {
  ProductBadge.genuine => AppIcons.genuine,
  ProductBadge.safetyTested => AppIcons.safetyTested,
  ProductBadge.organic => AppIcons.organic,
  ProductBadge.handmade => AppIcons.handmade,
  ProductBadge.crueltyFree => AppIcons.crueltyFree,
  ProductBadge.giftWrap => AppIcons.gift,
};

String productBadgeLabel(BuildContext context, ProductBadge badge) {
  final l = context.l10n;
  return switch (badge) {
    ProductBadge.genuine => l.productBadgeGenuine,
    ProductBadge.safetyTested => l.productBadgeSafetyTested,
    ProductBadge.organic => l.productBadgeOrganic,
    ProductBadge.handmade => l.productBadgeHandmade,
    ProductBadge.crueltyFree => l.productBadgeCrueltyFree,
    ProductBadge.giftWrap => l.productBadgeGiftWrap,
  };
}

IconData productInfoIcon(ProductInfoKind kind) => switch (kind) {
  ProductInfoKind.ingredients => AppIcons.ingredients,
  ProductInfoKind.howToUse => AppIcons.howToUse,
  ProductInfoKind.safety => AppIcons.safetyTested,
  ProductInfoKind.materials => AppIcons.materials,
  ProductInfoKind.care => AppIcons.care,
  ProductInfoKind.inTheBox => AppIcons.bundle,
};

String productInfoTitle(BuildContext context, ProductInfoKind kind) {
  final l = context.l10n;
  return switch (kind) {
    ProductInfoKind.ingredients => l.productInfoIngredients,
    ProductInfoKind.howToUse => l.productInfoHowToUse,
    ProductInfoKind.safety => l.productInfoSafety,
    ProductInfoKind.materials => l.productInfoMaterials,
    ProductInfoKind.care => l.productInfoCare,
    ProductInfoKind.inTheBox => l.productInfoInTheBox,
  };
}

/// Under the price: the ages, the badges and the expiry, as small chips.
class ProductBadges extends StatelessWidget {
  const ProductBadges({super.key, required this.product});

  final ProductDetail product;

  static bool shows(ProductDetail p) =>
      p.badges.isNotEmpty || p.ages != null || p.expiry != null;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget chip(IconData icon, String label, Key key) => Container(
      key: key,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(icon, size: 16, color: p.text),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ),
        ],
      ),
    );
    final ages = product.ages;
    final expiry = product.expiry;
    return Wrap(
      key: const ValueKey('product-badges'),
      spacing: 8,
      runSpacing: 8,
      children: [
        if (ages != null)
          chip(
            AppIcons.ages,
            productAgesLabel(context, ages),
            const ValueKey('product-ages'),
          ),
        for (final b in product.badges)
          chip(
            productBadgeIcon(b),
            productBadgeLabel(context, b),
            ValueKey('product-badge-${b.name}'),
          ),
        if (expiry != null)
          chip(
            AppIcons.event,
            productExpiryLabel(context, expiry),
            const ValueKey('product-expiry'),
          ),
      ],
    );
  }
}

/// Its parts in its own words, each under the app's title; the first open.
class ProductInfoSections extends StatelessWidget {
  const ProductInfoSections({super.key, required this.product});

  final ProductDetail product;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      key: const ValueKey('product-info'),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (final (i, info) in product.info.indexed) ...[
            if (i > 0) Divider(height: 1, color: p.border),
            Theme(
              data: Theme.of(context)
                  .copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                key: ValueKey('product-info-${info.kind.name}'),
                initiallyExpanded: i == 0,
                leading: AppIcon(
                  productInfoIcon(info.kind),
                  size: 20,
                  color: p.text,
                ),
                title: Text(
                  productInfoTitle(context, info.kind),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                childrenPadding: const EdgeInsetsDirectional.fromSTEB(
                  16,
                  0,
                  16,
                  14,
                ),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final para in info.text.split(RegExp(r'\n\s*\n')))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        para.trim(),
                        style: TextStyle(
                          fontSize: 14,
                          height: 1.5,
                          color: p.textSecondary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Its facts as a table: the name, then the value.
class ProductFacts extends StatelessWidget {
  const ProductFacts({super.key, required this.facts});

  final List<ProductAttribute> facts;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Table(
      key: const ValueKey('product-facts'),
      columnWidths: const {0: FlexColumnWidth(2), 1: FlexColumnWidth(3)},
      border: TableBorder(horizontalInside: BorderSide(color: p.border)),
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        for (final f in facts)
          TableRow(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text(
                  f.name,
                  style: TextStyle(fontSize: 13.5, color: p.textSecondary),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text(
                  f.options.map((o) => o.label).join(', '),
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// A choice's option drawn as its swatch colour, its name under it.
class SwatchChip extends StatelessWidget {
  const SwatchChip({
    super.key,
    required this.option,
    required this.selected,
    required this.onTap,
    this.soldOut = false,
  });

  final AttributeOption option;
  final bool selected;
  final bool soldOut;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = parseHexColor(option.swatch) ?? p.border;
    final label = soldOut
        ? context.l10n.optionSoldOut(option.label)
        : selected
        ? context.l10n.swatchChosen(option.label)
        : option.label;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Opacity(
        opacity: soldOut ? 0.4 : 1,
        child: InkWell(
          key: ValueKey('swatch-option-${option.value}'),
          onTap: soldOut ? null : onTap,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected
                          ? p.text
                          : Colors.black.withValues(alpha: 0.08),
                      width: selected ? 2.5 : 1,
                      strokeAlign: BorderSide.strokeAlignOutside,
                    ),
                  ),
                  child: soldOut ? CustomPaint(painter: _Struck(p.text)) : null,
                ),
                const SizedBox(height: 4),
                Text(
                  option.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                    color: selected ? p.text : p.textSecondary,
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

class _Struck extends CustomPainter {
  _Struck(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawLine(
      Offset(size.width * 0.15, size.height * 0.85),
      Offset(size.width * 0.85, size.height * 0.15),
      Paint()
        ..color = color
        ..strokeWidth = 1.5,
    );
  }

  @override
  bool shouldRepaint(_Struck old) => old.color != color;
}
