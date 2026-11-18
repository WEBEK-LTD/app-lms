import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/bidi.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
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
    // 132.160 Opened again while it was kept (from a notification, or the
    // list's): asked again, shown as it was until the answer comes.
    Future.microtask(() {
      if (mounted && ref.exists(orderProvider(widget.orderId))) {
        ref.invalidate(orderProvider(widget.orderId));
      }
    });
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      final order = ref.read(orderProvider(widget.orderId)).value;
      // 80.4 A shipped order has no steps to follow here: its carrier's page has them.
      final done =
          order?.fulfilmentStatus == null ||
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
            // 110 Where it is, and when it was placed.
            Row(
              children: [
                Flexible(child: OrderStatusChip(order: order)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    shortDate(order.createdAt),
                    textAlign: TextAlign.end,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
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
            // 96.2 Waiting for a bank transfer or the shop's own method: how to pay.
            if (order.payOutside != null) ...[
              _PayOutsideCard(order: order, pay: order.payOutside!),
              const SizedBox(height: 12),
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
            // 132 Where a store order's delivery is: the new day, why, what's next.
            if (order.stage != null) ...[
              OrderStageCard(stage: order.stage!),
              const SizedBox(height: 12),
            ],
            // 80.4 How the shop shipped it: the carrier, and its tracking.
            if (order.shipment != null) ...[
              _ShipmentCard(shipment: order.shipment!),
              const SizedBox(height: 4),
            ],
            // 91.3 Its return: asked for here, and the shop's answer.
            if (order.returnRequest != null) ...[
              const SizedBox(height: 12),
              _ReturnCard(request: order.returnRequest!),
            ] else if (order.canReturn) ...[
              const SizedBox(height: 12),
              _ReturnButton(orderId: order.id),
            ],
            // 173 The delivery day and time (the shop's), who receives it
            // and where; the card's message and who sends it.
            if (order.delivery case final d? when d.hasDelivery) ...[
              const SizedBox(height: 12),
              OrderDeliveryCard(delivery: d),
            ],
            if (order.delivery case final d? when d.hasGift) ...[
              const SizedBox(height: 12),
              OrderGiftCard(delivery: d),
            ],
            const SizedBox(height: 24),
            SectionHeader(title: l10n.orderYourOrder),
            const SizedBox(height: 8),
            for (final line in order.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
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
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                        ],
                      ),
                    ),
                    // 110 What the line comes to.
                    if (line.total case final total?) ...[
                      const SizedBox(width: 12),
                      Text(
                        total,
                        style: TextStyle(fontSize: 15, color: p.text),
                      ),
                    ],
                  ],
                ),
              ),
            // 173 What the total is made of, so the lines add up to it.
            if (order.amounts case final a?)
              OrderAmountsList(amounts: a)
            else ...[
              if (f?.deliveryFee != null)
                _AmountRow(label: l10n.deliveryFee, value: f!.deliveryFee!),
              _AmountRow(
                label: l10n.orderTotal,
                value: order.total,
                strong: true,
              ),
            ],
            // 135.7 In the customer's currency, on the day it was placed.
            if (order.customerCurrency case final cc?)
              Text(
                cc.charged
                    ? l10n.orderPaidIn(cc.total)
                    : l10n.orderInYourCurrency(cc.total),
                key: const Key('order-customer-currency'),
                textAlign: TextAlign.end,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            // 91.4 The loyalty points used on it (173 a line of the
            // amounts when the order has them), and those it earned.
            if (order.points case final points?) ...[
              if (points.used > 0 && order.amounts == null)
                Text(
                  l10n.orderPointsUsed(points.used, points.discount ?? ''),
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              if (points.earned > 0)
                Text(
                  l10n.orderPointsEarned(points.earned),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: p.success,
                  ),
                ),
            ],
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
      // 130.21 Its premium look.
      screen: SystemScreen.lists,
      title: order == null ? l10n.myOrders : l10n.orderNumber(order.number),
      scrollable: false,
      child: body,
    );
  }
}

