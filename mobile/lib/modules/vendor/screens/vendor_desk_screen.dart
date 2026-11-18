import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../market/screens/market_orders_screen.dart' show marketStatusText;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/vendor_providers.dart';
import '../widgets/vendor_widgets.dart';
import 'vendor_order_screen.dart';
import 'vendor_place_screens.dart';

/// How often the new orders are asked about while the orders are open.
const vendorRefreshEvery = Duration(seconds: 20);

/// 115.70 How often a new order rings while nobody has answered it.
const vendorRingEvery = Duration(seconds: 6);

/// 115.70 What a ring plays: the sound and the buzz (tests count them).
@visibleForTesting
Future<void> Function() vendorRing = newOrderAlert;

/// 115.70 The desk's lists (design 08): new, preparing (accepted or being
/// picked), ready, for later and the last days' finished ones.
enum VendorDeskList { fresh, preparing, ready, later, done }

/// 115 The vendor's orders, for its staff. 115.70 As designed (08): the
/// deep header with the place, who is signed in, the bell while new orders
/// ring and the sound switch, whether it takes orders (or busy for a while,
/// paused, running late), today's numbers; the lists with their counts; a
/// new order rings until someone acts, and is answered on its card: its
/// lines, how it goes and is paid, a ready-in time (10 to 45 minutes) to
/// accept with, or turned down with the panel's reasons. Staff see the
/// customer's first name only.
class VendorDeskScreen extends ConsumerStatefulWidget {
  const VendorDeskScreen({super.key});

  @override
  ConsumerState<VendorDeskScreen> createState() => _VendorDeskScreenState();
}

