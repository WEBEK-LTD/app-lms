import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_store.dart';
import 'market_look.dart';
import 'market_store_widgets.dart';

/// 115.40 The supermarket's cart (design 04), inside the basket: "If
/// something is missing" for the whole order, each line with its photo,
/// its estimate, its stepper and its own choice (a similar item, the
/// customer's own pick, or leave it out), and the estimated total with
/// what each way to pay means for weighed items.

IconData marketMissingIcon(api.MarketIfMissing v) => switch (v) {
  api.MarketIfMissing.similar => Symbols.published_with_changes_rounded,
  api.MarketIfMissing.chosen => Symbols.touch_app_rounded,
  api.MarketIfMissing.remove => Symbols.block_rounded,
};

String marketMissingText(AppLocalizations l10n, api.MarketIfMissing v) =>
    switch (v) {
      api.MarketIfMissing.similar => l10n.marketMissingSimilar,
      api.MarketIfMissing.chosen => l10n.marketMissingChosen,
      api.MarketIfMissing.remove => l10n.marketMissingRemove,
    };

/// The order's choice, set once for every line that doesn't say.
class MarketIfMissingCard extends StatelessWidget {
  const MarketIfMissingCard({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final api.MarketIfMissing value;
  final ValueChanged<api.MarketIfMissing> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Container(
      key: const ValueKey('market-if-missing'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: p.accent,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: AppIcon(
                  Symbols.question_mark_rounded,
                  size: 20,
                  color: p.onAccent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.marketIfMissingTitle,
                      style: TextStyle(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    Text(
                      l10n.marketIfMissingSub,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                for (final v in api.MarketIfMissing.values)
                  Expanded(
                    child: Semantics(
                      selected: v == value,
                      button: true,
                      child: GestureDetector(
                        key: ValueKey('market-if-missing-${v.name}'),
                        onTap: () => onChanged(v),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: v == value ? p.surface : Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              AppIcon(
                                size: 16,
                                marketMissingIcon(v),
                                color: v == value ? p.text : p.textSecondary,
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  marketMissingText(l10n, v),
                                  maxLines: 2,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    height: 1.15,
                                    fontWeight: FontWeight.w700,
                                    color: v == value
                                        ? p.text
                                        : p.textSecondary,
                                  ),
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
          ),
        ],
      ),
    );
  }
}

/// A line of the cart: photo, name and note, "By weight · EGP 160/kg" (or
/// its price each), its choice when out, its estimate and its stepper.
class MarketCartRow extends ConsumerWidget {
  const MarketCartRow({
    super.key,
    required this.line,
    required this.choice,
    required this.currency,
    required this.decimals,
    required this.onAdd,
    required this.onRemove,
    required this.onChoice,
  });

  final MarketBasketLine line;
  final api.MarketIfMissing choice;
  final String currency;
  final int decimals;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final void Function(api.MarketIfMissing value, MarketItem? substitute)
  onChoice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final item = line.item;
    final estimate = marketAmount(
      line.quantity * item.priceValue,
      currency,
      decimals,
    );
    final comma = Directionality.of(context) == TextDirection.rtl ? '، ' : ', ';
    final name = line.note == null || line.note!.isEmpty
        ? item.name
        : '${item.name}$comma${line.note}';
    final chip = _ChoiceChip(
      itemId: item.id,
      choice: choice,
      substitute: line.substitute,
      onPick: (v) async {
        if (v != api.MarketIfMissing.chosen) return onChoice(v, null);
        final picked = await chooseMarketSubstitute(context, line.item);
        if (picked != null) onChoice(v, picked);
      },
    );
    return Column(
      key: ValueKey('market-cart-line-${item.id}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: AppNetworkImage(
                url: item.imageUrl,
                seed: item.id.hashCode,
                width: 58,
                height: 58,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (item.byWeight)
                    Text.rich(
                      TextSpan(
                        children: [
                          WidgetSpan(
                            alignment: PlaceholderAlignment.middle,
                            child: AppIcon(
                              Symbols.scale_rounded,
                              size: 15,
                              color: p.primary,
                            ),
                          ),
                          TextSpan(
                            text: ' ${l10n.marketByWeight}',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: p.primary,
                            ),
                          ),
                          TextSpan(
                            text:
                                ' · ${ltrRun(item.price)}${marketPerUnit(l10n, item.unit).replaceAll(' ', '')}',
                          ),
                        ],
                      ),
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    )
                  else
                    Text(
                      item.description ??
                          l10n.marketEachPrice(ltrRun(item.price)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // At most two fifths of the line, the bigger words made to fit.
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width * 0.4,
              ),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: AlignmentDirectional.topEnd,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      item.byWeight ? '≈ $estimate' : estimate,
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _OutlinedStepper(
                      itemId: item.id,
                      amount: marketAmountText(l10n, item.unit, line.quantity),
                      onAdd: onAdd,
                      onRemove: onRemove,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        // The line's own choice, under its name.
        Padding(
          padding: const EdgeInsetsDirectional.only(start: 70, top: 6),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: chip,
          ),
        ),
      ],
    );
  }
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({
    required this.itemId,
    required this.choice,
    required this.substitute,
    required this.onPick,
  });

  final String itemId;
  final api.MarketIfMissing choice;
  final MarketItem? substitute;
  final ValueChanged<api.MarketIfMissing> onPick;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (bg, fg) = switch (choice) {
      api.MarketIfMissing.similar => (
        marketTint(p, p.primary, 0.13),
        p.primary,
      ),
      api.MarketIfMissing.chosen => (
        marketTint(p, p.accent, 0.2),
        marketDeeper(p.accent, 0.4),
      ),
      api.MarketIfMissing.remove => (p.surfaceMuted, p.textSecondary),
    };
    final label = choice == api.MarketIfMissing.chosen && substitute != null
        ? l10n.marketInstead(substitute!.name)
        : choice == api.MarketIfMissing.chosen
        ? l10n.marketChooseInstead
        : marketMissingText(l10n, choice);
    return PopupMenuButton<api.MarketIfMissing>(
      key: ValueKey('market-line-choice-$itemId'),
      tooltip: l10n.marketIfMissingTitle,
      onSelected: onPick,
      itemBuilder: (context) => [
        for (final v in api.MarketIfMissing.values)
          PopupMenuItem(
            key: ValueKey('market-line-choice-$itemId-${v.name}'),
            value: v,
            child: Row(
              children: [
                AppIcon(marketMissingIcon(v), size: 20),
                const SizedBox(width: 10),
                Text(marketMissingText(l10n, v)),
              ],
            ),
          ),
      ],
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(10, 6, 8, 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(marketMissingIcon(choice), size: 18, color: fg),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: fg,
                ),
              ),
            ),
            const SizedBox(width: 2),
            AppIcon(Symbols.expand_more_rounded, size: 18, color: fg),
          ],
        ),
      ),
    );
  }
}

