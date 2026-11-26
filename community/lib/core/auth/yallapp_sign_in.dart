import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import '../api/api_exception.dart';
import '../api/community_api.dart';
import '../api/json.dart';
import '../api/models.dart';

/// Shows yallapp.com.tr's confirm page in the phone's auth session
/// (ASWebAuthenticationSession on iOS, Custom Tabs on Android) and answers
/// the address it came back to, or null when the member closed it.
abstract class YallappAuthSession {
  Future<Uri?> open(Uri page, {required String callbackScheme});
}

class WebYallappAuthSession implements YallappAuthSession {
  const WebYallappAuthSession();

  @override
  Future<Uri?> open(Uri page, {required String callbackScheme}) async {
    try {
      return Uri.parse(
        await FlutterWebAuth2.authenticate(
          url: page.toString(),
          callbackUrlScheme: callbackScheme,
        ),
      );
    } on PlatformException catch (e) {
      if (e.code == 'CANCELED') return null;
      rethrow;
    }
  }
}

/// For tests and the demo: answers [back] for the page it is given.
class FakeYallappAuthSession implements YallappAuthSession {
  FakeYallappAuthSession(this.back);

  /// The demo: confirmed at once, the page's own state echoed back.
  factory FakeYallappAuthSession.confirming() => FakeYallappAuthSession(
    (page) => Uri.parse(
      '${YallappSignIn.redirectUri}?code=demo-code'
      '&state=${page.queryParameters['state']}',
    ),
  );

  final Uri? Function(Uri page) back;
  Uri? opened;

  @override
  Future<Uri?> open(Uri page, {required String callbackScheme}) async {
    opened = page;
    return back(page);
  }
}

/// Continue with Yallapp: PKCE (S256) through the confirm page.
class YallappSignIn {
  YallappSignIn(this.api, this.session, {Random? random})
    : _random = random ?? Random.secure();

  static const callbackScheme = 'yallappcommunity';
  static const redirectUri = '$callbackScheme://signed-in';

  final CommunityApi api;
  final YallappAuthSession session;
  final Random _random;

  static const _unreserved =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  String _secret(int length) => List.generate(
    length,
    (_) => _unreserved[_random.nextInt(_unreserved.length)],
  ).join();

  /// base64url(SHA-256(verifier)), without padding (RFC 7636).
  static String challengeOf(String verifier) => base64Url
      .encode(sha256.convert(ascii.encode(verifier)).bytes)
      .replaceAll('=', '');

  /// Null when the member closed the page or said no there.
  Future<SignedIn?> run({required String language, Json? device}) async {
    final verifier = _secret(64);
    final state = _secret(24);
    final page = await api.startYallappSignIn(
      codeChallenge: challengeOf(verifier),
      state: state,
      redirectUri: redirectUri,
      language: language,
    );
    final back = await session.open(page, callbackScheme: callbackScheme);
    if (back == null) return null;
    final q = back.queryParameters;
    // Not the answer to this request: refused, as a forged one would be.
    if (q['state'] != state) {
      throw const ApiException(code: ApiException.invalidGrant);
    }
    if (q['error'] == 'access_denied') return null;
    final code = q['code'];
    if (code == null || code.isEmpty) {
      throw const ApiException(code: ApiException.invalidGrant);
    }
    return api.signInWithYallapp(
      code: code,
      codeVerifier: verifier,
      language: language,
      device: device,
    );
  }
}
