import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/store_providers.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';

Map<ProductOrder, String> get orderLabels => {
  ProductOrder.newest: currentL10n.sortNewest,
  ProductOrder.popular: currentL10n.sortBestSelling,
  ProductOrder.rating: currentL10n.sortTopRated,
  ProductOrder.priceAsc: currentL10n.sortPriceLowHigh,
  ProductOrder.priceDesc: currentL10n.sortPriceHighLow,
  ProductOrder.title: currentL10n.sortName,
};

ProductOrder? productOrderFrom(String? wire) => switch (wire) {
  'newest' => ProductOrder.newest,
  'popular' => ProductOrder.popular,
  'rating' => ProductOrder.rating,
  'price_asc' => ProductOrder.priceAsc,
  'price_desc' => ProductOrder.priceDesc,
  'title' => ProductOrder.title,
  _ => null,
};

/// The Shop tab: search, categories, sale filter, sort and the product grid.
class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({
    super.key,
    this.initialCategory,
    this.initialOnSale = false,
    this.initialOrder,
  });

  final int? initialCategory;
  final bool initialOnSale;
  final ProductOrder? initialOrder;

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  late ProductQuery _query;
  final _search = TextEditingController();
  final _focus = FocusNode();

  /// 158 The filters' row, back at its start when a filter changes.
  final _filtersRow = ScrollController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    // 147 The search opens without its keyboard: it comes up only when
    // the customer taps the field (a tab or a page around this screen
    // asked for it by itself).
    _query = _initial();
  }

  ProductQuery _initial() => ProductQuery(
    category: widget.initialCategory,
    onSale: widget.initialOnSale,
    orderBy: widget.initialOrder ?? ProductOrder.newest,
  );

  @override
  void didUpdateWidget(ShopScreen old) {
    super.didUpdateWidget(old);
    // Links from Home (a category, the sale list) arrive as new parameters.
    if (old.initialCategory != widget.initialCategory ||
        old.initialOnSale != widget.initialOnSale ||
        old.initialOrder != widget.initialOrder) {
      _search.clear();
      setState(() => _query = _initial());
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _focus.dispose();
    _filtersRow.dispose();
    super.dispose();
  }

  void _onSearch(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _query = _query.copyWith(search: text));
    });
  }

  Future<void> _chooseOrder() async {
    final p = context.palette;
    final chosen = await showModalBottomSheet<ProductOrder>(
      context: context,
      backgroundColor: p.surface,
      showDragHandle: true,
      // 158 Its last choices scroll into reach on a short phone or with a
      // large font (the sheet is at most 9/16 of the screen).
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          key: const ValueKey('sort-sheet'),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final entry in orderLabels.entries)
                ListTile(
                  key: ValueKey('sort-${entry.key.name}'),
                  title: Text(entry.value, style: TextStyle(color: p.text)),
                  trailing: entry.key == _query.orderBy
                      ? AppIcon(AppIcons.check, color: p.text)
                      : null,
                  onTap: () => Navigator.of(context).pop(entry.key),
                ),
            ],
          ),
        ),
      ),
    );
    if (chosen != null && mounted) {
      setState(() => _query = _query.copyWith(orderBy: chosen));
    }
  }

  /// Whether a filter is on (a category, On sale or words searched).
  bool get _filtered =>
      _query.category != null ||
      _query.onSale ||
      (_query.search ?? '').trim().isNotEmpty;

  /// 158 Every filter off, the order kept.
  void _clearFilters() {
    _debounce?.cancel();
    _search.clear();
    _filter(_query.copyWith(clearCategory: true, onSale: false, search: ''));
  }

  /// 158 A filter changed: the row goes back to its start, where the
  /// filters that are on now are.
  void _filter(ProductQuery query) {
    setState(() => _query = query);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_filtersRow.hasClients) return;
      if (MediaQuery.disableAnimationsOf(context)) {
        _filtersRow.jumpTo(0);
      } else {
        _filtersRow.animateTo(
          0,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  (bool, Widget) _allChip(BuildContext context) {
    final on = _query.category == null && !_query.onSale;
    return (
      on,
      PillChip(
        key: const ValueKey('shop-filter-all'),
        label: context.l10n.filterAll,
        selected: on,
        onTap: () =>
            _filter(_query.copyWith(clearCategory: true, onSale: false)),
      ),
    );
  }

  /// On sale and the categories, each with whether it is on.
  List<(bool, Widget)> _chips(
    BuildContext context,
    List<ProductCategory> categories,
  ) => [
    (
      _query.onSale,
      PillChip(
        key: const ValueKey('shop-filter-sale'),
        label: context.l10n.onSale,
        selected: _query.onSale,
        onTap: () => _filter(_query.copyWith(onSale: !_query.onSale)),
      ),
    ),
    for (final c in categories)
      (
        _query.category == c.id,
        PillChip(
          key: ValueKey('shop-filter-category-${c.id}'),
          label: c.name,
          selected: _query.category == c.id,
          onTap: () => _filter(
            _query.category == c.id
                ? _query.copyWith(clearCategory: true)
                : _query.copyWith(category: c.id),
          ),
        ),
      ),
  ];

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final categories = ref.watch(productCategoriesProvider).value ?? const [];
    final filters = _chips(context, categories);
    final state = ref.watch(productsProvider(_query));
    final controller = ref.read(productsProvider(_query).notifier);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _search,
                      focusNode: _focus,
                      textInputAction: TextInputAction.search,
                      onChanged: _onSearch,
                      onSubmitted: (text) {
                        _debounce?.cancel();
                        setState(() => _query = _query.copyWith(search: text));
                      },
                      decoration: InputDecoration(
                        hintText: context.words.searchProducts,
                        prefixIcon: AppIcon(
                          AppIcons.search,
                          size: 20,
                          color: p.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SquareIconButton(
                    icon: AppIcons.sort,
                    label: context.l10n.sortBy(orderLabels[_query.orderBy]!),
                    size: 50,
                    radius: context.shapes.button,
                    onPressed: _chooseOrder,
                  ),
                ],
              ),
            ),
            SizedBox(
              height: chipRowHeight(context),
              child: ListView(
                key: const ValueKey('shop-filters'),
                controller: _filtersRow,
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                // 158 The filters that are on come first, after All, so
                // they stay in sight: "On sale" stayed on, scrolled out of
                // view, and a category then showed no products.
                children: [
                  for (final (i, chip) in [
                    _allChip(context),
                    ...filters.where((c) => c.$1),
                    ...filters.where((c) => !c.$1),
                  ].indexed) ...[if (i > 0) const SizedBox(width: 8), chip.$2],
                ],
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: RefreshIndicator(
                // 157 The shop's categories too, as the owner changed them.
                onRefresh: () {
                  ref.invalidate(productCategoriesProvider);
                  return controller.refresh();
                },
                child: _grid(context, state, controller),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _grid(
    BuildContext context,
    PagedState<ProductSummary> state,
    ProductsController controller,
  ) {
    final error = state.error;
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.grid,
        label: context.words.loadingProducts,
      );
    }
    if (error != null && state.items.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: 400,
            child: ErrorView(error: error, onRetry: controller.retry),
          ),
        ],
      );
    }
    if (state.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.search,
              title: context.words.noProductsTitle,
              message: context.words.noProductsMessage,
              // 158 Nothing with these filters: take them off in one tap.
              actionLabel: _filtered ? context.l10n.clearFilters : null,
              onAction: _filtered ? _clearFilters : null,
            ),
          ),
        ],
      );
    }
    final items = state.items;
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.extentAfter < 600) controller.loadMore();
        return false;
      },
      child: LayoutBuilder(
        builder: (context, box) {
          const gap = 12.0;
          final width = box.maxWidth - 40;
          final columns = (width / 220).ceil().clamp(2, 6);
          return CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                // 193 Row by row, each row as tall as its fullest card: the
                // cards of a row the same height, their names and prices
                // level, and no row taller than its products need (a grid
                // of one fixed height left a band empty in most cards).
                sliver: SliverList.builder(
                  itemCount: (items.length + columns - 1) ~/ columns,
                  itemBuilder: (context, row) => Padding(
                    padding: EdgeInsets.only(top: row == 0 ? 0 : gap),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var c = 0; c < columns; c++) ...[
                            if (c > 0) const SizedBox(width: gap),
                            Expanded(
                              child: row * columns + c < items.length
                                  ? ProductCard(
                                      key: ValueKey(
                                        'shop-product-${items[row * columns + c].id}',
                                      ),
                                      product: items[row * columns + c],
                                      fill: true,
                                      onTap: () => context.push(
                                        Paths.product(
                                          items[row * columns + c].id,
                                        ),
                                      ),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // 158 The next page's spinner across the grid, in its middle
              // (it was a cell of the grid, in one column).
              if (state.hasMore && error == null)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverToBoxAdapter(
                    child: LoadingMore(label: context.l10n.loadingMoreProducts),
                  ),
                ),
              // 158 The last row clear of a tab bar over the screen.
              SliverPadding(
                padding: EdgeInsets.only(bottom: endRoom(context, 24)),
              ),
            ],
          );
        },
      ),
    );
  }
}
