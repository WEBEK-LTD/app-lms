import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/pharaonic_widgets.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../orders/order_actions.dart';

/// 215 The newest order still waiting to be accepted (a restaurant's or
/// kitchen's), for the Pharaonic theme's new-order card on Today.
final waitingOrderProvider = FutureProvider.autoDispose<Order?>((ref) async {
  final page = await ref
      .watch(apiProvider)
      .orders(
        ref.watch(appIdProvider),
        statuses: const ['processing'],
        perPage: 20,
      );
  final waiting =
      page.items.where((o) => o.kitchen?.step == 'received').toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return waiting.firstOrNull;
});

/// 215 The Pharaonic theme's new-order card: the newest order waiting to be
/// accepted, in a gilt card with a faience edge and a soft shimmer that
/// stops once it's accepted or declined. Pharaonic theme only, and only in
/// an app with Kitchen mode.
class NewOrderCard extends ConsumerWidget {
  const NewOrderCard({super.key, required this.app});

  final AppSummary app;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (context.ornaments == null || !app.features.kitchen) {
      return const SizedBox.shrink();
    }
    final order = ref.watch(waitingOrderProvider).value;
    if (order == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: _Card(
        key: ValueKey('new-order-${order.id}'),
        order: order,
        onChanged: () => ref.invalidate(waitingOrderProvider),
      ),
    );
  }
}

class _Card extends StatefulWidget {
  const _Card({super.key, required this.order, required this.onChanged});

  final Order order;
  final VoidCallback onChanged;

  @override
  State<_Card> createState() => _CardState();
}

class _CardState extends State<_Card> {
  /// Accepted or declined: the light stops at once.
  bool _answered = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = context.yb;
    final o = context.ornaments!;
    final order = widget.order;
    final delivery = order.kitchen?.type == 'delivery';
    final items = order.lines
        .map((l) => isolate('${l.quantity} × ${l.name}'))
        .join('  ·  ');
    return Shimmer(
      key: const ValueKey('new-order-shimmer'),
      active: !_answered,
      child: GiltCard(
        tiles: true,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.push(Paths.order(order.id)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: o.faienceBg,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(AppIcons.ringing, size: 18, color: o.faience),
                          const SizedBox(width: 5),
                          Text(
                            l10n.ringBannerOrder,
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: o.faience,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Text(
                      context.ago(order.createdAt),
                      style: theme.textTheme.bodySmall,
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
                            isolate(order.label),
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontFamily: arabicFont,
                              fontWeight: FontWeight.w700,
                              color: c.gold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            [
                              ?order.customer?.name,
                              delivery ? l10n.delivery : l10n.pickup,
                            ].join(' · '),
                            style: theme.textTheme.titleSmall,
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(l10n.total, style: theme.textTheme.bodySmall),
                        Text(
                          isolate(order.total.formatted),
                          style: theme.textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ],
                ),
                if (items.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(height: 1, color: c.line),
                  const SizedBox(height: 10),
                  Text(
                    items,
                    style: theme.textTheme.bodyMedium?.copyWith(color: c.ink2),
                  ),
                ],
                const SizedBox(height: 12),
                OrderActions(
                  order: order,
                  onChanged: (_) {
                    setState(() => _answered = true);
                    widget.onChanged();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
