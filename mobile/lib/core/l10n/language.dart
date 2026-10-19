import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../gate/app_gate.dart';
import '../api/models/json.dart';
import '../storage/local_settings.dart';
import 'l10n.dart';
import 'locales.dart';
import 'string_packs.dart';

/// The device's preferred languages, most preferred first. Tests override it.
final deviceLocalesProvider = Provider<List<Locale>>(
  (ref) => WidgetsBinding.instance.platformDispatcher.locales,
);

/// `Config.languages` from the last `/config`. Set by the gate before it
/// loads the pages, so they come back in the right language. Null until the
/// first `/config`.
final remoteLanguagesProvider = NotifierProvider<RemoteLanguages, Languages?>(
  RemoteLanguages.new,
);

class RemoteLanguages extends Notifier<Languages?> {
  static const _key = 'l10n.languages';

  /// 43 The languages from the last `/config` are kept, so an app in a
  /// language Yallapp doesn't ship opens in it, not in English first.
  @override
  Languages? build() {
    try {
      final saved = ref.read(sharedPreferencesProvider).getString(_key);
      if (saved == null) return null;
      return Languages.fromJson(asJson(jsonDecode(saved)));
    } on Object {
      return null;
    }
  }

  /// A server without `Config.languages` is English only.
  void update(Languages? languages) {
    final next =
        languages ?? const Languages(defaultCode: 'en', available: ['en']);
    state = next;
    try {
      ref
          .read(sharedPreferencesProvider)
          .setString(_key, jsonEncode(next.toJson()));
    } on Object {
      // No preferences (some tests): kept for this run only.
    }
  }
}

/// Picks the language: the user's choice when the client offers it, else
/// the device's language when offered, else the client's default.
///
/// Before the first `/config` ([languages] null) any language the app ships
/// may be used.
String resolveLanguage({
  required String? saved,
  required Iterable<String> device,
  required Languages? languages,
}) {
  final available = languages?.available ?? supportedLanguages;
  if (saved != null && available.contains(saved)) return saved;
  for (final code in device) {
    if (available.contains(code)) return code;
  }
  if (languages != null) return languages.defaultCode;
  return 'en';
}

/// The language in use, a `Config.languages` code. Sent as `Accept-Language`
/// on every request; content providers watch it so they reload when it
/// changes.
final appLanguageProvider = Provider<String>((ref) {
  return resolveLanguage(
    saved: ref.watch(localSettingsProvider.select((s) => s.language)),
    device: [for (final l in ref.watch(deviceLocalesProvider)) l.languageCode],
    languages: ref.watch(remoteLanguagesProvider),
  );
});

/// The languages the user can pick in Settings.
final availableLanguagesProvider = Provider<List<String>>(
  (ref) => ref.watch(remoteLanguagesProvider)?.available ?? const ['en'],
);

/// Saves the user's pick and reloads the config, the pages and the content
/// in that language.
void changeLanguage(WidgetRef ref, String code) {
  if (ref.read(appLanguageProvider) == code) return;
  ref.read(localSettingsProvider.notifier).setLanguage(code);
  ref.read(appGateProvider.notifier).load(quiet: true);
}

/// A language's name in its own language, for the picker (43 any language
/// the app can show).
String languageName(String code) => appLocaleOf(code)?.nativeName ?? code;

/// 43 The direction of the language in use: as `Config.languages.list`
/// says, else as the language is written. The whole app follows it.
final appTextDirectionProvider = Provider<TextDirection>((ref) {
  final code = ref.watch(appLanguageProvider);
  final languages = ref.watch(remoteLanguagesProvider);
  if (languages != null && languages.available.contains(code)) {
    return languages.language(code).rtl ? TextDirection.rtl : TextDirection.ltr;
  }
  return directionOf(code);
});

/// 43 The app languages as locales, for `MaterialApp.supportedLocales`:
/// the server's, else the ones the app ships, always with the one in use.
final appLocalesProvider = Provider<List<Locale>>((ref) {
  final codes = {
    ...?ref.watch(remoteLanguagesProvider)?.available,
    ...supportedLanguages,
    ref.watch(appLanguageProvider),
  };
  return [for (final code in codes) Locale(code)];
});

/// 43 The owner's strings in the language in use, or null.
final currentStringPackProvider = Provider<Map<String, String>?>((ref) {
  final code = ref.watch(appLanguageProvider);
  return ref.watch(stringPacksProvider)[code]?.strings;
});

/// 43 Every pack the app has, for the localizations delegate.
final stringPackMapsProvider = Provider<Map<String, Map<String, String>>>(
  (ref) => {
    for (final entry in ref.watch(stringPacksProvider).entries)
      entry.key: entry.value.strings,
  },
);
