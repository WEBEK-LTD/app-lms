import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/models/market_api_models.dart' as market;
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/theme/app_icons.dart';
import '../../taxi/data/taxi_providers.dart' show distanceKm, driveMinutes;
import 'content_blocks.dart' show pageClockProvider;

/// 128 A `live_status` element (`StudioLiveStatus`): the signed-in person's
/// latest order still on its way, from the app's own data: what it is and
/// where it is ("Your kofta is on its way"), a bar for how far along it is
/// and the minutes left when the app knows them; a tap opens the order.
/// Nothing shows signed out, or with no order on its way.
class LiveOrder {
  const LiveOrder({
    required this.title,
    required this.progress,
    required this.location,
    this.minutes,
  });

  final String title;

  /// 0 to 1.
  final double progress;
  final int? minutes;

  /// The order's own page.
  final String location;
}

/// The latest food delivery order still on its way, if any.
final liveFoodOrderProvider = FutureProvider.autoDispose<FoodOrder?>((
  ref,
) async {
  if (ref.watch(authControllerProvider) is! SignedIn) return null;
  final orders = await ref.watch(yallappApiProvider).listMyFoodOrders();
  for (final o in orders.items) {
    if (o.status.active && o.status != FoodOrderStatus.awaitingPayment) {
      return o;
    }
  }
  return null;
});

/// The latest marketplace order still on its way, if any.
final liveMarketOrderProvider = FutureProvider.autoDispose<market.MarketOrder?>(
  (ref) async {
    if (ref.watch(authControllerProvider) is! SignedIn) return null;
    final orders = await ref.watch(yallappApiProvider).listMyMarketOrders();
    for (final o in orders.items) {
      if (_marketActive.contains(o.status)) return o;
    }
    return null;
  },
);

const _marketActive = {
  market.MarketOrderStatus.placed,
  market.MarketOrderStatus.accepted,
  market.MarketOrderStatus.picking,
  market.MarketOrderStatus.ready,
  market.MarketOrderStatus.onTheWay,
};

/// "Kofta" as it reads inside a sentence ("Your kofta is on its way").
String _inSentence(String name) =>
    name.isEmpty ? name : name[0].toLowerCase() + name.substring(1);

/// About how many minutes a courier at [from] is from [to], as the
/// order's own map says it ("Arrives in about 8 min"); null without both.
int? _minutesBetween(CourierPosition? from, Place to) {
  if (from == null || !to.located) return null;
  return driveMinutes(
    distanceKm((lat: from.lat, lng: from.lng), (lat: to.lat!, lng: to.lng!)),
  );
}

int? _minutesUntil(DateTime? at, DateTime now) {
  if (at == null) return null;
  final left = at.difference(now).inMinutes;
  return left > 0 ? left : null;
}

LiveOrder? liveFoodOrder(AppLocalizations l10n, FoodOrder? o, DateTime now) {
  if (o == null) return null;
  final dish = _inSentence(o.lines.isEmpty ? '' : o.lines.first.name);
  final place = o.restaurantName;
  final (String title, double progress, int? minutes) = switch (o.status) {
    FoodOrderStatus.accepted => (
      l10n.liveOrderCooking(place, dish),
      0.4,
      _minutesUntil(o.readyAt, now),
    ),
    FoodOrderStatus.ready => (l10n.liveOrderReady(dish), 0.6, null),
    FoodOrderStatus.pickedUp || FoodOrderStatus.onTheWay => (
      l10n.liveOrderOnTheWay(dish),
      0.7,
      _minutesBetween(o.courierPosition, o.dropoff),
    ),
    _ => (l10n.liveOrderPlaced(place), 0.15, null),
  };
  return LiveOrder(
    title: title,
    progress: progress,
    minutes: minutes,
    location: Paths.foodOrder(o.id),
  );
}

LiveOrder? liveMarketOrder(
  AppLocalizations l10n,
  market.MarketOrder? o,
  DateTime now,
) {
  if (o == null) return null;
  final place = o.vendor.name;
  final (String title, double progress) = switch (o.status) {
    market.MarketOrderStatus.accepted ||
    market.MarketOrderStatus.picking => (l10n.liveOrderPicking(place), 0.4),
    market.MarketOrderStatus.ready => (l10n.liveMarketReady(place), 0.6),
    market.MarketOrderStatus.onTheWay => (l10n.liveMarketOnTheWay(place), 0.7),
    _ => (l10n.liveOrderPlaced(place), 0.15),
  };
  return LiveOrder(
    title: title,
    progress: progress,
    minutes: _minutesUntil(o.eta, now),
    location: Paths.marketOrder(o.id),
  );
}

/// The order for [source], once known; null while loading or without one.
LiveOrder? watchLiveOrder(
  BuildContext context,
  WidgetRef ref,
  StudioLiveSource source,
) {
  final l10n = context.l10n;
  final now = ref.watch(pageClockProvider)();
  return switch (source) {
    StudioLiveSource.foodOrder => liveFoodOrder(
      l10n,
      ref.watch(liveFoodOrderProvider).value,
      now,
    ),
    StudioLiveSource.marketOrder => liveMarketOrder(
      l10n,
      ref.watch(liveMarketOrderProvider).value,
      now,
    ),
  };
}

/// The card: an icon on a soft square, the words and the bar, the minutes
/// at the end; in the element's colours (its text colour for everything on
/// it).
class StudioLiveStatusCard extends ConsumerWidget {
  const StudioLiveStatusCard({
    super.key,
    required this.node,
    required this.order,
    this.color,
  });

  final StudioNode node;
  final LiveOrder order;
  final Color? color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final ink = color ?? context.palette.onPrimary;
    final icon = node.icon != null
        ? symbolByName(node.icon)
        : node.liveStatus == StudioLiveSource.marketOrder
        ? symbolByName('shopping_bag')
        : symbolByName('two_wheeler');
    return Semantics(
      button: true,
      label: order.title,
      child: GestureDetector(
        key: ValueKey('studio-live-${node.id}'),
        behavior: HitTestBehavior.opaque,
        onTap: () => context.push(order.location),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: ink.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: AppIcon(icon, size: 22, color: ink, filled: true),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 7),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: SizedBox(
                      height: 4,
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: ColoredBox(
                              color: ink.withValues(alpha: 0.3),
                            ),
                          ),
                          FractionallySizedBox(
                            widthFactor: order.progress,
                            heightFactor: 1,
                            alignment: AlignmentDirectional.centerStart,
                            child: ColoredBox(color: ink),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (order.minutes case final minutes?) ...[
              const SizedBox(width: 12),
              Text.rich(
                TextSpan(
                  text: '$minutes',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                  children: [
                    TextSpan(
                      text: ' ${l10n.liveOrderMin}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
