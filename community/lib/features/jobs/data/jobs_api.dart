import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// 234.2 (area E) Jobs (`/jobs`): post one, apply with a message and links;
/// the budget is text.
enum JobType { fullTime, partTime, contract, freelance, internship }

JobType _type(String? wire) => switch (wire) {
  'full_time' => JobType.fullTime,
  'part_time' => JobType.partTime,
  'contract' => JobType.contract,
  'internship' => JobType.internship,
  _ => JobType.freelance,
};

class Job {
  const Job({
    required this.id,
    required this.poster,
    required this.title,
    this.description = '',
    this.type = JobType.freelance,
    this.remote = false,
    this.location = '',
    this.skills = const [],
    this.budget = '',
    this.applicationCount = 0,
    this.applied = false,
    this.mine = false,
  });

  factory Job.fromJson(Json json, {String? me}) {
    final poster = MemberSummary.fromJson(
      optObject(json, 'poster') ?? const {},
    );
    return Job(
      id: str(json, 'id'),
      poster: poster,
      title: str(json, 'title'),
      description: str(json, 'description'),
      type: _type(optStr(json, 'type')),
      remote: boolean(json, 'remote'),
      location: str(json, 'location'),
      skills: strings(json, 'skills'),
      budget: str(json, 'budget'),
      applicationCount: integer(json, 'application_count'),
      applied: boolean(json, 'applied'),
      mine: me != null && poster.id == me,
    );
  }

  final String id;
  final MemberSummary poster;
  final String title;
  final String description;
  final JobType type;
  final bool remote;
  final String location;
  final List<String> skills;
  final String budget;
  final int applicationCount;
  final bool applied;
  final bool mine;
}

class JobApplication {
  const JobApplication({
    required this.member,
    this.message = '',
    this.links = const [],
  });

  factory JobApplication.fromJson(Json json) => JobApplication(
    member: MemberSummary.fromJson(
      optObject(json, 'member') ?? optObject(json, 'applicant') ?? const {},
    ),
    message: str(json, 'message'),
    links: strings(json, 'links'),
  );

  final MemberSummary member;
  final String message;
  final List<String> links;
}

abstract class JobsApi {
  Future<List<Job>> jobs({String? me});
  Future<Job> job(String id, {String? me});
  Future<void> apply(
    String id, {
    required String message,
    List<String> links = const [],
  });
  Future<List<JobApplication>> applicants(String id);
}

class HttpJobsApi implements JobsApi {
  HttpJobsApi(this._client);

  final ApiClient _client;

  static String _id(String id) => Uri.encodeComponent(id);

  @override
  Future<List<Job>> jobs({String? me}) async => listOf(
    await _client.get('/jobs'),
    'items',
    (j) => Job.fromJson(j, me: me),
  );

  @override
  Future<Job> job(String id, {String? me}) async =>
      Job.fromJson(await _client.get('/jobs/${_id(id)}'), me: me);

  @override
  Future<void> apply(
    String id, {
    required String message,
    List<String> links = const [],
  }) => _client.post(
    '/jobs/${_id(id)}/applications',
    body: {'message': message, 'links': links},
  );

  @override
  Future<List<JobApplication>> applicants(String id) async => listOf(
    await _client.get('/jobs/${_id(id)}/applications'),
    'items',
    JobApplication.fromJson,
  );
}

class FakeJobsApi implements JobsApi {
  final calls = <String>[];

  static final jobs_ = <Json>[
    {
      'id': 'job-1',
      'poster': {'id': 'm-omar', 'username': 'omar', 'display_name': 'Omar'},
      'title': 'Set up our restaurant app',
      'description': 'We need our menu and delivery areas in a Studio app.',
      'type': 'freelance',
      'remote': true,
      'location': '',
      'skills': ['Studio', 'Menus'],
      'budget': 'Fixed, to agree',
      'status': 'open',
      'application_count': 0,
      'applied': false,
    },
  ];

  @override
  Future<List<Job>> jobs({String? me}) async => [
    for (final j in jobs_) Job.fromJson(j, me: me),
  ];

  @override
  Future<Job> job(String id, {String? me}) async =>
      Job.fromJson(jobs_.firstWhere((j) => j['id'] == id), me: me);

  @override
  Future<void> apply(
    String id, {
    required String message,
    List<String> links = const [],
  }) async => calls.add('apply:$id:$message');

  @override
  Future<List<JobApplication>> applicants(String id) async => const [];
}

final jobsApiProvider = Provider<JobsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeJobsApi()
      : HttpJobsApi(ref.watch(apiClientProvider)),
);
