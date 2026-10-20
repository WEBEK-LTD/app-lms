import 'package:flutter/material.dart';

import '../../core/api/models.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';

/// 63 What the door says for each outcome, in the app's language.
String memberOutcomeTitle(BuildContext context, MemberCheckIn result) {
  final l10n = context.l10n;
  return switch (result.outcome) {
    'admitted' => l10n.welcomeIn,
    'already_in' => l10n.alreadyInToday,
    'expired' => l10n.membershipEnded,
    'cancelled' => l10n.membershipCancelled,
    'not_started' => l10n.membershipNotStarted,
    'no_credits' => l10n.noClassesLeft,
    'not_found' => l10n.memberNotFound,
    'forged' || 'not_a_code' => l10n.notAMemberCode,
    _ => result.message,
  };
}

/// "Monthly unlimited · until 12 Nov · Unlimited classes".
String memberDetails(BuildContext context, Member m) {
  final l10n = context.l10n;
  return [
    m.planName,
    if (m.endsAt != null) l10n.memberUntil(context.date(m.endsAt!)),
    if (m.creditsLeft == null)
      l10n.unlimitedClasses
    else
      l10n.classesLeftCount(m.creditsLeft!),
  ].join(' · ');
}

/// 63 The door's answer, big and coloured: let in, already in today (with
/// when), or why not.
class MemberResultCard extends StatelessWidget {
  const MemberResultCard({super.key, required this.result});

  final MemberCheckIn result;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final already = result.outcome == 'already_in';
    final (Color bg, Color fg, IconData icon) = result.admitted
        ? (Brand.successBg, Brand.success, AppIcons.checkCircle)
        : already
        ? (Brand.warningBg, Brand.warning, AppIcons.warning)
        : (Brand.dangerBg, Brand.danger, AppIcons.error);
    final m = result.member;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: fg, size: 40, fill: 1),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    memberOutcomeTitle(context, result),
                    style: theme.textTheme.titleLarge?.copyWith(color: fg),
                  ),
                  if (m != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      m.name,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: Brand.midnight,
                      ),
                    ),
                    Text(
                      memberDetails(context, m),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Brand.midnight,
                      ),
                    ),
                    if (already && m.checkedInAt != null)
                      Text(
                        l10n.alreadyInAt(context.time(m.checkedInAt!)),
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: Brand.midnight,
                        ),
                      ),
                    if (result.outcome == 'expired' && m.endsAt != null)
                      Text(
                        l10n.endedOn(context.date(m.endsAt!)),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Brand.midnight,
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
