import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../food/widgets/food_widgets.dart' show AmountRow;
import '../../market/screens/market_orders_screen.dart' show marketStatusText;
import '../data/vendor_providers.dart';
import 'vendor_pick_screen.dart' show pickAmountText;

/// The minutes a vendor may say an order takes.
const vendorPrepChoices = [10, 15, 20, 30, 45, 60, 90];

String vendorRejectionText(AppLocalizations l10n, VendorRejection r) =>
    switch (r) {
      VendorRejection.closing => l10n.rejectClosing,
      VendorRejection.tooBusy => l10n.rejectTooBusy,
      VendorRejection.itemsUnavailable => l10n.rejectItemUnavailable,
      VendorRejection.outsideArea => l10n.vendorRejectOutsideArea,
      VendorRejection.other => l10n.rejectOther,
    };

/// 115 An order as the vendor's staff work it: the items, the customer's
/// first name and notes, how it is paid and the cash to collect; accept
/// it with the minutes it needs or turn it down, pick a grocery order,
/// mark it ready, and hand it over (to the vendor's driver, delivered, or
/// to the customer with their code). With the app's couriers, the courier
/// takes it from there.
class VendorOrderScreen extends ConsumerStatefulWidget {
  const VendorOrderScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<VendorOrderScreen> createState() => _VendorOrderScreenState();
}

class _VendorOrderScreenState extends ConsumerState<VendorOrderScreen> {
  bool _busy = false;

