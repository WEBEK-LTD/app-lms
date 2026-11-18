import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/format/bidi.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import 'market_look.dart';
import 'market_store_widgets.dart';

/// 115.40 A supermarket's order while it is picked and brought (designs
/// 05a and 05b): how many lines are picked, the picker's proposed item to
/// accept or leave out before its time runs out (then the order's choice
/// applies), each line as picked, the weighed final price against the
/// estimate line by line, and the courier by first name with a masked call.

double _amount(api.MarketMoney m) => double.tryParse(m.amount) ?? 0;

/// The clock a proposal's countdown reads; tests set their own.
DateTime Function() marketClock = DateTime.now;

MarketUnit _unit(api.ProductUnit u) => switch (u) {
  api.ProductUnit.item => MarketUnit.piece,
  api.ProductUnit.kg => MarketUnit.kg,
  api.ProductUnit.g => MarketUnit.g,
  api.ProductUnit.l => MarketUnit.l,
};

/// What the line was priced at when ordered.
double marketLineEstimate(api.MarketOrderLine l) => l.estimatedTotal != null
    ? _amount(l.estimatedTotal!)
    : _amount(l.unitPrice) * l.quantity;

/// What the line came to once picked (its total from older servers).
double marketLineFinal(api.MarketOrderLine l) =>
    l.weighedTotal != null ? _amount(l.weighedTotal!) : _amount(l.total);

/// The ring of how many lines are picked, beside the order's heading.
class MarketPickedRing extends StatelessWidget {
  const MarketPickedRing({super.key, required this.order});

