import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import '../widgets/market_look.dart';
import '../widgets/market_store_widgets.dart';

/// 115.40 A supermarket's product (design 03). Sold by weight: a stepper
/// in the product's own steps between its least and most, quick weights,
/// the price per kilo and per 100 g, the estimated price and the most a
/// cash order can come to (the estimate and the marketplace's tolerance,
/// 10% unless the owner sets another), the note that the final price comes
/// after weighing (a card pays the estimate and gets back what weighs
/// less), and a note for the picker. Sold by the unit: how many.
class MarketProductScreen extends ConsumerStatefulWidget {
  const MarketProductScreen({
    super.key,
    required this.vendorId,
    required this.itemId,
    this.item,
  });

  final String vendorId;
  final String itemId;

  /// The product as the list showed it; else found on the vendor's page.
  final MarketItem? item;

  @override
  ConsumerState<MarketProductScreen> createState() =>
      _MarketProductScreenState();
}

class _MarketProductScreenState extends ConsumerState<MarketProductScreen> {
  double? _quantity;
  String? _note;
  int _photo = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final page = ref.watch(marketVendorPageProvider(widget.vendorId)).value;
    final item =
        widget.item ??
        page?.shelves
            .expand((s) => s.items)
            .where((i) => i.id == widget.itemId)
            .firstOrNull;
    if (page == null || item == null) {
      return Scaffold(
        backgroundColor: p.background,
        body: page == null
            ? const Center(child: CircularProgressIndicator())
            : MessageView(
                icon: Symbols.search_off_rounded,
                title: context.l10n.marketNothingHere,
                message: '',
              ),
      );
    }
    final basket = ref.watch(marketBasketProvider);
    final line = basket.vendor?.id == page.vendor.id
        ? basket.lineOf(item.id)
        : null;
    final quantity = _quantity ?? line?.quantity ?? item.minAmount;
    final note = _note ?? line?.note;
    final config = ref.watch(marketConfigProvider);
    final tolerance = (config?.weightTolerancePercent ?? 10).toDouble();
    final photos = item.photos.isNotEmpty
        ? item.photos
        : [if (item.imageUrl != null) item.imageUrl!];
    final height = MediaQuery.sizeOf(context).height;
    final estimate = quantity * item.priceValue;
    String money(double v) => marketAmount(v, page.currency, page.decimals);
    return Scaffold(
      backgroundColor: p.background,
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.zero,
            children: [
              SizedBox(
                height: height * 0.36,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    PageView.builder(
                      itemCount: photos.isEmpty ? 1 : photos.length,
                      onPageChanged: (i) => setState(() => _photo = i),
                      itemBuilder: (context, i) => AppNetworkImage(
                        url: photos.isEmpty ? null : photos[i],
                        seed: item.id.hashCode + i,
                      ),
                    ),
                    if (photos.length > 1)
                      PositionedDirectional(
                        bottom: 40,
                        start: 0,
                        end: 0,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            for (var i = 0; i < photos.length; i++)
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 3,
                                ),
                                width: i == _photo ? 18 : 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(
                                    alpha: i == _photo ? 1 : 0.6,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              Transform.translate(
                offset: const Offset(0, -26),
                child: Container(
                  decoration: BoxDecoration(
                    color: p.background,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(30),
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 22, 16, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Title(
                        item: item,
                        currency: page.currency,
                        decimals: page.decimals,
                      ),
                      const SizedBox(height: 16),
                      if (item.byWeight) ...[
                        _WeightStepper(
                          item: item,
                          quantity: quantity,
                          onChanged: (q) => setState(() => _quantity = q),
                        ),
                        const SizedBox(height: 14),
                        _PriceTiles(
                          estimate: money(estimate),
                          most: money(estimate * (100 + tolerance) / 100),
                        ),
                        const SizedBox(height: 14),
                        _WeighNote(
                          most: money(estimate * (100 + tolerance) / 100),
                        ),
                        const SizedBox(height: 14),
                        _PickerNote(
                          note: note,
                          onChanged: (n) => setState(() => _note = n ?? ''),
                        ),
                      ] else ...[
                        if (item.description case final d?
                            when d.isNotEmpty) ...[
                          Text(
                            d,
                            style: TextStyle(
                              fontSize: 15,
                              height: 1.45,
                              color: p.textBody,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        _UnitStepper(
                          quantity: quantity,
                          max: item.maxQuantity,
                          onChanged: (q) => setState(() => _quantity = q),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
          PositionedDirectional(
            top: MediaQuery.paddingOf(context).top + 8,
            start: 16,
            child: MarketGlassButton(
              key: const ValueKey('market-product-close'),
              icon: Symbols.close_rounded,
              label: MaterialLocalizations.of(context).closeButtonTooltip,
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ),
          PositionedDirectional(
            top: MediaQuery.paddingOf(context).top + 8,
            end: 16,
            child: MarketGlassButton(
              icon: Symbols.favorite_rounded,
              onTap: null,
            ),
          ),
          PositionedDirectional(
            start: 16,
            end: 16,
            bottom: MediaQuery.paddingOf(context).bottom + 12,
            child: _AddButton(
              enabled: item.inStock,
              label: line != null
                  ? context.l10n.marketUpdateCart(
                      item.byWeight
                          ? '${marketAmountText(context.l10n, item.unit, quantity)} · ≈ ${money(estimate)}'
                          : money(estimate),
                    )
                  : item.byWeight
                  ? context.l10n.marketAddWeighed(
                      marketAmountText(context.l10n, item.unit, quantity),
                      money(estimate),
                    )
                  : context.l10n.marketAddUnits(
                      ltrRun(quantity.round().toString()),
                      money(estimate),
                    ),
              onTap: () => _add(page, item, quantity, note),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _add(
    MarketVendorPage page,
    MarketItem item,
    double quantity,
    String? note,
  ) async {
    final basket = ref.read(marketBasketProvider.notifier);
    if (basket.wouldReplace(page.vendor)) {
      final l10n = context.l10n;
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.marketNewBasketTitle),
          content: Text(
            l10n.marketNewBasketMessage(
              ref.read(marketBasketProvider).vendor?.name ?? '',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(l10n.marketNewBasketConfirm),
            ),
          ],
        ),
      );
      if (yes != true || !mounted) return;
    }
    basket.put(
      page.vendor,
      item,
      quantity,
      currency: page.currency,
      decimals: page.decimals,
      note: note == null || note.isEmpty ? null : note,
    );
    if (mounted) Navigator.of(context).maybePop();
  }
}

class _Title extends StatelessWidget {
  const _Title({
    required this.item,
    required this.currency,
    required this.decimals,
  });

  final MarketItem item;
  final String currency;
  final int decimals;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final per100 = item.unit == MarketUnit.kg
        ? marketAmount(item.priceValue / 10, currency, decimals)
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                item.name,
                style: TextStyle(
                  fontSize: 26,
                  height: 1.15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                  color: p.text,
                ),
              ),
            ),
            if (item.byWeight) ...[
              const SizedBox(width: 10),
              const MarketByWeightBadge(big: true),
            ],
          ],
        ),
        const SizedBox(height: 6),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: ltrRun(item.price),
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: p.primary,
                ),
              ),
              if (item.byWeight)
                TextSpan(
                  text: ' ${marketPerUnit(l10n, item.unit)}',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: p.textSecondary,
                  ),
                ),
              if (per100 != null)
                TextSpan(
                  text: '  · ${l10n.marketPer100g(per100)}',
                  style: TextStyle(fontSize: 13, color: p.textTertiary),
                ),
              if (item.oldPrice case final was?)
                TextSpan(
                  text: '  ${ltrRun(was)}',
                  style: TextStyle(
                    fontSize: 14,
                    color: p.textTertiary,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// − 750 g + in the product's steps, a ruler, and quick weights.
class _WeightStepper extends StatelessWidget {
  const _WeightStepper({
    required this.item,
    required this.quantity,
    required this.onChanged,
  });

  final MarketItem item;
  final double quantity;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final step = item.step <= 0 ? 0.25 : item.step;
    final min = item.minAmount;
    // The ruler reaches its most, else 2 kg (or 12 steps).
    final kilo = item.unit == MarketUnit.g ? 1000.0 : 1.0;
    final max =
        item.maxQuantity ??
        [2 * kilo, min + 11 * step].reduce((a, b) => a > b ? a : b);
    final steps = ((max - min) / step).round();
    final quick = <double>{
      for (final q in [min, min + step, min + 2 * step, kilo, 2 * kilo])
        if (q >= min - 1e-9 && q <= max + 1e-9) q,
    }.toList()..sort();
    double fit(double q) => double.parse(q.clamp(min, max).toStringAsFixed(3));
    final amount = marketAmountText(l10n, item.unit, quantity);
    final match = RegExp(r'^([\u2066]?[\d.,]+[\u2069]?)\s*(.*)$')
        .firstMatch(amount);
    Widget round(IconData icon, VoidCallback? onTap, bool strong, Key key) =>
        Semantics(
          button: true,
          child: Material(
            color: strong ? p.primary : marketTint(p, p.primary, 0.14),
            shape: const CircleBorder(),
            child: InkWell(
              key: key,
              customBorder: const CircleBorder(),
              onTap: onTap,
              child: SizedBox(
                width: 64,
                height: 64,
                child: AppIcon(
                  icon,
                  size: 30,
                  color: strong ? p.onPrimary : p.primary,
                ),
              ),
            ),
          ),
        );
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          Row(
            children: [
              round(
                Symbols.remove_rounded,
                quantity - step >= min - 1e-9
                    ? () => onChanged(fit(quantity - step))
                    : null,
                false,
                const ValueKey('market-weight-minus'),
              ),
              Expanded(
                child: Column(
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: match?.group(1) ?? amount,
                              style: TextStyle(
                                fontSize: 46,
                                height: 1.05,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1,
                                color: p.text,
                              ),
                            ),
                            if (match != null && match.group(2)!.isNotEmpty)
                              TextSpan(
                                text: ' ${match.group(2)}',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: p.textSecondary,
                                ),
                              ),
                          ],
                        ),
                        key: const ValueKey('market-weight-amount'),
                      ),
                    ),
                    Text(
                      l10n.marketInSteps(
                        marketAmountText(l10n, item.unit, step),
                      ),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13.5, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
              round(
                Symbols.add_rounded,
                quantity + step <= max + 1e-9
                    ? () => onChanged(fit(quantity + step))
                    : null,
                true,
                const ValueKey('market-weight-plus'),
              ),
            ],
          ),
          if (steps > 0)
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 5,
                activeTrackColor: p.primary,
                inactiveTrackColor: p.surfaceMuted,
                thumbColor: p.primary,
                activeTickMarkColor: p.onPrimary.withValues(alpha: 0.6),
                inactiveTickMarkColor: p.textTertiary,
              ),
              child: Slider(
                value: quantity.clamp(min, max),
                min: min,
                max: max,
                divisions: steps,
                label: amount,
                onChanged: (v) => onChanged(fit(v)),
              ),
            ),
          const SizedBox(height: 4),
          Row(
            children: [
              for (final (i, q) in quick.indexed) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: _QuickWeight(
                    key: ValueKey('market-quick-$q'),
                    label: marketAmountText(l10n, item.unit, q),
                    on: (q - quantity).abs() < 1e-6,
                    onTap: () => onChanged(fit(q)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickWeight extends StatelessWidget {
  const _QuickWeight({
    super.key,
    required this.label,
    required this.on,
    required this.onTap,
  });

  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      selected: on,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: on ? p.text : p.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: on ? p.text : p.border),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: on ? p.background : p.text,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The estimate, and the most a cash order comes to after weighing.
class _PriceTiles extends StatelessWidget {
  const _PriceTiles({required this.estimate, required this.most});

  final String estimate;
  final String most;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final deep = marketDeeper(p.primary, 0.3);
    Widget tile(String label, String amount, {required bool strong}) =>
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          decoration: BoxDecoration(
            color: strong ? deep : p.surface,
            borderRadius: BorderRadius.circular(22),
            border: strong ? null : Border.all(color: p.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                maxLines: 2,
                style: TextStyle(
                  fontSize: 13,
                  color: strong
                      ? Colors.white.withValues(alpha: 0.85)
                      : p.textSecondary,
                ),
              ),
              const SizedBox(height: 2),
              const Spacer(),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  amount,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: strong ? Colors.white : p.text,
                  ),
                ),
              ),
            ],
          ),
        );
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: tile(l10n.marketEstimatedPrice, estimate, strong: true),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: tile(l10n.marketAtMostAfterWeighing, most, strong: false),
          ),
        ],
      ),
    );
  }
}

