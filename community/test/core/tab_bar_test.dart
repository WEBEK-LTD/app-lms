import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/theme/theme.dart';
import 'package:yallapp_community/core/widgets/floating_tab_bar.dart';
import 'package:yallapp_community/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The bar fits a 320-point phone in every language, whichever tab is
/// open, its label readable (never the no-Material warning style).
void main() {
  for (final language in ['en', 'ar', 'tr']) {
    for (final tab in ShellTab.values) {
      for (final width in [320.0, 390.0]) {
        testWidgets('$language, $tab open, ${width.toInt()} wide', (
          tester,
        ) async {
          tester.view
            ..devicePixelRatio = 2
            ..physicalSize = Size(width, 700) * 2;
          addTearDown(tester.view.reset);
          SharedPreferences.setMockInitialValues({});
          final prefs = await SharedPreferences.getInstance();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
              child: MaterialApp(
                theme: communityTheme(dark: false),
                locale: Locale(language),
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                supportedLocales: AppLocalizations.supportedLocales,
                // No Scaffold: the shell floats the bar over the page.
                home: Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 20),
                    child: FloatingTabBar(
                      current: tab,
                      onTab: (_) {},
                      onCreate: () {},
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          for (final e in find.byType(RichText).evaluate()) {
            final style = (e.widget as RichText).text.style;
            expect(style?.decorationColor, isNot(const Color(0xFFFFFF00)));
          }
        });
      }
    }
  }
}
