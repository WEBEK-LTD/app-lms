import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import '../../../core/format/text_case.dart';
import '../../../core/gate/app_gate.dart' show appConfigProvider;
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/routing/app_router.dart' show openLocation;
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/sale_widgets.dart';
import '../../lms/courses/community_widgets.dart' show StarRow;
import '../../lms/lesson/content/html_content.dart';
import '../../store/data/cart_controller.dart';
import '../../store/widgets/option_sheet.dart';
import '../../store/widgets/product_details.dart';
import '../../store/widgets/product_widgets.dart';
import '../../store/widgets/quick_add.dart';
import '../../store/widgets/shop_features.dart';
import 'studio_page.dart' show StudioScope;
import 'studio_size_chart.dart' show showSizeGuide;

/// 228 The product page's elements (`STUDIO_PRODUCT_TYPES`): on a Studio
/// page drawn for the product screen (`StudioPage.screen` `product`), each
/// bound to the product the page is opened on ([ProductPageScope]), in the
/// look the owner chose in Studio (components/studio/product-page.tsx draws
/// the same on the canvas). Anywhere else they draw nothing. What the
/// customer chooses (a size, a colour, how many, the photo) is the page's,
/// shared by its elements: the price follows the size chosen, Add to cart
/// adds it.

/// The product a product page is drawn for, and what the customer chose.
class ProductPageController extends ChangeNotifier {
  ProductPageController(this.product) {
    // 131 The variation the shop chose for when the page opens.
    for (final a in product.choices) {
      final value = product.defaultAttributes[a.slug];
      if (value != null && a.options.any((o) => o.value == value)) {
        chosen[a.slug] = value;
      }
    }
  }

  final ProductDetail product;
  final Map<String, String> chosen = {};
  int quantity = 1;
  int image = 0;

  /// 208 Whether no variation with [value] for [slug] (and the other
  /// choices made) is left to buy.
  bool soldOut(String slug, String value) {
    final variations = product.variations;
    if (variations.isEmpty) return false;
    final wanted = {
      for (final e in chosen.entries)
        if (e.key != slug) e.key: e.value,
      slug: value,
    };
    final matching = variations.where((v) => v.matches(wanted));
    return matching.isNotEmpty &&
        matching.every((v) => v.stockStatus == StockStatus.outOfStock);
  }

  bool get choicesComplete =>
      product.choices.every((a) => (chosen[a.slug] ?? '').isNotEmpty);

  ProductVariation? get variation {
    if (product.summary.type != ProductType.variable || !choicesComplete) {
      return null;
    }
    return product.variations.where((v) => v.matches(chosen)).firstOrNull;
  }

  int? get maxQuantity => variation?.maxQuantity ?? product.maxQuantity;

  ProductPrice get price => variation?.price ?? product.summary.price;

  StockStatus get stock =>
      variation?.stockStatus ?? product.summary.stockStatus;

  /// Its photos: the variation's first, then the product's.
  List<String> get images => [
    if (variation?.imageUrl != null) variation!.imageUrl!,
    for (final i in product.images) i.url,
    if (product.images.isEmpty && product.summary.imageUrl != null)
      product.summary.imageUrl!,
  ];

  /// The lowest of its variations' prices ("From"), else its own.
  String get lowestPrice {
    final prices = [for (final v in product.variations) v.price];
    if (prices.isEmpty) return product.summary.price.shown;
    prices.sort((a, b) => centsOf(a.amount).compareTo(centsOf(b.amount)));
    return prices.first.shown;
  }

  void choose(String slug, String value) {
    if (chosen[slug] == value) {
      chosen.remove(slug);
    } else {
      chosen[slug] = value;
    }
    final max = maxQuantity;
    if (max != null && quantity > max) quantity = max < 1 ? 1 : max;
    image = 0;
    notifyListeners();
  }

  void setQuantity(int value) {
    quantity = value;
    notifyListeners();
  }

  void setImage(int value) {
    image = value;
    notifyListeners();
  }

  /// The choices not made yet, for "Choose a size".
  List<String> get missing => [
    for (final a in product.choices)
      if ((chosen[a.slug] ?? '').isEmpty) a.name,
  ];
}

/// 228 Holds the open product for the product page's elements under it.
class ProductPageScope extends InheritedNotifier<ProductPageController> {
  const ProductPageScope({
    super.key,
    required ProductPageController controller,
    required super.child,
  }) : super(notifier: controller);

  static ProductPageController? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ProductPageScope>()?.notifier;
}

