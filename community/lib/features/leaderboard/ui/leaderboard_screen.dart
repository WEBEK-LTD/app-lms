import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../qa/ui/widgets/member_avatar.dart';
import '../../showcase/ui/flat_kit.dart';
import '../data/leaderboard_api.dart';

final boardPeriodProvider = NotifierProvider<_Period, BoardPeriod>(_Period.new);

class _Period extends Notifier<BoardPeriod> {
  @override
  BoardPeriod build() => BoardPeriod.week;

  void set(BoardPeriod p) => state = p;
}

final boardProvider = FutureProvider.autoDispose<Board>(
  (ref) =>
      ref.watch(leaderboardApiProvider).board(ref.watch(boardPeriodProvider)),
);

/// 233.2 The leaderboard: this week's or all-time, the member's own place
/// at the top.
class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final period = ref.watch(boardPeriodProvider);
    final board = ref.watch(boardProvider);
    final me = board.value;
    return FlatPage(
      title: l.boardTitle,
      body: Column(
        children: [
          FlatChoices<BoardPeriod>(
            values: BoardPeriod.values,
            label: (v) => v == BoardPeriod.week ? l.boardWeek : l.boardAll,
            selected: period,
            onSelected: ref.read(boardPeriodProvider.notifier).set,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FlatAsyncList<BoardRow>(
              value: board.whenData((b) => b.rows),
              onRetry: () => ref.refresh(boardProvider.future),
              header: me?.myRank == null
                  ? null
                  : FlatTag(
                      l.boardYou(me!.myRank!, me.myPoints ?? 0),
                      accent: true,
                    ),
              item: (r) => FlatCard(
                child: Row(
                  children: [
                    SizedBox(
                      width: 32,
                      child: Text(
                        '${r.rank}',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: r.rank <= 3 ? Brand.orange : p.muted,
                        ),
                      ),
                    ),
                    MemberAvatar(member: r.member, size: 36),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        r.member.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: p.ink,
                        ),
                      ),
                    ),
                    Text(
                      l.boardPoints(r.points),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: p.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
