import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi pagesApi({String layout = 'carousel'}) => FakeApi()
  ..navigation = navigationJson()
  ..pages = {'home': appPageJson(blocks: allBlocksJson(layout: layout))};

/// Texts that show each block (in page order).
const blockMarkers = [
  'Autumn intake is open', // banner
  'About us', // text
  'Welcome', // video (YouTube)
  'Campus tour', // video (MP4)
  'See all courses', // button, filled
  'Our website', // button, outlined
  'Something new', // button, text (unknown action)
  'Popular courses', // items
  'Business English',
  'Categories', // categories, tiles
  'Find your next course', // search
  'Pick up where you left off', // continue learning
  'Timetable', // embed
];

void main() {
  const sizes = {'small phone': Size(320, 568), 'tablet': Size(768, 1024)};

  // Every block in every template, at a small phone and a tablet size, with
  // each list layout. Any overflow or build error fails.
  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final layout in ['carousel', 'grid', 'list']) {
        for (final dark in [false, true]) {
          final name =
              'page blocks: ${size.key}, ${template.name}, $layout, '
              '${dark ? 'dark' : 'light'}';
          testWidgets(name, (tester) async {
            final view = tester.view
              ..physicalSize = size.value * 2
              ..devicePixelRatio = 2;
            addTearDown(view.reset);
            final app = TestApp(
              signedIn: true,
              template: template,
              api: pagesApi(layout: layout),
              preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
            );
            await app.pump(tester);
            expect(tester.takeException(), isNull, reason: 'first frame');
            expect(find.text('Discover'), findsWidgets);

            final page = find.byType(Scrollable).first;
            for (final marker in blockMarkers) {
              await tester.scrollUntilVisible(
                find.text(marker).first,
                200,
                scrollable: page,
              );
              await tester.pump();
              expect(tester.takeException(), isNull, reason: marker);
            }
            await tester.drag(page, const Offset(0, -2000));
            await TestApp.settle(tester);
            expect(tester.takeException(), isNull, reason: 'end');
            // The block type the app doesn't know is skipped.
            expect(find.text('From the future'), findsNothing);
            // YouTube and the embed load as web views.
            expect(app.webViews.requests, isNotEmpty);
          });
        }
      }
    }
  }

  testWidgets('tabs come from /pages', (tester) async {
    final api = pagesApi();
    final app = TestApp(signedIn: true, api: api);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);

    expect(api.count('getPages'), 1);
    expect(find.text('Discover'), findsWidgets);
    expect(find.text('Catalog'), findsOneWidget);
    expect(find.text('Me'), findsOneWidget);
    // The tab with a target this app doesn't know is left out, and the
    // built-in tabs are replaced.
    expect(find.text('Later'), findsNothing);
    expect(find.text('My courses'), findsNothing);
    // The native home isn't shown.
    expect(find.text('Search for a course'), findsNothing);

    await tester.tap(find.bySemanticsLabel('Catalog').last);
    await TestApp.settle(tester);
    expect(find.text('All courses'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Me').last);
    await TestApp.settle(tester);
    expect(find.text('Sara Yilmaz'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Discover').last);
    await TestApp.settle(tester);
    expect(find.text('Autumn intake is open'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('buttons and cards open built-in screens and courses', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final app = TestApp(signedIn: true, api: pagesApi());
    await app.pump(tester);

    // A course banner opens the course page on top of the tabs.
    await tester.tap(find.text('Autumn intake is open'));
    await TestApp.settle(tester);
    expect(find.text('UI Design Fundamentals'), findsWidgets);
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester);

    // A `screen` action to a tab switches to it.
    await tester.ensureVisible(find.text('See all courses'));
    await TestApp.settle(tester);
    await tester.tap(find.text('See all courses'));
    await TestApp.settle(tester);
    expect(find.text('All courses'), findsOneWidget);
  });

  testWidgets('a site without /pages keeps the built-in tabs and /home', (
    tester,
  ) async {
    final api = FakeApi();
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);

    expect(api.count('getPages'), 1);
    expect(api.count('getHome'), 1);
    expect(find.text('Search for a course'), findsOneWidget);
    for (final tab in ['Home', 'Courses', 'My courses', 'Account']) {
      expect(find.text(tab), findsWidgets, reason: tab);
    }
  });

  testWidgets('too few usable tabs falls back to the built-in tabs', (
    tester,
  ) async {
    final api = FakeApi()
      ..navigation = navigationJson(
        tabs: [
          navTabJson('a', 'Discover', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          // Bookings screens don't exist in an Academy app.
          navTabJson('b', 'Book', 'event', {
            'type': 'screen',
            'screen': 'services',
          }),
        ],
      );
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    expect(find.text('Search for a course'), findsOneWidget);
    expect(find.text('My courses'), findsWidgets);
  });

  testWidgets('a page that is missing shows an error, not a crash', (
    tester,
  ) async {
    final api = pagesApi()..pages = {};
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    expect(tester.takeException(), isNull);
    expect(find.text("We couldn't find what you were looking for."), findsOne);
  });
}
