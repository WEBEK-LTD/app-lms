import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 44 Usage statistics for the app's owner (docs/api/platform.yaml, tag
/// Analytics): first-party, no third-party SDK, no advertising ID.
///
/// Events wait in memory and in the app's preferences (at most [maxQueued],
/// each dropped after [maxAge]) and go to Yallapp every [sendEvery] and when
/// the app goes to the background, at most [batchSize] a request. A failed
/// request is tried again later, the pause doubling from 30 seconds up to 30
/// minutes. The person can turn sharing off in Settings: sending stops and
/// the queue and the install ID are deleted.
///
/// Inactive (records nothing) without `analytics` in the build config, which
/// the app preview never has.
class AnalyticsService {
  AnalyticsService({
    required SharedPreferences preferences,
    required this.eventsUrl,
    required this.key,
    required this.platform,
    required this.appVersion,
    this.osVersion,
    required this.locale,
    required bool enabled,
    AnalyticsSender? sender,
    DateTime Function()? clock,
  }) : _prefs = preferences,
       _enabled = enabled,
       _send = sender ?? dioSender(),
       _clock = clock ?? DateTime.now {
    _queue.addAll(_loadQueue());
    if (!enabled) _clearStored();
  }

  static const queueKey = 'analytics.queue';
  static const installIdKey = 'analytics.install_id';
  static const firstOpenKey = 'analytics.first_open_sent';

  static const sendEvery = Duration(seconds: 30);
  static const sessionGap = Duration(minutes: 30);
  static const maxAge = Duration(days: 7);
  static const maxQueued = 500;
  static const batchSize = 100;
  static const _minPause = Duration(seconds: 30);
  static const _maxPause = Duration(minutes: 30);

  final String? eventsUrl;
  final String? key;

  /// `android` or `ios`.
  final String platform;
  final String appVersion;

  /// "Android 14", "iOS 18.1".
  final String? osVersion;

  /// The app's language when a batch goes.
  final String Function() locale;

  final SharedPreferences _prefs;
  final AnalyticsSender _send;
  final DateTime Function() _clock;
  final List<Map<String, Object?>> _queue = [];
  bool _enabled;
  bool _started = false;
  bool _stopped = false;
  bool _sending = false;
  int _failures = 0;
  DateTime? _nextAttempt;
  DateTime? _backgroundSince;
  String? _lastScreen;
  Timer? _timer;
  AppLifecycleListener? _lifecycle;

  /// The build sends usage statistics at all (the toggle shows only then).
  bool get available =>
      eventsUrl != null &&
      eventsUrl!.isNotEmpty &&
      key != null &&
      key!.isNotEmpty;

  bool get enabled => _enabled;
  bool get _active => available && _enabled && !_stopped;

  /// What is waiting to be sent (for tests).
  List<Map<String, Object?>> get queued => List.unmodifiable(_queue);

  /// Starts the session: the first `app_open` (with `first_open` once per
  /// install), the timer and the background and foreground hooks.
  void start({bool lifecycle = true, Duration? every = sendEvery}) {
    if (_started) return;
    _started = true;
    if (every != null) {
      _timer = Timer.periodic(every, (_) => unawaited(flush()));
    }
    if (lifecycle) {
      _lifecycle = AppLifecycleListener(
        onHide: _onBackground,
        onPause: _onBackground,
        onResume: _onForeground,
      );
    }
    _appOpen();
  }

  void dispose() {
    _timer?.cancel();
    _lifecycle?.dispose();
  }

  void _onBackground() {
    _backgroundSince ??= _clock();
    unawaited(flush());
  }

  void _onForeground() {
    final since = _backgroundSince;
    _backgroundSince = null;
    // Back after 30 minutes or more: a new session.
    if (since != null && _clock().difference(since) >= sessionGap) _appOpen();
  }

  /// Called by the lifecycle hooks; public for tests.
  @visibleForTesting
  void wentToBackground() => _onBackground();

  @visibleForTesting
  void cameToForeground() => _onForeground();

  void _appOpen() {
    if (!_active) return;
    final first = _prefs.getBool(firstOpenKey) != true;
    record('app_open', {if (first) 'first_open': true});
    if (first) unawaited(_prefs.setBool(firstOpenKey, true));
  }

  /// Turns sharing on or off. Off stops sending and deletes the queue and
  /// the install ID; on again starts with a new install ID.
  void setEnabled(bool on) {
    if (_enabled == on) return;
    _enabled = on;
    if (!on) _clearStored();
  }

  void _clearStored() {
    _queue.clear();
    unawaited(_prefs.remove(queueKey));
    unawaited(_prefs.remove(installIdKey));
  }

  /// Adds one event (the contract's AnalyticsEvent without `at`).
  void record(String type, [Map<String, Object?> fields = const {}]) {
    if (!_active) return;
    _queue.add({
      'type': type,
      'at': _clock().toUtc().toIso8601String(),
      for (final e in fields.entries)
        if (e.value != null) e.key: e.value,
    });
    if (_queue.length > maxQueued) {
      _queue.removeRange(0, _queue.length - maxQueued);
    }
    _saveQueue();
  }

  /// A screen opened: its kind ([screenKindOf]), once per change.
  void screen(String location) {
    final kind = screenKindOf(location);
    if (kind == null || kind == _lastScreen) return;
    _lastScreen = kind;
    record('screen_view', {'screen': kind});
  }

  void item(
    String type, {
    required String kind,
    required Object id,
    String? title,
    num? amount,
    String? currency,
  }) {
    final clean = title?.trim();
    record(type, {
      'item_kind': kind,
      'item_id': '$id',
      if (clean != null && clean.isNotEmpty)
        'title': clean.length > 120 ? clean.substring(0, 120) : clean,
      if (amount != null && currency != null && amount >= 0) ...{
        'amount': amount,
        'currency': currency.toUpperCase(),
      },
    });
  }