/// 228 Whether the product page element [node] has something to show for
/// the product open: nothing outside a product page, nor a list, a table
/// or reviews the product hasn't.
bool studioProductShows(BuildContext context, WidgetRef ref, StudioNode node) {
  final c = ProductPageScope.of(context);
  if (c == null) return false;
  final product = c.product;
  return switch (node.type) {
    StudioNodeType.productVariants => product.choices.isNotEmpty,
    StudioNodeType.productQuantity =>
      product.optionGroups.isEmpty && _cta(ref, c) == ProductCta.addToCart,
    StudioNodeType.productDescription =>
      product.descriptionHtml.trim().isNotEmpty ||
          (product.shortDescriptionHtml ?? '').trim().isNotEmpty,
    StudioNodeType.productSpecs =>
      product.specs.isNotEmpty || product.facts.isNotEmpty,
    StudioNodeType.productReviews =>
      product.reviewsPreview != null ||
          (product.summary.rating != null && product.summary.ratingCount > 0),
    StudioNodeType.productRelated =>
      (node.productPart.completeLook ? product.completeLook : product.related)
          .isNotEmpty,
    StudioNodeType.productDelivery => _deliveryLines(
      context,
      ref,
      node,
      c,
    ).isNotEmpty,
    _ => true,
  };
}

ProductCta _cta(WidgetRef ref, ProductPageController c) => resolveProductCta(
  product: c.product.summary,
  platform: ref.watch(appEnvironmentProvider).platform,
  choicesComplete: c.choicesComplete,
  variation: c.variation,
);

/// One of the product page's elements, drawn for the product open.
class StudioProductView extends ConsumerWidget {
  const StudioProductView({
    super.key,
    required this.node,
    required this.scope,
    required this.style,
    this.color,
  });

  final StudioNode node;
  final StudioScope scope;

