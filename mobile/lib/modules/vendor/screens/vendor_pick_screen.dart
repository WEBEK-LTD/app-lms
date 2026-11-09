import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../market/data/market_providers.dart';
import '../data/vendor_providers.dart';

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

class _Pick {
  _Pick(MarketOrderLine l)
    : outcome = switch (l.outcome) {
        'missing' => PickOutcome.missing,
        'substituted' => PickOutcome.substituted,
        _ => PickOutcome.picked,
      },
      amount = TextEditingController(
        text: pickAmountText(
          l.outcome == 'picked' && l.pickedQuantity != null
              ? l.pickedQuantity!
              : l.quantity,
          l.unit,
        ),
      ),
      substituteName = l.substituteName;

  PickOutcome outcome;
  final TextEditingController amount;
  MarketProduct? substitute;
  String? substituteName;
}

/// 115.16 A grocery's or shop's order picked line by line: each item
/// picked (its weight for what is sold by weight, within what the customer
/// agreed), swapped for another as the customer allowed, or missing. The
/// order's total is worked out again by the server; then it is marked
/// ready.
class VendorPickScreen extends ConsumerStatefulWidget {
  const VendorPickScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<VendorPickScreen> createState() => _VendorPickScreenState();
}

class _VendorPickScreenState extends ConsumerState<VendorPickScreen> {
  final _picks = <int, _Pick>{};
  bool _saving = false;

  @override
  void dispose() {
    for (final p in _picks.values) {
      p.amount.dispose();
    }
    super.dispose();
  }

  _Pick _pickOf(MarketOrderLine l) => _picks.putIfAbsent(l.id!, () => _Pick(l));

  Future<void> _chooseSubstitute(MarketOrderLine line) async {
    final product = await showModalBottomSheet<MarketProduct>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.palette.surface,
      builder: (_) => const _SubstituteSheet(),
    );
    if (product == null || !mounted) return;
    setState(() {
      _pickOf(line)
        ..substitute = product
        ..substituteName = product.name;
    });
  }

  Future<void> _save(VendorOrder order) async {
    final l10n = context.l10n;
    final lines = <PickLine>[];
    for (final l in order.lines) {
      if (l.id == null) continue;
      final p = _pickOf(l);
      final amount = double.tryParse(p.amount.text.trim().replaceAll(',', '.'));
      switch (p.outcome) {
        case PickOutcome.missing:
          lines.add(PickLine(lineId: l.id!, outcome: PickOutcome.missing));
        case PickOutcome.picked:
          if (amount == null || amount <= 0) {
            showMessage(context, l10n.vendorPickNeedsAmount(l.name));
            return;
          }
          lines.add(
            PickLine(
              lineId: l.id!,
              outcome: PickOutcome.picked,
              quantity: amount,
            ),
          );
        case PickOutcome.substituted:
          // The customer's own choice is the server's to bring; any other
          // swap needs the item.
          final chosen = l.ifMissing == MarketIfMissing.chosen;
          if (!chosen && p.substitute == null) {
            showMessage(context, l10n.vendorPickNeedsSubstitute(l.name));
            return;
          }
          lines.add(
            PickLine(
              lineId: l.id!,
              outcome: PickOutcome.substituted,
              quantity: amount != null && amount > 0 ? amount : null,
              substituteProductId: chosen ? null : p.substitute!.id,
            ),
          );
      }
    }
    if (lines.isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(yallappApiProvider).pickVendorOrder(order.id, lines);
      if (!mounted) return;
      showMessage(context, l10n.vendorPickSaved);
      reloadVendor(ref, order.id);
      context.pop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(vendorOrderProvider(widget.orderId));
    final order = async.value;
    final tolerance =
        ref.watch(marketConfigProvider)?.weightTolerancePercent ?? 0;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.vendorPickItems),
      ),
      body: switch (async) {
        AsyncValue(value: final o?) => ListView.separated(
          key: const ValueKey('vendor-pick-list'),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          itemCount: o.lines.where((l) => l.id != null).length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final line = o.lines.where((l) => l.id != null).elementAt(i);
            return _PickCard(
              key: ValueKey('vendor-pick-${line.id}'),
              line: line,
              pick: _pickOf(line),
              tolerance: tolerance,
              onOutcome: (v) => setState(() => _pickOf(line).outcome = v),
              onChoose: () => _chooseSubstitute(line),
            );
          },
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(vendorOrderProvider(widget.orderId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: order == null
          ? null
          : BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('vendor-pick-save'),
                label: l10n.vendorPickSave,
                icon: Symbols.done,
                loading: _saving,
                onPressed: () => _save(order),
              ),
            ),
    );
  }
}

