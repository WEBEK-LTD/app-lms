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
import '../../delivery/widgets/delivery_map.dart';
import '../../delivery/widgets/delivery_widgets.dart'
    show CallButton, PlaceRow, pointUrl;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// How often an active order is asked about while its screen is open.
const foodFollowEvery = Duration(seconds: 15);

/// 105.1 Following a food order: its stage and stages, when it is ready,
/// the courier and, with live tracking, where the courier is; paying or
/// cancelling before the restaurant accepts it; rating it once delivered.
class FoodOrderScreen extends ConsumerStatefulWidget {
  const FoodOrderScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<FoodOrderScreen> createState() => _FoodOrderScreenState();
}

class _FoodOrderScreenState extends ConsumerState<FoodOrderScreen> {
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(foodFollowEvery, (_) {
      final current = ref.read(foodOrderProvider(widget.orderId)).value;
      if (current == null || current.status.active) {
        ref.invalidate(foodOrderProvider(widget.orderId));
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _reload() => ref
    ..invalidate(foodOrderProvider(widget.orderId))
    ..invalidate(myFoodOrdersProvider);

  Future<void> _pay() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final url = await ref
          .read(yallappApiProvider)
          .payMyFoodOrder(widget.orderId);
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
      if (paid == true) showMessage(context, l10n.foodOrderPaid);
      _reload();
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
        title: Text(l10n.foodCancelConfirm),
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
      await ref.read(yallappApiProvider).cancelMyFoodOrder(widget.orderId);
      if (!mounted) return;
      showMessage(context, l10n.foodCancelledToast);
      _reload();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(foodOrderProvider(widget.orderId));
    final order = async.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          order == null
              ? l10n.tabFoodOrders
              : l10n.foodOrderHeading(order.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final o?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(foodOrderProvider(widget.orderId)),
          child: _OrderView(order: o, onRated: _reload),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(foodOrderProvider(widget.orderId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: order == null || !order.status.cancellable
          ? null
          : BottomActionBar(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (order.status == FoodOrderStatus.awaitingPayment) ...[
                    PrimaryButton(
                      key: const ValueKey('food-order-pay'),
                      label: l10n.payNow,
                      icon: AppIcons.card,
                      loading: _busy,
                      onPressed: _pay,
                    ),
                    const SizedBox(height: 8),
                  ],
                  TextButton(
                    key: const ValueKey('food-order-cancel'),
                    onPressed: _busy ? null : _cancel,
                    child: Text(l10n.foodCancel),
                  ),
                ],
              ),
            ),
    );
  }
}

class _OrderView extends ConsumerWidget {
  const _OrderView({required this.order, required this.onRated});

  final FoodOrder order;
  final VoidCallback onRated;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(foodConfigProvider);
    final ios = ref.watch(appEnvironmentProvider).isIos;
    final o = order;
    final position = o.courierPosition;
    final live = config.tracking == DeliveryTracking.live && o.status.live;
    final pins = [
      if (o.dropoff.located)
        MapPin(MapPinKind.dropoff, o.dropoff.lat!, o.dropoff.lng!),
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
      key: const ValueKey('food-order-view'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Text(
          foodStatusLabel(l10n, o.status),
          key: const ValueKey('food-order-status'),
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
        if (o.rejection != null) ...[
          const SizedBox(height: 8),
          Text(
            [
              rejectionLabel(l10n, o.rejection!),
              if (o.rejectionNote != null) o.rejectionNote!,
            ].join('. '),
            style: TextStyle(fontSize: 15, color: p.danger),
          ),
        ],
        const SizedBox(height: 16),
        // The courier, and where they are.
        if (o.courierName != null)
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
                      CallButton(
                        phone: o.courierPhone!,
                        label: l10n.callCourier,
                      ),
                  ],
                ),
                if (live) ...[
                  const SizedBox(height: 12),
                  if (position != null && config.tilesUrl != null)
                    DeliveryMap(
                      key: const ValueKey('food-order-map'),
                      config: config.mapConfig,
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
        else if (o.status == FoodOrderStatus.placed)
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                AppIcon(AppIcons.schedule, size: 24, color: p.textSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(l10n.foodWaitingRestaurant, style: value()),
                ),
              ],
            ),
          ),
        if (o.status == FoodOrderStatus.delivered) ...[
          const SizedBox(height: 16),
          o.rated
              ? Text(
                  l10n.foodRated(o.ratedRestaurant!),
                  key: const ValueKey('food-order-rated'),
                  style: value(),
                )
              : _RateCard(order: o, onRated: onRated),
        ],
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.foodRestaurant, style: label()),
                        Text(
                          o.restaurantName,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (o.restaurantPhone != null && o.status.active)
                    CallButton(
                      phone: o.restaurantPhone!,
                      label: l10n.callCourier,
                    ),
                ],
              ),
              const Divider(height: 24),
              Text(l10n.foodDishes, style: label()),
              const SizedBox(height: 6),
              for (final line in o.lines) FoodLineRow(line: line),
              const Divider(height: 16),
              AmountRow(label: l10n.foodSubtotal, value: o.subtotalFormatted),
              AmountRow(
                label: l10n.foodDeliveryFee,
                value: o.deliveryFeeFormatted,
              ),
              AmountRow(
                label: l10n.foodTotal,
                value: o.totalFormatted,
                strong: true,
              ),
              const SizedBox(height: 6),
              Text(
                [
                  o.payment == PaymentMethod.cash ? l10n.payCash : l10n.payCard,
                  o.paid ? l10n.paymentPaid : l10n.paymentUnpaid,
                ].join(' · '),
                key: const ValueKey('food-order-payment'),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const Divider(height: 24),
              PlaceRow(
                label: l10n.foodDeliverTo,
                place: o.dropoff,
                icon: AppIcons.location,
                directions: false,
              ),
              if (o.notes != null) ...[
                const SizedBox(height: 10),
                Text(l10n.sendNotes, style: label()),
                Text(o.notes!, style: value()),
              ],
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
        FoodStagesTimeline(stages: o.timeline),
      ],
    );
  }
}

