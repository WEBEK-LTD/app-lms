import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart' show pushEventsProvider;
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart' show IconLine, SearchBarField;
import 'order_actions.dart';
import 'order_stages.dart';
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

  /// 207 Searching by number or who ordered.
  bool _searching = false;
  String? _query;

  @override
  void didUpdateWidget(OrdersScreen old) {
    super.didUpdateWidget(old);
    // 207 A link to another tab (?status=) on the same screen.
    final i = statuses.indexOf(widget.initialStatus ?? '');
    if (widget.initialStatus != old.initialStatus && i >= 0) {
      _tabs.index = i;
    }
  }

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
    // 207 A new order while the list is open shows at once.
    ref.listen(pushEventsProvider, (_, notice) {
      if (notice?.data['kind'] == 'new_order' && mounted) {
        setState(() => _version++);
      }
    });
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
          IconButton(
            key: const ValueKey('orders-search'),
            tooltip: l10n.searchAction,
            icon: const Icon(AppIcons.search),
            onPressed: () => setState(() {
              _searching = !_searching;
              if (!_searching && _query != null) {
                _query = null;
                _version++;
              }
            }),
          ),
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
      body: Column(
        children: [
          if (_searching)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: SearchBarField(
                hint: l10n.searchOrdersHint,
                onSubmitted: (q) => setState(() {
                  _query = q.trim().isEmpty ? null : q.trim();
                  _version++;
                }),
                onClose: () => setState(() {
                  _searching = false;
                  if (_query != null) _version++;
                  _query = null;
                }),
              ),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                for (final status in statuses)
                  PagedList<Order>(
                    key: ValueKey('$appId-$status-$_version-${_query ?? ''}'),
                    // 132 In progress lists the orders waiting for a bank transfer or the owner's own method too.
                    load: (page) => api.orders(
                      appId,
                      statuses: status == 'processing'
                          ? const ['pending', 'processing']
                          : [status],
                      page: page,
                      query: _query,
                    ),
                    empty: EmptyState(
                      icon: _query != null ? AppIcons.search : AppIcons.orders,
                      title: _query != null
                          ? l10n.noOrdersFound
                          : status == 'processing'
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
          ),
        ],
      ),
    );
  }
}

class OrderCard extends ConsumerWidget {
  const OrderCard({super.key, required this.order, required this.onChanged});

  final Order order;
  final void Function(Order updated) onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      // 207 Back from the order: the list shows what changed there.
      onTap: () async {
        await context.push(Paths.order(order.id));
        onChanged(order);
      },
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
                    // 132 Cancelled after a failed delivery, still to pay back.
                    if (order.needsRefund)
                      StatusChip(l10n.needsRefund, tone: Tone.warn),
                    // 132 A store order on its way: its delivery stage.
                    if (order.stage != null && order.status == 'processing')
                      StatusChip(
                        stageLabel(context, order.stage!.stage),
                        tone: stageTone(order.stage!.stage),
                      )
                    else
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
            orderSummary(context, order),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          Text(order.total.formatted, style: theme.textTheme.titleSmall),
          // 132 A store order's next stage; its other stages on its page.
          if (order.nextStages.isNotEmpty) ...[
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
                icon: Icon(stageIcon(primaryStage(order))),
                onPressed: () async {
                  final updated = await moveStage(
                    context,
                    ref,
                    order,
                    primaryStage(order),
                  );
                  if (updated != null) onChanged(updated);
                },
                label: Text(stageActionLabel(context, primaryStage(order))),
              ),
            ),
          ] else if (order.nextStatuses.isNotEmpty) ...[
            const SizedBox(height: 12),
            OrderActions(order: order, onChanged: onChanged),
          ],
        ],
      ),
    );
  }
}
