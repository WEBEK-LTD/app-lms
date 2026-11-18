import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show SemanticsNode;
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/studio_tap_label.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 159 Kech Flora's home, made from Leqaa's Rose hour template: the search,
/// the wordmark and the bag over the stories. The owner's phone had the bag
/// about three quarters of the way across, the gaps on both sides of the
/// wordmark equal and large, while the stories' lines spanned the screen:
/// the bar had a width in points (a corner drag on Studio's 340-point phone
/// never became "fill"), which the app's Row keeps. A cover's top bar is now
/// at its automatic size unless it was sized by hand (`manual_size`): across
/// the cover, the wordmark between the buttons, whatever width the bar and
/// the wordmark were given. Drawn here by the app's own renderer from the
/// template's hero as the platform makes it (test/support/signatures/
/// flowers_a.json), on phones 360, 390 and 412 points wide.
void main() {
  setUpAll(loadAppFonts);

  Map<String, dynamic> hero() {
    final project = jsonDecode(
      File('test/support/signatures/flowers_a.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final pages = (project['layout'] as Map)['pages'] as List;
    final home = pages.firstWhere((p) => (p as Map)['slug'] == 'home') as Map;
    final body = (home['studio'] as Map)['body'] as Map;
    // A copy: each test changes its own.
    return jsonDecode(jsonEncode((body['children'] as List).first))
        as Map<String, dynamic>;
  }

  Map<String, dynamic> barOf(Map<String, dynamic> hero) =>
      (hero['children'] as List)[1] as Map<String, dynamic>;
  Map<String, dynamic> wordOf(Map<String, dynamic> hero) =>
      (barOf(hero)['children'] as List)[1] as Map<String, dynamic>;

  /// The bar's discs, wordmark and the stories' lines, as drawn.
  Future<({double screen, Rect search, Rect word, Rect bag, Rect lines})> draw(
    WidgetTester tester,
    double width,
    Map<String, dynamic> hero, {
    String lang = 'en',
  }) async {
    final view = tester.view
      ..physicalSize = Size(width, 800) * 3
      ..devicePixelRatio = 3;
    addTearDown(view.reset);
    wordOf(hero)['text'] = lang == 'ar' ? 'كيش فلورا' : 'KechFlora';
    final api =
        FakeApi(config: configJson(store: true, languages: languagesJson()))
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
                'background': '#FBF3F0',
                'body': {
                  'id': 'sig-1',
                  'type': 'column',
                  'padding': {'top': 0, 'end': 0, 'bottom': 96, 'start': 0},
                  'children': [hero],
                },
              },
            },
          };
    await TestApp(
      api: api,
      // A shop, as Kech Flora: its bag opens the cart.
      appType: AppType.store,
      signedIn: true,
      preferences: {'settings.language': lang},
    ).pump(tester);
    await TestApp.settle(tester, 20);
    expect(tester.takeException(), isNull);
    Rect at(String id) =>
        tester.getRect(find.byKey(ValueKey('studio-node-$id')));
    return (
      screen: tester.view.physicalSize.width / tester.view.devicePixelRatio,
      search: at('sig-45'),
      word: at('sig-47'),
      bag: at('sig-48'),
      lines: tester.getRect(find.byKey(const ValueKey('studio-lines-sig-3'))),
    );
  }

  /// The bar across the cover: the search and the bag 16 from the edges,
  /// the wordmark filling the room between them, 10 from each.
  void spans(
    ({double screen, Rect search, Rect word, Rect bag, Rect lines}) d, {
    bool rtl = false,
  }) {
    final (start, end) = rtl ? (d.bag, d.search) : (d.search, d.bag);
    expect(start.left, 16);
    expect(end.right, d.screen - 16);
    expect(d.word.left, start.right + 10);
    expect(d.word.right, end.left - 10);
    // As wide as the stories' lines over the same cover.
    expect(d.lines.left, 16);
    expect(d.lines.right, d.screen - 16);
  }

  /// The bar and its wordmark as apps made from the template may have them.
  final variants = <String, void Function(Map<String, dynamic> hero)>{
    'the template as it is (the bar and the wordmark fill)': (_) {},
    'the bar set to hug': (h) => barOf(h)['width'] = 'hug',
    'the bar without a width': (h) => barOf(h).remove('width'),
    'the wordmark set to hug, on one line': (h) => wordOf(h)['width'] = 'hug',
    'the bar 300 points wide (a corner drag)': (h) => barOf(h)['width'] = 300,
    'the bar 324 points wide (a corner drag)': (h) => barOf(h)['width'] = 324,
    'the bar in points, the wordmark hugging': (h) {
      barOf(h)['width'] = 324;
      wordOf(h)['width'] = 'hug';
    },
    'the bar and the wordmark in points': (h) {
      barOf(h)['width'] = 324;
      wordOf(h)['width'] = 200;
    },
  };

  for (final width in [360.0, 390.0, 412.0]) {
    group('on a phone $width wide', () {
      for (final MapEntry(key: name, value: change) in variants.entries) {
        testWidgets('$name: the bag at the edge', (tester) async {
          final h = hero();
          change(h);
          spans(await draw(tester, width, h));
        });
      }

      testWidgets('in Arabic, right to left: the search on the right', (
        tester,
      ) async {
        spans(await draw(tester, width, hero(), lang: 'ar'), rtl: true);
      });

      testWidgets('in Arabic, the bar in points: across too', (tester) async {
        final h = hero();
        barOf(h)['width'] = 324;
        spans(await draw(tester, width, h, lang: 'ar'), rtl: true);
      });

      testWidgets(
        'a bar sized by hand keeps its width: the owner\'s picture, the bag '
        'short of the edge, the gaps beside the wordmark equal',
        (tester) async {
          final h = hero();
          barOf(h)
            ..['width'] = 324
            ..['manual_size'] = {'width': 'fill', 'height': 68};
          final d = await draw(tester, width, h);
          expect(d.search.left, 16);
          expect(d.bag.right, 324 - 16);
          expect(d.word.left - d.search.right, d.bag.left - d.word.right);
          // The stories' lines still span the screen.
          expect(d.lines.right, d.screen - 16);
        },
      );
    });
  }

  group('159 the round buttons say what they open', () {
    // The Leqaa QA tester: the search and the bag over the stories had no
    // name, so a screen reader said only "button".
    SemanticsNode tap(WidgetTester tester, String id) => tester.getSemantics(
      find
          .descendant(
            of: find.byKey(ValueKey('studio-node-$id')),
            matching: find.byType(Semantics),
          )
          .first,
    );

    for (final (lang, search, bag) in [
      ('en', 'Search', 'Cart'),
      ('ar', 'بحث', 'السلة'),
      ('tr', 'Ara', 'Sepet'),
    ]) {
      testWidgets('in $lang: "$search" and "$bag", as buttons', (tester) async {
        final handle = tester.ensureSemantics();
        await draw(tester, 390, hero(), lang: lang);
        expect(
          tap(tester, 'sig-45'),
          isSemantics(label: search, isButton: true, hasTapAction: true),
        );
        expect(
          tap(tester, 'sig-48'),
          isSemantics(label: bag, isButton: true, hasTapAction: true),
        );
        handle.dispose();
      });
    }

    testWidgets('the owner\'s name for it first; a page by its title', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      final h = hero();
      final bar = barOf(h)['children'] as List;
      (bar[2] as Map<String, dynamic>)['name'] = 'Your bouquets';
      (bar[0] as Map<String, dynamic>)['action'] = {
        'type': 'page',
        'page_slug': 'home',
      };
      await draw(tester, 390, h);
      expect(find.bySemanticsLabel('Your bouquets'), findsOneWidget);
      // The page's title in the app's pages.
      expect(find.bySemanticsLabel('Discover'), findsWidgets);
      expect(
        tap(tester, 'sig-45'),
        isSemantics(label: 'Discover', isButton: true, hasTapAction: true),
      );
      handle.dispose();
    });

    test('only an element without words of its own gets one', () {
      StudioNode node(Map<String, dynamic> json) =>
          StudioNode.tryParse({'id': 'n', ...json})!;
      expect(studioWordless(node({'type': 'icon', 'icon': 'search'})), isTrue);
      expect(
        studioWordless(
          node({
            'type': 'row',
            'children': [
              {'id': 'i', 'type': 'icon', 'icon': 'search'},
            ],
          }),
        ),
        isTrue,
      );
      expect(
        studioWordless(node({'type': 'button', 'icon': 'search'})),
        isTrue,
      );
      // Its words are what it says, as before.
      expect(
        studioWordless(node({'type': 'button', 'text': 'Send flowers'})),
        isFalse,
      );
      expect(
        studioWordless(
          node({
            'type': 'row',
            'children': [
              {'id': 'i', 'type': 'icon', 'icon': 'search'},
              {'id': 't', 'type': 'text', 'text': 'Search'},
            ],
          }),
        ),
        isFalse,
      );
      expect(studioWordless(node({'type': 'items'})), isFalse);
    });
  });

  test('a layer that is not a top bar, and the first layer, as before', () {
    StudioNode stack(List<Map<String, dynamic>> layers) =>
        StudioNode.tryParse({'id': 's', 'type': 'stack', 'children': layers})!;
    Map<String, dynamic> disc(String id) => {
      'id': id,
      'type': 'row',
      'width': 42,
      'action': {'type': 'screen', 'screen': 'cart'},
    };
    Map<String, dynamic> bar(String id, {Object? width = 300}) => {
      'id': id,
      'type': 'row',
      'width': width,
      'children': [
        disc('$id-a'),
        {'id': '$id-t', 'type': 'text', 'text': 'Hi', 'width': 120},
        disc('$id-b'),
      ],
    };
    // The first layer is the cover itself: as it is.
    final first = stack([bar('a'), bar('b')]);
    expect(first.children[0].width?.fixed, 300);
    expect(first.children[1].width?.fill, isTrue);
    expect(first.children[1].children[1].width?.fill, isTrue);
    // A badge with one tap, a row on a spot, a row that scrolls: as they are.
    final others = stack([
      {'id': 'pic', 'type': 'image'},
      {
        'id': 'badge',
        'type': 'row',
        'width': 90,
        'children': [disc('x'), disc('y')..remove('action')],
      },
      {
        ...bar('placed'),
        'place': {'x': 10, 'y': 10},
      },
      {...bar('strip'), 'scroll': true},
    ]);
    expect(
      [for (final k in others.children) k.width?.fixed],
      [null, 90, 300, 300],
    );
    // Sized by hand: its own width; the wordmark too.
    final kept = stack([
      {'id': 'pic', 'type': 'image'},
      {
        ...bar('hand'),
        'manual_size': {'width': 'fill', 'height': null},
      },
    ]);
    expect(kept.children[1].width?.fixed, 300);
    expect(kept.children[1].children[1].width?.fill, isTrue);
    // Its tablet width goes with it.
    final tablet = StudioNode.tryParse({
      'id': 's',
      'type': 'stack',
      'children': [
        {'id': 'pic', 'type': 'image'},
        {
          ...bar('t'),
          'tablet': {'width': 500, 'gap': 20},
        },
      ],
    }, tablet: true)!;
    expect(tablet.children[1].width?.fill, isTrue);
    expect(tablet.children[1].gap, 20);
  });
}
