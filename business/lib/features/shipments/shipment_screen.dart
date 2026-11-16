import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/contact.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../studio/studio_widgets.dart';
import 'shipments_screen.dart';

final shipmentProvider = FutureProvider.autoDispose
    .family<ShipmentDetail, String>(
      (ref, id) =>
          ref.watch(apiProvider).shipment(ref.watch(appIdProvider), id),
    );

/// The words for moving a shipment to [status].
String shipmentStep(BuildContext context, String status) {
  final l10n = context.l10n;
  return switch (status) {
    'picked_up' => l10n.shipPickedUp,
    'delivered' => l10n.shipDelivered,
    'failed' => l10n.shipFailed,
    'cancelled' => l10n.shipCancel,
    _ => status,
  };
}

/// 132 "Small", "Medium", "Large".
String packageSizeLabel(BuildContext context, String size) {
  final l10n = context.l10n;
  return switch (size) {
    'small' => l10n.packageSmall,
    'medium' => l10n.packageMedium,
    'large' => l10n.packageLarge,
    _ => size,
  };
}

/// 125 A shipment: where from and to, the money, the courier, its history;
/// give it to a courier or move it on.
class ShipmentScreen extends ConsumerStatefulWidget {
  const ShipmentScreen({super.key, required this.shipmentId});

  final String shipmentId;

  @override
  ConsumerState<ShipmentScreen> createState() => _ShipmentScreenState();
}

class _ShipmentScreenState extends ConsumerState<ShipmentScreen> {
  bool _busy = false;

  Future<void> _give(Shipment s) async {
    setState(() => _busy = true);
    final after = await giveToCourier(context, ref, s);
    if (!mounted) return;
    setState(() => _busy = false);
    if (after != null) ref.invalidate(shipmentProvider(widget.shipmentId));
  }

  Future<void> _move(Shipment s, String status) async {
    final l10n = context.l10n;
    if (status == 'cancelled' || status == 'failed') {
      final ok = await confirm(
        context,
        title: '${s.reference}: ${shipmentStep(context, status)}',
        action: shipmentStep(context, status),
        destructive: true,
      );
      if (!ok || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      final after = await ref
          .read(apiProvider)
          .moveShipment(ref.read(appIdProvider), s.id, status);
      if (!mounted) return;
      showMessage(
        context,
        l10n.shipMoved(s.reference, after.shipment.statusLabel),
      );
      ref.invalidate(shipmentProvider(widget.shipmentId));
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = ref.watch(shipmentProvider(widget.shipmentId));
    final s = value.value?.shipment;
    Widget? foot;
    if (s != null && (s.assignable || s.statuses.isNotEmpty)) {
      final steps = [
        for (final st in s.statuses)
          if (st != 'cancelled') st,
      ];
      foot = FootPanel(
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: WrapAlignment.center,
          children: [
            if (s.statuses.contains('cancelled'))
              BigButton(
                label: l10n.shipCancel,
                danger: true,
                onPressed: _busy ? null : () => _move(s, 'cancelled'),
              ),
            for (final st in steps)
              BigButton(
                label: shipmentStep(context, st),
                filled: !s.assignable,
                danger: st == 'failed',
                onPressed: _busy ? null : () => _move(s, st),
              ),
            if (s.assignable)
              BigButton(
                label: s.courier == null
                    ? l10n.giveCourier
                    : l10n.giveAnotherCourier,
                busy: _busy,
                onPressed: () => _give(s),
              ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(s?.reference ?? ''),
        actions: [
          if (s != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 16),
              child: Center(
                child: Tag(
                  s.needsCourier ? l10n.needsCourier : s.statusLabel,
                  tone: shipmentTone(s),
                  big: true,
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: foot,
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(shipmentProvider(widget.shipmentId)),
        builder: (d) => RefreshIndicator(
          onRefresh: () =>
              ref.refresh(shipmentProvider(widget.shipmentId).future),
          child: _ShipmentBody(detail: d),
        ),
      ),
    );
  }
}

class _ShipmentBody extends ConsumerWidget {
  const _ShipmentBody({required this.detail});

  final ShipmentDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final s = detail.shipment;
    Widget row(String label, String value, {bool strong = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: TextStyle(fontSize: 14, color: c.ink2)),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // 132 Each end: the person with Call and WhatsApp, the place with the map and Copy.
        SectionTitle(l10n.pickupLabel),
        Box(
          radius: 18,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PersonCard(
                name: detail.senderName ?? s.pickup.name,
                label: l10n.senderLabel,
                phone: detail.senderPhone,
                icon: AppIcons.origin,
              ),
              Divider(height: 28, color: c.line),
              PlaceCard(
                address: s.pickup.full,
                lat: s.pickup.lat,
                lng: s.pickup.lng,
              ),
            ],
          ),
        ),
        SectionTitle(l10n.dropoffLabel),
        Box(
          radius: 18,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PersonCard(
                name: detail.recipientName,
                label: l10n.recipientLabel,
                phone: detail.recipientPhone,
              ),
              Divider(height: 28, color: c.line),
              PlaceCard(
                address: s.dropoff.full,
                lat: s.dropoff.lat,
                lng: s.dropoff.lng,
                detail: s.distanceKm == null
                    ? null
                    : km(context, s.distanceKm!),
              ),
            ],
          ),
        ),
        if (detail.packageSize != null ||
            detail.packageDescription != null ||
            detail.service != null) ...[
          const SizedBox(height: 12),
          Box(
            radius: 18,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.package, color: c.accentText),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.packageLabel,
                        style: TextStyle(fontSize: 12, color: c.ink2),
                      ),
                      Text(
                        [
                          if (detail.packageSize != null)
                            packageSizeLabel(context, detail.packageSize!),
                          ?detail.packageDescription,
                        ].join(' · '),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (detail.service != null)
                        Text(
                          l10n.serviceLabel(isolate(detail.service!)),
                          style: TextStyle(fontSize: 13, color: c.ink2),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Box(
          radius: 18,
          child: Column(
            children: [
              row(l10n.priceLabel, s.price.formatted, strong: true),
              row(l10n.paymentLabel, s.paymentLabel),
              if (s.collect != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    children: [
                      Icon(AppIcons.sales, size: 18, color: c.warning),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          l10n.shipCollect(isolate(s.collect!.formatted)),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: c.warning,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        if (s.foodOrder != null) ...[
          const SizedBox(height: 12),
          Box(
            radius: 18,
            onTap: () => context.push(Paths.foodOrder(s.foodOrder!.id)),
            child: Row(
              children: [
                Icon(AppIcons.orders, color: c.accentText),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l10n.shipFoodOrder(s.foodOrder!.reference),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const DirectionalIcon(AppIcons.forward),
              ],
            ),
          ),
        ],
        if (s.courier != null) ...[
          const SizedBox(height: 12),
          Box(
            radius: 18,
            child: Row(
              children: [
                Initials(initialsOf(s.courier!.name)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.courierLabel,
                        style: TextStyle(fontSize: 12, color: c.ink2),
                      ),
                      Text(
                        s.courier!.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        if (detail.note != null) ...[
          const SizedBox(height: 12),
          Box(
            radius: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.noteLabel,
                  style: TextStyle(fontSize: 12, color: c.ink2),
                ),
                Text(detail.note!),
              ],
            ),
          ),
        ],
        if (detail.timeline.isNotEmpty) ...[
          SectionTitle(l10n.historyTitle),
          TimelineList(entries: detail.timeline),
        ],
      ],
    );
  }
}
