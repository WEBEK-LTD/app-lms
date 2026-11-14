import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/premium/premium_bento.dart';
import 'package:yallapp/modules/shared/pages/premium/premium_progress.dart';
import 'package:yallapp/modules/shared/pages/premium/premium_surface.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/premium_content_fixtures.dart';
import '../support/test_app.dart';

/// 129.11–129.20 Studio's premium content, trust and commerce elements in
/// the app: each drawn light, dark and right to left; plans without made-up
/// prices and their monthly / yearly switch; numbers counting up and bars
/// filling once (at once when the phone reduces motion); the active step;
/// a course's real reviews as quote cards; the profile card's photo over
/// its cover; the bento grid's places; glass over a photo; a call-to-action
/// bar above the tabs; and a page without them drawn as before.
void main() {
  FakeApi api(
    List<Map<String, dynamic>> children, {
    bool arabic = false,
    Map<String, dynamic>? tabBar,
  }) => FakeApi(config: configJson(languages: languagesJson()))
    ..navigation = {
      ...navigationJson(
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
      ),
      'tab_bar': ?tabBar,
    }
    ..pages = {
      'home': {
        ...appPageJson(blocks: [], showTitle: false),
        'studio': {
          'background': '#F6F3EE',
          'dark_background': '#0E0D1A',
          'body': {'id': 'root', 'type': 'column', 'children': children},
        },
      },
    };

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
    int frames = 40,
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 2340)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      appType: AppType.lms,
      api: api,
      guest: true,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, frames);
    return app;
  }

  for (final element in premiumElements) {
    for (final (mode, dark, arabic) in [
      ('light', false, false),
      ('dark', true, false),
      ('rtl', false, true),
    ]) {
      testWidgets('$element draws $mode', (tester) async {
        final children = premiumChildren(element, arabic: arabic);
        await open(
          tester,
          api(children),
          dark: dark,
          language: arabic ? 'ar' : 'en',
        );
        expect(tester.takeException(), isNull);
        expect(
          Directionality.of(
            tester.element(find.byKey(const ValueKey('studio-node-root'))),
          ),
          arabic ? TextDirection.rtl : TextDirection.ltr,
        );
        expect(
          Theme.of(
            tester.element(find.byKey(const ValueKey('studio-node-root'))),
          ).brightness,
          dark ? Brightness.dark : Brightness.light,
        );
        for (final child in children) {
          expect(
            find.byKey(ValueKey('studio-node-${child['id']}')),
            findsOneWidget,
            reason: '$element: ${child['id']}',
          );
        }
      });
    }
  }

  testWidgets('quote cards: stars as icons, the person, side by side', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('testimonials')));
    expect(find.text('Mona Adel'), findsOneWidget);
    expect(find.text('Shop owner, Cairo'), findsOneWidget);
    expect(find.bySemanticsLabel('5 out of 5 stars'), findsWidgets);
    expect(find.bySemanticsLabel('4 out of 5 stars'), findsOneWidget);
    // The one without a photo shows its initial.
    expect(find.text('K'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('premium-carousel-quotes')),
      findsOneWidget,
    );
  });

  testWidgets(
    "a course's real reviews of 4 stars and up, in place of the quotes",
    (tester) async {
      final fake = api([
        {
          'id': 'real',
          'type': 'testimonials',
          'testimonials': {
            'reviews': {'source': 'courses', 'id': '12'},
          },
          'entries': [
            {'text': 'An owner quote', 'title': 'Owner', 'value': 5},
          ],
        },
      ]);
      await open(tester, fake);
      expect(fake.calls, contains('listReviews'));
      expect(find.text('Clear lessons and a good pace.'), findsNWidgets(2));
      expect(find.text('Ayse Demir'), findsNWidgets(2));
      expect(find.text('An owner quote'), findsNothing);
    },
  );

  testWidgets(
    'plans: the price written as the shop writes it, the switch, the popular one',
    (tester) async {
      await open(tester, api(premiumChildren('pricing')));
      expect(find.text('₺850'), findsOneWidget);
      expect(find.text('₺1,350'), findsOneWidget);
      expect(find.text('/ month'), findsNWidgets(3));
      expect(find.text('Most popular'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('premium-plan-popular')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('premium-period-year')));
      await tester.pump();
      expect(find.text('₺13,500'), findsOneWidget);
      expect(find.text('/ year'), findsNWidgets(3));
      expect(find.text('₺1,350'), findsNothing);
    },
  );

  testWidgets('a plan without its price shows none, never a made-up one', (
    tester,
  ) async {
    await open(
      tester,
      api([
        {
          'id': 'plans',
          'type': 'pricing',
          'entries': [
            {'title': 'Basic', 'price': null, 'text': 'One thing'},
          ],
        },
      ]),
    );
    expect(find.text('Basic'), findsOneWidget);
    expect(find.textContaining('₺'), findsNothing);
    expect(find.text('/ month'), findsNothing);
  });

  testWidgets('numbers count up once to their values, bars fill', (
    tester,
  ) async {
    final children = [
      ...premiumChildren('stats'),
      ...premiumChildren('progress').skip(1),
    ];
    await open(tester, api(children), frames: 2);
    // Still counting.
    final early = tester.widget<Text>(
      find.byKey(const ValueKey('premium-stat-plain-0')),
    );
    expect(early.data, isNot('12,500+'));
    await TestApp.settle(tester, 40);
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('premium-stat-plain-0')))
          .data,
      '12,500+',
    );
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('premium-stat-plain-1')))
          .data,
      '4.9',
    );
    expect(find.bySemanticsLabel(RegExp(r'12,500\+')), findsOneWidget);
    final bar = tester.widget<FractionallySizedBox>(
      find.descendant(
        of: find.byKey(const ValueKey('premium-bar-bars-0')),
        matching: find.byType(FractionallySizedBox),
      ),
    );
    expect(bar.widthFactor, closeTo(0.86, 0.001));
    expect(find.bySemanticsLabel(RegExp('Arabic: 86 percent')), findsOneWidget);
    expect(find.text('96%'), findsOneWidget);
  });

  testWidgets('with reduced motion, the final values at once', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final children = [
      ...premiumChildren('stats'),
      ...premiumChildren('progress').skip(1),
    ];
    await open(tester, api(children), frames: 1);
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('premium-stat-plain-0')))
          .data,
      '12,500+',
    );
    expect(
      tester
          .widget<FractionallySizedBox>(
            find.descendant(
              of: find.byKey(const ValueKey('premium-bar-bars-1')),
              matching: find.byType(FractionallySizedBox),
            ),
          )
          .widthFactor,
      closeTo(0.72, 0.001),
    );
  });

  testWidgets('steps: those up to the active one done, the active one said', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('timeline')));
    expect(
      find.bySemanticsLabel(RegExp('Step 2 of 4, Current step')),
      findsOneWidget,
    );
    final down = tester.getRect(
      find.byKey(const ValueKey('premium-step-down-0')),
    );
    final next = tester.getRect(
      find.byKey(const ValueKey('premium-step-down-1')),
    );
    expect(next.top, greaterThan(down.bottom));
    // 129 The times in a column at the start, monospaced; the class now a
    // card with its chip and its bar.
    final time = tester.getRect(find.text('07:42'));
    expect(time.right, lessThanOrEqualTo(down.left));
    expect(
      tester.widget<Text>(find.text('07:42')).style?.fontFamily,
      'JetBrains Mono',
    );
    final card = find.byKey(const ValueKey('premium-step-card-down'));
    expect(
      find.descendant(of: card, matching: find.text('NOW')),
      findsOneWidget,
    );
    expect(
      tester
          .widget<LinearProgressIndicator>(
            find.byKey(const ValueKey('premium-step-bar-down')),
          )
          .value,
      closeTo(0.4, 0.001),
    );
    // A trip's legs: a bar over each, the first done.
    final leg0 = tester.getRect(
      find.byKey(const ValueKey('premium-leg-across-0')),
    );
    final leg1 = tester.getRect(
      find.byKey(const ValueKey('premium-leg-across-1')),
    );
    expect(leg1.left, greaterThan(leg0.right));
    expect(find.text('SFR 471'), findsOneWidget);
  });

  testWidgets('steps across run from the right in Arabic', (tester) async {
    await open(
      tester,
      api(premiumChildren('timeline', arabic: true)),
      language: 'ar',
    );
    final first = tester.getRect(
      find.byKey(const ValueKey('premium-leg-across-0')),
    );
    final second = tester.getRect(
      find.byKey(const ValueKey('premium-leg-across-1')),
    );
    expect(second.right, lessThan(first.left));
    // The times' column at the start: on the right.
    final time = tester.getRect(find.text('07:42'));
    final dot = tester.getRect(
      find.byKey(const ValueKey('premium-step-down-0')),
    );
    expect(time.left, greaterThanOrEqualTo(dot.right));
  });

  testWidgets('a gold ring around a photo: its ticks, knob and chip', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('progress')));
    final ring = tester.widget<CustomPaint>(
      find.byKey(const ValueKey('premium-ring-hero-0')),
    );
    final painter = ring.painter! as PremiumRingPainter;
    expect(painter.ticks, 18);
    expect(painter.knob, isNotNull);
    expect(painter.share, closeTo(0.61, 0.001));
    expect(
      tester.getSize(find.byKey(const ValueKey('premium-ring-hero-0'))).width,
      226,
    );
    expect(find.text('Lesson 12 of 18'), findsOneWidget);
    // 18 segments, 11 of them full.
    final segments = find.descendant(
      of: find.byKey(const ValueKey('premium-segments-lessons-0')),
      matching: find.byType(FractionallySizedBox),
    );
    expect(segments, findsNWidgets(18));
    final shares = tester
        .widgetList<FractionallySizedBox>(segments)
        .map((f) => f.widthFactor!)
        .toList();
    expect(shares.where((s) => s == 1).length, 10);
    expect(shares[10], greaterThan(0));
    expect(shares[11], 0);
  });

  testWidgets('a hero number at its font, its words small beside it', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('stats')));
    final hero = tester.widget<Text>(
      find.byKey(const ValueKey('premium-stat-hero-0')),
    );
    final span = hero.textSpan! as TextSpan;
    expect(hero.style?.fontSize, 72);
    expect(span.toPlainText(), '6 min');
    final suffix = (span.children!.last as TextSpan).style!;
    expect(suffix.fontSize, lessThan(30));
    // At the start of the page (16 and its 6 inside), not centred.
    expect(
      tester.getRect(find.byKey(const ValueKey('premium-stat-hero-0'))).left,
      closeTo(22, 1),
    );
  });

  testWidgets(
    'a profile card: the photo over the cover, its badges, buttons and links',
    (tester) async {
      await open(tester, api(premiumChildren('profile_card')));
      expect(find.text('Dr. Salma Nour'), findsOneWidget);
      expect(find.text('Teacher of Arabic · Cairo'), findsOneWidget);
      expect(find.text('Top teacher'), findsOneWidget);
      expect(find.text('Book a lesson'), findsOneWidget);
      expect(find.text('Follow'), findsOneWidget);
      expect(find.bySemanticsLabel('Instagram'), findsOneWidget);
      expect(find.bySemanticsLabel('YouTube'), findsOneWidget);
      final card = tester.getRect(
        find.byKey(const ValueKey('studio-node-card')),
      );
      final avatar = tester.getRect(
        find.byKey(const ValueKey('premium-avatar-card')),
      );
      // Over the 120 high cover's foot, in the middle.
      expect(avatar.top, lessThan(card.top + 120));
      expect(avatar.bottom, greaterThan(card.top + 120));
      expect(avatar.center.dx, closeTo(card.center.dx, 0.5));
    },
  );

  test('bento tiles take their cells, the next free ones first', () {
    final places = bentoPlaces([
      StudioTileSize.large,
      StudioTileSize.small,
      StudioTileSize.small,
      StudioTileSize.wide,
      StudioTileSize.tall,
    ], 3);
    expect(places[0], (column: 0, row: 0, across: 2, down: 2));
    expect(places[1], (column: 2, row: 0, across: 1, down: 1));
    expect(places[2], (column: 2, row: 1, across: 1, down: 1));
    expect(places[3], (column: 0, row: 2, across: 2, down: 1));
    expect(places[4], (column: 2, row: 2, across: 1, down: 2));
    // One column: a wide tile is one cell across.
    expect(bentoPlaces([StudioTileSize.wide], 1).single.across, 1);
  });

  testWidgets('a bento grid: the large tile two by two, mirrored in Arabic', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('bento')));
    final large = tester.getRect(
      find.byKey(const ValueKey('premium-tile-grid-0')),
    );
    final small = tester.getRect(
      find.byKey(const ValueKey('premium-tile-grid-1')),
    );
    final full = tester.getRect(
      find.byKey(const ValueKey('premium-tile-grid-3')),
    );
    // 129 The large tile two by two of three columns, the
    // next beside it; the last across all.
    expect(large.height, closeTo(2 * 112 + 10, 0.5));
    expect(small.left, greaterThan(large.right));
    expect(full.width, closeTo(328, 0.5));
    expect(full.top, greaterThan(large.bottom));
    expect(find.text('Zad Club · free over EGP 150'), findsOneWidget);
    // Their words on frosted glass.
    expect(find.byType(BackdropFilter), findsNWidgets(4));
  });

  testWidgets('glass over a photo, a gradient border with a glow', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('glass_card')));
    expect(find.byKey(const ValueKey('premium-glass')), findsOneWidget);
    expect(find.byType(BackdropFilter), findsOneWidget);
    expect(find.byType(PremiumSurface), findsNWidgets(3));
    // 129 A pass perforated as a ticket, with its grain.
    final ticket = tester.widget<PhysicalShape>(
      find.byKey(const ValueKey('premium-ticket')),
    );
    final shape = ticket.clipper as PremiumTicketClipper;
    expect(shape.at, 58);
    final pass = tester.getSize(find.byKey(const ValueKey('premium-ticket')));
    final path = shape.getClip(pass);
    // The notch at the start edge is cut out; inside the card is not.
    expect(path.contains(Offset(2, pass.height * 0.58)), isFalse);
    expect(path.contains(Offset(40, pass.height * 0.58)), isTrue);
    expect(find.byKey(const ValueKey('premium-pattern-grain')), findsOneWidget);
  });

  testWidgets('gradient words and badges', (tester) async {
    await open(tester, api(premiumChildren('badge_text')));
    expect(
      find.byKey(const ValueKey('premium-gradient-text-title')),
      findsOneWidget,
    );
    expect(find.text('Free delivery'), findsOneWidget);
    expect(find.text('-20%'), findsOneWidget);
  });

  testWidgets(
    'a call-to-action bar and a floating button stay above the tabs',
    (tester) async {
      await open(tester, api(premiumChildren('cta_bar')));
      final bar = tester.getRect(find.byKey(const ValueKey('premium-cta-bar')));
      final fab = tester.getRect(find.byKey(const ValueKey('premium-fab-fab')));
      final tabs = tester.getRect(find.text('Account').last);
      expect(bar.bottom, lessThanOrEqualTo(tabs.top));
      expect(fab.bottom, lessThanOrEqualTo(bar.top));
      // At the end side.
      expect(fab.right, greaterThan(bar.center.dx));
      expect(find.text('₺450'), findsOneWidget);
      expect(find.text('Order now'), findsOneWidget);
    },
  );

  testWidgets('a floating card with its icon tile and its two lines', (
    tester,
  ) async {
    await open(tester, api(premiumChildren('cta_bar')));
    final card = find.byKey(const ValueKey('premium-cta-sign'));
    expect(
      find.descendant(
        of: card,
        matching: find.byKey(const ValueKey('premium-cta-lead-sign')),
      ),
      findsOneWidget,
    );
    expect(find.text('Sign: Science museum trip'), findsOneWidget);
    expect(find.text('Next Thursday, 9:00–13:00 · E£350'), findsOneWidget);
    // In from the page's edges: the tile 16, its border and 14 in.
    expect(
      tester.getRect(find.byKey(const ValueKey('premium-cta-lead-sign'))).left,
      closeTo(31, 0.5),
    );
  });

  testWidgets(
    'the small dock: icons only, in the middle, as wide as they are',
    (tester) async {
      await open(
        tester,
        api(
          [
            {'id': 't', 'type': 'text', 'text': 'Docked'},
          ],
          tabBar: {'design': 'dock', 'active': '#E6C26E'},
        ),
      );
      final dock = tester.getRect(find.byKey(const ValueKey('nav-dock')));
      final open0 = tester.getRect(find.byKey(const ValueKey('nav-0-dock')));
      expect(open0.width, 46);
      expect(open0.center.dx, lessThan(180));
      expect(dock.center.dx, closeTo(180, 1));
      // No names under the icons.
      expect(find.text('Home'), findsNothing);
    },
  );

  testWidgets('a page without the new fields draws as before', (tester) async {
    await open(
      tester,
      api([
        {
          'id': 'plain',
          'type': 'column',
          'radius': 20,
          'background': '#FFFFFF',
          'children': [
            {'id': 't', 'type': 'text', 'text': 'As before'},
          ],
        },
      ]),
    );
    expect(find.text('As before'), findsOneWidget);
    expect(find.byType(PremiumSurface), findsNothing);
    expect(find.byType(BackdropFilter), findsNothing);
  });
}