  void search(String query) {
    final text = query.trim();
    if (text.length < 2) return;
    record('search', {
      'query': text.length > 80 ? text.substring(0, 80) : text,
    });
  }

  void pushOpened(Map<String, dynamic> data) {
    final id = '${data['notification_id'] ?? ''}'.trim();
    final type = '${data['type'] ?? ''}'.trim();
    record('push_open', {
      if (id.isNotEmpty && id.length <= 64) 'notification_id': id,
      if (RegExp(r'^[a-z][a-z0-9_]{0,31}$').hasMatch(type)) 'push_type': type,
    });
  }

  String _installId() {
    final existing = _prefs.getString(installIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final id = randomUuid();
    unawaited(_prefs.setString(installIdKey, id));
    return id;
  }

  List<Map<String, Object?>> _loadQueue() {
    final raw = _prefs.getString(queueKey);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw);
      if (list is! List) return [];
      return [
        for (final e in list)
          if (e is Map) Map<String, Object?>.from(e),
      ];
    } on Object {
      return [];
    }
  }

  void _saveQueue() {
    unawaited(_prefs.setString(queueKey, jsonEncode(_queue)));
  }

  void _dropOld() {
    final oldest = _clock().toUtc().subtract(maxAge);
    _queue.removeWhere((e) {
      final at = DateTime.tryParse('${e['at']}');
      return at == null || at.isBefore(oldest);
    });
  }

  /// Sends what is queued, a batch at a time, unless a pause after a
  /// failure is still running. Returns how many events went.
  Future<int> flush() async {
    if (!_active || _sending) return 0;
    final wait = _nextAttempt;
    if (wait != null && _clock().isBefore(wait)) return 0;
    _sending = true;
    var sent = 0;
    try {
      _dropOld();
      while (_queue.isNotEmpty && _active) {
        final batch = _queue.take(batchSize).toList();
        final body = <String, Object?>{
          'install_id': _installId(),
          'platform': platform,
          'app_version': appVersion,
          'os_version': ?osVersion,
          'locale': locale(),
          'events': batch,
        };
        AnalyticsResponse response;
        try {
          response = await _send(eventsUrl!, key!, body);
        } on Object {
          response = const AnalyticsResponse(0);
        }
        // Turned off while it was being sent: the queue is already gone.
        if (!_enabled) break;
        final status = response.status;
        if (status >= 200 && status < 300 || status == 400 || status == 413) {
          // Taken, or never takeable (a broken event): not sent again.
          _queue.removeRange(0, min(batch.length, _queue.length));
          _failures = 0;
          _nextAttempt = null;
          if (status < 300) sent += batch.length;
          _saveQueue();
          continue;
        }
        if (status == 403 || status == 404) {
          // Not this app's key, or the app is gone: stop until the next start.
          _stopped = true;
          _clearStored();
          break;
        }
        _failures += 1;
        final pause = response.retryAfter ?? _pauseAfter(_failures);
        _nextAttempt = _clock().add(pause);
        break;
      }
    } finally {
      _sending = false;
    }
    return sent;
  }

  static Duration _pauseAfter(int failures) {
    final seconds = _minPause.inSeconds * pow(2, min(failures - 1, 10));
    return Duration(seconds: min(seconds.toInt(), _maxPause.inSeconds));
  }
}

class AnalyticsResponse {
  const AnalyticsResponse(this.status, {this.retryAfter});

  /// The HTTP status, or 0 when the request didn't get an answer.
  final int status;
  final Duration? retryAfter;
}

typedef AnalyticsSender = Future<AnalyticsResponse> Function(
  String url,
  String key,
  Map<String, Object?> body,
);

/// Sends a batch with its own HTTP client: no account token, no cache.
AnalyticsSender dioSender([Dio? client]) {
  final dio =
      client ??
      Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          contentType: Headers.jsonContentType,
          validateStatus: (_) => true,
        ),
      );
  return (url, key, body) async {
    final response = await dio.post<dynamic>(
      url,
      data: body,
      options: Options(headers: {'X-Yallapp-Analytics-Key': key}),
    );
    final retry = int.tryParse(response.headers.value('retry-after') ?? '');
    return AnalyticsResponse(
      response.statusCode ?? 0,
      retryAfter: retry == null ? null : Duration(seconds: retry),
    );
  };
}

/// A random version 4 UUID, made on the phone.
String randomUuid([Random? random]) {
  final rng = random ?? Random.secure();
  final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

/// The kind of screen at [location], never its IDs: `/course/12` →
/// `course`, `/account/orders/5` → `order`, `/page/about-us` → `page`.
/// Null for a location that isn't a screen.
String? screenKindOf(String location) {
  final path = Uri.tryParse(location)?.path ?? location;
  final segments = path.split('/').where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty) return null;
  // Screens whose second part is a name or a code, not a number.
  const named = {'page', 'article', 'ticket'};
  if (named.contains(segments.first)) return segments.first;
  if (segments.length >= 2 && RegExp(r'\d').hasMatch(segments.last)) {
    if (segments.first == 'messages') return 'conversation';
    if (segments.length == 3 &&
        segments[0] == 'account' &&
        segments[1] == 'orders') {
      return 'order';
    }
  }
  final words = [
    for (final s in segments)
      if (!RegExp(r'\d').hasMatch(s)) s.replaceAll('-', '_').toLowerCase(),
  ];
  final kind = words.join('_');
  if (!RegExp(r'^[a-z][a-z0-9_]{0,39}$').hasMatch(kind)) return null;
  return kind;
}
