import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../screenshots/support/screens.dart';
import '../support/samsung_layout.dart';

/// 163 Leqaa's signature template (both looks) on a Samsung's settings:
/// its text size (font scale 1.0, 1.15, 1.3, 1.5), its display zoom (360
/// and 384 points wide at a higher density, 412 at the standard one) and
/// its navigation bar (three buttons, 48; the gesture bar, 24), in Arabic
/// and English, by day and by night, drawn by the real app from the
/// project the platform makes (test/support/signatures/flowers_`look`.json).
/// Nothing may overflow, spill out of its element or its card, draw its
/// letters over another card, go past the screen's side, or stay under the
/// tab bar or the phone's bar once the page is scrolled to its end
/// (support/samsung_layout.dart).
///
/// The owner (18 November): "On Samsung phones, and some other phones,
/// the app has a terrible amount of errors" — the Orders tab in Arabic:
/// its title over the journey's card, "ابدأ التسوق" under the navigation
/// bar.
void main() {
  setUpAll(loadAppFonts);

  // Where the last of a list stays under the tab bar (or the phone's bar)
  // at the list's end: a page that doesn't scroll to its end, which
  // wip-page-scroll fixes. Their other checks hold here.
  const scrollingElsewhere = {'account', 'shop', 'wishlist'};

  group('163.1 every page of both looks', () {
    for (final look in ['a', 'b']) {
      for (final slug in leqaaPageSlugs(look)) {
        for (final (language, dark) in [
          ('ar', false),
          ('en', false),
          ('ar', true),
          ('en', true),
        ]) {
          for (final phone in [samsungHardest, samsungCommon]) {
            final mode = dark ? 'dark' : 'light';
            testWidgets('$look $slug $language $mode, $phone', (tester) async {
              final problems = LayoutProblems();
              await openLeqaaPage(
                tester,
                look: look,
                slug: slug,
                phone: phone,
                problems: problems,
                language: language,
                dark: dark,
              );
              await checkLayout(
                tester,
                phone,
                problems,
                atEnd: !scrollingElsewhere.contains(slug),
              );
              expect(problems.list, isEmpty, reason: '$problems');
            });
          }
        }
      }
    }
  });

  group('163.2 the Orders tab on every Samsung setting', () {
    for (final look in ['a', 'b']) {
      for (final language in ['ar', 'en']) {
        for (final withOrder in [false, true]) {
          for (final phone in samsungMatrix) {
            final orders = withOrder ? 'an order' : 'no orders';
            testWidgets('$look $language $orders, $phone', (tester) async {
              final problems = LayoutProblems();
              await openLeqaaPage(
                tester,
                look: look,
                slug: 'orders',
                phone: phone,
                problems: problems,
                language: language,
                withOrder: withOrder,
              );
              await checkLayout(tester, phone, problems);
              expect(problems.list, isEmpty, reason: '$problems');
            });
          }
        }
      }
    }
  });

  group('163.3 the Orders tab as the owner saw it', () {
    // A Galaxy zoomed in (384 points), three-button navigation, Arabic.
    const galaxy = PhoneSettings(
      width: 384,
      height: 832,
      density: 2.8125,
      fontScale: 1,
      bottom: 48,
    );

    testWidgets("the title's letters stay above the journey's card", (
      tester,
    ) async {
      final problems = LayoutProblems();
      // 171 The journey and its title show with an order to follow.
      await openLeqaaPage(
        tester,
        look: 'a',
        slug: 'orders',
        phone: galaxy,
        problems: problems,
        language: 'ar',
        withOrder: true,
      );
      final title = tester.renderObject<RenderParagraph>(
        find.text('رحلة زهورك إليهم'),
      );
      // Its line holds Readex Pro's letters (1.5 of its size at least).
      expect(title.size.height, greaterThanOrEqualTo(27 * 1.5 - 0.5));
      await checkLayout(tester, galaxy, problems, atEnd: false);
      expect(problems.list, isEmpty, reason: '$problems');
    });

    // "ابدأ التسوق" under the phone's bar before the page is scrolled is
    // wip-page-scroll's (the coordinating session, 18 November); scrolled
    // to its end it is above the bar (163.2).

    // The steps over the orders follow the person's order on its way
    // (132.160, 132.187). 171 Without one, no sample steps (they showed the
    // template's, its first step lit): the Orders page's own "No orders yet".
    testWidgets('no orders: no sample steps, the page\'s own empty state', (
      tester,
    ) async {
      await openLeqaaPage(
        tester,
        look: 'a',
        slug: 'orders',
        phone: galaxy,
        problems: LayoutProblems(),
        language: 'ar',
      );
      expect(find.text('تم الطلب'), findsNothing);
      expect(find.textContaining('5107'), findsNothing);
      expect(find.text('لا توجد طلبات بعد'), findsOneWidget);
    });

    testWidgets('an order on its way: its number, its step lit', (
      tester,
    ) async {
      await openLeqaaPage(
        tester,
        look: 'a',
        slug: 'orders',
        phone: galaxy,
        problems: LayoutProblems(),
        language: 'en',
        withOrder: true,
      );
      expect(find.textContaining('5107'), findsWidgets);
      expect(find.text('No orders yet'), findsNothing);
    });
  });

  group('163.4 as designed at the standard text size', () {
    testWidgets('Latin keeps its line height, the cover its height', (
      tester,
    ) async {
      // 171 The journey's title shows with an order to follow.
      await openLeqaaPage(
        tester,
        look: 'a',
        slug: 'orders',
        phone: samsungCommon,
        problems: LayoutProblems(),
        withOrder: true,
      );
      // Fraunces at 27 on its designed 1.04.
      final title = tester.renderObject<RenderParagraph>(
        find.text('How your flowers travel'),
      );
      expect(title.size.height, closeTo(27 * 1.04, 1));
    });

    testWidgets("the home's photo cover is its 300 points", (tester) async {
      await openLeqaaPage(
        tester,
        look: 'a',
        slug: 'home',
        phone: samsungCommon,
        problems: LayoutProblems(),
      );
      final cover = find.byKey(const ValueKey('studio-cover-sig-87'));
      await tester.scrollUntilVisible(cover, 300, scrollable: _page);
      expect(tester.getSize(cover).height, 300);
    });
  });

  testWidgets("163.6 a testimonial's quote mark is drawn whole", (
    tester,
  ) async {
    await openLeqaaPage(
      tester,
      look: 'a',
      slug: 'home',
      phone: samsungCommon,
      problems: LayoutProblems(),
    );
    final mark = find.byIcon(Symbols.format_quote_rounded);
    await tester.scrollUntilVisible(mark.first, 300, scrollable: _page);
    // Its Stack doesn't cut it where it reaches into the card's padding.
    final stack = tester.widget<Stack>(
      find.ancestor(of: mark.first, matching: find.byType(Stack)).first,
    );
    expect(stack.clipBehavior, Clip.none);
  });

  // 163.11 The occasions' rings on the shop (Leqaa's tester: "Sympat…",
  // "New ba…" at 130%): each name whole, on two lines when it needs them.
  group('163.11 the occasion rings name each occasion whole', () {
    for (final look in ['a', 'b']) {
      for (final language in ['en', 'ar', 'tr']) {
        for (final scale in [1.0, 1.3, 2.0]) {
          final phone = PhoneSettings(
            width: 360,
            height: 780,
            density: 3,
            fontScale: scale,
            bottom: 48,
          );
          testWidgets('$look $language at ${(scale * 100).round()}%', (
            tester,
          ) async {
            await openLeqaaPage(
              tester,
              look: look,
              slug: 'shop',
              phone: phone,
              problems: LayoutProblems(),
              language: language,
            );
            final tiles = find.byWidgetPredicate(
              (w) =>
                  w is GestureDetector &&
                  '${w.key}'.contains('studio-story-') &&
                  !'${w.key}'.contains('ring'),
            );
            expect(tiles, findsNWidgets(5));
            for (final tile in tiles.evaluate()) {
              final label = find
                  .descendant(
                    of: find.byElementPredicate((e) => e == tile),
                    matching: find.byType(RichText),
                  )
                  .evaluate()
                  .map((e) => e.renderObject! as RenderParagraph)
                  .where((p) => p.maxLines == 2)
                  .single;
              final name = label.text.toPlainText();
              expect(label.didExceedMaxLines, isFalse, reason: name);
              // No word broken across lines: each fits the label's width.
              for (final word in name.split(RegExp(r'\s+'))) {
                final painter = TextPainter(
                  text: TextSpan(text: word, style: label.text.style),
                  textDirection: label.textDirection,
                  textScaler: label.textScaler,
                )..layout();
                expect(
                  painter.width,
                  lessThanOrEqualTo(label.constraints.maxWidth + 0.5),
                  reason: '"$word" of "$name"',
                );
                painter.dispose();
              }
            }
          });
        }
      }
    }
  });

  // 163.12 Look B's price list (Kech Flora's: "Blush Ga…" at 390 points):
  // a product's name takes a second line before it is cut.
  group("163.12 the price list's names aren't cut", () {
    for (final language in ['en', 'ar']) {
      for (final width in [360.0, 390.0, 412.0]) {
        for (final scale in [1.0, 1.3]) {
          final phone = PhoneSettings(
            width: width,
            height: width * 2.17,
            density: 1080 / width,
            fontScale: scale,
            bottom: 48,
          );
          testWidgets('$language, ${width.round()} pt, '
              '${(scale * 100).round()}%', (tester) async {
            await openLeqaaPage(
              tester,
              look: 'b',
              slug: 'home',
              phone: phone,
              problems: LayoutProblems(),
              language: language,
            );
            final list = find.byKey(const ValueKey('studio-node-sig-89'));
            await tester.scrollUntilVisible(list, 300, scrollable: _page);
            await tester.pump(const Duration(milliseconds: 600));
            final names = find
                .descendant(
                  of: list,
                  matching: find.byWidgetPredicate(
                    (w) =>
                        w is KeyedSubtree &&
                        '${w.key}'.contains('studio-node-sig-93'),
                  ),
                )
                .evaluate()
                .toList();
            expect(names, isNotEmpty);
            for (final name in names) {
              final paragraph =
                  find
                          .descendant(
                            of: find.byElementPredicate((e) => e == name),
                            matching: find.byType(RichText),
                          )
                          .evaluate()
                          .first
                          .renderObject!
                      as RenderParagraph;
              expect(
                paragraph.didExceedMaxLines,
                isFalse,
                reason: paragraph.text.toPlainText(),
              );
            }
          });
        }
      }
    }
  });

  // 163.13 "Build your bouquet" (صمّم باقتك) at a larger text size: look A's
  // photo cover (300 points as designed) grows with its words and button;
  // look B's section holds them. Nothing overflows or spills out of it.
  group('163.13 "Build your bouquet" holds its words', () {
    for (final (look, id) in [('a', 'sig-87'), ('b', 'sig-96')]) {
      for (final language in ['ar', 'en', 'tr']) {
        for (final scale in [1.3, 1.5]) {
          final phone = PhoneSettings(
            width: 360,
            height: 780,
            density: 3,
            fontScale: scale,
            bottom: 48,
          );
          testWidgets('$look $language at ${(scale * 100).round()}%', (
            tester,
          ) async {
            final problems = LayoutProblems();
            await openLeqaaPage(
              tester,
              look: look,
              slug: 'home',
              phone: phone,
              problems: problems,
              language: language,
            );
            final section = find.byKey(ValueKey('studio-node-$id'));
            await tester.scrollUntilVisible(section, 300, scrollable: _page);
            await tester.pump(const Duration(milliseconds: 600));
            await checkLayout(tester, phone, problems, atEnd: false);
            expect(problems.list, isEmpty, reason: '$problems');
            // Its button whole inside it.
            final box = tester.getRect(section);
            final button = find.descendant(
              of: section,
              matching: find.byType(RichText),
            );
            for (final e in button.evaluate()) {
              final r = tester.getRect(find.byElementPredicate((x) => x == e));
              expect(r.bottom, lessThanOrEqualTo(box.bottom + 1));
            }
          });
        }
      }
    }
  });

  group('163.5 the rules', () {
    test('Arabic is never under 1.5; Latin and unset as designed', () {
      expect(studioLineHeight(1.04, 'رحلة زهورك إليهم'), 1.5);
      expect(studioLineHeight(1.6, 'رحلة'), 1.6);
      expect(studioLineHeight(1.04, 'How your flowers travel'), 1.04);
      expect(studioLineHeight(null, 'رحلة'), isNull);
      expect(studioLineHeight(1.04, null), 1.04);
    });

    StudioNode text(String id, {int? maxLines}) => StudioNode.tryParse({
      'id': id,
      'type': 'text',
      'text': id,
      'max_lines': ?maxLines,
    })!;

    test('in a row, the last of its texts cut to their lines gives way', () {
      final price = text('price', maxLines: 1);
      final was = text('was', maxLines: 1);
      expect(studioTextGivingWay([price, was]), same(was));
      expect(studioTextGivingWay([price, text('plain')]), same(price));
      expect(studioTextGivingWay([text('a'), text('b')]), isNull);
    });
  });
}

/// The page's own list (the first that scrolls down).
final _page = find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;
