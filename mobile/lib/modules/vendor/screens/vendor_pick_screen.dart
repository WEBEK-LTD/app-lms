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
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../market/data/market_providers.dart';
import '../data/vendor_providers.dart';
import '../widgets/vendor_widgets.dart';

/// The amount as typed in the picking: whole units, or the weight with
/// up to three decimals.
String pickAmountText(double v, ProductUnit unit) {
  if (unit == ProductUnit.item || unit == ProductUnit.g) {
    return v.round().toString();
  }
  final s = v.toStringAsFixed(3);
  return s.replaceFirst(RegExp(r'\.?0+$'), '');
}

/// A line's ordered amount as the picker reads it: "2×", "1.5 kg".
String pickOrderedText(MarketOrderLine l) => switch (l.unit) {
  ProductUnit.item => '${l.quantity.round()}×',
  ProductUnit.kg => '${pickAmountText(l.quantity, l.unit)} kg',
  ProductUnit.g => '${l.quantity.round()} g',
  ProductUnit.l => '${pickAmountText(l.quantity, l.unit)} l',
};

/// How often the order is read again while a substitute waits for the
/// customer.
const vendorProposalRefresh = Duration(seconds: 5);

/// Where a line stands in the picking.
enum PickState { open, waiting, done }

/// 115.71 A line's place in the picking: done (picked, out or swapped, and
/// no question waiting), waiting for the customer's answer, or still to do.
PickState pickStateOf(VendorOrder o, MarketOrderLine l, DateTime now) {
  if (o.proposals[l.id]?.waitingAt(now) ?? false) return PickState.waiting;
  return l.outcome == null ? PickState.open : PickState.done;
}

/// 115.71 Whether the order can be marked ready: every line done, no
/// substitute waiting for the customer.
bool pickReady(VendorOrder o, DateTime now) => o.lines
    .where((l) => l.id != null)
    .every((l) => pickStateOf(o, l, now) == PickState.done);

/// 115.16 A grocery's or shop's order picked line by line. 115.71 As
/// designed (09): the lines by aisle, each with the customer's "If
/// something is missing" choice; the open line weighed on a keypad (a
/// connected scale later) with what the scale reads and what is charged:
/// never above the estimate for an order paid online, never more than the
/// tolerance over it for cash (D1), refused above it; Out, Swap (the
/// customer's own pick brought, or a similar one offered to them for 5
/// minutes, D2) and Picked, each saved at once; Ready stays off until every
/// line is done or answered.
class VendorPickScreen extends ConsumerStatefulWidget {
  const VendorPickScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<VendorPickScreen> createState() => _VendorPickScreenState();
}

