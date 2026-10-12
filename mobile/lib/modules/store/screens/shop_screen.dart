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

const orderLabels = {
  ProductOrder.newest: 'Newest',
  ProductOrder.popular: 'Best selling',
  ProductOrder.rating: 'Top rated',
  ProductOrder.priceAsc: 'Price: low to high',
  ProductOrder.priceDesc: 'Price: high to low',
  ProductOrder.title: 'Name',
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
    this.focusSearch = false,
  });

  final int? initialCategory;
  final bool initialOnSale;
  final ProductOrder? initialOrder;
  final bool focusSearch;

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  late ProductQuery _query;
  final _search = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _query = _initial();
    if (widget.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focus.requestFocus();
      });
    }
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
    if (widget.focusSearch && !old.focusSearch) _focus.requestFocus();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _focus.dispose();
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
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in orderLabels.entries)
              ListTile(
                title: Text(entry.value, style: TextStyle(color: p.text)),
                trailing: entry.key == _query.orderBy
                    ? AppIcon(AppIcons.check, color: p.text)
                    : null,
                onTap: () => Navigator.of(context).pop(entry.key),
              ),
          ],
        ),
      ),
    );
    if (chosen != null && mounted) {
      setState(() => _query = _query.copyWith(orderBy: chosen));
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final categories = ref.watch(productCategoriesProvider).value ?? const [];
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
                        hintText: 'Search products',
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
                    label: 'Sort: ${orderLabels[_query.orderBy]}',
                    size: 50,
                    radius: context.shapes.button,
                    onPressed: _chooseOrder,
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  PillChip(
                    label: 'All',
                    selected: _query.category == null && !_query.onSale,
                    onTap: () => setState(
                      () => _query = _query.copyWith(
                        clearCategory: true,
                        onSale: false,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PillChip(
                    label: 'On sale',
                    selected: _query.onSale,
                    onTap: () => setState(
                      () => _query = _query.copyWith(onSale: !_query.onSale),
                    ),
                  ),
                  for (final c in categories) ...[
                    const SizedBox(width: 8),
                    PillChip(
                      label: c.name,
                      selected: _query.category == c.id,
                      onTap: () => setState(
                        () => _query = _query.category == c.id
                            ? _query.copyWith(clearCategory: true)
                            : _query.copyWith(category: c.id),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: RefreshIndicator(
                onRefresh: controller.refresh,
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
      return const LoadingView(label: 'Loading products');
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
        children: const [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.search,
              title: 'No products found',
              message: 'Try another search or category.',
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
          final tile = (width - gap * (columns - 1)) / columns;
          return GridView.builder(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              mainAxisSpacing: gap,
              crossAxisSpacing: gap,
              mainAxisExtent: tile + productCardTextHeight(context),
            ),
            itemCount: items.length + (state.hasMore && error == null ? 1 : 0),
            itemBuilder: (context, i) {
              if (i >= items.length) {
                return const LoadingView(label: 'Loading more products');
              }
              final product = items[i];
              return ProductCard(
                product: product,
                onTap: () => context.push(Paths.product(product.id)),
              );
            },
          );
        },
      ),
    );
  }
}
