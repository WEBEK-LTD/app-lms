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
import '../studio/studio_widgets.dart';
import 'complaint_screen.dart';

Tone marketTone(String status) => switch (status) {
  'placed' || 'scheduled' => Tone.info,
  'accepted' || 'picking' || 'ready' || 'on_the_way' => Tone.warn,
  'delivered' || 'picked_up' => Tone.good,
  'rejected' || 'cancelled' => Tone.bad,
  _ => Tone.neutral,
};

/// Who a complaint waits for, as its tag.
(String, Tone) complaintTag(BuildContext context, Complaint c) {
  final l10n = context.l10n;
  return switch (c.waitingFor) {
    'you' => (l10n.waitingForYou, Tone.bad),
    'vendor' => (l10n.withVendor, Tone.info),
    'customer' => (l10n.waitingCustomer, Tone.warn),
    _ => (c.statusLabel, Tone.neutral),
  };
}

/// 125 The marketplace (the Market board): Orders, Complaints and Vendors.
/// Vendors move their own orders; the owner sees them all and settles
/// complaints.
class MarketScreen extends ConsumerStatefulWidget {
  const MarketScreen({super.key, this.initialTab});

  final String? initialTab;

  @override
  ConsumerState<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends ConsumerState<MarketScreen> {
  static const tabs = ['orders', 'complaints', 'vendors'];
  static const orderFilters = ['active', 'new', 'done', 'problems'];
  late int _tab = switch (tabs.indexOf(widget.initialTab ?? '')) {
    -1 => 1,
    final i => i,
  };
  int _filter = 0;
  int _version = 0;
  int _waiting = 0;
  bool _searching = false;
  String? _query;

  @override
  void didUpdateWidget(MarketScreen old) {
    super.didUpdateWidget(old);
    final i = tabs.indexOf(widget.initialTab ?? '');
    if (widget.initialTab != old.initialTab && i >= 0) _tab = i;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final api = ref.watch(apiProvider);
    final Widget body = switch (_tab) {
      0 => Column(
        children: [
          const SizedBox(height: 4),
          FilterTabs(
            labels: [
              l10n.filterActive,
              l10n.filterNew,
              l10n.filterDone,
              l10n.filterProblems,
            ],
            selected: _filter,
            onSelected: (i) => setState(() => _filter = i),
          ),
          Expanded(
            child: PagedList<MarketOrder>(
              key: ValueKey(
                '${app.id}-orders-${orderFilters[_filter]}-$_query-$_version',
              ),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
              spacing: 12,
              load: (page) => api.marketOrders(
                app.id,
                filter: orderFilters[_filter],
                query: _query,
                page: page,
              ),
              empty: EmptyState(
                icon: AppIcons.orders,
                title: l10n.noMarketOrders,
              ),
              footer: const _MarketInfo(),
              itemBuilder: (context, o) => _MarketOrderCard(order: o),
            ),
          ),
        ],
      ),
      1 => PagedList<Complaint>(
        key: ValueKey('${app.id}-complaints-$_version'),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        spacing: 12,
        load: (page) async {
          final result = await api.complaints(app.id, page: page);
          if (mounted && result.counts.containsKey('waiting')) {
            setState(() => _waiting = result.count('waiting'));
          }
          return result;
        },
        empty: EmptyState(
          icon: AppIcons.complaint,
          title: l10n.noComplaints,
          text: l10n.noComplaintsText,
        ),
        footer: const _MarketInfo(),
        itemBuilder: (context, c) => ComplaintCard(
          complaint: c,
          onChanged: () => setState(() => _version++),
        ),
      ),
      _ => _Vendors(appId: app.id),
    };
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            StudioHeader(
              title: l10n.marketplaceTitle,
              bottom: 12,
              actions: [
                if (_tab == 0)
                  IconButton(
                    tooltip: l10n.searchAction,
                    icon: const Icon(AppIcons.search),
                    onPressed: () => setState(() => _searching = !_searching),
                  ),
              ],
            ),
            if (_searching && _tab == 0)
              SearchBarField(
                hint: l10n.searchMarketHint,
                onSubmitted: (q) => setState(() {
                  _query = q;
                  _version++;
                }),
                onClose: () => setState(() {
                  _searching = false;
                  if (_query != null) _version++;
                  _query = null;
                }),
              ),
            Segments(
              labels: [l10n.orders, l10n.complaintsTab, l10n.vendorsTab],
              selected: _tab,
              counts: {1: _waiting},
              onSelected: (i) => setState(() => _tab = i),
            ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

class _MarketInfo extends StatelessWidget {
  const _MarketInfo();

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.line),
      ),
      child: Row(
        children: [
          Icon(AppIcons.info, color: c.ink2),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              context.l10n.marketInfo,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
          ),
        ],
      ),
    );
  }
}