class _PickCard extends StatelessWidget {
  const _PickCard({
    super.key,
    required this.line,
    required this.pick,
    required this.tolerance,
    required this.onOutcome,
    required this.onChoose,
  });

  final MarketOrderLine line;
  final _Pick pick;
  final int tolerance;
  final ValueChanged<PickOutcome> onOutcome;
  final VoidCallback onChoose;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final weighed = line.unit != ProductUnit.item;
    final canSwap = line.ifMissing != MarketIfMissing.remove;
    final ifMissing = switch (line.ifMissing) {
      MarketIfMissing.similar => l10n.vendorIfMissingSimilar,
      MarketIfMissing.chosen => l10n.vendorIfMissingChosen,
      MarketIfMissing.remove => l10n.vendorIfMissingRemove,
    };
    final unit = switch (line.unit) {
      ProductUnit.item => '',
      ProductUnit.kg => 'kg',
      ProductUnit.g => 'g',
      ProductUnit.l => 'l',
    };
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  line.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              Text(
                pickOrderedText(line),
                style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
              ),
            ],
          ),
          if (line.choices.isNotEmpty || line.note != null)
            Text(
              [...line.choices, ?line.note].join(' · '),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          Text(
            ifMissing,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final o in PickOutcome.values)
                if (o != PickOutcome.substituted || canSwap)
                  PillChip(
                    key: ValueKey('vendor-pick-${line.id}-${o.name}'),
                    label: switch (o) {
                      PickOutcome.picked => l10n.vendorPicked,
                      PickOutcome.substituted => l10n.vendorSubstituted,
                      PickOutcome.missing => l10n.vendorMissing,
                    },
                    selected: pick.outcome == o,
                    onTap: () => onOutcome(o),
                  ),
            ],
          ),
          if (pick.outcome != PickOutcome.missing) ...[
            const SizedBox(height: 10),
            TextField(
              key: ValueKey('vendor-pick-${line.id}-amount'),
              controller: pick.amount,
              keyboardType: TextInputType.numberWithOptions(decimal: weighed),
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                  weighed ? RegExp(r'[0-9.,]') : RegExp(r'[0-9]'),
                ),
              ],
              decoration: InputDecoration(
                labelText: weighed
                    ? l10n.vendorPickedWeight(unit)
                    : l10n.vendorPickedCount,
                helperText:
                    weighed &&
                        tolerance > 0 &&
                        pick.outcome == PickOutcome.picked
                    ? l10n.vendorWeightTolerance(tolerance)
                    : null,
              ),
            ),
          ],
          if (pick.outcome == PickOutcome.substituted) ...[
            const SizedBox(height: 6),
            if (line.ifMissing == MarketIfMissing.chosen)
              Text(
                l10n.vendorBringChosen,
                style: TextStyle(fontSize: 13, color: p.textBody),
              )
            else
              ListTile(
                key: ValueKey('vendor-pick-${line.id}-choose'),
                contentPadding: EdgeInsets.zero,
                leading: Icon(Symbols.swap_horiz, color: p.primary),
                title: Text(
                  pick.substituteName ?? l10n.vendorChooseSubstitute,
                  style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
                ),
                subtitle: pick.substitute == null
                    ? null
                    : Text(pick.substitute!.price.formatted),
                trailing: pick.substituteName == null
                    ? null
                    : Text(l10n.vendorChangeSubstitute),
                onTap: onChoose,
              ),
          ],
        ],
      ),
    );
  }
}

/// The vendor's items in stock, searched by name, to bring one instead.
class _SubstituteSheet extends ConsumerStatefulWidget {
  const _SubstituteSheet();

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
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.7,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.vendorChooseSubstitute,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                key: const ValueKey('vendor-substitute-search'),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l10n.vendorStockSearch,
                  prefixIcon: const Icon(Symbols.search),
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
                  final items = [
                    for (final i in snap.data?.items ?? const <MarketProduct>[])
                      if (i.inStock) i,
                  ];
                  if (snap.connectionState != ConnectionState.done) {
                    return const SkeletonList(layout: SkeletonLayout.text);
                  }
                  if (items.isEmpty) {
                    return MessageView(
                      icon: Symbols.inventory_2,
                      title: l10n.vendorStockEmpty,
                    );
                  }
                  return ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, i) => ListTile(
                      key: ValueKey('vendor-substitute-${items[i].id}'),
                      title: Text(items[i].name),
                      subtitle: Text(items[i].price.formatted),
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
