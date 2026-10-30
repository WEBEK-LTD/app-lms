import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/widgets/delivery_widgets.dart' show CallButton;
import '../data/food_providers.dart';
import '../widgets/dish_sheet.dart';
import 'restaurants_screen.dart' show FoodCartBar;
import '../../../core/format/bidi.dart';

/// 105.1 A restaurant: whether it takes orders now, its facts and its menu
/// in sections. A dish opens its sheet; sold-out dishes show but can't be
/// added. A dish of another restaurant asks before emptying the cart.
class RestaurantScreen extends ConsumerWidget {
  const RestaurantScreen({super.key, required this.restaurantId});

  final int restaurantId;

  Future<void> _add(
    BuildContext context,
    WidgetRef ref,
    Restaurant r,
    Dish dish,
  ) async {
    final l10n = context.l10n;
    final cart = ref.read(foodCartProvider.notifier);
    if (cart.replaces(r.id)) {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.cartReplaceTitle),
          content: Text(
            l10n.cartReplaceMessage(
              ref.read(foodCartProvider).restaurantName ?? '',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(l10n.keepIt),
            ),
            FilledButton(
              key: const ValueKey('cart-replace'),
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(l10n.cartReplaceYes),
            ),
          ],
        ),
      );
      if (yes != true || !context.mounted) return;
    }
    final line = await showDishSheet(context, dish);
    if (line == null || !context.mounted) return;
    cart.add(r.id, r.name, line);
    showMessage(context, l10n.foodAdded);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(restaurantProvider(restaurantId));
    final restaurant = async.value;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(restaurant?.name ?? ''),
      ),
      body: switch (async) {
        AsyncValue(value: final r?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(restaurantProvider(restaurantId)),
          child: _Menu(
            restaurant: r,
            onDish: (dish) => _add(context, ref, r, dish),
          ),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(restaurantProvider(restaurantId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: const FoodCartBar(),
    );
  }
}

class _Menu extends StatelessWidget {
  const _Menu({required this.restaurant, required this.onDish});

  final Restaurant restaurant;
  final ValueChanged<Dish> onDish;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final r = restaurant;
    final s = r.summary;
    final closed = !s.open || s.busy;
    return ListView(
      key: const ValueKey('restaurant-menu'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        if (s.coverUrl != null) ...[
          AppNetworkImage(
            url: s.coverUrl,
            seed: s.id,
            radius: 14,
            height: 160,
            placeholderIcon: AppIcons.restaurant,
          ),
          const SizedBox(height: 12),
        ],
        if (s.cuisines.isNotEmpty)
          Text(
            s.cuisines.join(' · '),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        if (r.description != null) ...[
          const SizedBox(height: 4),
          Text(
            r.description!,
            style: TextStyle(fontSize: 15, color: p.textBody),
          ),
        ],
        const SizedBox(height: 8),
        Row(
          children: [
            if (s.rating != null) ...[
              AppIcon(AppIcons.star, size: 16, color: p.star, filled: true),
              const SizedBox(width: 2),
              Text(
                '${s.rating!.toStringAsFixed(1)} (${s.ratingsCount})',
                style: TextStyle(fontSize: 13, color: p.text),
              ),
              const SizedBox(width: 8),
            ],
            Expanded(child: _Facts(summary: s)),
          ],
        ),
        if (closed) ...[
          const SizedBox(height: 10),
          AppCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                AppIcon(AppIcons.closed, size: 22, color: p.danger),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    s.busy
                        ? l10n.restaurantBusy
                        : s.opensAt != null
                        ? l10n.restaurantOpensAt(opensLabel(s.opensAt!))
                        : l10n.restaurantClosed,
                    key: const ValueKey('restaurant-closed'),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        if (r.phone != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: CallButton(phone: r.phone!, label: l10n.foodCallRestaurant),
          ),
        for (final section in r.menu) ...[
          const SizedBox(height: 18),
          Semantics(
            header: true,
            child: Text(
              section.name,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(height: 8),
          for (final dish in section.dishes)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _DishTile(
                dish: dish,
                onTap: dish.available ? () => onDish(dish) : null,
              ),
            ),
        ],
      ],
    );
  }
}

class _Facts extends StatelessWidget {
  const _Facts({required this.summary});

  final RestaurantSummary summary;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final s = summary;
    return Text(
      [
        l10n.restaurantMinutes(s.deliveryMinutes ?? s.prepMinutes),
        if (s.deliveryFeeFormatted != null)
          l10n.restaurantFee(isolate(s.deliveryFeeFormatted!)),
        if (s.minOrderFormatted != null)
          l10n.restaurantMinOrder(isolate(s.minOrderFormatted!)),
      ].join(' · '),
      style: TextStyle(fontSize: 13, color: context.palette.textSecondary),
    );
  }
}

class _DishTile extends StatelessWidget {
  const _DishTile({required this.dish, required this.onTap});

  final Dish dish;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Opacity(
      opacity: dish.available ? 1 : 0.55,
      child: AppCard(
        key: ValueKey('dish-${dish.id}'),
        padding: const EdgeInsets.all(12),
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dish.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (dish.description != null)
                    Text(
                      dish.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textBody),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      dish.priceFormatted,
                      if (!dish.available) l10n.dishSoldOut,
                      if (dish.available && dish.popular) l10n.dishPopular,
                    ].join(' · '),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: dish.available ? p.text : p.danger,
                    ),
                  ),
                ],
              ),
            ),
            if (dish.imageUrl != null) ...[
              const SizedBox(width: 12),
              AppNetworkImage(
                url: dish.imageUrl,
                seed: dish.id,
                radius: 10,
                width: 72,
                height: 72,
                placeholderIcon: AppIcons.restaurant,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
