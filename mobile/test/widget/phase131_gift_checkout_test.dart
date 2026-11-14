import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/store/widgets/gift_checkout_look.dart';

import '../support/gift_checkout_sample.dart';

/// A themed app around [child], Leqaa's colours and DM Sans.
Widget themedHarness({
  required Widget child,
  bool dark = false,
  String language = 'en',
}) => MaterialApp(
  theme: buildAppTheme(
    primary: const Color(0xFF8E2445),
    secondary: const Color(0xFFC89B6D),
    brightness: dark ? Brightness.dark : Brightness.light,
    template: AppTemplate.classic,
    fontFamily: 'DM Sans',
  ),
  locale: Locale(language),
  supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  home: child,
);

/// 131.25 The gift checkout's look (`Config.screens.checkout` `gift`):
/// five steps under a stepper, the card's live preview following the
/// words, the occasion's ready messages filling them, send anonymously,
/// "When" required with the chosen day and slot in the summary, the
/// recipient's places and map pin, the fee's breakdown; light, dark and
/// right to left.
void main() {
  Future<void> open(
    WidgetTester tester, {
    bool dark = false,
    String language = 'en',
    ValueChanged<String>? onMessage,
  }) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      themedHarness(
        dark: dark,
        language: language,
        child: Scaffold(
          body: GiftCheckoutLook(
            data: giftSample(language: language),
            accent: dark ? const Color(0xFFF3A9C0) : const Color(0xFF8E2445),
            onMessage: onMessage,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final (dark, language) in [(false, 'en'), (true, 'en'), (false, 'ar')]) {
    testWidgets('the five steps, the card and the order, '
        '${dark ? 'dark' : 'light'} $language', (tester) async {
      await open(tester, dark: dark, language: language);
      expect(find.byKey(const ValueKey('gift-stepper')), findsOneWidget);
      expect(find.byKey(const ValueKey('gift-card-preview')), findsOneWidget);
      expect(
        find.text(language == 'ar' ? 'سلمى عادل' : 'Salma Adel'),
        findsWidgets,
      );
      expect(find.byKey(const ValueKey('gift-places')), findsOneWidget);
      expect(find.byKey(const ValueKey('gift-map')), findsOneWidget);
      // When: required.
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('gift-when')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.text(language == 'ar' ? 'مطلوب' : 'Required'),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('gift-pay')),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      // The chosen day and slot in the summary, the fee's parts.
      expect(find.byKey(const ValueKey('gift-arrives')), findsOneWidget);
      expect(find.textContaining('13:00–16:00'), findsWidgets);
      expect(find.byKey(const ValueKey('gift-fee')), findsOneWidget);
    });
  }

  testWidgets('a ready message fills the card; typing changes it; anonymously '
      'the card says someone who cares', (tester) async {
    final typed = <String>[];
    await open(tester, onMessage: typed.add);
    final list = find.byType(Scrollable).first;
    Future<void> top() async {
      await tester.drag(list, const Offset(0, 4000));
      await tester.pumpAndSettle();
    }

    Finder onCard(String text) => find.descendant(
      of: find.byKey(const ValueKey('gift-card-preview')),
      matching: find.textContaining(text),
    );

    final ready = find.text('Another year, another reason to celebrate you.');
    await tester.scrollUntilVisible(ready, 300, scrollable: list);
    await tester.pumpAndSettle();
    await tester.tap(ready);
    await tester.pump();
    expect(typed.last, 'Another year, another reason to celebrate you.');
    await top();
    expect(onCard('Another year'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('gift-message-field')),
      300,
      scrollable: list,
    );
    await tester.enterText(
      find.byKey(const ValueKey('gift-message-field')),
      'With love, always',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('gift-anonymous')));
    await tester.pump();
    await top();
    expect(onCard('With love, always'), findsOneWidget);
    expect(onCard('Someone who cares'), findsOneWidget);
  });
}
