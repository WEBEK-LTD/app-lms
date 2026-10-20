import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

typedef StatsRange = ({String range, String? from, String? to});

class _Range extends Notifier<StatsRange> {
  @override
  StatsRange build() => (range: '30', from: null, to: null);
  void set(StatsRange value) => state = value;
}

final statsRangeProvider = NotifierProvider<_Range, StatsRange>(_Range.new);

final analyticsProvider = FutureProvider.autoDispose<Analytics>((ref) {
  final r = ref.watch(statsRangeProvider);
  return ref
      .watch(apiProvider)
      .analytics(
        ref.watch(appIdProvider),
        range: r.range,
        from: r.from,
        to: r.to,
      );
});

enum _Metric { active, installs, sessions }

/// 59 Stats: Dashboard › Analytics for a range, in the app's time zone.
class StatsScreen extends ConsumerStatefulWidget {
  const StatsScreen({super.key});

  @override
  ConsumerState<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends ConsumerState<StatsScreen> {
  _Metric _metric = _Metric.active;

  Future<void> _custom() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now,
    );
    if (picked == null) return;
    String day(DateTime d) =>
        '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    ref.read(statsRangeProvider.notifier).set((
      range: 'custom',
      from: day(picked.start),
      to: day(picked.end),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final range = ref.watch(statsRangeProvider);
    final report = ref.watch(analyticsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.stats)),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(analyticsProvider.future),
        ),
        child: Column(
          children: [
            SizedBox(
              height: 56,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                children: [
                  for (final (value, label) in [
                    ('7', l10n.days7),
                    ('30', l10n.days30),
                    ('90', l10n.days90),
                  ])
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: ChoiceChip(
                        label: Text(label),
                        selected: range.range == value,
                        onSelected: (_) => ref
                            .read(statsRangeProvider.notifier)
                            .set((range: value, from: null, to: null)),
                      ),
                    ),
                  ChoiceChip(
                    label: Text(l10n.customRange),
                    selected: range.range == 'custom',
                    onSelected: (_) => _custom(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: AsyncBody(
                value: report,
                onRetry: () => ref.invalidate(analyticsProvider),
                builder: (a) => a.hasData
                    ? _report(context, a)
                    : EmptyState(
                        icon: AppIcons.stats,
                        title: l10n.noStats,
                        text: l10n.noStatsText,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _report(BuildContext context, Analytics a) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final values = [
      for (final d in a.daily)
        switch (_metric) {
          _Metric.active => d.active,
          _Metric.installs => d.installs,
          _Metric.sessions => d.sessions,
        },
    ];
    final metricLabel = switch (_metric) {
      _Metric.active => l10n.activeUsers,
      _Metric.installs => l10n.installs,
      _Metric.sessions => l10n.sessions,
    };
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Text(
          l10n.rangeDates(context.day(a.from), context.day(a.to), a.timeZone),
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        _KpiRow(kpis: a.kpis, previous: a.previous),
        SectionTitle(l10n.everyDay),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                children: [
                  for (final m in _Metric.values)
                    ChoiceChip(
                      label: Text(switch (m) {
                        _Metric.active => l10n.activeUsers,
                        _Metric.installs => l10n.installs,
                        _Metric.sessions => l10n.sessions,
                      }),
                      selected: _metric == m,
                      onSelected: (_) => setState(() => _metric = m),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              BarChart(values: values, label: metricLabel),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(context.day(a.from), style: theme.textTheme.labelSmall),
                  const Spacer(),
                  Text(context.day(a.to), style: theme.textTheme.labelSmall),
                ],
              ),
            ],
          ),
        ),
        if (a.retention.isNotEmpty) ...[
          SectionTitle(l10n.retention),
          Panel(
            child: Column(
              children: [
                for (final r in a.retention)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(child: Text(l10n.retentionDay(r.days))),
                        Text(
                          r.rate == null ? '—' : context.percent(r.rate!),
                          style: theme.textTheme.titleSmall,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
        for (final (title, shares) in [
          (l10n.platforms, a.platforms),
          (l10n.countries, a.countries),
          (l10n.screens, a.screens),
        ])
          if (shares.isNotEmpty) ...[
            SectionTitle(title),
            Panel(
              child: Column(
                children: [for (final s in shares) _ShareRow(share: s)],
              ),
            ),
          ],
      ],
    );
  }
}

class _KpiRow extends StatelessWidget {
  const _KpiRow({required this.kpis, required this.previous});

  final Kpis kpis;
  final Kpis previous;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final items = [
      (l10n.installs, kpis.installs.toDouble(), previous.installs.toDouble()),
      (l10n.activeAvg, kpis.activeAvg, previous.activeAvg),
      (l10n.weeklyActive, kpis.weekly.toDouble(), previous.weekly.toDouble()),
      (
        l10n.monthlyActive,
        kpis.monthly.toDouble(),
        previous.monthly.toDouble(),
      ),
      (l10n.sessions, kpis.sessions.toDouble(), previous.sessions.toDouble()),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final large = MediaQuery.textScalerOf(context).scale(10) > 13;
        final perRow = large ? 1 : 2;
        final width = (constraints.maxWidth - (perRow - 1) * 10) / perRow;
        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final (label, now, before) in items)
              SizedBox(
                width: width,
                child: MergeSemantics(
                  child: Panel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.number(
                            now == now.roundToDouble()
                                ? now.round()
                                : double.parse(now.toStringAsFixed(1)),
                          ),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          label,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        if (before > 0) _Change(now: now, before: before),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Change extends StatelessWidget {
  const _Change({required this.now, required this.before});

  final double now;
  final double before;

  @override
  Widget build(BuildContext context) {
    final change = (now - before) / before;
    final up = change >= 0;
    final color = up ? context.yb.success : context.yb.danger;
    final text = context.l10n.vsPrevious(context.percent(change.abs()));
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(
            up ? AppIcons.trendUp : AppIcons.trendDown,
            size: 18,
            color: color,
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              '${up ? '+' : '−'}$text',
              style: Theme.of(context).textTheme.labelSmall
                  ?.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShareRow extends StatelessWidget {
  const _ShareRow({required this.share});

  final Share share;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: MergeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(share.label)),
                Text(
                  '${context.number(share.value)} · ${context.percent(share.share)}',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 4),
            ExcludeSemantics(
              child: LinearProgressIndicator(
                value: share.share,
                minHeight: 6,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A simple bar chart, read aloud as its total and highest day. It follows
/// the reading direction (the newest day is at the end of the line).
class BarChart extends StatelessWidget {
  const BarChart({
    super.key,
    required this.values,
    required this.label,
    this.height = 140,
  });

  final List<int> values;
  final String label;
  final double height;

  @override
  Widget build(BuildContext context) {
    final most = values.isEmpty ? 0 : values.reduce(max);
    final total = values.fold(0, (a, b) => a + b);
    return Semantics(
      label: context.l10n.chartLabel(
        label,
        context.number(total),
        context.number(most),
      ),
      child: ExcludeSemantics(
        child: SizedBox(
          height: height,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final v in values)
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: values.length > 40 ? 0.5 : 2,
                    ),
                    child: FractionallySizedBox(
                      heightFactor: most == 0 ? 0.02 : max(0.02, v / most),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: context.yb.ink,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
