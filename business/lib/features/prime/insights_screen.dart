import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';
import 'prime_widgets.dart';

final insightsProvider = FutureProvider.autoDispose
    .family<PrimeInsights, String>(
      (ref, period) => ref
          .watch(apiProvider)
          .primeInsights(ref.watch(appIdProvider), period: period),
    );

/// 125 Prime insights (the PrimeInsights board): this week or month against
/// the last, the busiest hours, customers who came back, the average order,
/// the best sellers. Nothing is invented: what the server can't tell stays
/// out.
class InsightsScreen extends ConsumerStatefulWidget {
  const InsightsScreen({super.key});

  @override
  ConsumerState<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends ConsumerState<InsightsScreen> {
  String _period = 'week';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = ref.watch(insightsProvider(_period));
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.insightsTitle),
        actions: const [PrimeChip()],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Segments(
            height: 36,
            labels: [l10n.thisWeek, l10n.thisMonth],
            selected: _period == 'week' ? 0 : 1,
            onSelected: (i) =>
                setState(() => _period = i == 0 ? 'week' : 'month'),
          ),
          Expanded(
            child: AsyncBody(
              value: value,
              onRetry: () => ref.invalidate(insightsProvider(_period)),
              builder: (data) => RefreshIndicator(
                onRefresh: () => ref.refresh(insightsProvider(_period).future),
                child: _InsightsBody(data: data),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InsightsBody extends StatelessWidget {
  const _InsightsBody({required this.data});

  final PrimeInsights data;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final week = data.period != 'month';
    final vs = week ? l10n.vsLastWeek : l10n.vsLastMonth;
    final empty =
        data.days.isEmpty &&
        data.best.isEmpty &&
        data.salesNow.amountCents == 0 &&
        data.ordersNow == 0;
    if (empty) {
      return EmptyState(
        icon: AppIcons.insights,
        title: l10n.noInsights,
        text: l10n.noInsightsText,
      );
    }
    final change = changeText(context, data.salesChangePct, vs);
    final dense = data.days.length > 10;
    final peak = math.max(
      1,
      data.days.fold<int>(
        0,
        (m, d) => math.max(m, math.max(d.nowCents, d.beforeCents)),
      ),
    );
    Widget card(List<Widget> children, {double gap = 10}) => Box(
      radius: 18,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) SizedBox(height: gap),
            children[i],
          ],
        ],
      ),
    );
    Text title(String text) => Text(
      text,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
    );
    Widget legend(Color color, String label) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: c.ink2)),
      ],
    );
    final returning = data.returningPct;
    final points = data.returningChangePts;
    final average = data.averageNow;
    final before = data.averageBefore;
    String? averageChange;
    Color averageColor = c.ink2;
    if (average != null && before != null) {
      if (average.amountCents == before.amountCents ||
          before.amountCents == 0) {
        averageChange = week ? l10n.sameAsLastWeek : l10n.sameAsLastMonth;
      } else {
        final pct =
            (average.amountCents - before.amountCents) /
            before.amountCents *
            100;
        averageChange = changeText(context, pct, vs);
        averageColor = pct < 0 ? c.danger : c.success;
      }
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        card([
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 8,
            children: [
              Text(
                data.salesNow.formatted,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (change != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Text(
                    change,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: (data.salesChangePct ?? 0) < 0
                          ? c.danger
                          : c.success,
                    ),
                  ),
                ),
            ],
          ),
          if (data.days.isNotEmpty)
            ExcludeSemantics(
              child: SizedBox(
                height: 96,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (var i = 0; i < data.days.length; i++) ...[
                      if (i > 0) SizedBox(width: dense ? 2 : 10),
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            SizedBox(
                              height: 72,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  for (final (v, color) in [
                                    (data.days[i].beforeCents, c.line),
                                    (data.days[i].nowCents, c.accent),
                                  ]) ...[
                                    Expanded(
                                      child: Container(
                                        height: 72 * v / peak,
                                        decoration: BoxDecoration(
                                          color: color,
                                          borderRadius:
                                              const BorderRadius.vertical(
                                                top: Radius.circular(4),
                                              ),
                                        ),
                                      ),
                                    ),
                                    if (color == c.line && !dense)
                                      const SizedBox(width: 2),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(height: 4),
                            // A month's 30 days: the first and last
                            // labels only, under the bars.
                            Text(
                              dense ? '' : data.days[i].label,
                              maxLines: 1,
                              overflow: TextOverflow.clip,
                              style: TextStyle(fontSize: 11, color: c.ink2),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          if (dense)
            Row(
              children: [
                Text(
                  data.days.first.label,
                  style: TextStyle(fontSize: 11, color: c.ink2),
                ),
                const Spacer(),
                Text(
                  data.days.last.label,
                  style: TextStyle(fontSize: 11, color: c.ink2),
                ),
              ],
            ),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              legend(c.accent, week ? l10n.thisWeek : l10n.thisMonth),
              legend(c.line, week ? l10n.lastWeek : l10n.lastMonth),
            ],
          ),
        ]),
        if (data.peakRows.isNotEmpty && data.peakHours.isNotEmpty) ...[
          const SizedBox(height: 12),
          card(gap: 8, [
            title(l10n.peakHours),
            ExcludeSemantics(
              child: Column(
                children: [
                  Row(
                    children: [
                      const SizedBox(width: 32),
                      for (final h in data.peakHours)
                        Expanded(
                          child: Text(
                            context.number(h),
                            style: TextStyle(fontSize: 11, color: c.ink2),
                          ),
                        ),
                    ],
                  ),
                  for (final row in data.peakRows)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 32,
                            child: Text(
                              row.dayLabel,
                              maxLines: 1,
                              overflow: TextOverflow.clip,
                              style: TextStyle(fontSize: 11, color: c.ink2),
                            ),
                          ),
                          for (var i = 0; i < data.peakHours.length; i++)
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsetsDirectional.only(
                                  end: 4,
                                ),
                                child: Container(
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: c.accent.withValues(
                                      alpha: i < row.cells.length
                                          ? row.cells[i]
                                          : 0,
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            if (data.busiestLabel != null)
              Text(
                l10n.busiestLine(data.busiestLabel!),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
          ]),
        ],
        if (returning != null || average != null) ...[
          const SizedBox(height: 12),
          TileGrid(
            tiles: [
              if (returning != null)
                _Figure(
                  label: l10n.returningTitle,
                  value: l10n.percentValue(context.number(returning.round())),
                  change: points == null
                      ? null
                      : points.round() == 0
                      ? (week ? l10n.sameAsLastWeek : l10n.sameAsLastMonth)
                      : '${points > 0 ? '▲' : '▼'} ${l10n.pointsChange(points.abs().round())}',
                  color: points == null || points.round() == 0
                      ? c.ink2
                      : points < 0
                      ? c.danger
                      : c.success,
                ),
              if (average != null)
                _Figure(
                  label: l10n.averageOrder,
                  value: average.formatted,
                  change: averageChange,
                  color: averageColor,
                ),
            ],
          ),
        ],
        if (data.best.isNotEmpty) ...[
          const SizedBox(height: 12),
          card(gap: 8, [
            title(l10n.bestSellers),
            for (var i = 0; i < data.best.length; i++)
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${context.number(i + 1)} · ${data.best[i].name}',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  Text(
                    data.best[i].total.formatted,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
          ]),
        ],
      ],
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({
    required this.label,
    required this.value,
    required this.color,
    this.change,
  });

  final String label;
  final String value;
  final String? change;
  final Color color;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Box(
      radius: 18,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: context.yb.ink2)),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
          ),
          if (change != null)
            Text(
              change!,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
        ],
      ),
    ),
  );
}
