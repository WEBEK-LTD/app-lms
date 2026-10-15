import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/theme/palette.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/lms/lesson/content/html_content.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'content_blocks_test.dart' show contentApp;

/// 38 What a demanding user found trying every app type in the preview.

ThemeData _theme() => buildAppTheme(
  primary: const Color(0xFF0E0D24),
  brightness: Brightness.light,
  template: AppTemplate.classic,
  fontFamily: 'Bricolage Grotesque',
);

Widget _host(Widget child, {TextDirection direction = TextDirection.ltr}) =>
    MaterialApp(
      theme: _theme(),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Directionality(
        textDirection: direction,
        child: Scaffold(body: child),
      ),
    );

FakeApi _pageApi(List<Map<String, dynamic>> blocks, {bool wishlist = true}) =>
    FakeApi(
        config: configJson(
          wishlist: wishlist,
          languages: languagesJson(available: const ['en', 'ar']),
        ),
      )
      ..navigation = navigationJson()
      ..pages = {'home': appPageJson(blocks: blocks)};

Map<String, dynamic> _links(List<(String, String, String)> links) => {
  'id': 'q1',
  'type': 'quick_links',
  'title': null,
  'style': 'grid',
  'links': [
    for (final (icon, label, screen) in links)
      {
        'icon': icon,
        'label': label,
        'action': {'type': 'screen', 'screen': screen},
      },
  ],
};