class _VendorDeskScreenState extends ConsumerState<VendorDeskScreen> {
  VendorDeskList _list = VendorDeskList.fresh;
  bool _switching = false;
  bool _sound = true;
  Timer? _timer;
  Timer? _ring;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(vendorRefreshEvery, (_) {
      if (!ref.read(isVendorProvider)) return;
      ref.read(vendorOrdersProvider(VendorOrderScope.fresh).notifier).refresh();
      ref.invalidate(vendorDeskProvider);
    });
    // 115.70 A new order rings until someone accepts it or turns it down
    // (or the sound is switched off).
    _ring = Timer.periodic(vendorRingEvery, (_) {
      if (!mounted || !_sound || !ref.read(isVendorProvider)) return;
      if (_ringing(ref.read(vendorOrdersProvider(VendorOrderScope.fresh)))) {
        unawaited(vendorRing());
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ring?.cancel();
    super.dispose();
  }

  bool _ringing(PagedState<VendorOrder> fresh) =>
      fresh.items.any((o) => o.status == MarketOrderStatus.placed);

  /// The first ring as soon as an order comes, then [vendorRingEvery].
  void _listenForNew() {
    ref.listen(vendorOrdersProvider(VendorOrderScope.fresh), (prev, next) {
      if (next.loading || next.error != null || !_sound) return;
      final before = {for (final o in prev?.items ?? const []) o.id};
      if (next.items.any((o) => !before.contains(o.id))) {
        unawaited(vendorRing());
      }
    });
  }

  Future<void> _set({
    int? busyMinutes,
    bool? paused,
    bool open = false,
    VendorDelaySet? delay,
    bool endDelay = false,
  }) async {
    setState(() => _switching = true);
    try {
      await ref
          .read(yallappApiProvider)
          .updateVendorDesk(
            busyMinutes: busyMinutes,
            paused: paused,
            endBusy: open,
            delay: delay,
            endDelay: endDelay,
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
        child: SingleChildScrollView(
          // 158 Every choice in reach on a short phone or with a large font.
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
      ),
    );
    if (picked == null || !mounted) return;
    await (picked == 0 ? _set(paused: true) : _set(busyMinutes: picked));
  }

  /// 115.20 Running late: still taking orders, with more minutes and why.
  Future<void> _late() async {
    final delay = await askVendorLate(context);
    if (delay == null || !mounted) return;
    await _set(delay: delay);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final customerView = ref.watch(vendorAppProvider)
        ? null
        : TextButton(
            key: const ValueKey('vendor-customer-view'),
            onPressed: () => context.go(Paths.home),
            style: TextButton.styleFrom(foregroundColor: vendorOnHead),
            child: Text(l10n.customerView),
          );
    if (!ref.watch(isVendorProvider)) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TabHeader(
                title: l10n.tabVendor,
                trailing: ref.watch(vendorAppProvider)
                    ? null
                    : TextButton(
                        key: const ValueKey('vendor-customer-view'),
                        onPressed: () => context.go(Paths.home),
                        child: Text(l10n.customerView),
                      ),
              ),
              Expanded(
                child: MessageView(
                  icon: Symbols.storefront_rounded,
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
    final fresh = ref.watch(vendorOrdersProvider(VendorOrderScope.fresh));
    final active = ref.watch(vendorOrdersProvider(VendorOrderScope.active));
    final later = ref.watch(vendorOrdersProvider(VendorOrderScope.scheduled));
    final newCount = fresh.items.length;
    final preparing = [
      for (final o in active.items)
        if (o.status != MarketOrderStatus.ready) o,
    ];
    final ready = [
      for (final o in active.items)
        if (o.status == MarketOrderStatus.ready) o,
    ];
    final counts = <VendorDeskList, int?>{
      VendorDeskList.fresh: newCount,
      VendorDeskList.preparing: preparing.length,
      VendorDeskList.ready: ready.length,
      VendorDeskList.later: later.items.length,
      VendorDeskList.done: null,
    };
    final labels = {
      VendorDeskList.fresh: l10n.vendorTabNew,
      VendorDeskList.preparing: l10n.vendorTabPreparing,
      VendorDeskList.ready: l10n.vendorTabReady,
      VendorDeskList.later: l10n.vendorTabLater,
      VendorDeskList.done: l10n.vendorTabDone,
    };
    return Scaffold(
      backgroundColor: p.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DeskHead(
            desk: d,
            error: desk.error,
            newCount: newCount,
            sound: _sound,
            switching: _switching,
            trailing: customerView,
            onSound: () => setState(() => _sound = !_sound),
            onBusy: _pause,
            onOpen: () =>
                d?.paused == true ? _set(paused: false) : _set(open: true),
            onRetry: () => ref.invalidate(vendorDeskProvider),
          ),
          // 115.16 The statements (owners and managers), the complaints
          // support shared (everyone but pickers), 115.20 running late and
          // the hours.
          if (d != null && d.answers)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
              child: Wrap(
                spacing: 4,
                children: [
                  if (d.delay != null)
                    TextButton.icon(
                      key: const ValueKey('vendor-late-end'),
                      style: _compact,
                      onPressed: _switching ? null : () => _set(endDelay: true),
                      icon: const Icon(Symbols.hourglass_disabled_rounded),
                      label: Text(l10n.vendorLateEnd),
                    )
                  else if (!d.paused)
                    TextButton.icon(
                      key: const ValueKey('vendor-late'),
                      style: _compact,
                      onPressed: _switching ? null : _late,
                      icon: const Icon(Symbols.hourglass_top_rounded),
                      label: Text(l10n.vendorLate),
                    ),
                  if (d.canEditPlace)
                    TextButton.icon(
                      key: const ValueKey('vendor-hours'),
                      style: _compact,
                      onPressed: () => context.push(Paths.vendorHours),
                      icon: const Icon(Symbols.schedule_rounded),
                      label: Text(l10n.vendorHoursTitle),
                    ),
                  if (d.role == VendorRole.owner ||
                      d.role == VendorRole.manager)
                    TextButton.icon(
                      key: const ValueKey('vendor-statements'),
                      style: _compact,
                      onPressed: () => context.push(Paths.vendorStatements),
                      icon: const Icon(Symbols.receipt_long_rounded),
                      label: Text(l10n.vendorStatementsTitle),
                    ),
                  TextButton.icon(
                    key: const ValueKey('vendor-complaints'),
                    style: _compact,
                    onPressed: () => context.push(Paths.vendorComplaints),
                    icon: const Icon(Symbols.support_agent_rounded),
                    label: Text(l10n.vendorComplaintsTitle),
                  ),
                ],
              ),
            ),
          SizedBox(
            height: 58,
            child: ListView(
              key: const ValueKey('vendor-lists'),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              children: [
                for (final l in VendorDeskList.values)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 6),
                    child: _ListChip(
                      key: ValueKey('vendor-list-${l.name}'),
                      label: labels[l]!,
                      count: counts[l],
                      selected: _list == l,
                      onTap: () => setState(() => _list = l),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: switch (_list) {
              VendorDeskList.fresh => _NewOrders(desk: d),
              VendorDeskList.preparing => _OrderList(
                key: const ValueKey('vendor-preparing'),
                scope: VendorOrderScope.active,
                keep: (o) => o.status != MarketOrderStatus.ready,
              ),
              VendorDeskList.ready => _OrderList(
                key: const ValueKey('vendor-ready-list'),
                scope: VendorOrderScope.active,
                keep: (o) => o.status == MarketOrderStatus.ready,
              ),
              VendorDeskList.later => const _OrderList(
                key: ValueKey('vendor-scheduled'),
                scope: VendorOrderScope.scheduled,
              ),
              VendorDeskList.done => const _OrderList(
                key: ValueKey('vendor-done'),
                scope: VendorOrderScope.done,
              ),
            },
          ),
        ],
      ),
    );
  }
}

/// The desk's small buttons under the header.
final _compact = TextButton.styleFrom(
  visualDensity: VisualDensity.compact,
  padding: const EdgeInsets.symmetric(horizontal: 8),
);

/// The place's role as its staff read it.
String vendorRoleText(AppLocalizations l10n, VendorRole r) => switch (r) {
  VendorRole.owner => l10n.vendorRoleOwner,
  VendorRole.manager => l10n.vendorRoleManager,
  VendorRole.orders => l10n.vendorRoleOrders,
  VendorRole.picker => l10n.vendorRolePicker,
};

class _DeskHead extends ConsumerWidget {
  const _DeskHead({
    required this.desk,
    required this.error,
    required this.newCount,
    required this.sound,
    required this.switching,
    required this.onSound,
    required this.onBusy,
    required this.onOpen,
    required this.onRetry,
    this.trailing,
  });

  final VendorDesk? desk;
  final Object? error;
  final int newCount;
  final bool sound;
  final bool switching;
  final VoidCallback onSound;
  final VoidCallback onBusy;
  final VoidCallback onOpen;
  final VoidCallback onRetry;
  final Widget? trailing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final d = desk;
    final app = ref.watch(appEnvironmentProvider).build.appName;
    final first = (ref.watch(authControllerProvider).user?.name ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .first;
    final state = d == null
        ? null
        : d.paused
        ? l10n.vendorPaused
        : d.busyUntil != null
        ? l10n.deskPausedUntil(clockTime(d.busyUntil!))
        : d.accepting
        ? l10n.deskAccepting
        : l10n.deskClosedHours;
    final bell = newCount > 0
        ? Container(
            key: const ValueKey('vendor-bell'),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: p.accent,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: p.accent.withValues(alpha: 0.25),
                  spreadRadius: 5,
                ),
                BoxShadow(
                  color: p.accent.withValues(alpha: 0.12),
                  spreadRadius: 10,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Symbols.notifications_active_rounded,
                  fill: 1,
                  size: 18,
                  color: p.onAccent,
                ),
                const SizedBox(width: 6),
                Text(
                  l10n.vendorNewCount(newCount),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: p.onAccent,
                  ),
                ),
              ],
            ),
          )
        : null;
    return VendorHead(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: p.accent,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                    bottom: Radius.circular(10),
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: d?.logoUrl != null
                    ? AppNetworkImage(url: d!.logoUrl, width: 40, height: 44)
                    : Text(
                        (d?.name ?? app).characters.firstOrNull ?? '',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: p.onAccent,
                        ),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      d?.name ?? l10n.tabVendor,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (d != null)
                      Text(
                        first.isEmpty
                            ? app
                            : l10n.vendorSignedInAs(
                                app,
                                first,
                                vendorRoleText(l10n, d.role),
                              ),
                        key: const ValueKey('vendor-who'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: vendorOnHead.withValues(alpha: 0.75),
                        ),
                      ),
                  ],
                ),
              ),
              ?trailing,
              if (bell != null) ...[
                const SizedBox(width: 8),
                Flexible(
                  child: FittedBox(fit: BoxFit.scaleDown, child: bell),
                ),
              ],
              const SizedBox(width: 8),
              VendorRoundButton(
                key: const ValueKey('vendor-sound'),
                icon: sound ? Symbols.volume_up_rounded : Symbols.volume_off_rounded,
                label: sound ? l10n.vendorSoundOn : l10n.vendorSoundOff,
                size: 36,
                onTap: onSound,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (d != null)
            Row(
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: vendorGlass,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: d.accepting
                                ? const Color(0xFF3DD68C)
                                : const Color(0xFFFF8F86),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    (d.accepting
                                            ? const Color(0xFF3DD68C)
                                            : const Color(0xFFFF8F86))
                                        .withValues(alpha: 0.25),
                                spreadRadius: 3,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            state!,
                            key: const ValueKey('vendor-state'),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                if (d.answers)
                  if (d.paused || d.busyUntil != null)
                    TextButton(
                      key: const ValueKey('vendor-open-again'),
                      onPressed: switching ? null : onOpen,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFFFD27A),
                      ),
                      child: Text(l10n.deskOpenAgain),
                    )
                  else if (d.open)
                    TextButton(
                      key: const ValueKey('vendor-busy'),
                      onPressed: switching ? null : onBusy,
                      style: TextButton.styleFrom(
                        foregroundColor: vendorOnHead.withValues(alpha: 0.8),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                      ),
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(text: '${l10n.vendorBusyAsk} '),
                            TextSpan(
                              text: l10n.vendorBusyPlus(15),
                              style: const TextStyle(
                                color: Color(0xFFFFD27A),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          // 115.20 Running late, as customers read it.
          if (d?.delay case final delay?)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                [
                  vendorLateText(l10n, delay),
                  if (delay.until case final until?)
                    l10n.vendorLateUntil(clockTime(until)),
                ].join(' · '),
                key: const ValueKey('vendor-late-state'),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFFFD27A),
                ),
              ),
            ),
          if (d != null) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _Stat(
                    label: l10n.vendorOrdersToday,
                    value: '${d.todayOrders}',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Stat(
                    key: const ValueKey('vendor-sales'),
                    label: l10n.vendorSalesToday,
                    value: d.todaySales.formatted,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Stat(
                    label: l10n.vendorNewNow,
                    value: '$newCount',
                    hot: true,
                  ),
                ),
              ],
            ),
          ] else if (error != null)
            ErrorView(error: error!, onRetry: onRetry)
          else
            const SizedBox(height: 60),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    super.key,
    required this.label,
    required this.value,
    this.hot = false,
  });

  final String label;
  final String value;
  final bool hot;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = hot ? p.onAccent : vendorOnHead;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: hot ? p.accent : Colors.white.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 11.5, color: fg.withValues(alpha: 0.95)),
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              value,
              maxLines: 1,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: fg,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ListChip extends StatelessWidget {
  const _ListChip({
    super.key,
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int? count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = selected ? p.background : p.text;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? p.text : p.surface,
        shape: StadiumBorder(
          side: BorderSide(color: selected ? p.text : p.border),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
                if (count != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    constraints: const BoxConstraints(minWidth: 18),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: selected ? p.accent : p.surfaceMuted,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Text(
                      '$count',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: selected ? p.onAccent : p.text,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The new orders: the oldest rings, open, to be answered; the others wait
/// under it.
class _NewOrders extends ConsumerWidget {
  const _NewOrders({required this.desk});

  final VendorDesk? desk;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(vendorOrdersProvider(VendorOrderScope.fresh));
    final notifier = ref.read(
      vendorOrdersProvider(VendorOrderScope.fresh).notifier,
    );
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
              icon: Symbols.receipt_long_rounded,
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
        key: const ValueKey('vendor-fresh'),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: state.items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, i) => VendorNewOrderCard(
          key: ValueKey('vendor-order-${state.items[i].id}'),
          order: state.items[i],
          desk: desk,
          open: i == 0,
        ),
      ),
    );
  }
}

/// 115.70 A new order on the desk (design 08): the first rings, open, with
/// its lines, the ready-in time and its answers; the next ones are closed.
class VendorNewOrderCard extends ConsumerStatefulWidget {
  const VendorNewOrderCard({
    super.key,
    required this.order,
    required this.desk,
    required this.open,
  });

  final VendorOrder order;
  final VendorDesk? desk;
  final bool open;

  @override
  ConsumerState<VendorNewOrderCard> createState() => _NewOrderCardState();
}

/// The ready-in time first offered: the place's own, else the nearest.
int vendorDefaultPrep(int prepMinutes) {
  var best = vendorPrepChoices.first;
  for (final m in vendorPrepChoices) {
    if ((m - prepMinutes).abs() < (best - prepMinutes).abs()) best = m;
  }
  return best;
}

class _NewOrderCardState extends ConsumerState<VendorNewOrderCard> {
  int? _minutes;
  bool _busy = false;

  Future<void> _accept(int minutes) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .acceptVendorOrder(widget.order.id, minutes);
      if (!mounted) return;
      showMessage(context, l10n.deskAccepted);
      reloadVendor(ref, widget.order.id);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject() async {
    final l10n = context.l10n;
    final picked = await askVendorRejection(context);
    if (picked == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .rejectVendorOrder(widget.order.id, picked.reason, note: picked.note);
      if (!mounted) return;
      showMessage(context, l10n.deskRejected);
      reloadVendor(ref, widget.order.id);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final o = widget.order;
    final open = widget.open;
    final answers = widget.desk?.answers ?? true;
    final minutes =
        _minutes ?? vendorDefaultPrep(widget.desk?.prepMinutes ?? 20);
    final ago = DateTime.now().difference(o.createdAt).inMinutes;
    final weighed = o.lines.where((l) => l.unit != ProductUnit.item).length;
    final ownDriver = widget.desk?.deliveryBy == VendorDelivery.vendor;
    final tag = VendorTag(
      label: open ? l10n.vendorRinging : l10n.vendorNewTag,
      icon: open ? Symbols.graphic_eq_rounded : null,
      upper: true,
      background: open ? p.accent : p.accentSoft,
      foreground: open ? p.onAccent : p.text,
    );
    final refStyle = TextStyle(
      fontSize: open ? 18 : 16,
      fontWeight: FontWeight.w800,
      color: p.text,
    );
    final priceStyle = TextStyle(
      fontSize: open ? 16 : 15,
      fontWeight: FontWeight.w800,
      color: p.text,
    );
    final ref = Text(
      o.reference,
      key: ValueKey('vendor-order-${o.id}-reference'),
      maxLines: 1,
      style: refStyle,
    );
    final who = Text(
      '${o.customerName} · ${ago < 1 ? l10n.vendorJustNow : l10n.vendorAgo(ago)}',
      key: ValueKey('vendor-order-${o.id}-customer'),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(fontSize: 12.5, color: p.textSecondary),
    );
    final price = Text(o.subtotal.formatted, maxLines: 1, style: priceStyle);
    // As designed, on one line: the tag, the number, who and when, the
    // price. With big text on a small phone, who and when go under.
    final head = LayoutBuilder(
      builder: (context, box) {
        final scaler = MediaQuery.textScalerOf(context);
        final base = DefaultTextStyle.of(context).style;
        double width(String text, TextStyle style) => (TextPainter(
          text: TextSpan(text: text, style: base.merge(style)),
          textDirection: Directionality.of(context),
          textScaler: scaler,
          maxLines: 1,
        )..layout()).width;
        final tagWidth =
            width(
              (open ? l10n.vendorRinging : l10n.vendorNewTag).toUpperCase(),
              const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
            ) +
            (open ? 32 : 16);
        final needed =
            tagWidth +
            width(o.reference, refStyle) +
            width(o.subtotal.formatted, priceStyle) +
            18 +
            48;
        if (needed <= box.maxWidth) {
          return Row(
            children: [
              tag,
              const SizedBox(width: 10),
              ref,
              const SizedBox(width: 8),
              Expanded(child: who),
              price,
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Flexible(flex: 2, child: tag),
                const SizedBox(width: 10),
                Flexible(
                  child: FittedBox(fit: BoxFit.scaleDown, child: ref),
                ),
                const Spacer(),
                Flexible(
                  flex: 2,
                  child: FittedBox(fit: BoxFit.scaleDown, child: price),
                ),
              ],
            ),
            const SizedBox(height: 4),
            who,
          ],
        );
      },
    );
    final meta = Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        if (o.pickup)
          VendorMeta(icon: Symbols.storefront_rounded, label: l10n.vendorPickupTag)
        else if (ownDriver)
          VendorMeta(icon: Symbols.two_wheeler_rounded, label: l10n.vendorByOwnDriver)
        else
          VendorMeta(icon: Symbols.two_wheeler_rounded, label: l10n.vendorByAppCourier),
        VendorMeta(
          icon: o.payMethod == MarketPayMethod.cash
              ? Symbols.payments_rounded
              : o.payMethod == MarketPayMethod.wallet
              ? Symbols.account_balance_wallet_rounded
              : Symbols.credit_card_rounded,
          label: payText(l10n, o.payMethod),
        ),
        if (open && weighed > 0)
          VendorMeta(icon: Symbols.scale_rounded, label: l10n.vendorByWeight(weighed)),
        VendorMeta(
          icon: Symbols.shopping_basket_rounded,
          label: l10n.vendorItemCount(o.lines.length),
        ),
      ],
    );
    final shown = o.lines.take(3).toList();
    final more = o.lines.length - shown.length;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: open
            ? Border.all(color: p.accent, width: 2)
            : Border.all(color: p.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.4 : 0.08),
            blurRadius: open ? 24 : 12,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => context.push(Paths.vendorOrder(o.id)),
          child: Padding(
            padding: EdgeInsets.all(open ? 14 : 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                head,
                const SizedBox(height: 10),
                meta,
                if (open) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: p.surfaceMuted.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: p.divider),
                    ),
                    child: Column(
                      children: [
                        for (final l in shown)
                          _LinePreview(
                            amount: amountText(l10n, l.quantity, l.unit),
                            name: l.name,
                            weigh: l.unit != ProductUnit.item,
                          ),
                        if (more > 0)
                          _LinePreview(
                            amount: '+$more',
                            name: l10n.vendorMoreItems,
                            muted: true,
                          ),
                      ],
                    ),
                  ),
                  if (answers) ...[
                    const SizedBox(height: 12),
                    Text(
                      l10n.vendorReadyIn,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        for (final m in vendorPrepChoices) ...[
                          if (m != vendorPrepChoices.first)
                            const SizedBox(width: 6),
                          Expanded(
                            child: _MinutesChip(
                              key: ValueKey('vendor-card-prep-$m'),
                              minutes: m,
                              selected: m == minutes,
                              onTap: () => setState(() => _minutes = m),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          flex: 10,
                          child: OutlinedButton(
                            key: const ValueKey('vendor-card-reject'),
                            onPressed: _busy ? null : _reject,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 50),
                              shape: const StadiumBorder(),
                              side: BorderSide(color: p.border, width: 1.5),
                              foregroundColor: p.text,
                            ),
                            child: Text(
                              l10n.vendorTurnDown,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 22,
                          child: FilledButton.icon(
                            key: const ValueKey('vendor-card-accept'),
                            onPressed: _busy ? null : () => _accept(minutes),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 50),
                              shape: const StadiumBorder(),
                              backgroundColor: p.primary,
                              foregroundColor: p.onPrimary,
                            ),
                            icon: const Icon(Symbols.check_rounded),
                            label: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                l10n.vendorAcceptReady(
                                  clockTime(
                                    DateTime.now().add(
                                      Duration(minutes: minutes),
                                    ),
                                  ),
                                ),
                                maxLines: 1,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LinePreview extends StatelessWidget {
  const _LinePreview({
    required this.amount,
    required this.name,
    this.weigh = false,
    this.muted = false,
  });

  final String amount;
  final String name;
  final bool weigh;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 52),
            child: Text(
              amount,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: muted ? p.textSecondary : p.primary,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 13,
                color: muted ? p.textSecondary : p.text,
              ),
            ),
          ),
          if (weigh)
            VendorTag(
              label: l10n.vendorWeighTag,
              background: p.accentSoft,
              foreground: p.text,
            ),
        ],
      ),
    );
  }
}

class _MinutesChip extends StatelessWidget {
  const _MinutesChip({
    super.key,
    required this.minutes,
    required this.selected,
    required this.onTap,
  });

  final int minutes;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Semantics(
      selected: selected,
      button: true,
      label: l10n.restaurantMinutes(minutes),
      excludeSemantics: true,
      child: Material(
        color: selected ? vendorTint(p) : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: selected ? p.primary : p.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$minutes',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: selected ? vendorTintInk(p) : p.text,
                  ),
                ),
                Text(
                  l10n.vendorMin,
                  maxLines: 1,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: selected ? vendorTintInk(p) : p.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({super.key, required this.scope, this.keep});

  final VendorOrderScope scope;
  final bool Function(VendorOrder order)? keep;

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
    final items = [
      for (final o in state.items)
        if (keep == null || keep!(o)) o,
    ];
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          children: [
            MessageView(
              icon: Symbols.receipt_long_rounded,
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
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) => VendorOrderTile(
          key: ValueKey('vendor-order-${items[i].id}'),
          order: items[i],
          onTap: () => context.push(Paths.vendorOrder(items[i].id)),
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
            o.pickup ? Symbols.storefront_rounded : Symbols.two_wheeler_rounded,
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
