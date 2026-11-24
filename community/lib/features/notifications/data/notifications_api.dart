import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// Area E: the member's notifications (`/notifications`, area C's contract):
/// the in-app list; the same ones go by email as the member chooses.

class CommunityNotification {
  const CommunityNotification({
    required this.id,
    required this.kind,
    required this.text,
    required this.createdAt,
    this.actor,
    this.targetType,
    this.targetId,
    this.read = false,
  });

  factory CommunityNotification.fromJson(Json json) => CommunityNotification(
    id: str(json, 'id'),
    kind: str(json, 'kind'),
    text: str(json, 'text'),
    actor: optObject(json, 'actor') == null
        ? null
        : MemberSummary.fromJson(optObject(json, 'actor')!),
    targetType: optStr(json, 'target_type'),
    targetId: optStr(json, 'target_id'),
    read: boolean(json, 'read'),
    createdAt: date(json, 'created_at'),
  );

  final String id;

  /// follow, friend_request, answer, answer_accepted, official_answer,
  /// badge_granted, verification_approved, post_approved…
  final String kind;

  /// What happened, in the member's language (the server writes it).
  final String text;
  final MemberSummary? actor;

  /// What it is about: member, question, answer, tutorial…
  final String? targetType;
  final String? targetId;
  final bool read;
  final DateTime createdAt;

  CommunityNotification copyWith({bool? read}) => CommunityNotification(
    id: id,
    kind: kind,
    text: text,
    actor: actor,
    targetType: targetType,
    targetId: targetId,
    read: read ?? this.read,
    createdAt: createdAt,
  );
}

class NotificationPage {
  const NotificationPage(this.items, this.unreadCount, [this.next]);

  final List<CommunityNotification> items;
  final int unreadCount;
  final String? next;
}

abstract class NotificationsApi {
  Future<NotificationPage> list({bool unreadOnly = false, String? cursor});

  /// Marks these read, or all of them with none given.
  Future<void> markRead([List<String>? ids]);

  /// Which kinds also come by email.
  Future<Map<String, bool>> emailSettings();
  Future<Map<String, bool>> setEmailSettings(Map<String, bool> email);
}

class HttpNotificationsApi implements NotificationsApi {
  HttpNotificationsApi(this._client);

  final ApiClient _client;

  @override
  Future<NotificationPage> list({
    bool unreadOnly = false,
    String? cursor,
  }) async {
    final json = await _client.get(
      '/notifications',
      query: {'unread': unreadOnly ? true : null, 'cursor': cursor},
    );
    return NotificationPage(
      listOf(json, 'items', CommunityNotification.fromJson),
      integer(json, 'unread_count'),
      optStr(json, 'next_cursor'),
    );
  }

  @override
  Future<void> markRead([List<String>? ids]) async {
    await _client.post('/notifications/read', body: {'ids': ?ids});
  }

  Map<String, bool> _email(Json json) {
    final email = optObject(json, 'email') ?? const {};
    return {for (final e in email.entries) e.key: e.value == true};
  }

  @override
  Future<Map<String, bool>> emailSettings() async =>
      _email(await _client.get('/notifications/settings'));

  @override
  Future<Map<String, bool>> setEmailSettings(Map<String, bool> email) async =>
      _email(
        await _client.put('/notifications/settings', body: {'email': email}),
      );
}

/// [NotificationsApi] in memory: the design's bell (9 unread), with
/// Nour following, the team's official answer, and an answer accepted.
class FakeNotificationsApi implements NotificationsApi {
  FakeNotificationsApi({DateTime? now}) : now = now ?? DateTime.now().toUtc() {
    _items = [
      _n(
        'n1',
        'answer_accepted',
        'Karim Samy accepted your answer. +25 points',
        'm-karim',
        'Karim Samy',
        'question',
        'q-product-page',
        12,
      ),
      _n(
        'n2',
        'follow',
        'Nour El Hoda started following you.',
        'm-nour',
        'Nour El Hoda',
        'member',
        'm-nour',
        40,
      ),
      _n(
        'n3',
        'official_answer',
        'The Yallapp Team answered “How do I give each template its own product page?”',
        'm-team',
        'Yallapp Team',
        'question',
        'q-product-page',
        120,
        team: true,
      ),
      _n(
        'n4',
        'friend_request',
        'Karim Samy wants to be friends.',
        'm-karim',
        'Karim Samy',
        'member',
        'm-karim',
        180,
      ),
      _n(
        'n5',
        'badge_granted',
        'You earned the Active Member badge.',
        null,
        null,
        null,
        null,
        60 * 26,
      ),
      for (var i = 0; i < 6; i++)
        _n(
          'n${6 + i}',
          'answer',
          'Nour El Hoda answered your question.',
          'm-nour',
          'Nour El Hoda',
          'question',
          'q-photos',
          60 * (30 + i * 10),
          read: i >= 4,
        ),
      _n(
        'n12',
        'post_approved',
        'Your question was approved and is now public.',
        null,
        null,
        'question',
        'q-review',
        60 * 24 * 3,
        read: true,
      ),
    ];
  }

  final DateTime now;
  final calls = <String>[];
  late List<CommunityNotification> _items;
  var email = <String, bool>{
    'answer': true,
    'answer_accepted': true,
    'official_answer': true,
    'friend_request': true,
    'follow': false,
    'badge_granted': true,
    'verification_approved': true,
    'verification_rejected': true,
  };

  CommunityNotification _n(
    String id,
    String kind,
    String text,
    String? actorId,
    String? actorName,
    String? targetType,
    String? targetId,
    int minutes, {
    bool team = false,
    bool read = false,
  }) => CommunityNotification(
    id: id,
    kind: kind,
    text: text,
    actor: actorId == null
        ? null
        : MemberSummary(
            id: actorId,
            name: actorName!,
            username: actorId.substring(2),
            team: team,
          ),
    targetType: targetType,
    targetId: targetId,
    read: read,
    createdAt: now.subtract(Duration(minutes: minutes)),
  );

  int get _unread => _items.where((n) => !n.read).length;

  @override
  Future<NotificationPage> list({
    bool unreadOnly = false,
    String? cursor,
  }) async {
    calls.add('list:$unreadOnly');
    return NotificationPage([
      for (final n in _items)
        if (!unreadOnly || !n.read) n,
    ], _unread);
  }

  @override
  Future<void> markRead([List<String>? ids]) async {
    calls.add('read:${ids?.join(',') ?? 'all'}');
    _items = [
      for (final n in _items)
        ids == null || ids.contains(n.id) ? n.copyWith(read: true) : n,
    ];
  }

  @override
  Future<Map<String, bool>> emailSettings() async => Map.of(email);

  @override
  Future<Map<String, bool>> setEmailSettings(Map<String, bool> email) async {
    calls.add(
      'email:${email.entries.where((e) => e.value).map((e) => e.key).join(',')}',
    );
    this.email = Map.of(email);
    return Map.of(email);
  }
}

final notificationsApiProvider = Provider<NotificationsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeNotificationsApi()
      : HttpNotificationsApi(ref.watch(apiClientProvider)),
);
