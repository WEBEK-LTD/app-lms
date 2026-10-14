import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../storage/local_settings.dart';

/// Offline mode (step 13.1): when the app's plan includes it (`Config.features
/// .offline`), the answers to GET requests are kept on the phone, and shown
/// again when there is no connection. Without it nothing is kept, and the app
/// shows its usual "You're offline" screens.
///
/// Up to [maxEntries] answers of at most [maxChars] characters each, the
/// oldest dropped first. Signing out forgets them all.
class OfflineCache {
  OfflineCache(this._prefs);

  final SharedPreferences _prefs;

  static const enabledKey = 'offline.enabled';
  static const _indexKey = 'offline.index';
  static const _prefix = 'offline.entry.';
  static const maxEntries = 150;
  static const maxChars = 256 * 1024;

  /// What the last `/config` said; kept so the app can open offline.
  bool get enabled => _prefs.getBool(enabledKey) ?? false;

  Future<void> setEnabled(bool on) async {
    if (on == enabled) return;
    await _prefs.setBool(enabledKey, on);
    if (!on) await clear();
  }

  /// One entry per method, address and language.
  static String keyFor(RequestOptions options) =>
      '${options.method} ${options.uri} ${options.headers['Accept-Language'] ?? ''}';

  Object? read(String key) {
    final raw = _prefs.getString('$_prefix${_hash(key)}');
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } on FormatException {
      return null;
    }
  }

  Future<void> write(String key, Object? data) async {
    final String raw;
    try {
      raw = jsonEncode(data);
    } on Object {
      return;
    }
    if (raw.length > maxChars) return;
    final id = _hash(key);
    final index = [
      ...?_prefs.getStringList(_indexKey)?.where((e) => e != id),
      id,
    ];
    while (index.length > maxEntries) {
      await _prefs.remove('$_prefix${index.removeAt(0)}');
    }
    await _prefs.setString('$_prefix$id', raw);
    await _prefs.setStringList(_indexKey, index);
  }

  Future<void> clear() async {
    for (final id in _prefs.getStringList(_indexKey) ?? const <String>[]) {
      await _prefs.remove('$_prefix$id');
    }
    await _prefs.remove(_indexKey);
  }

  /// FNV-1a, 32 bits: a short stable name for an address.
  static String _hash(String value) {
    var hash = 0x811c9dc5;
    for (final unit in utf8.encode(value)) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0xFFFFFFFF;
    }
    return hash.toRadixString(16).padLeft(8, '0');
  }
}

final offlineCacheProvider = Provider<OfflineCache>(
  (ref) => OfflineCache(ref.watch(sharedPreferencesProvider)),
);

/// Keeps GET answers while offline mode is on, and answers from them when a
/// request can't reach the server.
class OfflineCacheInterceptor extends Interceptor {
  OfflineCacheInterceptor(this._cache);

  final OfflineCache _cache;

  static bool _cacheable(RequestOptions options) =>
      options.method.toUpperCase() == 'GET' &&
      !options.path.startsWith('/auth');

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    final options = response.requestOptions;
    final data = response.data;
    if (_cache.enabled &&
        _cacheable(options) &&
        response.statusCode == 200 &&
        (data is Map || data is List)) {
      unawaited(_cache.write(OfflineCache.keyFor(options), data));
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final options = err.requestOptions;
    final offline =
        err.response == null &&
        (err.type == DioExceptionType.connectionError ||
            err.type == DioExceptionType.connectionTimeout ||
            err.type == DioExceptionType.receiveTimeout ||
            err.type == DioExceptionType.sendTimeout ||
            err.type == DioExceptionType.unknown);
    if (offline && _cache.enabled && _cacheable(options)) {
      final data = _cache.read(OfflineCache.keyFor(options));
      if (data != null) {
        return handler.resolve(
          Response<dynamic>(
            requestOptions: options,
            data: data,
            statusCode: 200,
            headers: Headers.fromMap({
              'x-yallapp-offline': ['1'],
            }),
          ),
        );
      }
    }
    handler.next(err);
  }
}