void main() {
  testWidgets('a quick link to a screen the app lacks is left out', (
    tester,
  ) async {
    final app = contentApp(
      api: _pageApi([
        _links([
          ('school', 'All courses', 'courses'),
          ('favorite', 'Wishlist', 'favorites'),
        ]),
      ], wishlist: false),
    );
    await app.pump(tester);
    expect(find.text('All courses'), findsWidgets);
    // An academy without a wishlist: the tile would do nothing.
    expect(find.text('Wishlist'), findsNothing);
  });

  testWidgets('a quick link label never breaks inside a word', (tester) async {
    tester.view
      ..physicalSize = const Size(768, 1024) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final app = contentApp(
      api: _pageApi([
        _links([
          ('card_membership', 'Membership', 'notifications'),
          ('event', 'Appointments', 'notifications'),
          ('notifications', 'Updates', 'notifications'),
          ('person', 'Account', 'account'),
        ]),
      ]),
    );
    await app.pump(tester);
    for (final label in ['Membership', 'Appointments']) {
      final paragraph = tester.renderObject<RenderParagraph>(find.text(label));
      final lines = paragraph
          .getBoxesForSelection(
            TextSelection(baseOffset: 0, extentOffset: label.length),
          )
          .map((b) => b.top.round())
          .toSet();
      expect(lines, hasLength(1), reason: label);
    }
  });

  testWidgets('a list row shows its badge in the text, not an empty label '
      'on the small picture', (tester) async {
    final app = contentApp(
      api: _pageApi([
        {
          'id': 'l1',
          'type': 'items',
          'title': 'New listings',
          'source': 'courses',
          'layout': 'list',
          'see_all': null,
          'items': [itemJson()],
        },
      ]),
    );
    await app.pump(tester);
    final badge = find.text('New');
    expect(badge, findsOneWidget);
    // Right of the 76 point picture (20 margin + 10 padding + 76).
    expect(tester.getTopLeft(badge).dx, greaterThan(100));
  });

  testWidgets('English content reads left to right in an Arabic app', (
    tester,
  ) async {
    final app = contentApp(
      api: _pageApi([
        {
          'id': 't1',
          'type': 'text',
          'title': null,
          'html': '<p>Open every day from 9 to 5, and Saturday mornings.</p>',
        },
      ]),
      language: 'ar',
    );
    await app.pump(tester);
    final html = find.byType(HtmlWidget);
    expect(html, findsOneWidget);
    expect(Directionality.of(tester.element(html)), TextDirection.ltr);
    expect(
      contentDirection('<p>مرحبا بكم في الأكاديمية</p>'),
      TextDirection.rtl,
    );
  });

  testWidgets('no device limit: no "1 of 0"', (tester) async {
    final api = FakeApi()..deviceLimit = 0;
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    final router = app.container.read(appRouterProvider);
    router.push('/account/settings');
    await TestApp.settle(tester);
    expect(find.text('1 of 0'), findsNothing);
    expect(find.text('1 device'), findsOneWidget);
    router.push('/account/settings/devices');
    await TestApp.settle(tester);
    expect(
      find.text('You can use this account on as many devices as you like.'),
      findsOneWidget,
    );
  });

  testWidgets('typed text uses the text color, not the hint\'s', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        TextField(
          controller: TextEditingController(text: 'Demo visitor'),
          decoration: const InputDecoration(hintText: 'Full name'),
        ),
      ),
    );
    final palette = _theme().extension<AppPalette>()!;
    final editable = tester.widget<EditableText>(find.byType(EditableText));
    expect(editable.style.color, palette.text);
  });

  testWidgets('an icon button alone on a picture has its own semantics', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    // A course's hero: the first child of the page's list.
    await tester.pumpWidget(
      _host(
        ListView(
          children: [
            SizedBox(
              height: 220,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  const ColoredBox(color: Colors.grey),
                  PositionedDirectional(
                    top: 16,
                    start: 20,
                    child: SquareIconButton(
                      icon: AppIcons.back,
                      label: 'Back',
                      onPressed: () {},
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 600, child: Text('Course details')),
          ],
        ),
      ),
    );
    final rect = tester.getSemantics(find.bySemanticsLabel('Back')).rect;
    expect(rect.width, lessThan(80));
    expect(rect.height, lessThan(80));
    semantics.dispose();
  });

  testWidgets('Back and Next point the right way right to left', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const Row(
          children: [
            AppIcon(AppIcons.back, key: ValueKey('back')),
            AppIcon(AppIcons.forward, key: ValueKey('forward')),
          ],
        ),
        direction: TextDirection.rtl,
      ),
    );
    for (final key in ['back', 'forward']) {
      final mirrors = tester
          .widgetList<Transform>(
            find.descendant(
              of: find.byKey(ValueKey(key)),
              matching: find.byType(Transform),
            ),
          )
          .where((t) => t.transform.storage[0] < 0);
      // Mirrored once: flipped twice, it pointed the left to right way.
      expect(mirrors, hasLength(1), reason: key);
    }
  });

  for (final (count, index, label) in [
    (5, 0, 'Home'),
    (5, 2, 'Membership'),
    (4, 2, 'My donations'),
  ]) {
    testWidgets('bold: the active "$label" has room in its pill '
        '($count tabs)', (tester) async {
      tester.view
        ..physicalSize = const Size(360, 640) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final names = ['Home', 'Classes', label, 'My bookings', 'Account'];
      await tester.pumpWidget(
        _host(
          Align(
            alignment: Alignment.bottomCenter,
            child: AppNavBar(
              template: AppTemplate.bold,
              currentIndex: index,
              onSelected: (_) {},
              destinations: [
                for (final name in names.take(count))
                  NavDestination(AppIcons.home, name),
              ],
            ),
          ),
        ),
      );
      final text = find.text(label);
      final pill = find.ancestor(of: text, matching: find.byType(DecoratedBox));
      final textRect = tester.getRect(text);
      final pillRect = tester.getRect(pill.first);
      expect(textRect.right, lessThanOrEqualTo(pillRect.right - 8));
      expect(
        tester.getRect(find.byType(Icon).at(index)).left,
        greaterThanOrEqualTo(pillRect.left + 8),
      );
      // Not shrunk to a speck (the test font is wider than the app's).
      expect(textRect.height, greaterThan(9));
    });
  }
}