  /// Its font and colour as the owner set them (`StudioNode.font`, `color`).
  final TextStyle style;
  final Color? color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = ProductPageScope.of(context);
    if (c == null) return const SizedBox.shrink();
    final p = context.palette;
    final accent =
        parseHexColor(node.productPart.accentFor(dark: scope.dark)) ??
        p.primary;
    final ink = color ?? p.text;
    final title = (node.text ?? '').trim();
    final look = node.productPart.look;
    switch (node.type) {
      case StudioNodeType.productGallery:
        return _Gallery(
          node: node,
          controller: c,
          topInset: scope.bleedId == node.id ? scope.topInset : 0,
          accent: accent,
        );
      case StudioNodeType.productTitle:
        return _Title(controller: c, style: style, ink: ink, look: look);
      case StudioNodeType.productPrice:
        return _Price(controller: c, style: style, ink: ink, look: look);
      case StudioNodeType.productVariants:
        return _Variants(
          controller: c,
          ink: ink,
          accent: accent,
          look: look,
          title: title,
        );
      case StudioNodeType.productQuantity:
        return _Quantity(controller: c, ink: ink, look: look);
      case StudioNodeType.productBuy:
        return _Buy(
          node: node,
          controller: c,
          ink: ink,
          accent: accent,
          look: look,
        );
      case StudioNodeType.productDescription:
        return _Description(
          controller: c,
          ink: ink,
          title: title,
          accordion: look == 'accordion',
          line: parseHexColor(
            scope.dark
                ? (node.darkBorderColor ?? node.borderColor)
                : node.borderColor,
          ),
        );
      case StudioNodeType.productSpecs:
        return _Specs(
          controller: c,
          node: node,
          ink: ink,
          title: title,
          list: look == 'list',
          accent: accent,
        );
      case StudioNodeType.productReviews:
        return _Reviews(
          controller: c,
          ink: ink,
          title: title,
          bars: look == 'bars',
        );
      case StudioNodeType.productRelated:
        return _Related(
          controller: c,
          node: node,
          ink: ink,
          title: title,
          grid: look == 'grid',
        );
      case StudioNodeType.productDelivery:
        return _Delivery(
          lines: _deliveryLines(context, ref, node, c),
          ink: ink,
          title: title.isNotEmpty
              ? title
              : look == 'card'
              ? context.l10n.productDeliveryReturns
              : null,
          accent: parseHexColor(node.productPart.accentFor(dark: scope.dark)),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

/// A heading over a product page element, in its colour.
Widget _heading(String text, Color ink) => Semantics(
  header: true,
  child: Text(
    text,
    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink),
  ),
);

/// The text colour on [background].
Color _on(Color background) =>
    background.computeLuminance() > 0.5 ? Colors.black : Colors.white;

class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.node,
    required this.controller,
    required this.topInset,
    required this.accent,
  });

  final StudioNode node;
  final ProductPageController controller;
  final double topInset;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = controller;
    final images = c.images;
    final look = node.productPart.look ?? 'pager';
    final radius =
        node.productPart.radius ??
        (look == 'card' || look == 'thumbs' ? 20.0 : 0.0);
    final ratio = node.aspectRatio ?? (look == 'pager' ? 1.0 : 0.8);
    Widget photo(int i) => AppNetworkImage(
      url: images.elementAtOrNull(i),
      seed: c.product.id,
      placeholderIcon: AppIcons.shop,
      semanticLabel: images.length > 1
          ? context.l10n.productPhotoOf(i + 1, images.length)
          : context.l10n.productPhoto,
    );
    Widget pager({bool dots = true}) {
      final count = images.isEmpty ? 1 : images.length;
      return Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            key: ValueKey('product-gallery-${node.id}'),
            itemCount: count,
            onPageChanged: c.setImage,
            itemBuilder: (context, i) => photo(i),
          ),
          if (dots && count > 1)
            PositionedDirectional(
              bottom: 14,
              start: 0,
              end: 0,
              child: ExcludeSemantics(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < count; i++)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: i == c.image ? 18 : 6,
                        height: 6,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        decoration: BoxDecoration(
                          color: i == c.image
                              ? Colors.white
                              : Colors.white.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                  ],
                ),
              ),
            ),
        ],
      );
    }

    final heart = PositionedDirectional(
      top: topInset + 10,
      end: 14,
      child: WishlistHeart(productId: c.product.id, size: 22),
    );
    switch (look) {
      case 'stacked':
        return Column(
          key: const ValueKey('product-gallery-stacked'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < (images.isEmpty ? 1 : images.length); i++)
              Padding(
                padding: EdgeInsets.only(top: i == 0 ? 0 : 4),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(radius),
                  child: AspectRatio(aspectRatio: ratio, child: photo(i)),
                ),
              ),
          ],
        );
      case 'thumbs':
        return Column(
          key: const ValueKey('product-gallery-thumbs'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: AspectRatio(
                aspectRatio: ratio,
                child: Stack(
                  fit: StackFit.expand,
                  children: [photo(c.image), heart],
                ),
              ),
            ),
            if (images.length > 1) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 60,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) => Semantics(
                    button: true,
                    selected: i == c.image,
                    label: context.l10n.productPhotoOf(i + 1, images.length),
                    child: GestureDetector(
                      onTap: () => c.setImage(i),
                      child: Container(
                        width: 60,
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(
                            radius.clamp(0, 12) + 2,
                          ),
                          border: Border.all(
                            color: i == c.image ? accent : p.border,
                            width: i == c.image ? 2 : 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(
                            radius.clamp(0, 12).toDouble(),
                          ),
                          child: ExcludeSemantics(child: photo(i)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        );
      case 'card':
        return DecoratedBox(
          key: const ValueKey('product-gallery-card'),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radius),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: AspectRatio(
              aspectRatio: ratio,
              child: Stack(fit: StackFit.expand, children: [pager(), heart]),
            ),
          ),
        );
      default:
        return ClipRRect(
          key: const ValueKey('product-gallery-pager'),
          borderRadius: BorderRadius.circular(radius),
          child: AspectRatio(
            aspectRatio: ratio,
            child: Stack(
              fit: StackFit.expand,
              children: [
                pager(),
                // Over the photo, the status bar's icons and the buttons read.
                if (topInset > 0)
                  PositionedDirectional(
                    top: 0,
                    start: 0,
                    end: 0,
                    height: topInset + 64,
                    child: const IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0x55000000), Color(0x00000000)],
                          ),
                        ),
                      ),
                    ),
                  ),
                heart,
              ],
            ),
          ),
        );
    }
  }
}

class _Title extends ConsumerWidget {
  const _Title({
    required this.controller,
    required this.style,
    required this.ink,
    required this.look,
  });

