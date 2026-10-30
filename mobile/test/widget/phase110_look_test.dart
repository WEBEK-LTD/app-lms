import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/palette.dart';
import 'package:yallapp/core/widgets/common.dart';
import 'package:yallapp/modules/shared/pages/page_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 110 The look of the page blocks: soft shades under texts on pictures, a
/// band behind the status bar, numbers as tall as their row, one size for
/// the quick links' labels, categories to the screen's edge and a team of
/// one across the row.

FakeApi blocksApi(List<Map<String, dynamic>> blocks, {bool showTitle = true}) =>
    FakeApi(config: configJson())
      ..navigation = navigationJson()
      ..pages = {'home': appPageJson(blocks: blocks, showTitle: showTitle)};

Future<void> pumpBlocks(
  WidgetTester tester,
  List<Map<String, dynamic>> blocks, {
  AppTemplate template = AppTemplate.classic,
  bool showTitle = true,
  double top = 0,
  Size size = const Size(360, 780),
}) async {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2
    ..padding = FakeViewPadding(top: top * 2)
    ..viewPadding = FakeViewPadding(top: top * 2);
  addTearDown(tester.view.reset);
  await TestApp(
    signedIn: true,
    template: template,
    api: blocksApi(blocks, showTitle: showTitle),
  ).pump(tester);
}