/// Rating a delivered order: the restaurant (required) and the courier.
class _RateCard extends ConsumerStatefulWidget {
  const _RateCard({required this.order, required this.onRated});

  final FoodOrder order;
  final VoidCallback onRated;

  @override
  ConsumerState<_RateCard> createState() => _RateCardState();
}

class _RateCardState extends ConsumerState<_RateCard> {
  final _comment = TextEditingController();
  int _restaurant = 0;
  int _courier = 0;
  bool _sending = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    if (_restaurant == 0) {
      showMessage(context, l10n.ratePickStars);
      return;
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .rateMyFoodOrder(
            widget.order.id,
            restaurant: _restaurant,
            courier: _courier == 0 ? null : _courier,
            comment: _comment.text,
          );
      if (!mounted) return;
      showMessage(context, l10n.rateThanks);
      widget.onRated();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    TextStyle label() => TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    return AppCard(
      key: const ValueKey('food-order-rate'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.foodRateTitle,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(l10n.rateRestaurant, style: label()),
          StarPicker(
            keyPrefix: 'rate-restaurant',
            value: _restaurant,
            onChanged: (v) => setState(() => _restaurant = v),
          ),
          if (widget.order.courierName != null) ...[
            Text(l10n.rateCourier, style: label()),
            StarPicker(
              keyPrefix: 'rate-courier',
              value: _courier,
              onChanged: (v) => setState(() => _courier = v),
            ),
          ],
          TextField(
            controller: _comment,
            maxLength: 500,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: l10n.rateComment,
              counterText: '',
            ),
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            key: const ValueKey('rate-send'),
            label: l10n.rateSend,
            icon: AppIcons.star,
            loading: _sending,
            onPressed: _send,
          ),
        ],
      ),
    );
  }
}
