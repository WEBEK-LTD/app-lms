import 'dart:async';
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/routing/router.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../food/food_sheets.dart' show acceptFoodOrder, rejectFoodOrder;
import '../orders/order_actions.dart' show changeOrderStatus, orderActionLabel;
import 'new_order_card_pharaonic.dart';
import 'today_screen.dart' show todayProvider;

/// 214 The "New order" card on Today: the newest order waiting for the
/// owner (its number, how long ago, the customer's first name, delivery or
/// pickup, the total and its items on one line) with Accept and Reject, as
/// the Orders screens do; "+N more" opens the orders when several wait. It
/// goes when nothing waits, and loads again with Today (a push, a pull).
///
/// [NewOrderCard] only draws; its colours are [NewOrderCardTheme] (a theme
/// extension: another look sets its own), from the app's colours otherwise.

/// What the card's colours and shape are.
@immutable
class NewOrderCardTheme extends ThemeExtension<NewOrderCardTheme> {
  const NewOrderCardTheme({
    required this.background,
    required this.border,
    required this.badgeBackground,
    required this.badgeInk,
    required this.number,
    required this.ink,
    required this.ink2,
    required this.chipBackground,
    required this.divider,
    required this.acceptBackground,
    required this.acceptInk,
    required this.reject,
    this.radius = 20,
    this.ornament,
    this.frame,
  });

  /// From the app's colours (the default look, light or dark).
  factory NewOrderCardTheme.from(YbColors c) => NewOrderCardTheme(
    background: c.surface,
    border: c.accent,
    badgeBackground: c.infoBg,
    badgeInk: c.info,
    number: c.accentText,
    ink: c.ink,
    ink2: c.ink2,
    chipBackground: c.background,
    divider: c.line,
    acceptBackground: c.ink,
    acceptInk: c.onInk,
    reject: c.danger,
  );

  static NewOrderCardTheme of(BuildContext context) {
    final set = Theme.of(context).extension<NewOrderCardTheme>();
    if (set != null) return set;
    // 215 The Pharaonic theme's own card.
    final o = context.ornaments;
    return o != null
        ? pharaonicNewOrderCard(context.yb, o)
        : NewOrderCardTheme.from(context.yb);
  }

  final Color background;
  final Color border;
  final Color badgeBackground;
  final Color badgeInk;
  final Color number;
  final Color ink;
  final Color ink2;
  final Color chipBackground;
  final Color divider;
  final Color acceptBackground;
  final Color acceptInk;
  final Color reject;
  final double radius;

  /// Drawn over the card's top edge (a theme's frieze); none by default.
  final WidgetBuilder? ornament;

  /// The card's outer container; [NewOrderCardFrame] by default.
  final NewOrderFrameBuilder? frame;

  @override
  NewOrderCardTheme copyWith({
    Color? background,
    Color? border,
    Color? badgeBackground,
    Color? badgeInk,
    Color? number,
    Color? ink,
    Color? ink2,
    Color? chipBackground,
    Color? divider,
    Color? acceptBackground,
    Color? acceptInk,
    Color? reject,
    double? radius,
    WidgetBuilder? ornament,
    NewOrderFrameBuilder? frame,
  }) => NewOrderCardTheme(
    background: background ?? this.background,
    border: border ?? this.border,
    badgeBackground: badgeBackground ?? this.badgeBackground,
    badgeInk: badgeInk ?? this.badgeInk,
    number: number ?? this.number,
    ink: ink ?? this.ink,
    ink2: ink2 ?? this.ink2,
    chipBackground: chipBackground ?? this.chipBackground,
    divider: divider ?? this.divider,
    acceptBackground: acceptBackground ?? this.acceptBackground,
    acceptInk: acceptInk ?? this.acceptInk,
    reject: reject ?? this.reject,
    radius: radius ?? this.radius,
    ornament: ornament ?? this.ornament,
    frame: frame ?? this.frame,
  );

