import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../unit/phase97_fonts_test.dart' show FakeFonts;

/// 224.10 The faces the Studio pages name on their elements (a heading in
/// Aref Ruqaa over the look's Noto Naskh Arabic): served with the look
/// (`Appearance.page_fonts`), downloaded as the look's own fonts are, and the
/// heading drawn in its face once it is on the phone. Before, only
/// `font_family` and `arabic_font` were downloaded and the heading showed in
/// the app's font.
void main() {
  const ruqaa =
      'https://yallapp.example/api/v1/fonts/ofl/arefruqaa/ArefRuqaa-Regular.ttf';
  const ruqaaBold =
      'https://yallapp.example/api/v1/fonts/ofl/arefruqaa/ArefRuqaa-Bold.ttf';
  const lalezar =
      'https://yallapp.example/api/v1/fonts/ofl/lalezar/Lalezar-Regular.ttf';

  Map<String, dynamic> look() => {
    ...appearanceJson(),
    'page_fonts': [
      {
        'family': 'Aref Ruqaa',
        'files': [
          {'url': ruqaa, 'weight': 400},
          {'url': ruqaaBold, 'weight': 600},
        ],
      },
      {
        'family': 'Lalezar',
        'files': [
          {'url': lalezar, 'weight': 400},
        ],
      },
    ],
  };

  test('Config.appearance reads the pages\' faces and their files', () {
    final a = Appearance.fromJson(look());
    expect(a.pageFonts.map((f) => f.family), ['Aref Ruqaa', 'Lalezar']);
    expect(a.pageFonts.first.files.map((f) => f.weight), [400, 600]);
    // An older platform sends none.
    expect(Appearance.fromJson(appearanceJson()).pageFonts, isEmpty);
  });

  testWidgets(
    'the pages\' faces are downloaded and a heading shows in its own',
    (tester) async {
      final fonts = FakeFonts();
      final api =
          FakeApi(
              config: configJson(lms: null, store: true, appearance: look()),
            )
            ..navigation = navigationJson(
              tabs: [
                navTabJson('home', 'Home', 'home', {
                  'type': 'page',
                  'page_slug': 'home',
                }),
                navTabJson('shop', 'Shop', 'grid_view', {
                  'type': 'screen',
                  'screen': 'search',
                }),
              ],
            )
            ..pages = {
              'home': {
                ...appPageJson(blocks: []),
                'studio': {
                  'header': {'type': 'title', 'title': 'Ghurza'},
                  'body': {
                    'id': 'root',
                    'type': 'column',
                    'children': [
                      {
                        'id': 'heading',
                        'type': 'text',
                        'text': 'Every piece starts with a yarn',
                        'font': {
                          'family': 'Aref Ruqaa',
                          'size': 26,
                          'weight': 700,
                        },
                      },
                    ],
                  },
                },
              },
            };
      final app = TestApp(
        api: api,
        appType: AppType.store,
        signedIn: true,
        overrides: [remoteFontDepsProvider.overrideWithValue(fonts.deps)],
      );
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      expect(
        fonts.fetched.map((u) => u.toString()),
        containsAll([ruqaa, ruqaaBold, lalezar]),
      );
      expect(fonts.registered, containsPair('Aref Ruqaa', 2));
      expect(fonts.registered, containsPair('Lalezar', 1));
      // Drawn in its face: the heading's text (and any span in it) in Aref Ruqaa.
      final heading = tester.widget<RichText>(
        find.byWidgetPredicate(
          (w) =>
              w is RichText &&
              w.text.toPlainText() == 'Every piece starts with a yarn',
        ),
      );
      final families = <String?>{};
      heading.text.visitChildren((span) {
        families.add(span.style?.fontFamily);
        return true;
      });
      final family = families.whereType<String>().firstOrNull;
      expect(family, 'Aref Ruqaa');
    },
  );
}
