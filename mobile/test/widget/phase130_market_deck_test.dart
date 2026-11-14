import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/market_fixtures.dart';

/// 130 A `market` section of places drawn as a deck (`style: deck`): the
/// first place in front with its name, two more peeking behind it, "1 / 3"
/// by the title; a swipe brings the next one to the front (the other way
/// in Arabic); light, dark and right to left. Apps reading an older page
/// still parse every other style.
void main() {
  Widget app(Widget home, {String lang = 'en', bool dark = false}) =>
      ProviderScope(
        overrides: marketSampleOverrides,
        child: MaterialApp(
          theme: buildAppTheme(
            primary: const Color(0xFF134A36),
            secondary: const Color(0xFFF2A93B),
            brightness: dark ? Brightness.dark : Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Manrope',
          ),
          locale: Locale(lang),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Scaffold(body: home),
        ),
      );

  final page = StudioPage.tryParse({
    'body': {
      'id': 'root',
      'type': 'column',
      'children': [
        {
          'id': 'near',
          'type': 'market',
          'title': 'Places near you',
          'market': {
            'section': 'vendors',
            'style': 'deck',
            'sort': 'nearest',
            'limit': 3,
          },
        },
      ],
    },
  })!;

  test('reads the deck style', () {
    final node = page.body.children.single;
    expect(node.market?.style, StudioMarketStyle.deck);
  });

  for (final (lang, dark) in [('en', false), ('en', true), ('ar', false)]) {
    testWidgets('the places as a deck ($lang${dark ? ', dark' : ''})', (
      tester,
    ) async {
      tester.view
        ..physicalSize = const Size(360, 900) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        app(
          StudioPageView(page: page, pageSlug: 'home'),
          lang: lang,
          dark: dark,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
      expect(find.byKey(const ValueKey('market-deck')), findsOneWidget);
      expect(find.text('Places near you'), findsOneWidget);
      final count = tester.widget<Text>(
        find.byKey(const ValueKey('market-deck-count')),
      );
      expect(count.data, '1 / 3');
      // A swipe toward the start brings the next place to the front.
      await tester.fling(
        find.byKey(const ValueKey('market-deck')),
        Offset(lang == 'ar' ? 300 : -300, 0),
        1000,
      );
      await tester.pump(const Duration(milliseconds: 400));
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('market-deck-count')))
            .data,
        '2 / 3',
      );
    });
  }
}
