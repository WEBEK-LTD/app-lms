import '../auth/yallapp_sign_in.dart';
import 'api_client.dart';
import 'json.dart';
import 'models.dart';

/// A page of a list: the contract's `{ items, next_cursor }`.
class Page<T> {
  const Page(this.items, [this.nextCursor]);

  final List<T> items;

  /// Null at the end.
  final String? nextCursor;
}

/// The calls of area A's contract (`/api/community/v1`,
/// docs/api/community.yaml) that the app shell makes: signing in, the
/// member's own account, other members, follow, friends, block, report,
/// the Yallapp link and the config. The Q&A, tutorials, badges and
/// notifications have their own APIs in their features
/// (lib/features/*/data), on the same [ApiClient].
abstract class CommunityApi {
  // Signing in. [device] is the contract's DeviceInput.
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
    Json? device,
  });
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
    Json? device,
  });

  /// Sign in with Apple's identity token and the raw [nonce] whose SHA-256
  /// the app gave Apple. Apple gives the [name] only the first time.
  Future<SignedIn> signInWithApple({
    required String idToken,
    String? nonce,
    String? name,
    required String language,
    Json? device,
  });

  /// Google Sign-In's ID token.
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
    Json? device,
  });

  /// Continue with Yallapp: the yallapp.com.tr page where the member
  /// confirms, for this PKCE [codeChallenge] (S256) and [state].
  Future<Uri> startYallappSignIn({
    required String codeChallenge,
    required String state,
    required String redirectUri,
    required String language,
  });

  /// The [code] that page returned, with the verifier of its challenge.
  Future<SignedIn> signInWithYallapp({
    required String code,
    required String codeVerifier,
    required String language,
    Json? device,
  });

  /// New tokens for [refreshToken]; the old one stops working.
  Future<SignedIn> refresh(String refreshToken);
  Future<void> requestPasswordReset(String email);
  Future<void> resendVerification();
  Future<void> signOut();

  // The member.
  Future<Profile> me();
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? headline,
    String? bio,
    List<String>? skills,
    String? language,
    String? theme,
  });
  Future<Profile> uploadAvatar(String filePath);

  /// Deletes the account: email members send their [password], Apple and
  /// Google members confirm with `DELETE`.
  Future<void> deleteAccount({String? password});

  /// Starts linking a Yallapp account: the page on yallapp.com.tr where the
  /// member confirms it.
  Future<Uri> startYallappLink();
  Future<void> unlinkYallapp();

  /// Links the Yallapp account `link_suggestion` found, in one tap (409
  /// `not_eligible` when it no longer can be).
  Future<void> acceptLinkSuggestion();

  /// Stops suggesting it.
  Future<void> dismissLinkSuggestion();

  // Other members (`id` or `@username`).
  Future<Profile> member(String id);
  Future<Page<MemberSummary>> followers(String id, {String? cursor});
  Future<Page<MemberSummary>> following(String id, {String? cursor});
  Future<Page<MemberSummary>> friends(String id, {String? cursor});

  Future<Relationship> follow(String id);
  Future<Relationship> unfollow(String id);

  /// Asks to be friends, or accepts when they already asked.
  Future<Relationship> requestFriend(String id);

  /// Unfriends, or takes back the request sent.
  Future<Relationship> removeFriend(String id);
  Future<List<FriendRequest>> friendRequests({bool incoming = true});
  Future<void> answerFriendRequest(String requestId, {required bool accept});

  Future<Relationship> block(String id);
  Future<Relationship> unblock(String id);
  Future<Page<MemberSummary>> blocked({String? cursor});

  /// Reports a member, a question, an answer, a tutorial or a comment.
  Future<void> report({
    required String targetType,
    required String targetId,
    required ReportReason reason,
    String note = '',
  });

  /// The sections of the menu and the tab bar, and what is coming soon.
  Future<CommunityConfig> config();
}

/// [CommunityApi] over HTTP.
class HttpCommunityApi implements CommunityApi {
  HttpCommunityApi(this.client);

  final ApiClient client;

  static Page<MemberSummary> _members(Json json) => Page(
    listOf(json, 'items', MemberSummary.fromJson),
    optStr(json, 'next_cursor'),
  );

  static String _path(String id) => Uri.encodeComponent(id);

  @override
  Future<SignedIn> signUpWithEmail({
    required String name,
    required String email,
    required String password,
    required String language,
    Json? device,
  }) async => SignedIn.fromJson(
    await client.post(
      '/auth/email/sign-up',
      body: {
        'display_name': name,
        'email': email,
        'password': password,
        'language': language,
        'device': ?device,
      },
    ),
  );

  @override
  Future<SignedIn> logInWithEmail({
    required String email,
    required String password,
    Json? device,
  }) async => SignedIn.fromJson(
    await client.post(
      '/auth/email/log-in',
      body: {'email': email, 'password': password, 'device': ?device},
    ),
  );

  @override
  Future<SignedIn> signInWithApple({
    required String idToken,
    String? nonce,
    String? name,
    required String language,
    Json? device,
  }) async => SignedIn.fromJson(
    await client.post(
      '/auth/apple',
      body: {
        'id_token': idToken,
        'nonce': ?nonce,
        'display_name': ?name,
        'language': language,
        'device': ?device,
      },
    ),
  );

  @override
  Future<SignedIn> signInWithGoogle({
    required String idToken,
    required String language,
    Json? device,
  }) async => SignedIn.fromJson(
    await client.post(
      '/auth/google',
      body: {'id_token': idToken, 'language': language, 'device': ?device},
    ),
  );

