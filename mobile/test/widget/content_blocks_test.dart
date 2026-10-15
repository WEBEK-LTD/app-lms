import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 33 The blocks whose content the owner writes, in every template, light
/// and dark, on a small phone and a tablet, and right to left.

/// A Monday at 10:00 on the phone's clock: open.
final monday10 = DateTime(2026, 10, 12, 10);

FakeApi contentApi({
  String teamLayout = 'carousel',
  String linksStyle = 'grid',
  String countdownEnds = '2099-01-01T00:00:00Z',
  List<String> languages = const ['en'],
}) =>
    FakeApi(
        config: configJson(languages: languagesJson(available: languages)),
      )
      ..navigation = navigationJson()
      ..pages = {
        'home': appPageJson(
          blocks: contentBlocksJson(
            teamLayout: teamLayout,
            linksStyle: linksStyle,
            countdownEnds: countdownEnds,
          ),
        ),
      };

/// Texts that show each block, in page order.
const contentMarkers = [
  'New term, new courses', // slider
  'All courses', // quick links
  'In numbers', // stats
  'What students say', // testimonials
  'How do I start a course?', // faq
  'Term starts in', // countdown
  'Contact us', // contact
  'Opening hours', // hours
  'Follow us', // social
  'Our teachers', // team
  'The campus is closed on Friday for the holiday.', // notice
];

TestApp contentApp({
  required FakeApi api,
  AppTemplate template = AppTemplate.classic,
  bool dark = false,
  String language = 'en',
  DateTime? now,
  List<String>? opened,
}) => TestApp(
  signedIn: true,
  template: template,
  api: api,
  preferences: {
    'settings.theme_mode': dark ? 'dark' : 'light',
    'settings.language': language,
  },
  overrides: [
    pageClockProvider.overrideWithValue(() => now ?? monday10),
    if (opened != null)
      openExternalProvider.overrideWithValue((url) async {
        opened.add(url);
        return true;
      }),
  ],
);

Future<void> scrollTo(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pump();
}

