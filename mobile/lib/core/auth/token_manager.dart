import 'dart:async';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import 'token_store.dart';

/// Exchanges a refresh token for new tokens (`POST /auth/refresh`).
typedef RefreshCall = Future<Tokens> Function(String refreshToken);

/// Owns the access and refresh tokens.
///
/// - Hands out a valid access token, refreshing shortly before it expires.
/// - Refreshes once for any number of concurrent 401s (single flight).
/// - Stores the rotated refresh token: the old one stops working on the
///   server as soon as it is used.
/// - Ends the session when the server rejects the refresh token.
class TokenManager {
  TokenManager({
    required this._store,
    required RefreshCall refresh,
    DateTime Function()? clock,
    this.refreshMargin = const Duration(seconds: 30),
  }) : _refreshCall = refresh,
       _clock = clock ?? DateTime.now;

  final TokenStore _store;
  final RefreshCall _refreshCall;
  final DateTime Function() _clock;
  final Duration refreshMargin;

  Future<String?>? _inFlight;
  final _expired = StreamController<void>.broadcast();

  /// Fires when the session can't be refreshed and the student is signed out.
  Stream<void> get sessionExpired => _expired.stream;

  Future<bool> get hasSession async => (await _store.read()) != null;

  /// Saves the tokens of a new session (after sign-in or sign-up).
  Future<void> save(Tokens tokens) => _store.write(_fromTokens(tokens));

  /// Forgets the tokens (sign out, account deleted).
  Future<void> clear() => _store.clear();

  /// A usable access token, or null when signed out.
  Future<String?> validAccessToken() async {
    final pending = _inFlight;
    if (pending != null) return pending;
    final tokens = await _store.read();
    if (tokens == null) return null;
    final now = _clock().toUtc();
    if (now.isBefore(tokens.expiresAt.subtract(refreshMargin))) {
      return tokens.accessToken;
    }
    try {
      return await refresh(failedAccessToken: tokens.accessToken);
    } on ApiException catch (e) {
      // Offline: try the old token; the request itself will report the error.
      if (e.isOffline) return tokens.accessToken;
      rethrow;
    }
  }

  /// Refreshes the tokens after [failedAccessToken] was rejected.
  ///
  /// Returns the new access token, or null when the session has ended. If
  /// another call already rotated the tokens, the current token is returned
  /// without a second refresh.
  Future<String?> refresh({String? failedAccessToken}) {
    final pending = _inFlight;
    if (pending != null) return pending;
    final future = _doRefresh(failedAccessToken);
    _inFlight = future;
    return future.whenComplete(() => _inFlight = null);
  }

  Future<String?> _doRefresh(String? failedAccessToken) async {
    final current = await _store.read();
    if (current == null) return null;
    if (failedAccessToken != null &&
        current.accessToken != failedAccessToken &&
        _clock().toUtc().isBefore(current.expiresAt)) {
      // Already rotated by an earlier refresh.
      return current.accessToken;
    }
    try {
      final tokens = await _refreshCall(current.refreshToken);
      final stored = _fromTokens(tokens);
      await _store.write(stored);
      return stored.accessToken;
    } on ApiException catch (e) {
      if (e.isUnauthorized || e.statusCode == 403) {
        await _store.clear();
        _expired.add(null);
        return null;
      }
      rethrow;
    }
  }

  StoredTokens _fromTokens(Tokens tokens) => StoredTokens(
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: _clock().toUtc().add(Duration(seconds: tokens.expiresIn)),
  );

  Future<void> dispose() => _expired.close();
}
