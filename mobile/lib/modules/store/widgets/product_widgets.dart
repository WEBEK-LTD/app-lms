import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/sale_widgets.dart';
import '../../../core/l10n/l10n.dart';

/// The price as the shop shows it, with the regular price struck through
/// when on sale. 133.5 With the customer's currency: the price in it first
/// ("≈ \$12.40"), approximate, and the shop's own under it (on a card, only
/// the converted one fits; it is read out with the shop's).
class ProductPriceLabel extends StatelessWidget {
  const ProductPriceLabel(this.price, {super.key, this.size = 15});

  final ProductPrice price;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shown = price.display?.formatted;
    final regular = shown != null
        ? (price.display?.regularFormatted ?? price.regularFormatted)
        : price.regularFormatted;
    final main = shown != null
        ? context.l10n.approxPrice(shown)
        : price.formatted;
    final compact = size <= 14;
    final row = Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      children: [
        Text(
          main,
          semanticsLabel: shown != null ? '$main, ${price.formatted}' : null,
          style: TextStyle(
            fontSize: size,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        if (price.onSale && regular != null)
          Text(
            regular,
            semanticsLabel: context.l10n.wasPrice(regular),
            style: TextStyle(
              fontSize: size - 3,
              color: p.textTertiary,
              decoration: TextDecoration.lineThrough,
            ),
          ),
      ],
    );
    if (shown == null || compact) return row;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        row,
        const SizedBox(height: 2),
        Text(
          price.formatted,
          style: TextStyle(fontSize: size - 4, color: p.textSecondary),
        ),
      ],
    );
  }
}

String stockLabel(StockStatus status) => switch (status) {
  StockStatus.inStock => currentL10n.inStock,
  StockStatus.outOfStock => currentL10n.outOfStock,
  StockStatus.onBackorder => currentL10n.onBackorder,
};

/// A small tag on the product image ("Sale", "Out of stock").
class _Tag extends StatelessWidget {
  const _Tag(this.label, {required this.strong});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: strong ? p.accent : p.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: strong ? p.onAccent : p.text,
          ),
        ),
      ),
    );
  }
}

String _a11y(ProductSummary product) => [
  product.name,
  // 133.5 In the customer's currency, approximate, then the shop's.
  if (product.price.display?.formatted case final shown?)
    currentL10n.approxPrice(shown),
  product.price.formatted,
  if (product.price.onSale) currentL10n.onSaleLower,
  if (product.stockStatus == StockStatus.outOfStock)
    currentL10n.outOfStockLower,
].join(', ');

/// The height of a [ProductCard]'s text below its square image, for rows
/// and grids that need a fixed size.
double productCardTextHeight(BuildContext context) =>
    MediaQuery.textScalerOf(context).scale(136);

/// A product in the shop grid and the home rows.
class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    this.width,
    this.plain = false,
  });

  final ProductSummary product;
  final VoidCallback onTap;
  final double? width;

  /// Minimal template: a rounded picture and text, without a card.
  final bool plain;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final picture = AppNetworkImage(
      url: product.imageUrl,
      seed: product.id,
      placeholderIcon: AppIcons.shop,
      radius: plain ? context.shapes.card : 0,
    );
    final content = ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Stack(
              fit: StackFit.expand,
              children: [
                picture,
                if (product.stockStatus == StockStatus.outOfStock)
                  PositionedDirectional(
                    start: 8,
                    top: 8,
                    child: _Tag(context.l10n.outOfStock, strong: false),
                  )
                // 131 A sale with its share off.
                else if (product.sale case final sale?
                    when sale.liveAt(DateTime.now()))
                  PositionedDirectional(
                    start: 8,
                    top: 8,
                    child: SaleChip(percentOff: sale.percentOff),
                  )
                else if (product.price.onSale)
                  PositionedDirectional(
                    start: 8,
                    top: 8,
                    child: _Tag(context.l10n.sale, strong: true),
                  ),
              ],
            ),
          ),
          Padding(
            padding: plain
                ? const EdgeInsets.fromLTRB(2, 10, 2, 8)
                : const EdgeInsets.fromLTRB(10, 10, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 6),
                ProductPriceLabel(product.price, size: 14),
                // 131 A flash sale (one with an end): its countdown, live.
                if (product.sale case final sale?
                    when sale.endsAt != null &&
                        sale.liveAt(DateTime.now())) ...[
                  const SizedBox(height: 3),
                  SaleCountdown(endsAt: sale.endsAt!, compact: true),
                ],
                if (product.rating != null && product.ratingCount > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      AppIcon(
                        AppIcons.star,
                        size: 14,
                        color: p.star,
                        filled: true,
                      ),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          '${product.rating!.toStringAsFixed(1)} '
                          '(${product.ratingCount})',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
    final card = plain
        ? Semantics(
            button: true,
            label: _a11y(product),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(context.shapes.card),
              child: content,
            ),
          )
        : AppCard(onTap: onTap, semanticLabel: _a11y(product), child: content);
    return width == null ? card : SizedBox(width: width, child: card);
  }
}

