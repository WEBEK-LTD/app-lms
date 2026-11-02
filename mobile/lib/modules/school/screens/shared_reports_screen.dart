import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/report_providers.dart';
import '../widgets/school_widgets.dart';

/// 113.5 The teachers' reports the school shared with a student's parents,
/// newest first: what the teacher wrote in each field.
class SharedReportsScreen extends StatelessWidget {
  const SharedReportsScreen({super.key, this.student});

  /// The student a notification is about.
  final int? student;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: appBarBack(context),
      title: Text(context.l10n.schoolReports),
    ),
    body: SafeArea(
      top: false,
      child: StudentGate(
        wanted: student,
        builder: (context, me, s) => _SharedReports(studentId: s.id),
      ),
    ),
  );
}

class _SharedReports extends ConsumerWidget {
  const _SharedReports({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(sharedReportsProvider(studentId))) {
      AsyncValue(value: final list?) when list.isEmpty => MessageView(
        icon: AppIcons.assignment,
        title: l10n.schoolReportsNone,
        message: l10n.schoolReportsNoneMessage,
      ),
      AsyncValue(value: final list?) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(sharedReportsProvider(studentId)),
        child: ListView(
          key: const ValueKey('shared-reports'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            for (final r in list) ...[
              SharedReportCard(report: r),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
      AsyncValue(error: final ApiException e) when e.code == 'not_parent' =>
        MessageView(
          icon: AppIcons.assignment,
          title: l10n.schoolReports,
          message: l10n.schoolReportsParentsOnly,
        ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(sharedReportsProvider(studentId)),
      ),
      _ => const LoadingView(),
    };
  }
}

class SharedReportCard extends StatelessWidget {
  const SharedReportCard({super.key, required this.report});

  final SharedReport report;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('shared-report-${report.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            report.title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            [
              l10n.schoolReportsBy(report.teacherName),
              ?report.subject,
              if (report.period case final period?)
                l10n.reportsPeriod(
                  isoDayLabel(period.from),
                  isoDayLabel(period.to),
                ),
              shortDate(report.sharedAt.toLocal()),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          for (final field in report.fields)
            if (report.answers[field.id] case final value?) ...[
              const SizedBox(height: 12),
              Text(
                field.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 2),
              if (field.type == ReportFieldType.rating && value is int)
                Row(
                  children: [
                    for (var i = 1; i <= 5; i++)
                      AppIcon(
                        AppIcons.star,
                        size: 18,
                        color: i <= value ? p.accent : p.border,
                      ),
                    const SizedBox(width: 6),
                    Text(
                      l10n.reportsRatingOf(value),
                      style: TextStyle(fontSize: 14, color: p.textBody),
                    ),
                  ],
                )
              else if (field.type == ReportFieldType.choice)
                SchoolPill(label: '$value')
              else
                Text(
                  '$value',
                  style: TextStyle(fontSize: 15, color: p.textBody),
                ),
            ],
        ],
      ),
    );
  }
}