  final ProductPageController controller;
  final TextStyle style;
  final Color ink;
  final String? look;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final summary = controller.product.summary;
    final rated =
        look == 'rating' && summary.rating != null && summary.ratingCount > 0;
    final reviews = ref.watch(appConfigProvider).store?.reviews ?? false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            controller.product.name,
            key: const ValueKey('product-title'),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.3,
              color: ink,
            ).merge(style),
          ),
        ),
        if (rated) ...[
          const SizedBox(height: 6),
          GestureDetector(
            onTap: reviews
                ? () =>
                      context.push(Paths.productReviews(controller.product.id))
                : null,
            child: Wrap(
              spacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                StarRow(rating: summary.rating!, size: 16),
                Text(
                  '${summary.rating!.toStringAsFixed(1)} · ${context.l10n.reviewCount(summary.ratingCount)}',
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Price extends StatelessWidget {
  const _Price({
    required this.controller,
    required this.style,
    required this.ink,
    required this.look,
  });

  final ProductPageController controller;
  final TextStyle style;
  final Color ink;
  final String? look;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = controller;
    final size = style.fontSize ?? 20;
    final price = c.price;
    final main = TextStyle(
      fontSize: size,
      fontWeight: FontWeight.w800,
      color: ink,
    ).merge(style);
    // "From" the lowest size's price until a size is chosen.
    if (look == 'from' &&
        c.product.variations.isNotEmpty &&
        c.variation == null) {
      return Text(
        context.l10n.productPriceFrom(c.lowestPrice),
        key: const ValueKey('product-price-from'),
        style: main,
      );
    }
    final sale = c.product.summary.sale;
    final live = sale != null && sale.liveAt(DateTime.now());
    final was = price.onSale ? price.shownRegular : null;
    return Wrap(
      key: const ValueKey('product-price'),
      spacing: 10,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(price.shown, style: main),
        if (look == 'sale' && was != null)
          Text(
            was,
            semanticsLabel: context.l10n.wasPrice(was),
            style: TextStyle(
              fontSize: size * 0.7,
              color: p.textTertiary,
              decoration: TextDecoration.lineThrough,
            ),
          ),
        if (look == 'sale' && live) SaleChip(percentOff: sale.percentOff),
        if (look == 'sale' && live && sale.endsAt != null)
          SaleCountdown(endsAt: sale.endsAt!),
      ],
    );
  }
}

class _Variants extends ConsumerWidget {
  const _Variants({
    required this.controller,
    required this.ink,
    required this.accent,
    required this.look,
    required this.title,
  });

  final ProductPageController controller;
  final Color ink;
  final Color accent;
  final String? look;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final c = controller;
    final chart = ref.watch(appConfigProvider).store?.sizeChart;
    final choices = c.product.choices;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, a) in choices.indexed) ...[
          if (i > 0) const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  choices.length == 1 && title.isNotEmpty ? title : a.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: ink,
                  ),
                ),
              ),
              if (chart != null && chart.fits(a.options.map((o) => o.value)))
                TextButton.icon(
                  key: const ValueKey('product-page-size-guide'),
                  onPressed: () => showSizeGuide(context, chart),
                  icon: const AppIcon(AppIcons.sizeGuide, size: 18),
                  label: Text(context.l10n.sizeGuide),
                  style: TextButton.styleFrom(foregroundColor: ink),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (a.options.any((o) => o.swatch != null) ||
              (look == 'swatches' && a.options.any((o) => o.swatch != null)))
            Wrap(
              key: ValueKey('product-page-swatches-${a.slug}'),
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final o in a.options)
                  SwatchChip(
                    option: o,
                    selected: c.chosen[a.slug] == o.value,
                    soldOut: c.soldOut(a.slug, o.value),
                    onTap: () => c.choose(a.slug, o.value),
                  ),
              ],
            )
          else if (look == 'grid')
            LayoutBuilder(
              builder: (context, box) {
                final columns = (box.maxWidth / 64).floor().clamp(3, 6);
                final width = (box.maxWidth - (columns - 1) * 8) / columns;
                return Wrap(
                  key: ValueKey('product-page-grid-${a.slug}'),
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final o in a.options)
                      _Cell(
                        label: o.label,
                        width: width,
                        selected: c.chosen[a.slug] == o.value,
                        soldOut: c.soldOut(a.slug, o.value),
                        accent: accent,
                        ink: ink,
                        line: p.border,
                        onTap: () => c.choose(a.slug, o.value),
                      ),
                  ],
                );
              },
            )
          else
            Wrap(
              key: ValueKey('product-page-chips-${a.slug}'),
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final o in a.options)
                  _Cell(
                    label: o.label,
                    selected: c.chosen[a.slug] == o.value,
                    soldOut: c.soldOut(a.slug, o.value),
                    accent: accent,
                    ink: ink,
                    line: p.border,
                    round: true,
                    onTap: () => c.choose(a.slug, o.value),
                  ),
              ],
            ),
        ],
      ],
    );
  }
}

