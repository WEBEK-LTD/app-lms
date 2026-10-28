import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/modules/shared/account/notifications_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 103R A page designed in Yallapp Studio, drawn natively from its tree of
/// elements.
void main() {
  Map<String, dynamic> studioJson() => {
    'header': {
      'type': 'logo_actions',
      'title': 'Nil Academy',
      'buttons': ['notifications', 'account'],
      'background': '#14361F',
      'color': '#F6EFD9',
    },
    'background': '#FBF8F2',
    'body': {
      'id': 'root',
      'type': 'column',
      'gap': 8,
      'children': [
        {
          'id': 'hero',
          'type': 'column',
          'height': 180,
          'background': '#1F4E5F',
          'dark_background': '#0B1F26',
          'radius': 18,
          'padding': {'top': 14, 'end': 14, 'bottom': 14, 'start': 14},
          'margin': {'start': 10, 'end': 10},
          'align': 'end',
          'children': [
            {
              'id': 'title',
              'type': 'text',
              'text': 'Learn faster',
              'color': '#FFFFFF',
              'font': {'size': 26, 'weight': 800},
              'motion': {'enter': 'slide_up', 'duration_ms': 300},
            },
          ],
        },
        {
          'id': 'actions',
          'type': 'row',
          'gap': 8,
          'cross': 'center',
          'margin': {'start': 10, 'end': 10},
          'children': [
            {
              'id': 'go',
              'type': 'button',
              'width': 'fill',
              'text': 'My notifications',
              'icon': 'arrow_forward',
              'background': '#E8B04B',
              'radius': 14,
              'motion': {'press': 'shrink'},
              'action': {'type': 'screen', 'screen': 'notifications'},
            },
            {'id': 'star', 'type': 'icon', 'icon': 'star', 'icon_size': 28},
          ],
        },
        {
          'id': 'android-only',
          'type': 'text',
          'text': 'Only on Android',
          'platforms': ['android'],
        },
        {
          'id': 'guests',
          'type': 'text',
          'text': 'Only for guests',
          'visibility': 'signed_out',
        },
        {
          'id': 'list',
          'type': 'items',
          'source': 'courses',
          'layout': 'list',
          'card': {
            'id': 'card',
            'type': 'row',
            'gap': 8,
            'children': [
              {'id': 'card-title', 'type': 'text', 'bind': 'title'},
              {'id': 'card-price', 'type': 'text', 'bind': 'price'},
            ],
          },
          'items': [itemJson(), itemJson(id: '2', title: 'Python')],
        },
        {
          'id': 'stars',
          'type': 'ratings',
          'rating': 4.5,
          'text': '4.8 · 320 reviews',
        },
        // Elements this app doesn't know are left out with what they hold.
        {
          'id': 'later',
          'type': 'hologram',
          'children': [
            {'id': 'inside', 'type': 'text', 'text': 'Hidden'},
          ],
        },
      ],
    },
  };

  test('reads the page, its header and the elements it knows', () {
    final page = AppPage.fromJson({
      ...appPageJson(blocks: []),
      'studio': studioJson(),
    });
    final studio = page.studio!;
    expect(studio.header?.type, StudioHeaderType.logoActions);
    expect(studio.header?.buttons, [
      StudioHeaderButton.notifications,
      StudioHeaderButton.account,
    ]);
    final body = studio.body;
    expect(body.children.map((n) => n.id), [
      'hero',
      'actions',
      'android-only',
      'guests',
      'list',
      'stars',
    ]);
    final hero = body.children.first;
    expect(hero.height?.fixed, 180);
    expect(hero.padding?.start, 14);
    expect(hero.children.single.font?.weight, 800);
    expect(hero.children.single.motion?.enter, StudioEnter.slideUp);
    final go = body.children[1].children.first;
    expect(go.width?.fill, isTrue);
    expect(go.action?.screen, BuiltInScreen.notifications);
    expect(body.children[3].visibility, StudioVisibility.signedOut);
    expect(body.children[4].card?.children.first.bind, StudioBind.title);
    expect(body.children[4].items, hasLength(2));
    // Without a studio, or with one whose body can't be read: the blocks.
    expect(AppPage.fromJson(appPageJson(blocks: [])).studio, isNull);
    expect(
      AppPage.fromJson({
        ...appPageJson(blocks: []),
        'studio': {'body': 'x'},
      }).studio,
      isNull,
    );
  });

  testWidgets('draws the elements, their own cards for a list, and follows '
      'their taps', (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {...appPageJson(blocks: []), 'studio': studioJson()},
        },
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('studio-home')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('studio-header-logo_actions')),
      findsOneWidget,
    );
    await TestApp.settle(tester, 10);
    expect(find.text('Learn faster'), findsOneWidget);
    // The list's own card, bound to each entry.
    expect(find.text('Python'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-card-list-2')), findsOneWidget);
    // Shown to people not signed in only; this one is.
    expect(find.text('Only for guests'), findsNothing);
    expect(find.text('Hidden'), findsNothing);
    expect(find.text('4.8 · 320 reviews'), findsOneWidget);
    // A fixed height, and the margins inside the screen's width.
    final screen = tester.getSize(find.byKey(const ValueKey('studio-home')));
    final hero = tester.getRect(find.byKey(const ValueKey('studio-node-hero')));
    expect(hero.height, closeTo(180, 0.5));
    expect(hero.width, closeTo(screen.width, 0.5));
    // The button fills the row beside the icon.
    final go = tester.getSize(find.byKey(const ValueKey('studio-node-go')));
    expect(go.width, greaterThan(screen.width - 20 - 8 - 28 - 2));
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('My notifications'));
    await TestApp.settle(tester, 10);
    expect(find.byType(NotificationsScreen), findsOneWidget);
  });

  testWidgets('a page in dark mode takes the dark colours', (tester) async {
    final app = TestApp(
      api:
          FakeApi(
              config: configJson(
                appearance: appearanceJson(
                  themeMode: 'dark',
                  userCanChangeMode: false,
                ),
              ),
            )
            ..navigation = navigationJson()
            ..pages = {
              'home': {...appPageJson(blocks: []), 'studio': studioJson()},
            },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    final box = tester.widget<DecoratedBox>(
      find
          .descendant(
            of: find.byKey(const ValueKey('studio-node-hero')),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    expect((box.decoration as BoxDecoration).color, const Color(0xFF0B1F26));
    expect(tester.takeException(), isNull);
  });

  testWidgets('a page set to show no tabs hides them, the others keep them', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {...studioJson(), 'show_tabs': false},
          },
        },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    expect(find.text('Learn faster'), findsOneWidget);
    expect(find.byType(AppNavBar), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a Studio page shows the tabs unless it says otherwise', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {...appPageJson(blocks: []), 'studio': studioJson()},
        },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    expect(find.byType(AppNavBar), findsOneWidget);
  });
}
