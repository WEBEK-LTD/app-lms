import 'dart:async';
import 'dart:convert';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models/models.dart';
import 'crash_isolate_stub.dart'
    if (dart.library.isolate) 'crash_isolate_io.dart';

/// 46 Crash reports (docs/api/openapi.yaml, tag Crash reports): uncaught
/// errors in the app's code, sent to Yallapp (`POST /crashes`, the build
/// config's `crash_report_url`) without anything personal, grouped there by
/// [crashFingerprint]. Native crashes (Android, iOS) aren't caught here.

/// Values that never belong in a report: the same rules as the platform's.
final _scrubbers = <(RegExp, String Function(Match))>[
  (
    RegExp(
      r'''\b(https?|wss?)://(?:[^\s/@]+@)?([^\s/?#"'<>]+)([^\s?#"'<>]*)(?:\?[^\s#"'<>]*)?(?:#[^\s"'<>]*)?''',
      caseSensitive: false,
    ),
    (m) => '${m[1]}://${m[2]}${m[3]}',
  ),
  (
    RegExp(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?'),
    (_) => '<token>',
  ),
  (
    RegExp(r'\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+', caseSensitive: false),
    (m) => '${m[1]} <token>',
  ),
  (
    RegExp(
      r'''\b(token|code|password|secret|key|signature|sig|otp|pin)(["']?\s*[:=]\s*["']?)[^\s"',;&)}\]]+''',
      caseSensitive: false,
    ),
    (m) => '${m[1]}${m[2]}<redacted>',
  ),
  (RegExp(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'), (_) => '<email>'),
  (RegExp(r'\+?\d(?:[\s-]?\d){6,}'), (_) => '<number>'),
  (RegExp(r'\b[A-Fa-f0-9]{24,}\b'), (_) => '<hex>'),
  (RegExp(r'\b[A-Za-z0-9+/_-]{32,}={0,2}'), (_) => '<redacted>'),
];

/// Removes what could identify a person or open an account.
String scrubCrashText(String text) {
  var out = text.replaceAll(RegExp(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'), '');
  for (final (pattern, replace) in _scrubbers) {
    out = out.replaceAllMapped(pattern, replace);
  }
  return out;
}

/// The stack's first 40 frames, scrubbed, at most 8000 characters.
String trimStack(String stack) {
  final lines = scrubCrashText(stack)
      .split('\n')
      .map((l) => l.trimRight())
      .where((l) => l.trim().isNotEmpty)
      .take(40)
      .join('\n');
  return lines.length > 8000 ? lines.substring(0, 8000) : lines;
}

/// The frames in the app's own code, without line and column numbers, so
/// the same bug in a new version keeps its fingerprint.
List<String> appFrames(String stack) {
  final frame = RegExp(r'(\S+)\s+\(?(package:yallapp/[^:)\s]+)');
  return [
    for (final line in stack.split('\n'))
      if (frame.firstMatch(line) case final m?) '${m[1]} ${m[2]}',
  ];
}

/// Groups reports: the error's type and its first five frames in the app's
/// code (or the first five frames when none is the app's), as 32 hex
/// characters (two FNV-1a 64 hashes).
String crashFingerprint(String errorType, String stack) {
  final ours = appFrames(stack);
  final frames = ours.isNotEmpty
      ? ours.take(5)
      : stack
            .split('\n')
            .map((l) => l.replaceAll(RegExp(r':\d+(:\d+)?\)?$'), '').trim())
            .where((l) => l.isNotEmpty)
            .take(5);
  final text = '$errorType\n${frames.join('\n')}';
  return _fnv(text, 0xcbf29ce4, 0x84222325) +
      _fnv(text, 0x84222325, 0xcbf29ce4);
}

String _fnv(String text, int seedHigh, int seedLow) {
  // 64-bit FNV-1a in two 32-bit halves, so it computes the same on the web.
  var hi = seedHigh;
  var lo = seedLow;
  for (final unit in utf8.encode(text)) {
    lo ^= unit;
    // Multiply by the FNV prime 0x100000001b3 = 2^40 + 0x1b3.
    final loMul = lo * 0x1b3;
    final carry = loMul ~/ 0x100000000;
    final newLo = loMul & 0xffffffff;
    final newHi = (hi * 0x1b3 + carry + ((lo << 8) & 0xffffffff)) & 0xffffffff;
    hi = newHi;
    lo = newLo;
  }
  return hi.toRadixString(16).padLeft(8, '0') +
      lo.toRadixString(16).padLeft(8, '0');
}

/// A route's pattern only: numbers and ids become `:id`, never a query.
String? screenPattern(String? screen) {
  if (screen == null || screen.isEmpty) return null;
  final path = screen.split(RegExp(r'[?#]')).first;
  final parts = [
    for (final part in path.split('/'))
      RegExp(r'^\d+$').hasMatch(part) ||
              RegExp(r'^[A-Za-z0-9_-]{16,}$').hasMatch(part) ||
              part.contains('%')
          ? ':id'
          : part,
  ];
  final out = parts.join('/');
  return out.length > 80 ? out.substring(0, 80) : out;
}

/// One report, as `CrashReport` in the contract.
@immutable
class CrashReport {
  const CrashReport({
    required this.fingerprint,
    required this.fatal,
    required this.error,
    required this.stack,
    required this.appVersion,
    required this.buildNumber,
    required this.platform,
    required this.at,
    this.library,
    this.osVersion,
    this.device,
    this.screen,
  });

  /// Builds a scrubbed report of [error].
  factory CrashReport.of(
    Object error,
    StackTrace? stack, {
    required bool fatal,
    required String appVersion,
    required int buildNumber,
    required DevicePlatform platform,
    required DateTime at,
    String? library,
    String? osVersion,
    String? device,
    String? screen,
  }) {
    final trace = stack?.toString() ?? '';
    var message = scrubCrashText('${error.runtimeType}: $error'.trim());
    if (message.length > 300) message = message.substring(0, 300);
    return CrashReport(
      fingerprint: crashFingerprint('${error.runtimeType}', trace),
      fatal: fatal,
      error: message,
      stack: trimStack(trace),
      library: library == null
          ? null
          : scrubCrashText(
              library.length > 60 ? library.substring(0, 60) : library,
            ),
      appVersion: appVersion,
      buildNumber: buildNumber,
      platform: platform,
      osVersion: osVersion,
      device: device,
      screen: screenPattern(screen),
      at: at.toUtc(),
    );
  }

  factory CrashReport.fromJson(Map<String, dynamic> json) => CrashReport(
    fingerprint: json['fingerprint'] as String,
    fatal: json['fatal'] == true,
    error: json['error'] as String,
    stack: json['stack'] as String,
    library: json['library'] as String?,
    appVersion: json['app_version'] as String,
    buildNumber: json['build_number'] as int,
    platform: json['platform'] == 'ios'
        ? DevicePlatform.ios
        : DevicePlatform.android,
    osVersion: json['os_version'] as String?,
    device: json['device'] as String?,
    screen: json['screen'] as String?,
    at: DateTime.parse(json['at'] as String),
  );

  final String fingerprint;
  final bool fatal;
  final String error;
  final String stack;
  final String? library;
  final String appVersion;
  final int buildNumber;
  final DevicePlatform platform;
  final String? osVersion;

  /// `phone` or `tablet`: never the model or the phone's name.
  final String? device;
  final String? screen;
  final DateTime at;

  Map<String, dynamic> toJson() => {
    'fingerprint': fingerprint,
    'fatal': fatal,
    'error': error,
    'stack': stack,
    'library': library,
    'app_version': appVersion,
    'build_number': buildNumber,
    'platform': platform == DevicePlatform.ios ? 'ios' : 'android',
    'os_version': osVersion,
    'device': device,
    'screen': screen,
    'at': at.toIso8601String(),
  };
}

/// Sends a batch; returns the HTTP status (0 when it couldn't be sent).
typedef CrashPoster = Future<int> Function(
  String url,
  Map<String, dynamic> body,
);

Future<int> _dioPost(String url, Map<String, dynamic> body) async {
  try {
    final response = await Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        validateStatus: (_) => true,
      ),
    ).post<void>(url, data: body);
    return response.statusCode ?? 0;
  } on Object {
    return 0;
  }
}

/// Catches uncaught errors and sends them, at most once per run each, with
/// the runs counted since the last batch (for the crash-free share).
class CrashReporter {
  CrashReporter({
    required SharedPreferences preferences,
    required this.endpoint,
    required this.platform,
    required this.appVersion,
    required this.buildNumber,
    this.osVersion,
    this.device,
    CrashPoster? post,
    DateTime Function()? clock,
  }) : _prefs = preferences,
       _post = post ?? _dioPost,
       _clock = clock ?? DateTime.now;

  /// The reporter catching errors in this run, for the zone's handler.
  static CrashReporter? current;

  final SharedPreferences _prefs;

  /// Null in builds without crash reports (development, the preview).
  final String? endpoint;
  final DevicePlatform platform;
  final String appVersion;
  final int buildNumber;
  final String? osVersion;
  final String? device;
  final CrashPoster _post;
  final DateTime Function() _clock;

  /// Whether reports may go out now: the owner's switch and the user's.
  /// Until it says yes, they wait on the phone.
  bool Function() allowed = () => false;

  /// The route's pattern on screen (`/course/:id`), set by the app.
  String? Function()? screen;

  final _sentThisRun = <String>{};
  bool _crashedThisRun = false;
  Timer? _timer;
  bool _sending = false;

  static const maxQueued = 10;
  static const _queueKey = 'crash.queue';
  static const _sessionsKey = 'crash.sessions';
  static const _crashedKey = 'crash.crashed';

  /// Hooks into Flutter's and Dart's error handlers. Flutter still shows its
  /// errors as before.
  void install() {
    current = this;
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      if (previous != null) {
        previous(details);
      } else {
        FlutterError.presentError(details);
      }
      // Silent errors are expected ones (an image that didn't load).
      if (details.silent) return;
      record(
        details.exception,
        details.stack,
        library: details.library,
        fatal: false,
      );
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      record(error, stack, fatal: true);
      return true;
    };
    listenToIsolateErrors((error, stack) => record(error, stack, fatal: true));
  }

  /// One app run more, for the crash-free share.
  void startSession() {
    _prefs.setInt(_sessionsKey, (_prefs.getInt(_sessionsKey) ?? 0) + 1);
  }

  /// The reports waiting to be sent.
  List<CrashReport> get queued {
    try {
      final list = jsonDecode(_prefs.getString(_queueKey) ?? '[]') as List;
      return [
        for (final item in list)
          CrashReport.fromJson((item as Map).cast<String, dynamic>()),
      ];
    } on Object {
      return const [];
    }
  }

  /// Keeps a report of [error] (each fingerprint once per run) and sends
  /// what is waiting shortly after.
  void record(
    Object error,
    StackTrace? stack, {
    required bool fatal,
    String? library,
  }) {
    try {
      final report = CrashReport.of(
        error,
        stack,
        fatal: fatal,
        library: library,
        appVersion: appVersion,
        buildNumber: buildNumber,
        platform: platform,
        osVersion: osVersion,
        device: device,
        screen: screen?.call(),
        at: _clock(),
      );
      if (!_sentThisRun.add(report.fingerprint)) return;
      if (!_crashedThisRun) {
        _crashedThisRun = true;
        _prefs.setInt(_crashedKey, (_prefs.getInt(_crashedKey) ?? 0) + 1);
      }
      final list = [...queued, report];
      _prefs.setString(
        _queueKey,
        jsonEncode([
          for (final r in list.skip(
            list.length > maxQueued ? list.length - maxQueued : 0,
          ))
            r.toJson(),
        ]),
      );
      _timer?.cancel();
      _timer = Timer(const Duration(seconds: 2), () => unawaited(flush()));
    } on Object {
      // Reporting must never be the next crash.
    }
  }

  /// Sends what is waiting, with the runs counted, when allowed. Kept for
  /// later when it couldn't be sent; dropped when Yallapp took it (204) or
  /// refused it for good (400).
  Future<void> flush() async {
    final url = endpoint;
    if (url == null || _sending || !allowed()) return;
    final reports = queued;
    final sessions = _prefs.getInt(_sessionsKey) ?? 0;
    final crashed = _prefs.getInt(_crashedKey) ?? 0;
    if (reports.isEmpty && sessions == 0) return;
    _sending = true;
    try {
      final status = await _post(url, {
        'reports': [for (final r in reports) r.toJson()],
        'sessions': sessions.clamp(0, 10000),
        'crashed_sessions': crashed.clamp(0, sessions.clamp(0, 10000)),
      });
      if (status == 204 || status == 400 || status == 404) {
        // Reports recorded while this was on its way stay for the next batch.
        final sent = {for (final r in reports) r.fingerprint};
        final left = [
          for (final r in queued)
            if (!sent.contains(r.fingerprint)) r.toJson(),
        ];
        await _prefs.setString(_queueKey, jsonEncode(left));
        await _prefs.setInt(
          _sessionsKey,
          ((_prefs.getInt(_sessionsKey) ?? 0) - sessions).clamp(0, 1 << 30),
        );
        await _prefs.setInt(
          _crashedKey,
          ((_prefs.getInt(_crashedKey) ?? 0) - crashed).clamp(0, 1 << 30),
        );
      }
    } finally {
      _sending = false;
    }
  }

  /// The system's version and the kind of device, read once at start-up.
  static Future<({String? os, String? device})> deviceFacts(
    DevicePlatform platform,
    double shortestSide,
  ) async {
    String? os;
    try {
      final plugin = DeviceInfoPlugin();
      os = platform == DevicePlatform.ios
          ? (await plugin.iosInfo).systemVersion
          : (await plugin.androidInfo).version.release;
    } on Object {
      os = null;
    }
    if (os != null && os.length > 40) os = os.substring(0, 40);
    return (os: os, device: shortestSide >= 600 ? 'tablet' : 'phone');
  }
}

/// The app's reporter (overridden at start-up); null in the preview and in
/// builds without crash reports.
final crashReporterProvider = Provider<CrashReporter?>((ref) => null);