/// A size or an option: a chip, or a cell of a size grid ([width]).
class _Cell extends StatelessWidget {
  const _Cell({
    required this.label,
    required this.selected,
    required this.soldOut,
    required this.accent,
    required this.ink,
    required this.line,
    required this.onTap,
    this.width,
    this.round = false,
  });

  final String label;
  final bool selected;
  final bool soldOut;
  final Color accent;
  final Color ink;
  final Color line;
  final VoidCallback onTap;
  final double? width;
  final bool round;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(round ? 999 : 10),
      side: BorderSide(color: selected ? accent : line, width: 1.5),
    );
    final cell = Material(
      color: selected ? accent : Colors.transparent,
      shape: shape,
      child: InkWell(
        customBorder: shape,
        onTap: soldOut ? null : onTap,
        child: Container(
          width: width,
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          padding: EdgeInsets.symmetric(horizontal: round ? 16 : 6),
          alignment: Alignment.center,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: selected ? _on(accent) : ink,
              decoration: soldOut ? TextDecoration.lineThrough : null,
            ),
          ),
        ),
      ),
    );
    return Semantics(
      button: true,
      selected: selected,
      label: soldOut ? context.l10n.optionSoldOut(label) : label,
      excludeSemantics: true,
      child: Opacity(opacity: soldOut ? 0.4 : 1, child: cell),
    );
  }
}

class _Quantity extends StatelessWidget {
  const _Quantity({
    required this.controller,
    required this.ink,
    required this.look,
  });

  final ProductPageController controller;
  final Color ink;
  final String? look;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = controller;
    final control = QuantityControl(
      quantity: c.quantity,
      max: c.maxQuantity ?? CartController.maxQuantity,
      onChanged: c.setQuantity,
      compact: look == 'pill',
    );
    if (look == 'pill') {
      return Align(
        alignment: AlignmentDirectional.centerStart,
        child: DecoratedBox(
          key: const ValueKey('product-quantity-pill'),
          decoration: BoxDecoration(
            color: p.surfaceMuted,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Padding(padding: const EdgeInsets.all(4), child: control),
        ),
      );
    }
    return Row(
      key: const ValueKey('product-quantity'),
      children: [
        Expanded(
          child: Text(
            context.l10n.quantity,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: ink,
            ),
          ),
        ),
        control,
      ],
    );
  }
}

/// 228 Add to cart (and Buy now): the product, the size chosen and how
/// many, as the app's own product screen adds them.
class _Buy extends ConsumerWidget {
  const _Buy({
    required this.node,
    required this.controller,
    required this.ink,
    required this.accent,
    required this.look,
  });

