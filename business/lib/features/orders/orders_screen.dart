import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart' show IconLine;
import 'order_actions.dart';
import 'order_screen.dart' show deliveryWhen;

/// 59 Orders by status, newest first; a restaurant's new orders can be
/// accepted or declined right from the list.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key, this.initialStatus});

  final String? initialStatus;

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
    with SingleTickerProviderStateMixin {
  static const statuses = ['processing', 'completed', 'cancelled', 'refunded'];
  late final TabController _tabs = TabController(
    length: statuses.length,
    vsync: this,
    initialIndex: statuses.indexOf(widget.initialStatus ?? '').clamp(0, 3),
  );
  int _version = 0;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final appId = app.id;
    final api = ref.watch(apiProvider);
    final labels = [
      l10n.tabInProgress,
      l10n.statusCompleted,
      l10n.statusCancelled,
      l10n.statusRefunded,
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.orders),
        actions: [
          if (app.features.kitchen)
            TextButton.icon(
              onPressed: () => context.push(Paths.kitchen),
              icon: const Icon(AppIcons.kitchen),
              label: Text(l10n.kitchenMode),
            ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: [for (final label in labels) Tab(text: label)],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          for (final status in statuses)
            PagedList<Order>(
              key: ValueKey('$appId-$status-$_version'),
              // 132 In progress lists the orders waiting for a bank transfer or the owner's own method too.
              load: (page) => api.orders(
                appId,
                statuses: status == 'processing'
                    ? const ['pending', 'processing']
                    : [status],
                page: page,
              ),
              empty: EmptyState(
                icon: AppIcons.orders,
                title: status == 'processing'
                    ? l10n.noOrdersInProgress
                    : l10n.noOrders,
              ),
              itemBuilder: (context, order) => OrderCard(
                order: order,
                onChanged: (_) => setState(() => _version++),
              ),
            ),
        ],
      ),
    );
  }
}

class OrderCard extends StatelessWidget {
  const OrderCard({super.key, required this.order, required this.onChanged});

  final Order order;
  final void Function(Order updated) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final customer = order.buyerName;
    final kitchen = order.kitchen;
    final c = context.yb;
    final d = order.delivery;
    // 132 When it goes and to whom: the day and slot, the gift's recipient.
    final when = d != null && d.hasWhen
        ? deliveryWhen(context, d)
        : kitchen?.scheduledFor != null
        ? context.dateTime(kitchen!.scheduledFor!)
        : null;
    final to = order.deliverTo;
    return Panel(
      onTap: () => context.push(Paths.order(order.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(order.label, style: theme.textTheme.titleMedium),
                    StatusChip(
                      orderStatusLabel(context, order),
                      tone: StatusChip.toneOf(orderTone(order)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                context.ago(order.paidAt ?? order.createdAt),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (customer != null)
            Text(
              kitchen == null
                  ? customer
                  : '${isolate(customer)} · ${kitchen.type == 'delivery' ? l10n.delivery : l10n.pickup}',
              style: theme.textTheme.titleSmall,
            ),
          if (to != null && to.isRecipient && to.name != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: IconLine(AppIcons.gift, l10n.giftFor(isolate(to.name!))),
            ),
          if (when != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Row(
                children: [
                  Icon(AppIcons.when, size: 18, color: c.accentText),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      when,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: c.accentText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (order.payOutside != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                l10n.payOutsideWaiting(isolate(order.payOutside!.name)),
                style: TextStyle(fontSize: 13, color: c.warning),
              ),
            ),
          const SizedBox(height: 2),
          Text(
            orderSummary(order),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          Text(order.total.formatted, style: theme.textTheme.titleSmall),
          if (order.nextStatuses.isNotEmpty) ...[
            const SizedBox(height: 12),
            OrderActions(order: order, onChanged: onChanged),
          ],
        ],
      ),
    );
  }
}