  @override
  NewOrderCardTheme lerp(NewOrderCardTheme? other, double t) {
    if (other == null) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return NewOrderCardTheme(
      background: c(background, other.background),
      border: c(border, other.border),
      badgeBackground: c(badgeBackground, other.badgeBackground),
      badgeInk: c(badgeInk, other.badgeInk),
      number: c(number, other.number),
      ink: c(ink, other.ink),
      ink2: c(ink2, other.ink2),
      chipBackground: c(chipBackground, other.chipBackground),
      divider: c(divider, other.divider),
      acceptBackground: c(acceptBackground, other.acceptBackground),
      acceptInk: c(acceptInk, other.acceptInk),
      reject: c(reject, other.reject),
      radius: lerpDouble(radius, other.radius, t) ?? radius,
      ornament: t < 0.5 ? ornament : other.ornament,
      frame: t < 0.5 ? frame : other.frame,
    );
  }
}

/// The kinds of order the card shows, and how Accept answers each.
enum WaitingKind {
  /// A restaurant's new kitchen order: Accept sends it to the kitchen.
  kitchen,

  /// A food order (the FoodOrder board): Accept asks the time to prepare.
  food,

  /// Another shop order: Accept opens it.
  order,
}

/// The newest waiting order, as the card shows it.
class WaitingOrder {
  const WaitingOrder({
    required this.kind,
    required this.id,
    required this.number,
    required this.placedAt,
    required this.customer,
    required this.total,
    required this.items,
    this.delivery,
    this.order,
  });

  final WaitingKind kind;
  final String id;
  final String number;
  final DateTime placedAt;

  /// The first name only ("" when unknown).
  final String customer;
  final String total;

  /// "2 × Large koshari • 1 × Feteer".
  final String items;

  /// True delivery, false pickup, null not said.
  final bool? delivery;

  /// A shop order, for its actions.
  final Order? order;
}

/// The newest waiting order and how many wait in all; null when none.
class WaitingOrders {
  const WaitingOrders(this.newest, this.count);

  final WaitingOrder newest;
  final int count;
}

String _firstName(String? name) =>
    (name ?? '').trim().split(RegExp(r'\s+')).first;

/// A shop order waits when it's a restaurant's new kitchen order, or (no
/// kitchen) when it came in during the last day and is still in progress.
bool _waits(Order o, DateTime now) {
  final kitchen = o.kitchen;
  if (kitchen != null) return kitchen.step == 'received';
  return o.status == 'processing' &&
      now.difference(o.createdAt) < const Duration(hours: 24);
}

WaitingOrder _fromOrder(Order o) => WaitingOrder(
  kind: o.kitchen != null ? WaitingKind.kitchen : WaitingKind.order,
  id: '${o.id}',
  number: o.number,
  placedAt: o.createdAt,
  customer: _firstName(o.customer?.name),
  total: o.total.formatted,
  items: [
    for (final l in o.lines)
      if (l.addonOf == null) isolate('${l.quantity} × ${l.name}'),
  ].join(' • '),
  delivery: switch (o.kitchen?.type) {
    'delivery' => true,
    'pickup' => false,
    _ => o.deliverTo != null ? true : null,
  },
  order: o,
);

WaitingOrder _fromFood(FoodOrder o) => WaitingOrder(
  kind: WaitingKind.food,
  id: o.id,
  number: o.reference,
  placedAt: o.placedAt,
  customer: _firstName(o.customerName),
  total: o.total.formatted,
  items: o.summary,
  // The FoodOrder board's orders go out with a courier.
  delivery: true,
);