  final StudioNode node;
  final ProductPageController controller;
  final Color ink;
  final Color accent;
  final String? look;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final c = controller;
    final product = c.product;
    final store = ref.watch(appConfigProvider).store;
    final platform = ref.watch(appEnvironmentProvider).platform;
    final cta = _cta(ref, c);
    final radius = node.radius > 0 ? node.radius : 14.0;
    final cartWords = (node.text ?? '').trim().isNotEmpty
        ? node.text!.trim()
        : context.l10n.addToCart;
    final buyWords = (node.title ?? '').trim().isNotEmpty
        ? node.title!.trim()
        : context.l10n.productBuyNow;
    Widget button(
      String label, {
      required VoidCallback? onPressed,
      bool outlined = false,
      IconData? icon,
      Key? key,
    }) {
      final fill = outlined ? Colors.transparent : accent;
      final fore = outlined ? ink : _on(accent);
      return Expanded(
        child: SizedBox(
          height: 52,
          child: FilledButton(
            key: key,
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: fill,
              foregroundColor: fore,
              disabledBackgroundColor: outlined
                  ? Colors.transparent
                  : p.surfaceMuted,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(radius),
                side: outlined
                    ? BorderSide(color: ink, width: 1.5)
                    : BorderSide.none,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              textStyle: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  AppIcon(icon, size: 20, color: fore),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final Widget action = switch (cta) {
      ProductCta.addToCart => Row(
        children: [
          button(
            cartWords,
            key: const ValueKey('product-add-to-cart'),
            icon: AppIcons.bag,
            outlined: look == 'buy_now',
            onPressed: () => addProductPageToCart(context, ref, c),
          ),
          if (look == 'buy_now') ...[
            const SizedBox(width: 10),
            button(
              buyWords,
              key: const ValueKey('product-buy-now'),
              onPressed: () =>
                  addProductPageToCart(context, ref, c, thenCart: true),
            ),
          ],
        ],
      ),
      ProductCta.chooseOptions => Row(
        children: [
          button(
            context.l10n.chooseOptions(_missingWords(context, c)),
            onPressed: null,
          ),
        ],
      ),
      ProductCta.unavailableOption
          when store?.backInStock == true &&
              product.backInStock != null &&
              c.variation != null =>
        BackInStockButton(
          productId: product.id,
          variationId: c.variation!.id,
          waiting: product.backInStock!.waitsFor(c.variation!.id),
        ),
      ProductCta.unavailableOption => Row(
        children: [button(context.l10n.notAvailableInOptions, onPressed: null)],
      ),
      ProductCta.outOfStock
          when store?.backInStock == true && product.backInStock != null =>
        BackInStockButton(
          productId: product.id,
          variationId: c.variation?.id,
          waiting: product.backInStock!.waitsFor(c.variation?.id),
        ),
      ProductCta.outOfStock => Row(
        children: [button(context.l10n.outOfStock, onPressed: null)],
      ),
      ProductCta.notInApp => Text(
        !(product.summary.digital && platform == DevicePlatform.ios) &&
                store?.orderingOpen == false
            ? context.l10n.orderingNotOpen
            : context.l10n.notSoldInApp,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 14, color: p.textSecondary),
      ),
    };
    // Pinned at the foot: above the phone's own bar.
    final bottom = node.pin == StudioPin.bottom
        ? MediaQuery.paddingOf(context).bottom
        : 0.0;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: look == 'price'
          ? Row(
              key: const ValueKey('product-buy-price'),
              children: [
                Flexible(child: ProductPriceLabel(c.price, size: 18)),
                const SizedBox(width: 14),
                Expanded(flex: 2, child: action),
              ],
            )
          : action,
    );
  }
}

String _missingWords(BuildContext context, ProductPageController c) {
  final missing = c.missing;
  if (missing.isEmpty || !missing.every(fitsLanguage(context))) {
    return context.l10n.optionsLower;
  }
  return missing
      .map((n) => n.toLowerCaseIn(context))
      .join(context.l10n.listAnd);
}

/// 228 Adds the product open on a product page, as chosen, to the cart; with
/// [thenCart] (Buy now) the cart opens after it.
Future<void> addProductPageToCart(
  BuildContext context,
  WidgetRef ref,
  ProductPageController c, {
  bool thenCart = false,
}) async {
  final product = c.product;
  final variation = c.variation;
  final cart = ref.read(cartProvider.notifier);
  bool added;
  if (product.optionGroups.isNotEmpty) {
    // 26 A product with option groups: the option sheet first.
    final price = c.price;
    final choice = await showOptionSheet(
      context,
      product: product,
      price: price,
      maxQuantity: c.maxQuantity ?? CartController.maxQuantity,
    );
    if (choice == null || !context.mounted) return;
    final unit =
        centsOf(price.amount) +
        choice.options.fold<int>(0, (sum, o) => sum + o.priceDeltaCents);
    added = cart.add(
      CartItem(
        productId: product.id,
        variationId: variation?.id,
        quantity: choice.quantity,
        name: product.name,
        options: [for (final o in choice.options) o.id],
        optionNames: [for (final o in choice.options) o.name],
        imageUrl: variation?.imageUrl ?? product.summary.imageUrl,
        price: formatMoney(unit, price.currency),
        shownPrice: switch (price.display) {
          final d? => customerPrice(
            formatMoney(unit, price.currency),
            formatMoney(convertCents(unit, d.rate, d.currency), d.currency),
          ),
          null => null,
        },
        shownCurrency: price.display?.currency,
        maxQuantity: c.maxQuantity,
      ),
    );
  } else {
    final options = [
      for (final a in product.choices)
        if (c.chosen[a.slug] != null) a.labelOf(c.chosen[a.slug]!),
    ];
    final price = c.price;
    added = cart.add(
      CartItem(
        productId: product.id,
        variationId: variation?.id,
        quantity: c.quantity,
        name: options.isEmpty
            ? product.name
            : '${product.name} – ${options.join(', ')}',
        // Only options the variation leaves as "any" are sent.
        attributes: {
          if (variation != null)
            for (final e in variation.attributes.entries)
              if (e.value.isEmpty && c.chosen[e.key] != null)
                e.key: c.chosen[e.key]!,
        },
        imageUrl: variation?.imageUrl ?? product.summary.imageUrl,
        price: price.formatted,
        shownPrice: price.shown,
        shownCurrency: price.display?.currency,
        maxQuantity: c.maxQuantity,
      ),
    );
  }
  if (!context.mounted) return;
  if (added && thenCart) {
    openLocation(context, Paths.cart);
    return;
  }
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(added ? context.l10n.addedToCart : context.l10n.cartFull),
        persist: false,
        action: added
            ? SnackBarAction(
                label: context.l10n.viewCart,
                onPressed: () => openLocation(context, Paths.cart),
              )
            : null,
      ),
    );
}