/// Where an order is, as a coloured label: its step for a restaurant's order
/// (unless refunded), else the shop's status.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final good = order.status == OrderStatus.completed;
    final bad = switch (order.status) {
      OrderStatus.cancelled ||
      OrderStatus.failed ||
      OrderStatus.refunded => true,
      _ => false,
    };
    // 26 A restaurant's order shows its step. 47 A refunded order says so,
    // whatever step it reached.
    final step = order.status == OrderStatus.refunded
        ? null
        : order.fulfilmentStatus;
    // 132 A store order on its way says where its delivery is. 132.160
    // Whatever its status while it is on its way (paid, on hold, shipped,
    // postponed), and before a WordPress shop's step (its stage says more:
    // "Delivery postponed" where the step says "Preparing").
    final stage = order.inProgress ? order.stage : null;
    final status = stage != null
        ? orderStageTitle(context, stage)
        : step != null
        ? OrderSteps.label(
            context,
            step,
            order.fulfilment?.type ?? FulfilmentType.pickup,
          )
        : order.statusLabel;
    return Container(
      key: const ValueKey('order-status'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: good
            ? p.successSoft
            : bad
            ? p.placeholderFor(0)
            : p.accentSoft,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: good ? p.success : p.text,
        ),
      ),
    );
  }
}

/// 132 A delivery stage in the app's words.
String orderStageTitle(BuildContext context, OrderStage s) {
  final l10n = context.l10n;
  return switch (s.code) {
    'preparing' => l10n.orderStagePreparing,
    'shipped' => l10n.orderStageShipped,
    'postponed' => l10n.orderStagePostponed,
    'failed' => l10n.orderStageFailed,
    'returned' => l10n.orderStageReturned,
    'delivered' => l10n.orderStageDelivered,
    _ => s.label,
  };
}

/// 132 A store order's delivery stage: out for delivery with the courier
/// to call and the shop's tracking link; postponed with the new day and
/// why; a failed attempt with why and what's next; back at the shop;
/// delivered. In the app's words, the shop's short reason as it wrote it.
class OrderStageCard extends ConsumerWidget {
  const OrderStageCard({super.key, required this.stage});

  final OrderStage stage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final s = stage;
    final day = [
      if (s.day != null) isoDayLabel(s.day!),
      if (s.slotLabel != null) '\u2068${s.slotLabel!}\u2069',
    ].join(', ');
    final title = orderStageTitle(context, s);
    final (icon, bad) = switch (s.code) {
      'preparing' => (AppIcons.bundle, false),
      'shipped' => (AppIcons.shipping, false),
      'postponed' => (AppIcons.calendar, true),
      'failed' => (AppIcons.error, true),
      'returned' => (AppIcons.returnOrder, true),
      _ => (AppIcons.checkCircle, false),
    };
    final lines = <String>[
      if (s.code == 'postponed' && day.isNotEmpty) l10n.orderStageNewDay(day),
      if (s.code == 'failed' && s.nextStep == 'retry' && day.isNotEmpty)
        l10n.orderStageTryAgain(day)
      else if (s.code == 'failed' && s.nextStepLabel != null)
        s.nextStepLabel!,
      if (s.reason != null) s.reason!,
      if (s.code == 'shipped' && s.courierName != null)
        l10n.orderStageCourier(s.courierName!),
    ];
    return Container(
      key: const ValueKey('order-stage'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bad ? p.accentSoft : p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(icon, color: p.text),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          for (final line in lines) ...[
            const SizedBox(height: 6),
            Text(line, style: TextStyle(fontSize: 14, color: p.textSecondary)),
          ],
          if (s.code == 'shipped' &&
              (s.courierPhone != null || s.trackingUrl != null)) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                if (s.courierPhone != null)
                  TextButton.icon(
                    onPressed: () => ref.read(openExternalProvider)(
                      'tel:${s.courierPhone!.replaceAll(RegExp(r'[^0-9+]'), '')}',
                    ),
                    icon: AppIcon(AppIcons.call, size: 18, color: p.link),
                    label: Text(l10n.orderStageCallCourier),
                    style: TextButton.styleFrom(foregroundColor: p.link),
                  ),
                if (s.trackingUrl != null)
                  TextButton.icon(
                    onPressed: () =>
                        ref.read(openExternalProvider)(s.trackingUrl!),
                    icon: AppIcon(AppIcons.openInNew, size: 18, color: p.link),
                    label: Text(l10n.orderStageFollow),
                    style: TextButton.styleFrom(foregroundColor: p.link),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// 80.4 The carrier, the tracking number (to copy), the tracking link and
/// the waybill, as the shop gave them.
class _PayOutsideCard extends StatelessWidget {
  const _PayOutsideCard({required this.order, required this.pay});

  final Order order;
  final PayOutside pay;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.payOutside, color: p.text),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  pay.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            l10n.payOutsideDue(order.total, shortDate(pay.dueAt), order.number),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
          const SizedBox(height: 10),
          SelectableText(
            pay.instructions,
            style: TextStyle(fontSize: 15, color: p.text),
          ),
        ],
      ),
    );
  }
}