  @override
  Future<Uri> startYallappSignIn({
    required String codeChallenge,
    required String state,
    required String redirectUri,
    required String language,
  }) async => Uri.parse(
    str(
      await client.post(
        '/auth/yallapp/start',
        body: {
          'redirect_uri': redirectUri,
          'code_challenge': codeChallenge,
          'code_challenge_method': 'S256',
          'state': state,
        },
        renew: false,
      ),
      'authorize_url',
    ),
  );

  @override
  Future<SignedIn> signInWithYallapp({
    required String code,
    required String codeVerifier,
    required String language,
    Json? device,
  }) async => SignedIn.fromJson(
    await client.post(
      '/auth/yallapp',
      body: {
        'code': code,
        'code_verifier': codeVerifier,
        'redirect_uri': YallappSignIn.redirectUri,
        'language': language,
        'device': ?device,
      },
      renew: false,
    ),
  );

  @override
  Future<SignedIn> refresh(String refreshToken) async => SignedIn.fromJson(
    await client.post(
      '/auth/refresh',
      body: {'refresh_token': refreshToken},
      renew: false,
    ),
  );

  @override
  Future<void> requestPasswordReset(String email) async =>
      client.post('/auth/password-reset', body: {'email': email});

  @override
  Future<void> resendVerification() async =>
      client.post('/auth/email/verify/resend');

  @override
  Future<void> signOut() async => client.post('/auth/log-out', renew: false);

  /// The profile with its apps (a second call: the apps come from the
  /// linked Yallapp account).
  Future<Profile> _withApps(Json json) async {
    final profile = Profile.fromJson(json);
    if (!profile.yallappLinked || profile.member.id.isEmpty) return profile;
    final apps = await client.get('/members/${_path(profile.member.id)}/apps');
    return profile.copyWith(apps: listOf(apps, 'items', LinkedApp.fromJson));
  }

  @override
  Future<Profile> me() async => _withApps(await client.get('/me'));

  @override
  Future<Profile> updateMe({
    String? name,
    String? username,
    String? headline,
    String? bio,
    List<String>? skills,
    String? language,
    String? theme,
  }) async => _withApps(
    await client.patch(
      '/me',
      body: {
        'display_name': ?name,
        'username': ?username,
        'headline': ?headline,
        'bio': ?bio,
        'skills': ?skills,
        'language': ?language,
        'theme': ?theme,
      },
    ),
  );

  @override
  Future<Profile> uploadAvatar(String filePath) async => _withApps(
    await client.upload(
      '/me/avatar',
      method: 'PUT',
      field: 'file',
      filePath: filePath,
    ),
  );

  @override
  Future<void> deleteAccount({String? password}) => client.delete(
    '/me',
    body: password == null ? {'confirm': 'DELETE'} : {'password': password},
  );

  @override
  Future<Uri> startYallappLink() async => Uri.parse(
    str(
      await client.post('/me/yallapp-link/start', body: {'return_to': 'app'}),
      'confirm_url',
    ),
  );

  @override
  Future<void> unlinkYallapp() => client.delete('/me/yallapp-link');

  @override
  Future<void> acceptLinkSuggestion() async =>
      client.post('/me/yallapp-link/suggested');

  @override
  Future<void> dismissLinkSuggestion() =>
      client.delete('/me/yallapp-link/suggested');

  @override
  Future<Profile> member(String id) async =>
      _withApps(await client.get('/members/${_path(id)}'));

  Future<Page<MemberSummary>> _list(String path, String? cursor) async =>
      _members(await client.get(path, query: {'cursor': cursor, 'limit': 50}));

  @override
  Future<Page<MemberSummary>> followers(String id, {String? cursor}) =>
      _list('/members/${_path(id)}/followers', cursor);

  @override
  Future<Page<MemberSummary>> following(String id, {String? cursor}) =>
      _list('/members/${_path(id)}/following', cursor);

  @override
  Future<Page<MemberSummary>> friends(String id, {String? cursor}) =>
      _list('/members/${_path(id)}/friends', cursor);

  @override
  Future<Relationship> follow(String id) async =>
      Relationship.fromJson(await client.put('/members/${_path(id)}/follow'));

  @override
  Future<Relationship> unfollow(String id) async => Relationship.fromJson(
    await client.deleteJson('/members/${_path(id)}/follow'),
  );

  @override
  Future<Relationship> requestFriend(String id) async =>
      Relationship.fromJson(await client.put('/members/${_path(id)}/friend'));

  @override
  Future<Relationship> removeFriend(String id) async => Relationship.fromJson(
    await client.deleteJson('/members/${_path(id)}/friend'),
  );

  @override
  Future<List<FriendRequest>> friendRequests({bool incoming = true}) async =>
      listOf(
        await client.get(
          '/me/friend-requests',
          query: {'direction': incoming ? 'incoming' : 'outgoing', 'limit': 50},
        ),
        'items',
        (j) => FriendRequest.fromJson(j, incoming: incoming),
      );

  @override
  Future<void> answerFriendRequest(
    String requestId, {
    required bool accept,
  }) async => client.post(
    '/me/friend-requests/${_path(requestId)}/${accept ? 'accept' : 'decline'}',
  );

  @override
  Future<Relationship> block(String id) async =>
      Relationship.fromJson(await client.put('/members/${_path(id)}/block'));

  @override
  Future<Relationship> unblock(String id) async => Relationship.fromJson(
    await client.deleteJson('/members/${_path(id)}/block'),
  );

  @override
  Future<Page<MemberSummary>> blocked({String? cursor}) =>
      _list('/me/blocks', cursor);

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
      'reason': reason.wire,
      if (note.isNotEmpty) 'note': note,
    },
  );

  @override
  Future<CommunityConfig> config() async =>
      CommunityConfig.fromJson(await client.get('/config'));
}
