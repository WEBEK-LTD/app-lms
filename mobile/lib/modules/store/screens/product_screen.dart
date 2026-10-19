import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/courses/community_widgets.dart' show StarRow;
import '../../lms/lesson/content/html_content.dart';
import '../data/cart_controller.dart';
import '../data/store_providers.dart';
import '../widgets/option_sheet.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/share_links.dart';

/// A product: images, price, options, quantity and Add to cart.
class ProductScreen extends ConsumerWidget {
  const ProductScreen({super.key, required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productProvider(productId));
    return switch (product) {
      AsyncData(:final value) => _ProductView(product: value),
      AsyncError(:final error) => Scaffold(
        appBar: AppBar(leading: const AppBarBackButton()),
        body: ErrorView(
          error: error,
          onRetry: () => ref.invalidate(productProvider(productId)),
        ),
      ),
      _ => Scaffold(
        appBar: AppBar(leading: const AppBarBackButton()),
        body: SkeletonDetail(label: context.l10n.loadingProduct),
      ),
    };
  }
}

class _ProductView extends ConsumerStatefulWidget {
  const _ProductView({required this.product});

  final ProductDetail product;

  @override
  ConsumerState<_ProductView> createState() => _ProductViewState();
}

class _ProductViewState extends ConsumerState<_ProductView> {
  final Map<String, String> _chosen = {};
  int _quantity = 1;
  int _image = 0;

  ProductDetail get _product => widget.product;

  bool get _choicesComplete =>
      _product.choices.every((a) => (_chosen[a.slug] ?? '').isNotEmpty);

  ProductVariation? get _variation {
    if (_product.summary.type != ProductType.variable || !_choicesComplete) {
      return null;
    }
    return _product.variations.where((v) => v.matches(_chosen)).firstOrNull;
  }

  int? get _maxQuantity => _variation?.maxQuantity ?? _product.maxQuantity;

  void _choose(String slug, String value) => setState(() {
    if (_chosen[slug] == value) {
      _chosen.remove(slug);
    } else {
      _chosen[slug] = value;
    }
    final max = _maxQuantity;
    if (max != null && _quantity > max) _quantity = max < 1 ? 1 : max;
  });

  /// 26 A product with option groups: the option sheet first, then the cart.
  Future<void> _chooseOptions() async {
    final price = _variation?.price ?? _product.summary.price;
    final choice = await showOptionSheet(
      context,
      product: _product,
      price: price,
      maxQuantity: _maxQuantity ?? CartController.maxQuantity,
    );
    if (choice == null || !mounted) return;
    final unit =
        centsOf(price.amount) +
        choice.options.fold<int>(0, (sum, o) => sum + o.priceDeltaCents);
    final added = ref
        .read(cartProvider.notifier)
        .add(
          CartItem(
            productId: _product.id,
            variationId: _variation?.id,
            quantity: choice.quantity,
            name: _product.name,
            options: [for (final o in choice.options) o.id],
            optionNames: [for (final o in choice.options) o.name],
            imageUrl: _variation?.imageUrl ?? _product.summary.imageUrl,
            price: formatMoney(unit, price.currency),
            maxQuantity: _maxQuantity,
          ),
        );
    _added(added);
  }

