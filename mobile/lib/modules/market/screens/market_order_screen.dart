import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import 'market_orders_screen.dart';

/// 115 One of the customer's orders: where it is, what's in it and its
/// price, with cancelling before the vendor accepts it and paying again
/// while it waits for its payment.
class MarketOrderScreen extends ConsumerWidget {
  const MarketOrderScreen({super.key, required this.orderId});

  final int orderId;

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(yallappApiProvider).cancelMyMarketOrder(orderId);
      ref
        ..invalidate(marketOrderProvider(orderId))
        ..invalidate(marketOrdersProvider);
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  Future<void> _pay(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    try {
      final url = await ref.read(yallappApiProvider).payMyMarketOrder(orderId);
      if (!context.mounted) return;
      final paid = await context.push<bool>(
        Paths.web,
        extra: WebPageArgs(
          url: url,
          title: l10n.checkout,
          completesOn: isOrderReceived,
        ),
      );
      if (paid == true && context.mounted) {
        showMessage(context, l10n.marketOrderPaid);
      }
      ref.invalidate(marketOrderProvider(orderId));
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final order = ref.watch(marketOrderProvider(orderId));
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(
          order.value == null
              ? l10n.marketMyOrders
              : l10n.marketOrderTitle(order.value!.reference),
        ),
      ),
      body: order.when(
        loading: () => const SkeletonDetail(),
        error: (e, _) => MessageView(
          icon: Symbols.error,
          title: l10n.marketMyOrders,
          message: '$e',
          actionLabel: l10n.marketBrowse,
          onAction: () => ref.invalidate(marketOrderProvider(orderId)),
        ),
        data: (o) => RefreshIndicator(
          onRefresh: () => ref.refresh(marketOrderProvider(orderId).future),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Status(order: o),
              const SizedBox(height: 12),
              _Box(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      o.vendor.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 8),
                    for (final line in o.lines)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${_qty(line)} × ${line.name}',
                                style: TextStyle(color: p.textBody),
                              ),
                            ),
                            Text(
                              line.total.formatted,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: p.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                    Divider(color: p.divider),
                    for (final line in o.price)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                line.label,
                                style: TextStyle(
                                  fontWeight: line.isTotal
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                  color: line.isTotal
                                      ? p.text
                                      : p.textSecondary,
                                ),
                              ),
                            ),
                            Text(
                              line.amount.formatted,
                              style: TextStyle(
                                fontWeight: line.isTotal
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                color: p.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              if (o.status == api.MarketOrderStatus.awaitingPayment) ...[
                const SizedBox(height: 16),
                PrimaryButton(
                  label: l10n.marketPayAgain,
                  icon: Symbols.credit_card,
                  onPressed: () => _pay(context, ref),
                ),
              ],
              if (o.canCancel) ...[
                const SizedBox(height: 12),
                SecondaryButton(
                  label: l10n.marketCancelOrder,
                  onPressed: () => _cancel(context, ref),
                ),
              ],
              const SizedBox(height: 16),
              Text(
                l10n.marketSupportNote,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12.5, color: p.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _qty(api.MarketOrderLine line) => line.unit == api.ProductUnit.item
    ? line.quantity.round().toString()
    : '${line.quantity.toStringAsFixed(line.quantity % 1 == 0 ? 0 : 2)} ${line.unit.name}';

class _Box extends StatelessWidget {
  const _Box({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: child,
    );
  }
}

class _Status extends StatelessWidget {
  const _Status({required this.order});

  final api.MarketOrder order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final code = order.pickupCode;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [p.primary, Color.lerp(p.primary, Colors.black, 0.25)!],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            marketStatusText(l10n, order.status),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: p.onPrimary,
            ),
          ),
          if (order.eta != null && !order.finished) ...[
            const SizedBox(height: 4),
            Text(
              TimeOfDay.fromDateTime(order.eta!.toLocal()).format(context),
              style: TextStyle(color: p.onPrimary.withValues(alpha: 0.85)),
            ),
          ],
          if (code != null) ...[
            const SizedBox(height: 10),
            Text(
              l10n.marketPickupCode(code),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: p.onPrimary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
