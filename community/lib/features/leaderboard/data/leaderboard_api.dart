import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// 233.2 (area E) The leaderboard (`/leaderboard`): this week's or all-time.
enum BoardPeriod { week, all }

class BoardRow {
  const BoardRow({
    required this.rank,
    required this.member,
    required this.points,
  });

  factory BoardRow.fromJson(Json json) => BoardRow(
    rank: integer(json, 'rank'),
    member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
    points: integer(json, 'points'),
  );

  final int rank;
  final MemberSummary member;
  final int points;
}

class Board {
  const Board({this.rows = const [], this.myRank, this.myPoints});

  factory Board.fromJson(Json json) {
    final me = optObject(json, 'me');
    return Board(
      rows: listOf(json, 'items', BoardRow.fromJson),
      myRank: me == null ? null : optInt(me, 'rank'),
      myPoints: me == null ? null : optInt(me, 'points'),
    );
  }

  final List<BoardRow> rows;
  final int? myRank;
  final int? myPoints;
}

abstract class LeaderboardApi {
  Future<Board> board(BoardPeriod period);
}

class HttpLeaderboardApi implements LeaderboardApi {
  HttpLeaderboardApi(this._client);

  final ApiClient _client;

  @override
  Future<Board> board(BoardPeriod period) async => Board.fromJson(
    await _client.get('/leaderboard', query: {'period': period.name}),
  );
}

class FakeLeaderboardApi implements LeaderboardApi {
  final calls = <String>[];

  @override
  Future<Board> board(BoardPeriod period) async {
    calls.add('board:${period.name}');
    final week = period == BoardPeriod.week;
    return Board.fromJson({
      'items': [
        for (final (i, name) in ['Ayse', 'Omar', 'Elif'].indexed)
          {
            'rank': i + 1,
            'member': {
              'id': 'm$i',
              'username': name.toLowerCase(),
              'display_name': name,
            },
            'points': (week ? 320 : 4200) - i * (week ? 60 : 700),
          },
      ],
      'me': {'rank': week ? 14 : 31, 'points': week ? 85 : 960},
    });
  }
}

final leaderboardApiProvider = Provider<LeaderboardApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeLeaderboardApi()
      : HttpLeaderboardApi(ref.watch(apiClientProvider)),
);