/// 110 The height of a row of [CategoryChip]s: the picture and the names'
/// lines (one, or two when a name wraps).
double categoryRowHeight(BuildContext context, List<ProductCategory> list) {
  final style = DefaultTextStyle.of(context).style
      .merge(CategoryChip.nameStyle);
  final scaler = MediaQuery.textScalerOf(context);
  var text = 0.0;
  for (final c in list) {
    final painter = TextPainter(
      text: TextSpan(text: c.name, style: style),
      textDirection: Directionality.of(context),
      textScaler: scaler,
      maxLines: 2,
    )..layout(maxWidth: CategoryChip.width);
    if (painter.height > text) text = painter.height;
    painter.dispose();
  }
  return 64 + 6 + text + 6;
}

/// A category as a rounded chip with its image.
class CategoryChip extends StatelessWidget {
  const CategoryChip({
    super.key,
    required this.category,
    required this.onTap,
    this.square = false,
  });

  final ProductCategory category;
  final VoidCallback onTap;

  /// Bold template: a rounded square picture instead of a circle.
  final bool square;

  static const width = 84.0;
  static const nameStyle = TextStyle(fontSize: 12);

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: category.name,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(context.shapes.card),
        child: SizedBox(
          width: width,
          child: Column(
            children: [
              if (square)
                AppNetworkImage(
                  url: category.imageUrl,
                  seed: category.id,
                  width: 68,
                  height: 64,
                  radius: context.shapes.r(18),
                  placeholderIcon: AppIcons.shop,
                )
              else
                ClipOval(
                  child: AppNetworkImage(
                    url: category.imageUrl,
                    seed: category.id,
                    width: 64,
                    height: 64,
                    placeholderIcon: AppIcons.shop,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                category.name,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: nameStyle.copyWith(color: p.text),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// − quantity + buttons.
class QuantityControl extends StatelessWidget {
  const QuantityControl({
    super.key,
    required this.quantity,
    required this.onChanged,
    required this.max,
    this.min = 1,
    this.compact = false,
  });

  final int quantity;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final size = compact ? 36.0 : 44.0;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SquareIconButton(
          icon: AppIcons.remove,
          label: context.l10n.fewer,
          size: size,
          iconSize: 18,
          onPressed: quantity > min ? () => onChanged(quantity - 1) : null,
        ),
        SizedBox(
          width: 40,
          child: Text(
            '$quantity',
            textAlign: TextAlign.center,
            semanticsLabel: context.l10n.quantityIs(quantity),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
        ),
        SquareIconButton(
          icon: AppIcons.add,
          label: context.l10n.more,
          size: size,
          iconSize: 18,
          onPressed: quantity < max ? () => onChanged(quantity + 1) : null,
        ),
      ],
    );
  }
}

/// 131 Whether a shop's own word (an attribute's name) reads in the app's
/// language's script: Arabic letters in an Arabic app, none in the others.
bool Function(String) fitsLanguage(BuildContext context) {
  final arabicApp = Localizations.localeOf(context).languageCode == 'ar';
  final arabic = RegExp(r'[؀-ۿ]');
  return (word) => arabic.hasMatch(word) == arabicApp;
}

/// 131.25 A choice of two or three (a bouquet's sizes) as equal cards in one
/// row, the chosen one filled: a label "Deluxe · 24 stems" shows its first
/// part as the name and the rest under it.
class ChoiceCards extends StatelessWidget {
  const ChoiceCards({
    super.key,
    required this.options,
    required this.chosen,
    required this.onTap,
  });

  /// (value, label) in order.
  final List<(String, String)> options;
  final String? chosen;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return IntrinsicHeight(
      child: Row(
        key: const ValueKey('product-choice-cards'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, (value, label)) in options.indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: Builder(
                builder: (context) {
                  final on = value == chosen;
                  final parts = label.split(' · ');
                  final ink = on ? p.onPrimary : p.text;
                  return Semantics(
                    button: true,
                    selected: on,
                    label: label,
                    excludeSemantics: true,
                    child: Material(
                      key: ValueKey('product-choice-$value'),
                      color: on ? p.primary : p.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(
                          color: on ? p.primary : p.border,
                          width: on ? 1.5 : 1,
                        ),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => onTap(value),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 12,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              AppIcon(
                                AppIcons.florist,
                                size: on ? 24 : 20,
                                color: on ? p.onPrimary : p.primary,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                parts.first,
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: ink,
                                ),
                              ),
                              if (parts.length > 1)
                                Text(
                                  parts.skip(1).join(' · '),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: on
                                        ? p.onPrimary.withValues(alpha: 0.85)
                                        : p.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
