import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// Area E: the Gold badge ("Pro Developer") and its verification form
/// (`/badges/verification`, area C's contract).

enum RequestStatus {
  pending,
  approved,
  rejected;

  static RequestStatus parse(String? value) => switch (value) {
    'approved' => approved,
    'rejected' => rejected,
    _ => pending,
  };
}

/// The member's last request: what they sent and what the admin decided.
class VerificationRequest {
  const VerificationRequest({
    required this.id,
    required this.fullName,
    required this.status,
    required this.createdAt,
    this.portfolioLinks = const [],
    this.appNames = const [],
    this.reason,
    this.reviewedAt,
  });

  factory VerificationRequest.fromJson(Json json) => VerificationRequest(
    id: str(json, 'id'),
    fullName: str(json, 'full_name'),
    status: RequestStatus.parse(optStr(json, 'status')),
    portfolioLinks: strings(json, 'portfolio_links'),
    appNames: [for (final a in jsonList(json, 'apps')) str(a, 'name')],
    reason: optStr(json, 'reason'),
    createdAt: date(json, 'created_at'),
    reviewedAt: optDate(json, 'reviewed_at'),
  );

  final String id;
  final String fullName;
  final RequestStatus status;
  final List<String> portfolioLinks;
  final List<String> appNames;

  /// The admin's reason, shown to the member (approved or rejected).
  final String? reason;
  final DateTime createdAt;
  final DateTime? reviewedAt;
}

/// Where the member stands with the Gold badge. The apps are the linked
/// Yallapp account's (Studio Market templates count), never typed in, so
/// nobody can claim apps that aren't theirs.
class VerificationState {
  const VerificationState({
    required this.hasGold,
    required this.appCount,
    required this.yallappLinked,
    required this.canApply,
    this.requiredApps = 5,
    this.apps = const [],
    this.request,
  });

  factory VerificationState.fromJson(Json json) => VerificationState(
    hasGold: boolean(json, 'has_gold'),
    appCount: integer(json, 'app_count'),
    requiredApps: integer(json, 'required_apps', 5),
    yallappLinked: boolean(json, 'yallapp_linked'),
    canApply: boolean(json, 'can_apply'),
    apps: listOf(json, 'apps', LinkedApp.fromJson),
    request: optObject(json, 'request') == null
        ? null
        : VerificationRequest.fromJson(optObject(json, 'request')!),
  );

  final bool hasGold;
  final int appCount;
  final int requiredApps;
  final bool yallappLinked;

  /// 5 or more apps and no request waiting: the Apply form shows only then.
  final bool canApply;
  final List<LinkedApp> apps;
  final VerificationRequest? request;
}

abstract class VerificationApi {
  Future<VerificationState> state();

  /// Sends the request: the full name, the ID proof (a photo or a PDF,
  /// private) and up to five portfolio links; the apps come from the linked
  /// account on the server.
  Future<VerificationState> apply({
    required String fullName,
    required String idProofPath,
    List<String> portfolioLinks = const [],
  });
}

class HttpVerificationApi implements VerificationApi {
  HttpVerificationApi(this._client);

  final ApiClient _client;

  @override
  Future<VerificationState> state() async =>
      VerificationState.fromJson(await _client.get('/badges/verification'));

  @override
  Future<VerificationState> apply({
    required String fullName,
    required String idProofPath,
    List<String> portfolioLinks = const [],
  }) async => VerificationState.fromJson(
    await _client.upload(
      '/badges/verification',
      field: 'id_proof',
      filePath: idProofPath,
      fields: {'full_name': fullName, 'portfolio_links': portfolioLinks},
    ),
  );
}

/// [VerificationApi] in memory: the demo member (Mohamed Ali) has the
/// linked account's apps; tests set how many and what the request is.
class FakeVerificationApi implements VerificationApi {
  FakeVerificationApi({
    this.appCount = 6,
    this.linked = true,
    this.hasGold = false,
    this.request,
    DateTime? now,
  }) : now = now ?? DateTime.now().toUtc();

  int appCount;
  bool linked;
  bool hasGold;
  VerificationRequest? request;
  final DateTime now;
  final calls = <String>[];

  static const _names = [
    'Lujain',
    'Toota',
    'Sofra',
    'Madar',
    'Nawah',
    'Leqaa',
    'Rawaq',
    'Masar',
  ];

  static const _icons = [
    'abaya-desert.jpg',
    'bunny-knit.jpg',
    'bath-set.jpg',
    'bed-bright.jpg',
    'beanie-girl.jpg',
    'crochet-home.jpg',
  ];

  List<LinkedApp> get _apps => [
    for (var i = 0; i < appCount; i++)
      LinkedApp(
        id: 'app-$i',
        name: _names[i % _names.length],
        // The demo's own pictures stand in for the apps' icons.
        iconUrl: 'asset:assets/images/${_icons[i % _icons.length]}',
        fromTemplate: i.isOdd,
      ),
  ];

  VerificationState _state() => VerificationState(
    hasGold: hasGold,
    appCount: linked ? appCount : 0,
    yallappLinked: linked,
    canApply:
        linked &&
        !hasGold &&
        appCount >= 5 &&
        request?.status != RequestStatus.pending,
    apps: linked ? _apps : const [],
    request: request,
  );

  @override
  Future<VerificationState> state() async {
    calls.add('state');
    return _state();
  }

  @override
  Future<VerificationState> apply({
    required String fullName,
    required String idProofPath,
    List<String> portfolioLinks = const [],
  }) async {
    calls.add('apply:$fullName:$idProofPath:${portfolioLinks.join(',')}');
    if (!_state().canApply) {
      throw ApiException(
        code: appCount < 5 ? 'not_eligible' : 'already_pending',
      );
    }
    request = VerificationRequest(
      id: 'vr-1',
      fullName: fullName,
      status: RequestStatus.pending,
      portfolioLinks: portfolioLinks,
      appNames: [for (final a in _apps) a.name],
      createdAt: now,
    );
    return _state();
  }
}

final verificationApiProvider = Provider<VerificationApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeVerificationApi()
      : HttpVerificationApi(ref.watch(apiClientProvider)),
);
