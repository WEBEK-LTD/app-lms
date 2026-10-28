import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// 105.1 My orders: the signed-in customer's food orders, newest first.
class FoodOrdersScreen extends ConsumerWidget {
  const FoodOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabFoodOrders),
            Expanded(
              child: signedIn
                  ? const _OrderList()
                  : SignInPrompt(
                      icon: AppIcons.orders,
                      title: l10n.foodOrdersSignInTitle,
                      message: l10n.foodOrdersSignInMessage,
                      from: Paths.foodOrders,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(myFoodOrdersProvider);
    final notifier = ref.read(myFoodOrdersProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingFoodOrders,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.orders,
        title: l10n.noFoodOrdersTitle,
        message: l10n.noFoodOrdersMessage,
        actionLabel: l10n.foodOrderFood,
        onAction: () => context.go(Paths.restaurants),
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
          key: const ValueKey('food-orders-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => FoodOrderTile(
            order: state.items[i],
            onTap: () => context.push(Paths.foodOrder(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}
