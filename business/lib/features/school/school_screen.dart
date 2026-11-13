import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';

final schoolTodayProvider = FutureProvider.autoDispose<SchoolToday>(
  (ref) => ref.watch(apiProvider).schoolToday(ref.watch(appIdProvider)),
);

/// 125 A school's day (the School board): who is in, what needs the head,
/// buses, pick-ups, permission slips and fees.
class SchoolScreen extends ConsumerWidget {
  const SchoolScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(schoolTodayProvider);
    final l10n = context.l10n;
    final data = value.value;
    String? subtitle;
    if (data != null) {
      final day = DateTime.tryParse(data.date);
      final date = day == null
          ? data.date
          : DateFormat('EEEE d MMMM', context.lang).format(day);
      subtitle = data.closesAt == null
          ? date
          : l10n.schoolDateLine(date, data.closesAt!);
    }
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            StudioHeader(
              title: l10n.schoolTitle,
              subtitle: subtitle,
              bottom: 4,
            ),
            Expanded(
              child: AsyncBody(
                value: value,
                onRetry: () => ref.invalidate(schoolTodayProvider),
                builder: (d) => RefreshIndicator(
                  onRefresh: () => ref.refresh(schoolTodayProvider.future),
                  child: _SchoolBody(today: d),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SchoolBody extends ConsumerWidget {
  const _SchoolBody({required this.today});

  final SchoolToday today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final s = today.students;
    final total = s.total == 0 ? 1 : s.total;
    String n(int v) => context.number(v);
    Future<void> review(String kind) async {
      await context.push(Paths.schoolReview(kind));
      ref.invalidate(schoolTodayProvider);
    }

    final late = today.busesLate.firstOrNull;
    final needs = [
      if (today.needs.excuses > 0)
        NeedRow(
          icon: AppIcons.excuse,
          title: l10n.needsExcuses(today.needs.excuses),
          count: today.needs.excuses,
          onTap: () => review('excuses'),
        ),
      if (today.needs.reports > 0)
        NeedRow(
          icon: AppIcons.report,
          title: l10n.needsReports(today.needs.reports),
          count: today.needs.reports,
          onTap: () => review('reports'),
        ),
      if (today.needs.leave > 0)
        NeedRow(
          icon: AppIcons.leave,
          title: l10n.needsLeave(today.needs.leave),
          count: today.needs.leave,
          onTap: () => review('leave'),
        ),
    ];
    Widget stat(int value, String label, Color? color) => MergeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            n(value),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: color ?? c.ink,
            ),
          ),
          Text(label, style: TextStyle(fontSize: 12, color: c.ink2)),
        ],
      ),
    );
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Box(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Expanded(
                    child: Text(
                      l10n.studentsTitle,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    l10n.inAll(n(s.total)),
                    style: TextStyle(fontSize: 13, color: c.ink2),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ExcludeSemantics(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(5),
                  child: SizedBox(
                    height: 10,
                    child: ColoredBox(
                      color: c.muted,
                      child: Row(
                        children: [
                          for (final (v, color) in [
                            (s.inside, c.success),
                            (s.late, c.warning),
                            (s.absent, c.danger),
                          ])
                            if (v > 0)
                              Expanded(
                                flex: (v * 1000 ~/ total).clamp(1, 1000),
                                child: ColoredBox(color: color),
                              ),
                          if (total - s.inside - s.late - s.absent > 0)
                            Expanded(
                              flex:
                                  ((total - s.inside - s.late - s.absent) *
                                          1000 ~/
                                          total)
                                      .clamp(1, 1000),
                              child: const SizedBox.shrink(),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: stat(s.inside, l10n.studentsIn, c.success)),
                  const SizedBox(width: 8),
                  Expanded(child: stat(s.late, l10n.studentsLate, c.warning)),
                  const SizedBox(width: 8),
                  Expanded(child: stat(s.notYet, l10n.studentsNotYet, null)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: stat(s.absent, l10n.studentsAbsent, c.danger),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  for (final (label, inside, all) in [
                    (
                      l10n.teachersLabel,
                      today.teachers.inside,
                      today.teachers.total,
                    ),
                    (l10n.staffLabel, today.staff.inside, today.staff.total),
                  ])
                    Text.rich(
                      TextSpan(
                        style: TextStyle(fontSize: 13, color: c.ink2),
                        children: [
                          TextSpan(text: '$label '),
                          TextSpan(
                            text: l10n.countOf(n(inside), n(all)),
                            style: TextStyle(
                              color: c.ink,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        if (needs.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 16, 4, 12),
            child: Semantics(
              header: true,
              child: Text(
                l10n.needsYouNow,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          NeedsList(rows: needs),
        ],
        const SizedBox(height: 12),
        TileGrid(
          tiles: [
            InfoTile(
              icon: AppIcons.bus,
              title: l10n.busesRunning(today.busesRunning),
              text: late == null
                  ? l10n.busesOnTime
                  : l10n.busLate(
                      isolate(late.route),
                      l10n.minutesShort(late.minutes),
                    ),
            ),
            InfoTile(
              icon: AppIcons.pickupHand,
              title: l10n.pickupsCount(today.pickupsToday),
              text: l10n.pickupsText,
            ),
            for (final slip in today.slips)
              InfoTile(
                icon: AppIcons.slip,
                title: slip.title,
                text: l10n.slipLine(n(slip.yes), n(slip.no), n(slip.waiting)),
              ),
            if (today.feesCount > 0)
              InfoTile(
                icon: AppIcons.fees,
                title: l10n.feesDue(isolate(today.feesDue.formatted)),
                text: l10n.feesNotPaid(today.feesCount),
              ),
          ],
        ),
      ],
    );
  }
}
