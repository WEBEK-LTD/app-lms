import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models/config_models.dart';
import '../providers.dart';
import '../storage/local_settings.dart';

/// 43 String packs: the owner's translations of the app's own strings, one
/// per language (`Config.languages.list[].strings`). Downloaded when their
/// version changes, kept on the phone for offline use, and refreshed each
/// time the app loads its config. The app shows the owner's string, else
/// its own in that language, else English (lib/core/l10n/l10n.dart).

/// Downloads a pack's JSON (`StringPack`).
typedef PackFetcher = Future<Object?> Function(String url);

/// The pack downloader: plain GET; in the app preview with its token, so
/// the platform can serve the draft's strings.
final packFetcherProvider = Provider<PackFetcher>((ref) {
  final token = ref.watch(appEnvironmentProvider).preview?.apiToken;
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'X-Yallapp-Preview': ?token},
    ),
  );
  ref.onDispose(dio.close);
  return (url) async => (await dio.get<Object?>(url)).data;
});

/// A downloaded pack.
class StringPack {
  const StringPack(this.version, this.strings);

  final String version;
  final Map<String, String> strings;

  /// Reads `StringPack` (or the copy kept on the phone); null when invalid.
  static StringPack? tryParse(Object? json, {String? language}) {
    if (json is! Map) return null;
    final version = json['version'];
    final strings = json['strings'];
    if (version is! String || strings is! Map) return null;
    if (language != null &&
        json['language'] != null &&
        json['language'] != language) {
      return null;
    }
    return StringPack(version, {
      for (final entry in strings.entries)
        if (entry.key is String && entry.value is String)
          entry.key as String: entry.value as String,
    });
  }

  Map<String, Object> toJson() => {'version': version, 'strings': strings};
}

const _prefix = 'l10n.pack.';

/// How long the start waits for a changed pack before showing the app
/// (the pack still arrives, and the strings change then).
const packWait = Duration(seconds: 4);

/// The owner's strings per language code, as the app has them now.
final stringPacksProvider =
    NotifierProvider<StringPacks, Map<String, StringPack>>(StringPacks.new);

class StringPacks extends Notifier<Map<String, StringPack>> {
  SharedPreferences? get _prefs {
    try {
      return ref.read(sharedPreferencesProvider);
    } on Object {
      return null;
    }
  }

  @override
  Map<String, StringPack> build() {
    final prefs = _prefs;
    if (prefs == null) return const {};
    final out = <String, StringPack>{};
    for (final key in prefs.getKeys()) {
      if (!key.startsWith(_prefix)) continue;
      try {
        final pack = StringPack.tryParse(jsonDecode(prefs.getString(key)!));
        if (pack != null) out[key.substring(_prefix.length)] = pack;
      } on Object {
        // A damaged copy is fetched again.
      }
    }
    return out;
  }

  /// The strings of [code], or null.
  Map<String, String>? stringsOf(String code) => state[code]?.strings;

  /// Brings the packs in line with [languages]: drops packs the server no
  /// longer has, downloads those whose version changed. Waits at most
  /// [wait] for the downloads; offline, the packs kept stay.
  Future<void> refresh(Languages languages, {Duration wait = packWait}) async {
    final next = {...state};
    final downloads = <Future<void>>[];
    final offered = {for (final l in languages.list) l.code: l};
    for (final code in [...next.keys]) {
      final language = offered[code];
      if (language == null || language.packUrl == null) {
        next.remove(code);
        _prefs?.remove('$_prefix$code');
      }
    }
    for (final language in languages.list) {
      final url = language.packUrl;
      final version = language.packVersion;
      if (url == null || version == null) continue;
      if (next[language.code]?.version == version) continue;
      downloads.add(_download(language.code, url, version));
    }
    state = next;
    if (downloads.isEmpty) return;
    try {
      await Future.wait(downloads).timeout(wait);
    } on TimeoutException {
      // Slow network: they arrive in the background.
    }
  }

  Future<void> _download(String code, String url, String version) async {
    try {
      final pack = StringPack.tryParse(
        await ref.read(packFetcherProvider)(url),
        language: code,
      );
      if (pack == null) return;
      await _prefs?.setString('$_prefix$code', jsonEncode(pack.toJson()));
      state = {...state, code: pack};
    } on Object {
      // Offline or the server failed: the copy kept (if any) stays.
    }
  }
}
