import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';
import 'food_sheets.dart';

/// 125 A food app's restaurants, for the busy banner and the Restaurants
/// screen.
final restaurantsProvider = FutureProvider.autoDispose<List<Restaurant>>((ref) {
  final app = ref.watch(currentAppProvider);
  if (app == null || !app.features.restaurants) return const [];
  return ref.watch(apiProvider).restaurants(app.id);
});

Tone foodTone(String status) => switch (status) {
  'placed' => Tone.info,
  'accepted' || 'preparing' => Tone.warn,
  'ready' || 'delivered' => Tone.good,
  'picked_up' || 'on_the_way' => Tone.info,
  'rejected' || 'cancelled' || 'failed' => Tone.bad,
  _ => Tone.neutral,
};

/// 125 Food orders (the Main board): New, Active, Done and Problems; a new
/// order is accepted with the time to prepare, or rejected with why.
class FoodOrdersScreen extends ConsumerStatefulWidget {
  const FoodOrdersScreen({super.key, this.initialFilter});

  final String? initialFilter;

  @override
  ConsumerState<FoodOrdersScreen> createState() => _FoodOrdersScreenState();
}

class _FoodOrdersScreenState extends ConsumerState<FoodOrdersScreen> {
  static const filters = ['new', 'active', 'done', 'problems'];
  late int _filter = filters.indexOf(widget.initialFilter ?? '').clamp(0, 3);
  int _version = 0;
  bool _searching = false;
  String? _query;
  int _newCount = 0;

  void _changed() {
    setState(() => _version++);
    ref.invalidate(restaurantsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final api = ref.watch(apiProvider);
    final filter = filters[_filter];
    final busy = [
      for (final r in ref.watch(restaurantsProvider).value ?? const [])
        if (r.busyUntil != null) r,
    ];
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            StudioHeader(
              title: l10n.foodOrdersTitle,
              actions: [
                IconButton(
                  tooltip: l10n.searchAction,
                  icon: const Icon(AppIcons.search),
                  onPressed: () => setState(() => _searching = !_searching),
                ),
                if (app.features.restaurants)
                  HeaderLink(
                    icon: AppIcons.store,
                    label: l10n.restaurantsTitle,
                    onPressed: () => context.push(Paths.restaurants),
                  ),
              ],
            ),
            if (_searching)
              SearchBarField(
                hint: l10n.searchFoodHint,
                onSubmitted: (q) => setState(() {
                  _query = q;
                  _version++;
                }),
                onClose: () => setState(() {
                  _searching = false;
                  if (_query != null) _version++;
                  _query = null;
                }),
              ),
            FilterTabs(
              labels: [
                l10n.filterNew,
                l10n.filterActive,
                l10n.filterDone,
                l10n.filterProblems,
              ],
              selected: _filter,
              counts: {0: _newCount},
              onSelected: (i) => setState(() => _filter = i),
            ),
            Expanded(
              child: PagedList<FoodOrder>(
                key: ValueKey('${app.id}-$filter-$_query-$_version'),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                spacing: 12,
                load: (page) async {
                  final result = await api.foodOrders(
                    app.id,
                    filter: filter,
                    query: _query,
                    page: page,
                  );
                  if (mounted && result.counts.containsKey('new')) {
                    setState(() => _newCount = result.count('new'));
                  }
                  return result;
                },
                header: busy.isEmpty
                    ? null
                    : Column(
                        children: [
                          for (final r in busy)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: BusyBanner(
                                restaurant: r,
                                onChanged: _changed,
                              ),
                            ),
                        ],
                      ),
                footer: filter == 'new'
                    ? Padding(
                        padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
                        child: Text(
                          l10n.foodRaceNote,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: context.yb.ink2,
                          ),
                        ),
                      )
                    : null,
                empty: EmptyState(
                  icon: AppIcons.orders,
                  title: l10n.noFoodOrders,
                  text: filter == 'new' ? l10n.noFoodOrdersText : null,
                ),
                itemBuilder: (context, order) =>
                    FoodOrderCard(order: order, onChanged: _changed),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Burger Lab is busy until 20:30" with End delay.
class BusyBanner extends ConsumerStatefulWidget {
  const BusyBanner({
    super.key,
    required this.restaurant,
    required this.onChanged,
  });

  final Restaurant restaurant;
  final VoidCallback onChanged;

  @override
  ConsumerState<BusyBanner> createState() => _BusyBannerState();
}

class _BusyBannerState extends ConsumerState<BusyBanner> {
  bool _busy = false;

  Future<void> _end() async {
    final r = widget.restaurant;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .endRestaurantDelay(ref.read(appIdProvider), r.id);
      if (!mounted) return;
      showMessage(context, context.l10n.delayEnded(r.name));
      widget.onChanged();
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final r = widget.restaurant;
    final text = context.l10n.busyUntil('\u0000', context.time(r.busyUntil!));
    final parts = text.split('\u0000');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: c.warningBg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(AppIcons.schedule, color: c.warning),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 14, color: c.warning),
                children: [
                  TextSpan(text: parts.first),
                  TextSpan(
                    text: isolate(r.name),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  if (parts.length > 1) TextSpan(text: parts.last),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton(
            onPressed: _busy ? null : _end,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(48, 36),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
              foregroundColor: c.warning,
              side: BorderSide(color: c.warning),
              textStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: Text(context.l10n.endDelay),
          ),
        ],
      ),
    );
  }
}

/// A food order in the list.
class FoodOrderCard extends ConsumerStatefulWidget {
  const FoodOrderCard({
    super.key,
    required this.order,
    required this.onChanged,
  });

