import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/models.dart';

/// 59 Where the session's tokens live between launches.
abstract class TokenStore {
  Future<Session?> read();
  Future<void> write(Session session);
  Future<void> clear();
}

/// The phone's keychain (iOS) or encrypted storage (Android).
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'yallapp_business.session';
  final FlutterSecureStorage _storage;
  Session? _cache;

  @override
  Future<Session?> read() async {
    if (_cache != null) return _cache;
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return null;
      return _cache = Session.fromJson(asJsonMap(jsonDecode(raw)));
    } on Object {
      return null;
    }
  }

  @override
  Future<void> write(Session session) async {
    _cache = session;
    await _storage.write(key: _key, value: jsonEncode(session.toJson()));
  }

  @override
  Future<void> clear() async {
    _cache = null;
    await _storage.delete(key: _key);
  }
}

/// For tests and the demo.
class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.session]);

  Session? session;

  @override
  Future<Session?> read() async => session;

  @override
  Future<void> write(Session value) async => session = value;

  @override
  Future<void> clear() async => session = null;
}

Map<String, dynamic> asJsonMap(Object? value) =>
    (value as Map).map((k, v) => MapEntry('$k', v));
