import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import 'order_actions.dart';

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
              load: (page) => api.orders(appId, statuses: [status], page: page),
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
    final customer = order.customer?.name;
    final kitchen = order.kitchen;
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
                  : '$customer · ${kitchen.type == 'delivery' ? l10n.delivery : l10n.pickup}',
              style: theme.textTheme.titleSmall,
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