/// 214 Loads with Today (so a push or a pull loads it again).
final waitingOrdersProvider = FutureProvider.autoDispose<WaitingOrders?>((
  ref,
) async {
  await ref.watch(todayProvider.future);
  final app = ref.watch(currentAppProvider);
  if (app == null) return null;
  final api = ref.watch(apiProvider);
  final now = DateTime.now();
  if (app.features.restaurants) {
    final page = await api.foodOrders(app.id, filter: 'new');
    final waiting = page.items.where((o) => o.canAccept).toList()
      ..sort((a, b) => b.placedAt.compareTo(a.placedAt));
    if (waiting.isEmpty) return null;
    return WaitingOrders(_fromFood(waiting.first), waiting.length);
  }
  if (app.features.orders) {
    final page = await api.orders(
      app.id,
      statuses: const ['processing'],
      perPage: 50,
    );
    final waiting = page.items.where((o) => _waits(o, now)).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (waiting.isEmpty) return null;
    return WaitingOrders(_fromOrder(waiting.first), waiting.length);
  }
  return null;
});

/// The card itself: only draws, the actions are given.
class NewOrderCard extends StatelessWidget {
  const NewOrderCard({
    super.key,
    required this.order,
    required this.acceptLabel,
    required this.rejectLabel,
    required this.onAccept,
    required this.onOpen,
    this.onReject,
    this.more = 0,
    this.onMore,
    this.busy = false,
    this.now,
  });

  final WaitingOrder order;
  final String acceptLabel;
  final String rejectLabel;
  final VoidCallback onAccept;
  final VoidCallback? onReject;
  final VoidCallback onOpen;

  /// Other orders waiting too.
  final int more;
  final VoidCallback? onMore;
  final bool busy;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final t = NewOrderCardTheme.of(context);
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final ornament = t.ornament;
    final customer = [if (order.customer.isNotEmpty) order.customer].join();
    final frame = t.frame ?? NewOrderCardFrame.new;
    return Padding(
      key: const ValueKey('new-order-card'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: frame(
        theme: t,
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (ornament != null) ornament(context),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: t.badgeBackground,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                AppIcons.ringing,
                                size: 18,
                                color: t.badgeInk,
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  l10n.ringBannerOrder,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: text.labelLarge?.copyWith(
                                    color: t.badgeInk,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        context.ago(order.placedAt, now: now),
                        style: text.bodySmall?.copyWith(color: t.ink2),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isolate(
                                order.number.startsWith('#') ||
                                        order.number.contains('-')
                                    ? order.number
                                    : '#${order.number}',
                              ),
                              key: const ValueKey('new-order-number'),
                              style: text.headlineMedium?.copyWith(
                                color: t.number,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                if (customer.isNotEmpty)
                                  Text(
                                    customer,
                                    style: text.titleSmall?.copyWith(
                                      color: t.ink,
                                    ),
                                  ),
                                if (order.delivery != null)
                                  _Chip(
                                    icon: order.delivery!
                                        ? AppIcons.shipments
                                        : AppIcons.store,
                                    label: order.delivery!
                                        ? l10n.delivery
                                        : l10n.pickup,
                                    theme: t,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            l10n.total,
                            style: text.bodySmall?.copyWith(color: t.ink2),
                          ),
                          Text(
                            isolate(order.total),
                            key: const ValueKey('new-order-total'),
                            style: text.titleLarge?.copyWith(
                              color: t.ink,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (order.items.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Divider(height: 1, color: t.divider),
                    const SizedBox(height: 10),
                    Text(
                      order.items,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodyMedium?.copyWith(color: t.ink2),
                    ),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: FilledButton.icon(
                          key: const ValueKey('new-order-accept'),
                          style: FilledButton.styleFrom(
                            backgroundColor: t.acceptBackground,
                            foregroundColor: t.acceptInk,
                            minimumSize: const Size(64, 52),
                          ),
                          icon: busy
                              ? SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: t.acceptInk,
                                  ),
                                )
                              : const Icon(AppIcons.check),
                          label: Text(acceptLabel),
                          onPressed: busy ? null : onAccept,
                        ),
                      ),
                      if (onReject != null) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: OutlinedButton(
                            key: const ValueKey('new-order-reject'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: t.reject,
                              side: BorderSide(color: t.reject),
                              minimumSize: const Size(64, 52),
                            ),
                            onPressed: busy ? null : onReject,
                            child: Text(rejectLabel),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (more > 0) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        key: const ValueKey('new-order-more'),
                        onPressed: onMore,
                        child: Text(l10n.newOrderMore(context.number(more))),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The card's one outer container: its surface, border, corners and tap.
/// Another look swaps it whole ([NewOrderCardTheme.frame]).
class NewOrderCardFrame extends StatelessWidget {
  const NewOrderCardFrame({
    super.key,
    required this.theme,
    required this.onTap,
    required this.child,
  });

  final NewOrderCardTheme theme;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) => Material(
    color: theme.background,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(theme.radius),
      side: BorderSide(color: theme.border, width: 1.5),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(onTap: onTap, child: child),
  );
}

/// Builds the card's outer container around its content.
typedef NewOrderFrameBuilder = Widget Function({
  required NewOrderCardTheme theme,
  required VoidCallback onTap,
  required Widget child,
});

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label, required this.theme});

  final IconData icon;
  final String label;
  final NewOrderCardTheme theme;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: theme.chipBackground,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: theme.ink),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: theme.ink),
          ),
        ),
      ],
    ),
  );
}

