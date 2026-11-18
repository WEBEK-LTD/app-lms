import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/push_service.dart';
import '../../lms/data/lms_providers.dart' show ordersProvider;
import '../pages/premium/premium_shared.dart';
import '../pages/premium/premium_timeline.dart';
import 'order_screen.dart' show orderProvider;

/// 132.160 Keeping the person's orders current: the list and the open order
/// are asked again when an order's notification arrives while the app is
/// open or is tapped, and when the app comes back to the front. Nothing is
/// asked on a timer, and nothing for a list or an order no screen shows.

/// The order a notification is about (`order_id` in its `data`), or null.
int? pushOrderId(Map<String, dynamic> data) =>
    int.tryParse('${data['order_id'] ?? ''}'.trim());

/// Asks again for the orders on screen: the list without its skeleton (the
/// rows stay while it loads), and [orderId]'s order, or every open order.
void refreshOrders(Ref ref, {int? orderId}) {
  if (ref.exists(ordersProvider)) {
    unawaited(ref.read(ordersProvider.notifier).reload());
  }
  if (orderId != null) {
    ref.invalidate(orderProvider(orderId));
  } else {
    ref.invalidate(orderProvider);
  }
}

/// Watched once at the app root.
final orderUpdatesProvider = Provider<void>((ref) {
  final push = ref.watch(pushServiceProvider);
  void onPush(Map<String, dynamic> data) {
    final id = pushOrderId(data);
    if (id != null) refreshOrders(ref, orderId: id);
  }

  if (push.isAvailable) {
    final received = push.receivedMessages.listen(onPush);
    final opened = push.openedMessages.listen(onPush);
    ref.onDispose(() {
      unawaited(received.cancel());
      unawaited(opened.cancel());
    });
  }
  final lifecycle = AppLifecycleListener(onResume: () => refreshOrders(ref));
  ref.onDispose(lifecycle.dispose);
});

/// The steps of an order's journey, as "How your flowers travel" draws them.
enum OrderJourneyStep { ordered, prepared, onItsWay, delivered }

/// Where [order] is on its journey: ordered or paid, being prepared, on its
/// way, delivered. Its delivery stage first (a store's, hosted or a
/// WordPress shop's), then a carrier's shipment, then a restaurant's step.
/// Mirrors `orderJourneyStep` in platform/web/src/lib/studio/order-journey.ts.
OrderJourneyStep orderJourneyStep(Order order) {
  switch (order.stage?.code) {
    case 'preparing' || 'postponed' || 'returned':
      return OrderJourneyStep.prepared;
    case 'shipped' || 'failed':
      return OrderJourneyStep.onItsWay;
    case 'delivered':
      return OrderJourneyStep.delivered;
  }
  if (order.status == OrderStatus.completed) return OrderJourneyStep.delivered;
  if (order.shipment != null) return OrderJourneyStep.onItsWay;
  final step = order.fulfilmentStatus;
  // A restaurant's order (it has how it's collected); a WordPress shop's
  // "preparing" is only its paid order.
  if (order.fulfilment != null) {
    return switch (step) {
      FulfilmentStatus.preparing ||
      FulfilmentStatus.ready => OrderJourneyStep.prepared,
      FulfilmentStatus.outForDelivery => OrderJourneyStep.onItsWay,
      FulfilmentStatus.completed => OrderJourneyStep.delivered,
      _ => OrderJourneyStep.ordered,
    };
  }
  if (step == FulfilmentStatus.outForDelivery) {
    return OrderJourneyStep.onItsWay;
  }
  return OrderJourneyStep.ordered;
}

/// The person's newest order still on its way, or null.
Order? latestOrderOnItsWay(Iterable<Order> orders) {
  Order? latest;
  for (final o in orders) {
    if (!o.inProgress) continue;
    if (latest == null || o.createdAt.isAfter(latest.createdAt)) latest = o;
  }
  return latest;
}

/// 168 How long a delivered order stays on its journey: the customer sees
/// "Delivered" ticked, not the drawn steps back at "Order placed".
const deliveredJourneyKept = Duration(days: 3);

/// 168 The order the journey follows: the newest still on its way, else the
/// newest delivered in the last [deliveredJourneyKept] (all its steps done);
/// null for none. Mirrors `orderToFollow` in
/// platform/web/src/lib/studio/order-journey.ts.
Order? orderToFollow(Iterable<Order> orders, DateTime now) {
  final open = latestOrderOnItsWay(orders);
  if (open != null) return open;
  Order? delivered;
  for (final o in orders) {
    if (orderJourneyStep(o) != OrderJourneyStep.delivered) continue;
    if (o.status != OrderStatus.completed) continue;
    if (now.difference(o.createdAt) > deliveredJourneyKept) continue;
    if (delivered == null || o.createdAt.isAfter(delivered.createdAt)) {
      delivered = o;
    }
  }
  return delivered;
}

/// The entry to make active for [step] among [count] entries: the journey's
/// four steps spread over the entries the owner drew.
int journeyEntryIndex(OrderJourneyStep step, int count) {
  if (count <= 0) return -1;
  if (count == 1) return 0;
  final last = OrderJourneyStep.values.length - 1;
  return (step.index * (count - 1) / last).round().clamp(0, count - 1);
}

/// 132.160 A timeline that follows the signed-in person's newest order still
/// on its way (`timeline.source: latest_order`), 168 or just delivered: its
/// order number over the steps, the step it is at active, and a tap opens
/// the order. Signed out, with no such order, or while the orders load: the
/// steps as drawn.
class OrderJourneyTimeline extends ConsumerWidget {
  const OrderJourneyTimeline({
    super.key,
    required this.node,
    required this.dark,
  });

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(
      authControllerProvider.select((s) => s.isSignedIn),
    );
    final orders = signedIn
        ? ref.watch(ordersProvider.select((s) => s.items))
        : const <Order>[];
    final order = orderToFollow(orders, DateTime.now());
    if (order == null) return PremiumTimeline(node: node, dark: dark);
    final tones = PremiumTones.of(context, dark: dark);
    final active = journeyEntryIndex(
      orderJourneyStep(order),
      node.entries.length,
    );
    return GestureDetector(
      key: ValueKey('order-journey-${node.id}'),
      behavior: HitTestBehavior.opaque,
      onTap: () => context.push(Paths.order(order.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              context.l10n.orderNumber(order.number),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: tones.brand,
              ),
            ),
          ),
          PremiumTimeline(node: node, dark: dark, activeStep: active),
        ],
      ),
    );
  }
}