class _OutlinedStepper extends StatelessWidget {
  const _OutlinedStepper({
    required this.itemId,
    required this.amount,
    required this.onAdd,
    required this.onRemove,
  });

  final String itemId;
  final String amount;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget tap(IconData icon, VoidCallback onTap, String key) => InkResponse(
      key: ValueKey(key),
      onTap: onTap,
      radius: 16,
      child: SizedBox(
        width: 30,
        height: 36,
        child: AppIcon(icon, size: 18, color: p.primary),
      ),
    );
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.border, width: 1.4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          tap(Symbols.remove_rounded, onRemove, 'market-cart-minus-$itemId'),
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 30),
            child: Text(
              amount,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          tap(Symbols.add_rounded, onAdd, 'market-cart-plus-$itemId'),
        ],
      ),
    );
  }
}

/// The customer's own item to bring instead, from the same store.
Future<MarketItem?> chooseMarketSubstitute(
  BuildContext context,
  MarketItem forItem,
) => showModalBottomSheet<MarketItem>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (context) => _SubstitutePicker(forItem: forItem),
);

class _SubstitutePicker extends ConsumerStatefulWidget {
  const _SubstitutePicker({required this.forItem});

  final MarketItem forItem;

  @override
  ConsumerState<_SubstitutePicker> createState() => _SubstitutePickerState();
}

