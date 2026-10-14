import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/cart_controller.dart';
import '../data/store_providers.dart';
import '../widgets/fulfilment_widgets.dart';
import '../widgets/product_widgets.dart';

/// 26 One section of the menu: a category and its dishes (null: the dishes
/// without a category, last).
class MenuSection {
  const MenuSection({required this.category, required this.items});

  final ProductCategory? category;
  final List<ProductSummary> items;
}

/// The whole menu, by category, in the shop's order.
final menuProvider = FutureProvider.autoDispose<List<MenuSection>>((ref) async {
  final api = ref.contentApi;
  final categories = await api.listProductCategories();
  final sections = <MenuSection>[];
  final seen = <int>{};
  for (final c in categories.where((c) => c.parentId == null)) {
    final page = await api.listProducts(
      ProductQuery(category: c.id, perPage: 50),
    );
    seen.addAll(page.items.map((p) => p.id));
    if (page.items.isNotEmpty) {
      sections.add(MenuSection(category: c, items: page.items));
    }
  }
  final all = await api.listProducts(const ProductQuery(perPage: 50));
  final rest = [
    for (final p in all.items)
      if (!seen.contains(p.id)) p,
  ];
  if (rest.isNotEmpty) sections.add(MenuSection(category: null, items: rest));
  return sections;
});

/// 26 A restaurant's Menu tab: its categories as tabs that stay at the top,
/// and every dish below them. Tapping a tab scrolls to its dishes; scrolling
/// moves the tab. When the kitchen is closed, it says when it opens.
class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  final _scroll = ScrollController();
  final _tabs = ScrollController();
  List<GlobalKey> _sectionKeys = const [];
  List<GlobalKey> _tabKeys = const [];
  int _selected = 0;
  bool _jumping = false;

  @override
  void dispose() {
    _scroll.dispose();
    _tabs.dispose();
    super.dispose();
  }

  void _keysFor(int count) {
    if (_sectionKeys.length == count) return;
    _sectionKeys = [for (var i = 0; i < count; i++) GlobalKey()];
    _tabKeys = [for (var i = 0; i < count; i++) GlobalKey()];
  }

  Future<void> _jumpTo(int i) async {
    final target = _sectionKeys[i].currentContext;
    if (target == null) return;
    setState(() => _selected = i);
    _showTab(i);
    _jumping = true;
    await Scrollable.ensureVisible(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
    _jumping = false;
  }

  void _showTab(int i) {
    final tab = _tabKeys[i].currentContext;
    if (tab != null) {
      Scrollable.ensureVisible(
        tab,
        alignment: 0.5,
        duration: const Duration(milliseconds: 200),
      );
    }
  }

  /// The section at the top of the list follows the scroll.
  bool _onScroll(ScrollNotification n) {
    if (_jumping || n.depth != 0) return false;
    final list = _scroll.position.context.storageContext.findRenderObject();
    if (list is! RenderBox || !list.attached) return false;
    final listTop = list.localToGlobal(Offset.zero).dy;
    var current = 0;
    for (var i = 0; i < _sectionKeys.length; i++) {
      final section = _sectionKeys[i].currentContext?.findRenderObject();
      if (section is! RenderBox || !section.attached) continue;
      if (section.localToGlobal(Offset.zero).dy - listTop <= 24) current = i;
    }
    if (current != _selected) {
      setState(() => _selected = current);
      _showTab(current);
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final words = context.words;
    final menu = ref.watch(menuProvider);
    final fulfilment = ref.watch(appConfigProvider).store?.fulfilment;
    final times = fulfilment != null
        ? ref.watch(orderTimesProvider).value
        : null;
    final count = ref.watch(cartCountProvider);

    final header = Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 8),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                words.shop,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
          ),
          SquareIconButton(
            icon: AppIcons.search,
            label: words.searchProducts,
            onPressed: () => context.go('${Paths.shop}?focus=1'),
          ),
          const SizedBox(width: 10),
          SquareIconButton(
            icon: AppIcons.cart,
            label: count > 0
                ? context.l10n.cartWithItems(count)
                : context.l10n.tabCart,
            badge: count > 0,
            onPressed: () => context.go(Paths.cart),
          ),
        ],
      ),
    );

    final Widget body = switch (menu) {
      AsyncData(:final value) when value.isEmpty => MessageView(
        icon: AppIcons.menu,
        title: words.noProductsTitle,
        message: words.noProductsMessage,
      ),
      AsyncData(:final value) => _menu(context, value, times, fulfilment),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(menuProvider),
      ),
      _ => SkeletonList(
        layout: SkeletonLayout.text,
        label: words.loadingProducts,
      ),
    };

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Expanded(child: body),
          ],
        ),
      ),
    );
  }

  Widget _menu(
    BuildContext context,
    List<MenuSection> sections,
    OrderTimes? times,
    FulfilmentConfig? fulfilment,
  ) {
    final p = context.palette;
    final l10n = context.l10n;
    _keysFor(sections.length);
    String title(MenuSection s) => s.category?.name ?? l10n.menuMore;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // The category tabs stay above the list.
        SizedBox(
          height: 52,
          child: ListView.separated(
            key: const ValueKey('menu-tabs'),
            controller: _tabs,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            itemCount: sections.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) => PillChip(
              key: _tabKeys[i],
              label: title(sections[i]),
              selected: i == _selected,
              onTap: () => _jumpTo(i),
            ),
          ),
        ),
        Divider(height: 1, color: p.border),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () {
              if (fulfilment != null) ref.invalidate(orderTimesProvider);
              return ref.refresh(menuProvider.future);
            },
            child: NotificationListener<ScrollNotification>(
              onNotification: _onScroll,
              child: SingleChildScrollView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (times != null && !times.openNow) ...[
                      ClosedNotice(
                        times: times,
                        later:
                            (fulfilment?.scheduled ?? false) &&
                            times.slots.isNotEmpty,
                      ),
                      const SizedBox(height: 12),
                    ],
                    for (var i = 0; i < sections.length; i++)
                      Column(
                        key: _sectionKeys[i],
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Padding(
                            padding: EdgeInsets.only(
                              top: i == 0 ? 4 : 20,
                              bottom: 10,
                            ),
                            child: Semantics(
                              header: true,
                              child: Text(
                                title(sections[i]),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: p.text,
                                ),
                              ),
                            ),
                          ),
                          for (final dish in sections[i].items) ...[
                            _DishRow(dish: dish),
                            const SizedBox(height: 10),
                          ],
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DishRow extends StatelessWidget {
  const _DishRow({required this.dish});

  final ProductSummary dish;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final out = dish.stockStatus == StockStatus.outOfStock;
    return AppCard(
      padding: const EdgeInsets.all(10),
      onTap: () => context.push(Paths.product(dish.id)),
      child: Row(
        children: [
          AppNetworkImage(
            url: dish.imageUrl,
            seed: dish.id,
            width: 76,
            height: 76,
            radius: context.shapes.r(12),
            placeholderIcon: AppIcons.menu,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dish.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 4),
                ProductPriceLabel(dish.price, size: 14),
                if (out)
                  Text(
                    stockLabel(dish.stockStatus),
                    style: TextStyle(fontSize: 12, color: p.danger),
                  ),
              ],
            ),
          ),
          AppIcon(AppIcons.forward, size: 20, color: p.textSecondary),
        ],
      ),
    );
  }
}