class ComplaintCard extends ConsumerWidget {
  const ComplaintCard({
    super.key,
    required this.complaint,
    required this.onChanged,
  });

  final Complaint complaint;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final k = complaint;
    final (label, tone) = complaintTag(context, k);
    final mine = k.waitingFor == 'you';
    return Box(
      onTap: () async {
        await context.push(Paths.complaint(k.id));
        onChanged();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(child: Tag(label, tone: tone)),
              const Spacer(),
              Text(
                context.ago(k.updatedAt),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            k.subject,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            [
              k.orderReference,
              k.vendor.name,
              k.customerName,
              k.orderTotal.formatted,
            ].map(isolate).join(' · '),
            style: TextStyle(fontSize: 13, color: c.ink2),
          ),
          if (mine && k.excerpt.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: c.muted,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '“${k.excerpt}”',
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
          if (mine) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SmallButton(
                  label: l10n.complaintReply,
                  onPressed: () async {
                    await context.push(Paths.complaint(k.id));
                    onChanged();
                  },
                ),
                if (k.refundSuggested != null)
                  SmallButton(
                    label: l10n.refundOf(isolate(k.refundSuggested!.formatted)),
                    filled: true,
                    onPressed: () async {
                      if (await refundSuggested(context, ref, k) != null) {
                        onChanged();
                      }
                    },
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MarketOrderCard extends StatelessWidget {
  const _MarketOrderCard({required this.order});

  final MarketOrder order;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final o = order;
    return Box(
      onTap: () => context.push(Paths.marketOrder(o.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                o.reference,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: Tag(o.statusLabel, tone: marketTone(o.status))),
              const Spacer(),
              Text(
                context.ago(o.placedAt),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            context.l10n.foodRoute(
              isolate(o.vendor.name),
              isolate(o.customerName),
            ),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            o.summary,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: c.ink2),
          ),
          const SizedBox(height: 8),
          Text(
            o.total.formatted,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

final vendorsProvider = FutureProvider.autoDispose.family<List<Vendor>, String>(
  (ref, appId) => ref.watch(apiProvider).vendors(appId),
);

class _Vendors extends ConsumerWidget {
  const _Vendors({required this.appId});

  final String appId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    return AsyncBody(
      value: ref.watch(vendorsProvider(appId)),
      onRetry: () => ref.invalidate(vendorsProvider(appId)),
      builder: (items) => items.isEmpty
          ? EmptyState(icon: AppIcons.store, title: l10n.noVendors)
          : RefreshIndicator(
              onRefresh: () => ref.refresh(vendorsProvider(appId).future),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                children: [
                  for (final v in items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Box(
                        child: Row(
                          children: [
                            Icon(AppIcons.store, color: c.accentText),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    v.name,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    '${v.kind} · ${l10n.ordersTodayCount(v.ordersToday)}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: c.ink2,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Tag(
                              !v.active
                                  ? l10n.vendorInactive
                                  : v.open
                                  ? l10n.vendorOpen
                                  : l10n.vendorClosed,
                              tone: !v.active
                                  ? Tone.bad
                                  : v.open
                                  ? Tone.good
                                  : Tone.neutral,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}
