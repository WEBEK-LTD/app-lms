import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/account_scaffold.dart';

/// 91.4 The customer's loyalty points (`GET /me/points`).
final myPointsProvider = FutureProvider.autoDispose<PointsAccount>(
  (ref) => ref.read(yallappApiProvider).getMyPoints(),
);

/// 91.4 My points: the balance, what it's worth, how points are earned, and
/// the latest changes.
class PointsScreen extends ConsumerWidget {
  const PointsScreen({super.key});

  static String reason(BuildContext context, PointsReason r) {
    final l10n = context.l10n;
    return switch (r) {
      PointsReason.earned => l10n.pointsReasonEarned,
      PointsReason.used => l10n.pointsReasonUsed,
      PointsReason.givenBack => l10n.pointsReasonGivenBack,
      PointsReason.takenBack => l10n.pointsReasonTakenBack,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final rules = ref.watch(appConfigProvider).store?.loyalty;
    final async = ref.watch(myPointsProvider);
    final account = async.value;
    final Widget body;
    if (account == null && async.hasError) {
      body = ErrorView(
        error: async.error!,
        onRetry: () => ref.invalidate(myPointsProvider),
      );
    } else if (account == null) {
      body = SkeletonDetail(label: l10n.myPoints);
    } else {
      body = RefreshIndicator(
        onRefresh: () => ref.refresh(myPointsProvider.future),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            AppCard(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  AppIcon(AppIcons.loyalty, size: 32, color: p.text),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.pointsBalance(account.balance),
                          key: const Key('points-balance'),
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                        Text(
                          l10n.pointsWorth(account.value),
                          style: TextStyle(
                            fontSize: 14,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (rules != null) ...[
              const SizedBox(height: 12),
              Text(
                '${l10n.pointsRule(rules.spendPerPoint, rules.pointValue)} '
                '${l10n.cartPointsFrom(rules.minPoints)}',
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
            ],
            const SizedBox(height: 24),
            SectionHeader(title: l10n.pointsHistory),
            const SizedBox(height: 8),
            if (account.entries.isEmpty)
              Text(
                l10n.noPointsYet,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
            for (final e in account.entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            reason(context, e.reason),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: p.text,
                            ),
                          ),
                          Text(
                            [
                              if (e.orderNumber != null)
                                l10n.orderNumber(e.orderNumber!),
                              shortDate(e.createdAt),
                            ].join(' · '),
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      e.points > 0 ? '+${e.points}' : '−${-e.points}',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: e.points > 0 ? p.success : p.text,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      );
    }
    return AccountScaffold(
      title: l10n.myPoints,
      scrollable: false,
      child: body,
    );
  }
}
