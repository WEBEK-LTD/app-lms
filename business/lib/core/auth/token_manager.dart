import 'dart:async';

import '../api/api_exception.dart';
import '../api/models.dart';
import 'token_store.dart';

/// Exchanges a refresh token for a new session (`POST /auth/refresh`).
typedef RefreshCall = Future<Session> Function(String refreshToken);

/// 59 Owns the access token (15 minutes) and the refresh token (60 days,
/// renewed on each use: the newest one is always kept).
///
/// - Hands out a valid access token, refreshing shortly before it expires.
/// - Refreshes once for any number of concurrent 401s (single flight).
/// - Ends the session when the server refuses the refresh token.
class TokenManager {
  TokenManager({
    required this._store,
    required RefreshCall refresh,
    DateTime Function()? clock,
    this.margin = const Duration(seconds: 30),
  }) : _refreshCall = refresh,
       _clock = clock ?? DateTime.now;

  final TokenStore _store;
  final RefreshCall _refreshCall;
  final DateTime Function() _clock;
  final Duration margin;

  Future<String?>? _inFlight;
  final _ended = StreamController<void>.broadcast();

  /// Fires when the session can't be renewed and the person is signed out.
  Stream<void> get sessionEnded => _ended.stream;

  Future<bool> get hasSession async => (await _store.read()) != null;

  Future<void> save(Session session) => _store.write(session);

  Future<void> clear() => _store.clear();

  /// A usable access token, or null when signed out.
  Future<String?> validAccessToken() async {
    final pending = _inFlight;
    if (pending != null) return pending;
    final session = await _store.read();
    if (session == null) return null;
    final now = _clock().toUtc();
    if (now.isBefore(session.accessExpiresAt.toUtc().subtract(margin))) {
      return session.accessToken;
    }
    try {
      return await refresh(failedAccessToken: session.accessToken);
    } on ApiException catch (e) {
      // Offline: send the old token; the request reports the error itself.
      if (e.isOffline) return session.accessToken;
      rethrow;
    }
  }

  /// Renews the tokens after [failedAccessToken] was refused. Returns the
  /// new access token, or null when the session has ended.
  Future<String?> refresh({String? failedAccessToken}) {
    final pending = _inFlight;
    if (pending != null) return pending;
    final future = _refresh(failedAccessToken);
    _inFlight = future;
    return future.whenComplete(() => _inFlight = null);
  }

  Future<String?> _refresh(String? failedAccessToken) async {
    final current = await _store.read();
    if (current == null) return null;
    if (failedAccessToken != null &&
        current.accessToken != failedAccessToken &&
        _clock().toUtc().isBefore(current.accessExpiresAt.toUtc())) {
      // Another request renewed them already.
      return current.accessToken;
    }
    try {
      final session = await _refreshCall(current.refreshToken);
      await _store.write(session);
      return session.accessToken;
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _store.clear();
        _ended.add(null);
        return null;
      }
      rethrow;
    }
  }

  Future<void> dispose() => _ended.close();
}
