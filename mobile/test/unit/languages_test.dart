import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/l10n/language.dart';

Map<String, dynamic> arb(String code) =>
    jsonDecode(File('lib/l10n/app_$code.arb').readAsStringSync())
        as Map<String, dynamic>;

void main() {
  test('every English string has an Arabic and a Turkish translation', () {
    final english = arb('en').keys.where((k) => !k.startsWith('@')).toSet();
    for (final code in ['ar', 'tr']) {
      final translated = arb(code).keys.where((k) => !k.startsWith('@'));
      expect(
        english.difference(translated.toSet()),
        isEmpty,
        reason: 'missing in $code',
      );
      for (final key in english) {
        expect(
          (arb(code)[key] as String).trim(),
          isNotEmpty,
          reason: '$code $key',
        );
      }
    }
  });

  test('plurals and placeholders format in every language', () {
    for (final code in supportedLanguages) {
      final l10n = lookupAppLocalizations(Locale(code));
      for (final n in [0, 1, 2, 3, 11, 100]) {
        expect(l10n.lessonCount(n), isNotEmpty);
        expect(l10n.bedroomsCount(n), isNotEmpty);
      }
      expect(l10n.maintenanceMessage('Nile Homes'), contains('Nile Homes'));
      expect(l10n.countryName('TR'), isNotEmpty);
      expect(l10n.countryName('ZZ'), 'ZZ');
    }
    final en = lookupAppLocalizations(const Locale('en'));
    expect(en.lessonCount(1), '1 lesson');
    expect(en.lessonCount(12), '12 lessons');
    expect(en.countryName('EG'), 'Egypt');
  });

  test('language names are in their own language', () {
    expect(languageName('en'), 'English');
    expect(languageName('ar'), 'العربية');
    expect(languageName('tr'), 'Türkçe');
  });

  group('resolveLanguage', () {
    const offered = Languages(defaultCode: 'en', available: ['en', 'ar']);

    test('the saved choice wins when offered', () {
      expect(
        resolveLanguage(saved: 'ar', device: ['en'], languages: offered),
        'ar',
      );
    });

    test('then the device language, then the default', () {
      expect(
        resolveLanguage(saved: null, device: ['de', 'ar'], languages: offered),
        'ar',
      );
      expect(
        resolveLanguage(saved: 'tr', device: ['de'], languages: offered),
        'en',
      );
    });

    test('before /config any shipped language may be used', () {
      expect(
        resolveLanguage(saved: null, device: ['tr'], languages: null),
        'tr',
      );
      expect(
        resolveLanguage(saved: null, device: ['de'], languages: null),
        'en',
      );
    });

    // 43 Any language the app's system widgets come in; others are dropped.
    test('Config.languages keeps any language the app can show', () {
      final languages = Languages.fromJson({
        'default': 'xx',
        'available': ['fr', 'xx', 'tr', 'en'],
      });
      expect(languages.available, ['fr', 'tr', 'en']);
      expect(languages.defaultCode, 'fr');
      expect(languages.list.map((l) => l.nativeName), [
        'Français',
        'Türkçe',
        'English',
      ]);
    });
  });
}
