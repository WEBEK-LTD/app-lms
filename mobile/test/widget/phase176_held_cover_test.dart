import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import 'package:yallapp/modules/shared/pages/premium/premium_bento.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 176.7 Sofra's home (its Signature look A, the food demo's): the hero is a
/// slider of a set height, each slide a cover with tonight's dish set huge
/// over it. In Arabic at a text size of 1.3 (a Samsung's font) the dish's
/// two lines took far more than the slide has, and the cover's words ran
/// 260 points past its foot on a 360-point phone. What lies on a cover a
/// fixed height holds is drawn smaller to fit now, never larger; as designed
/// when it fits. Drawn by the app's own renderer from the template's home as
/// the platform makes it (test/support/signatures/food-delivery_a.json).
void main() {
  setUpAll(loadAppFonts);

  /// The page as the platform serves it in [lang]: each text in its translation.
  Object? served(Object? value, String lang) {
    if (value is List) return [for (final v in value) served(v, lang)];
    if (value is! Map) return value;
    final out = {
      for (final e in value.entries)
        if (e.key != 'translations') e.key as String: served(e.value, lang),
    };
    final own = (value['translations'] as Map?)?[lang] as Map?;
    if (own != null) out.addAll(own.cast<String, dynamic>());
    return out;
  }

  Map<String, dynamic> home([String file = 'food-delivery_a']) {
    final project = jsonDecode(
      File('test/support/signatures/$file.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final pages = (project['layout'] as Map)['pages'] as List;
    final page = pages.firstWhere((p) => (p as Map)['slug'] == 'home') as Map;
    return jsonDecode(jsonEncode(page['studio'])) as Map<String, dynamic>;
  }

  Future<List<String>> draw(
    WidgetTester tester, {
    required double width,
    required double scale,
    required String lang,
    String file = 'food-delivery_a',
    Map<String, dynamic>? studio,
    AppType type = AppType.food,
  }) async {
    final view = tester.view
      ..physicalSize = Size(width, 800) * 3
      ..devicePixelRatio = 3;
    addTearDown(view.reset);
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final problems = <String>[];
    final shown = FlutterError.onError;
    FlutterError.onError = (details) {
      final creator =
          details.informationCollector?.call().map((d) => '$d').join(' ') ?? '';
      final where = RegExp(r'studio-node-[\w-]+')
          .allMatches(creator)
          .map((m) => m.group(0))
          .take(2)
          .join(' < ');
      problems.add('${details.exceptionAsString().split('\n').first} $where');
    };
    addTearDown(() => FlutterError.onError = shown);
    final api = FakeApi(config: configJson(languages: languagesJson()))
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('account', 'Account', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      )
      ..pages = {
        'home': {
          ...appPageJson(blocks: []),
          'studio': studio ?? served(home(file), lang),
        },
      };
    await TestApp(
      api: api,
      appType: type,
      signedIn: true,
      preferences: {'settings.language': lang},
    ).pump(tester);
    await TestApp.settle(tester, 20);
    FlutterError.onError = shown;
    return problems;
  }

  for (final width in [360.0, 412.0]) {
    testWidgets(
      'in Arabic at 1.3 on a $width-point phone: the hero fits its slide',
      (tester) async {
        final problems = await draw(
          tester,
          width: width,
          scale: 1.3,
          lang: 'ar',
        );
        expect(problems.where((p) => p.contains('overflowed')), isEmpty);
        // The dish is still there, on the open slide.
        expect(find.textContaining('مشويات'), findsWidgets);
      },
    );
  }

  testWidgets('in English at 1.0: as designed, the dish at its own size', (
    tester,
  ) async {
    final problems = await draw(tester, width: 390, scale: 1, lang: 'en');
    expect(problems, isEmpty);
    final dish = find.textContaining('Mixed').first;
    // 60 points, as the board has it: not drawn smaller when it fits.
    expect(tester.getSize(dish).height, greaterThan(100));
  });

  // 176.10 Sofra B's bento: the Egyptian table's frosted caption at the foot
  // of its 92-point tile, drawn smaller rather than run past its top.
  testWidgets(
    'Sofra B in Arabic at 1.3: the bento\'s captions stay in their tiles',
    (tester) async {
      final problems = await draw(
        tester,
        width: 360,
        scale: 1.3,
        lang: 'ar',
        file: 'food-delivery_b',
      );
      expect(problems.where((p) => p.contains('overflowed')), isEmpty);
      // Every caption's words inside their tile: no box above the tile's top.
      final bento = find.byType(PremiumBento);
      expect(bento, findsWidgets);
      final tiles = find.descendant(
        of: bento,
        matching: find.byType(ClipRRect),
      );
      expect(tiles, findsWidgets);
      for (final tile in tiles.evaluate()) {
        final outer = tile.renderObject! as RenderBox;
        final top = outer.localToGlobal(Offset.zero).dy;
        final words = find.descendant(
          of: find.byWidget(tile.widget),
          matching: find.byType(Padding),
        );
        for (final padding in words.evaluate()) {
          final box = padding.renderObject! as RenderBox;
          expect(
            box.localToGlobal(Offset.zero).dy,
            greaterThanOrEqualTo(top - 0.01),
          );
        }
      }
    },
  );

  // 176.10 Sahm's express look: a cover with a card hanging over its foot
  // keeps its height; at 1.3 its headline and line ran past it.
  testWidgets(
    'a cover with a hanging card at 1.3: its words fit above the card',
    (tester) async {
      Map<String, dynamic> text(String id, String words, double size) => {
        'id': id,
        'type': 'text',
        'text': words,
        'color': '#FFFFFF',
        'font': {'size': size, 'weight': 800},
      };
      final cover = {
        'id': 'c1',
        'type': 'photo_hero',
        'height': 230,
        'overlap': 60,
        'background': '#0D1B2A',
        'align': 'start',
        'padding': {'top': 24, 'end': 16, 'bottom': 70, 'start': 16},
        'children': [
          text('c2', 'عبر القاهرة، في اليوم نفسه', 28),
          text('c3', 'نستلم من بابك ونسلّم إلى بابهم. تابعها طوال الطريق.', 14),
          text('c4', 'خدمة سريعة ومستندات في أي مكان', 14),
          {
            'id': 'c5',
            'type': 'column',
            'height': 120,
            'background': '#FFFFFF',
            'children': [text('c6', 'من شارعك', 14)],
          },
        ],
      };
      final problems = await draw(
        tester,
        width: 360,
        scale: 1.3,
        lang: 'ar',
        type: AppType.delivery,
        studio: {
          'body': {
            'id': 'c0',
            'type': 'column',
            'children': [cover],
          },
        },
      );
      expect(problems.where((p) => p.contains('overflowed')), isEmpty);
      expect(find.textContaining('عبر القاهرة'), findsOneWidget);
    },
  );
}
