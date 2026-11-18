import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import '../data/market_store.dart';
import '../widgets/market_look.dart';
import '../widgets/market_store_widgets.dart';
import 'market_scanner_screen.dart';

/// 115.40 A supermarket's department (design 02): its aisles as chips with
/// their photo and count, quick filters, and its products in a two-column
/// grid that loads more as it scrolls (by the server's cursor), each added
/// and stepped on its tile (weighed items in their own steps). With
/// [query], this store's search instead, by words or a barcode.
class MarketShelfScreen extends ConsumerStatefulWidget {
  const MarketShelfScreen({
    super.key,
    required this.vendorId,
    this.departmentId,
    this.aisleId,
    this.query,
  });

  final String vendorId;
  final String? departmentId;
  final String? aisleId;
  final String? query;

  @override
  ConsumerState<MarketShelfScreen> createState() => _MarketShelfScreenState();
}

enum _Filter { popular, offers, byWeight, inStock }

class _MarketShelfScreenState extends ConsumerState<MarketShelfScreen> {
  String? _aisle;
  final _filters = <_Filter>{};

  @override
  void initState() {
    super.initState();
    _aisle = widget.aisleId;
  }

  MarketShelfQuery get _query => (
    vendorId: widget.vendorId,
    department: widget.query == null ? widget.departmentId : null,
    aisle: widget.query == null ? _aisle : null,
    query: widget.query,
    barcode: null,
  );

