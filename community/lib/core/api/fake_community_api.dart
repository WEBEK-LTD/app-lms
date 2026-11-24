import 'api_exception.dart';
import 'community_api.dart';
import 'json.dart';
import 'models.dart';

/// [CommunityApi] in memory: the widget tests drive it, and
/// `--dart-define=YC_DEMO=true` runs the app on it (the approved design's
/// members: Mohamed Ali, Nour El Hoda, Karim Samy).
class FakeCommunityApi implements CommunityApi {
  FakeCommunityApi({this.signedUpAs, List<LinkedApp>? apps})
    : _apps = apps ?? _sampleApps;

  /// The member a sign-in becomes (the design's Mohamed Ali).
  final String? signedUpAs;
  final List<LinkedApp> _apps;

  static const meId = 'm-mohamed';

  /// Every call, in order (`follow:m-nour`, `login:a@b.c`…).
  final calls = <String>[];
  final reports = <String>[];
  String password = 'yallapp-demo';
  Uri linkPage = Uri.parse('https://yallapp.com.tr/community/link?state=demo');

  /// What a refresh answers: a new pair, or (false) the server refusing.
  bool refreshWorks = true;

  static const _sampleApps = [
    LinkedApp(
      id: 'a1',
      name: 'Lujain',
      appStoreUrl: 'https://apps.apple.com/app/lujain/id1',
      fromTemplate: true,
    ),
    LinkedApp(
      id: 'a2',
      name: 'Toota',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=toota',
    ),
  ];

  late Profile _me = Profile(
    member: MemberSummary(
      id: meId,
      name: signedUpAs ?? 'Mohamed Ali',
      username: 'mohamed',
      level: 'Pro',
    ),
    bio: 'Building shops with Studio since 2025.',
    skills: const ['Studio', 'Shops', 'Arabic apps'],
    badges: const [EarnedBadge(kind: BadgeKind.blue)],
    points: 1240,
    // The design's "Pro · 1,240 pts" and its bar.
    levelProgress: .64,
    followers: 128,
    following: 64,
    friends: 12,
    answers: 37,
    questions: 9,
    appsCount: _apps.length,
    apps: _apps,
    yallappLinked: true,
    joinedAt: DateTime(2025, 3, 2),
    account: const Account(
      email: 'mohamed@example.com',
      emailVerified: true,
      hasPassword: true,
      providers: ['email'],
      pendingFriendRequests: 1,
      unreadNotifications: 9,
    ),
  );

  final Map<String, Profile> _members = {
    'm-nour': const Profile(
      member: MemberSummary(
        id: 'm-nour',
        name: 'Nour El Hoda',
        username: 'nour',
        badge: BadgeKind.blue,
        level: 'Expert',
      ),
      bio: 'Fashion stores, product pages, photos at 3:4.',
      skills: ['Fashion', 'Product pages'],
      badges: [EarnedBadge(kind: BadgeKind.blue)],
      points: 4820,
      followers: 2400,
      following: 180,
      friends: 41,
      relationship: Relationship(followsYou: true),
    ),
    'm-karim': const Profile(
      member: MemberSummary(
        id: 'm-karim',
        name: 'Karim Samy',
        username: 'karim',
      ),
      bio: 'Learning Studio one template at a time.',
      skills: ['Studio'],
      points: 310,
      followers: 22,
      following: 40,
      friends: 3,
      relationship: Relationship(
        friend: FriendState.incoming,
        friendRequestId: 'fr-1',
      ),
    ),
    'm-team': const Profile(
      member: MemberSummary(
        id: 'm-team',
        name: 'Yallapp Team',
        username: 'yallapp',
        team: true,
        badge: BadgeKind.gold,
      ),
      bio: 'The team behind Yallapp.',
      badges: [EarnedBadge(kind: BadgeKind.gold)],
    ),
  };

