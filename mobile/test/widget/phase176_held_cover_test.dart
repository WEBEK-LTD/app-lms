import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

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

  Map<String, dynamic> home() {
    final project = jsonDecode(
      File('test/support/signatures/food-delivery_a.json').readAsStringSync(),
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
        'home': {...appPageJson(blocks: []), 'studio': served(home(), lang)},
      };
    await TestApp(
      api: api,
      appType: AppType.food,
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
}
