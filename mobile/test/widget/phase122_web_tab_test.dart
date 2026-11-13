import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/pages/web_tab_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 122 A bottom tab showing a web page in the app: one of the app's
/// screens, the tab's name over it and no address shown; the site's own
/// header and footer hidden when the owner chose, and its links kept in.
void main() {
  Map<String, dynamic> navigation(
    Map<String, dynamic>? web, {
    Map<String, dynamic>? tabBar,
  }) => {
    ...navigationJson(
      tabs: [
        navTabJson('t1', 'Discover', 'explore', {
          'type': 'page',
          'page_slug': 'home',
        }),
        navTabJson('blog', 'Blog', 'article', {
          'type': 'url',
          'url': 'https://academy.test/blog',
          'open_in': 'in_app',
          'web': ?web,
        }),
        navTabJson('t4', 'Me', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
    ),
    'tab_bar': ?tabBar,
  };

  test('reads what to hide, and turns it into the style rules', () {
    final action = PageAction.tryParse({
      'type': 'url',
      'url': 'https://academy.test/blog',
      'web': {
        'hide_header': true,
        'hide_footer': true,
        'hide': '.newsletter, #cookie-banner',
        'links_inside': true,
      },
    })!;
    final look = action.web!;
    expect(look.linksInside, isTrue);
    expect(look.css, contains(WebPageLook.headerSelectors));
    expect(look.css, contains(WebPageLook.footerSelectors));
    expect(
      look.css,
      contains('.newsletter, #cookie-banner{display:none!important}'),
    );
    // Selectors that would end the rule are dropped, as the servers do.
    final unsafe = WebPageLook.tryParse({'hide': 'a{x}</style>'})!;
    expect(unsafe.hide, isNull);
    expect(unsafe.css, isEmpty);
  });

  testWidgets('the tab is a screen of the app: its name, no address, the '
      "site's header and footer hidden", (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation({
          'hide_header': true,
          'hide_footer': true,
          'links_inside': true,
        })
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('Blog').last);
    await TestApp.settle(tester, 10);
    expect(find.byType(WebTabScreen), findsOneWidget);
    // The bar still shows: it is a tab.
    expect(find.text('Discover'), findsWidgets);
    final request = app.webViews.requests.lastWhere(
      (r) => r.debugLabel == 'web-tab',
    );
    expect(request.url, Uri.parse('https://academy.test/blog'));
    expect(request.injectCss, contains('#colophon'));
    expect(request.openLinksOutside, isFalse);
    // No address anywhere.
    expect(find.textContaining('academy.test'), findsNothing);
  });

  testWidgets("without the owner's choices the page is as it is, the site's "
      'own links in the app and others in the browser', (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation(null)
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('Blog').last);
    await TestApp.settle(tester, 10);
    final request = app.webViews.requests.lastWhere(
      (r) => r.debugLabel == 'web-tab',
    );
    expect(request.injectCss, anyOf(isNull, isEmpty));
    expect(request.openLinksOutside, isTrue);
  });

  // 124.12 The owner (13 November): under the frosted bar the page's last
  // lines and buttons couldn't be seen. The page ends above the bar.
  for (final glass in [true, false]) {
    testWidgets(
      glass
          ? 'under a floating frosted bar the page ends above the bar'
          : 'over a plain bar the page ends where the bar starts',
      (tester) async {
        final app = TestApp(
          api: FakeApi()
            ..navigation = navigation(
              null,
              tabBar: glass ? {'design': 'glass', 'margin': 16} : null,
            )
            ..pages = {'home': appPageJson(blocks: [])},
          signedIn: true,
        );
        await app.pump(tester);
        await TestApp.settle(tester, 10);
        await tester.tap(find.text('Blog').last);
        await TestApp.settle(tester, 10);
        final page = tester.getRect(
          find.byKey(const ValueKey('webview-web-tab')),
        );
        final bar = tester.getRect(
          find.bySemanticsLabel(RegExp('Main navigation')).first,
        );
        expect(page.bottom, lessThanOrEqualTo(bar.top + 0.5));
        // And no empty band above a bar the page doesn't go under.
        if (!glass) expect(page.bottom, closeTo(bar.top, 0.5));
      },
    );
  }
}
