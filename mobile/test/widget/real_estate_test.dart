import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/web/web_page_screen.dart';
import 'package:yallapp/modules/lms/lesson/video/embed_player.dart';
import 'package:yallapp/modules/lms/lesson/video/video_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi realEstateApi({bool messages = true}) => FakeApi(
  config: configJson(
    lms: null,
    listings: listingsConfigJson(messages: messages),
  ),
);

TestApp realEstateApp(
  FakeApi api, {
  bool signedIn = true,
  AppTemplate template = AppTemplate.classic,
  Map<String, Object> preferences = const {},
}) => TestApp(
  api: api,
  appType: AppType.realEstate,
  signedIn: signedIn,
  guest: !signedIn,
  template: template,
  preferences: preferences,
);

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  // Every Real estate screen on each size, template and theme: any overflow
  // or build error fails.
  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        final name =
            'real estate screens: ${size.key}, ${template.name}, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          final view = tester.view
            ..physicalSize = size.value * 2
            ..devicePixelRatio = 2;
          addTearDown(view.reset);
          final app = realEstateApp(
            realEstateApi(),
            template: template,
            preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
          );
          final semantics = tester.ensureSemantics();
          void clean(String step) =>
              expect(tester.takeException(), isNull, reason: step);

          await app.pump(tester);
          clean('search');
          expect(find.text('Bright apartment with a Nile view'), findsWidgets);
          expect(find.text('EGP 4,250,000'), findsOneWidget);

          await tester.tap(find.bySemanticsLabel('Favorites').last);
          await TestApp.settle(tester);
          clean('favorites');
          expect(find.text('Bright apartment with a Nile view'), findsWidgets);

          await tester.tap(find.bySemanticsLabel(RegExp('^Messages')).last);
          await TestApp.settle(tester);
          clean('messages');
          expect(find.text('Yes, viewings on Saturday.'), findsOneWidget);

          await tester.tap(find.bySemanticsLabel('Account').last);
          await TestApp.settle(tester);
          clean('account');
          expect(find.text('Sara Yilmaz'), findsOneWidget);

          final router = app.container.read(appRouterProvider);
          for (final (location, marker) in [
            ('/listing/42', 'Key facts'),
            ('/messages/7', 'Is it still available?'),
            ('/account/settings', 'Settings'),
          ]) {
            router.push(location);
            await TestApp.settle(tester);
            clean(location);
            expect(find.text(marker), findsWidgets, reason: location);
            if (location == '/listing/42') {
              final page = find.byType(Scrollable).first;
              for (final text in [
                'Elevator',
                'Open in maps',
                'Nile Homes',
                'Garden duplex',
              ]) {
                await tester.scrollUntilVisible(
                  find.text(text).first,
                  200,
                  scrollable: page,
                );
                clean(text);
              }
            }
            router.pop();
            await TestApp.settle(tester);
          }
          semantics.dispose();
        });
      }
    }
  }

  testWidgets('filters, purpose and order go into the search', (tester) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final api = realEstateApi();
    final app = realEstateApp(api);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);
    expect(api.count('getListingFilters'), 1);

    await tester.tap(find.text('For rent').first);
    await TestApp.settle(tester);
    expect(api.lastListingQuery!.purpose, ListingPurpose.rent);

    await tester.tap(find.bySemanticsLabel('Filters'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Villa'));
    await tester.tap(find.text('Cairo'));
    await tester.pump();
    await tester.tap(find.text('Maadi'));
    await tester.ensureVisible(find.text('3+').first);
    await tester.pump();
    await tester.tap(find.text('3+').first);
    await tester.pump();
    await tester.tap(find.text('Show results'));
    await TestApp.settle(tester);

    final query = api.lastListingQuery!;
    expect(query.type, 'villa');
    expect(query.city, 'Cairo');
    expect(query.district, 'Maadi');
    expect(query.bedrooms, 3);
    expect(query.purpose, ListingPurpose.rent);
    expect(query.toQuery()['purpose'], 'rent');
    expect(find.bySemanticsLabel('Filters, 4 active'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel(RegExp('^Sort')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Price: low to high'));
    await TestApp.settle(tester);
    expect(api.lastListingQuery!.toQuery()['sort'], 'price_asc');
    semantics.dispose();
  });

  testWidgets('the heart saves at once and undoes when refused', (
    tester,
  ) async {
    final api = realEstateApi();
    final app = realEstateApp(api);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);

    await tester.tap(find.bySemanticsLabel('Save to favorites').first);
    await tester.pump();
    expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
    await TestApp.settle(tester);
    expect(api.count('addFavorite'), 1);

    api.failures['removeFavorite'] = const ApiException(
      code: 'server_error',
      message: 'Something went wrong. Please try again.',
    );
    await tester.tap(find.bySemanticsLabel('Remove from favorites'));
    await TestApp.settle(tester);
    expect(api.count('removeFavorite'), 1);
    expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
    expect(find.text('Something went wrong. Please try again.'), findsOne);
    semantics.dispose();
  });

  testWidgets('signed out: favorites and messages ask to sign in', (
    tester,
  ) async {
    final api = realEstateApi();
    final app = realEstateApp(api, signedIn: false);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);

    await tester.tap(find.bySemanticsLabel('Favorites').last);
    await TestApp.settle(tester);
    expect(find.text('Save the homes you like'), findsOneWidget);
    expect(api.count('listFavorites'), 0);

    await tester.tap(find.bySemanticsLabel('Messages').last);
    await TestApp.settle(tester);
    expect(find.text('Talk to the office'), findsOneWidget);

    // The heart sends signed-out users to sign in.
    await tester.tap(find.bySemanticsLabel('Home').last);
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Save to favorites').first);
    await TestApp.settle(tester);
    expect(api.count('addFavorite'), 0);
    expect(app.container.read(appRouterProvider).state.uri.path, '/sign-in');
    semantics.dispose();
  });

  testWidgets('message the office, then reply in the conversation', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final api = realEstateApi();
    final app = realEstateApp(api);
    await app.pump(tester);
    // One unread message from the office on the Messages tab.
    expect(find.bySemanticsLabel('Messages, 1'), findsOneWidget);

    app.container.read(appRouterProvider).push('/listing/42');
    await TestApp.settle(tester);
    await tester.tap(find.text('Message the office'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), 'Can I visit on Monday?');
    await tester.tap(find.text('Send'));
    await TestApp.settle(tester);
    expect(api.lastInquiry, 'Can I visit on Monday?');
    expect(find.text('Yes, viewings on Saturday.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Thank you!');
    await tester.tap(find.bySemanticsLabel('Send'));
    await TestApp.settle(tester);
    expect(api.lastReply, 'Thank you!');
    expect(find.text('Thank you!'), findsOneWidget);
  });

  testWidgets('without messages: no Messages tab and no message button', (
    tester,
  ) async {
    final api = realEstateApi(messages: false);
    final app = realEstateApp(api);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);
    expect(find.bySemanticsLabel(RegExp('^Messages')), findsNothing);
    expect(api.count('listInquiries'), 0);

    app.container.read(appRouterProvider).push('/listing/42');
    await TestApp.settle(tester);
    expect(find.text('Key facts'), findsOneWidget);
    expect(find.text('Message the office'), findsNothing);
    semantics.dispose();
  });

  testWidgets(
    "51 a listing's YouTube video plays in the app, never the site's page",
    (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final api = realEstateApi()
        ..listing = {
          ...listingDetailJson(),
          'video_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        };
      final app = realEstateApp(api);
      await app.pump(tester);
      app.container.read(appRouterProvider).push('/listing/42');
      await TestApp.settle(tester);
      await tester.scrollUntilVisible(
        find.text('Watch the video'),
        300,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .last,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Watch the video'));
      await TestApp.settle(tester);
      expect(find.byType(VideoScreen), findsOneWidget);
      expect(find.byType(BrandlessVideo), findsOneWidget);
      expect(find.byType(WebPageScreen), findsNothing);
      final player = app.webViews.requests.lastWhere(
        (r) => r.debugLabel == 'video-player',
      );
      // 72 Our page with YouTube's own player by default (the owner can hide
      // its branding: then it's cropped behind our controls).
      expect(player.html, contains('"site":true'));
      expect(player.interactive, isTrue);
    },
  );
}
