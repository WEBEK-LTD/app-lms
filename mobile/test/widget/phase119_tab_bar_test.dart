import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/own_icon.dart';
import 'package:yallapp/l10n/app_localizations.dart';

/// 119 The bottom bar's designs (`TabBar.design`), each in light and dark
/// mode, and its own colours in dark mode.
void main() {
  const destinations = [
    NavDestination(Icons.home_outlined, 'Home'),
    NavDestination(Icons.search, 'Search'),
    NavDestination(Icons.person_outline, 'Account'),
  ];

  Future<void> pump(
    WidgetTester tester, {
    TabBarStyle? style,
    Brightness brightness = Brightness.light,
    AppTemplate template = AppTemplate.classic,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: buildAppTheme(
          primary: const Color(0xFF1F4E79),
          brightness: brightness,
          template: template,
          fontFamily: 'Inter',
        ),
        home: Scaffold(
          bottomNavigationBar: AppNavBar(
            template: template,
            style: style,
            currentIndex: 1,
            onSelected: (_) {},
            destinations: destinations,
          ),
        ),
      ),
    );
    // The theme changes over a moment: wait for it.
    await tester.pumpAndSettle();
  }

  Color iconColour(WidgetTester tester, int index) =>
      tester.widgetList<OwnIcon>(find.byType(OwnIcon)).elementAt(index).color!;

  test('reads the design and the dark colours', () {
    final style = TabBarStyle.fromJson({
      'design': 'bubble',
      'active': '#1F4E79',
      'dark_active': '#9CC3E6',
      'dark_inactive': '#8A93A6',
    });
    expect(style.design, TabBarDesign.bubble);
    expect(style.darkActive, '#9CC3E6');
    expect(style.darkInactive, '#8A93A6');
    expect(
      TabBarStyle.fromJson({'design': 'liquid'}).design,
      isNull,
      reason: "a design this app doesn't know: the template's",
    );
  });

  for (final brightness in Brightness.values) {
    for (final design in TabBarDesign.values.where(
      (d) =>
          d != TabBarDesign.classic &&
          d != TabBarDesign.minimal &&
          d != TabBarDesign.notch,
    )) {
      testWidgets('${design.name} marks the open tab (${brightness.name})', (
        tester,
      ) async {
        await pump(
          tester,
          style: TabBarStyle(design: design),
          brightness: brightness,
        );
        expect(find.byKey(ValueKey('nav-1-${design.name}')), findsOneWidget);
        expect(find.byKey(const ValueKey('nav-0-pill')), findsNothing);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets("without a design the bar keeps the template's", (tester) async {
    await pump(tester, template: AppTemplate.bold);
    expect(find.byKey(const ValueKey('nav-1-pill')), findsOneWidget);
  });

  testWidgets('pill, bubble and dot show the names as set', (tester) async {
    await pump(tester, style: const TabBarStyle(design: TabBarDesign.dot));
    expect(find.text('Home'), findsOneWidget);
    await pump(
      tester,
      style: const TabBarStyle(
        design: TabBarDesign.dot,
        labels: TabLabels.active,
      ),
    );
    expect(find.text('Home'), findsNothing);
    expect(find.text('Search'), findsOneWidget);
    await pump(tester, style: const TabBarStyle(design: TabBarDesign.bubble));
    expect(find.text('Search'), findsOneWidget, reason: 'the open tab');
    expect(find.text('Home'), findsNothing, reason: 'the others icons only');
  });

  testWidgets('in dark mode a dark colour is lightened, its own kept', (
    tester,
  ) async {
    const navy = Color(0xFF1F4E79);
    await pump(
      tester,
      style: const TabBarStyle(design: TabBarDesign.dot, active: '#1F4E79'),
    );
    expect(iconColour(tester, 1), navy, reason: 'light: as set');
    await pump(
      tester,
      style: const TabBarStyle(design: TabBarDesign.dot, active: '#1F4E79'),
      brightness: Brightness.dark,
    );
    final lighter = iconColour(tester, 1);
    expect(lighter.computeLuminance(), greaterThan(navy.computeLuminance()));
    await pump(
      tester,
      style: const TabBarStyle(
        design: TabBarDesign.dot,
        active: '#1F4E79',
        darkActive: '#F5B700',
      ),
      brightness: Brightness.dark,
    );
    expect(iconColour(tester, 1), const Color(0xFFF5B700));
  });

  testWidgets('a light pill gets dark text on it', (tester) async {
    await pump(
      tester,
      style: const TabBarStyle(design: TabBarDesign.pill, active: '#F5B700'),
    );
    expect(iconColour(tester, 1), const Color(0xFF14121F));
  });

  testWidgets('notch: the middle tab sits in the cut, light and dark', (
    tester,
  ) async {
    for (final brightness in Brightness.values) {
      await pump(
        tester,
        style: const TabBarStyle(design: TabBarDesign.notch),
        brightness: brightness,
      );
      expect(find.byKey(const ValueKey('nav-mid-notch')), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('text: names only, no icons', (tester) async {
    await pump(tester, style: const TabBarStyle(design: TabBarDesign.text));
    expect(find.byType(OwnIcon), findsNothing);
    expect(find.text('Home'), findsOneWidget);
    expect(find.byKey(const ValueKey('nav-1-text')), findsOneWidget);
  });

  testWidgets('glass and the island float of themselves', (tester) async {
    await pump(tester, style: const TabBarStyle(design: TabBarDesign.glass));
    expect(find.byKey(const ValueKey('nav-glass')), findsOneWidget);
    expect(find.byType(BackdropFilter), findsOneWidget);
    await pump(tester, style: const TabBarStyle(design: TabBarDesign.island));
    expect(find.text('Search'), findsOneWidget, reason: 'the open tab named');
    expect(find.text('Home'), findsNothing);
  });

  test('reads the photo option', () {
    expect(TabBarStyle.fromJson({'avatar': true}).avatar, isTrue);
    expect(TabBarStyle.fromJson({}).avatar, isFalse);
  });

  testWidgets("the account tab shows the person's photo", (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: buildAppTheme(
          primary: const Color(0xFF1F4E79),
          brightness: Brightness.light,
          template: AppTemplate.classic,
          fontFamily: 'Inter',
        ),
        home: Scaffold(
          bottomNavigationBar: AppNavBar(
            template: AppTemplate.classic,
            style: const TabBarStyle(design: TabBarDesign.dot, avatar: true),
            currentIndex: 0,
            onSelected: (_) {},
            destinations: destinations,
            avatarIndex: 2,
            avatarUrl: 'https://yallapp.test/media/layla.jpg',
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byKey(const ValueKey('nav-2-avatar')), findsOneWidget);
    expect(find.byKey(const ValueKey('nav-1-avatar')), findsNothing);
  });
}
