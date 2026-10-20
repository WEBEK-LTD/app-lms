import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 59 What an order's next-status buttons say. A restaurant's new order is
/// accepted (to the kitchen) or declined.
String orderActionLabel(BuildContext context, Order order, String status) {
  final l10n = context.l10n;
  final kitchen = order.kitchen;
  final isNew = kitchen?.step == 'received';
  return switch (status) {
    'preparing' => isNew ? l10n.accept : l10n.startPreparing,
    'ready' => l10n.markReady,
    'out_for_delivery' => l10n.outForDelivery,
    'completed' =>
      kitchen == null
          ? l10n.markCompleted
          : (kitchen.type == 'pickup' ? l10n.pickedUp : l10n.delivered),
    'cancelled' => isNew ? l10n.decline : l10n.cancelOrder,
    _ => status,
  };
}

/// The order's status, or its kitchen step for a restaurant.
String orderStatusLabel(BuildContext context, Order order) {
  final l10n = context.l10n;
  final kitchen = order.kitchen;
  if (kitchen != null && order.status == 'processing') {
    return kitchen.stepLabel ??
        switch (kitchen.step) {
          'received' => l10n.stepNew,
          'preparing' => l10n.stepPreparing,
          'ready' => l10n.stepReady,
          'out_for_delivery' => l10n.outForDelivery,
          _ => kitchen.step,
        };
  }
  return order.statusLabel ??
      switch (order.status) {
        'processing' => l10n.statusProcessing,
        'completed' => l10n.statusCompleted,
        'cancelled' => l10n.statusCancelled,
        'refunded' => l10n.statusRefunded,
        _ => order.status,
      };
}

String orderTone(Order order) =>
    order.kitchen != null && order.status == 'processing'
    ? order.kitchen!.step
    : order.status;

/// Moves the order on (asking first before cancelling); null when it
/// didn't change.
Future<Order?> changeOrderStatus(
  BuildContext context,
  WidgetRef ref,
  Order order,
  String status,
) async {
  final l10n = context.l10n;
  if (status == 'cancelled') {
    final ok = await confirm(
      context,
      title: l10n.cancelOrderTitle(order.number),
      text: l10n.cancelOrderText,
      action: orderActionLabel(context, order, status),
      destructive: true,
    );
    if (!ok) return null;
  }
  try {
    final updated = await ref
        .read(apiProvider)
        .changeOrderStatus(ref.read(appIdProvider), order.id, status);
    if (context.mounted) {
      showMessage(
        context,
        l10n.orderUpdated(order.number, orderStatusLabel(context, updated)),
      );
    }
    return updated;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// The next-status buttons: the step forward filled, cancelling outlined.
class OrderActions extends ConsumerWidget {
  const OrderActions({
    super.key,
    required this.order,
    required this.onChanged,
    this.large = false,
  });

  final Order order;
  final void Function(Order updated) onChanged;
  final bool large;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final next = order.nextStatuses;
    if (next.isEmpty) return const SizedBox.shrink();
    final forward = next.where((s) => s != 'cancelled').toList();
    final cancel = next.contains('cancelled');
    final size = large ? const Size(64, 64) : const Size(64, 48);

    Future<void> run(String status) async {
      final updated = await changeOrderStatus(context, ref, order, status);
      if (updated != null) onChanged(updated);
    }

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        if (cancel)
          OutlinedButton(
            style: OutlinedButton.styleFrom(minimumSize: size),
            onPressed: () => run('cancelled'),
            child: Text(orderActionLabel(context, order, 'cancelled')),
          ),
        for (final status in forward)
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: size),
            onPressed: () => run(status),
            child: Text(orderActionLabel(context, order, status)),
          ),
      ],
    );
  }
}

/// "2 × Shawarma, 1 × Lemonade".
String orderSummary(Order order) =>
    order.lines.map((l) => '${l.quantity} × ${l.name}').join(', ');
