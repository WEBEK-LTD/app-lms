import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// How often the new orders are asked about while the desk is open.
const deskRefreshEvery = Duration(seconds: 30);

/// 105.1 The restaurant's screen, for its staff: whether it takes orders
/// (pausing new ones for a while, or taking them again), today's orders and
/// sales, and its orders: new ones to accept or turn down, the ones being
/// prepared and the done ones. Anyone else sees that it is for the
/// restaurants only.
class RestaurantDeskScreen extends ConsumerStatefulWidget {
  const RestaurantDeskScreen({super.key});

  @override
  ConsumerState<RestaurantDeskScreen> createState() =>
      _RestaurantDeskScreenState();
}

class _RestaurantDeskScreenState extends ConsumerState<RestaurantDeskScreen> {
  int _tab = 0;
  bool _switching = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(deskRefreshEvery, (_) {
      if (!ref.read(isRestaurantProvider)) return;
      ref.read(newRestaurantOrdersProvider.notifier).refresh();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _setBusy(int minutes) async {
    setState(() => _switching = true);
    try {
      await ref.read(yallappApiProvider).setRestaurantBusy(minutes);
      ref.invalidate(restaurantDeskProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _switching = false);
    }
  }

  Future<void> _pause() async {
    final l10n = context.l10n;
    final minutes = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      backgroundColor: context.palette.surface,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.deskPauseFor,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.palette.text,
                ),
              ),
            ),
            for (final m in const [15, 30, 60])
              ListTile(
                key: ValueKey('pause-$m'),
                title: Text(l10n.restaurantMinutes(m)),
                onTap: () => Navigator.of(context).pop(m),
              ),
          ],
        ),
      ),
    );
    if (minutes != null && mounted) await _setBusy(minutes);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(
      title: l10n.tabRestaurantDesk,
      trailing: TextButton.icon(
        key: const ValueKey('desk-customer-view'),
        onPressed: () => context.go(Paths.home),
        icon: AppIcon(AppIcons.swap, size: 18, color: p.link),
        label: Text(l10n.customerView),
        style: TextButton.styleFrom(foregroundColor: p.link),
      ),
    );
    if (!ref.watch(isRestaurantProvider)) {
      // Nothing is asked of the server for someone who isn't a restaurant's.
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.restaurant,
                  title: l10n.notRestaurantTitle,
                  message: l10n.notRestaurantMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    final desk = ref.watch(restaurantDeskProvider);
    final tabs = [l10n.deskNew, l10n.deskPreparing, l10n.deskDone];
    final provider = switch (_tab) {
      0 => newRestaurantOrdersProvider,
      1 => activeRestaurantOrdersProvider,
      _ => doneRestaurantOrdersProvider,
    };
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            switch (desk) {
              AsyncValue(value: final d?) => Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: AppCard(
                  padding: const EdgeInsets.fromLTRB(16, 10, 8, 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              d.name,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: p.text,
                              ),
                            ),
                            Text(
                              d.accepting
                                  ? l10n.deskAccepting
                                  : d.busyUntil != null
                                  ? l10n.deskPausedUntil(
                                      clockTime(d.busyUntil!),
                                    )
                                  : l10n.deskClosedHours,
                              key: const ValueKey('desk-state'),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: d.accepting ? p.success : p.danger,
                              ),
                            ),
                            Text(
                              l10n.deskToday(
                                d.todayOrders,
                                d.todaySalesFormatted,
                              ),
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (d.busyUntil != null)
                        TextButton(
                          key: const ValueKey('desk-open-again'),
                          onPressed: _switching ? null : () => _setBusy(0),
                          child: Text(l10n.deskOpenAgain),
                        )
                      else if (d.open)
                        TextButton(
                          key: const ValueKey('desk-pause'),
                          onPressed: _switching ? null : _pause,
                          child: Text(l10n.deskPause),
                        ),
                    ],
                  ),
                ),
              ),
              AsyncValue(error: final e?) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(restaurantDeskProvider),
                ),
              ),
              _ => const SizedBox(height: 72),
            },
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SegmentedTabs(
                labels: tabs,
                selected: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _OrderList(
                key: ValueKey('desk-$_tab'),
                provider: provider,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({super.key, required this.provider});

  final NotifierProvider<
    PagedController<RestaurantOrder>,
    PagedState<RestaurantOrder>
  >
  provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(provider);
    final notifier = ref.read(provider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingRestaurantOrders,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          children: [
            MessageView(
              icon: AppIcons.restaurant,
              title: l10n.noRestaurantOrdersTitle,
              message: l10n.noRestaurantOrdersMessage,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        itemCount: state.items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) => RestaurantOrderTile(
          key: ValueKey('desk-order-${state.items[i].id}'),
          order: state.items[i],
          onTap: () => context.push(Paths.restaurantOrder(state.items[i].id)),
        ),
      ),
    );
  }
}