  List<MarketItem> _filtered(List<MarketItem> items) {
    var out = items.where(
      (i) =>
          (!_filters.contains(_Filter.offers) || i.oldPrice != null) &&
          (!_filters.contains(_Filter.byWeight) || i.byWeight) &&
          (!_filters.contains(_Filter.inStock) || i.inStock),
    );
    if (_filters.contains(_Filter.popular)) {
      final list = out.toList();
      // Popular first, the server's order kept otherwise.
      final popular = [
        for (final i in list)
          if (i.popular) i,
      ];
      out = [
        ...popular,
        for (final i in list)
          if (!i.popular) i,
      ];
    }
    return out.toList();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final page = ref.watch(marketVendorPageProvider(widget.vendorId)).value;
    final list = ref.watch(marketProductListProvider(_query));
    final basket = ref.watch(marketBasketProvider);
    if (page == null) {
      return Scaffold(
        backgroundColor: p.background,
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    final vendor = page.vendor;
    final mine = basket.vendor?.id == vendor.id;
    final shelf = page.shelves
        .where((s) => s.id == widget.departmentId)
        .firstOrNull;
    final searching = widget.query != null;
    final title = searching
        ? l10n.marketResultsFor(widget.query!)
        : (shelf?.name ?? '');
    final aisles = searching ? const <MarketShelfAisle>[] : shelf?.aisles ?? [];
    final allQuery = (
      vendorId: widget.vendorId,
      department: widget.departmentId,
      aisle: null,
      query: null,
      barcode: null,
    );
    final allTotal = searching
        ? list.total
        : ref.watch(marketProductListProvider(allQuery)).total;
    final subtitle = [
      vendor.name,
      l10n.marketProductCount(allTotal),
      if (aisles.length > 1) l10n.marketAisleCount(aisles.length),
    ].join(' · ');
    final items = _filtered(list.items);
    void add(MarketItem item) => ref
        .read(marketBasketProvider.notifier)
        .add(vendor, item, currency: page.currency, decimals: page.decimals);
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Scaffold(
      backgroundColor: p.background,
      body: Stack(
        children: [
          NotificationListener<ScrollNotification>(
            onNotification: (n) {
              if (n.metrics.extentAfter < 600) {
                ref.read(marketProductListProvider(_query).notifier).loadMore();
              }
              return false;
            },
            child: CustomScrollView(
              slivers: [
                SliverSafeArea(
                  bottom: false,
                  sliver: SliverToBoxAdapter(
                    child: _Header(
                      title: title,
                      subtitle: subtitle,
                      onSearch: () => _askSearch(context, vendor.name),
                      onScan: () => scanAndOpen(context, ref, page),
                    ),
                  ),
                ),
                if (aisles.length > 1)
                  SliverToBoxAdapter(
                    child: _AisleChips(
                      vendorId: widget.vendorId,
                      departmentId: widget.departmentId!,
                      aisles: aisles,
                      selected: _aisle,
                      allCount: allTotal,
                      onSelect: (a) => setState(() => _aisle = a),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: _FilterChips(
                    on: _filters,
                    onToggle: (f) => setState(
                      () => _filters.contains(f)
                          ? _filters.remove(f)
                          : _filters.add(f),
                    ),
                  ),
                ),
                if (list.firstLoad)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  )
                else if (items.isEmpty && list.done)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Text(
                        list.error != null
                            ? l10n.marketPricing
                            : l10n.marketNothingHere,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: p.textSecondary),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                    sliver: SliverGrid(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        // The photo, then the words: taller when they're bigger.
                        mainAxisExtent:
                            (MediaQuery.sizeOf(context).width - 44) / 2 * 0.66 +
                            MediaQuery.textScalerOf(context).scale(86) +
                            12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        childCount: items.length,
                        (context, i) {
                          final item = items[i];
                          return MarketProductCard(
                            key: ValueKey('market-product-${item.id}'),
                            item: item,
                            quantity: mine ? basket.quantityOf(item.id) : 0,
                            onAdd: () => add(item),
                            onRemove: () => ref
                                .read(marketBasketProvider.notifier)
                                .remove(item),
                            onOpen: () => context.push(
                              Paths.marketProduct(vendor.id, item.id),
                              extra: item,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                if (!list.firstLoad && list.items.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _ShownMeter(
                      shown: list.items.length,
                      total: list.total,
                      loading: !list.done,
                      error: list.error != null,
                      onRetry: () => ref
                          .read(marketProductListProvider(_query).notifier)
                          .retry(),
                    ),
                  ),
                if (mine && vendor.freeOver != null && !basket.isEmpty)
                  SliverToBoxAdapter(
                    child: _FreeDeliveryMeter(
                      basket: basket,
                      freeOver: vendor.freeOver!,
                    ),
                  ),
                SliverToBoxAdapter(child: SizedBox(height: 110 + bottom)),
              ],
            ),
          ),
          if (mine && !basket.isEmpty)
            PositionedDirectional(
              start: 16,
              end: 16,
              bottom: bottom + 12,
              child: MarketCartBar(
                count: basket.count,
                estimate: marketAmount(
                  basket.estimate,
                  basket.currency,
                  basket.decimals,
                ),
                onTap: () => context.push(Paths.marketCheckout),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _askSearch(BuildContext context, String storeName) async {
    final l10n = context.l10n;
    final q = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          0,
          16,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: TextField(
          autofocus: true,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: l10n.marketSearchStore(storeName),
            prefixIcon: const AppIcon(Symbols.search_rounded),
          ),
          onSubmitted: (v) => Navigator.pop(context, v.trim()),
        ),
      ),
    );
    if (q == null || q.isEmpty || !context.mounted) return;
    await context.push(Paths.marketStoreSearch(widget.vendorId, q));
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.title,
    required this.subtitle,
    required this.onSearch,
    required this.onScan,
  });

  final String title;
  final String subtitle;
  final VoidCallback onSearch;
  final VoidCallback onScan;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget round(IconData icon, VoidCallback onTap, String label, Key key) =>
        Semantics(
          button: true,
          label: label,
          child: Material(
            color: p.surface,
            shape: CircleBorder(side: BorderSide(color: p.border)),
            child: InkWell(
              key: key,
              customBorder: const CircleBorder(),
              onTap: onTap,
              child: SizedBox(
                width: 44,
                height: 44,
                child: AppIcon(icon, size: 22, color: p.text),
              ),
            ),
          ),
        );
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 12),
      child: Row(
        children: [
          round(
            AppIcons.back,
            () => Navigator.of(context).maybePop(),
            MaterialLocalizations.of(context).backButtonTooltip,
            const ValueKey('market-shelf-back'),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 22,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    color: p.text,
                  ),
                ),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          round(
            Symbols.search_rounded,
            onSearch,
            MaterialLocalizations.of(context).searchFieldLabel,
            const ValueKey('market-shelf-search'),
          ),
          const SizedBox(width: 8),
          round(
            Symbols.barcode_scanner_rounded,
            onScan,
            l10n.marketScanBarcode,
            const ValueKey('market-scan'),
          ),
        ],
      ),
    );
  }
}

/// "All 9", then each aisle with its first product's photo and its count.
class _AisleChips extends ConsumerWidget {
  const _AisleChips({
    required this.vendorId,
    required this.departmentId,
    required this.aisles,
    required this.selected,
    required this.allCount,
    required this.onSelect,
  });

  final String vendorId;
  final String departmentId;
  final List<MarketShelfAisle> aisles;
  final String? selected;
  final int allCount;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget chip({
      required String? id,
      required String name,
      required int? count,
      String? photo,
    }) {
      final on = selected == id;
      return Semantics(
        selected: on,
        button: true,
        child: GestureDetector(
          key: ValueKey('market-aisle-${id ?? 'all'}'),
          onTap: () => onSelect(id),
          child: Container(
            height: 52,
            padding: EdgeInsetsDirectional.fromSTEB(
              photo != null ? 5 : 18,
              5,
              16,
              5,
            ),
            decoration: BoxDecoration(
              color: on ? p.primary : p.surface,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: on ? p.primary : p.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (photo != null) ...[
                  ClipOval(
                    child: AppNetworkImage(
                      url: photo,
                      seed: name.hashCode,
                      width: 40,
                      height: 40,
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: on ? p.onPrimary : p.text,
                  ),
                ),
                if (count != null && count > 0) ...[
                  const SizedBox(width: 8),
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: on
                          ? p.onPrimary.withValues(alpha: 0.75)
                          : p.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 64,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        children: [
          chip(id: null, name: l10n.marketAll, count: allCount),
          for (final a in aisles) ...[
            const SizedBox(width: 8),
            Consumer(
              builder: (context, ref, _) {
                // The aisle's first page: its count and a photo for its chip.
                final face = ref.watch(
                  marketProductListProvider((
                    vendorId: vendorId,
                    department: departmentId,
                    aisle: a.id,
                    query: null,
                    barcode: null,
                  )),
                );
                return chip(
                  id: a.id,
                  name: a.name,
                  count: face.firstLoad ? null : face.total,
                  photo: face.items
                      .where((i) => i.imageUrl != null)
                      .firstOrNull
                      ?.imageUrl,
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.on, required this.onToggle});

  final Set<_Filter> on;
  final ValueChanged<_Filter> onToggle;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget chip(_Filter f, IconData icon, String label) {
      final active = on.contains(f);
      return Semantics(
        selected: active,
        button: true,
        child: GestureDetector(
          key: ValueKey('market-filter-${f.name}'),
          onTap: () => onToggle(f),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: active ? marketTint(p, p.primary, 0.16) : p.surfaceMuted,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: active ? p.primary : Colors.transparent,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(icon, size: 18, color: active ? p.primary : p.text),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: active ? p.primary : p.text,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
        children: [
          chip(
            _Filter.popular,
            Symbols.swap_vert_rounded,
            l10n.marketSortPopular,
          ),
          const SizedBox(width: 8),
          chip(_Filter.offers, Symbols.sell_rounded, l10n.marketFilterOffers),
          const SizedBox(width: 8),
          chip(_Filter.byWeight, Symbols.scale_rounded, l10n.marketByWeight),
          const SizedBox(width: 8),
          chip(
            _Filter.inStock,
            Symbols.inventory_2_rounded,
            l10n.marketFilterInStock,
          ),
        ],
      ),
    );
  }
}

/// "4 of 9 shown", a bar, and "Loading more…" while there is more.
class _ShownMeter extends StatelessWidget {
  const _ShownMeter({
    required this.shown,
    required this.total,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final int shown;
  final int total;
  final bool loading;
  final bool error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 18, 28, 8),
      child: Row(
        children: [
          Flexible(
            flex: 2,
            child: Text(
              l10n.marketShownOf(shown, total),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13.5, color: p.textSecondary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: total == 0 ? 1 : (shown / total).clamp(0, 1),
                minHeight: 5,
                color: p.primary,
                backgroundColor: p.surfaceMuted,
              ),
            ),
          ),
          if (loading || error) ...[
            const SizedBox(width: 12),
            if (error)
              TextButton(onPressed: onRetry, child: Text(l10n.tryAgain))
            else
              Flexible(
                flex: 2,
                child: Text(
                  l10n.marketLoadingMore,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: p.primary,
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// How much more makes the delivery free, on a bar.
class _FreeDeliveryMeter extends StatelessWidget {
  const _FreeDeliveryMeter({required this.basket, required this.freeOver});

  final MarketBasket basket;
  final double freeOver;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final left = freeOver - basket.estimate;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            AppIcon(
              Symbols.local_shipping_rounded,
              color: p.primary,
              filled: true,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                left > 0
                    ? l10n.marketFreeDeliveryLeft(
                        marketAmount(left, basket.currency, basket.decimals),
                      )
                    : l10n.marketFreeDeliveryReached,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(width: 10),
            SizedBox(
              width: 90,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: (basket.estimate / freeOver).clamp(0, 1),
                  minHeight: 6,
                  color: p.accent,
                  backgroundColor: p.surfaceMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