class _Description extends StatefulWidget {
  const _Description({
    required this.controller,
    required this.ink,
    required this.title,
    required this.accordion,
    this.line,
  });

  final ProductPageController controller;
  final Color ink;
  final String title;
  final bool accordion;
  final Color? line;

  @override
  State<_Description> createState() => _DescriptionState();
}

class _DescriptionState extends State<_Description> {
  bool _open = true;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final product = widget.controller.product;
    final heading = widget.title.isNotEmpty
        ? widget.title
        : context.l10n.description;
    final words = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if ((product.shortDescriptionHtml ?? '').trim().isNotEmpty)
          HtmlContent(html: product.shortDescriptionHtml!),
        if (product.descriptionHtml.trim().isNotEmpty)
          HtmlContent(html: product.descriptionHtml),
      ],
    );
    if (!widget.accordion) {
      return Column(
        key: const ValueKey('product-description'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(heading, widget.ink),
          const SizedBox(height: 8),
          words,
        ],
      );
    }
    final line = BorderSide(color: widget.line ?? p.border);
    return DecoratedBox(
      key: const ValueKey('product-description-accordion'),
      decoration: BoxDecoration(
        border: Border(top: line, bottom: line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _open,
            child: InkWell(
              onTap: () => setState(() => _open = !_open),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Row(
                  children: [
                    Expanded(child: _heading(heading, widget.ink)),
                    AppIcon(
                      _open ? AppIcons.collapse : AppIcons.expand,
                      size: 22,
                      color: widget.ink,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_open)
            Padding(padding: const EdgeInsets.only(bottom: 14), child: words),
        ],
      ),
    );
  }
}

class _Specs extends StatelessWidget {
  const _Specs({
    required this.controller,
    required this.node,
    required this.ink,
    required this.title,
    required this.list,
    required this.accent,
  });

  final ProductPageController controller;
  final StudioNode node;
  final Color ink;
  final String title;
  final bool list;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final product = controller.product;
    final rows = [
      for (final s in product.specs) (s.label, s.value),
      for (final f in product.facts)
        (f.name, f.options.map((o) => o.label).join(', ')),
    ].take(node.productPart.rows ?? 40).toList();
    return Column(
      key: ValueKey(list ? 'product-specs-list' : 'product-specs-table'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _heading(
          title.isNotEmpty ? title : context.l10n.productDetailsTitle,
          ink,
        ),
        const SizedBox(height: 8),
        for (final (i, (label, value)) in rows.indexed)
          if (list)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '•  ',
                      style: TextStyle(color: accent),
                    ),
                    TextSpan(
                      text: '$label: ',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(text: value),
                  ],
                ),
                style: TextStyle(fontSize: 14, color: ink, height: 1.45),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: i.isEven ? p.surfaceMuted : null,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      value,
                      textAlign: TextAlign.end,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

class _Reviews extends ConsumerWidget {
  const _Reviews({
    required this.controller,
    required this.ink,
    required this.title,
    required this.bars,
  });

  final ProductPageController controller;
  final Color ink;
  final String title;
  final bool bars;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final product = controller.product;
    final preview = product.reviewsPreview;
    // The stars' bars, photos and first reviews: the app's own reviews part.
    if (bars && preview != null) {
      return KeyedSubtree(
        key: const ValueKey('product-reviews-bars'),
        child: ProductReviewsSection(productId: product.id, preview: preview),
      );
    }
    final summary = product.summary;
    final rating = summary.rating ?? preview?.summary.rating ?? 0;
    final count = summary.ratingCount > 0
        ? summary.ratingCount
        : (preview?.summary.ratingCount ?? 0);
    final reviews = ref.watch(appConfigProvider).store?.reviews ?? false;
    return Column(
      key: const ValueKey('product-reviews-summary'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _heading(title.isNotEmpty ? title : context.l10n.reviews, ink),
        const SizedBox(height: 10),
        Row(
          children: [
            Text(
              rating.toStringAsFixed(1),
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: ink,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                StarRow(rating: rating, size: 16),
                const SizedBox(height: 2),
                Text(
                  context.l10n.reviewCount(count),
                  style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                ),
              ],
            ),
          ],
        ),
        if (reviews)
          TextButton(
            onPressed: () => context.push(Paths.productReviews(product.id)),
            style: TextButton.styleFrom(
              foregroundColor: ink,
              padding: EdgeInsets.zero,
            ),
            child: Text(context.l10n.reviewsSeeAll(count)),
          ),
      ],
    );
  }
}

