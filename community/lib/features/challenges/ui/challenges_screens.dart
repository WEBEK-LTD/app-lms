import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../qa/ui/content_direction.dart';
import '../../showcase/ui/flat_kit.dart';
import '../../showcase/ui/showcase_screens.dart';
import '../data/challenges_api.dart';
import '../home_card.dart';

final challengesProvider = FutureProvider.autoDispose<List<Challenge>>(
  (ref) => ref.watch(challengesApiProvider).challenges(),
);

final challengeProvider = FutureProvider.autoDispose.family<Challenge, String>(
  (ref, id) => ref.watch(challengesApiProvider).challenge(id),
);

final challengeEntriesProvider = FutureProvider.autoDispose
    .family<List<ChallengeEntry>, String>(
      (ref, id) => ref.watch(challengesApiProvider).entries(id),
    );

/// 233.3 The challenges.
class ChallengesScreen extends ConsumerWidget {
  const ChallengesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return FlatPage(
      title: l.challengesTitle,
      body: FlatAsyncList<Challenge>(
        value: ref.watch(challengesProvider),
        onRetry: () => ref.refresh(challengesProvider.future),
        empty: l.challengeEmpty,
        item: (c) => ChallengeCard(challenge: c, heading: false),
      ),
    );
  }
}

/// A challenge: its rules and dates, the entries with their votes, Enter.
class ChallengeScreen extends ConsumerWidget {
  const ChallengeScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(challengeProvider(id));
    final c = value.value;
    final signedIn = ref.watch(meProvider) != null;
    return FlatPage(
      title: c?.title ?? l.challengesTitle,
      body: c == null
          ? Center(
              child: value.hasError
                  ? TextButton(
                      onPressed: () => ref.invalidate(challengeProvider(id)),
                      child: Text(l.commonRetry),
                    )
                  : const CircularProgressIndicator(),
            )
          : FlatAsyncList<ChallengeEntry>(
              value: ref.watch(challengeEntriesProvider(id)),
              onRetry: () => ref.refresh(challengeEntriesProvider(id).future),
              header: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      FlatTag(
                        challengeStatusLabel(context, c.status),
                        accent: true,
                      ),
                      if (c.endsAt != null)
                        FlatTag(
                          l.challengeEnds(localWhen(context, c.endsAt!)),
                          icon: Symbols.schedule_rounded,
                        ),
                      if (c.rewardPoints > 0)
                        FlatTag(
                          l.challengeReward(c.rewardPoints),
                          icon: Symbols.stars_rounded,
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  FlatHeading(l.challengeRules, size: 15),
                  const SizedBox(height: 6),
                  Text(
                    c.rules,
                    textDirection: contentDirection(c.rules),
                    style: TextStyle(fontSize: 14.5, height: 1.6, color: p.ink),
                  ),
                  const SizedBox(height: 14),
                  if (c.entered)
                    FlatTag(
                      l.challengeEntered,
                      icon: Symbols.check_rounded,
                      accent: true,
                    )
                  else if (signedIn && c.status == ChallengeStatus.open)
                    FlatButton(
                      label: l.challengeEnter,
                      icon: Symbols.link_rounded,
                      onPressed: () => _enter(context, ref, c.id),
                    ),
                  const SizedBox(height: 16),
                  FlatHeading(
                    c.status == ChallengeStatus.closed
                        ? l.challengeWinners
                        : l.challengeEntriesTitle,
                    size: 15,
                  ),
                ],
              ),
              item: (e) => _EntryCard(
                challenge: c,
                entry: e,
                canVote: signedIn && c.status == ChallengeStatus.voting,
              ),
            ),
    );
  }
}

Future<void> _enter(BuildContext context, WidgetRef ref, String id) async {
  final l = context.l10n;
  final url = await askText(
    context,
    title: l.challengeEnter,
    hint: l.challengeEnterHint,
    send: l.challengeSend,
    long: false,
    keyboard: TextInputType.url,
  );
  if (url == null || url.isEmpty) return;
  try {
    await ref.read(challengesApiProvider).enter(id, url: url);
    ref
      ..invalidate(challengeProvider(id))
      ..invalidate(challengeEntriesProvider(id));
  } catch (e) {
    if (context.mounted) showFailure(context, e);
  }
}

class _EntryCard extends ConsumerWidget {
  const _EntryCard({
    required this.challenge,
    required this.entry,
    required this.canVote,
  });

  final Challenge challenge;
  final ChallengeEntry entry;
  final bool canVote;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final e = entry;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (e.showcase != null) ShowcaseCard(item: e.showcase!),
        FlatCard(
          onTap: e.showcase == null && e.url != null
              ? () => openLink(context, ref, e.url!)
              : null,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.member.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: p.ink,
                      ),
                    ),
                    if (e.note.isNotEmpty)
                      Text(
                        e.note,
                        style: TextStyle(fontSize: 13, color: p.muted),
                      ),
                    if (e.showcase == null && e.url != null)
                      Text(
                        e.url!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Brand.orange,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              canVote
                  ? FlatButton(
                      label:
                          '${e.voted ? l.challengeVoted : l.challengeVote} · ${e.voteCount}',
                      outlined: e.voted,
                      onPressed: () async {
                        try {
                          await ref
                              .read(challengesApiProvider)
                              .vote(challenge.id, e.id, on: !e.voted);
                          ref.invalidate(
                            challengeEntriesProvider(challenge.id),
                          );
                        } catch (err) {
                          if (context.mounted) showFailure(context, err);
                        }
                      },
                    )
                  : FlatTag(l.challengeVotes(e.voteCount)),
            ],
          ),
        ),
      ],
    );
  }
}
