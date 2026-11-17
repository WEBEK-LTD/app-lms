import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// App audit: what the owner sets on a Studio button and a list of lines in
/// the editor is what the app draws: the icon's size (24 too, more than 40
/// too, 20 without one as the editor draws it), the words at the start or
/// the end, and the weight of the words.
void main() {
  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'shop-now',
            'type': 'button',
            'text': 'Shop now',
            'icon': 'shopping_bag',
            'icon_size': 48,
            'text_align': 'end',
            'width': 'fill',
            'height': 52,
            'background': '#7A1F3D',
            'color': '#FFFFFF',
            'font': {'weight': 500},
          },
          {
            'id': 'plain',
            'type': 'button',
            'text': 'Send flowers',
            'icon': 'send',
            'width': 'fill',
            'background': '#7A1F3D',
          },
          {
            'id': 'lines',
            'type': 'bullets',
            'text': 'Same-day delivery\nA card with your words',
            'icon': 'check_circle',
            'icon_size': 24,
          },
        ],
      },
    },
  };

  FakeApi api() => FakeApi()
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
    ..pages = {'home': home()};

  test('keeps whether the owner chose a size and an alignment', () {
    final chosen = StudioNode.tryParse({
      'id': 'a',
      'type': 'button',
      'icon_size': 24,
      'text_align': 'start',
    })!;
    expect(chosen.givenIconSize, 24);
    expect(chosen.givenTextAlign, StudioTextAlign.start);
    final none = StudioNode.tryParse({'id': 'b', 'type': 'button'})!;
    expect(none.givenIconSize, isNull);
    expect(none.givenTextAlign, isNull);
    // As before for everything else.
    expect(none.iconSize, 24);
    expect(none.textAlign, StudioTextAlign.start);
  });

  testWidgets('draws the button and the lines as set in the editor', (
    tester,
  ) async {
    await TestApp(api: api(), signedIn: true).pump(tester);
    await TestApp.settle(tester, 20);

    Icon icon(IconData data) => tester.widget<Icon>(find.byIcon(data).first);
    // 48 (no longer cut to 40), and 20 without a size of its own.
    expect(icon(Symbols.shopping_bag_rounded).size, 48);
    expect(icon(Symbols.send_rounded).size, 20);
    // The lines' icons at 24 when 24 is chosen (it was drawn at 20).
    final lines = tester.widgetList<Icon>(
      find.descendant(
        of: find.byKey(const ValueKey('studio-node-lines')),
        matching: find.byType(Icon),
      ),
    );
    expect(lines, hasLength(2));
    expect(lines.map((i) => i.size), everyElement(24));

    // The words at the end of a full-width button.
    final align = tester.widget<Align>(
      find
          .ancestor(
            of: find.text('Shop now'),
            matching: find.byWidgetPredicate(
              (w) => w is Align && w.widthFactor == 1 && w.heightFactor == 1,
            ),
          )
          .first,
    );
    expect(align.alignment, AlignmentDirectional.centerEnd);
    final plain = tester.widget<Align>(
      find
          .ancestor(
            of: find.text('Send flowers'),
            matching: find.byWidgetPredicate(
              (w) => w is Align && w.widthFactor == 1 && w.heightFactor == 1,
            ),
          )
          .first,
    );
    expect(plain.alignment, AlignmentDirectional.center);

    // The weight chosen (500), bold without one.
    final shop = tester.widget<RichText>(
      find
          .descendant(
            of: find.byKey(const ValueKey('studio-node-shop-now')),
            matching: find.byType(RichText),
          )
          .first,
    );
    expect(shop.text.style?.fontWeight, FontWeight.w500);
    final send = tester.widget<RichText>(
      find
          .descendant(
            of: find.byKey(const ValueKey('studio-node-plain')),
            matching: find.byType(RichText),
          )
          .first,
    );
    expect(send.text.style?.fontWeight, FontWeight.w700);
    expect(tester.takeException(), isNull);
  });

  // Kech Flora's home (a copy of Leqaa): the header's cart is the bag drawn
  // in Studio, in the plain header and in the petal one.
  for (final style in [null, 'petal']) {
    testWidgets('the cart in the header is the bag of the editor '
        '(${style ?? 'plain'})', (tester) async {
      final api = FakeApi()
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
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'header': {
                'type': 'logo_center',
                'style': ?style,
                'title': 'KechFlora',
                'buttons': ['search', 'cart'],
              },
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [
                  {'id': 'hello', 'type': 'text', 'text': 'Hello'},
                ],
              },
            },
          },
        };
      await TestApp(
        appType: AppType.store,
        api: api,
        signedIn: true,
      ).pump(tester);
      await TestApp.settle(tester, 20);
      final cart = find.byKey(const ValueKey('studio-header-cart'));
      expect(cart, findsOneWidget);
      expect(
        find.descendant(
          of: cart,
          matching: find.byIcon(Symbols.shopping_bag_rounded),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: cart,
          matching: find.byIcon(Symbols.shopping_cart_rounded),
        ),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    });
  }
}