class _SubstitutePickerState extends ConsumerState<_SubstitutePicker> {
  String? _query;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final vendorId = ref.watch(marketBasketProvider).vendor?.id ?? '';
    final list = ref.watch(
      marketProductListProvider((
        vendorId: vendorId,
        department: null,
        aisle: null,
        query: _query,
        barcode: null,
      )),
    );
    final items = list.items
        .where((i) => i.id != widget.forItem.id && i.inStock)
        .toList();
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.7,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              l10n.marketChooseInstead,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: widget.forItem.name,
                prefixIcon: const AppIcon(Symbols.search_rounded),
              ),
              onSubmitted: (q) =>
                  setState(() => _query = q.trim().isEmpty ? null : q.trim()),
            ),
          ),
          Expanded(
            child: list.firstLoad
                ? const Center(child: CircularProgressIndicator())
                : NotificationListener<ScrollNotification>(
                    onNotification: (n) {
                      if (n.metrics.extentAfter < 300) {
                        ref
                            .read(
                              marketProductListProvider((
                                vendorId: vendorId,
                                department: null,
                                aisle: null,
                                query: _query,
                                barcode: null,
                              )).notifier,
                            )
                            .loadMore();
                      }
                      return false;
                    },
                    child: ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (context, i) {
                        final item = items[i];
                        return ListTile(
                          key: ValueKey('market-substitute-${item.id}'),
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: AppNetworkImage(
                              url: item.imageUrl,
                              seed: item.id.hashCode,
                              width: 44,
                              height: 44,
                            ),
                          ),
                          title: Text(item.name),
                          subtitle: MarketPriceLine(item: item, size: 13.5),
                          trailing: AppIcon(AppIcons.forward, size: 18),
                          onTap: () => Navigator.pop(context, item),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

/// The estimated total, the most it can come to in cash, and what a card
/// pays, for a cart with weighed items.
class MarketEstimateCard extends StatelessWidget {
  const MarketEstimateCard({
    super.key,
    required this.quote,
    required this.basket,
    required this.tolerancePercent,
    required this.card,
  });

  /// The server's prices; until there are any (no address yet), the
  /// basket's own estimate.
  final api.MarketQuote? quote;
  final MarketBasket basket;
  final double tolerancePercent;

  /// Paying by card or wallet (or the phone's wallet): the estimate is
  /// charged now; that line comes first, cash's after.
  final bool card;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final total = double.tryParse(quote?.total.amount ?? '') ?? basket.estimate;
    final estimate = marketAmount(total, basket.currency, basket.decimals);
    final most = marketAmount(
      total + basket.weighedEstimate * tolerancePercent / 100,
      basket.currency,
      basket.decimals,
    );
    return Container(
      key: const ValueKey('market-estimate'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.marketEstimatedTotal,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                quote?.total.formatted ??
                    marketAmount(total, basket.currency, basket.decimals),
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // What each way to pay means: the estimate now by card or
          // wallet (the way chosen first), or the scale's price in cash.
          Container(
            key: const ValueKey('market-pay-note'),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: marketTint(p, p.primary, 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppIcon(
                  card ? Symbols.credit_card_rounded : Symbols.payments_rounded,
                  size: 20,
                  color: p.primary,
                  filled: true,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final (i, line) in [
                        (
                          '${l10n.marketByCard} · ${l10n.marketWeighCard}',
                          card,
                        ),
                        (l10n.marketWeighCash(estimate, most), !card),
                      ].indexed) ...[
                        if (i > 0) const SizedBox(height: 3),
                        Text(
                          line.$1,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.35,
                            fontWeight: line.$2
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: line.$2 ? p.text : p.textSecondary,
                          ),
                        ),
                      ],
                    ],
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
