import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The access and refresh tokens of the signed-in student.
class StoredTokens {
  const StoredTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
  });

  factory StoredTokens.fromJson(Map<String, dynamic> json) => StoredTokens(
    accessToken: json['access_token'] as String,
    refreshToken: json['refresh_token'] as String,
    expiresAt: DateTime.parse(json['expires_at'] as String).toUtc(),
  );

  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;

  Map<String, dynamic> toJson() => {
    'access_token': accessToken,
    'refresh_token': refreshToken,
    'expires_at': expiresAt.toUtc().toIso8601String(),
  };
}

/// Where tokens live between app starts.
abstract class TokenStore {
  Future<StoredTokens?> read();
  Future<void> write(StoredTokens tokens);
  Future<void> clear();
}

/// Keeps tokens in the Keychain (iOS) or encrypted storage (Android).
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'yallapp.tokens';
  final FlutterSecureStorage _storage;
  StoredTokens? _cache;
  bool _loaded = false;

  @override
  Future<StoredTokens?> read() async {
    if (_loaded) return _cache;
    try {
      final raw = await _storage.read(key: _key);
      _cache = raw == null
          ? null
          : StoredTokens.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } on Object {
      // Unreadable storage (for example after a restore to a new device)
      // means the student signs in again.
      _cache = null;
    }
    _loaded = true;
    return _cache;
  }

  @override
  Future<void> write(StoredTokens tokens) async {
    _cache = tokens;
    _loaded = true;
    await _storage.write(key: _key, value: jsonEncode(tokens.toJson()));
  }

  @override
  Future<void> clear() async {
    _cache = null;
    _loaded = true;
    await _storage.delete(key: _key);
  }
}

/// A store that only lives in memory, for tests.
class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this._tokens]);

  StoredTokens? _tokens;
  int writes = 0;

  @override
  Future<StoredTokens?> read() async => _tokens;

  @override
  Future<void> write(StoredTokens tokens) async {
    writes++;
    _tokens = tokens;
  }

  @override
  Future<void> clear() async => _tokens = null;
}
