import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/l10n/icu.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/l10n/locales.dart';
import 'package:yallapp/core/l10n/string_overlay.dart';
import 'package:yallapp/core/l10n/string_packs.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/l10n/app_localizations_overlay.dart';

import '../../tool/gen_l10n_overlay.dart' show overlaySource;

/// 43 The owner's string packs over the app's own strings.
void main() {
  group('the message format', () {
    test('formats placeholders, plurals by the language and selects', () {
      final plural = parseIcu(
        '{count, plural, =0{none} one{{count} article} other{{count} articles}}',
      );
      expect(formatIcu(plural, {'count': 0}, 'fr'), 'none');
      expect(formatIcu(plural, {'count': 1}, 'fr'), '1 article');
      expect(formatIcu(plural, {'count': 5}, 'fr'), '5 articles');
      final few = parseIcu(
        '{count, plural, one{{count} plik} few{{count} pliki} other{{count} plików}}',
      );
      expect(formatIcu(few, {'count': 3}, 'pl'), '3 pliki');
      expect(formatIcu(few, {'count': 5}, 'pl'), '5 plików');
      final select = parseIcu('{code, select, TR{Türkiye} other{{code}}}');
      expect(formatIcu(select, {'code': 'TR'}, 'tr'), 'Türkiye');
      expect(formatIcu(select, {'code': 'ZZ'}, 'tr'), 'ZZ');
      expect(
        formatIcu(parseIcu("L'app de {name}"), {'name': 'Nil'}, 'fr'),
        "L'app de Nil",
      );
    });

    test('refuses broken messages', () {
      for (final broken in [
        '{count',
        'a } b',
        '{count, plural, =1{x}}',
        '{count, number}',
        '{}',
      ]) {
        expect(
          () => parseIcu(broken),
          throwsA(isA<IcuException>()),
          reason: broken,
        );
      }
    });
  });

  group('the fallback chain', () {
    test(
      "the owner's string, else the app's in that language, else English",
      () {
        final fr = localizationsFor('fr', {
          'tabHome': 'Accueil',
          'itemCount':
              '{count, plural, one{{count} article} other{{count} articles}}',
          'maintenanceMessage': '{name} est en maintenance.',
        });
        expect(fr, isA<OverlayLocalizations>());
        expect(fr.localeName, 'fr');
        expect(fr.tabHome, 'Accueil');
        expect(fr.itemCount(0), '0 article');
        expect(fr.itemCount(4), '4 articles');
        expect(fr.maintenanceMessage('Nil'), 'Nil est en maintenance.');
        // Not translated: English.
        expect(fr.tabCourses, 'Courses');
        expect(fr.lessonCount(2), '2 lessons');

        final ar = localizationsFor('ar', {'tabHome': 'البداية'});
        expect(ar.tabHome, 'البداية');
        // Not the owner's: the app's own Arabic.
        expect(ar.tabCourses, 'الدورات');

        // No pack: the app's own strings.
        expect(localizationsFor('tr').tabHome, 'Ana sayfa');
        expect(localizationsFor('de').tabHome, 'Home');
      },
    );

    test(
      'a string with unknown placeholders or a broken format is ignored',
      () {
        final overlay = StringOverlay({
          'itemCount': '{total} articles',
          'tabHome': 'Bonjour {name}',
          'maintenanceMessage': '{name, plural, other{x}}',
          'tabCart': '{broken',
          'tabShop': 'Boutique',
        }, locale: 'fr');
        final fr = OverlayLocalizations(
          lookupAppLocalizations(const Locale('en')),
          overlay,
          'fr',
        );
        expect(fr.itemCount(2), '2 items');
        expect(fr.tabHome, 'Home');
        expect(fr.maintenanceMessage('Nil'), contains('Nil'));
        expect(fr.tabCart, 'Cart');
        expect(fr.tabShop, 'Boutique');
        expect(overlay.rejected, {
          'itemCount',
          'tabHome',
          'maintenanceMessage',
          'tabCart',
        });
      },
    );

    test('the overlay answers every string the app has', () {
      final arb = jsonDecode(
        File('lib/l10n/app_en.arb').readAsStringSync(),
      ) as Map<String, dynamic>;
      final source = overlaySource(arb);
      final keys = arb.keys.where((k) => !k.startsWith('@'));
      for (final key in keys) {
        expect(source, contains("overlay.text('$key')").or(key), reason: key);
      }
    });
  });

  group('Config.languages.list', () {
    test('names, direction and the pack of each language', () {
      final languages = Languages.fromJson({
        'default': 'en',
        'available': ['en', 'ug', 'fr'],
        'list': [
          {
            'code': 'ug',
            'name': 'Uyghur',
            'native_name': 'ئۇيغۇرچە',
            'direction': 'rtl',
            'strings': null,
          },
          {
            'code': 'fr',
            'name': 'French',
            'native_name': 'Français',
            'direction': 'ltr',
            'strings': {'url': 'https://p.test/fr?v=1', 'version': '1'},
          },
        ],
      });
      expect(languages.list.map((l) => l.code), ['en', 'ug', 'fr']);
      expect(languages.language('ug').rtl, isTrue);
      expect(languages.language('en').nativeName, 'English');
      expect(languages.language('fr').packUrl, 'https://p.test/fr?v=1');
      expect(
        Languages.fromJson(languages.toJson()).toJson(),
        languages.toJson(),
      );
      expect(appLocales, hasLength(82));
      expect(appLocales.where((l) => l.rtl).map((l) => l.code), [
        'ar',
        'fa',
        'he',
        'ps',
        'ug',
        'ur',
      ]);
    });
  });

  group('string packs', () {
    late SharedPreferences prefs;
    late List<String> fetched;
    late Map<String, Object?> server;
    late bool offline;
    late ProviderContainer container;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      fetched = [];
      offline = false;
      server = {
        'https://p.test/fr?v=1': {
          'language': 'fr',
          'version': '1',
          'strings': {'tabHome': 'Accueil'},
        },
        'https://p.test/fr?v=2': {
          'language': 'fr',
          'version': '2',
          'strings': {'tabHome': 'Maison'},
        },
      };
      container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          packFetcherProvider.overrideWithValue((url) async {
            if (offline) throw const SocketException('offline');
            fetched.add(url);
            return server[url];
          }),
        ],
      );
      addTearDown(container.dispose);
    });

    Languages withPack(String? version) => Languages.fromJson({
      'default': 'en',
      'available': ['en', 'fr'],
      'list': [
        {
          'code': 'fr',
          'name': 'French',
          'native_name': 'Français',
          'direction': 'ltr',
          'strings': version == null
              ? null
              : {'url': 'https://p.test/fr?v=$version', 'version': version},
        },
      ],
    });

    test(
      'downloads a pack once per version and keeps it for offline',
      () async {
        final packs = container.read(stringPacksProvider.notifier);
        await packs.refresh(withPack('1'));
        expect(container.read(stringPacksProvider)['fr']!.strings, {
          'tabHome': 'Accueil',
        });
        await packs.refresh(withPack('1'));
        expect(fetched, ['https://p.test/fr?v=1']);

        // Started again, offline: the kept pack is used.
        offline = true;
        final again = ProviderContainer(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            packFetcherProvider.overrideWithValue(
              (_) async => throw const SocketException('offline'),
            ),
          ],
        );
        addTearDown(again.dispose);
        expect(again.read(stringPacksProvider)['fr']!.version, '1');
        await again.read(stringPacksProvider.notifier).refresh(withPack('2'));
        expect(
          again.read(stringPacksProvider)['fr']!.strings['tabHome'],
          'Accueil',
        );

        // Online again with a new version, then the owner removes the strings.
        offline = false;
        await packs.refresh(withPack('2'));
        expect(
          container.read(stringPacksProvider)['fr']!.strings['tabHome'],
          'Maison',
        );
        await packs.refresh(withPack(null));
        expect(container.read(stringPacksProvider), isEmpty);
        expect(
          prefs.getKeys().where((k) => k.startsWith('l10n.pack.')),
          isEmpty,
        );
      },
    );

    test('ignores a pack for another language or a broken one', () async {
      server['https://p.test/fr?v=1'] = {
        'language': 'de',
        'version': '1',
        'strings': {'tabHome': 'Startseite'},
      };
      await container.read(stringPacksProvider.notifier).refresh(withPack('1'));
      expect(container.read(stringPacksProvider), isEmpty);
    });
  });
}

extension on Matcher {
  /// Either form of the overlay's member for [key].
  Matcher or(String key) => anyOf(this, contains("overlay.format('$key'"));
}