class _Related extends ConsumerWidget {
  const _Related({
    required this.controller,
    required this.node,
    required this.ink,
    required this.title,
    required this.grid,
  });

  final ProductPageController controller;
  final StudioNode node;
  final Color ink;
  final String title;
  final bool grid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = controller.product;
    final complete = node.productPart.completeLook;
    final items = (complete ? product.completeLook : product.related)
        .take(node.productPart.rows ?? (grid ? 4 : 10))
        .toList();
    final heading = title.isNotEmpty
        ? title
        : complete
        ? context.l10n.completeTheLook
        : context.l10n.youMayAlsoLike;
    final quick = quickAddShown(ref);
    // Its sides as the page's: the element's own margin is around it.
    const side = 16.0;
    Widget card(ProductSummary s, {double? width, bool fill = false}) =>
        ProductCard(
          product: s,
          width: width,
          fill: fill,
          quickAdd: quick,
          onTap: () => context.push(Paths.product(s.id)),
        );
    return Column(
      key: ValueKey(
        '${complete ? 'product-complete-look' : 'product-related'}-${grid ? 'grid' : 'carousel'}',
      ),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: (node.margin?.start ?? 0) == 0 ? side : 0,
          ),
          child: _heading(heading, ink),
        ),
        const SizedBox(height: 10),
        if (grid)
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: (node.margin?.start ?? 0) == 0 ? side : 0,
            ),
            child: LayoutBuilder(
              builder: (context, box) {
                final width = (box.maxWidth - 12) / 2;
                return Wrap(
                  spacing: 12,
                  runSpacing: 14,
                  children: [for (final s in items) card(s, width: width)],
                );
              },
            ),
          )
        else
          SizedBox(
            height:
                160 +
                productCardTextHeight(
                  context,
                  twoPrices: customerPricesShown(ref),
                ) +
                (quick ? quickAddHeight(context) : 0),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(
                horizontal: (node.margin?.start ?? 0) == 0 ? side : 0,
              ),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => Align(
                alignment: Alignment.topCenter,
                child: card(items[i], width: 160),
              ),
            ),
          ),
      ],
    );
  }
}

/// A line of the delivery and returns element: its icon and words.
typedef _Line = (IconData, String);

List<_Line> _deliveryLines(
  BuildContext context,
  WidgetRef ref,
  StudioNode node,
  ProductPageController c,
) {
  final store = ref.watch(appConfigProvider).store;
  final returns = store?.returns;
  final product = c.product;
  return [
    if (returns != null && returns.enabled && returns.days > 0)
      (AppIcons.exchange, context.l10n.exchangeWithin(returns.days)),
    if (product.dimensions case final d?)
      (AppIcons.sizeGuide, '${context.l10n.productDimensions}: $d'),
    if (product.makeDays case final d?)
      (AppIcons.schedule, '${context.l10n.productMadeToOrder}: $d'),
    if (store?.installmentsSoon ?? false)
      (AppIcons.card, context.l10n.installmentsSoon),
    for (final line in (node.title ?? '').split('\n'))
      if (line.trim().isNotEmpty) (AppIcons.checkCircle, line.trim()),
  ];
}

class _Delivery extends StatelessWidget {
  const _Delivery({
    required this.lines,
    required this.ink,
    required this.title,
    this.accent,
  });

  final List<_Line> lines;
  final Color ink;
  final String? title;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      key: const ValueKey('product-delivery'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null) ...[
          _heading(title!, ink),
          const SizedBox(height: 10),
        ],
        for (final (i, (icon, text)) in lines.indexed)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 10),
            child: Row(
              children: [
                AppIcon(icon, size: 20, color: accent ?? p.textSecondary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    text,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
