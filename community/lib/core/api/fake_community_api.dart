import 'api_exception.dart';
import 'community_api.dart';
import 'models.dart';

/// [CommunityApi] in memory: the widget tests drive it, and
/// `--dart-define=YC_DEMO=true` runs the app on it (the approved design's
/// members: Mohamed Ali, Nour El Hoda, Karim Samy).
class FakeCommunityApi implements CommunityApi {
  FakeCommunityApi({this.signedUpAs});

  /// The member a sign-in becomes (the design's Mohamed Ali).
  final String? signedUpAs;

  static const meId = 'm-mohamed';
  final calls = <String>[];
  final reports = <String>[];
  String password = 'yallapp-demo';
  Uri linkPage = Uri.parse('https://yallapp.com.tr/community/link?state=demo');

  late Profile _me = Profile(
    member: MemberSummary(
      id: meId,
      name: signedUpAs ?? 'Mohamed Ali',
      username: 'mohamed',
      level: 'Pro',
    ),
    bio: 'Building shops with Studio since 2025.',
    skills: const ['Studio', 'Shops', 'Arabic apps'],
    badges: const [Badge(kind: BadgeKind.blue)],
    points: 1240,
    followers: 128,
    following: 64,
    friends: 12,
    answers: 37,
    questions: 9,
    apps: const [
      LinkedApp(
        id: 'a1',
        name: 'Lujain',
        url: 'https://lujain.yallapp.com.tr',
        kind: 'store',
      ),
      LinkedApp(
        id: 'a2',
        name: 'Toota',
        url: 'https://toota.yallapp.com.tr',
        kind: 'store',
      ),
    ],
    yallappLinked: true,
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
      badges: [Badge(kind: BadgeKind.blue)],
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
      badges: [Badge(kind: BadgeKind.gold)],
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

  SignedIn _signedIn({bool isNew = false}) => SignedIn(
    session: const Session(accessToken: 'demo-token'),
    me: _me,
    isNew: isNew,
  );

  @override
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
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
    );
    return _wait(_signedIn(isNew: true));
  }

  @override
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
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
    required String identityToken,
    String? authorizationCode,
    String? name,
    required String language,
  }) {
    calls.add('apple');
    return _wait(_signedIn());
  }

  @override
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
  }) {
    calls.add('google');
    return _wait(_signedIn());
  }

  @override
  Future<void> requestPasswordReset(String email) async =>
      calls.add('reset:$email');

  @override
  Future<void> signOut() async => calls.add('signout');

  @override
  Future<Profile> me() => _wait(_me);

  @override
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? bio,
    List<String>? skills,
    String? language,
  }) {
    calls.add('updateMe');
    final m = _me.member;
    _me = _me.copyWith(
      member: MemberSummary(
        id: m.id,
        name: name ?? m.name,
        username: username ?? m.username,
        avatarUrl: m.avatarUrl,
        badge: m.badge,
        level: m.level,
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
  Future<Uri> startYallappLink() {
    calls.add('link');
    return _wait(linkPage);
  }

  @override
  Future<void> unlinkYallapp() async {
    calls.add('unlink');
    _me = Profile(
      member: _me.member,
      bio: _me.bio,
      skills: _me.skills,
      badges: _me.badges,
      points: _me.points,
      followers: _me.followers,
      following: _me.following,
      friends: _me.friends,
    );
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
  Future<List<MemberSummary>> followers(String id) =>
      _wait(_all.where((m) => m.id != id).toList());

  @override
  Future<List<MemberSummary>> following(String id) =>
      _wait(_all.where((m) => m.id != id).take(2).toList());

  @override
  Future<List<MemberSummary>> friends(String id) =>
      _wait(_all.where((m) => m.id != id).take(1).toList());

  @override
  Future<List<MemberSummary>> searchMembers(String query) => _wait(
    _all
        .where((m) => m.name.toLowerCase().contains(query.toLowerCase()))
        .toList(),
  );

  void _relate(
    String id,
    Relationship Function(Relationship r) change, {
    int followers = 0,
    int friends = 0,
  }) {
    final p = _find(id);
    _members[id] = p.copyWith(
      relationship: change(p.relationship),
      followers: p.followers + followers,
      friends: p.friends + friends,
    );
  }

  @override
  Future<void> follow(String id) async {
    calls.add('follow:$id');
    _relate(id, (r) => r.copyWith(following: true), followers: 1);
  }

  @override
  Future<void> unfollow(String id) async {
    calls.add('unfollow:$id');
    _relate(id, (r) => r.copyWith(following: false), followers: -1);
  }

  @override
  Future<void> requestFriend(String id) async {
    calls.add('friend:$id');
    _relate(id, (r) => r.copyWith(friend: FriendState.requested));
  }

  @override
  Future<void> cancelFriendRequest(String id) async {
    calls.add('unfriendRequest:$id');
    _relate(id, (r) => r.copyWith(friend: FriendState.none));
  }

  @override
  Future<List<FriendRequest>> friendRequests() => _wait(List.of(_requests));

  @override
  Future<void> answerFriendRequest(
    String requestId, {
    required bool accept,
  }) async {
    calls.add('${accept ? 'accept' : 'decline'}:$requestId');
    final r = _requests.firstWhere((r) => r.id == requestId);
    _requests.remove(r);
    if (accept) {
      _relate(
        r.member.id,
        (x) => x.copyWith(friend: FriendState.friends),
        friends: 1,
      );
    }
  }

  @override
  Future<void> removeFriend(String id) async {
    calls.add('unfriend:$id');
    _relate(id, (r) => r.copyWith(friend: FriendState.none), friends: -1);
  }

  @override
  Future<void> block(String id) async {
    calls.add('block:$id');
    _blocked.add(id);
    _relate(
      id,
      (r) =>
          r.copyWith(blocked: true, following: false, friend: FriendState.none),
    );
  }

  @override
  Future<void> unblock(String id) async {
    calls.add('unblock:$id');
    _blocked.remove(id);
    _relate(id, (r) => r.copyWith(blocked: false));
  }

  @override
  Future<List<MemberSummary>> blocked() =>
      _wait([for (final id in _blocked) _find(id).member]);

  @override
  Future<void> report({
    required String targetType,
    required String targetId,
    required ReportReason reason,
    String note = '',
  }) async {
    reports.add('$targetType:$targetId:${reason.name}');
  }
}
