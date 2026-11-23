import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/shop_models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final daySummaryProvider = FutureProvider.autoDispose
    .family<DaySummary, String?>(
      (ref, date) => ref
          .watch(apiProvider)
          .daySummary(ref.watch(appIdProvider), date: date),
    );

String _iso(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// 214 A day's summary, which the end-of-day push opens: sales, orders, the
/// average order and the best seller, against the same weekday last week;
/// the day before and after.
class DaySummaryScreen extends ConsumerWidget {
  const DaySummaryScreen({super.key, this.date});

  final String? date;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final value = ref.watch(daySummaryProvider(date));
    return Scaffold(
      appBar: AppBar(title: Text(l10n.daySummaryTitle)),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(daySummaryProvider(date)),
        builder: (s) => _Body(summary: s),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.summary});

  final DaySummary summary;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = context.yb;
    final s = summary;
    final day = DateTime.tryParse(s.date);
    final today = _iso(DateTime.now());
    final pct = s.changePct;
    final (IconData icon, Color color, String compare) = pct == null
        ? (
            AppIcons.trendFlat,
            c.muted,
            l10n.daySummaryNoCompare(s.compareWeekday),
          )
        : pct > 0
        ? (
            AppIcons.trendUp,
            c.success,
            l10n.daySummaryUp(context.number(pct), s.compareWeekday),
          )
        : pct < 0
        ? (
            AppIcons.trendDown,
            c.danger,
            l10n.daySummaryDown(context.number(-pct), s.compareWeekday),
          )
        : (AppIcons.trendFlat, c.muted, l10n.daySummarySame(s.compareWeekday));
    Widget stat(String label, String value, {Key? key}) => Expanded(
      child: Panel(
        key: key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(color: c.muted),
            ),
          ],
        ),
      ),
    );
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Row(
          children: [
            IconButton(
              key: const ValueKey('day-before'),
              tooltip: l10n.daySummaryBefore,
              icon: const DirectionalIcon(AppIcons.back),
              onPressed: day == null
                  ? null
                  : () => _go(
                      context,
                      _iso(day.subtract(const Duration(days: 1))),
                    ),
            ),
            Expanded(
              child: Text(
                day == null ? s.date : context.date(day),
                textAlign: TextAlign.center,
                style: theme.textTheme.titleMedium,
              ),
            ),
            IconButton(
              key: const ValueKey('day-after'),
              tooltip: l10n.daySummaryAfter,
              icon: const DirectionalIcon(AppIcons.forward),
              onPressed: day == null || s.date.compareTo(today) >= 0
                  ? null
                  : () => _go(context, _iso(day.add(const Duration(days: 1)))),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Panel(
          color: c.goldBg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.daySummarySales, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 4),
              Text(
                s.sales.formatted,
                key: const ValueKey('day-sales'),
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(icon, color: color, size: 20),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(compare, style: TextStyle(color: color)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            stat(l10n.daySummaryOrders, context.number(s.orders)),
            const SizedBox(width: 10),
            stat(l10n.daySummaryAverage, s.average?.formatted ?? '—'),
          ],
        ),
        const SizedBox(height: 10),
        Panel(
          child: Row(
            children: [
              Icon(AppIcons.products, color: c.accent),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.daySummaryBest,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: c.muted,
                      ),
                    ),
                    Text(
                      s.bestSeller ?? l10n.daySummaryNoBest,
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Panel(
          child: Text(
            l10n.daySummaryLastWeek(
              s.compareWeekday,
              s.compareSales.formatted,
              context.number(s.compareOrders),
            ),
          ),
        ),
      ],
    );
  }

  void _go(BuildContext context, String date) => Navigator.of(context)
      .pushReplacement(
        MaterialPageRoute<void>(builder: (_) => DaySummaryScreen(date: date)),
      );
}
