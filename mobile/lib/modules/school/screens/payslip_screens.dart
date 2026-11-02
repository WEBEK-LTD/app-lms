import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/file_viewer.dart';
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';

/// 113.12 The person's own payslips, in the Staff tab and the teacher's
/// Classroom tab: each month's net and whether the school recorded it paid,
/// their advances still being taken back, and a payslip with its lines, the
/// payments the school wrote down and its PDF. Salaries are recorded by
/// hand: nothing is paid through the app.

/// "November 2026" of "2026-11".
String payslipMonth(String month) {
  final parts = month.split('-');
  final year = int.tryParse(parts.first) ?? 2000;
  final number = parts.length > 1 ? int.tryParse(parts[1]) ?? 1 : 1;
  return monthLabel(DateTime(year, number));
}

/// "5 Oct 2026" of "2026-10-05".
String payslipDay(String date) {
  final day = parseIsoDate(date);
  return day == null ? date : shortDate(day);
}

(String, PillTone) payslipStatusLabel(AppLocalizations l10n, PayslipStatus s) =>
    switch (s) {
      PayslipStatus.unpaid => (l10n.payslipUnpaid, PillTone.warn),
      PayslipStatus.partPaid => (l10n.payslipPartPaid, PillTone.neutral),
      PayslipStatus.paid => (l10n.payslipPaid, PillTone.good),
    };

/// A line's name: the school's words, else what it was suggested from.
String payslipLineName(AppLocalizations l10n, PayslipLine line) =>
    switch (line.source) {
      PayslipLineSource.absence => l10n.payslipAbsences(line.count ?? 0),
      PayslipLineSource.lateness => l10n.payslipLateness(line.count ?? 0),
      PayslipLineSource.advance => l10n.payslipAdvance,
      PayslipLineSource.office =>
        line.label.isNotEmpty
            ? line.label
            : line.kind == PayslipLineKind.bonus
            ? l10n.payslipBonus
            : l10n.payslipDeduction,
    };