class _ShipmentCard extends ConsumerWidget {
  const _ShipmentCard({required this.shipment});

  final OrderShipment shipment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final number = shipment.trackingNumber;
    final waybillUrl = shipment.waybillUrl;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.shipping, color: p.text),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  shipment.carrier ?? l10n.shipmentTitle,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            l10n.shippedOnDate(shortDate(shipment.shippedAt)),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          if (number != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: SelectableText(
                    l10n.trackingNumberLine(number),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: l10n.copyTrackingNumber,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: number));
                    if (context.mounted) {
                      showMessage(context, l10n.trackingNumberCopied);
                    }
                  },
                  icon: AppIcon(AppIcons.copy, size: 20, color: p.link),
                ),
              ],
            ),
          ],
          if (shipment.waybill != null && waybillUrl == null) ...[
            const SizedBox(height: 6),
            SelectableText(
              l10n.waybillLine(shipment.waybill!),
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          ],
          if (shipment.trackingUrl != null || waybillUrl != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                if (shipment.trackingUrl != null)
                  TextButton.icon(
                    onPressed: () =>
                        ref.read(openExternalProvider)(shipment.trackingUrl!),
                    icon: AppIcon(AppIcons.openInNew, size: 18, color: p.link),
                    label: Text(l10n.trackShipment),
                    style: TextButton.styleFrom(foregroundColor: p.link),
                  ),
                if (waybillUrl != null)
                  TextButton.icon(
                    onPressed: () => ref.read(openExternalProvider)(waybillUrl),
                    icon: AppIcon(AppIcons.openInNew, size: 18, color: p.link),
                    label: Text(l10n.openWaybill),
                    style: TextButton.styleFrom(foregroundColor: p.link),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// 91.3 A return's reason, as the customer chose it.
String returnReasonLabel(BuildContext context, ReturnReason reason) {
  final l10n = context.l10n;
  return switch (reason) {
    ReturnReason.damaged => l10n.returnReasonDamaged,
    ReturnReason.wrongItem => l10n.returnReasonWrongItem,
    ReturnReason.notAsDescribed => l10n.returnReasonNotAsDescribed,
    ReturnReason.noLongerNeeded => l10n.returnReasonNoLongerNeeded,
    ReturnReason.other => l10n.returnReasonOther,
  };
}

/// 91.3 Asks the shop to take the order back: a reason and a note, then the
/// order comes back with the request on it.
class _ReturnButton extends ConsumerStatefulWidget {
  const _ReturnButton({required this.orderId});

  final int orderId;

  @override
  ConsumerState<_ReturnButton> createState() => _ReturnButtonState();
}

class _ReturnButtonState extends ConsumerState<_ReturnButton> {
  bool _sending = false;

  Future<void> _ask() async {
    final l10n = context.l10n;
    final picked =
        await showModalBottomSheet<({ReturnReason reason, String note})>(
          context: context,
          showDragHandle: true,
          isScrollControlled: true,
          builder: (context) => const _ReturnSheet(),
        );
    if (picked == null || !mounted) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .requestReturn(
            widget.orderId,
            reason: picked.reason,
            note: picked.note,
          );
      ref.invalidate(orderProvider(widget.orderId));
      if (mounted) showMessage(context, l10n.returnRequested);
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: TextButton.icon(
        key: const Key('order-return'),
        onPressed: _sending ? null : _ask,
        icon: AppIcon(AppIcons.returnOrder, size: 18, color: p.link),
        label: Text(context.l10n.requestReturn),
        style: TextButton.styleFrom(foregroundColor: p.link),
      ),
    );
  }
}

/// 91.3 Why the customer returns it; a note, needed with "Another reason".
class _ReturnSheet extends StatefulWidget {
  const _ReturnSheet();

  @override
  State<_ReturnSheet> createState() => _ReturnSheetState();
}

class _ReturnSheetState extends State<_ReturnSheet> {
  ReturnReason? _reason;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    _note.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final reason = _reason;
    final ready =
        reason != null &&
        (reason != ReturnReason.other || _note.text.trim().isNotEmpty);
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.returnReasonTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 4),
              for (final r in ReturnReason.values)
                ListTile(
                  key: Key('return-reason-${r.name}'),
                  contentPadding: EdgeInsets.zero,
                  leading: AppIcon(
                    r == reason
                        ? AppIcons.radioChecked
                        : AppIcons.radioUnchecked,
                    color: r == reason ? p.link : p.textSecondary,
                  ),
                  title: Text(returnReasonLabel(context, r)),
                  selected: r == reason,
                  onTap: () => setState(() => _reason = r),
                ),
              const SizedBox(height: 8),
              TextField(
                key: const Key('return-note'),
                controller: _note,
                maxLength: 500,
                minLines: 2,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: reason == ReturnReason.other
                      ? l10n.returnNoteRequired
                      : l10n.returnNote,
                ),
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                key: const Key('return-send'),
                label: l10n.sendReturnRequest,
                onPressed: ready
                    ? () =>
                          Navigator.of(context)
                              .pop((reason: reason, note: _note.text.trim()))
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 91.3 The return asked for, and the shop's answer with its reply.
class _ReturnCard extends StatelessWidget {
  const _ReturnCard({required this.request});

  final ReturnRequest request;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (status, color) = switch (request.status) {
      ReturnStatus.requested => (l10n.returnStatusRequested, p.textSecondary),
      ReturnStatus.approved => (l10n.returnStatusApproved, p.success),
      ReturnStatus.declined => (l10n.returnStatusDeclined, p.danger),
    };
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.returnOrder, color: p.text),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            returnReasonLabel(context, request.reason),
            style: TextStyle(fontSize: 14, color: p.text),
          ),
          if (request.note != null)
            Text(
              request.note!,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          if (request.reply != null) ...[
            const SizedBox(height: 8),
            Text(
              l10n.returnShopReply(request.reply!),
              style: TextStyle(fontSize: 14, color: p.text),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            shortDate(request.decidedAt ?? request.requestedAt),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    super.key,
    required this.label,
    required this.value,
    this.strong = false,
    this.muted = false,
  });

  final String label;
  final String value;
  final bool strong;

  /// 173 A line only said (a tax inside the prices).
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final style = TextStyle(
      fontSize: strong ? 16 : (muted ? 13 : 14),
      fontWeight: strong ? FontWeight.w800 : FontWeight.w400,
      color: muted ? p.textSecondary : p.text,
    );
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: style)),
          const SizedBox(width: 12),
          Text(value, style: style),
        ],
      ),
    );
  }
}

