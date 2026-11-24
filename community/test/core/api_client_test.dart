import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/api_client.dart';
import 'package:yallapp_community/core/api/api_exception.dart';
import 'package:yallapp_community/core/api/community_api.dart';
import 'package:yallapp_community/core/api/models.dart';

/// A server in memory: answers 401 to an old access token.
class _Server implements HttpClientAdapter {
  final seen = <String>[];
  String valid = 'new-access';
  late int Function(RequestOptions o) status = (o) =>
      o.headers['authorization'] == 'Bearer $valid' ? 200 : 401;

  Object? Function(RequestOptions o) body = (o) => {'ok': true};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(
      '${options.method} ${options.path} ${options.headers['authorization']}',
    );
    final code = status(options);
    final data = code == 200
        ? body(options)
        : {
            'error': {'code': 'invalid_token', 'message': 'Expired.'},
          };
    return ResponseBody.fromString(
      jsonEncode(data),
      code,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late _Server server;
  late ApiClient client;
  late String token;
  late int renewals;

  setUp(() {
    server = _Server();
    token = 'old-access';
    renewals = 0;
    client = ApiClient(
      baseUrl: 'https://community.example/api/community/v1',
      dio: Dio(
        BaseOptions(baseUrl: 'https://community.example/api/community/v1'),
      )..httpClientAdapter = server,
      token: () => token,
      renew: () async {
        renewals++;
        await Future<void>.delayed(const Duration(milliseconds: 5));
        token = 'new-access';
        return true;
      },
    );
  });

  test('a 401 renews the tokens once and sends the call again', () async {
    expect(await client.get('/me'), {'ok': true});
    expect(renewals, 1);
    expect(server.seen.last, 'GET /me Bearer new-access');
  });

  test('calls that fail together share one renewal', () async {
    await Future.wait([client.get('/a'), client.get('/b'), client.get('/c')]);
    expect(renewals, 1);
  });

  test('when renewing fails, the 401 comes through', () async {
    client.renew = () async => false;
    await expectLater(
      client.get('/me'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          ApiException.invalidToken,
        ),
      ),
    );
  });

  test('renewing the tokens does not itself renew', () async {
    server.status = (o) => 401;
    await expectLater(
      HttpCommunityApi(client).refresh('r'),
      throwsA(isA<ApiException>()),
    );
    expect(renewals, 0);
  });

  test('the contract\'s shapes: follow answers the relationship', () async {
    token = 'new-access';
    server.body = (o) => {
      'following': true,
      'followed_by': false,
      'friend': 'incoming',
      'friend_request_id': 'fr-9',
      'blocked': false,
    };
    final r = await HttpCommunityApi(client).follow('@nour');
    expect(r.following, isTrue);
    expect(r.friend, FriendState.incoming);
    expect(r.friendRequestId, 'fr-9');
    expect(server.seen.last, startsWith('PUT /members/%40nour/follow'));
  });

  test('the contract\'s shapes: a profile with its counts and badges', () {
    final p = Profile.fromJson({
      'id': 'u1',
      'username': 'nour',
      'display_name': 'Nour',
      'avatar_url': null,
      'top_badge': 'green',
      'team': false,
      'deleted': false,
      'rank': 'contributor',
      'rank_label': 'Contributor',
      'level': 'contributor',
      'level_label': 'Contributor',
      'level_progress': .4,
      'headline': 'Fashion stores',
      'bio': 'Hi',
      'skills': ['Fashion'],
      'links': [],
      'badges': [
        {
          'kind': 'green',
          'label': 'Verified Business',
          'since': '2026-01-01T00:00:00Z',
          'company_name': 'Lujain',
        },
        {
          'kind': 'blue',
          'label': 'Active Member',
          'since': '2025-01-01T00:00:00Z',
        },
      ],
      'points': 40,
      'counts': {
        'followers': 3,
        'following': 2,
        'friends': 1,
        'questions': 0,
        'answers': 4,
        'accepted_answers': 1,
        'apps': 6,
      },
      'joined_at': '2025-01-01T00:00:00Z',
      'yallapp_linked': true,
    });
    expect(p.member.badge, BadgeKind.green);
    // Under the name: the rank's own name, before the headline.
    expect(p.member.level, 'Contributor');
    expect(p.member.rank, 'contributor');
    // The bar is the server's, never worked out here.
    expect(p.progress, .4);
    expect(topBadge(p.badges)!.company, 'Lujain');
    expect(p.appsCount, 6);
    expect(p.followers, 3);
    expect(p.account, isNull);
  });
}
