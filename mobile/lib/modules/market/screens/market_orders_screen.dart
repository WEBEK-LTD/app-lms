import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/api/models/models.dart' show Paged;
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';

/// 115 The customer's marketplace orders, newest first.
final marketOrdersProvider = FutureProvider.autoDispose<Paged<api.MarketOrder>>(
  (ref) => ref.watch(yallappApiProvider).listMyMarketOrders(),
);

/// One of the customer's orders.
final marketOrderProvider = FutureProvider.autoDispose
    .family<api.MarketOrder, int>(
      (ref, id) => ref.watch(yallappApiProvider).getMyMarketOrder(id),
    );

/// An order's status in words.
String marketStatusText(AppLocalizations l10n, api.MarketOrderStatus s) =>
    switch (s) {
      api.MarketOrderStatus.awaitingPayment => l10n.marketStatusAwaitingPayment,
      api.MarketOrderStatus.scheduled => l10n.marketStatusScheduled,
      api.MarketOrderStatus.placed => l10n.marketStatusPlaced,
      api.MarketOrderStatus.accepted => l10n.marketStatusAccepted,
      api.MarketOrderStatus.picking => l10n.marketStatusPicking,
      api.MarketOrderStatus.ready => l10n.marketStatusReady,
      api.MarketOrderStatus.onTheWay => l10n.marketStatusOnTheWay,
      api.MarketOrderStatus.delivered => l10n.marketStatusDelivered,
      api.MarketOrderStatus.pickedUp => l10n.marketStatusPickedUp,
      api.MarketOrderStatus.rejected => l10n.marketStatusRejected,
      api.MarketOrderStatus.cancelled => l10n.marketStatusCancelled,
    };

class MarketOrdersScreen extends ConsumerWidget {
  const MarketOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final orders = ref.watch(marketOrdersProvider);
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.marketMyOrders),
        actions: [
          IconButton(
            tooltip: l10n.marketWallet,
            icon: const Icon(Symbols.account_balance_wallet),
            onPressed: () => context.push(Paths.marketWallet),
          ),
        ],
      ),
      body: orders.when(
        loading: () => const SkeletonList(),
        error: (e, _) => MessageView(
          icon: Symbols.error,
          title: l10n.marketMyOrders,
          message: '$e',
          actionLabel: l10n.marketBrowse,
          onAction: () => ref.invalidate(marketOrdersProvider),
        ),
        data: (page) => page.items.isEmpty
            ? MessageView(
                icon: Symbols.receipt_long,
                title: l10n.marketNoOrders,
                message: l10n.marketEmptyBasketMessage,
                actionLabel: l10n.marketBrowse,
                onAction: () => context.go(Paths.home),
              )
            : RefreshIndicator(
                onRefresh: () => ref.refresh(marketOrdersProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: page.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final o = page.items[i];
                    return Material(
                      color: p.surface,
                      borderRadius: BorderRadius.circular(18),
                      child: ListTile(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                          side: BorderSide(color: p.border),
                        ),
                        title: Text(
                          o.vendor.name,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        subtitle: Text(
                          '${o.reference} · ${marketStatusText(l10n, o.status)}',
                        ),
                        trailing: Text(
                          o.total.formatted,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        onTap: () => context.push(Paths.marketOrder(o.id)),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
