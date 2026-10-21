import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import 'account_scaffold.dart';

/// 26 One order, for following it (`GET /me/orders/{order_id}`).
final orderProvider = FutureProvider.autoDispose.family<Order, int>(
  (ref, id) => ref.read(yallappApiProvider).getOrder(id),
);

/// 26 A restaurant's order: its steps, how it's collected and what's in it.
/// Reloads every 30 seconds while open, and when pulled down; each step also
/// arrives as a notification.
class OrderScreen extends ConsumerStatefulWidget {
  const OrderScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      final order = ref.read(orderProvider(widget.orderId)).value;
      final done =
          order?.fulfilmentStatus == FulfilmentStatus.completed ||
          order?.fulfilmentStatus == FulfilmentStatus.cancelled;
      if (!done) ref.invalidate(orderProvider(widget.orderId));
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(orderProvider(widget.orderId));
    final order = async.value;
    final Widget body;
    if (order == null && async.hasError) {
      body = ErrorView(
        error: async.error!,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
      );
    } else if (order == null) {
      body = SkeletonDetail(label: l10n.loadingOrder);
    } else {
      final f = order.fulfilment;
      body = RefreshIndicator(
        onRefresh: () => ref.refresh(orderProvider(widget.orderId).future),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            if (f != null) ...[
              Row(
                children: [
                  AppIcon(
                    f.type == FulfilmentType.delivery
                        ? AppIcons.delivery
                        : AppIcons.pickup,
                    color: p.text,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      fulfilmentSummary(context, f),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
              if (f.address != null) ...[
                const SizedBox(height: 4),
                Text(
                  [
                    f.address!.address,
                    f.address!.district,
                  ].whereType<String>().join(', '),
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              ],
              const SizedBox(height: 20),
            ],
            if (order.trackable) OrderSteps(order: order),
            if (order.trackable &&
                order.fulfilmentStatus != FulfilmentStatus.completed &&
                order.fulfilmentStatus != FulfilmentStatus.cancelled) ...[
              const SizedBox(height: 14),
              Text(
                l10n.orderUpdatesNote,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ],
            const SizedBox(height: 24),
            SectionHeader(title: l10n.orderYourOrder),
            const SizedBox(height: 8),
            for (final line in order.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.quantity > 1
                          ? l10n.lineQuantity(line.name, line.quantity)
                          : line.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    if (line.options.isNotEmpty)
                      Text(
                        line.options.join(', '),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                  ],
                ),
              ),
            if (f?.deliveryFee != null)
              _AmountRow(label: l10n.deliveryFee, value: f!.deliveryFee!),
            _AmountRow(
              label: l10n.orderTotal,
              value: order.total,
              strong: true,
            ),
            // 47 What the business refunded of it.
            if (order.refundedTotal != null)
              Text(
                l10n.refundedAmount(order.refundedTotal!),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: p.danger,
                ),
              ),
            const SizedBox(height: 8),
            Text(
              shortDate(order.createdAt),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            // 71 The receipt as a PDF, in the app's language.
            if (order.receiptUrl != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  onPressed: () => ref.read(openExternalProvider)(
                    receiptInLanguage(
                      order.receiptUrl!,
                      Localizations.localeOf(context).languageCode,
                    ),
                  ),
                  icon: AppIcon(AppIcons.download, size: 18, color: p.link),
                  label: Text(l10n.downloadReceipt),
                  style: TextButton.styleFrom(foregroundColor: p.link),
                ),
              ),
            ],
          ],
        ),
      );
    }
    return AccountScaffold(
      title: order == null ? l10n.myOrders : l10n.orderNumber(order.number),
      scrollable: false,
      child: body,
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final style = TextStyle(
      fontSize: strong ? 16 : 14,
      fontWeight: strong ? FontWeight.w800 : FontWeight.w400,
      color: p.text,
    );
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

/// 26 Where an order is: its steps, the current one marked, or cancelled.
class OrderSteps extends StatelessWidget {
  const OrderSteps({super.key, required this.order});

  final Order order;

  static String label(
    BuildContext context,
    FulfilmentStatus s,
    FulfilmentType type,
  ) {
    final l10n = context.l10n;
    return switch (s) {
      FulfilmentStatus.received => l10n.fulfilmentReceived,
      FulfilmentStatus.preparing => l10n.fulfilmentPreparing,
      FulfilmentStatus.ready =>
        type == FulfilmentType.pickup
            ? l10n.fulfilmentReadyPickup
            : l10n.fulfilmentReady,
      FulfilmentStatus.outForDelivery => l10n.fulfilmentOutForDelivery,
      FulfilmentStatus.completed => l10n.fulfilmentCompleted,
      FulfilmentStatus.cancelled => l10n.fulfilmentCancelled,
    };
  }

  static IconData _icon(FulfilmentStatus s) => switch (s) {
    FulfilmentStatus.received => AppIcons.orders,
    FulfilmentStatus.preparing => AppIcons.preparing,
    FulfilmentStatus.ready => AppIcons.ready,
    FulfilmentStatus.outForDelivery => AppIcons.delivery,
    FulfilmentStatus.completed => AppIcons.checkCircle,
    FulfilmentStatus.cancelled => AppIcons.close,
  };

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final type = order.fulfilment?.type ?? FulfilmentType.pickup;
    final current = order.fulfilmentStatus ?? FulfilmentStatus.received;
    if (current == FulfilmentStatus.cancelled) {
      return AppCard(
        color: p.surfaceMuted,
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            AppIcon(AppIcons.close, color: p.danger),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                context.l10n.orderCancelledMessage,
                style: TextStyle(fontSize: 15, color: p.text),
              ),
            ),
          ],
        ),
      );
    }
    final steps = fulfilmentSteps(type);
    final at = steps.indexOf(current);
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Semantics(
            selected: i == at,
            child: Row(
              children: [
                Column(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i <= at ? p.primary : p.surfaceMuted,
                      ),
                      child: Center(
                        child: AppIcon(
                          _icon(steps[i]),
                          size: 20,
                          color: i <= at ? p.onPrimary : p.textSecondary,
                        ),
                      ),
                    ),
                    if (i < steps.length - 1)
                      Container(
                        width: 2,
                        height: 22,
                        color: i < at ? p.primary : p.border,
                      ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: i < steps.length - 1 ? 22 : 0,
                    ),
                    child: Text(
                      label(context, steps[i], type),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: i == at ? FontWeight.w800 : FontWeight.w500,
                        color: i <= at ? p.text : p.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// "Delivery, as soon as possible", "Pickup at Today 13:30".
String fulfilmentSummary(BuildContext context, OrderFulfilment f) {
  final l10n = context.l10n;
  final at = f.scheduledFor;
  if (f.type == FulfilmentType.delivery) {
    return at == null
        ? l10n.orderDeliveryAsap
        : l10n.orderDeliveryAt(whenLabel(at));
  }
  return at == null ? l10n.orderPickupAsap : l10n.orderPickupAt(whenLabel(at));
}
