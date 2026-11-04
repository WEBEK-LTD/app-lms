import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'package:go_router/go_router.dart';

import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import '../widgets/market_look.dart';

/// 115 A restaurant's or a shop's page: its picture, facts and offer, then
/// the menu by section (a restaurant) or the aisles with items by weight (a
/// shop), and the basket at the bottom. No phone and no chat: people reach
/// the app owner's support, never the vendor.
class MarketVendorScreen extends ConsumerWidget {
  const MarketVendorScreen({super.key, required this.vendorId});

  final String vendorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(marketVendorPageProvider(vendorId)).value;
    final p = context.palette;
    if (page == null) {
      return Scaffold(
        backgroundColor: p.background,
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return _VendorPageView(page: page);
  }
}

class _VendorPageView extends ConsumerStatefulWidget {
  const _VendorPageView({required this.page});

  final MarketVendorPage page;

  @override
  ConsumerState<_VendorPageView> createState() => _VendorPageViewState();
}

class _VendorPageViewState extends ConsumerState<_VendorPageView> {
  int _shelf = 0;

  MarketVendor get _vendor => widget.page.vendor;
  bool get _shop => _vendor.sellsGoods;

  Future<void> _add(MarketItem item) async {
    final basket = ref.read(marketBasketProvider.notifier);
    if (basket.wouldReplace(_vendor)) {
      final l10n = context.l10n;
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.marketNewBasketTitle),
          content: Text(
            l10n.marketNewBasketMessage(
              ref.read(marketBasketProvider).vendor?.name ?? '',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.marketNewBasketConfirm),
            ),
          ],
        ),
      );
      if (yes != true || !mounted) return;
    }
    basket.add(
      _vendor,
      item,
      currency: widget.page.currency,
      decimals: widget.page.decimals,
    );
  }

  void _remove(MarketItem item) =>
      ref.read(marketBasketProvider.notifier).remove(item);

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shelves = widget.page.shelves;
    final basket = ref.watch(marketBasketProvider);
    final mine = basket.vendor?.id == _vendor.id;
    double quantity(MarketItem item) => mine ? basket.quantityOf(item.id) : 0;
    return Scaffold(
      backgroundColor: p.background,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              _Cover(vendor: _vendor),
              SliverToBoxAdapter(child: _Info(page: widget.page)),
              SliverPersistentHeader(
                pinned: true,
                delegate: _ShelfTabs(
                  shelves: shelves,
                  selected: _shelf,
                  onSelect: (i) => setState(() => _shelf = i),
                  palette: p,
                  title: _shop ? context.l10n.marketAisles : null,
                ),
              ),
              for (final shelf in shelves) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
                    child: Text(
                      shelf.name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        color: p.text,
                      ),
                    ),
                  ),
                ),
                if (_shop)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverGrid.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.74,
                      children: [
                        for (final item in shelf.items)
                          _ProductTile(
                            item: item,
                            quantity: quantity(item),
                            onAdd: () => _add(item),
                            onRemove: () => _remove(item),
                          ),
                      ],
                    ),
                  )
                else
                  SliverList.list(
                    children: [
                      for (final item in shelf.items)
                        _DishRow(
                          item: item,
                          quantity: quantity(item).round(),
                          onAdd: () => _add(item),
                        ),
                    ],
                  ),
              ],
              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
          if (mine && !basket.isEmpty)
            PositionedDirectional(
              start: 16,
              end: 16,
              bottom: MediaQuery.paddingOf(context).bottom + 12,
              child: _BasketBar(
                count: basket.count,
                total: marketAmount(
                  basket.estimate,
                  widget.page.currency,
                  widget.page.decimals,
                ),
                onTap: () => context.push(Paths.marketCheckout),
              ),
            ),
        ],
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.vendor});

  final MarketVendor vendor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget round(IconData icon, {bool filled = false}) => Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: p.surface.withValues(alpha: 0.94),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: AppIcon(icon, size: 20, color: p.text, filled: filled),
    );
    return SliverAppBar(
      expandedHeight: 236,
      pinned: true,
      stretch: true,
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      automaticallyImplyLeading: false,
      titleSpacing: 12,
      title: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).maybePop(),
            child: round(AppIcons.back),
          ),
          const Spacer(),
          round(Symbols.search_rounded),
          const SizedBox(width: 8),
          round(Symbols.ios_share_rounded),
          const SizedBox(width: 8),
          round(Symbols.favorite_rounded, filled: vendor.favorited),
        ],
      ),
      flexibleSpace: FlexibleSpaceBar(
        stretchModes: const [StretchMode.zoomBackground],
        background: Stack(
          fit: StackFit.expand,
          children: [
            AppNetworkImage(url: vendor.coverUrl, seed: vendor.id.hashCode),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.28),
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.12),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.page});

  final MarketVendorPage page;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final v = page.vendor;
    final live = v.deliveredBy == MarketDeliveredBy.app;
    Widget chip(IconData icon, String text, {Color? color}) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(icon, size: 16, color: color ?? p.primary),
          const SizedBox(width: 5),
          Text(
            text,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: color ?? p.text,
            ),
          ),
        ],
      ),
    );
    return Container(
      decoration: BoxDecoration(
        color: p.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      transform: Matrix4.translationValues(0, -24, 0),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Transform.translate(
                offset: const Offset(0, -22),
                child: MarketVendorMark(vendor: v, size: 72),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        v.name,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                          color: p.text,
                        ),
                      ),
                      Text(
                        v.tags.join(' · '),
                        style: TextStyle(fontSize: 13, color: p.textTertiary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Row(
            children: [
              Flexible(child: MarketRating(vendor: v)),
              const SizedBox(width: 6),
              Text(
                l10n.marketReviews,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: p.primary,
                ),
              ),
              const SizedBox(width: 12),
              if (page.hours != null)
                Expanded(
                  child: Text(
                    l10n.marketHours(page.hours!),
                    textAlign: TextAlign.end,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (marketEtaText(context, v) case final eta?)
                chip(Symbols.schedule_rounded, eta),
              if (v.freeDelivery)
                chip(
                  Symbols.two_wheeler_rounded,
                  l10n.marketFreeDelivery,
                  color: p.success,
                )
              else if (v.deliveryFee case final fee?)
                chip(
                  Symbols.two_wheeler_rounded,
                  l10n.marketDeliveryFee(ltrRun(fee)),
                ),
              if (v.minOrder case final min?)
                chip(
                  Symbols.shopping_bag_rounded,
                  l10n.marketMinOrder(ltrRun(min)),
                ),
              chip(
                live ? Symbols.near_me_rounded : Symbols.storefront_rounded,
                live ? l10n.marketLiveTracking : l10n.marketOwnDelivery,
              ),
            ],
          ),
          if (v.promo case final promo?) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    marketTint(p, p.accent, 0.22),
                    marketTint(p, p.accent, 0.08),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  AppIcon(
                    Symbols.local_offer_rounded,
                    size: 20,
                    color: p.accent,
                    filled: true,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      promo,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              AppIcon(
                Symbols.support_agent_rounded,
                size: 18,
                color: p.textTertiary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.marketSupportNote,
                  style: TextStyle(fontSize: 12, color: p.textTertiary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The menu's sections or the shop's aisles, pinned under the cover.
class _ShelfTabs extends SliverPersistentHeaderDelegate {
  const _ShelfTabs({
    required this.shelves,
    required this.selected,
    required this.onSelect,
    required this.palette,
    this.title,
  });

  final List<MarketShelf> shelves;
  final int selected;
  final ValueChanged<int> onSelect;
  final AppPalette palette;
  final String? title;

  @override
  double get minExtent => 58;

  @override
  double get maxExtent => 58;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlaps) {
    final p = palette;
    return Container(
      color: p.background,
      alignment: Alignment.center,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: shelves.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final on = i == selected;
          return GestureDetector(
            onTap: () => onSelect(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: on ? p.text : p.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: on ? p.text : p.border),
              ),
              child: Text(
                shelves[i].name,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: on ? p.background : p.text,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  bool shouldRebuild(_ShelfTabs old) =>
      old.selected != selected || old.shelves != shelves;
}

/// A dish: its words and price, its picture with a + on it.
class _DishRow extends StatelessWidget {
  const _DishRow({
    required this.item,
    required this.quantity,
    required this.onAdd,
  });

  final MarketItem item;
  final int quantity;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Opacity(
      opacity: item.inStock ? 1 : 0.55,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: quantity > 0 ? p.primary : p.border,
              width: quantity > 0 ? 1.5 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.badge != null) ...[
                      MarketPill(
                        text: item.badge!,
                        background: marketTint(p, p.accent, 0.18),
                        color: p.text,
                        icon: Symbols.local_fire_department_rounded,
                      ),
                      const SizedBox(height: 6),
                    ],
                    Text(
                      item.name,
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    if (item.description != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        item.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.35,
                          color: p.textSecondary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          ltrRun(item.price),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: item.oldPrice != null ? p.danger : p.text,
                          ),
                        ),
                        if (item.oldPrice case final was?) ...[
                          Text(
                            ltrRun(was),
                            style: TextStyle(
                              fontSize: 12.5,
                              color: p.textTertiary,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                        if (item.hasChoices) ...[
                          Text(
                            '· ${l10n.marketChoices}',
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textTertiary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 104,
                height: 104,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: GestureDetector(
                          onTap: () => showMarketPhotos(context, item),
                          child: AppNetworkImage(
                            url: item.imageUrl,
                            seed: item.id.hashCode,
                          ),
                        ),
                      ),
                    ),
                    PositionedDirectional(
                      end: -4,
                      bottom: -4,
                      child: item.inStock
                          ? _RoundAdd(count: quantity, onTap: onAdd)
                          : MarketPill(
                              text: l10n.marketSoldOut,
                              background: p.text,
                              color: p.background,
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoundAdd extends StatelessWidget {
  const _RoundAdd({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 36,
        constraints: const BoxConstraints(minWidth: 36),
        padding: EdgeInsets.symmetric(horizontal: count > 0 ? 10 : 0),
        decoration: BoxDecoration(
          color: count > 0 ? p.primary : p.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.16),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: count > 0
            ? Text(
                '$count',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: p.onPrimary,
                ),
              )
            : AppIcon(Symbols.add_rounded, size: 22, color: p.primary),
      ),
    );
  }
}

/// A shop's item: picture, price (per kilogram for weight), name and a
/// stepper once it's in the basket.
class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.item,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
  });

  final MarketItem item;
  final double quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    // Sold by weight or volume: the amount with its unit ("1.5 kg").
    final kg = item.unit != MarketUnit.piece;
    final digits = quantity % 1 == 0 ? 0 : ((quantity * 10) % 1 == 0 ? 1 : 2);
    final unit = switch (item.unit) {
      MarketUnit.g => 'g',
      MarketUnit.l => 'L',
      _ => 'kg',
    };
    final amount = kg
        ? '${quantity.toStringAsFixed(digits)} $unit'
        : quantity.toStringAsFixed(0);
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: quantity > 0 ? p.primary : p.border),
      ),
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: GestureDetector(
                      onTap: () => showMarketPhotos(context, item),
                      child: AppNetworkImage(
                        url: item.imageUrl,
                        seed: item.id.hashCode,
                      ),
                    ),
                  ),
                ),
                if (item.badge != null)
                  PositionedDirectional(
                    top: 6,
                    start: 6,
                    child: MarketPill(
                      text: item.badge!,
                      background: p.danger,
                      color: Colors.white,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Flexible(
                child: Text(
                  ltrRun(item.price),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: item.oldPrice != null ? p.danger : p.text,
                  ),
                ),
              ),
              if (kg)
                Text(
                  ' ${switch (item.unit) {
                    MarketUnit.g => l10n.marketPerGram,
                    MarketUnit.l => l10n.marketPerLitre,
                    _ => l10n.marketPerKg,
                  }}',
                  style: TextStyle(fontSize: 12, color: p.textTertiary),
                ),
            ],
          ),
          Text(
            item.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 8),
          if (quantity > 0)
            Container(
              height: 36,
              decoration: BoxDecoration(
                color: p.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: onRemove,
                    visualDensity: VisualDensity.compact,
                    icon: AppIcon(
                      Symbols.remove_rounded,
                      size: 18,
                      color: p.onPrimary,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      amount,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: p.onPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onAdd,
                    visualDensity: VisualDensity.compact,
                    icon: AppIcon(
                      Symbols.add_rounded,
                      size: 18,
                      color: p.onPrimary,
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              height: 36,
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onAdd,
                style: OutlinedButton.styleFrom(
                  foregroundColor: p.primary,
                  side: BorderSide(color: p.border),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: AppIcon(Symbols.add_rounded, size: 18, color: p.primary),
                label: Text(
                  l10n.marketAdd,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _BasketBar extends StatelessWidget {
  const _BasketBar({
    required this.count,
    required this.total,
    required this.onTap,
  });

  final int count;
  final String total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 58,
          padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 18, 8),
          decoration: BoxDecoration(
            color: p.primary,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: p.primary.withValues(alpha: 0.4),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                height: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Text(
                  l10n.marketBasketItems(count),
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: p.onPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  l10n.marketViewBasket,
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: p.onPrimary,
                  ),
                ),
              ),
              Text(
                total,
                style: TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w800,
                  color: p.onPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 115.7.1 A product's photos, one after another, with its name and price.
Future<void> showMarketPhotos(BuildContext context, MarketItem item) {
  final photos = item.photos.isNotEmpty
      ? item.photos
      : [if (item.imageUrl != null) item.imageUrl!];
  if (photos.isEmpty) return Future.value();
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _PhotoSheet(item: item, photos: photos),
  );
}

class _PhotoSheet extends StatefulWidget {
  const _PhotoSheet({required this.item, required this.photos});

  final MarketItem item;
  final List<String> photos;

  @override
  State<_PhotoSheet> createState() => _PhotoSheetState();
}

class _PhotoSheetState extends State<_PhotoSheet> {
  int _at = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final photos = widget.photos;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: PageView.builder(
                  itemCount: photos.length,
                  onPageChanged: (i) => setState(() => _at = i),
                  itemBuilder: (context, i) => AppNetworkImage(
                    url: photos[i],
                    seed: widget.item.id.hashCode + i,
                  ),
                ),
              ),
            ),
            if (photos.length > 1) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < photos.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == _at ? 18 : 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: i == _at ? p.primary : p.border,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            Text(
              widget.item.name,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
            if (widget.item.description != null) ...[
              const SizedBox(height: 4),
              Text(
                widget.item.description!,
                style: TextStyle(color: p.textSecondary),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              widget.item.price,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: p.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