  final _requests = <FriendRequest>[
    const FriendRequest(
      id: 'fr-1',
      member: MemberSummary(
        id: 'm-karim',
        name: 'Karim Samy',
        username: 'karim',
      ),
    ),
  ];
  final _blocked = <String>{};

  Future<T> _wait<T>(T value) => Future<T>.value(value);

  var _tokens = 0;

  SignedIn _signedIn({bool isNew = false}) {
    _tokens++;
    return SignedIn(
      session: Session(
        accessToken: 'demo-access-$_tokens',
        refreshToken: 'demo-refresh-$_tokens',
      ),
      me: _me,
      isNew: isNew,
    );
  }

  @override
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
    Json? device,
  }) {
    calls.add('signup:$email');
    if (email == 'taken@example.com') {
      throw const ApiException(
        code: ApiException.emailTaken,
        message: 'This email already has an account.',
      );
    }
    _me = _me.copyWith(
      member: MemberSummary(
        id: meId,
        name: name,
        username: _me.member.username,
        level: _me.member.level,
      ),
      account: Account(email: email, hasPassword: true, language: language),
    );
    return _wait(_signedIn(isNew: true));
  }

  @override
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
    Json? device,
  }) {
    calls.add('login:$email');
    if (password != this.password) {
      throw const ApiException(
        code: ApiException.invalidCredentials,
        message: 'The email or password isn’t right.',
      );
    }
    return _wait(_signedIn());
  }

  @override
  Future<SignedIn> signInWithApple({
    required String idToken,
    String? nonce,
    String? name,
    required String language,
    Json? device,
  }) {
    calls.add('apple${nonce == null ? '' : ':nonce'}');
    return _wait(_signedIn());
  }

  @override
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
    Json? device,
  }) {
    calls.add('google');
    return _wait(_signedIn());
  }

  @override
  Future<SignedIn> refresh(String refreshToken) {
    calls.add('refresh:$refreshToken');
    if (!refreshWorks) {
      throw const ApiException(code: ApiException.invalidToken);
    }
    return _wait(_signedIn());
  }

  @override
  Future<void> requestPasswordReset(String email) async =>
      calls.add('reset:$email');

  @override
  Future<void> resendVerification() async => calls.add('resend');

  @override
  Future<void> signOut() async => calls.add('signout');

  @override
  Future<Profile> me() => _wait(_me);

  @override
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? headline,
    String? bio,
    List<String>? skills,
    String? language,
    String? theme,
  }) {
    calls.add(
      [
        'updateMe',
        if (language != null) 'language=$language',
        if (theme != null) 'theme=$theme',
      ].join(':'),
    );
    final m = _me.member;
    _me = _me.copyWith(
      member: MemberSummary(
        id: m.id,
        name: name ?? m.name,
        username: username ?? m.username,
        avatarUrl: m.avatarUrl,
        badge: m.badge,
        level: headline ?? m.level,
      ),
      bio: bio,
      skills: skills,
    );
    return _wait(_me);
  }

  @override
  Future<Profile> uploadAvatar(String filePath) {
    calls.add('avatar');
    return _wait(_me);
  }

  @override
  Future<void> deleteAccount({String? password}) async {
    calls.add('delete${password == null ? '' : ':password'}');
    if (password != null && password != this.password) {
      throw const ApiException(
        code: ApiException.invalidCredentials,
        message: 'The password isn’t right.',
      );
    }
  }

  @override
  Future<Uri> startYallappLink() {
    calls.add('link');
    return _wait(linkPage);
  }

  @override
  Future<void> unlinkYallapp() async {
    calls.add('unlink');
    _me = _me.copyWith(apps: const [], yallappLinked: false);
  }

  Profile _find(String id) {
    if (id == meId) return _me;
    final p = _members[id];
    if (p == null) throw const ApiException(code: ApiException.notFound);
    return p;
  }

  @override
  Future<Profile> member(String id) => _wait(_find(id));

  List<MemberSummary> get _all => [for (final p in _members.values) p.member];

  @override
  Future<Page<MemberSummary>> followers(String id, {String? cursor}) =>
      _wait(Page(_all.where((m) => m.id != id).toList()));

  @override
  Future<Page<MemberSummary>> following(String id, {String? cursor}) =>
      _wait(Page(_all.where((m) => m.id != id).take(2).toList()));

  @override
  Future<Page<MemberSummary>> friends(String id, {String? cursor}) =>
      _wait(Page(_all.where((m) => m.id != id).take(1).toList()));

  Relationship _relate(
    String id,
    Relationship Function(Relationship r) change, {
    int followers = 0,
    int friends = 0,
  }) {
    final p = _find(id);
    final r = change(p.relationship);
    _members[id] = p.copyWith(
      relationship: r,
      followers: p.followers + followers,
      friends: p.friends + friends,
    );
    return r;
  }

  @override
  Future<Relationship> follow(String id) async {
    calls.add('follow:$id');
    return _relate(id, (r) => r.copyWith(following: true), followers: 1);
  }

  @override
  Future<Relationship> unfollow(String id) async {
    calls.add('unfollow:$id');
    return _relate(id, (r) => r.copyWith(following: false), followers: -1);
  }

  @override
  Future<Relationship> requestFriend(String id) async {
    calls.add('friend:$id');
    final incoming = _find(id).relationship.friend == FriendState.incoming;
    if (incoming) _requests.removeWhere((r) => r.member.id == id);
    return _relate(
      id,
      (r) => r.copyWith(
        friend: incoming ? FriendState.friends : FriendState.requested,
      ),
      friends: incoming ? 1 : 0,
    );
  }

  @override
  Future<Relationship> removeFriend(String id) async {
    calls.add('unfriend:$id');
    final wasFriends = _find(id).relationship.friend == FriendState.friends;
    return _relate(
      id,
      (r) => r.copyWith(friend: FriendState.none),
      friends: wasFriends ? -1 : 0,
    );
  }

  @override
  Future<List<FriendRequest>> friendRequests({bool incoming = true}) =>
      _wait(incoming ? List.of(_requests) : const []);

  @override
  Future<void> answerFriendRequest(
    String requestId, {
    required bool accept,
  }) async {
    calls.add('${accept ? 'accept' : 'decline'}:$requestId');
    final r = _requests.firstWhere(
      (r) => r.id == requestId,
      orElse: () => throw const ApiException(code: ApiException.notFound),
    );
    _requests.remove(r);
    _relate(
      r.member.id,
      (x) =>
          x.copyWith(friend: accept ? FriendState.friends : FriendState.none),
      friends: accept ? 1 : 0,
    );
  }

  @override
  Future<Relationship> block(String id) async {
    calls.add('block:$id');
    _blocked.add(id);
    return _relate(
      id,
      (r) =>
          r.copyWith(blocked: true, following: false, friend: FriendState.none),
    );
  }

  @override
  Future<Relationship> unblock(String id) async {
    calls.add('unblock:$id');
    _blocked.remove(id);
    return _relate(id, (r) => r.copyWith(blocked: false));
  }

  @override
  Future<Page<MemberSummary>> blocked({String? cursor}) =>
      _wait(Page([for (final id in _blocked) _find(id).member]));

  @override
  Future<void> report({
    required String targetType,
    required String targetId,
    required ReportReason reason,
    String note = '',
  }) async {
    final key = '$targetType:$targetId:${reason.wire}';
    if (reports.any((r) => r.startsWith('$targetType:$targetId:'))) {
      throw const ApiException(
        code: ApiException.alreadyReported,
        message: 'You already reported this.',
      );
    }
    reports.add(key);
  }

  /// Phase 1's sections, as the server sends them.
  CommunityConfig configValue = const CommunityConfig();

  @override
  Future<CommunityConfig> config() => _wait(configValue);
}