  void _added(bool added) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            added ? context.l10n.addedToCart : context.l10n.cartFull,
          ),
          action: added
              ? SnackBarAction(
                  label: context.l10n.viewCart,
                  onPressed: () => context.go(Paths.cart),
                )
              : null,
        ),
      );
  }

  void _addToCart() {
    if (_product.optionGroups.isNotEmpty) {
      _chooseOptions();
      return;
    }
    final variation = _variation;
    final options = [
      for (final a in _product.choices)
        if (_chosen[a.slug] != null) a.labelOf(_chosen[a.slug]!),
    ];
    final added = ref
        .read(cartProvider.notifier)
        .add(
          CartItem(
            productId: _product.id,
            variationId: variation?.id,
            quantity: _quantity,
            name: options.isEmpty
                ? _product.name
                : '${_product.name} – ${options.join(', ')}',
            // Only options the variation leaves as "any" are sent.
            attributes: {
              if (variation != null)
                for (final e in variation.attributes.entries)
                  if (e.value.isEmpty && _chosen[e.key] != null)
                    e.key: _chosen[e.key]!,
            },
            imageUrl: variation?.imageUrl ?? _product.summary.imageUrl,
            price: (variation?.price ?? _product.summary.price).formatted,
            maxQuantity: _maxQuantity,
          ),
        );
    _added(added);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final product = _product;
    final variation = _variation;
    final platform = ref.watch(appEnvironmentProvider).platform;
    final reviews = ref.watch(appConfigProvider).store?.reviews ?? false;
    final cta = resolveProductCta(
      product: product.summary,
      platform: platform,
      choicesComplete: _choicesComplete,
      variation: variation,
    );
    final price = variation?.price ?? product.summary.price;
    final stock = variation?.stockStatus ?? product.summary.stockStatus;
    final images = [
      if (variation?.imageUrl != null) variation!.imageUrl!,
      for (final i in product.images) i.url,
      if (product.images.isEmpty && product.summary.imageUrl != null)
        product.summary.imageUrl!,
    ];
    final max = _maxQuantity;
    final count = ref.watch(cartCountProvider);

    return Scaffold(
      backgroundColor: p.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: _imageHeight(MediaQuery.sizeOf(context)),
            backgroundColor: p.surface,
            leading: const AppBarBackButton(),
            actions: [
              // 46 A link that opens the product in the app.
              ShareLinkButton(
                kind: 'product',
                id: product.id,
                title: product.name,
              ),
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 18),
                child: SquareIconButton(
                  icon: AppIcons.cart,
                  label: count > 0
                      ? context.l10n.cartWithItems(count)
                      : context.l10n.tabCart,
                  badge: count > 0,
                  onPressed: () => context.go(Paths.cart),
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  _Gallery(
                    images: images,
                    seed: product.id,
                    index: _image,
                    onChanged: (i) => setState(() => _image = i),
                  ),
                  const HeroScrim(),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: readablePadding(context, top: 18, bottom: 24),
            sliver: SliverList.list(
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    product.name,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                      color: p.text,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                ProductPriceLabel(price, size: 20),
                const SizedBox(height: 8),
                if (product.summary.rating != null &&
                    product.summary.ratingCount > 0)
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    children: [
                      StarRow(rating: product.summary.rating!, size: 16),
                      if (reviews)
                        TextButton(
                          onPressed: () =>
                              context.push(Paths.productReviews(product.id)),
                          child: Text(
                            context.l10n.reviewCount(
                              product.summary.ratingCount,
                            ),
                          ),
                        )
                      else
                        Text(
                          context.l10n.ratingCount(product.summary.ratingCount),
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                    ],
                  ),
                Text(
                  stockLabel(stock),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: stock == StockStatus.outOfStock
                        ? p.danger
                        : p.success,
                  ),
                ),
                if (product.shortDescriptionHtml != null) ...[
                  const SizedBox(height: 12),
                  HtmlContent(html: product.shortDescriptionHtml!),
                ],
                for (final attribute in product.choices) ...[
                  const SizedBox(height: 18),
                  Text(
                    attribute.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final option in attribute.options)
                        PillChip(
                          label: option.label,
                          selected: _chosen[attribute.slug] == option.value,
                          onTap: () => _choose(attribute.slug, option.value),
                        ),
                    ],
                  ),
                ],
                if (product.optionGroups.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _OptionGroupsSummary(groups: product.optionGroups),
                ],
                if (cta == ProductCta.addToCart &&
                    product.optionGroups.isEmpty) ...[
                  const SizedBox(height: 18),
                  _QuantityStepper(
                    quantity: _quantity,
                    max: max,
                    onChanged: (q) => setState(() => _quantity = q),
                  ),
                ],
                if (product.descriptionHtml.trim().isNotEmpty) ...[
                  const SizedBox(height: 24),
                  SectionHeader(title: context.l10n.description),
                  const SizedBox(height: 8),
                  HtmlContent(html: product.descriptionHtml),
                ],
                if (product.related.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  SectionHeader(title: context.l10n.youMayAlsoLike),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 160 + productCardTextHeight(context),
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: product.related.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, i) {
                        final related = product.related[i];
                        return Align(
                          alignment: Alignment.topCenter,
                          child: ProductCard(
                            product: related,
                            width: 160,
                            onTap: () =>
                                context.push(Paths.product(related.id)),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomActionBar(
        child: switch (cta) {
          ProductCta.addToCart => PrimaryButton(
            label: context.l10n.addToCart,
            icon: AppIcons.cart,
            onPressed: _addToCart,
          ),
          ProductCta.chooseOptions => PrimaryButton(
            label: context.l10n.chooseOptions(_missing(product)),
            onPressed: null,
          ),
          ProductCta.unavailableOption => PrimaryButton(
            label: context.l10n.notAvailableInOptions,
            onPressed: null,
          ),
          ProductCta.outOfStock => PrimaryButton(
            label: context.l10n.outOfStock,
            onPressed: null,
          ),
          ProductCta.notInApp => Text(
            context.l10n.notSoldInApp,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        },
      ),
    );
  }

  /// Square on phones, at most half the screen on wide or short ones.
  static double _imageHeight(Size screen) {
    final half = screen.height / 2;
    return screen.width < half ? screen.width : half;
  }

  String _missing(ProductDetail product) {
    final names = [
      for (final a in product.choices)
        if ((_chosen[a.slug] ?? '').isEmpty) a.name.toLowerCase(),
    ];
    return names.isEmpty
        ? context.l10n.optionsLower
        : names.join(context.l10n.listAnd);
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.images,
    required this.seed,
    required this.index,
    required this.onChanged,
  });

  final List<String> images;
  final int seed;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (images.length <= 1) {
      return AppNetworkImage(
        url: images.firstOrNull,
        seed: seed,
        placeholderIcon: AppIcons.shop,
        semanticLabel: context.l10n.productPhoto,
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          itemCount: images.length,
          onPageChanged: onChanged,
          itemBuilder: (context, i) => AppNetworkImage(
            url: images[i],
            seed: seed,
            semanticLabel: context.l10n.productPhotoOf(i + 1, images.length),
          ),
        ),
        Positioned(
          bottom: 12,
          left: 0,
          right: 0,
          child: ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < images.length; i++)
                  Container(
                    width: i == index ? 18 : 6,
                    height: 6,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: i == index ? p.primary : p.surface,
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
}

/// 26 The dish's option groups, before the option sheet opens.
class _OptionGroupsSummary extends StatelessWidget {
  const _OptionGroupsSummary({required this.groups});

  final List<OptionGroup> groups;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final g in groups)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '${g.name} · ${g.required ? context.l10n.optionsRequired : context.l10n.optionsOptional}',
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          ),
      ],
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({
    required this.quantity,
    required this.onChanged,
    this.max,
  });

  final int quantity;
  final int? max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final limit = max ?? CartController.maxQuantity;
    return Row(
      children: [
        Text(
          context.l10n.quantity,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
        const Spacer(),
        QuantityControl(quantity: quantity, onChanged: onChanged, max: limit),
      ],
    );
  }
}
