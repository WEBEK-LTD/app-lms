import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../market/screens/market_complaint_screens.dart'
    show complaintReasonText, complaintStatusText;
import '../data/vendor_providers.dart';

/// `YYYY-MM` of [day].
String vendorMonthOf(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}';

/// The month [delta] months from `YYYY-MM` [month].
String vendorMonthShift(String month, int delta) {
  final parts = month.split('-');
  final y = int.tryParse(parts.first) ?? 2000;
  final m = int.tryParse(parts.length > 1 ? parts[1] : '') ?? 1;
  return vendorMonthOf(DateTime(y, m + delta));
}

DateTime _monthDay(String month) {
  final parts = month.split('-');
  return DateTime(
    int.tryParse(parts.first) ?? 2000,
    int.tryParse(parts.length > 1 ? parts[1] : '') ?? 1,
  );
}

/// 115.16 The vendor's monthly statements, for its owners and managers:
/// the month's delivered orders, what the vendor earns and the app's
/// commission, the refunds and compensations decided on them, and what
/// is due between the vendor and the app.
class VendorStatementsScreen extends ConsumerStatefulWidget {
  const VendorStatementsScreen({super.key});

  @override
  ConsumerState<VendorStatementsScreen> createState() =>
      _VendorStatementsScreenState();
}

class _VendorStatementsScreenState
    extends ConsumerState<VendorStatementsScreen> {
  /// Null for this month.
  String? _month;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(vendorStatementProvider(_month));
    final thisMonth = vendorMonthOf(DateTime.now());
    final shown = async.value?.month ?? _month ?? thisMonth;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.vendorStatementsTitle),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
            child: Row(
              children: [
                IconButton(
                  key: const ValueKey('vendor-month-previous'),
                  tooltip: l10n.vendorPreviousMonth,
                  icon: const Icon(AppIcons.back),
                  onPressed: () =>
                      setState(() => _month = vendorMonthShift(shown, -1)),
                ),
                Expanded(
                  child: Text(
                    monthLabel(_monthDay(shown)),
                    key: const ValueKey('vendor-month'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
                IconButton(
                  key: const ValueKey('vendor-month-next'),
                  tooltip: l10n.vendorNextMonth,
                  icon: const Icon(AppIcons.forward),
                  onPressed: shown.compareTo(thisMonth) >= 0
                      ? null
                      : () => setState(() {
                          final next = vendorMonthShift(shown, 1);
                          _month = next == thisMonth ? null : next;
                        }),
                ),
              ],
            ),
          ),
          Expanded(
            child: switch (async) {
              AsyncValue(value: final s?) => RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(vendorStatementProvider(_month)),
                child: _StatementView(statement: s),
              ),
              AsyncValue(error: final e?) => ErrorView(
                error: e,
                onRetry: () => ref.invalidate(vendorStatementProvider(_month)),
              ),
              _ => const SkeletonList(layout: SkeletonLayout.text),
            },
          ),
        ],
      ),
    );
  }
}

class _StatementView extends StatelessWidget {
  const _StatementView({required this.statement});