  final api.MarketOrder order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final total = order.lines.length;
    final done = order.lines.where((l) => l.picked).length;
    return SizedBox(
      width: 88,
      height: 88,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CircularProgressIndicator(
            value: total == 0 ? 0 : done / total,
            strokeWidth: 9,
            color: p.accent,
            backgroundColor: Colors.white.withValues(alpha: 0.18),
            strokeCap: StrokeCap.round,
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    ltrRun('$done/$total'),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: p.onPrimary,
                    ),
                  ),
                  Text(
                    l10n.marketPickedCount,
                    style: TextStyle(
                      fontSize: 12,
                      color: p.onPrimary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The picker's proposed item for a line that is out, with the time left
/// to answer.
class MarketProposalCard extends ConsumerStatefulWidget {
  const MarketProposalCard({
    super.key,
    required this.order,
    required this.line,
    required this.onAnswered,
  });

  final api.MarketOrder order;
  final api.MarketOrderLine line;
  final ValueChanged<api.MarketOrder?> onAnswered;

  @override
  ConsumerState<MarketProposalCard> createState() => _MarketProposalCardState();
}

class _MarketProposalCardState extends ConsumerState<MarketProposalCard> {
  Timer? _tick;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
      if (!widget.line.proposal!.waiting(marketClock())) {
        _tick?.cancel();
        widget.onAnswered(null);
      }
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _answer(bool accept) async {
    final id = widget.line.id;
    if (id == null || _sending) return;
    setState(() => _sending = true);
    try {
      final order = await ref
          .read(yallappApiProvider)
          .answerMarketSubstitute(widget.order.id, id, accept: accept);
      widget.onAnswered(order);
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(
        context,
        e.code == 'proposal_closed'
            ? context.l10n.marketProposalClosed
            : e.message,
      );
      widget.onAnswered(null);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final line = widget.line;
    final proposal = line.proposal!;
    final left = proposal.expiresAt.difference(marketClock());
    final seconds = left.isNegative ? 0 : left.inSeconds;
    final clock = ltrRun(
      '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}',
    );
    final take =
        (widget.order.ifMissing ?? line.ifMissing) ==
        api.MarketIfMissing.similar;
    final diff = _amount(proposal.difference);
    final qty = line.unit == api.ProductUnit.item
        ? '×${ltrRun(proposal.quantity.round().toString())}'
        : marketAmountText(l10n, _unit(line.unit), proposal.quantity);
    Widget side({
      required String? photo,
      required String label,
      required String name,
      required String price,
      String? extra,
      required bool strong,
    }) => Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: strong ? p.surface : p.background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1.6,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Opacity(
                    opacity: strong ? 1 : 0.45,
                    child: AppNetworkImage(url: photo, seed: name.hashCode),
                  ),
                ),
                PositionedDirectional(
                  top: 6,
                  start: 6,
                  child: MarketPill(
                    text: label,
                    background: strong
                        ? marketTint(p, p.primary, 0.18)
                        : p.surface.withValues(alpha: 0.9),
                    color: strong ? p.primary : p.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          Text(
            price,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: strong ? p.text : p.textSecondary,
            ),
          ),
          if (extra != null)
            Text(
              extra,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: marketDeeper(p.accent, 0.35),
              ),
            ),
        ],
      ),
    );
    final currency = ref.watch(marketConfigProvider)?.currency ?? 'EGP';
    final decimals = ref.watch(marketConfigProvider)?.currencyDecimals ?? 2;
    return Container(
      key: ValueKey('market-proposal-${line.id}'),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: p.accent, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: p.accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.marketYourAnswer.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: marketDeeper(p.accent, 0.4),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: p.accent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppIcon(
                      Symbols.timer_rounded,
                      size: 16,
                      color: p.onAccent,
                      filled: true,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      clock,
                      key: const ValueKey('market-proposal-clock'),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: p.onAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            l10n.marketOutTakeInstead(line.name),
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: side(
                  photo: line.imageUrl,
                  label: l10n.marketOutLabel,
                  name: line.name,
                  price: '$qty · ${ltrRun(line.unitPrice.formatted)}',
                  strong: false,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: p.accent,
                    shape: BoxShape.circle,
                  ),
                  child: AppIcon(AppIcons.forward, size: 18, color: p.onAccent),
                ),
              ),
              Expanded(
                child: side(
                  photo: proposal.imageUrl,
                  label: l10n.marketSimilarLabel,
                  name: proposal.name,
                  price: '$qty · ${ltrRun(proposal.total.formatted)}',
                  extra: diff.abs() < 0.005
                      ? null
                      : ltrRun(
                          '${diff > 0 ? '+' : '−'}${marketAmount(diff.abs(), currency, decimals)}',
                        ),
                  strong: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  key: ValueKey('market-proposal-decline-${line.id}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    foregroundColor: p.text,
                    side: BorderSide(color: p.border, width: 1.4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  onPressed: _sending ? null : () => _answer(false),
                  icon: const AppIcon(Symbols.close_rounded),
                  label: Text(
                    l10n.marketMissingRemove,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  key: ValueKey('market-proposal-accept-${line.id}'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    backgroundColor: p.primary,
                    foregroundColor: p.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(26),
                    ),
                  ),
                  onPressed: _sending ? null : () => _answer(true),
                  icon: const AppIcon(Symbols.check_rounded),
                  label: Text(
                    l10n.marketAccept,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            take ? l10n.marketNoAnswerSimilar : l10n.marketNoAnswerRemove,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// A line of a shop's order as picked: weighed, swapped, left out, or
/// waiting.
class MarketPickedRow extends StatelessWidget {
  const MarketPickedRow({super.key, required this.line, this.picking = true});

  final api.MarketOrderLine line;

  /// The order is still being picked: a line without an outcome waits.
  final bool picking;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final unit = _unit(line.unit);
    final asked = line.unit == api.ProductUnit.item
        ? (line.quantity == 1
              ? ''
              : ' ×${ltrRun(line.quantity.round().toString())}')
        : '';
    final (String title, String words) = switch (line.outcome) {
      'picked' when line.byWeight => (
        line.name,
        l10n.marketWeighedAt(
          marketAmountText(l10n, unit, line.pickedQuantity ?? line.quantity),
          ltrRun(line.total.formatted),
        ),
      ),
      'picked' => ('${line.name}$asked', ltrRun(line.total.formatted)),
      'substituted' => (
        '${line.substituteName ?? line.name}$asked',
        line.proposal?.answer == 'accepted'
            ? l10n.marketAcceptedFor(line.name)
            : l10n.marketChoiceFor(line.name),
      ),
      'missing' => (line.name, l10n.marketLeftOut),
      _ when picking => ('${line.name}$asked', l10n.marketWaitingPick),
      _ => (
        '${line.name}$asked',
        line.byWeight
            ? '${marketAmountText(l10n, unit, line.quantity)} · ${ltrRun(line.total.formatted)}'
            : ltrRun(line.total.formatted),
      ),
    };
    final done = line.outcome == 'picked' || line.outcome == 'substituted';
    return Padding(
      key: ValueKey('market-picked-${line.id}'),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: AppNetworkImage(
              url: line.imageUrl,
              seed: line.productId,
              width: 50,
              height: 50,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                Text(
                  words,
                  style: TextStyle(fontSize: 13.5, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: done
                  ? marketTint(p, p.success, 0.16)
                  : line.outcome == 'missing'
                  ? p.surfaceMuted
                  : Colors.transparent,
              shape: BoxShape.circle,
              border: line.outcome == null && picking
                  ? Border.all(color: p.border, width: 1.5)
                  : null,
            ),
            child: line.outcome == null
                ? (picking
                      ? null
                      : AppIcon(
                          Symbols.check_rounded,
                          size: 20,
                          color: p.success,
                        ))
                : AppIcon(
                    done ? Symbols.check_rounded : Symbols.remove_rounded,
                    size: 20,
                    color: done ? p.success : p.textSecondary,
                  ),
          ),
        ],
      ),
    );
  }
}

/// The weighed final price against the estimate, explained line by line,
/// and what the payment does with the difference.
class MarketWeighedCard extends ConsumerWidget {
  const MarketWeighedCard({super.key, required this.order});

  final api.MarketOrder order;

  /// Once every weighed line is picked (or the server says it is final).
  static bool shows(api.MarketOrder o) =>
      o.vendor.kind != api.VendorKind.restaurant &&
      o.lines.any((l) => l.byWeight) &&
      (o.estimated == false ||
          (o.estimated == null && o.lines.every((l) => l.picked)));

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(marketConfigProvider);
    final currency = config?.currency ?? 'EGP';
    final decimals = config?.currencyDecimals ?? 2;
    final tolerance = (config?.weightTolerancePercent ?? 10).toDouble();
    String money(double v) => marketAmount(v, currency, decimals);
    final total = _amount(order.total);
    final told =
        total +
        order.lines.fold<double>(
          0,
          (s, l) => s + marketLineEstimate(l) - marketLineFinal(l),
        );
    final weighed = order.lines.where(
      (l) => l.byWeight && l.outcome == 'picked',
    );
    final weighedFinal = weighed.fold<double>(
      0,
      (s, l) => s + marketLineFinal(l),
    );
    final limit = weighed.fold<double>(
      0,
      (s, l) => s + marketLineEstimate(l) * (100 + tolerance) / 100,
    );
    // Weighed lines first, then the swaps and what was left out.
    final changes = [
      for (final weighedFirst in [true, false])
        for (final l in order.lines)
          if (l.outcome != null &&
              (l.outcome == 'picked') == weighedFirst &&
              (marketLineFinal(l) - marketLineEstimate(l)).abs() >= 0.005)
            (l, marketLineFinal(l) - marketLineEstimate(l)),
    ];
    final card = order.payMethod != api.MarketPayMethod.cash;
    final less = told - total;
    final deep = marketDeeper(p.primary, 0.3);
    return Container(
      key: const ValueKey('market-weighed'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppIcon(Symbols.scale_rounded, size: 26, color: p.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n.marketWeighedFinal,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              if (limit == 0 || weighedFinal <= limit + 0.005)
                MarketPill(
                  text: l10n.marketWithinPercent(
                    ltrRun(tolerance.toStringAsFixed(0)),
                  ),
                  background: marketTint(p, p.success, 0.14),
                  color: p.success,
                  icon: Symbols.verified_rounded,
                ),
            ],
          ),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: p.background,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.marketYouWereTold,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: p.textSecondary,
                          ),
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            money(told),
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: p.textSecondary,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: deep,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.marketFinalPrice,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            order.total.formatted,
                            key: const ValueKey('market-final-total'),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (limit > 0) ...[
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (weighedFinal / limit).clamp(0, 1),
                minHeight: 8,
                color: p.primary,
                backgroundColor: p.surfaceMuted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              l10n.marketWeighedOfLimit(money(weighedFinal), money(limit)),
              style: TextStyle(fontSize: 13.5, color: p.textSecondary),
            ),
          ],
          for (final (l, d) in changes) ...[
            Divider(height: 18, color: p.divider),
            Row(
              children: [
                Expanded(child: _ChangeText(line: l)),
                const SizedBox(width: 8),
                Text(
                  ltrRun('${d > 0 ? '+' : '−'}${money(d.abs())}'),
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: d > 0 ? marketDeeper(p.accent, 0.4) : p.success,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppIcon(
                card ? Symbols.credit_card_rounded : Symbols.payments_rounded,
                size: 20,
                color: p.textSecondary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  card
                      ? (less > 0.005
                            ? l10n.marketCardRefunded(money(less))
                            : l10n.marketWeighCard)
                      : l10n.marketCashFinal,
                  style: TextStyle(fontSize: 13.5, color: p.textBody),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// "White cheese · 780 g not 750 g", "Short-grain rice ×2, you accepted".
class _ChangeText extends StatelessWidget {
  const _ChangeText({required this.line});

  final api.MarketOrderLine line;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final unit = _unit(line.unit);
    if (line.outcome == 'substituted') {
      final name =
          '${line.substituteName ?? line.name}'
          '${(line.substituteQuantity ?? 1) > 1 ? ' ×${ltrRun((line.substituteQuantity ?? 1).round().toString())}' : ''}';
      return Text(
        line.proposal?.answer == 'accepted'
            ? l10n.marketSubAccepted(name)
            : l10n.marketSubChosen(name),
        style: TextStyle(fontSize: 14, color: p.text),
      );
    }
    if (line.outcome == 'missing') {
      return Text(
        '${line.name} · ${l10n.marketLeftOut}',
        style: TextStyle(fontSize: 14, color: p.text),
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text:
                '${line.name} · ${marketAmountText(l10n, unit, line.pickedQuantity ?? line.quantity)} ',
          ),
          TextSpan(
            text: l10n.marketNotAmount(
              marketAmountText(l10n, unit, line.quantity),
            ),
            style: TextStyle(color: p.textTertiary),
          ),
        ],
      ),
      style: TextStyle(fontSize: 14, color: p.text),
    );
  }
}

/// The courier by first name and vehicle, with a call through the app's
/// masked line when it has one (the app's couriers only).
class MarketCourierCard extends ConsumerWidget {
  const MarketCourierCard({super.key, required this.tracking});

  final api.MarketTracking tracking;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final name = tracking.courierName!;
    final number = tracking.callNumber;
    return Container(
      key: const ValueKey('market-courier'),
      padding: const EdgeInsetsDirectional.fromSTEB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 58,
            height: 58,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: p.accent,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    name.characters.first.toUpperCase(),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: p.onAccent,
                    ),
                  ),
                ),
                PositionedDirectional(
                  end: -2,
                  bottom: -2,
                  child: Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: p.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: p.surface, width: 2),
                    ),
                    child: AppIcon(
                      Symbols.two_wheeler_rounded,
                      size: 14,
                      color: p.onPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.marketTrackingCourier(name),
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                if (tracking.vehicle case final v? when v.isNotEmpty)
                  Text(
                    v,
                    style: TextStyle(fontSize: 13.5, color: p.textSecondary),
                  ),
              ],
            ),
          ),
          if (number != null)
            Semantics(
              button: true,
              label: l10n.marketCallCourier,
              child: Material(
                color: marketTint(p, p.primary, 0.14),
                shape: const CircleBorder(),
                child: InkWell(
                  key: const ValueKey('market-call-courier'),
                  customBorder: const CircleBorder(),
                  onTap: () {
                    final code = tracking.callCode;
                    final dial = number.replaceAll(RegExp(r'[^0-9+]'), '');
                    // The code after a pause, for the relay to connect.
                    ref.read(openExternalProvider)(
                      code == null || code.isEmpty
                          ? 'tel:$dial'
                          : 'tel:$dial,${code.replaceAll(RegExp(r'[^0-9]'), '')}',
                    );
                  },
                  child: SizedBox(
                    width: 50,
                    height: 50,
                    child: AppIcon(
                      Symbols.call_rounded,
                      size: 24,
                      color: p.primary,
                      filled: true,
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
