import 'api_client.dart';
import 'json.dart';
import 'models.dart';

/// The calls of the Community API (`/api/community/v1`, area A's contract)
/// that the app shell makes: signing in, the member's own profile, other
/// members, follow, friends, block, report and the Yallapp link. The Q&A,
/// tutorials, badges and notifications have their own APIs in their
/// features (lib/features/*/data), on the same [ApiClient].
abstract class CommunityApi {
  // Signing in.
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
  });
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
  });

  /// What Sign in with Apple gave the app (the server checks it with Apple).
  Future<SignedIn> signInWithApple({
    required String identityToken,
    String? authorizationCode,
    String? name,
    required String language,
  });

  /// What Google gave the app (the server checks it with Google).
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
  });
  Future<void> requestPasswordReset(String email);
  Future<void> signOut();

  // The member.
  Future<Profile> me();
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? bio,
    List<String>? skills,
    String? language,
  });
  Future<Profile> uploadAvatar(String filePath);

  /// Starts linking a Yallapp account: the page where the member confirms it.
  Future<Uri> startYallappLink();
  Future<void> unlinkYallapp();

  // Other members.
  Future<Profile> member(String id);
  Future<List<MemberSummary>> followers(String id);
  Future<List<MemberSummary>> following(String id);
  Future<List<MemberSummary>> friends(String id);
  Future<List<MemberSummary>> searchMembers(String query);

  Future<void> follow(String id);
  Future<void> unfollow(String id);

  /// Friends: ask, answer, remove.
  Future<void> requestFriend(String id);
  Future<void> cancelFriendRequest(String id);
  Future<List<FriendRequest>> friendRequests();
  Future<void> answerFriendRequest(String requestId, {required bool accept});
  Future<void> removeFriend(String id);

  Future<void> block(String id);
  Future<void> unblock(String id);
  Future<List<MemberSummary>> blocked();

  /// Reports a member, a question, an answer or a tutorial.
  Future<void> report({
    required String targetType,
    required String targetId,
    required ReportReason reason,
    String note = '',
  });
}

/// [CommunityApi] over HTTP.
class HttpCommunityApi implements CommunityApi {
  HttpCommunityApi(this.client);

  final ApiClient client;

  SignedIn _signedIn(Json json) => SignedIn(
    session: Session.fromJson(optObject(json, 'session') ?? json),
    me: Profile.fromJson(
      optObject(json, 'member') ?? optObject(json, 'user') ?? const {},
    ),
    isNew: boolean(json, 'created') || boolean(json, 'is_new'),
  );

  List<MemberSummary> _members(Json json) => listOf(
    json,
    json.containsKey('items') ? 'items' : 'members',
    MemberSummary.fromJson,
  );

  @override
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
  }) async => _signedIn(
    await client.post(
      '/auth/email/signup',
      body: {
        'display_name': name,
        'email': email,
        'password': password,
        'language': language,
      },
    ),
  );

  @override
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
  }) async => _signedIn(
    await client.post(
      '/auth/email/login',
      body: {'email': email, 'password': password},
    ),
  );

  @override
  Future<SignedIn> signInWithApple({
    required String identityToken,
    String? authorizationCode,
    String? name,
    required String language,
  }) async => _signedIn(
    await client.post(
      '/auth/apple',
      body: {
        'identity_token': identityToken,
        'authorization_code': ?authorizationCode,
        'display_name': ?name,
        'language': language,
      },
    ),
  );

  @override
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
  }) async => _signedIn(
    await client.post(
      '/auth/google',
      body: {'id_token': idToken, 'language': language},
    ),
  );

  @override
  Future<void> requestPasswordReset(String email) async =>
      client.post('/auth/email/reset', body: {'email': email});

  @override
  Future<void> signOut() async => client.post('/auth/logout');

  @override
  Future<Profile> me() async {
    final json = await client.get('/me');
    return Profile.fromJson(optObject(json, 'member') ?? json);
  }

  @override
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? bio,
    List<String>? skills,
    String? language,
  }) async {
    final json = await client.patch(
      '/me',
      body: {
        'display_name': ?name,
        'username': ?username,
        'bio': ?bio,
        'skills': ?skills,
        'language': ?language,
      },
    );
    return Profile.fromJson(optObject(json, 'member') ?? json);
  }

  @override
  Future<Profile> uploadAvatar(String filePath) async {
    final json = await client.upload(
      '/me/avatar',
      field: 'avatar',
      filePath: filePath,
    );
    return Profile.fromJson(optObject(json, 'member') ?? json);
  }

  @override
  Future<Uri> startYallappLink() async =>
      Uri.parse(str(await client.post('/me/yallapp-link'), 'url'));

  @override
  Future<void> unlinkYallapp() => client.delete('/me/yallapp-link');

  @override
  Future<Profile> member(String id) async {
    final json = await client.get('/members/$id');
    return Profile.fromJson(optObject(json, 'member') ?? json);
  }

  @override
  Future<List<MemberSummary>> followers(String id) async =>
      _members(await client.get('/members/$id/followers'));

  @override
  Future<List<MemberSummary>> following(String id) async =>
      _members(await client.get('/members/$id/following'));

  @override
  Future<List<MemberSummary>> friends(String id) async =>
      _members(await client.get('/members/$id/friends'));

  @override
  Future<List<MemberSummary>> searchMembers(String query) async =>
      _members(await client.get('/members', query: {'q': query}));

  @override
  Future<void> follow(String id) async => client.post('/members/$id/follow');

  @override
  Future<void> unfollow(String id) => client.delete('/members/$id/follow');

  @override
  Future<void> requestFriend(String id) async =>
      client.post('/members/$id/friend-request');

  @override
  Future<void> cancelFriendRequest(String id) =>
      client.delete('/members/$id/friend-request');

  @override
  Future<List<FriendRequest>> friendRequests() async => listOf(
    await client.get('/me/friend-requests'),
    'items',
    FriendRequest.fromJson,
  );

  @override
  Future<void> answerFriendRequest(
    String requestId, {
    required bool accept,
  }) async => client.post(
    '/friend-requests/$requestId/${accept ? 'accept' : 'decline'}',
  );

  @override
  Future<void> removeFriend(String id) => client.delete('/members/$id/friend');

  @override
  Future<void> block(String id) async => client.post('/members/$id/block');

  @override
  Future<void> unblock(String id) => client.delete('/members/$id/block');

  @override
  Future<List<MemberSummary>> blocked() async =>
      _members(await client.get('/me/blocked'));

  @override
  Future<void> report({
    required String targetType,
    required String targetId,
    required ReportReason reason,
    String note = '',
  }) async => client.post(
    '/reports',
    body: {
      'target_type': targetType,
      'target_id': targetId,
      'reason': reason.name,
      if (note.isNotEmpty) 'note': note,
    },
  );
}
