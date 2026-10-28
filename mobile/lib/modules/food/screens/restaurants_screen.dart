import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// 105.1 The Restaurants tab: the company's restaurants, open ones first,
/// with a search over restaurants and dishes and the cuisines as chips.
class RestaurantsScreen extends ConsumerStatefulWidget {
  const RestaurantsScreen({super.key});

  @override
  ConsumerState<RestaurantsScreen> createState() => _RestaurantsScreenState();
}

class _RestaurantsScreenState extends ConsumerState<RestaurantsScreen> {
  late final _search = TextEditingController(
    text: ref.read(restaurantFilterProvider).query,
  );
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String text) {
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 400),
      () => ref.read(restaurantFilterProvider.notifier).setQuery(text.trim()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final cuisines = ref.watch(foodConfigProvider).cuisines;
    final filter = ref.watch(restaurantFilterProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabRestaurants),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: TextField(
                key: const ValueKey('restaurants-search'),
                controller: _search,
                onChanged: _onSearch,
                textInputAction: TextInputAction.search,
                maxLength: 80,
                decoration: InputDecoration(
                  hintText: l10n.restaurantsSearchHint,
                  counterText: '',
                  prefixIcon: AppIcon(
                    AppIcons.search,
                    size: 20,
                    color: p.textSecondary,
                  ),
                ),
              ),
            ),
            if (cuisines.isNotEmpty)
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    for (final c in [null, ...cuisines])
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 8),
                        child: ChoiceChip(
                          key: ValueKey('cuisine-${c?.id ?? 'all'}'),
                          label: Text(c?.name ?? l10n.cuisineAll),
                          selected: filter.cuisine == c?.id,
                          onSelected: (_) => ref
                              .read(restaurantFilterProvider.notifier)
                              .setCuisine(c?.id),
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 4),
            const Expanded(child: _RestaurantList()),
          ],
        ),
      ),
      bottomNavigationBar: const FoodCartBar(),
    );
  }
}

class _RestaurantList extends ConsumerWidget {
  const _RestaurantList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(restaurantsProvider);
    final notifier = ref.read(restaurantsProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingRestaurants,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.restaurant,
        title: l10n.noRestaurantsTitle,
        message: l10n.noRestaurantsMessage,
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('restaurants-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => RestaurantTile(
            restaurant: state.items[i],
            onTap: () => context.push(Paths.restaurant(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}

/// The cart's button while it has dishes: opens the checkout.
class FoodCartBar extends ConsumerWidget {
  const FoodCartBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(foodCartProvider);
    if (cart.isEmpty) return const SizedBox.shrink();
    return BottomActionBar(
      child: PrimaryButton(
        key: const ValueKey('food-view-cart'),
        label: context.l10n.foodViewCart(cart.count),
        icon: AppIcons.cart,
        onPressed: () => context.push(Paths.foodCart),
      ),
    );
  }
}