/// 173 The order's delivery: the day and the time chosen (both the shop's,
/// as the checkout offered them), who receives it, and the address.
class OrderDeliveryCard extends StatelessWidget {
  const OrderDeliveryCard({super.key, required this.delivery});

  final OrderDelivery delivery;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final d = delivery;
    // One run in its own direction, so the commas stay in place in Arabic.
    final street = [
      d.recipientAddress,
      d.recipientCity,
    ].whereType<String>().join(', ');
    final address = isolate(street);
    return AppCard(
      key: const ValueKey('order-delivery'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardTitle(icon: AppIcons.shipping, title: l10n.orderDeliveryTitle),
          if (d.date != null)
            _DetailLine(
              key: const ValueKey('order-delivery-day'),
              icon: AppIcons.calendar,
              text: isoDayLabel(d.date!),
            ),
          if (d.slotLabel != null)
            _DetailLine(
              key: const ValueKey('order-delivery-slot'),
              icon: AppIcons.schedule,
              text: l10n.orderDeliverySlot(ltrRun(d.slotLabel!)),
            ),
          if (d.recipientName != null)
            _DetailLine(
              key: const ValueKey('order-delivery-recipient'),
              icon: AppIcons.account,
              label: l10n.orderRecipientTitle,
              text: isolate(d.recipientName!),
              detail: d.recipientPhone == null
                  ? null
                  : ltrRun(d.recipientPhone!),
            ),
          if (street.isNotEmpty)
            _DetailLine(
              key: const ValueKey('order-delivery-address'),
              icon: AppIcons.location,
              label: l10n.orderAddressTitle,
              text: address,
            ),
        ],
      ),
    );
  }
}

