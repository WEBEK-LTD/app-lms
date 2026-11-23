import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
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
    // 96.2 Waiting for a bank transfer or the owner's own method.
    'processing' => l10n.markPaid,
    'cancelled' =>
      isNew && order.status != 'pending' ? l10n.decline : l10n.cancelOrder,
    _ => status,
  };
}

/// The order's status, or its kitchen step for a restaurant. 63 Always in
/// the app's language for the steps it knows; the API's label (already in
/// the person's language) only for one it doesn't.
String orderStatusLabel(BuildContext context, Order order) {
  final l10n = context.l10n;
  final kitchen = order.kitchen;
  if (kitchen != null && order.status == 'processing') {
    return switch (kitchen.step) {
      'received' => l10n.stepNew,
      'preparing' => l10n.stepPreparing,
      'ready' => l10n.stepReady,
      'out_for_delivery' => l10n.outForDelivery,
      _ => kitchen.stepLabel ?? kitchen.step,
    };
  }
  return switch (order.status) {
    'processing' => l10n.statusProcessing,
    'completed' => l10n.statusCompleted,
    'cancelled' => l10n.statusCancelled,
    'refunded' => l10n.statusRefunded,
    'pending' => l10n.stAwaitingPayment,
    _ => order.statusLabel ?? order.status,
  };
}

String orderTone(Order order) =>
    order.kitchen != null && order.status == 'processing'
    ? order.kitchen!.step
    : order.status;

/// Moves the order on (asking first before cancelling); null when it
/// didn't change. 175 Cancelling a paid order asks the owner, every time,
/// to cancel and refund it or to cancel without a refund.
Future<Order?> changeOrderStatus(
  BuildContext context,
  WidgetRef ref,
  Order order,
  String status,
) async {
  final l10n = context.l10n;
  bool? refund;
  if (status == 'cancelled') {
    final amount = order.cancelRefund;
    if (amount != null) {
      refund = await askCancelRefund(context, order, amount);
      if (refund == null) return null;
    } else {
      final ok = await confirm(
        context,
        title: l10n.cancelOrderTitle(order.label),
        text: l10n.cancelOrderText,
        action: orderActionLabel(context, order, status),
        destructive: true,
      );
      if (!ok) return null;
    }
  }
  try {
    final updated = await ref
        .read(apiProvider)
        .changeOrderStatus(
          ref.read(appIdProvider),
          order.id,
          status,
          refund: refund,
        );
    if (context.mounted) {
      showMessage(
        context,
        l10n.orderUpdated(order.label, orderStatusLabel(context, updated)),
      );
    }
    return updated;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// 175 Cancel order on a paid order: "Cancel and refund {amount}" (true),
/// "Cancel without refund" (false), or keep the order (null). Each choice
/// says what happens: refunded now through the order's payment gateway,
/// or, when it can't go back by itself, the order needs the owner's refund.
Future<bool?> askCancelRefund(BuildContext context, Order order, Money amount) {
  final l10n = context.l10n;
  final byApi = order.refund?.byApi;
  final refundHint = switch (byApi) {
    true => l10n.cancelRefundNow,
    false => l10n.cancelRefundYourself,
    null => l10n.cancelRefundEither,
  };
  return showDialog<bool>(
    context: context,
    builder: (context) {
      final hint = TextStyle(color: context.yb.muted, fontSize: 13);
      return AlertDialog(
        title: Text(l10n.cancelOrderTitle(order.label)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.cancelPaidText),
              const SizedBox(height: 16),
              FilledButton.icon(
                key: const ValueKey('cancel-refund'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(64, 48),
                  backgroundColor: context.yb.danger,
                  foregroundColor: context.yb.onDanger,
                ),
                icon: const Icon(AppIcons.refund),
                onPressed: () => Navigator.pop(context, true),
                label: Text(l10n.cancelAndRefund(amount.formatted)),
              ),
              const SizedBox(height: 6),
              Text(refundHint, style: hint),
              const SizedBox(height: 14),
              OutlinedButton(
                key: const ValueKey('cancel-no-refund'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(64, 48),
                ),
                onPressed: () => Navigator.pop(context, false),
                child: Text(l10n.cancelWithoutRefund),
              ),
              const SizedBox(height: 6),
              Text(l10n.cancelWithoutRefundHint, style: hint),
            ],
          ),
        ),
        actions: [
          TextButton(
            key: const ValueKey('cancel-keep'),
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.keepOrder),
          ),
        ],
      );
    },
  );
}

/// The next-status buttons: the step forward filled, cancelling outlined.
/// 206 One tap at a time: the buttons wait while a change is sent.
class OrderActions extends ConsumerStatefulWidget {
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
  ConsumerState<OrderActions> createState() => _OrderActionsState();
}

class _OrderActionsState extends ConsumerState<OrderActions> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final large = widget.large;
    final next = order.nextStatuses;
    if (next.isEmpty) return const SizedBox.shrink();
    final forward = next.where((s) => s != 'cancelled').toList();
    final cancel = next.contains('cancelled');
    final size = large ? const Size(64, 64) : const Size(64, 48);

    Future<void> run(String status) async {
      if (_busy) return;
      setState(() => _busy = true);
      try {
        final updated = await changeOrderStatus(context, ref, order, status);
        if (updated != null) widget.onChanged(updated);
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    }

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        if (cancel)
          OutlinedButton(
            style: OutlinedButton.styleFrom(minimumSize: size),
            onPressed: _busy ? null : () => run('cancelled'),
            child: Text(orderActionLabel(context, order, 'cancelled')),
          ),
        for (final status in forward)
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: size),
            onPressed: _busy ? null : () => run(status),
            child: Text(orderActionLabel(context, order, status)),
          ),
      ],
    );
  }
}

/// "2 × Shawarma, 1 × Lemonade", each item kept whole in either direction;
/// 132 with the Arabic comma in Arabic.
String orderSummary(BuildContext context, Order order) => order.lines
    .map((l) => isolate('${l.quantity} × ${l.name}'))
    .join(context.lang == 'ar' ? '، ' : ', ');