void main() {
  const sizes = {'small phone': Size(320, 568), 'tablet': Size(768, 1024)};

  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        for (final (team, links) in [
          ('carousel', 'grid'),
          ('grid', 'row'),
          ('list', 'grid'),
        ]) {
          final name =
              'content blocks: ${size.key}, ${template.name}, '
              '${dark ? 'dark' : 'light'}, team $team, links $links';
          testWidgets(name, (tester) async {
            tester.view
              ..physicalSize = size.value * 2
              ..devicePixelRatio = 2;
            addTearDown(tester.view.reset);
            final app = contentApp(
              api: contentApi(teamLayout: team, linksStyle: links),
              template: template,
              dark: dark,
            );
            await app.pump(tester);
            expect(tester.takeException(), isNull, reason: 'first frame');
            for (final marker in contentMarkers) {
              await scrollTo(tester, find.text(marker).first);
              expect(tester.takeException(), isNull, reason: marker);
            }
            // Entries the app can't use are skipped, not the block.
            expect(find.text('Nothing to show'), findsNothing);
            expect(find.text('Teleport'), findsNothing);
            expect(find.text('Instagram'), findsOneWidget);
            expect(find.textContaining('myspace'), findsNothing);
          });
        }
      }
    }
  }

  for (final template in AppTemplate.values) {
    testWidgets('right to left in Arabic: slider, hours and contact '
        '(${template.name})', (tester) async {
      tester.view
        ..physicalSize = const Size(360, 780) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final opened = <String>[];
      final app = contentApp(
        api: contentApi(languages: const ['en', 'ar']),
        template: template,
        language: 'ar',
        opened: opened,
      );
      await app.pump(tester);
      expect(tester.takeException(), isNull);
      final slide = find.text('New term, new courses');
      expect(slide, findsOneWidget);
      expect(Directionality.of(tester.element(slide)), TextDirection.rtl);
      // The slide's text starts on the right.
      final page = tester.getRect(find.byType(PageView));
      expect(tester.getRect(slide).right, closeTo(page.right - 20, 2));

      await scrollTo(tester, find.text('مفتوح الآن'));
      // Weekdays in Arabic, Monday first; times left to right.
      expect(find.text('الاثنين'), findsOneWidget);
      expect(find.text('\u206609:00–17:00\u2069'), findsNWidgets(2));
      expect(find.text('مغلق'), findsWidgets);

      await scrollTo(tester, find.text('الاتجاهات'));
      expect(tester.takeException(), isNull);
      for (final label in [
        'اتصال',
        'واتساب',
        'البريد الإلكتروني',
        'الموقع الإلكتروني',
      ]) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
      await tester.tap(find.text('الاتجاهات'));
      expect(
        opened.single,
        'https://www.google.com/maps/search/?api=1&query=29.96,31.25',
      );
    });
  }

  // One app per test: each opens the page at another time.
  for (final (now, status, why) in [
    (monday10, 'Open now', 'Monday morning'),
    (DateTime(2026, 10, 12, 17, 30), 'Closed now', 'after closing'),
    (DateTime(2026, 10, 17, 14), 'Closed now', "Saturday's break"),
    (DateTime(2026, 10, 17, 15, 1), 'Open now', 'Saturday afternoon'),
    (
      DateTime(2026, 10, 17, 1, 30),
      'Open now',
      "Friday's night after midnight",
    ),
    (DateTime(2026, 10, 17, 2, 30), 'Closed now', 'after the night closes'),
    (DateTime(2026, 12, 25, 20), 'Closed now', 'a holiday (a Friday)'),
  ]) {
    testWidgets('opening hours: $status on $why', (tester) async {
      final app = contentApp(api: contentApi(), now: now);
      await app.pump(tester);
      await scrollTo(tester, find.text('Closed on public holidays.'));
      expect(find.text(status), findsOneWidget);
    });
  }

  testWidgets('countdown: counts down to the end', (tester) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final app = contentApp(
      api: contentApi(countdownEnds: '2026-10-14T12:30:15'),
    );
    await app.pump(tester);
    await scrollTo(tester, find.text('See courses'));
    // Two days, two hours, thirty minutes and fifteen seconds after Monday 10:00.
    expect(
      find.bySemanticsLabel('2 Days, 2 Hours, 30 Min, 15 Sec'),
      findsOneWidget,
    );
  });

  testWidgets('countdown: left out once it has ended without a text', (
    tester,
  ) async {
    final app = contentApp(
      api: contentApi(countdownEnds: '2026-10-01T00:00:00Z'),
    );
    await app.pump(tester);
    await scrollTo(tester, find.text('Contact us'));
    expect(find.text('Term starts in'), findsNothing);
  });

  testWidgets('quick links, contact and social open what they say', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final opened = <String>[];
    final app = contentApp(api: contentApi(), opened: opened);
    await app.pump(tester);
    await scrollTo(tester, find.text('Call'));
    for (final label in ['Call', 'WhatsApp', 'Email', 'Website', 'YouTube']) {
      await scrollTo(tester, find.text(label));
      await tester.tap(find.text(label));
    }
    expect(opened, [
      'tel:+201001234567',
      'https://wa.me/201001234567',
      'mailto:hello@academy.example',
      'https://academy.example',
      'https://youtube.com/@academy',
    ]);

    await tester.scrollUntilVisible(
      find.text('All courses'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('All courses'));
    await TestApp.settle(tester);
    expect(find.text('Catalog'), findsWidgets);
  });

  testWidgets('the slider moves on its own until touched, and answers', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final app = contentApp(api: contentApi());
    await app.pump(tester);
    expect(find.text('New term, new courses'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await TestApp.settle(tester);
    expect(find.text('Learn on your phone'), findsOneWidget);
    // FAQ answers open on tap.
    await scrollTo(tester, find.text('Can I learn offline?'));
    expect(find.text('Yes, download lessons.'), findsNothing);
    await tester.tap(find.text('Can I learn offline?'));
    await TestApp.settle(tester);
    expect(find.text('Yes, download lessons.'), findsOneWidget);
  });
}
