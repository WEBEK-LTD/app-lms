import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// 234.3–234.4 (area E) Events and live sessions (`/events`): online, in
/// person or live (an embed or meeting link; no streaming of our own), at
/// the viewer's time, with RSVP. Free only: nothing is sold.
enum EventKind { online, inPerson, live }

class CommunityEvent {
  const CommunityEvent({
    required this.id,
    required this.title,
    required this.startsAt,
    this.description = '',
    this.kind = EventKind.online,
    this.endsAt,
    this.location,
    this.joinUrl,
    this.embedUrl,
    this.replayUrl,
    this.coverUrl,
    this.goingCount = 0,
    this.going = false,
    this.liveNow = false,
    this.cancelled = false,
  });

  factory CommunityEvent.fromJson(Json json) => CommunityEvent(
    id: str(json, 'id'),
    title: str(json, 'title'),
    description: str(json, 'description'),
    kind: switch (optStr(json, 'kind')) {
      'in_person' => EventKind.inPerson,
      'live' => EventKind.live,
      _ => EventKind.online,
    },
    startsAt: optDate(json, 'starts_at') ?? DateTime.now(),
    endsAt: optDate(json, 'ends_at'),
    location: optStr(json, 'location'),
    joinUrl: optStr(json, 'join_url'),
    embedUrl: optStr(json, 'embed_url'),
    replayUrl: optStr(json, 'replay_url'),
    coverUrl: optStr(json, 'cover_url'),
    goingCount: integer(json, 'going_count'),
    going: boolean(json, 'going'),
    liveNow: boolean(json, 'live_now'),
    cancelled: optStr(json, 'status') == 'cancelled',
  );

  final String id;
  final String title;
  final String description;
  final EventKind kind;
  final DateTime startsAt;
  final DateTime? endsAt;
  final String? location;
  final String? joinUrl;
  final String? embedUrl;
  final String? replayUrl;
  final String? coverUrl;
  final int goingCount;
  final bool going;
  final bool liveNow;
  final bool cancelled;
}

class EventComment {
  const EventComment({required this.author, required this.body});

  factory EventComment.fromJson(Json json) => EventComment(
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    body: str(json, 'body'),
  );

  final MemberSummary author;
  final String body;
}

abstract class EventsApi {
  Future<List<CommunityEvent>> events({bool liveOnly = false});
  Future<CommunityEvent> event(String id);
  Future<void> rsvp(String id, {required bool going});
  Future<List<EventComment>> comments(String id);
  Future<void> comment(String id, String body);

  /// The add-to-calendar file's address.
  String icsUrl(String id);
}

class HttpEventsApi implements EventsApi {
  HttpEventsApi(this._client, this._base);

  final ApiClient _client;
  final String _base;

  static String _id(String id) => Uri.encodeComponent(id);

  @override
  Future<List<CommunityEvent>> events({bool liveOnly = false}) async => listOf(
    await _client.get('/events', query: {'kind': liveOnly ? 'live' : null}),
    'items',
    CommunityEvent.fromJson,
  );

  @override
  Future<CommunityEvent> event(String id) async =>
      CommunityEvent.fromJson(await _client.get('/events/${_id(id)}'));

  @override
  Future<void> rsvp(String id, {required bool going}) async {
    final path = '/events/${_id(id)}/rsvp';
    going ? await _client.put(path) : await _client.deleteJson(path);
  }

  @override
  Future<List<EventComment>> comments(String id) async => listOf(
    await _client.get('/events/${_id(id)}/comments'),
    'items',
    EventComment.fromJson,
  );

  @override
  Future<void> comment(String id, String body) =>
      _client.post('/events/${_id(id)}/comments', body: {'body': body});

  @override
  String icsUrl(String id) => '$_base/events/${_id(id)}/ics';
}

class FakeEventsApi implements EventsApi {
  final calls = <String>[];

  static final events_ = <Json>[
    {
      'id': 'ev-live',
      'title': 'Live: your first store listing',
      'description':
          'We fill in a store listing together and answer questions.',
      'kind': 'live',
      'starts_at': '2026-11-27T17:00:00Z',
      'time_zone': 'Europe/Istanbul',
      'embed_url': 'https://www.youtube.com/watch?v=example',
      'replay_url': null,
      'going_count': 120,
      'going': true,
      'live_now': true,
      'status': 'scheduled',
    },
    {
      'id': 'ev-meetup',
      'title': 'Istanbul makers meetup',
      'description': 'Coffee and show-and-tell for app makers.',
      'kind': 'in_person',
      'starts_at': '2026-12-06T10:00:00Z',
      'time_zone': 'Europe/Istanbul',
      'location': 'Kadıköy, Istanbul',
      'going_count': 34,
      'going': false,
      'live_now': false,
      'status': 'scheduled',
    },
  ];

  @override
  Future<List<CommunityEvent>> events({bool liveOnly = false}) async {
    calls.add('events:$liveOnly');
    return [
      for (final e in events_)
        if (!liveOnly || e['kind'] == 'live') CommunityEvent.fromJson(e),
    ];
  }

  @override
  Future<CommunityEvent> event(String id) async =>
      CommunityEvent.fromJson(events_.firstWhere((e) => e['id'] == id));

  @override
  Future<void> rsvp(String id, {required bool going}) async =>
      calls.add('rsvp:$id:$going');

  @override
  Future<List<EventComment>> comments(String id) async => [
    EventComment.fromJson({
      'author': {'id': 'm-ayse', 'username': 'ayse', 'display_name': 'Ayse'},
      'body': 'Hello from Ankara',
    }),
  ];

  @override
  Future<void> comment(String id, String body) async =>
      calls.add('comment:$id:$body');

  @override
  String icsUrl(String id) =>
      'https://yallapp.com.tr/api/community/v1/events/$id/ics';
}

final eventsApiProvider = Provider<EventsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeEventsApi()
      : HttpEventsApi(
          ref.watch(apiClientProvider),
          ref.watch(configProvider).apiBaseUrl,
        ),
);