class PayslipsScreen extends ConsumerWidget {
  const PayslipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.staffPayslips),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(payslipsProvider)) {
          AsyncValue(value: final data?) => RefreshIndicator(
            onRefresh: () => ref.refresh(payslipsProvider.future),
            child: ListView(
              key: const ValueKey('payslips'),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              children: [
                Text(
                  l10n.payslipsByHand,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                const SizedBox(height: 14),
                if (data.page.items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Text(
                      l10n.payslipsNone,
                      key: const ValueKey('payslips-none'),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  ),
                for (final slip in data.page.items) ...[
                  _PayslipCard(slip: slip),
                  const SizedBox(height: 10),
                ],
                if (data.advances.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  SectionHeader(title: l10n.payslipAdvances, size: 16),
                  for (final a in data.advances)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        l10n.payslipAdvanceLine(
                          a.amount.formatted,
                          payslipDay(a.givenOn),
                          a.instalment.formatted,
                          a.left.formatted,
                        ),
                        key: ValueKey('advance-${a.id}'),
                        style: TextStyle(fontSize: 14, color: p.textBody),
                      ),
                    ),
                ],
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(payslipsProvider),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _PayslipCard extends StatelessWidget {
  const _PayslipCard({required this.slip});

  final Payslip slip;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (label, tone) = payslipStatusLabel(l10n, slip.status);
    return AppCard(
      key: ValueKey('payslip-${slip.id}'),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Paths.staffPayslip(slip.id)),
      child: Row(
        children: [
          AppIcon(AppIcons.payslip, size: 26, color: p.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  payslipMonth(slip.month),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                Text(
                  l10n.payslipNetLine(slip.net.formatted),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          SchoolPill(label: label, tone: tone),
        ],
      ),
    );
  }
}

class PayslipScreen extends ConsumerWidget {
  const PayslipScreen({super.key, required this.id});

  final int id;

  /// The PDF from a fresh signed link, in the app's own viewer.
  Future<void> _view(BuildContext context, WidgetRef ref) async {
    final slip = await ref.refresh(payslipProvider(id).future);
    if (!context.mounted) return;
    await openInViewer(
      context,
      name: '${slip.number}.pdf',
      mimeType: 'application/pdf',
      load: () => ref.read(attachmentFetcherProvider)(slip.pdfUrl),
    );
  }

  /// The PDF outside the app, to keep it.
  Future<void> _download(WidgetRef ref) async {
    final slip = await ref.refresh(payslipProvider(id).future);
    await ref.read(openExternalProvider)(slip.pdfUrl);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(payslipProvider(id));
    final row = TextStyle(fontSize: 15, color: p.textBody);
    final strong = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      color: p.text,
    );
    Widget line(String name, String amount, {TextStyle? style, Key? key}) =>
        Padding(
          key: key,
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(
            children: [
              Expanded(child: Text(name, style: style ?? row)),
              Text(
                amount,
                textDirection: TextDirection.ltr,
                style: style ?? row,
              ),
            ],
          ),
        );
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(
          async.value == null
              ? l10n.staffPayslips
              : payslipMonth(async.value!.month),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final slip?) => ListView(
            key: const ValueKey('payslip'),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(slip.name, style: strong),
                        Text(
                          [
                            slip.number,
                            ?slip.jobTitle,
                            ?slip.department,
                          ].join(' · '),
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  () {
                    final (label, tone) = payslipStatusLabel(l10n, slip.status);
                    return SchoolPill(label: label, tone: tone);
                  }(),
                ],
              ),
              const SizedBox(height: 14),
              AppCard(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
                child: Column(
                  children: [
                    line(l10n.payslipBase, slip.base.formatted),
                    for (final a in slip.allowances)
                      line(a.name, '+${a.amount.formatted}'),
                    for (final b in slip.bonuses)
                      line(payslipLineName(l10n, b), '+${b.amount.formatted}'),
                    for (final d in slip.deductions)
                      line(
                        payslipLineName(l10n, d),
                        '−${d.amount.formatted}',
                        key: ValueKey('payslip-line-${d.source.name}'),
                      ),
                    Divider(color: p.divider, height: 18),
                    line(l10n.payslipGross, slip.gross.formatted),
                    line(
                      l10n.payslipDeductions,
                      '−${slip.totalDeductions.formatted}',
                    ),
                    line(
                      l10n.payslipNet,
                      slip.net.formatted,
                      style: strong,
                      key: const ValueKey('payslip-net'),
                    ),
                  ],
                ),
              ),
              if (slip.days != null) ...[
                const SizedBox(height: 10),
                Text(
                  l10n.payslipDays(
                    slip.days!.workingDays,
                    slip.days!.present,
                    slip.days!.absent,
                    slip.days!.late,
                    slip.days!.leave,
                  ),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
              if (slip.note != null) ...[
                const SizedBox(height: 10),
                Text(slip.note!, style: row),
              ],
              const SizedBox(height: 18),
              SectionHeader(title: l10n.payslipPayments, size: 16),
              if (slip.payments.isEmpty)
                Text(l10n.payslipUnpaid, style: row)
              else
                for (final pay in slip.payments)
                  line(
                    pay.method == PayMethod.cash
                        ? l10n.payslipCash(payslipDay(pay.paidOn))
                        : l10n.payslipBank(payslipDay(pay.paidOn)),
                    pay.amount.formatted,
                  ),
              if (slip.payments.isNotEmpty &&
                  slip.status != PayslipStatus.paid) ...[
                line(l10n.payslipPaidSoFar, slip.paid.formatted),
                line(l10n.payslipLeft, slip.left.formatted, style: strong),
              ],
              const SizedBox(height: 20),
              FilledButton.icon(
                key: const ValueKey('payslip-pdf'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                icon: const AppIcon(AppIcons.receipt, size: 20),
                label: Text(l10n.payslipViewPdf),
                onPressed: () => _view(context, ref),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                key: const ValueKey('payslip-download'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                icon: const AppIcon(AppIcons.download, size: 20),
                label: Text(l10n.payslipDownloadPdf),
                onPressed: () => _download(ref),
              ),
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(payslipProvider(id)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}
