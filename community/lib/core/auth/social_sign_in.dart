import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:google_sign_in/google_sign_in.dart' as g;
import 'package:sign_in_with_apple/sign_in_with_apple.dart' as a;

import '../config.dart';

/// What a provider's own sign-in sheet gave the app: a token the server
/// checks with that provider (the app never keeps any provider key).
class SocialCredential {
  const SocialCredential({
    required this.token,
    this.code,
    this.name,
    this.nonce,
  });

  /// Apple's identity token, Google's ID token.
  final String token;

  /// Apple's authorization code.
  final String? code;

  /// Apple: the raw nonce whose SHA-256 the app gave Apple (the server
  /// checks the token was issued for it).
  final String? nonce;

  /// The name the provider shared (Apple shares it only the first time).
  final String? name;
}

/// Continue with Apple or Google: the provider's sheet, then its token.
/// Null when the member closes the sheet.
abstract class SocialSignIn {
  Future<SocialCredential?> signIn();
}

class AppleSignIn implements SocialSignIn {
  @override
  Future<SocialCredential?> signIn() async {
    final nonce = _nonce();
    try {
      final c = await a.SignInWithApple.getAppleIDCredential(
        nonce: sha256.convert(utf8.encode(nonce)).toString(),
        scopes: [
          a.AppleIDAuthorizationScopes.email,
          a.AppleIDAuthorizationScopes.fullName,
        ],
      );
      final token = c.identityToken;
      if (token == null) return null;
      final name = [
        c.givenName,
        c.familyName,
      ].whereType<String>().join(' ').trim();
      return SocialCredential(
        token: token,
        code: c.authorizationCode,
        name: name.isEmpty ? null : name,
        nonce: nonce,
      );
    } on a.SignInWithAppleAuthorizationException catch (e) {
      if (e.code == a.AuthorizationErrorCode.canceled) return null;
      rethrow;
    }
  }
}

/// 32 random characters from a secure source.
String _nonce() {
  const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  final random = Random.secure();
  return List.generate(32, (_) => chars[random.nextInt(chars.length)]).join();
}

class GoogleSignIn implements SocialSignIn {
  GoogleSignIn(this.config);

  final AppConfig config;
  bool _ready = false;

  @override
  Future<SocialCredential?> signIn() async {
    final google = g.GoogleSignIn.instance;
    if (!_ready) {
      // The server's OAuth client: Google issues the ID token for it.
      await google.initialize(
        serverClientId: config.googleClientId.isEmpty
            ? null
            : config.googleClientId,
      );
      _ready = true;
    }
    try {
      final account = await google.authenticate(
        scopeHint: const ['email', 'profile'],
      );
      final token = account.authentication.idToken;
      return token == null
          ? null
          : SocialCredential(token: token, name: account.displayName);
    } on g.GoogleSignInException catch (e) {
      if (e.code == g.GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }
  }
}

/// For tests and the demo: always signs in with [token] (null: closed).
class FakeSocialSignIn implements SocialSignIn {
  const FakeSocialSignIn(this.token, {this.name});

  final String? token;
  final String? name;

  @override
  Future<SocialCredential?> signIn() async =>
      token == null ? null : SocialCredential(token: token!, name: name);
}
