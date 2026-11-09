import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../market/screens/market_orders_screen.dart' show marketStatusText;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/vendor_providers.dart';

/// How often the new orders are asked about while the orders are open.
const vendorRefreshEvery = Duration(seconds: 20);

/// 115 The vendor's orders, for its staff: whether it takes orders (busy
/// for a while, paused, or taking them), today's orders and sales, and
/// the orders: new ones to answer (with a sound when one comes), the ones
/// being worked, the ones for later and the finished ones.
class VendorDeskScreen extends ConsumerStatefulWidget {
  const VendorDeskScreen({super.key});

  @override
  ConsumerState<VendorDeskScreen> createState() => _VendorDeskScreenState();
}

class _VendorDeskScreenState extends ConsumerState<VendorDeskScreen> {
  VendorOrderScope _scope = VendorOrderScope.fresh;
  bool _switching = false;
  Timer? _timer;
  Set<int>? _seen;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(vendorRefreshEvery, (_) {
      if (!ref.read(isVendorProvider)) return;
      ref.read(vendorOrdersProvider(VendorOrderScope.fresh).notifier).refresh();
      ref.invalidate(vendorDeskProvider);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// A sound for each order that wasn't there the last time the new ones
  /// were read (none for the ones on screen when it opened).
  void _listenForNew() {
    ref.listen(vendorOrdersProvider(VendorOrderScope.fresh), (_, next) {
      if (next.loading || next.error != null) return;
      final ids = {for (final o in next.items) o.id};
      final seen = _seen;
      _seen = ids;
      if (seen != null && ids.difference(seen).isNotEmpty) {
        unawaited(newOrderAlert());
      }
    });
  }

  Future<void> _set({int? busyMinutes, bool? paused, bool open = false}) async {
    setState(() => _switching = true);
    try {
      await ref
          .read(yallappApiProvider)
          .updateVendorDesk(
            busyMinutes: busyMinutes,
            paused: paused,
            endBusy: open,
          );
      ref.invalidate(vendorDeskProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _switching = false);
    }
  }

  Future<void> _pause() async {
    final l10n = context.l10n;
    final picked = await showModalBottomSheet<int>(
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
            for (final m in const [15, 30, 60, 120])
              ListTile(
                key: ValueKey('vendor-busy-$m'),
                title: Text(l10n.restaurantMinutes(m)),
                onTap: () => Navigator.of(context).pop(m),
              ),
            ListTile(
              key: const ValueKey('vendor-pause'),
              title: Text(l10n.vendorPauseUntilBack),
              subtitle: Text(l10n.vendorPauseNote),
              onTap: () => Navigator.of(context).pop(0),
            ),
          ],
        ),
      ),
    );
    if (picked == null || !mounted) return;
    await (picked == 0 ? _set(paused: true) : _set(busyMinutes: picked));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(
      title: l10n.tabVendor,
      trailing: ref.watch(vendorAppProvider)
          ? null
          : TextButton(
              key: const ValueKey('vendor-customer-view'),
              onPressed: () => context.go(Paths.home),
              child: Text(l10n.customerView),
            ),
    );
    if (!ref.watch(isVendorProvider)) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: Symbols.storefront,
                  title: l10n.notVendorTitle,
                  message: l10n.notVendorMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    _listenForNew();
    final desk = ref.watch(vendorDeskProvider);
    final d = desk.value;
    final scopes = VendorOrderScope.values;
    final labels = [
      l10n.deskNew,
      l10n.deskPreparing,
      l10n.vendorLater,
      l10n.deskDone,
    ];
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            if (d != null)
              Padding(
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
                              d.paused
                                  ? l10n.vendorPaused
                                  : d.busyUntil != null
                                  ? l10n.deskPausedUntil(
                                      clockTime(d.busyUntil!),
                                    )
                                  : d.accepting
                                  ? l10n.deskAccepting
                                  : l10n.deskClosedHours,
                              key: const ValueKey('vendor-state'),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: d.accepting ? p.success : p.danger,
                              ),
                            ),
                            Text(
                              l10n.deskToday(
                                d.todayOrders,
                                d.todaySales.formatted,
                              ),
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (d.answers)
                        if (d.paused || d.busyUntil != null)
                          TextButton(
                            key: const ValueKey('vendor-open-again'),
                            onPressed: _switching
                                ? null
                                : () => d.paused
                                      ? _set(paused: false)
                                      : _set(open: true),
                            child: Text(l10n.deskOpenAgain),
                          )
                        else if (d.open)
                          TextButton(
                            key: const ValueKey('vendor-busy'),
                            onPressed: _switching ? null : _pause,
                            child: Text(l10n.deskPause),
                          ),
                    ],
                  ),
                ),
              )
            else if (desk.error case final e?)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(vendorDeskProvider),
                ),
              )
            else
              const SizedBox(height: 72),
            // 115.16 The statements (owners and managers) and the
            // complaints support shared (everyone but pickers).
            if (d != null && d.answers)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: Wrap(
                  spacing: 4,
                  children: [
                    if (d.role == VendorRole.owner ||
                        d.role == VendorRole.manager)
                      TextButton.icon(
                        key: const ValueKey('vendor-statements'),
                        onPressed: () => context.push(Paths.vendorStatements),
                        icon: const Icon(Symbols.receipt_long),
                        label: Text(l10n.vendorStatementsTitle),
                      ),
                    TextButton.icon(
                      key: const ValueKey('vendor-complaints'),
                      onPressed: () => context.push(Paths.vendorComplaints),
                      icon: const Icon(Symbols.support_agent),
                      label: Text(l10n.vendorComplaintsTitle),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SegmentedTabs(
                labels: labels,
                selected: scopes.indexOf(_scope),
                onChanged: (i) => setState(() => _scope = scopes[i]),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _OrderList(
                key: ValueKey('vendor-${_scope.name}'),
                scope: _scope,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({super.key, required this.scope});

  final VendorOrderScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(vendorOrdersProvider(scope));
    final notifier = ref.read(vendorOrdersProvider(scope).notifier);
    if (state.isInitialLoading) {
      return const SkeletonList(layout: SkeletonLayout.text);
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
              icon: Symbols.receipt_long,
              title: l10n.noRestaurantOrdersTitle,
              message: l10n.vendorNoOrdersMessage,
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
        itemBuilder: (context, i) => VendorOrderTile(
          key: ValueKey('vendor-order-${state.items[i].id}'),
          order: state.items[i],
          onTap: () => context.push(Paths.vendorOrder(state.items[i].id)),
        ),
      ),
    );
  }
}

/// An order in the vendor's lists.
class VendorOrderTile extends StatelessWidget {
  const VendorOrderTile({super.key, required this.order, required this.onTap});

  final VendorOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final o = order;
    final when = o.scheduledFor ?? o.createdAt;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Icon(
            o.pickup ? Symbols.storefront : Symbols.two_wheeler,
            color: p.primary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${o.reference} · ${o.customerName}',
                  style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
                ),
                Text(
                  [
                    marketStatusText(l10n, o.status),
                    l10n.vendorItems(o.lines.length),
                    dayAndTime(when),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          Text(
            o.subtotal.formatted,
            style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
          ),
        ],
      ),
    );
  }
}