  final FoodOrder order;
  final VoidCallback onChanged;

  @override
  ConsumerState<FoodOrderCard> createState() => _FoodOrderCardState();
}

class _FoodOrderCardState extends ConsumerState<FoodOrderCard> {
  bool _busy = false;

  Future<void> _act(bool accept) async {
    final appId = ref.read(appIdProvider);
    final api = ref.read(apiProvider);
    setState(() => _busy = true);
    try {
      final detail = await api.foodOrder(appId, widget.order.id);
      if (!mounted) return;
      final done = accept
          ? await acceptFoodOrder(context, ref, detail)
          : await rejectFoodOrder(context, ref, detail);
      if (done != null) widget.onChanged();
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final o = widget.order;
    final money = [
      o.payment.label,
      if (o.distanceKm != null) km(context, o.distanceKm!),
    ];
    return Box(
      onTap: () => context.push(Paths.foodOrder(o.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                o.reference,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: Tag(o.statusLabel, tone: foodTone(o.status))),
              const Spacer(),
              Text(
                context.ago(o.placedAt),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            l10n.foodRoute(isolate(o.restaurant.name), isolate(o.customerName)),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            o.summary,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: c.ink2),
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: isolate(o.total.formatted),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                TextSpan(
                  text: ' · ${money.map(isolate).join(' · ')}',
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
              ],
            ),
          ),
          if (o.canAccept || o.steps.contains('reject')) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (o.steps.contains('reject'))
                  SmallButton(
                    label: l10n.rejectAction,
                    onPressed: _busy ? null : () => _act(false),
                  ),
                if (o.canAccept)
                  SmallButton(
                    label: l10n.accept,
                    filled: true,
                    onPressed: _busy ? null : () => _act(true),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// 125 A food app's restaurants: busy or delayed ones open again.
class RestaurantsScreen extends ConsumerWidget {
  const RestaurantsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final list = ref.watch(restaurantsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.restaurantsTitle)),
      body: AsyncBody(
        value: list,
        onRetry: () => ref.invalidate(restaurantsProvider),
        builder: (items) => items.isEmpty
            ? EmptyState(icon: AppIcons.store, title: l10n.noRestaurants)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(restaurantsProvider.future),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    for (final r in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _RestaurantTile(restaurant: r),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _RestaurantTile extends ConsumerWidget {
  const _RestaurantTile({required this.restaurant});

  final Restaurant restaurant;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final r = restaurant;
    final tone = r.busyUntil != null || r.delayed
        ? Tone.warn
        : r.open
        ? Tone.good
        : Tone.neutral;
    final line = r.busyUntil != null
        ? l10n.busyUntil(isolate(r.name), context.time(r.busyUntil!))
        : r.opensAt != null && !r.open
        ? l10n.opensAt(context.time(r.opensAt!))
        : null;

    Future<void> run(Future<Restaurant> Function() call, String done) async {
      try {
        await call();
        if (!context.mounted) return;
        showMessage(context, done);
        ref.invalidate(restaurantsProvider);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    final appId = ref.read(appIdProvider);
    final api = ref.read(apiProvider);
    return Box(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(AppIcons.store, color: c.accentText),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  r.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Tag(r.stateLabel, tone: tone),
            ],
          ),
          if (line != null) ...[
            const SizedBox(height: 6),
            Text(line, style: TextStyle(fontSize: 13, color: c.ink2)),
          ],
          if (r.delayed || r.busyUntil != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (r.delayed)
                  SmallButton(
                    label: l10n.endDelay,
                    onPressed: () => run(
                      () => api.endRestaurantDelay(appId, r.id),
                      l10n.delayEnded(r.name),
                    ),
                  ),
                SmallButton(
                  label: l10n.openNow,
                  filled: true,
                  onPressed: () => run(
                    () => api.openRestaurant(appId, r.id),
                    l10n.restaurantOpened(r.name),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
