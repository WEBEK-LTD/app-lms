import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../../core/widgets/common.dart';
import '../data/vendor_providers.dart';
import '../widgets/vendor_widgets.dart';
import 'vendor_desk_screen.dart' show VendorOrderTile;

/// 115.77 The vendor app's Picking tab (the approved bar, design 08): the
/// orders being prepared or picked; one opens on its picking (a grocery's
/// or shop's) or on the order (a restaurant's).
class VendorPickingScreen extends ConsumerWidget {
  const VendorPickingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(vendorOrdersProvider(VendorOrderScope.active));
    final notifier = ref.read(
      vendorOrdersProvider(VendorOrderScope.active).notifier,
    );
    final desk = ref.watch(vendorDeskProvider).value;
    final picks = desk != null && desk.kind != VendorKind.restaurant;
    final items = [
      for (final o in state.items)
        if (o.status != MarketOrderStatus.ready) o,
    ];
    return Scaffold(
      backgroundColor: p.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          VendorHead(
            child: Text(
              l10n.vendorTabPicking,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: state.isInitialLoading
                ? const SkeletonList(layout: SkeletonLayout.text)
                : state.error != null && state.items.isEmpty
                ? ErrorView(error: state.error!, onRetry: notifier.retry)
                : RefreshIndicator(
                    onRefresh: notifier.refresh,
                    child: items.isEmpty
                        ? ListView(
                            children: [
                              MessageView(
                                icon: Symbols.checklist_rounded,
                                title: l10n.vendorPickingEmpty,
                              ),
                            ],
                          )
                        : ListView.separated(
                            key: const ValueKey('vendor-picking-list'),
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                            itemCount: items.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, i) => VendorOrderTile(
                              key: ValueKey('vendor-picking-${items[i].id}'),
                              order: items[i],
                              onTap: () => context.push(
                                picks
                                    ? Paths.vendorPick(items[i].id)
                                    : Paths.vendorOrder(items[i].id),
                              ),
                            ),
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

final vendorOffersProvider = FutureProvider.autoDispose<VendorOffers>(
  (ref) => ref.watch(yallappApiProvider).listVendorOffers(),
);

String vendorOfferStatusText(AppLocalizations l10n, VendorOfferStatus s) =>
    switch (s) {
      VendorOfferStatus.active => l10n.vendorOfferActive,
      VendorOfferStatus.paused => l10n.vendorOfferPaused,
      VendorOfferStatus.ended => l10n.vendorOfferEnded,
      VendorOfferStatus.ownerPaused => l10n.vendorOfferOwnerPaused,
    };

/// 115.77 The vendor app's Offers tab: the place's own coupons and
/// automatic offers, as the partner panel's (115.18), for its owner and
/// managers; made, paused, started again and ended here.
class VendorOffersScreen extends ConsumerStatefulWidget {
  const VendorOffersScreen({super.key});

  @override
  ConsumerState<VendorOffersScreen> createState() => _VendorOffersState();
}

class _VendorOffersState extends ConsumerState<VendorOffersScreen> {
  final _busy = <int>{};

  Future<void> _move(VendorOffer o, String action) async {
    setState(() => _busy.add(o.id));
    try {
      await ref.read(yallappApiProvider).moveVendorOffer(o.id, action);
      ref.invalidate(vendorOffersProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy.remove(o.id));
    }
  }

  Future<void> _create(VendorOffers offers) async {
    final l10n = context.l10n;
    final desk = ref.read(vendorDeskProvider).value;
    final made = await showModalBottomSheet<VendorOffer>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.palette.surface,
      builder: (_) => _OfferSheet(
        maxPercent: offers.maxPercent,
        freeDelivery: desk?.deliveryBy == VendorDelivery.vendor,
      ),
    );
    if (made == null || !mounted) return;
    showMessage(context, l10n.vendorOfferSaved);
    ref.invalidate(vendorOffersProvider);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final desk = ref.watch(vendorDeskProvider).value;
    final mine =
        desk != null &&
        (desk.role == VendorRole.owner || desk.role == VendorRole.manager);
    final offers = mine ? ref.watch(vendorOffersProvider) : null;
    final data = offers?.value;
    return Scaffold(
      backgroundColor: p.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          VendorHead(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.vendorOffersTitle,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        l10n.vendorOffersText,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: vendorOnHead.withValues(alpha: 0.75),
                        ),
                      ),
                    ],
                  ),
                ),
                if (data != null && data.enabled)
                  VendorRoundButton(
                    key: const ValueKey('vendor-offer-new'),
                    icon: Symbols.add_rounded,
                    label: l10n.vendorOfferNew,
                    onTap: () => _create(data),
                  ),
              ],
            ),
          ),
          Expanded(
            child: desk == null
                ? const SkeletonList(layout: SkeletonLayout.text)
                : !mine
                ? MessageView(
                    icon: Symbols.sell_rounded,
                    title: l10n.vendorOffersOwners,
                  )
                : offers!.when(
                    loading: () =>
                        const SkeletonList(layout: SkeletonLayout.text),
                    error: (e, _) => ErrorView(
                      error: e,
                      onRetry: () => ref.invalidate(vendorOffersProvider),
                    ),
                    data: (o) => RefreshIndicator(
                      onRefresh: () async =>
                          ref.invalidate(vendorOffersProvider),
                      child: ListView(
                        key: const ValueKey('vendor-offers-list'),
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                        children: [
                          if (!o.enabled)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                l10n.vendorOffersOff,
                                style: TextStyle(color: p.danger),
                              ),
                            )
                          else if (o.maxPercent case final max?)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                l10n.vendorOffersMax(_number(max)),
                                style: TextStyle(color: p.textSecondary),
                              ),
                            ),
                          if (o.items.isEmpty)
                            MessageView(
                              icon: Symbols.sell_rounded,
                              title: l10n.vendorOffersNone,
                            ),
                          for (final offer in o.items)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _OfferRow(
                                offer: offer,
                                busy: _busy.contains(offer.id),
                                onMove: (a) => _move(offer, a),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

String _number(double v) =>
    v == v.roundToDouble() ? v.round().toString() : v.toString();

class _OfferRow extends StatelessWidget {
  const _OfferRow({
    required this.offer,
    required this.busy,
    required this.onMove,
  });

  final VendorOffer offer;
  final bool busy;
  final ValueChanged<String> onMove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final o = offer;
    final what = switch (o.kind) {
      'percent' => '${o.value ?? ''}%',
      'amount' => o.amount?.formatted ?? o.value ?? '',
      _ => l10n.vendorOfferFree,
    };
    final status = vendorOfferStatusText(l10n, o.status);
    final live = o.status == VendorOfferStatus.active;
    return Container(
      key: ValueKey('vendor-offer-${o.id}'),
      padding: const EdgeInsets.fromLTRB(14, 12, 8, 10),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.35 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  o.title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              VendorTag(
                label: status,
                background: live ? vendorTint(p) : p.surfaceMuted,
                foreground: live ? vendorTintInk(p) : p.textSecondary,
              ),
              const SizedBox(width: 6),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              what,
              o.code ?? l10n.vendorOfferAuto,
              if (o.minOrder != null)
                '${l10n.vendorOfferMinOrder}: ${o.minOrder!.formatted}',
              if (o.endsAt != null) shortDate(o.endsAt!),
            ].join(' · '),
            style: TextStyle(fontSize: 12.5, color: p.textSecondary),
          ),
          if (o.status != VendorOfferStatus.ended &&
              o.status != VendorOfferStatus.ownerPaused)
            Wrap(
              alignment: WrapAlignment.end,
              children: [
                TextButton(
                  key: ValueKey('vendor-offer-${o.id}-toggle'),
                  onPressed: busy
                      ? null
                      : () => onMove(live ? 'pause' : 'resume'),
                  child: Text(
                    live ? l10n.vendorOfferPause : l10n.vendorOfferResume,
                  ),
                ),
                TextButton(
                  key: ValueKey('vendor-offer-${o.id}-end'),
                  onPressed: busy ? null : () => onMove('end'),
                  style: TextButton.styleFrom(foregroundColor: p.danger),
                  child: Text(l10n.vendorOfferEnd),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// A new offer: its name, a code or none, what it takes off, the smallest
/// order and the last day.
class _OfferSheet extends ConsumerStatefulWidget {
  const _OfferSheet({required this.maxPercent, required this.freeDelivery});

  final double? maxPercent;
  final bool freeDelivery;

  @override
  ConsumerState<_OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends ConsumerState<_OfferSheet> {
  final _title = TextEditingController();
  final _code = TextEditingController();
  final _value = TextEditingController();
  final _min = TextEditingController();
  String _kind = 'percent';
  DateTime? _ends;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_title, _code, _value, _min]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim().replaceAll(',', '.');
    setState(() => _saving = true);
    try {
      final made = await ref.read(yallappApiProvider).createVendorOffer({
        'title': _title.text.trim(),
        'code': text(_code),
        'kind': _kind,
        if (_kind != 'free_delivery') 'value': text(_value),
        'min_order': text(_min),
        if (_ends != null) 'ends': isoDate(_ends!),
      });
      if (mounted) Navigator.of(context).pop(made);
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
    final number = [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.vendorOfferNew,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('vendor-offer-title'),
                controller: _title,
                autofocus: true,
                maxLength: 80,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: l10n.vendorOfferName,
                  counterText: '',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                key: const ValueKey('vendor-offer-code'),
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: l10n.vendorOfferCode,
                  helperText: l10n.vendorOfferCodeHint,
                  helperMaxLines: 3,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.vendorOfferKind,
                style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (k, label) in [
                    ('percent', l10n.vendorOfferPercent),
                    ('amount', l10n.vendorOfferAmount),
                    if (widget.freeDelivery)
                      ('free_delivery', l10n.vendorOfferFree),
                  ])
                    ChoiceChip(
                      key: ValueKey('vendor-offer-kind-$k'),
                      label: Text(label),
                      selected: _kind == k,
                      onSelected: (_) => setState(() => _kind = k),
                    ),
                ],
              ),
              if (!widget.freeDelivery)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    l10n.vendorOfferFreeNote,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                ),
              if (_kind != 'free_delivery') ...[
                const SizedBox(height: 10),
                TextField(
                  key: const ValueKey('vendor-offer-value'),
                  controller: _value,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: number,
                  decoration: InputDecoration(
                    labelText: l10n.vendorOfferValue,
                    helperText: _kind == 'percent' && widget.maxPercent != null
                        ? l10n.vendorOffersMax(_number(widget.maxPercent!))
                        : null,
                  ),
                ),
              ],
              const SizedBox(height: 10),
              TextField(
                key: const ValueKey('vendor-offer-min'),
                controller: _min,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                inputFormatters: number,
                decoration: InputDecoration(
                  labelText: l10n.vendorOfferMinOrder,
                ),
              ),
              const SizedBox(height: 6),
              ListTile(
                key: const ValueKey('vendor-offer-ends'),
                contentPadding: EdgeInsets.zero,
                leading: Icon(Symbols.event_rounded, color: p.primary),
                title: Text(l10n.vendorOfferEnds),
                subtitle: _ends == null ? null : Text(shortDate(_ends!)),
                onTap: () async {
                  final now = DateTime.now();
                  final picked = await showDatePicker(
                    context: context,
                    firstDate: now,
                    lastDate: now.add(const Duration(days: 366)),
                    initialDate: _ends ?? now.add(const Duration(days: 7)),
                  );
                  if (picked != null) setState(() => _ends = picked);
                },
              ),
              const SizedBox(height: 12),
              FilledButton(
                key: const ValueKey('vendor-offer-save'),
                onPressed: _saving || _title.text.trim().isEmpty ? null : _save,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: const StadiumBorder(),
                  backgroundColor: p.primary,
                  foregroundColor: p.onPrimary,
                ),
                child: Text(l10n.vendorOfferCreate),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