/// The final price comes after weighing: what a card and cash each pay.
class _WeighNote extends StatelessWidget {
  const _WeighNote({required this.most});

  final String most;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final style = TextStyle(fontSize: 14, height: 1.45, color: p.textBody);
    return Container(
      key: const ValueKey('market-weigh-note'),
      padding: const EdgeInsetsDirectional.fromSTEB(14, 14, 16, 14),
      decoration: BoxDecoration(
        color: marketTint(p, p.accent, 0.16),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(
            Symbols.info_rounded,
            size: 22,
            color: p.accent,
            filled: true,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.marketWeighFinal, style: style),
                const SizedBox(height: 4),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '${l10n.marketByCard}: ',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      TextSpan(text: l10n.marketWeighCard),
                    ],
                  ),
                  style: style,
                ),
                const SizedBox(height: 4),
                Text(l10n.marketWeighCash(most), style: style),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sliced, one piece, or the customer's own words, for the picker.
class _PickerNote extends StatelessWidget {
  const _PickerNote({required this.note, required this.onChanged});

  final String? note;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final presets = [l10n.marketPickerSliced, l10n.marketPickerOnePiece];
    final own = note != null && note!.isNotEmpty && !presets.contains(note);
    Widget chip(
      String label, {
      required bool on,
      IconData? icon,
      VoidCallback? onTap,
    }) => Semantics(
      selected: on,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: BoxDecoration(
            color: on ? p.text : p.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: on ? p.text : p.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (on || icon != null) ...[
                AppIcon(
                  on ? Symbols.check_rounded : icon!,
                  size: 18,
                  color: on ? p.background : p.text,
                ),
                const SizedBox(width: 6),
              ],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: on ? p.background : p.text,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final preset in presets)
          chip(
            preset,
            on: note == preset,
            onTap: () => onChanged(note == preset ? null : preset),
          ),
        chip(
          own ? note! : l10n.marketPickerNote,
          on: own,
          icon: Symbols.edit_note_rounded,
          onTap: () async {
            final typed = await _askNote(context, own ? note : null);
            if (typed != null) onChanged(typed.isEmpty ? null : typed);
          },
        ),
      ],
    );
  }

  Future<String?> _askNote(BuildContext context, String? current) =>
      askMarketText(
        context,
        initial: current,
        hint: context.l10n.marketPickerNoteHint,
        maxLength: 200,
      );
}

class _UnitStepper extends StatelessWidget {
  const _UnitStepper({
    required this.quantity,
    required this.max,
    required this.onChanged,
  });

  final double quantity;
  final double? max;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Row(
        children: [
          IconButton.filledTonal(
            key: const ValueKey('market-units-minus'),
            onPressed: quantity > 1 ? () => onChanged(quantity - 1) : null,
            icon: const AppIcon(Symbols.remove_rounded),
          ),
          Expanded(
            child: Text(
              ltrRun(quantity.round().toString()),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          IconButton.filled(
            key: const ValueKey('market-units-plus'),
            onPressed: max == null || quantity + 1 <= max!
                ? () => onChanged(quantity + 1)
                : null,
            icon: const AppIcon(Symbols.add_rounded),
          ),
        ],
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({
    required this.label,
    required this.onTap,
    required this.enabled,
  });

  final String label;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return SizedBox(
      height: 60,
      child: FilledButton.icon(
        key: const ValueKey('market-product-add'),
        style: FilledButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: p.onPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        onPressed: enabled ? onTap : null,
        icon: const AppIcon(Symbols.add_shopping_cart_rounded),
        label: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            enabled ? label : l10n.marketSoldOut,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
        ),
      ),
    );
  }
}
