import 'dart:async';

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
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';

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

/// 115 Order again: the basket gets the order's items back, at today's
/// prices (the checkout quotes them again), and the checkout opens. Items
/// that had choices go back through the vendor's page, where they're
/// chosen again; so does an order none of whose items can come back.
Future<void> orderAgain(
  BuildContext context,
  WidgetRef ref,
  api.MarketOrder order,
) async {
  final l10n = context.l10n;
  final config = ref.read(marketConfigProvider);
  final vendor = marketVendorFrom(order.vendor, config);
  final basket = ref.read(marketBasketProvider.notifier);
  if (basket.wouldReplace(vendor)) {
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
    if (yes != true || !context.mounted) return;
  }
  final lines = [
    for (final l in order.lines)
      if (l.choices.isEmpty)
        MarketBasketLine(
          item: MarketItem(
            id: '${l.productId}',
            name: l.name,
            imageUrl: l.imageUrl,
            price: l.unitPrice.formatted,
            priceValue: double.tryParse(l.unitPrice.amount) ?? 0,
            unit: switch (l.unit) {
              api.ProductUnit.item => MarketUnit.piece,
              api.ProductUnit.kg => MarketUnit.kg,
              api.ProductUnit.g => MarketUnit.g,
              api.ProductUnit.l => MarketUnit.l,
            },
            step: switch (l.unit) {
              api.ProductUnit.item => 1,
              api.ProductUnit.g => 100,
              _ => 0.25,
            },
          ),
          quantity: l.quantity,
          ifMissing: l.ifMissing,
        ),
  ];
  basket.refill(
    vendor,
    lines,
    currency: config?.currency ?? 'EGP',
    decimals: config?.currencyDecimals ?? 2,
  );
  if (!context.mounted) return;
  if (lines.isEmpty || lines.length < order.lines.length) {
    unawaited(context.push(Paths.marketVendor(vendor.id)));
  } else {
    unawaited(context.push(Paths.marketCheckout));
  }
}

/// Whether an order is done and can be ordered again.
bool canOrderAgain(api.MarketOrder o) =>
    o.status == api.MarketOrderStatus.delivered ||
    o.status == api.MarketOrderStatus.pickedUp;

class MarketOrdersScreen extends ConsumerWidget {
  const MarketOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.marketMyOrders),
        actions: const [MarketWalletButton()],
      ),
      body: const MarketOrderList(),
    );
  }
}

/// The wallet, from the orders' header.
class MarketWalletButton extends StatelessWidget {
  const MarketWalletButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: context.l10n.marketWallet,
    icon: const Icon(Symbols.account_balance_wallet),
    onPressed: () => context.push(Paths.marketWallet),
  );
}

/// The customer's orders, for the Orders tab of a marketplace and its
/// own page.
class MarketOrderList extends ConsumerWidget {
  const MarketOrderList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final orders = ref.watch(marketOrdersProvider);
    return orders.when(
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
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            o.total.formatted,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          if (canOrderAgain(o))
                            InkWell(
                              onTap: () => orderAgain(context, ref, o),
                              child: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  l10n.marketOrderAgain,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: p.primary,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      onTap: () => context.push(Paths.marketOrder(o.id)),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
