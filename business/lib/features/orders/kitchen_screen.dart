import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../app.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'order_actions.dart';

/// 59 Kitchen mode for restaurants: the orders in progress as big cards by
/// step (New, Preparing, Ready), checked every 15 seconds and on each new
/// order push, with a chime when a new order arrives while it's open.
class KitchenScreen extends ConsumerStatefulWidget {
  const KitchenScreen({super.key, this.interval = const Duration(seconds: 15)});

  final Duration interval;

  @override
  ConsumerState<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends ConsumerState<KitchenScreen> {
  List<Order>? _orders;
  Object? _error;
  Set<int>? _known;
  bool _sound = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(widget.interval, (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final page = await ref
          .read(apiProvider)
          .orders(
            ref.read(appIdProvider),
            statuses: const ['processing'],
            perPage: 50,
          );
      if (!mounted) return;
      final ids = page.items.map((o) => o.id).toSet();
      final known = _known;
      final arrived = known != null && ids.difference(known).isNotEmpty;
      setState(() {
        _orders = page.items.reversed.toList(); // oldest first
        _known = {...?known, ...ids};
        _error = null;
      });
      if (arrived && _sound) await ref.read(chimeProvider).play();
    } on Object catch (e) {
      if (mounted && _orders == null) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    ref.listen(pushEventsProvider, (_, notice) {
      if (notice?.data['kind'] == 'new_order') _load();
    });
    final orders = _orders;
    final Widget body;
    if (orders == null) {
      body = _error == null
          ? const LoadingState()
          : ErrorState(error: _error!, onRetry: _load);
    } else if (orders.isEmpty) {
      body = EmptyState(
        icon: AppIcons.kitchen,
        title: l10n.kitchenEmpty,
        text: l10n.kitchenEmptyText,
      );
    } else {
      final steps = [
        ('received', l10n.stepNew),
        ('preparing', l10n.stepPreparing),
        ('ready', l10n.stepReady),
        ('out_for_delivery', l10n.outForDelivery),
      ];
      final groups = [
        for (final (step, label) in steps)
          (
            label,
            orders
                .where((o) => (o.kitchen?.step ?? 'received') == step)
                .toList(),
          ),
      ].where((g) => g.$2.isNotEmpty).toList();
      body = LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 720;
          Widget column((String, List<Order>) group) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SectionTitle('${group.$1} · ${context.number(group.$2.length)}'),
              for (final o in group.$2)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: _KitchenCard(order: o, onChanged: (_) => _load()),
                ),
            ],
          );
          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final g in groups)
                  Expanded(child: SingleChildScrollView(child: column(g))),
              ],
            );
          }
          return RefreshIndicator(
            onRefresh: _load,
            child: ListView(children: [for (final g in groups) column(g)]),
          );
        },
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.kitchenMode),
        actions: [
          IconButton(
            tooltip: _sound ? l10n.soundOn : l10n.soundOff,
            isSelected: _sound,
            onPressed: () => setState(() => _sound = !_sound),
            icon: const Icon(Symbols.volume_off_rounded),
            selectedIcon: const Icon(AppIcons.sound),
          ),
          IconButton(
            tooltip: l10n.refresh,
            onPressed: _load,
            icon: const Icon(AppIcons.refresh),
          ),
        ],
      ),
      body: body,
    );
  }
}

class _KitchenCard extends StatelessWidget {
  const _KitchenCard({required this.order, required this.onChanged});

  final Order order;
  final void Function(Order) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final isNew = order.kitchen?.step == 'received';
    return Panel(
      color: isNew ? Brand.warningBg : null,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(order.number, style: theme.textTheme.headlineSmall),
              const SizedBox(width: 10),
              StatusChip(
                order.kitchen?.type == 'delivery' ? l10n.delivery : l10n.pickup,
              ),
              const Spacer(),
              Text(
                context.time(order.paidAt ?? order.createdAt),
                style: theme.textTheme.titleMedium,
              ),
            ],
          ),
          if (order.customer?.name != null)
            Text(order.customer!.name!, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 12),
          for (final line in order.lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${line.quantity} × ',
                      style: theme.textTheme.titleLarge,
                    ),
                    TextSpan(
                      text: line.name,
                      style: theme.textTheme.titleLarge,
                    ),
                    if (line.options.isNotEmpty)
                      TextSpan(
                        text: '\n${line.options.join(', ')}',
                        style: theme.textTheme.bodyLarge,
                      ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),
          OrderActions(order: order, onChanged: onChanged, large: true),
        ],
      ),
    );
  }
}