class _VendorPickScreenState extends ConsumerState<VendorPickScreen> {
  /// The order as the last answer left it, before the next read.
  VendorOrder? _latest;
  int? _openId;
  final _typed = <int, String>{};
  bool _saving = false;
  Timer? _tick;
  Timer? _refresh;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    _refresh = Timer.periodic(vendorProposalRefresh, (_) {
      final o = _latest;
      if (!mounted || o == null) return;
      // The customer's answer, or the order's choice once the time is up.
      if (o.proposals.isNotEmpty &&
          o.lines.any(
            (l) =>
                pickStateOf(o, l, _now) == PickState.waiting ||
                (o.proposals[l.id] != null && l.outcome == null),
          )) {
        ref.invalidate(vendorOrderProvider(widget.orderId));
      }
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _refresh?.cancel();
    super.dispose();
  }

  Future<void> _run(Future<VendorOrder> Function() call) async {
    setState(() => _saving = true);
    try {
      final o = await call();
      if (!mounted) return;
      setState(() {
        _latest = o;
        _openId = null;
      });
      reloadVendor(ref);
      ref.invalidate(vendorOrderProvider(widget.orderId));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pick(
    VendorOrder o,
    MarketOrderLine l,
    PickOutcome outcome, {
    double? quantity,
  }) => _run(
    () => ref.read(yallappApiProvider).pickVendorOrder(o.id, [
      PickLine(lineId: l.id!, outcome: outcome, quantity: quantity),
    ]),
  );

  Future<void> _swap(VendorOrder o, MarketOrderLine l) async {
    // The customer chose what to bring: no question, it's brought.
    if (l.ifMissing == MarketIfMissing.chosen) {
      await _pick(o, l, PickOutcome.substituted);
      return;
    }
    final product = await showModalBottomSheet<MarketProduct>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.palette.surface,
      builder: (_) => _SubstituteSheet(line: l),
    );
    if (product == null || !mounted) return;
    final l10n = context.l10n;
    await _run(
      () => ref
          .read(yallappApiProvider)
          .proposeVendorSubstitute(
            o.id,
            l.id!,
            productId: product.id,
            quantity: l.quantity,
          ),
    );
    if (mounted) showMessage(context, l10n.vendorSwapAsked);
  }

  /// A keypad key on a line's weight: a digit, or back.
  void _press(int lineId, String key) {
    final typed = _typed[lineId] ?? '';
    setState(() {
      if (key == '⌫') {
        if (typed.isNotEmpty) {
          _typed[lineId] = typed.substring(0, typed.length - 1);
        }
      } else if (typed.length < 6) {
        _typed[lineId] = typed == '0' ? key : '$typed$key';
      }
    });
  }

  Future<void> _ready(VendorOrder o) async {
    final l10n = context.l10n;
    setState(() => _saving = true);
    try {
      await ref.read(yallappApiProvider).readyVendorOrder(o.id);
      if (!mounted) return;
      showMessage(context, l10n.deskMarkedReady);
      reloadVendor(ref, o.id);
      context.pop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(vendorOrderProvider(widget.orderId));
    ref.listen(vendorOrderProvider(widget.orderId), (_, next) {
      if (next.value case final o?) setState(() => _latest = o);
    });
    final order = async.value ?? _latest;
    final tolerance =
        ref.watch(marketConfigProvider)?.weightTolerancePercent ?? 0;
    final desk = ref.watch(vendorDeskProvider).value;
    if (order == null) {
      return Scaffold(
        backgroundColor: p.background,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            VendorHead(
              child: Row(
                children: [
                  VendorRoundButton(
                    icon: Symbols.arrow_back_rounded,
                    label: MaterialLocalizations.of(context).backButtonTooltip,
                    onTap: () => context.pop(),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l10n.vendorPickItems,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: async.hasError
                  ? ErrorView(
                      error: async.error!,
                      onRetry: () =>
                          ref.invalidate(vendorOrderProvider(widget.orderId)),
                    )
                  : const SkeletonDetail(),
            ),
          ],
        ),
      );
    }
    final o = order;
    final lines = [
      for (final l in o.lines)
        if (l.id != null) l,
    ];
    final states = {for (final l in lines) l.id!: pickStateOf(o, l, _now)};
    final doneCount = states.values.where((s) => s == PickState.done).length;
    // The open line: the one tapped, else the first still to do.
    final openId = (_openId != null && states[_openId] == PickState.open)
        ? _openId
        : lines.where((l) => states[l.id] == PickState.open).firstOrNull?.id;
    // By aisle, in the place's order; lines in no aisle last.
    final groups = <int?, List<MarketOrderLine>>{};
    for (final l in lines) {
      (groups[o.aisles[l.id]?.id] ??= []).add(l);
    }
    final order0 = groups.keys.toList()
      ..sort((a, b) {
        if (a == null) return 1;
        if (b == null) return -1;
        final pa = o.aisles.values.firstWhere((x) => x.id == a).position;
        final pb = o.aisles.values.firstWhere((x) => x.id == b).position;
        return pa.compareTo(pb);
      });
    final ownDriver = desk?.deliveryBy == VendorDelivery.vendor;
    final readyLabel = o.pickup
        ? l10n.vendorReadyForPickup
        : ownDriver
        ? l10n.vendorReadyForDriver
        : l10n.vendorReadyForCourier;
    final ready = pickReady(o, _now);
    final left = [
      for (final l in lines)
        if (states[l.id] == PickState.waiting)
          l10n.vendorWaitingCustomer(l.name)
        else if (states[l.id] == PickState.open)
          l.name,
    ];
    final since = o.acceptedAt;
    final sub = [
      if (o.readyAt != null)
        !o.pickup && !ownDriver
            ? l10n.vendorCourierComes(clockTime(o.readyAt!))
            : l10n.vendorReadyBy(clockTime(o.readyAt!)),
      if (since != null)
        l10n.vendorPickingFor(minutesSeconds(_now.difference(since))),
    ].join(' · ');
    return Scaffold(
      backgroundColor: p.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          VendorHead(
            bottom: 12,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    VendorRoundButton(
                      key: const ValueKey('vendor-pick-back'),
                      icon: Symbols.arrow_back_rounded,
                      label: MaterialLocalizations.of(context)
                          .backButtonTooltip,
                      onTap: () => context.pop(),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.vendorOrderTitle(o.reference, o.customerName),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (sub.isNotEmpty)
                            Text(
                              sub,
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
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: vendorGlass,
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Text(
                        '$doneCount/${lines.length}',
                        key: const ValueKey('vendor-pick-progress'),
                        textDirection: TextDirection.ltr,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: SizedBox(
                    height: 8,
                    child: Row(
                      children: [
                        for (final (i, l) in lines.indexed) ...[
                          if (i > 0) const SizedBox(width: 3),
                          Expanded(
                            child: ColoredBox(
                              color: switch (states[l.id]) {
                                PickState.done => vendorOnHead,
                                PickState.waiting => p.accent,
                                _ => vendorGlass,
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async =>
                  ref.invalidate(vendorOrderProvider(widget.orderId)),
              child: ListView(
                key: const ValueKey('vendor-pick-list'),
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  for (final g in order0) ...[
                    _AisleHeading(
                      aisle: g == null
                          ? null
                          : o.aisles.values.firstWhere((a) => a.id == g),
                    ),
                    for (final l in groups[g]!)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _PickCard(
                          key: ValueKey('vendor-pick-${l.id}'),
                          order: o,
                          line: l,
                          state: states[l.id]!,
                          open: l.id == openId,
                          now: _now,
                          tolerance: tolerance,
                          typed: _typed[l.id!] ?? '',
                          busy: _saving,
                          onKey: (k) => _press(l.id!, k),
                          onOpen: () => setState(() => _openId = l.id),
                          onOut: () => _pick(o, l, PickOutcome.missing),
                          onSwap: () => _swap(o, l),
                          onPicked: (q) =>
                              _pick(o, l, PickOutcome.picked, quantity: q),
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            decoration: BoxDecoration(
              color: p.background,
              border: Border(top: BorderSide(color: p.border)),
            ),
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(bottom: 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Opacity(
                    opacity: ready ? 1 : 0.5,
                    child: FilledButton.icon(
                      key: const ValueKey('vendor-pick-ready'),
                      onPressed: ready && !_saving ? () => _ready(o) : null,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(54),
                        shape: const StadiumBorder(),
                        backgroundColor: p.accent,
                        foregroundColor: p.onAccent,
                        disabledBackgroundColor: p.accent,
                        disabledForegroundColor: p.onAccent,
                      ),
                      icon: Icon(
                        o.pickup ? Symbols.storefront_rounded : Symbols.two_wheeler_rounded,
                        fill: 1,
                      ),
                      label: Text(
                        readyLabel,
                        style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  if (left.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    Text(
                      l10n.vendorLinesLeft(left.length, left.join(', ')),
                      key: const ValueKey('vendor-pick-left'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AisleHeading extends StatelessWidget {
  const _AisleHeading({required this.aisle});

  final VendorAisle? aisle;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final a = aisle;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final text = a == null
        ? l10n.vendorOtherItems
        : l10n.vendorAisle(a.name, a.position);
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 14, 2, 6),
      child: Row(
        children: [
          Icon(Symbols.shelves_rounded, size: 16, color: p.textSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              rtl ? text : text.toUpperCase(),
              style: TextStyle(
                fontSize: rtl ? 12 : 11,
                fontWeight: FontWeight.w800,
                letterSpacing: rtl ? 0 : 1.2,
                color: p.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PickCard extends StatelessWidget {
  const _PickCard({
    super.key,
    required this.order,
    required this.line,
    required this.state,
    required this.open,
    required this.now,
    required this.tolerance,
    required this.typed,
    required this.busy,
    required this.onKey,
    required this.onOpen,
    required this.onOut,
    required this.onSwap,
    required this.onPicked,
  });

  final VendorOrder order;
  final MarketOrderLine line;
  final PickState state;
  final bool open;
  final DateTime now;
  final int tolerance;
  final String typed;
  final bool busy;
  final ValueChanged<String> onKey;
  final VoidCallback onOpen;
  final VoidCallback onOut;
  final VoidCallback onSwap;
  final ValueChanged<double?> onPicked;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final l = line;
    final weighed = l.unit != ProductUnit.item;
    final done = state == PickState.done;
    final waiting = state == PickState.waiting;
    final proposal = order.proposals[l.id];
    final pay = order.payMethod;
    final choice = switch (l.ifMissing) {
      MarketIfMissing.similar => (
        l10n.vendorIfOutSimilar,
        Symbols.published_with_changes_rounded,
        vendorTint(p),
        vendorTintInk(p),
      ),
      MarketIfMissing.chosen => (
        l10n.vendorIfOutChosen,
        Symbols.person_check_rounded,
        p.accentSoft,
        p.text,
      ),
      MarketIfMissing.remove => (
        l10n.vendorIfOutRemove,
        Symbols.remove_shopping_cart_rounded,
        p.surfaceMuted,
        p.textSecondary,
      ),
    };
    final unitPrice = l.unit == ProductUnit.item
        ? l.unitPrice.formatted
        : '${l.unitPrice.formatted}/${unitShort(l10n, l.unit)}';
    // What it says under the name.
    final Widget ask = switch (l.outcome) {
      _ when waiting => Text(
        l10n.vendorLineOut,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: p.danger,
        ),
      ),
      'picked' when weighed && l.pickedQuantity != null => Text(
        l10n.vendorWeighed(
          amountText(l10n, l.pickedQuantity!, l.unit),
          amountText(l10n, l.quantity, l.unit),
          l.total.formatted,
        ),
        style: TextStyle(fontSize: 12.5, color: p.textSecondary),
      ),
      'picked' => Text(
        l10n.vendorPickedLine(
          amountText(l10n, l.pickedQuantity ?? l.quantity, l.unit),
          l.total.formatted,
        ),
        style: TextStyle(fontSize: 12.5, color: p.textSecondary),
      ),
      'substituted' => Text(
        l.ifMissing == MarketIfMissing.chosen
            ? l10n.vendorTheirPick(l.name)
            : l10n.vendorInsteadOf(l.name),
        style: TextStyle(fontSize: 12.5, color: p.textSecondary),
      ),
      'missing' => Text(
        l10n.vendorLeftOut,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: p.danger,
        ),
      ),
      _ => Text.rich(
        TextSpan(
          children: [
            TextSpan(text: '${l10n.vendorAsked} '),
            TextSpan(
              text: amountText(l10n, l.quantity, l.unit),
              style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
            ),
            TextSpan(text: ' · $unitPrice'),
          ],
        ),
        style: TextStyle(fontSize: 12.5, color: p.textSecondary),
      ),
    };
    final name = l.outcome == 'substituted' && l.substituteName != null
        ? l.substituteName!
        : l.name;
    final head = Row(
      children: [
        Opacity(
          opacity: waiting || l.outcome == 'missing' ? 0.6 : 1,
          child: ColorFiltered(
            colorFilter: waiting || l.outcome == 'missing'
                ? const ColorFilter.matrix([
                    0.33, 0.33, 0.33, 0, 0, //
                    0.33, 0.33, 0.33, 0, 0, //
                    0.33, 0.33, 0.33, 0, 0, //
                    0, 0, 0, 1, 0,
                  ])
                : const ColorFilter.mode(Colors.transparent, BlendMode.dst),
            child: AppNetworkImage(
              url: l.imageUrl,
              width: 44,
              height: 44,
              radius: 13,
              placeholderIcon: Symbols.shopping_basket_rounded,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: name),
                    if (!weighed && l.quantity != 1)
                      TextSpan(
                        text: ' ${amountText(l10n, l.quantity, l.unit)}',
                        style: TextStyle(color: p.textSecondary),
                      ),
                  ],
                ),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 1),
              ask,
              if (open && !done && !waiting) ...[
                const SizedBox(height: 4),
                VendorTag(
                  key: ValueKey('vendor-pick-${l.id}-choice'),
                  label: choice.$1,
                  icon: choice.$2,
                  background: choice.$3,
                  foreground: choice.$4,
                ),
              ],
            ],
          ),
        ),
        if (done || waiting)
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: waiting
                  ? p.accent
                  : l.outcome == 'missing'
                  ? p.surfaceMuted
                  : p.primary,
            ),
            child: Icon(
              waiting
                  ? Symbols.hourglass_top_rounded
                  : l.outcome == 'missing'
                  ? Symbols.remove_rounded
                  : Symbols.check_rounded,
              fill: waiting ? 1 : 0,
              size: 17,
              color: waiting
                  ? p.onAccent
                  : l.outcome == 'missing'
                  ? p.textSecondary
                  : p.onPrimary,
            ),
          ),
      ],
    );
    final body = <Widget>[head];
    if (waiting && proposal != null) {
      final left = proposal.expiresAt?.difference(now);
      body.add(
        Container(
          key: ValueKey('vendor-pick-${l.id}-waiting'),
          margin: const EdgeInsets.only(top: 9),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: p.accentSoft,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              AppNetworkImage(
                url: proposal.imageUrl,
                width: 30,
                height: 30,
                radius: 9,
                placeholderIcon: Symbols.swap_horiz_rounded,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      [
                        proposal.name,
                        if (!weighed && proposal.quantity != 1)
                          amountText(l10n, proposal.quantity, l.unit),
                      ].join(' '),
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    Text(
                      l10n.vendorAskedCustomer(
                        minutesSeconds(left ?? Duration.zero),
                      ),
                      style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (open && !done && !waiting) {
      final typedNum = int.tryParse(typed);
      final quantity = weighed && typedNum != null
          ? keypadToQuantity(typedNum, l.unit)
          : null;
      final cap = weightCap(l, pay, tolerance);
      final over = weighed && quantity != null && quantity > cap + 1e-9;
      if (weighed) {
        final price = quantity == null ? null : chargeFor(l, quantity);
        final capText = [
          amountText(l10n, cap, l.unit),
          moneyLike(l.unitPrice, chargeFor(l, cap)),
        ];
        body.addAll([
          const SizedBox(height: 10),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  flex: 13,
                  child: Container(
                    key: ValueKey('vendor-pick-${l.id}-weight'),
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    decoration: BoxDecoration(
                      color: p.surfaceMuted.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: over ? p.danger : p.primary,
                        width: 2,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.vendorActualWeight,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: p.textSecondary,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          textDirection: TextDirection.ltr,
                          children: [
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  typed.isEmpty ? '0' : typed,
                                  key: ValueKey('vendor-pick-${l.id}-typed'),
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.8,
                                    color: typed.isEmpty
                                        ? p.textTertiary
                                        : over
                                        ? p.danger
                                        : p.text,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              keypadUnit(l10n, l.unit),
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: p.textSecondary,
                              ),
                            ),
                            Container(
                              width: 2,
                              height: 22,
                              margin: const EdgeInsetsDirectional.only(
                                start: 2,
                              ),
                              color: p.primary,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 10,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    decoration: BoxDecoration(
                      color: vendorHeadColor(p),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          l10n.vendorPriceLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: vendorOnHead.withValues(alpha: 0.75),
                          ),
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(
                            price == null ? '—' : moneyLike(l.unitPrice, price),
                            key: ValueKey('vendor-pick-${l.id}-price'),
                            maxLines: 1,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: vendorOnHead,
                            ),
                          ),
                        ),
                        Text(
                          switch (pay) {
                            MarketPayMethod.cash => l10n.vendorCapCash(
                              capText[0],
                              capText[1],
                            ),
                            MarketPayMethod.wallet => l10n.vendorCapWallet(
                              capText[0],
                              capText[1],
                            ),
                            _ => l10n.vendorCapCard(capText[0], capText[1]),
                          },
                          key: ValueKey('vendor-pick-${l.id}-cap'),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFFFD27A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (over)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                l10n.vendorOverCap(amountText(l10n, cap, l.unit)),
                key: ValueKey('vendor-pick-${l.id}-over'),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: p.danger,
                ),
              ),
            ),
          const SizedBox(height: 8),
          _Keypad(
            lineId: l.id!,
            onKey: onKey,
            onScale: () => showMessage(context, l10n.vendorScaleLater),
          ),
        ]);
      }
      final canSwap = l.ifMissing != MarketIfMissing.remove;
      body.addAll([
        const SizedBox(height: 9),
        Row(
          children: [
            Expanded(
              flex: 10,
              child: _PickButton(
                key: ValueKey('vendor-pick-${l.id}-missing'),
                icon: Symbols.remove_shopping_cart_rounded,
                label: l10n.vendorOut,
                background: p.isDark
                    ? p.danger.withValues(alpha: 0.16)
                    : p.danger.withValues(alpha: 0.12),
                foreground: p.danger,
                onTap: busy ? null : onOut,
              ),
            ),
            if (canSwap) ...[
              const SizedBox(width: 6),
              Expanded(
                flex: 10,
                child: _PickButton(
                  key: ValueKey('vendor-pick-${l.id}-substituted'),
                  icon: Symbols.swap_horiz_rounded,
                  label: l.ifMissing == MarketIfMissing.chosen
                      ? l10n.vendorBringTheirPick
                      : l10n.vendorSwap,
                  outlined: true,
                  foreground: p.text,
                  onTap: busy ? null : onSwap,
                ),
              ),
            ],
            const SizedBox(width: 6),
            Expanded(
              flex: 14,
              child: _PickButton(
                key: ValueKey('vendor-pick-${l.id}-picked'),
                icon: Symbols.check_rounded,
                label: l10n.vendorPickedButton,
                background: p.primary,
                foreground: p.onPrimary,
                onTap: busy || over || (weighed && quantity == null)
                    ? null
                    : () => onPicked(weighed ? quantity : l.quantity),
              ),
            ),
          ],
        ),
      ]);
    }
    final card = Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: done ? p.surface.withValues(alpha: 0.72) : p.surface,
        borderRadius: BorderRadius.circular(20),
        border: open && !done && !waiting
            ? Border.all(color: p.primary, width: 2)
            : done
            ? Border.all(color: p.border)
            : null,
        boxShadow: done
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: p.isDark ? 0.35 : 0.07),
                  blurRadius: open ? 24 : 12,
                  offset: const Offset(0, 6),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: body,
      ),
    );
    return Opacity(
      opacity: done ? 0.72 : 1,
      child: open || done || waiting
          ? card
          : GestureDetector(
              key: ValueKey('vendor-pick-${l.id}-open'),
              onTap: onOpen,
              child: card,
            ),
    );
  }
}

class _PickButton extends StatelessWidget {
  const _PickButton({
    super.key,
    required this.icon,
    required this.label,
    required this.foreground,
    required this.onTap,
    this.background,
    this.outlined = false,
  });

  final IconData icon;
  final String label;
  final Color foreground;
  final Color? background;
  final bool outlined;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = onTap == null && !outlined
        ? foreground.withValues(alpha: 0.5)
        : foreground;
    return Semantics(
      button: true,
      enabled: onTap != null,
      child: Material(
        color: background ?? Colors.transparent,
        shape: StadiumBorder(
          side: outlined
              ? BorderSide(color: p.border, width: 1.5)
              : BorderSide.none,
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 40),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 18, color: fg),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 2,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: fg,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The weight's keypad: the digits, back, and the scale (a connected scale
/// comes later), left to right in every language.
class _Keypad extends StatelessWidget {
  const _Keypad({
    required this.lineId,
    required this.onKey,
    required this.onScale,
  });

  final int lineId;
  final ValueChanged<String> onKey;
  final VoidCallback onScale;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget key(
      String k, {
      Widget? child,
      VoidCallback? onTap,
      Color? bg,
      int flex = 1,
    }) => Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.all(2.5),
        child: Material(
          color: bg ?? p.surfaceMuted,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            key: ValueKey('vendor-key-$lineId-$k'),
            borderRadius: BorderRadius.circular(10),
            onTap: onTap ?? () => onKey(k),
            child: SizedBox(
              height: 34,
              child: Center(
                child:
                    child ??
                    Text(
                      k,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
              ),
            ),
          ),
        ),
      ),
    );
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: [
          Row(
            children: [
              for (final k in ['1', '2', '3', '4', '5', '6']) key(k),
            ],
          ),
          Row(
            children: [
              for (final k in ['7', '8', '9', '0']) key(k),
              key('⌫', child: Icon(Symbols.backspace_rounded, size: 18, color: p.text)),
              key(
                'scale',
                onTap: onScale,
                bg: vendorTint(p),
                child: Semantics(
                  label: l10n.vendorFromScale,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Symbols.scale_rounded,
                            fill: 1,
                            size: 16,
                            color: vendorTintInk(p),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            l10n.vendorFromScale,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: vendorTintInk(p),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 115.71 (D2) A similar item to offer the customer: in stock, never dearer
/// than the line (the server keeps it to the same aisle).
class _SubstituteSheet extends ConsumerStatefulWidget {
  const _SubstituteSheet({required this.line});

  final MarketOrderLine line;

  @override
  ConsumerState<_SubstituteSheet> createState() => _SubstituteSheetState();
}

class _SubstituteSheetState extends ConsumerState<_SubstituteSheet> {
  String _query = '';
  late Future<Paged<MarketProduct>> _found = _search();

  Future<Paged<MarketProduct>> _search() => ref
      .read(yallappApiProvider)
      .listVendorProducts(query: _query.isEmpty ? null : _query);

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final most = moneyValue(widget.line.unitPrice);
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.7,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 2),
              child: Text(
                l10n.vendorSwapTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                '${l10n.vendorSwapRule(widget.line.unitPrice.formatted)} ${l10n.vendorSwapNote}',
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                key: const ValueKey('vendor-substitute-search'),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l10n.vendorStockHint,
                  prefixIcon: const Icon(Symbols.search_rounded),
                ),
                onSubmitted: (v) => setState(() {
                  _query = v.trim();
                  _found = _search();
                }),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: FutureBuilder<Paged<MarketProduct>>(
                future: _found,
                builder: (context, snap) {
                  if (snap.hasError) {
                    return ErrorView(
                      error: snap.error!,
                      onRetry: () => setState(() => _found = _search()),
                    );
                  }
                  if (snap.connectionState != ConnectionState.done) {
                    return const SkeletonList(layout: SkeletonLayout.text);
                  }
                  final items = [
                    for (final i in snap.data?.items ?? const <MarketProduct>[])
                      if (i.inStock &&
                          i.id != widget.line.productId &&
                          i.unit == widget.line.unit &&
                          moneyValue(i.price) <= most + 1e-9)
                        i,
                  ];
                  if (items.isEmpty) {
                    return MessageView(
                      icon: Symbols.inventory_2_rounded,
                      title: l10n.vendorSwapNone,
                    );
                  }
                  return ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, i) => ListTile(
                      key: ValueKey('vendor-substitute-${items[i].id}'),
                      leading: AppNetworkImage(
                        url: items[i].imageUrl,
                        width: 40,
                        height: 40,
                        radius: 11,
                        placeholderIcon: Symbols.shopping_basket_rounded,
                      ),
                      title: Text(items[i].name),
                      subtitle: Text(items[i].price.formatted),
                      trailing: Text(
                        l10n.vendorSwapAsk,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: p.primary,
                        ),
                      ),
                      onTap: () => Navigator.of(context).pop(items[i]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
