import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/l10n/string_packs.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/shared/account/settings_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 43 Any language the owner adds: the app shows the owner's string pack
/// over its own strings (English for a language Yallapp doesn't ship), the
/// system widgets in that language, and turns around for a right-to-left one.

Map<String, dynamic> language(
  String code,
  String name,
  String nativeName, {
  bool rtl = false,
  String? pack,
}) => {
  'code': code,
  'name': name,
  'native_name': nativeName,
  'direction': rtl ? 'rtl' : 'ltr',
  'strings': pack == null
      ? null
      : {'url': 'https://yallapp.test/packs/$code?v=$pack', 'version': pack},
};

FakeApi addedLanguagesApi() => FakeApi(
  config: configJson(
    languages: {
      'default': 'en',
      'available': ['en', 'fr', 'ug'],
      'list': [
        language('en', 'English', 'English'),
        language('fr', 'French', 'Français', pack: '1'),
        language('ug', 'Uyghur', 'ئۇيغۇرچە', rtl: true, pack: '1'),
      ],
    },
  ),
);

final packs = <String, Object?>{
  'https://yallapp.test/packs/fr?v=1': {
    'language': 'fr',
    'version': '1',
    'strings': {
      'searchForCourse': 'Chercher un cours',
      'settings': 'Réglages',
      'tabHome': 'Accueil',
      // Not a placeholder of this string: ignored, the English shows.
      'tabCourses': 'Cours {count}',
    },
  },
  'https://yallapp.test/packs/ug?v=1': {
    'language': 'ug',
    'version': '1',
    'strings': {'settings': 'تەڭشەكلەر'},
  },
};

TestApp appIn(String? code, List<String> fetched) => TestApp(
  signedIn: true,
  api: addedLanguagesApi(),
  preferences: {'settings.language': ?code},
  overrides: [
    packFetcherProvider.overrideWithValue((url) async {
      fetched.add(url);
      return packs[url];
    }),
  ],
);

void main() {
  testWidgets("an added language shows the owner's strings over English", (
    tester,
  ) async {
    final fetched = <String>[];
    final app = appIn('fr', fetched);
    await app.pump(tester);
    expect(app.container.read(appLanguageProvider), 'fr');
    expect(find.text('Chercher un cours'), findsOneWidget);
    // Not translated by the owner: English, never an empty label.
    expect(find.text('Courses'), findsWidgets);
    expect(find.text('Cours {count}'), findsNothing);
    // The system widgets come in the language too.
    final context = tester.element(find.byType(Scaffold).first);
    expect(MaterialLocalizations.of(context).backButtonTooltip, 'Retour');
    expect(Directionality.of(context), TextDirection.ltr);
    expect(fetched, contains('https://yallapp.test/packs/fr?v=1'));

    final router = app.container.read(appRouterProvider);
    router.push('/account/settings');
    await TestApp.settle(tester);
    expect(find.text('Réglages'), findsOneWidget);
    // The picker lists the app's languages in their own names.
    await tester.tap(find.byKey(const ValueKey('language-tile')));
    await TestApp.settle(tester);
    expect(find.text('English'), findsWidgets);
    expect(find.text('ئۇيغۇرچە'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a right-to-left language the owner added turns the app around', (
    tester,
  ) async {
    final app = appIn('ug', []);
    await app.pump(tester);
    expect(tester.takeException(), isNull);
    // Flutter's own widgets write Uyghur left to right; the config says rtl.
    expect(
      Directionality.of(tester.element(find.byType(Scaffold).first)),
      TextDirection.rtl,
    );
    app.container.read(appRouterProvider).push('/account/settings');
    await TestApp.settle(tester);
    expect(
      Directionality.of(tester.element(find.byType(SettingsScreen))),
      TextDirection.rtl,
    );
    expect(find.text('تەڭشەكلەر'), findsOneWidget);
  });

  testWidgets('every language pack is downloaded once and kept on the phone', (
    tester,
  ) async {
    final fetched = <String>[];
    final app = appIn('fr', fetched);
    await app.pump(tester);
    expect(app.container.read(stringPacksProvider).keys, ['fr', 'ug']);
    expect(fetched, hasLength(2));
    final prefs = app.container.read(sharedPreferencesProvider);
    expect(prefs.getString('l10n.pack.fr'), contains('Chercher un cours'));
    // The config again (a language change reloads it): same versions, no download.
    await app.container.read(appGateProvider.notifier).load(quiet: true);
    await TestApp.settle(tester);
    expect(fetched, hasLength(2));
  });
}