/// 214 Today's card, with its actions: the same as the Orders screens.
class TodayNewOrder extends ConsumerStatefulWidget {
  const TodayNewOrder({super.key});

  @override
  ConsumerState<TodayNewOrder> createState() => _TodayNewOrderState();
}

class _TodayNewOrderState extends ConsumerState<TodayNewOrder> {
  bool _busy = false;

  Future<void> _run(Future<bool> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      if (await action()) ref.invalidate(todayProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _location(WaitingOrder o) => switch (o.kind) {
    WaitingKind.food => Paths.foodOrder(o.id),
    _ => Paths.order(int.parse(o.id)),
  };

  void _open(WaitingOrder o) =>
      unawaited(ref.read(routerProvider).push(_location(o)));

  Future<void> _accept(WaitingOrder o) => _run(() async {
    switch (o.kind) {
      case WaitingKind.kitchen:
        return await changeOrderStatus(context, ref, o.order!, 'preparing') !=
            null;
      case WaitingKind.food:
        final detail = await ref
            .read(apiProvider)
            .foodOrder(ref.read(appIdProvider), o.id);
        if (!mounted) return false;
        return await acceptFoodOrder(context, ref, detail) != null;
      case WaitingKind.order:
        _open(o);
        return false;
    }
  });

  Future<void> _reject(WaitingOrder o) => _run(() async {
    if (o.kind == WaitingKind.food) {
      final detail = await ref
          .read(apiProvider)
          .foodOrder(ref.read(appIdProvider), o.id);
      if (!mounted) return false;
      return await rejectFoodOrder(context, ref, detail) != null;
    }
    return await changeOrderStatus(context, ref, o.order!, 'cancelled') != null;
  });

  @override
  Widget build(BuildContext context) {
    final waiting = ref.watch(waitingOrdersProvider).value;
    if (waiting == null) return const SizedBox.shrink();
    final o = waiting.newest;
    final l10n = context.l10n;
    final order = o.order;
    final canReject =
        o.kind == WaitingKind.food ||
        (order != null && order.nextStatuses.contains('cancelled'));
    final app = ref.watch(currentAppProvider);
    return NewOrderCard(
      order: o,
      busy: _busy,
      acceptLabel: o.kind == WaitingKind.order ? l10n.open : l10n.accept,
      rejectLabel: order != null
          ? orderActionLabel(context, order, 'cancelled')
          : l10n.decline,
      onAccept: () => _accept(o),
      onReject: canReject ? () => _reject(o) : null,
      onOpen: () => _open(o),
      more: waiting.count - 1,
      onMore: () => ref
          .read(routerProvider)
          .go(
            app != null && app.features.restaurants
                ? Paths.foodOrders
                : Paths.orders,
          ),
    );
  }
}
