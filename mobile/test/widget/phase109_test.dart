import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/chat/chat_routes.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 109 More than five tabs: the first four and a More tab with the rest;
/// and the bar's own look.

Map<String, dynamic> page(String slug) => {'type': 'page', 'page_slug': slug};
Map<String, dynamic> screen(String name) => {'type': 'screen', 'screen': name};

Map<String, dynamic> moreNavigation({Map<String, dynamic>? tabBar}) => {
  ...navigationJson(
    tabs: [
      navTabJson('t1', 'Discover', 'explore', page('home')),
      navTabJson('t2', 'Catalog', 'menu_book', screen('courses')),
      navTabJson('t3', 'Mine', 'play_circle', screen('my_courses')),
      navTabJson('t4', 'Alerts', 'notifications', screen('notifications')),
      navTabJson('more', 'More', 'apps', {'type': 'more'}),
    ],
  ),
  'more': [
    navTabJson('t5', 'About us', 'info', page('about')),
    navTabJson('t6', 'Me', 'person', screen('account')),
  ],
  'tab_bar': ?tabBar,
};

Finder navTab(String label) => find.descendant(
  of: find.bySemanticsLabel(RegExp('Main navigation')),
  matching: find.text(label),
);

void main() {
  test('reads the More list and the bar\'s look, leaving out what it '
      'doesn\'t know', () {
    final nav = Navigation.fromJson(
      moreNavigation(
        tabBar: {
          'background': '#0E0D24',
          'active': '#FF5A1F',
          'inactive': 'grey',
          'radius': 99,
          'margin': 12,
          'labels': 'active',
          'center': 't3',
          'font': 'Cairo',
        },
      ),
    );
    expect(nav.tabs.map((t) => t.id), ['t1', 't2', 't3', 't4', 'more']);
    expect(nav.tabs.last.target.type, PageActionType.more);
    expect(nav.more.map((t) => t.label), ['About us', 'Me']);
    final bar = nav.tabBar!;
    expect(bar.background, '#0E0D24');
    expect(bar.active, '#FF5A1F');
    expect(bar.inactive, isNull);
    expect(bar.radius, 32);
    expect(bar.margin, 12);
    expect(bar.labels, TabLabels.active);
    expect(bar.center, 't3');
    expect(bar.font, 'Cairo');
    expect(Navigation.fromJson(navigationJson()).tabBar, isNull);
  });

  group('tabs the app adds with a More tab', () {
    ShellTab tab(String path) =>
        ShellTab(location: path, label: (_) => path, icon: Icons.circle);
    final more =
        ShellTab(
          icon: Icons.more_horiz,
          label: (_) => 'More',
          action: PageAction.tryParse({'type': 'more'}),
        ).withMore([
          ShellTab(
            icon: Icons.info,
            label: (_) => 'About',
            pushLocation: '/page/about',
          ),
        ]);
    final full = [tab('/a'), tab('/b'), tab('/c'), tab('/d'), more];

    test('a role\'s tab goes before More and the tab it pushes out goes '
        'first in its list', () {
      final tabs = withCourierTab(full, true);
      expect(tabs.map((t) => t.path), ['/a', '/b', '/c', Paths.courier, null]);
      expect(tabs.last.isMore, isTrue);
      expect(tabs.last.more.map((t) => t.path), ['/d', null]);
    });

    test('Chat goes first in the More list when the bar is full', () {
      final chat = AppConfig.fromJson({
        ...configJson(),
        'chat': chatConfigJson(),
      });
      final tabs = withChatTab(full, chat);
      expect(tabs, hasLength(5));
      expect(tabs.last.more.first.pushLocation, Paths.chat);
      // Not twice.
      expect(withChatTab(tabs, chat).last.more, hasLength(3));
    });
  });

  testWidgets('the More tab opens the rest, and one opens on top', (
    tester,
  ) async {
    final api = FakeApi()
      ..navigation = moreNavigation()
      ..pages = {
        'home': appPageJson(blocks: []),
        'about': appPageJson(slug: 'about', title: 'About us', blocks: []),
      };
    final semantics = tester.ensureSemantics();
    await TestApp(signedIn: true, api: api).pump(tester);
    for (final label in ['Discover', 'Catalog', 'Mine', 'Alerts', 'More']) {
      expect(navTab(label), findsOneWidget, reason: label);
    }
    expect(navTab('About us'), findsNothing);

    await tester.tap(navTab('More'));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('more-tab-t5')), findsOneWidget);
    expect(find.byKey(const ValueKey('more-tab-t6')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('more-tab-t5')));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('more-tab-t5')), findsNothing);
    expect(find.text('About us'), findsWidgets);
    // On top, with a way back.
    expect(find.bySemanticsLabel('Back'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('the bar takes the owner\'s look: names under the open tab '
      'only, and a round button in the middle', (tester) async {
    final api = FakeApi()
      ..navigation = moreNavigation(
        tabBar: {
          'background': '#0E0D24',
          'margin': 12,
          'radius': 24,
          'labels': 'active',
          'center': 't3',
        },
      )
      ..pages = {'home': appPageJson(blocks: [])};
    await TestApp(signedIn: true, api: api).pump(tester);
    expect(tester.takeException(), isNull);
    // The open tab's name only.
    expect(navTab('Discover'), findsOneWidget);
    expect(navTab('Catalog'), findsNothing);
    expect(navTab('Mine'), findsNothing);
    // Every tab can still be told apart.
    expect(find.bySemanticsLabel('Catalog'), findsOneWidget);
    final bar = tester.widget<DecoratedBox>(
      find
          .descendant(
            of: find.bySemanticsLabel(RegExp('Main navigation')),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    final decoration = bar.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFF0E0D24));
    expect(decoration.borderRadius, BorderRadius.circular(24));
    // The middle tab is a round button.
    expect(
      find.descendant(
        of: find.bySemanticsLabel('Mine'),
        matching: find.byWidgetPredicate(
          (w) =>
              w is Container &&
              (w.decoration as BoxDecoration?)?.shape == BoxShape.circle,
        ),
      ),
      findsOneWidget,
    );
  });
}
