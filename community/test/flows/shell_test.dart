import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/routing/feature_routes.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('Home: the header, the featured card, rings and posts', (
    tester,
  ) async {
    await TestApp.start(tester);
    for (final k in [
      'header-menu',
      'header-search',
      'header-messages',
      'header-notifications',
      'header-profile',
      'home-featured',
      'story-live',
      'tab-home',
      'tab-qa',
      'tab-create',
      'tab-learn',
      'tab-groups',
    ]) {
      expect(key(k), findsOneWidget, reason: k);
    }
    expect(tester.widget<Text>(key('home-name')).data, contains('Mohamed'));
  });

  testWidgets('the tab bar goes to Q&A and Learn; Groups is coming soon', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'tab-qa');
    expect(app.path, FeatureLinks.qa);
    await tap(tester, 'tab-learn');
    expect(app.path, FeatureLinks.learn);
    await tap(tester, 'tab-groups');
    expect(key('coming-soon'), findsOneWidget);
    expect(app.path, FeatureLinks.learn);
  });

  testWidgets('the + sheet: Ask a question, the rest coming soon', (
    tester,
  ) async {
    await TestApp.start(tester);
    await tap(tester, 'tab-create');
    expect(key('create-sheet'), findsOneWidget);
    await tap(tester, 'create-showcase');
    expect(key('coming-soon'), findsOneWidget);
  });

  testWidgets('the side menu: sections, coming soon, settings, log out', (
    tester,
  ) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    await tap(tester, 'header-menu');
    expect(key('side-menu'), findsOneWidget);
    for (final s in [
      'home',
      'qa',
      'tutorials',
      'academy',
      'showcase',
      'challenges',
      'groups',
      'friends',
      'pros',
      'events',
    ]) {
      expect(key('menu-$s'), findsOneWidget, reason: s);
    }
    // A later phase's section: "Coming soon", no dead tap.
    await tap(tester, 'menu-academy');
    expect(key('coming-soon'), findsOneWidget);
    await tester.tapAt(const Offset(20, 20));
    await TestApp.settle(tester);

    await tap(tester, 'header-menu');
    await tap(tester, 'menu-settings');
    expect(find.byKey(const ValueKey('settings-logout')), findsOneWidget);

    app.go(Paths.home);
    await TestApp.settle(tester);
    await tap(tester, 'header-menu');
    await tap(tester, 'menu-logout');
    if (key('logout-confirm').evaluate().isNotEmpty) {
      await tap(tester, 'logout-confirm');
    }
    expect(api.calls, contains('signout'));
    expect(app.path, Paths.welcome);
  });

  testWidgets('dark mode draws the night palette', (tester) async {
    await TestApp.start(tester, theme: ThemeMode.dark);
    final context = tester.element(key('header-menu'));
    expect(Theme.of(context).brightness, Brightness.dark);
  });

  testWidgets('the menu\'s Q&A shows the new questions, hidden at 0', (
    tester,
  ) async {
    await TestApp.start(tester);
    await tap(tester, 'header-menu');
    expect(key('menu-qa-count'), findsNothing);
  });

  testWidgets('the menu\'s Q&A count, and the tab bar\'s dot', (tester) async {
    await TestApp.start(
      tester,
      overrides: [newQuestionsProvider.overrideWithValue(12)],
    );
    expect(key('tab-dot'), findsOneWidget);
    await tap(tester, 'header-menu');
    expect(
      find.descendant(of: key('menu-qa-count'), matching: find.text('12')),
      findsOneWidget,
    );
  });
}
