import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';
import '../../showcase/data/showcase_api.dart';

/// 234.1 (area E) Pros (`/pros`): a member's services, rates as text and
/// portfolio. A hire request opens a message thread; no money moves on the
/// platform.
enum Availability { available, busy, unavailable }

class ProService {
  const ProService({required this.title, this.description = '', this.rate});

  factory ProService.fromJson(Json json) => ProService(
    title: str(json, 'title'),
    description: str(json, 'description'),
    rate: optStr(json, 'rate'),
  );

  final String title;
  final String description;

  /// Text only ("by the hour"): the pro's own words.
  final String? rate;
}

class ProProfile {
  const ProProfile({
    required this.member,
    this.headline = '',
    this.about = '',
    this.services = const [],
    this.skills = const [],
    this.availability = Availability.available,
    this.portfolio = const [],
    this.rating,
    this.reviewCount = 0,
    this.doneCount = 0,
  });

  factory ProProfile.fromJson(Json json) => ProProfile(
    member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
    headline: str(json, 'headline'),
    about: str(json, 'about'),
    services: listOf(json, 'services', ProService.fromJson),
    skills: strings(json, 'skills'),
    availability: switch (optStr(json, 'availability')) {
      'busy' => Availability.busy,
      'unavailable' => Availability.unavailable,
      _ => Availability.available,
    },
    portfolio: listOf(json, 'portfolio', ShowcaseSummary.fromJson),
    rating: optNumber(json, 'rating'),
    reviewCount: integer(json, 'review_count'),
    doneCount: integer(json, 'done_count'),
  );

  final MemberSummary member;
  final String headline;
  final String about;
  final List<ProService> services;
  final List<String> skills;
  final Availability availability;
  final List<ShowcaseSummary> portfolio;
  final double? rating;
  final int reviewCount;
  final int doneCount;
}

abstract class ProsApi {
  Future<List<ProProfile>> pros({String? query, bool availableOnly = false});
  Future<ProProfile> pro(String member);

  /// Sends a hire request; the message thread it opened.
  Future<String> hire(
    String member, {
    required String message,
    String? service,
  });
}

class HttpProsApi implements ProsApi {
  HttpProsApi(this._client);

  final ApiClient _client;

  @override
  Future<List<ProProfile>> pros({
    String? query,
    bool availableOnly = false,
  }) async => listOf(
    await _client.get(
      '/pros',
      query: {'q': query, 'available': availableOnly ? 'true' : null},
    ),
    'items',
    ProProfile.fromJson,
  );

  @override
  Future<ProProfile> pro(String member) async => ProProfile.fromJson(
    await _client.get('/pros/${Uri.encodeComponent(member)}'),
  );

  @override
  Future<String> hire(
    String member, {
    required String message,
    String? service,
  }) async => str(
    await _client.post(
      '/pros/${Uri.encodeComponent(member)}/hire',
      body: {'message': message, 'service': ?service},
    ),
    'conversation_id',
  );
}

class FakeProsApi implements ProsApi {
  final calls = <String>[];

  static final pros_ = <Json>[
    {
      'member': {
        'id': 'm-elif',
        'username': 'elif',
        'display_name': 'Elif Kaya',
      },
      'headline': 'Studio designer for shops and cafés',
      'about': 'I set up Studio apps for small businesses, from the template to the stores.',
      'services': [
        {
          'title': 'A shop app, ready for the stores',
          'description': 'Template, products and store listing.',
          'rate': 'By the project',
        },
        {'title': 'An hour of help', 'rate': 'By the hour'},
      ],
      'skills': ['Studio', 'Store listings'],
      'availability': 'available',
      'portfolio': [FakeShowcaseApi.items.first],
      'rating': 4.8,
      'review_count': 23,
      'done_count': 31,
    },
  ];

  @override
  Future<List<ProProfile>> pros({
    String? query,
    bool availableOnly = false,
  }) async {
    calls.add('pros:${query ?? ''}:$availableOnly');
    return [for (final p in pros_) ProProfile.fromJson(p)];
  }

  @override
  Future<ProProfile> pro(String member) async => ProProfile.fromJson(
    pros_.firstWhere(
      (p) =>
          (p['member'] as Json)['id'] == member ||
          (p['member'] as Json)['username'] == member,
    ),
  );

  @override
  Future<String> hire(
    String member, {
    required String message,
    String? service,
  }) async {
    calls.add('hire:$member:$message');
    return 'conv-hire-1';
  }
}

final prosApiProvider = Provider<ProsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeProsApi()
      : HttpProsApi(ref.watch(apiClientProvider)),
);
