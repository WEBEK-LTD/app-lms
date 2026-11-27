import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/l10n.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/sym.dart';
import '../showcase/ui/flat_kit.dart';
import 'data/challenges_api.dart';

/// 233.3 The challenge home shows (area D's home places [ChallengeCard]):
/// the first one open or voting, or null when there is none.
final featuredChallengeProvider = FutureProvider<Challenge?>((ref) async {
  final all = await ref.watch(challengesApiProvider).challenges();
  for (final c in all) {
    if (c.status == ChallengeStatus.open ||
        c.status == ChallengeStatus.voting) {
      return c;
    }
  }
  return null;
});

String challengeStatusLabel(BuildContext context, ChallengeStatus s) {
  final l = context.l10n;
  return switch (s) {
    ChallengeStatus.upcoming => l.challengeUpcoming,
    ChallengeStatus.open => l.challengeOpen,
    ChallengeStatus.voting => l.challengeVoting,
    ChallengeStatus.closed => l.challengeClosed,
  };
}

/// The home's challenge card: its title, its state and its reward.
class ChallengeCard extends StatelessWidget {
  const ChallengeCard({
    super.key,
    required this.challenge,
    this.heading = true,
  });

  final Challenge challenge;

  /// "This week's challenge" above the title (on home).
  final bool heading;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final c = challenge;
    return FlatCard(
      semanticLabel: c.title,
      onTap: () => context.push(FeatureLinks.challenge(c.id)),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Brand.orange.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Sym(
              Symbols.emoji_events_rounded,
              color: Brand.orange,
              fill: true,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (heading)
                  Text(
                    l.challengeCardTitle,
                    style: TextStyle(fontSize: 12, color: p.muted),
                  ),
                FlatHeading(c.title, size: 15.5),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    FlatTag(
                      challengeStatusLabel(context, c.status),
                      accent: true,
                    ),
                    if (c.rewardPoints > 0)
                      FlatTag(
                        l.challengeReward(c.rewardPoints),
                        icon: Symbols.stars_rounded,
                      ),
                    FlatTag(l.challengeEntries(c.entryCount)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