/// 173 The gift card: its message, and who sends it (or that it goes
/// without a name). Only for an order with a card.
class OrderGiftCard extends StatelessWidget {
  const OrderGiftCard({super.key, required this.delivery});

  final OrderDelivery delivery;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final d = delivery;
    final from = d.anonymous
        ? l10n.orderGiftAnonymous
        : d.senderName == null
        ? null
        : l10n.orderGiftFrom(isolate(d.senderName!));
    return AppCard(
      key: const ValueKey('order-gift'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardTitle(icon: AppIcons.gift, title: l10n.orderGiftTitle),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: p.accentSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            // The card in the direction it was written in.
            child: Text(
              d.message!,
              key: const ValueKey('order-gift-message'),
              textDirection: directionOfText(d.message!),
              style: TextStyle(fontSize: 15, height: 1.45, color: p.text),
            ),
          ),
          if (from != null) ...[
            const SizedBox(height: 8),
            Text(
              from,
              key: const ValueKey('order-gift-from'),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 173 A card's heading: its icon and title, as the order's other cards.
class _CardTitle extends StatelessWidget {
  const _CardTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        AppIcon(icon, color: p.text),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
        ),
      ],
    );
  }
}

/// 173 One detail of the delivery: its icon, what it is, and the detail.
class _DetailLine extends StatelessWidget {
  const _DetailLine({
    super.key,
    required this.icon,
    required this.text,
    this.label,
    this.detail,
  });

  final IconData icon;
  final String text;
  final String? label;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(icon, size: 20, color: p.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (label != null)
                  Text(
                    label!,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                if (detail != null)
                  Text(
                    detail!,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 173 The order's totals, as the payment page and the receipt show them:
/// the subtotal, the coupon (with its code) and the points taken off, the
/// delivery (and where it was priced for), the delivery time's fee, the
/// other fees, an added tax, then the total; a tax inside the prices is
/// said under it.
class OrderAmountsList extends StatelessWidget {
  const OrderAmountsList({super.key, required this.amounts});

  final OrderAmounts amounts;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final a = amounts;
    String minus(String amount) => ltrRun('\u2212$amount');
    return Column(
      key: const ValueKey('order-amounts'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 4),
        Divider(height: 16, color: p.border),
        _AmountRow(
          key: const ValueKey('order-amount-subtotal'),
          label: l10n.subtotal,
          value: a.subtotal,
        ),
        if (a.discount != null)
          _AmountRow(
            key: const ValueKey('order-amount-discount'),
            label: a.discountCode == null
                ? l10n.orderDiscountLine
                : l10n.orderCouponLine(ltrRun(a.discountCode!)),
            value: minus(a.discount!),
          ),
        if (a.points != null)
          _AmountRow(
            key: const ValueKey('order-amount-points'),
            label: l10n.orderPointsLine(a.pointsUsed),
            value: minus(a.points!),
          ),
        if (a.shipping != null)
          _AmountRow(
            key: const ValueKey('order-amount-shipping'),
            label: a.shippingZone == null
                ? l10n.deliveryFee
                : l10n.orderShippingTo(isolate(a.shippingZone!)),
            value: a.shipping!,
          ),
        if (a.slotFee != null)
          _AmountRow(
            key: const ValueKey('order-amount-slot'),
            label: l10n.orderSlotFee,
            value: a.slotFee!,
          ),
        for (final fee in a.fees)
          _AmountRow(label: isolate(fee.label), value: fee.amount),
        if (a.tax != null && !a.taxIncluded)
          _AmountRow(
            key: const ValueKey('order-amount-tax'),
            label: isolate(a.taxLabel ?? ''),
            value: a.tax!,
          ),
        Divider(height: 20, color: p.border),
        _AmountRow(
          key: const ValueKey('order-amount-total'),
          label: l10n.orderTotal,
          value: a.total,
          strong: true,
        ),
        if (a.tax != null && a.taxIncluded)
          _AmountRow(
            label: l10n.orderTaxIncluded(isolate(a.taxLabel ?? '')),
            value: a.tax!,
            muted: true,
          ),
      ],
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