  final VendorStatement statement;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final s = statement;
    final owes = s.net.amount.startsWith('-');
    Widget row(String label, String value, {Key? key, bool strong = false}) =>
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: strong ? p.text : p.textSecondary,
                    fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
                  ),
                ),
              ),
              Text(
                value,
                key: key,
                style: TextStyle(
                  color: p.text,
                  fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        );
    TextStyle heading() => TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w800,
      color: p.textSecondary,
    );
    return ListView(
      key: const ValueKey('vendor-statement'),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              row(
                l10n.vendorStatementOrders(s.orderCount),
                s.total.formatted,
                key: const ValueKey('vendor-statement-total'),
              ),
              row(l10n.vendorStatementEarns, s.vendorEarns.formatted),
              row(l10n.vendorStatementCommission, s.commission.formatted),
              const Divider(height: 20),
              row(
                owes ? l10n.vendorStatementYouOwe : l10n.vendorStatementDue,
                owes ? s.net.formatted.replaceFirst('-', '') : s.net.formatted,
                key: const ValueKey('vendor-statement-net'),
                strong: true,
              ),
            ],
          ),
        ),
        if (s.orders.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: MessageView(
              icon: Symbols.receipt_long,
              title: l10n.vendorStatementEmpty,
            ),
          )
        else ...[
          const SizedBox(height: 20),
          Text(l10n.vendorStatementOrdersTitle, style: heading()),
          const SizedBox(height: 8),
          for (final o in s.orders)
            ListTile(
              key: ValueKey('vendor-statement-order-${o.id}'),
              contentPadding: EdgeInsets.zero,
              title: Text(o.reference),
              subtitle: Text(shortDate(o.at)),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    o.total.formatted,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  Text(
                    l10n.vendorStatementDueEach(o.dueToVendor.formatted),
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                ],
              ),
            ),
        ],
        if (s.adjustments.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(l10n.vendorStatementAdjustments, style: heading()),
          const SizedBox(height: 8),
          for (final a in s.adjustments)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                a.refund
                    ? l10n.vendorAdjustmentRefund(a.reference)
                    : l10n.vendorAdjustmentCompensation(a.reference),
              ),
              subtitle: Text(
                '${shortDate(a.at)} · ${a.byVendor ? l10n.vendorPaidByYou : l10n.vendorPaidByApp}',
              ),
              trailing: Text(
                a.amount.formatted,
                style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
              ),
            ),
        ],
      ],
    );
  }
}

/// 115.16 The complaints the app's support shared with the vendor, read
/// only: what was wrong, its status and the decision, and who pays it.
/// Support answers the customer; the vendor never sees who they are.
class VendorComplaintsScreen extends ConsumerWidget {
  const VendorComplaintsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final async = ref.watch(vendorComplaintsProvider);
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.vendorComplaintsTitle),
      ),
      body: switch (async) {
        AsyncValue(value: final items?) when items.isEmpty => RefreshIndicator(
          onRefresh: () async => ref.invalidate(vendorComplaintsProvider),
          child: ListView(
            children: [
              MessageView(
                icon: Symbols.support_agent,
                title: l10n.vendorComplaintsEmptyTitle,
                message: l10n.vendorComplaintsEmptyMessage,
              ),
            ],
          ),
        ),
        AsyncValue(value: final items?) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(vendorComplaintsProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) => _ComplaintCard(
              key: ValueKey('vendor-complaint-${items[i].complaint.id}'),
              item: items[i],
            ),
          ),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(vendorComplaintsProvider),
        ),
        _ => const SkeletonList(layout: SkeletonLayout.text),
      },
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard({super.key, required this.item});

  final VendorComplaint item;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = item.complaint;
    final d = c.decision;
    final amount = d?.amount?.formatted ?? '';
    final decision = d == null
        ? null
        : switch (d.outcome) {
            'refund' => l10n.marketDecisionRefund(amount),
            'partial_refund' => l10n.marketDecisionPartial(amount),
            'compensation' => l10n.marketDecisionCompensation(amount),
            _ => l10n.marketDecisionNone,
          };
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${c.reference} · ${l10n.vendorComplaintOrder(item.orderReference)}',
                  style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
                ),
              ),
              Text(
                complaintStatusText(l10n, c.status),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: c.closed ? p.textSecondary : p.primary,
                ),
              ),
            ],
          ),
          Text(
            '${complaintReasonText(l10n, c.reason)} · ${shortDate(c.createdAt)}',
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(c.text, style: TextStyle(color: p.textBody)),
          if (c.photos.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: c.photos.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) => ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: AppNetworkImage(
                    url: c.photos[i],
                    width: 64,
                    height: 64,
                  ),
                ),
              ),
            ),
          ],
          if (decision != null) ...[
            const SizedBox(height: 8),
            Text(
              decision,
              key: ValueKey('vendor-complaint-decision-${c.id}'),
              style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
            ),
            if (d!.outcome != 'no_refund')
              Text(
                item.byVendor ? l10n.vendorPaidByYou : l10n.vendorPaidByApp,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
          ],
        ],
      ),
    );
  }
}
