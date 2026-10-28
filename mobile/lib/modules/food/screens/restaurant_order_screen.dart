import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/widgets/delivery_widgets.dart' show CallButton;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// The minutes a restaurant may say an order takes.
const prepChoices = [10, 15, 20, 30, 45, 60];

/// 105.1 An order as the restaurant's staff work it: the dishes, the
/// customer's first name and notes, how it is paid; accept it with the
/// minutes it needs or turn it down with a reason, then mark it ready for
/// the courier.
class RestaurantOrderScreen extends ConsumerStatefulWidget {
  const RestaurantOrderScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<RestaurantOrderScreen> createState() =>
      _RestaurantOrderScreenState();
}

class _RestaurantOrderScreenState extends ConsumerState<RestaurantOrderScreen> {
  bool _busy = false;

  void _reload() => ref
    ..invalidate(restaurantOrderProvider(widget.orderId))
    ..invalidate(newRestaurantOrdersProvider)
    ..invalidate(activeRestaurantOrdersProvider)
    ..invalidate(doneRestaurantOrdersProvider)
    ..invalidate(restaurantDeskProvider);

  Future<void> _run(
    Future<RestaurantOrder> Function(YallappApi api) call,
    String done,
  ) async {
    setState(() => _busy = true);
    try {
      await call(ref.read(yallappApiProvider));
      if (!mounted) return;
      showMessage(context, done);
      _reload();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _accept() async {
    final l10n = context.l10n;
    final minutes = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      backgroundColor: context.palette.surface,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.deskAcceptTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.palette.text,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final m in prepChoices)
                    OutlinedButton(
                      key: ValueKey('prep-$m'),
                      onPressed: () => Navigator.of(context).pop(m),
                      child: Text(l10n.restaurantMinutes(m)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (minutes == null || !mounted) return;
    await _run(
      (api) => api.acceptRestaurantOrder(widget.orderId, minutes),
      l10n.deskAccepted,
    );
  }

  Future<void> _reject() async {
    final l10n = context.l10n;
    final picked = await showDialog<({FoodRejection reason, String? note})>(
      context: context,
      builder: (_) => const _RejectDialog(),
    );
    if (picked == null || !mounted) return;
    await _run(
      (api) => api.rejectRestaurantOrder(
        widget.orderId,
        picked.reason,
        note: picked.note,
      ),
      l10n.deskRejected,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(restaurantOrderProvider(widget.orderId));
    final order = async.value;
    final actions = switch (order?.status) {
      FoodOrderStatus.placed => [
        PrimaryButton(
          key: const ValueKey('desk-accept'),
          label: l10n.deskAccept,
          icon: AppIcons.check,
          loading: _busy,
          onPressed: _accept,
        ),
        const SizedBox(height: 8),
        TextButton(
          key: const ValueKey('desk-reject'),
          onPressed: _busy ? null : _reject,
          child: Text(l10n.deskReject),
        ),
      ],
      FoodOrderStatus.accepted => [
        PrimaryButton(
          key: const ValueKey('desk-ready'),
          label: l10n.deskMarkReady,
          icon: AppIcons.courier,
          loading: _busy,
          onPressed: () => _run(
            (api) => api.readyRestaurantOrder(widget.orderId),
            l10n.deskMarkedReady,
          ),
        ),
      ],
      _ => const <Widget>[],
    };
    return Scaffold(
      appBar: AppBar(
        title: Text(
          order == null
              ? l10n.tabRestaurantDesk
              : l10n.foodOrderHeading(order.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final o?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(restaurantOrderProvider(widget.orderId)),
          child: _OrderView(order: o),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () =>
              ref.invalidate(restaurantOrderProvider(widget.orderId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: actions.isEmpty
          ? null
          : BottomActionBar(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: actions,
              ),
            ),
    );
  }
}

class _OrderView extends StatelessWidget {
  const _OrderView({required this.order});

  final RestaurantOrder order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final o = order;
    TextStyle label() => TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    TextStyle value() => TextStyle(fontSize: 15, color: p.text);
    return ListView(
      key: const ValueKey('restaurant-order-view'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          foodStatusLabel(l10n, o.status),
          key: const ValueKey('restaurant-order-status'),
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        Text(
          [
            dayAndTime(o.createdAt),
            if (o.readyAt != null && o.status == FoodOrderStatus.accepted)
              l10n.foodReadyAt(clockTime(o.readyAt!)),
          ].join(' · '),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.foodDishes, style: label()),
              const SizedBox(height: 6),
              for (final line in o.lines) FoodLineRow(line: line),
              const Divider(height: 16),
              AmountRow(
                label: l10n.foodSubtotal,
                value: o.subtotalFormatted,
                strong: true,
              ),
              Text(
                [
                  o.payment == PaymentMethod.cash ? l10n.payCash : l10n.payCard,
                  o.paid ? l10n.paymentPaid : l10n.paymentUnpaid,
                ].join(' · '),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const Divider(height: 24),
              Text(l10n.deskCustomer, style: label()),
              Text(o.customerName, style: value()),
              if (o.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.sendNotes, style: label()),
                Text(o.notes!, style: value()),
              ],
            ],
          ),
        ),
        if (o.courierName != null) ...[
          const SizedBox(height: 16),
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                AppIcon(AppIcons.courier, size: 26, color: p.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.shipmentCourier, style: label()),
                      Text(
                        o.courierName!,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
                if (o.courierPhone != null)
                  CallButton(phone: o.courierPhone!, label: l10n.callCourier),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          l10n.shipmentStages,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        const SizedBox(height: 10),
        FoodStagesTimeline(stages: o.timeline),
      ],
    );
  }
}

class _RejectDialog extends StatefulWidget {
  const _RejectDialog();

  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final _note = TextEditingController();
  FoodRejection _reason = FoodRejection.tooBusy;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.deskRejectTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioGroup<FoodRejection>(
              groupValue: _reason,
              onChanged: (v) => setState(() => _reason = v ?? _reason),
              child: Column(
                children: [
                  for (final r in FoodRejection.values)
                    RadioListTile<FoodRejection>(
                      key: ValueKey('reject-${r.name}'),
                      value: r,
                      contentPadding: EdgeInsets.zero,
                      title: Text(rejectionLabel(l10n, r)),
                    ),
                ],
              ),
            ),
            TextField(
              controller: _note,
              maxLength: 300,
              decoration: InputDecoration(
                labelText: l10n.deskRejectNote,
                counterText: '',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          key: const ValueKey('reject-send'),
          onPressed: () => Navigator.of(context).pop((
            reason: _reason,
            note: _note.text.trim().isEmpty ? null : _note.text.trim(),
          )),
          child: Text(l10n.deskReject),
        ),
      ],
    );
  }
}
