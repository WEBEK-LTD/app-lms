import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/delivery_providers.dart';
import '../widgets/delivery_map.dart';
import '../widgets/delivery_widgets.dart';
import '../../../core/format/bidi.dart';

/// How often an active shipment is asked about while its screen is open.
const followEvery = Duration(seconds: 15);

/// 104 Following a shipment: its stage and stages, its courier, where the
/// courier is (live tracking), the places, the parcel and the payment;
/// paying or cancelling while it waits.
class ShipmentScreen extends ConsumerStatefulWidget {
  const ShipmentScreen({super.key, required this.shipmentId});

  final int shipmentId;

  @override
  ConsumerState<ShipmentScreen> createState() => _ShipmentScreenState();
}

class _ShipmentScreenState extends ConsumerState<ShipmentScreen> {
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(followEvery, (_) {
      final current = ref.read(shipmentProvider(widget.shipmentId)).value;
      if (current == null || current.status.active) {
        ref.invalidate(shipmentProvider(widget.shipmentId));
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _pay() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final url = await ref
          .read(yallappApiProvider)
          .payMyShipment(widget.shipmentId);
      if (!mounted) return;
      final paid = await context.push<bool>(
        Paths.web,
        extra: WebPageArgs(
          url: url,
          title: l10n.checkout,
          completesOn: isOrderReceived,
        ),
      );
      if (!mounted) return;
      if (paid == true) showMessage(context, l10n.sendPaid);
      ref
        ..invalidate(shipmentProvider(widget.shipmentId))
        ..invalidate(myShipmentsProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel() async {
    final l10n = context.l10n;
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.cancelShipmentConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.keepIt),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.cancelShipmentYes),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).cancelMyShipment(widget.shipmentId);
      if (!mounted) return;
      showMessage(context, l10n.shipmentCancelledToast);
      ref
        ..invalidate(shipmentProvider(widget.shipmentId))
        ..invalidate(myShipmentsProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(shipmentProvider(widget.shipmentId));
    final shipment = async.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          shipment == null
              ? l10n.tabShipments
              : l10n.shipmentHeading(shipment.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final s?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(shipmentProvider(widget.shipmentId)),
          child: _ShipmentView(shipment: s),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(shipmentProvider(widget.shipmentId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: shipment == null || !(shipment.status.cancellable)
          ? null
          : BottomActionBar(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (shipment.status == ShipmentStatus.awaitingPayment) ...[
                    PrimaryButton(
                      key: const ValueKey('shipment-pay'),
                      label: l10n.payNow,
                      icon: AppIcons.card,
                      loading: _busy,
                      onPressed: _pay,
                    ),
                    const SizedBox(height: 8),
                  ],
                  TextButton(
                    key: const ValueKey('shipment-cancel'),
                    onPressed: _busy ? null : _cancel,
                    child: Text(l10n.cancelShipment),
                  ),
                ],
              ),
            ),
    );
  }
}

class _ShipmentView extends ConsumerWidget {
  const _ShipmentView({required this.shipment});

  final Shipment shipment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(deliveryConfigProvider);
    final ios = ref.watch(appEnvironmentProvider).isIos;
    final s = shipment;
    final position = s.courierPosition;
    final live = config.tracking == DeliveryTracking.live && s.status.live;
    final pins = [
      if (s.pickup.located)
        MapPin(MapPinKind.pickup, s.pickup.lat!, s.pickup.lng!),
      if (s.dropoff.located)
        MapPin(MapPinKind.dropoff, s.dropoff.lat!, s.dropoff.lng!),
      if (position != null)
        MapPin(MapPinKind.courier, position.lat, position.lng),
    ];
    TextStyle label() => TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    TextStyle value() => TextStyle(fontSize: 15, color: p.text);
    return ListView(
      key: const ValueKey('shipment-view'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          shipmentStatusLabel(l10n, s.status),
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        Text(
          dayAndTime(s.createdAt),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        const SizedBox(height: 16),
        // The courier, and where they are.
        if (s.courierName != null)
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    AppIcon(AppIcons.courier, size: 26, color: p.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.shipmentCourier, style: label()),
                          Text(
                            s.courierName!,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (s.courierPhone != null)
                      CallButton(
                        phone: s.courierPhone!,
                        label: l10n.callCourier,
                      ),
                  ],
                ),
                if (live) ...[
                  const SizedBox(height: 12),
                  if (position != null && config.tilesUrl != null)
                    DeliveryMap(
                      key: const ValueKey('shipment-map'),
                      config: config,
                      pins: pins,
                    ),
                  if (position != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l10n.trackingCourierAt(
                              dayAndTime(position.updatedAt),
                            ),
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          key: const ValueKey('shipment-open-map'),
                          onPressed: () => ref.read(openExternalProvider)(
                            pointUrl(position.lat, position.lng, ios: ios),
                          ),
                          icon: AppIcon(AppIcons.map, size: 18, color: p.link),
                          label: Text(l10n.trackingOpenMap),
                          style: TextButton.styleFrom(foregroundColor: p.link),
                        ),
                      ],
                    ),
                  ] else
                    Text(
                      l10n.trackingNoPosition,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                ],
              ],
            ),
          )
        else if (s.status.active)
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                AppIcon(AppIcons.schedule, size: 24, color: p.textSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(l10n.shipmentWaitingCourier, style: value()),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PlaceRow(
                label: l10n.sendPickup,
                place: s.pickup,
                icon: AppIcons.parcel,
              ),
              const Divider(height: 24),
              PlaceRow(
                label: l10n.sendDropoff,
                place: s.dropoff,
                icon: AppIcons.location,
              ),
              const Divider(height: 24),
              Text(l10n.sendRecipient, style: label()),
              Text(
                '${isolate(s.recipientName)} · ${ltrRun(s.recipientPhone)}',
                style: value(),
              ),
              const SizedBox(height: 10),
              Text(l10n.sendParcelSection, style: label()),
              Text(
                [
                  packageSizeLabel(l10n, s.size),
                  if (s.description != null) isolate(s.description!),
                  if (s.serviceName != null) isolate(s.serviceName!),
                  if (s.zoneName != null) isolate(s.zoneName!),
                ].join(' · '),
                style: value(),
              ),
              if (s.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.sendNotes, style: label()),
                Text(isolate(s.notes!), style: value()),
              ],
              const SizedBox(height: 10),
              Text(l10n.sendPayment, style: label()),
              Text(
                [
                  isolate(s.priceFormatted),
                  s.payment == PaymentMethod.cash ? l10n.payCash : l10n.payCard,
                  s.paid ? l10n.paymentPaid : l10n.paymentUnpaid,
                ].join(' · '),
                key: const ValueKey('shipment-payment'),
                style: value(),
              ),
            ],
          ),
        ),
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
        StagesTimeline(stages: s.timeline),
      ],
    );
  }
}
