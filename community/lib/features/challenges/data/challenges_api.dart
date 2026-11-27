import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';
import '../../showcase/data/showcase_api.dart';

/// 233.3 (area E) Challenges (`/challenges`): the team posts one with its
/// dates and rules, members enter a showcase item or a link and vote, and
/// the winners get points or a badge.
enum ChallengeStatus { upcoming, open, voting, closed }

class ChallengeEntry {
  const ChallengeEntry({
    required this.id,
    required this.member,
    this.showcase,
    this.url,
    this.note = '',
    this.voteCount = 0,
    this.voted = false,
  });

  factory ChallengeEntry.fromJson(Json json) {
    final showcase = optObject(json, 'showcase');
    return ChallengeEntry(
      id: str(json, 'id'),
      member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
      showcase: showcase == null ? null : ShowcaseSummary.fromJson(showcase),
      url: optStr(json, 'url'),
      note: str(json, 'note'),
      voteCount: integer(json, 'vote_count'),
      voted: boolean(json, 'voted'),
    );
  }

  final String id;
  final MemberSummary member;
  final ShowcaseSummary? showcase;
  final String? url;
  final String note;
  final int voteCount;
  final bool voted;
}

class Challenge {
  const Challenge({
    required this.id,
    required this.title,
    required this.status,
    this.endsAt,
    this.rules = '',
    this.coverUrl,
    this.rewardPoints = 0,
    this.rewardBadge,
    this.entryCount = 0,
    this.entered = false,
    this.winners = const [],
  });

  factory Challenge.fromJson(Json json) => Challenge(
    id: str(json, 'id'),
    title: str(json, 'title'),
    rules: str(json, 'rules'),
    coverUrl: optStr(json, 'cover_url'),
    status: switch (optStr(json, 'status')) {
      'upcoming' => ChallengeStatus.upcoming,
      'voting' => ChallengeStatus.voting,
      'closed' => ChallengeStatus.closed,
      _ => ChallengeStatus.open,
    },
    endsAt: optDate(json, 'ends_at'),
    rewardPoints: integer(json, 'reward_points'),
    rewardBadge: optStr(json, 'reward_badge'),
    entryCount: integer(json, 'entry_count'),
    entered: boolean(json, 'entered'),
    winners: listOf(json, 'winners', ChallengeEntry.fromJson),
  );

  final String id;
  final String title;
  final String rules;
  final String? coverUrl;
  final ChallengeStatus status;
  final DateTime? endsAt;
  final int rewardPoints;
  final String? rewardBadge;
  final int entryCount;
  final bool entered;
  final List<ChallengeEntry> winners;
}

abstract class ChallengesApi {
  Future<List<Challenge>> challenges();
  Future<Challenge> challenge(String id);
  Future<List<ChallengeEntry>> entries(String id);
  Future<void> enter(
    String id, {
    String? showcaseId,
    String? url,
    String note = '',
  });
  Future<void> vote(String id, String entryId, {required bool on});
}

class HttpChallengesApi implements ChallengesApi {
  HttpChallengesApi(this._client);

  final ApiClient _client;

  static String _id(String id) => Uri.encodeComponent(id);

  @override
  Future<List<Challenge>> challenges() async =>
      listOf(await _client.get('/challenges'), 'items', Challenge.fromJson);

  @override
  Future<Challenge> challenge(String id) async =>
      Challenge.fromJson(await _client.get('/challenges/${_id(id)}'));

  @override
  Future<List<ChallengeEntry>> entries(String id) async => listOf(
    await _client.get('/challenges/${_id(id)}/entries'),
    'items',
    ChallengeEntry.fromJson,
  );

  @override
  Future<void> enter(
    String id, {
    String? showcaseId,
    String? url,
    String note = '',
  }) => _client.post(
    '/challenges/${_id(id)}/entries',
    body: {'showcase_id': ?showcaseId, 'url': ?url, 'note': note},
  );

  @override
  Future<void> vote(String id, String entryId, {required bool on}) async {
    final path = '/challenges/${_id(id)}/entries/${_id(entryId)}/vote';
    on ? await _client.put(path) : await _client.deleteJson(path);
  }
}

class FakeChallengesApi implements ChallengesApi {
  final calls = <String>[];

  static Json challengeJson = {
    'id': 'ch-1',
    'title': 'Build a booking app in a week',
    'rules':
        'Any Studio template. Enter a showcase item or a link before Sunday.',
    'status': 'voting',
    'starts_at': '2026-11-20T09:00:00Z',
    'ends_at': '2026-11-29T21:00:00Z',
    'voting_ends_at': '2026-12-02T21:00:00Z',
    'reward_points': 500,
    'reward_badge': 'Challenge winner',
    'entry_count': 2,
    'entered': false,
    'winners': <Json>[],
  };

  static final entries_ = <Json>[
    {
      'id': 'e1',
      'member': {'id': 'm-ayse', 'username': 'ayse', 'display_name': 'Ayse'},
      'showcase': FakeShowcaseApi.items.first,
      'url': null,
      'note': 'Barber bookings with reminders.',
      'vote_count': 12,
      'voted': false,
    },
    {
      'id': 'e2',
      'member': {'id': 'm-omar', 'username': 'omar', 'display_name': 'Omar'},
      'showcase': null,
      'url': 'https://example.com/clinic',
      'note': 'A clinic with two doctors.',
      'vote_count': 7,
      'voted': true,
    },
  ];

  @override
  Future<List<Challenge>> challenges() async => [
    Challenge.fromJson(challengeJson),
  ];

  @override
  Future<Challenge> challenge(String id) async =>
      Challenge.fromJson(challengeJson);

  @override
  Future<List<ChallengeEntry>> entries(String id) async => [
    for (final e in entries_) ChallengeEntry.fromJson(e),
  ];

  @override
  Future<void> enter(
    String id, {
    String? showcaseId,
    String? url,
    String note = '',
  }) async => calls.add('enter:$id:${showcaseId ?? url}');

  @override
  Future<void> vote(String id, String entryId, {required bool on}) async =>
      calls.add('vote:$entryId:$on');
}

final challengesApiProvider = Provider<ChallengesApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeChallengesApi()
      : HttpChallengesApi(ref.watch(apiClientProvider)),
);