  Future<void> _run(
    Future<VendorOrder> Function(YallappApi api) call,
    String done,
  ) async {
    setState(() => _busy = true);
    try {
      await call(ref.read(yallappApiProvider));
      if (!mounted) return;
      showMessage(context, done);
      reloadVendor(ref, widget.orderId);
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
                  for (final m in vendorPrepChoices)
                    OutlinedButton(
                      key: ValueKey('vendor-prep-$m'),
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
      (api) => api.acceptVendorOrder(widget.orderId, minutes),
      l10n.deskAccepted,
    );
  }

  Future<void> _reject() async {
    final l10n = context.l10n;
    final picked = await showDialog<({VendorRejection reason, String? note})>(
      context: context,
      builder: (_) => const _RejectDialog(),
    );
    if (picked == null || !mounted) return;
    await _run(
      (api) => api.rejectVendorOrder(
        widget.orderId,
        picked.reason,
        note: picked.note,
      ),
      l10n.deskRejected,
    );
  }

  Future<void> _handToCustomer() async {
    final l10n = context.l10n;
    final code = await showDialog<String>(
      context: context,
      builder: (_) => const _CodeDialog(),
    );
    if (code == null || !mounted) return;
    await _run(
      (api) => api.handOverVendorOrder(
        widget.orderId,
        VendorHandover.customer,
        pickupCode: code,
      ),
      l10n.vendorHandedOver,
    );
  }

  List<Widget> _actions(VendorOrder o, VendorDesk? desk) {
    final l10n = context.l10n;
    final working =
        o.status == MarketOrderStatus.accepted ||
        o.status == MarketOrderStatus.picking;
    if (desk != null && !desk.answers && !working) return const [];
    final ownDriver = desk?.deliveryBy == VendorDelivery.vendor;
    // 115.16 A grocery's or shop's order is picked line by line before
    // it is ready.
    final picks = desk != null && desk.kind != VendorKind.restaurant;
    final unpicked = picks && o.lines.any((l) => l.outcome == null);
    return switch (o.status) {
      MarketOrderStatus.placed => [
        PrimaryButton(
          key: const ValueKey('vendor-accept'),
          label: l10n.deskAccept,
          icon: Symbols.check,
          loading: _busy,
          onPressed: _accept,
        ),
        const SizedBox(height: 8),
        TextButton(
          key: const ValueKey('vendor-reject'),
          onPressed: _busy ? null : _reject,
          child: Text(l10n.deskReject),
        ),
      ],
      MarketOrderStatus.accepted || MarketOrderStatus.picking when unpicked => [
        PrimaryButton(
          key: const ValueKey('vendor-pick'),
          label: l10n.vendorPickItems,
          icon: Symbols.checklist,
          onPressed: _busy
              ? null
              : () => context.push(Paths.vendorPick(widget.orderId)),
        ),
      ],
      MarketOrderStatus.accepted || MarketOrderStatus.picking => [
        if (picks) ...[
          TextButton(
            key: const ValueKey('vendor-pick-again'),
            onPressed: _busy
                ? null
                : () => context.push(Paths.vendorPick(widget.orderId)),
            child: Text(l10n.vendorPickAgain),
          ),
          const SizedBox(height: 8),
        ],
        PrimaryButton(
          key: const ValueKey('vendor-ready'),
          label: l10n.deskMarkReady,
          icon: Symbols.done_all,
          loading: _busy,
          onPressed: () => _run(
            (api) => api.readyVendorOrder(widget.orderId),
            l10n.deskMarkedReady,
          ),
        ),
      ],
      MarketOrderStatus.ready when o.pickup => [
        PrimaryButton(
          key: const ValueKey('vendor-picked-up'),
          label: l10n.vendorHandToCustomer,
          icon: Symbols.storefront,
          loading: _busy,
          onPressed: _handToCustomer,
        ),
      ],
      MarketOrderStatus.ready when ownDriver => [
        PrimaryButton(
          key: const ValueKey('vendor-to-driver'),
          label: l10n.vendorHandToDriver,
          icon: Symbols.two_wheeler,
          loading: _busy,
          onPressed: () => _run(
            (api) =>
                api.handOverVendorOrder(widget.orderId, VendorHandover.driver),
            l10n.vendorHandedOver,
          ),
        ),
      ],
      MarketOrderStatus.onTheWay when ownDriver => [
        PrimaryButton(
          key: const ValueKey('vendor-delivered'),
          label: l10n.vendorMarkDelivered,
          icon: Symbols.where_to_vote,
          loading: _busy,
          onPressed: () => _run(
            (api) => api.handOverVendorOrder(
              widget.orderId,
              VendorHandover.delivered,
            ),
            l10n.vendorHandedOver,
          ),
        ),
      ],
      _ => const <Widget>[],
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(vendorOrderProvider(widget.orderId));
    final desk = ref.watch(vendorDeskProvider).value;
    final order = async.value;
    final actions = order == null ? const <Widget>[] : _actions(order, desk);
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(
          order == null
              ? l10n.tabVendor
              : l10n.foodOrderHeading(order.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final o?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(vendorOrderProvider(widget.orderId)),
          child: _OrderView(order: o),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(vendorOrderProvider(widget.orderId)),
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

  final VendorOrder order;

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
    String qty(MarketOrderLine l) => switch (l.unit) {
      ProductUnit.item => '${l.quantity.round()}×',
      ProductUnit.kg => '${l.quantity} kg',
      ProductUnit.g => '${l.quantity.round()} g',
      ProductUnit.l => '${l.quantity} l',
    };
    return ListView(
      key: const ValueKey('vendor-order-view'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          marketStatusText(l10n, o.status),
          key: const ValueKey('vendor-order-status'),
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        Text(
          [
            dayAndTime(o.createdAt),
            if (o.scheduledFor != null)
              l10n.vendorFor(dayAndTime(o.scheduledFor!)),
            if (o.readyAt != null) l10n.foodReadyAt(clockTime(o.readyAt!)),
            o.pickup ? l10n.marketPickup : l10n.marketDelivery,
          ].join(' · '),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.vendorItemsTitle, style: label()),
              const SizedBox(height: 6),
              for (final line in o.lines)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 64,
                        child: Text(
                          qty(line),
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: p.primary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.name, style: value()),
                            if (line.choices.isNotEmpty)
                              Text(
                                line.choices.join(' · '),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: p.textSecondary,
                                ),
                              ),
                            if (line.note != null)
                              Text(
                                line.note!,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: p.textSecondary,
                                ),
                              ),
                            // 115.16 How it was picked.
                            if (switch (line.outcome) {
                                  'picked' when line.pickedQuantity != null =>
                                    l10n.vendorLinePicked(
                                      pickAmountText(
                                        line.pickedQuantity!,
                                        line.unit,
                                      ),
                                    ),
                                  'substituted' => l10n.vendorLineSubstituted(
                                    line.substituteName ?? '',
                                  ),
                                  'missing' => l10n.vendorMissing,
                                  _ => null,
                                }
                                case final picked?)
                              Text(
                                picked,
                                key: ValueKey('vendor-line-${line.id}-picked'),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: line.outcome == 'missing'
                                      ? p.danger
                                      : p.success,
                                ),
                              ),
                          ],
                        ),
                      ),
                      Text(line.total.formatted, style: value()),
                    ],
                  ),
                ),
              const Divider(height: 16),
              AmountRow(
                label: l10n.foodSubtotal,
                value: o.subtotal.formatted,
                strong: true,
              ),
              if (o.collect case final cash?)
                Text(
                  l10n.vendorCollect(cash.formatted),
                  key: const ValueKey('vendor-collect'),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: p.accent,
                  ),
                ),
              const Divider(height: 24),
              Text(l10n.deskCustomer, style: label()),
              Text(o.customerName, style: value()),
              if (o.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.vendorCustomerNotes, style: label()),
                Text(o.notes!, style: value()),
              ],
            ],
          ),
        ),
        if (o.dropoff case final d?) ...[
          const SizedBox(height: 16),
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l10n.vendorDeliverTo, style: label()),
                Text(d.address, style: value()),
                if (d.details != null)
                  Text(d.details!, style: TextStyle(color: p.textSecondary)),
                if (d.notes != null)
                  Text(d.notes!, style: TextStyle(color: p.textSecondary)),
              ],
            ),
          ),
        ],
        if (o.courierName != null) ...[
          const SizedBox(height: 16),
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Symbols.two_wheeler, color: p.primary),
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
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text(
          l10n.vendorNoContact,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12.5, color: p.textSecondary),
        ),
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
  VendorRejection _reason = VendorRejection.tooBusy;

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
            RadioGroup<VendorRejection>(
              groupValue: _reason,
              onChanged: (v) => setState(() => _reason = v ?? _reason),
              child: Column(
                children: [
                  for (final r in VendorRejection.values)
                    RadioListTile<VendorRejection>(
                      key: ValueKey('vendor-reject-${r.name}'),
                      value: r,
                      contentPadding: EdgeInsets.zero,
                      title: Text(vendorRejectionText(l10n, r)),
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
          key: const ValueKey('vendor-reject-send'),
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

/// The customer's four-digit pick-up code.
class _CodeDialog extends StatefulWidget {
  const _CodeDialog();

  @override
  State<_CodeDialog> createState() => _CodeDialogState();
}

class _CodeDialogState extends State<_CodeDialog> {
  final _code = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.vendorPickupCodeTitle),
      content: TextField(
        key: const ValueKey('vendor-pickup-code'),
        controller: _code,
        autofocus: true,
        keyboardType: TextInputType.number,
        maxLength: 4,
        decoration: InputDecoration(labelText: l10n.vendorPickupCode),
        onChanged: (_) => setState(() {}),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          key: const ValueKey('vendor-pickup-send'),
          onPressed: RegExp(r'^\d{4}$').hasMatch(_code.text)
              ? () => Navigator.of(context).pop(_code.text)
              : null,
          child: Text(l10n.vendorHandToCustomer),
        ),
      ],
    );
  }
}