void main() {
  testWidgets('texts on a banner and a slide sit on a soft shade, not a band', (
    tester,
  ) async {
    await pumpBlocks(tester, [
      {
        'id': 'b1',
        'type': 'banner',
        'image_url': 'https://cdn.example.com/banner.jpg',
        'heading': 'Autumn intake is open',
        'subheading': 'Start any course this week',
      },
      {
        'id': 's1',
        'type': 'slider',
        'auto_advance': false,
        'slides': [
          {
            'image_url': 'https://cdn.example.com/slide.jpg',
            'heading': 'New term, new courses',
          },
        ],
      },
    ]);
    final shades = find.byKey(const ValueKey('text-scrim'));
    expect(shades, findsNWidgets(2));
    for (final shade in tester.widgetList<DecoratedBox>(shades)) {
      final gradient =
          (shade.decoration as BoxDecoration).gradient! as LinearGradient;
      // Clear at the top, dark under the text.
      expect(gradient.colors.first.a, 0);
      expect(gradient.colors.last.a, greaterThan(0.7));
    }
    // The shade reaches above the text.
    for (final heading in ['Autumn intake is open', 'New term, new courses']) {
      final text = tester.getRect(find.text(heading));
      final shade = tester.getRect(
        find.ancestor(of: find.text(heading), matching: shades),
      );
      expect(text.top - shade.top, greaterThanOrEqualTo(TextScrim.defaultFade));
    }
  });

  for (final template in AppTemplate.values) {
    testWidgets('a band behind the status bar, in the page\'s colour '
        '(${template.name})', (tester) async {
      await pumpBlocks(
        tester,
        allBlocksJson(),
        template: template,
        showTitle: false,
        top: 28,
      );
      final band = find.byKey(const ValueKey('status-bar-backdrop'));
      expect(band, findsOneWidget);
      expect(tester.getRect(band), const Rect.fromLTWH(0, 0, 360, 28));
      final context = tester.element(find.byType(AppPageView));
      final color = tester
          .widget<ColoredBox>(
            find.descendant(of: band, matching: find.byType(ColoredBox)),
          )
          .color;
      expect(color, context.palette.background);
      // Still there once the page scrolls under it.
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -400));
      await tester.pump();
      expect(band, findsOneWidget);
    });
  }

  testWidgets('the bold header keeps its colour behind the status bar', (
    tester,
  ) async {
    await pumpBlocks(
      tester,
      allBlocksJson(),
      template: AppTemplate.bold,
      top: 28,
    );
    final band = find.byKey(const ValueKey('status-bar-backdrop'));
    final context = tester.element(find.byType(AppPageView));
    expect(
      tester
          .widget<ColoredBox>(
            find.descendant(of: band, matching: find.byType(ColoredBox)),
          )
          .color,
      context.palette.primary,
    );
  });

  for (final template in AppTemplate.values) {
    testWidgets('numbers in a row are as tall as each other '
        '(${template.name})', (tester) async {
      await pumpBlocks(tester, [
        {
          'id': 'n1',
          'type': 'stats',
          'stats': [
            {'value': '12k+', 'label': 'All'},
            {'value': '4.9', 'label': 'Average rating from our students'},
            {'value': '120', 'label': 'New'},
          ],
        },
      ], template: template);
      final heights = [
        for (var i = 0; i < 3; i++)
          tester.getSize(find.byKey(ValueKey('stat-$i'))).height,
      ];
      expect(heights.toSet(), hasLength(1));
      // The two-line label made the row taller than one line would.
      final one = tester.getSize(find.text('All')).height;
      final two = tester
          .getSize(find.text('Average rating from our students'))
          .height;
      expect(two, greaterThan(one * 1.5));
    });
  }

  testWidgets('four numbers on a phone: two rows of two, equal in each row', (
    tester,
  ) async {
    await pumpBlocks(tester, [
      {
        'id': 'n1',
        'type': 'stats',
        'stats': [
          {'value': '12k+', 'label': 'Students'},
          {'value': '4.9', 'label': 'Average rating from our students'},
          {'value': '120', 'label': 'Courses'},
          {'value': '24/7', 'label': 'Access'},
        ],
      },
    ]);
    Rect at(int i) => tester.getRect(find.byKey(ValueKey('stat-$i')));
    expect(at(0).height, at(1).height);
    expect(at(2).height, at(3).height);
    expect(at(0).top, at(1).top);
    expect(at(2).top, greaterThan(at(0).bottom));
  });

  for (final style in ['grid', 'row']) {
    testWidgets('quick links: one size for every label, tiles from the top '
        '($style)', (tester) async {
      await pumpBlocks(tester, [
        {
          'id': 'q1',
          'type': 'quick_links',
          'style': style,
          'links': [
            for (final label in [
              'Book a visit',
              'Appointments',
              'Reminders',
              'Account',
            ])
              {
                'icon': 'event',
                'label': label,
                'action': {'type': 'screen', 'screen': 'courses'},
              },
          ],
        },
      ], size: const Size(320, 640));
      final labels = ['Book a visit', 'Appointments', 'Reminders', 'Account'];
      final sizes = {
        for (final l in labels)
          tester.widget<Text>(find.text(l)).style!.fontSize,
      };
      expect(sizes, hasLength(1));
      // Smaller than the designed 12.5, for the longest word.
      expect(sizes.single, lessThan(12.5));
      // Every label starts at the same height, on one or two lines.
      final tops = {for (final l in labels) tester.getRect(find.text(l)).top};
      expect(tops, hasLength(1));
      for (final l in labels) {
        expect(tester.widget<Text>(find.text(l)).maxLines, 2);
      }
    });
  }

  testWidgets('category chips run to the screen\'s edge like the carousels', (
    tester,
  ) async {
    await pumpBlocks(tester, [
      {
        'id': 'k1',
        'type': 'categories',
        'source': 'courses',
        'style': 'chips',
        'categories': [
          for (var i = 1; i <= 8; i++)
            {'id': i, 'name': 'Category $i', 'count': i},
        ],
      },
    ]);
    final list = tester.widget<ListView>(
      find
          .ancestor(
            of: find.text('Category 1'),
            matching: find.byType(ListView),
          )
          .first,
    );
    expect(list.clipBehavior, Clip.none);
    // The first chip starts at the page's margin.
    expect(tester.getRect(find.text('Category 1')).left, greaterThan(20));
    // The row reaches past the margin to the screen's edge.
    final row = tester.getRect(
      find
          .ancestor(
            of: find.text('Category 1'),
            matching: find.byType(ListView),
          )
          .first,
    );
    expect(row.right, lessThan(360));
    // A chip is drawn past the row's end, into the margin.
    final rights = [
      for (var i = 1; i <= 8; i++)
        if (find.text('Category $i').evaluate().isNotEmpty)
          tester.getRect(find.text('Category $i')).right,
    ];
    expect(rights.any((r) => r > row.right), isTrue);
  });

  testWidgets('a team of one in a carousel: one card across the row', (
    tester,
  ) async {
    await pumpBlocks(tester, [
      {
        'id': 't1',
        'type': 'team',
        'title': 'Our coach',
        'layout': 'carousel',
        'people': [
          {
            'name': 'Ayse Demir',
            'role': 'Head coach',
            'bio': 'Ten years of coaching beginners.',
          },
        ],
      },
    ]);
    final card = find.byKey(const ValueKey('team-single'));
    expect(card, findsOneWidget);
    // As wide as the page's text (20 point margins), with the bio.
    expect(tester.getRect(card).width, 320);
    expect(find.text('Ten years of coaching beginners.'), findsOneWidget);
  });

  testWidgets('a team of two stays a carousel', (tester) async {
    await pumpBlocks(tester, [
      {
        'id': 't1',
        'type': 'team',
        'layout': 'carousel',
        'people': [
          {'name': 'Ayse Demir'},
          {'name': 'Mehmet Kaya'},
        ],
      },
    ]);
    expect(find.byKey(const ValueKey('team-single')), findsNothing);
    expect(tester.getSize(find.text('Ayse Demir')).width, lessThan(160));
  });
}
