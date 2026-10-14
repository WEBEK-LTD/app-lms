import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_registration.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/news/data/news_providers.dart';
import 'package:yallapp/modules/news/widgets/article_widgets.dart';
import 'package:yallapp/modules/shared/pages/page_actions.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi newsApi({bool push = true}) => FakeApi(
  config: {
    ...configJson(lms: null),
    'news': newsConfigJson(push: push),
  },
);

TestApp newsApp(
  FakeApi api, {
  bool signedIn = false,
  AppTemplate template = AppTemplate.classic,
  Map<String, Object> preferences = const {},
  List<String>? shared,
  bool push = false,
}) => TestApp(
  api: api,
  appType: AppType.news,
  signedIn: signedIn,
  guest: !signedIn,
  template: template,
  preferences: preferences,
  overrides: [
    if (shared != null)
      shareArticleProvider.overrideWithValue((text) async => shared.add(text)),
    if (push) pushEnabledProvider.overrideWithValue(true),
  ],
);

void usePhone(WidgetTester tester, [Size size = const Size(390, 844)]) {
  final view = tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  // Every News & blog screen on each size, template and theme, signed out
  // (reading needs no account): any overflow or build error fails.
  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        final name =
            'news screens: ${size.key}, ${template.name}, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          usePhone(tester, size.value);
          final app = newsApp(
            newsApi(),
            template: template,
            preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
          );
          final semantics = tester.ensureSemantics();
          void clean(String step) =>
              expect(tester.takeException(), isNull, reason: step);

          await app.pump(tester);
          clean('home');
          expect(find.text('Top stories'), findsOneWidget);
          expect(
            find.text('Night ferries return to the harbour'),
            findsWidgets,
          );
          await tester.drag(
            find.byType(Scrollable).first,
            const Offset(0, -500),
          );
          await TestApp.settle(tester);
          clean('home end');
          expect(find.text('A late goal wins the derby'), findsWidgets);

          await tester.tap(find.bySemanticsLabel('Latest').last);
          await TestApp.settle(tester);
          clean('latest');
          expect(find.text('Sport'), findsWidgets);
          expect(find.text('A late goal wins the derby'), findsOneWidget);

          await tester.tap(find.bySemanticsLabel('Saved').last);
          await TestApp.settle(tester);
          clean('saved');
          expect(find.text('No saved articles'), findsOneWidget);

          final router = app.container.read(appRouterProvider);
          router.push(Paths.article('1042'));
          await TestApp.settle(tester);
          clean('article');
          expect(find.text('Why now', findRichText: true), findsOneWidget);
          expect(find.textContaining('By Ayla Demir'), findsOneWidget);
          await tester.scrollUntilVisible(
            find.text('Read on the website'),
            200,
            scrollable: find.byType(Scrollable).first,
          );
          clean('article end');
          router.pop();
          await TestApp.settle(tester);
          semantics.dispose();
        });
      }
    }
  }

  testWidgets('saves an article on the device and shows it under Saved', (
    tester,
  ) async {
    usePhone(tester);
    final api = newsApp(newsApi());
    await api.pump(tester);
    final router = api.container.read(appRouterProvider);
    router.push(Paths.article('1042'));
    await TestApp.settle(tester);
    expect(api.api.lastArticleId, '1042');

    await tester.tap(find.bySemanticsLabel('Save article'));
    await TestApp.settle(tester);
    expect(find.text('Saved. Find it under Saved.'), findsOneWidget);
    final stored = api.container
        .read(sharedPreferencesProvider)
        .getString(BookmarksController.storageKey);
    final list = jsonDecode(stored!) as List;
    expect(list.single, containsPair('id', '1042'));
    // Only the summary is kept, never the body.
    expect((list.single as Map).containsKey('html'), isFalse);

    router.pop();
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Saved').last);
    await TestApp.settle(tester);
    expect(find.text('Night ferries return to the harbour'), findsOneWidget);

    // Removing it from the article empties Saved again.
    router.push(Paths.article('1042'));
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Remove from saved'));
    await TestApp.settle(tester);
    router.pop();
    await TestApp.settle(tester);
    expect(find.text('No saved articles'), findsOneWidget);
  });

  testWidgets('shares the article with its address', (tester) async {
    usePhone(tester);
    final shared = <String>[];
    final app = newsApp(newsApi(), shared: shared);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.article('1042'));
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Share'));
    await TestApp.settle(tester);
    expect(shared, [
      'Night ferries return to the harbour\nhttps://harbour.example/night-ferries',
    ]);
  });

  testWidgets('filters the latest articles by section and search', (
    tester,
  ) async {
    usePhone(tester);
    final api = newsApi();
    final app = newsApp(api);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('Latest').last);
    await TestApp.settle(tester);
    expect(api.articleQueries.last.category, isNull);

    await tester.tap(find.text('Sport').first);
    await TestApp.settle(tester);
    expect(api.articleQueries.last.category, '8');

    await tester.enterText(find.byType(TextField), 'ferry');
    await tester.pump(const Duration(milliseconds: 500));
    await TestApp.settle(tester);
    expect(api.articleQueries.last.search, 'ferry');
    expect(api.articleQueries.last.toQuery(), {
      'page': 1,
      'per_page': 20,
      'search': 'ferry',
      'category': '8',
    });

    // A section from the home screen opens the Latest tab on it.
    app.container
        .read(appRouterProvider)
        .go(Paths.articlesFiltered(category: '7'));
    await TestApp.settle(tester);
    expect(api.articleQueries.last.category, '7');
  });

  testWidgets('an article in web view mode opens its page', (tester) async {
    usePhone(tester);
    final api = newsApi()..article = articleJson(renderMode: 'webview');
    final app = newsApp(api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.article('1042'));
    await TestApp.settle(tester);
    expect(tester.takeException(), isNull);
    expect(
      app.webViews.requests.map((r) => r.url.toString()),
      contains('https://harbour.example/night-ferries'),
    );
  });

  testWidgets('Settings offers the breaking news switch when the site pushes', (
    tester,
  ) async {
    usePhone(tester);
    final app = newsApp(newsApi(), signedIn: true, push: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Breaking news'), findsOneWidget);
    await tester.tap(find.text('Breaking news'));
    await TestApp.settle(tester);
    expect(
      app.container.read(localSettingsProvider).notifications.news,
      isFalse,
    );
    expect(
      app.container
          .read(sharedPreferencesProvider)
          .getBool('settings.notify_news'),
      isFalse,
    );
    await tester.pump(const Duration(seconds: 2));
  });

  testWidgets('no breaking news switch when the site doesn\'t push', (
    tester,
  ) async {
    usePhone(tester);
    final quiet = newsApp(newsApi(push: false), signedIn: true, push: true);
    await quiet.pump(tester);
    quiet.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Breaking news'), findsNothing);
    expect(find.text('News and offers'), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
  });

  test('news models, links and notifications', () {
    final article = Article.fromJson(articleJson());
    expect(article.renderMode, RenderMode.native);
    expect(article.embeds.single.provider, EmbedProvider.youtube);
    expect(article.categories.single.name, 'City');
    expect(ArticleSummary.fromJson(article.toJson()).title, article.title);
    final home = NewsHome.fromJson(newsHomeJson());
    expect(home.rails.map((r) => r.category.name), ['City', 'Sport']);
    expect(NewsConfig.fromJson(const {}).showAuthor, isTrue);
    expect(const ArticleQuery(featured: true, search: ' ').toQuery(), {
      'page': 1,
      'per_page': 20,
      'featured': true,
    });

    expect(
      pushTargetLocation({'type': 'article', 'article_id': '163728192837'}),
      '/article/163728192837',
    );
    final inbox = InboxNotification.fromJson({
      'id': 3,
      'title': 'Breaking',
      'body': 'News',
      'type': 'article',
      'article_id': '1042',
      'created_at': '2026-10-13T08:00:00Z',
      'read': false,
    });
    expect(inbox.type, NotificationType.article);
    expect(pushTargetLocation(inbox.target), '/article/1042');
    expect(const NotificationPreferences().toJson()['news'], isTrue);

    expect(
      itemLocation(
        const ItemRef(source: ItemSource.articles, id: '163728192837'),
        AppType.news,
      ),
      '/article/163728192837',
    );
    expect(
      itemLocation(
        const ItemRef(source: ItemSource.articles, id: '5'),
        AppType.lms,
      ),
      isNull,
    );
    expect(
      categoryLocation(ItemSource.articles, AppType.news, 7),
      '/articles?category=7',
    );
    expect(
      searchLocation(ItemSource.articles, AppType.news),
      '/articles?focus=1',
    );
    expect(
      shareText(ArticleSummary.fromJson(articleSummaryJson(url: null)), 'Post'),
      'Night ferries return to the harbour\nPost',
    );
  });
}
