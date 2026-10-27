import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/theme/symbol_names.dart';

import '../support/fixtures.dart';

/// Answers `/pages` like the contract: 200 with an ETag, 304 when
/// `If-None-Match` matches, or [status] when set (404 on older plugins).
class PagesServer implements HttpClientAdapter {
  int? status;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final headers = {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    };
    if (status != null) {
      return ResponseBody.fromString(
        jsonEncode({'code': 'rest_no_route', 'message': 'No route.'}),
        status!,
        headers: headers,
      );
    }
    final body = navigationJson();
    final tag = '"${body['version']}"';
    if (options.headers['If-None-Match'] == tag) {
      return ResponseBody.fromString('', 304);
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        ...headers,
        'etag': [tag],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('page models', () {
    test('unknown block types are skipped, known ones all parse', () {
      final page = AppPage.fromJson(appPageJson());
      expect(page.blocks.whereType<BannerBlock>(), hasLength(1));
      expect(page.blocks.whereType<TextBlock>(), hasLength(1));
      expect(page.blocks.whereType<ImageBlock>(), hasLength(1));
      expect(page.blocks.whereType<VideoBlock>(), hasLength(2));
      expect(page.blocks.whereType<ButtonBlock>(), hasLength(3));
      expect(page.blocks.whereType<ItemsBlock>(), hasLength(1));
      expect(page.blocks.whereType<CategoriesBlock>(), hasLength(2));
      expect(page.blocks.whereType<SearchBlock>(), hasLength(1));
      expect(page.blocks.whereType<ContinueLearningBlock>(), hasLength(1));
      expect(page.blocks.whereType<EmbedBlock>(), hasLength(1));
      expect(page.blocks.whereType<SpacerBlock>(), hasLength(1));
      expect(page.blocks.map((b) => b.id), isNot(contains('b12')));
    });

    test('a broken block is skipped instead of failing the page', () {
      final page = AppPage.fromJson(
        appPageJson(
          blocks: [
            {'id': 'x', 'type': 'banner'},
            {'id': 'y', 'type': 'spacer', 'size': 'small'},
          ],
        ),
      );
      expect(page.blocks.single, isA<SpacerBlock>());
    });

    test('unknown actions are ignored', () {
      final page = AppPage.fromJson(appPageJson());
      final buttons = page.blocks.whereType<ButtonBlock>().toList();
      expect(buttons[0].action!.screen, BuiltInScreen.courses);
      expect(buttons[1].action!.openIn, OpenIn.browser);
      expect(buttons[2].action, isNull);
      expect(
        PageAction.tryParse({'type': 'screen', 'screen': 'teleporter'})!.screen,
        isNull,
      );
    });

    test('new screens and the services source parse', () {
      for (final (wire, screen) in [
        ('notifications', BuiltInScreen.notifications),
        ('cart', BuiltInScreen.cart),
        ('orders', BuiltInScreen.orders),
        ('services', BuiltInScreen.services),
        ('appointments', BuiltInScreen.appointments),
        ('my_courses', BuiltInScreen.myCourses),
      ]) {
        expect(
          PageAction.tryParse({'type': 'screen', 'screen': wire})!.screen,
          screen,
        );
      }
      final item = PageItem.fromJson(itemJson(source: 'services', id: '31'));
      expect(item.tapAction!.item!.source, ItemSource.services);
      expect(PageItem.fromJson(itemJson(source: 'boats')).tapAction, isNull);
    });

    test('tabs with unknown targets are dropped; too few is not usable', () {
      final navigation = Navigation.fromJson(navigationJson());
      expect(navigation.tabs.map((t) => t.label), [
        'Discover',
        'Catalog',
        'Me',
      ]);
      expect(navigation.usable, isTrue);
      final few = Navigation.fromJson(
        navigationJson(
          tabs: [
            navTabJson('a', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('b', 'Odd', 'home', {'type': 'warp'}),
          ],
        ),
      );
      expect(few.usable, isFalse);
    });

    test('33 the blocks with content parse, skipping entries the app '
        "can't use", () {
      final page = AppPage.fromJson(appPageJson(blocks: contentBlocksJson()));
      expect(page.blocks.map((b) => b.runtimeType.toString()), [
        'SliderBlock',
        'QuickLinksBlock',
        'StatsBlock',
        'TestimonialsBlock',
        'FaqBlock',
        'CountdownBlock',
        'ContactBlock',
        'HoursBlock',
        'SocialBlock',
        'TeamBlock',
        'NoticeBlock',
      ]);
      final slider = page.blocks.whereType<SliderBlock>().single;
      expect(slider.slides, hasLength(2));
      expect(slider.slides.first.action!.screen, BuiltInScreen.courses);
      final links = page.blocks.whereType<QuickLinksBlock>().single;
      expect(links.links.map((l) => l.label), isNot(contains('Teleport')));
      expect(
        page.blocks.whereType<SocialBlock>().single.profiles.map(
          (p) => p.network,
        ),
        [
          SocialNetwork.instagram,
          SocialNetwork.youtube,
          SocialNetwork.whatsappChannel,
        ],
      );
      final hours = page.blocks.whereType<HoursBlock>().single;
      expect(hours.hours.last.opens, 15 * 60);
      expect(
        hours.hours.firstWhere((h) => h.day == Weekday.fri).overnight,
        isTrue,
      );
      expect(
        page.blocks.whereType<CountdownBlock>().single.endsAt.isUtc,
        isTrue,
      );
      expect(
        page.blocks.whereType<NoticeBlock>().single.tone,
        NoticeTone.warning,
      );
      expect(page.blocks.whereType<TeamBlock>().single.people, hasLength(3));
    });

    test('33 a block whose list has nothing usable is skipped', () {
      final page = AppPage.fromJson(
        appPageJson(
          blocks: [
            {'id': 'a', 'type': 'slider', 'slides': []},
            {
              'id': 'b',
              'type': 'quick_links',
              'links': [
                {
                  'icon': 'home',
                  'label': 'Nowhere',
                  'action': {'type': 'warp'},
                },
              ],
            },
            {'id': 'c', 'type': 'contact'},
            {'id': 'd', 'type': 'stats', 'stats': 'many'},
            {'id': 'e', 'type': 'notice', 'tone': 'loud', 'text': 'Hello'},
            {'id': 'f', 'type': 'countdown', 'heading': 'Soon'},
          ],
        ),
      );
      final notice = page.blocks.single as NoticeBlock;
      expect(notice.tone, NoticeTone.info);
    });

    test('opening hours: open now in the phone time, across midnight', () {
      const hours = HoursBlock(
        id: 'h',
        hours: [
          OpeningPeriod(day: Weekday.mon, opens: 9 * 60, closes: 17 * 60),
          OpeningPeriod(day: Weekday.sun, opens: 20 * 60, closes: 2 * 60),
        ],
        closedDates: ['2026-10-19'],
      );
      // 12 October 2026 is a Monday.
      expect(hours.isOpenAt(DateTime(2026, 10, 12, 9)), isTrue);
      expect(hours.isOpenAt(DateTime(2026, 10, 12, 17)), isFalse);
      expect(hours.isOpenAt(DateTime(2026, 10, 12, 1, 59)), isTrue);
      expect(hours.isOpenAt(DateTime(2026, 10, 12, 2)), isFalse);
      // A closed Monday.
      expect(hours.isOpenAt(DateTime(2026, 10, 19, 10)), isFalse);
    });

    test('99.3 a block look: alignment, text size, corners, picture fit', () {
      BlockLook? look(Object? json) => BlockLook.tryParse(json);
      // Everything as its default changes nothing: no look.
      const defaults = {
        'background': 'none',
        'spacing': 'medium',
        'align': 'start',
        'text_size': 'medium',
        'corners': 'app',
        'image_fit': 'cover',
      };
      expect(look(defaults), isNull);
      // Values this app doesn't know are the defaults.
      const unknown = {
        'align': 'justify',
        'text_size': 'huge',
        'corners': 'wavy',
        'image_fit': 'fill',
      };
      expect(look(unknown), isNull);

      final centred = look({'align': 'center'})!;
      expect(centred.align, BlockAlign.center);
      expect(centred.background, BlockBackground.none);
      expect(centred.spacing, BlockSpacing.medium);
      expect(centred.textSize, BlockTextSize.medium);
      expect(centred.corners, BlockCorners.app);
      expect(centred.imageFit, BlockImageFit.cover);
      expect(look({'align': 'end'})!.align, BlockAlign.end);
      expect(look({'text_size': 'small'})!.textSize, BlockTextSize.small);
      expect(look({'text_size': 'large'})!.textSize, BlockTextSize.large);
      expect(look({'corners': 'sharp'})!.corners, BlockCorners.sharp);
      expect(look({'corners': 'round'})!.corners, BlockCorners.round);
      expect(look({'image_fit': 'contain'})!.imageFit, BlockImageFit.contain);

      // Read with the page, by block id.
      final page = AppPage.fromJson(
        appPageJson(
          blocks: [
            {
              'id': 'b1',
              'type': 'text',
              'html': '<p>Hi</p>',
              'look': {'align': 'end', 'image_fit': 'contain'},
            },
          ],
        ),
      );
      expect(page.looks['b1']!.align, BlockAlign.end);
      expect(page.looks['b1']!.imageFit, BlockImageFit.contain);
    });

    test('99.3 the page background and header picture', () {
      final page = AppPage.fromJson({
        ...appPageJson(blocks: []),
        'background': 'tint',
        'header_image_url': 'https://cdn.example.com/top.jpg',
      });
      expect(page.background, PageBackground.tint);
      expect(page.headerImageUrl, 'https://cdn.example.com/top.jpg');
      final surface = AppPage.fromJson({
        ...appPageJson(blocks: []),
        'background': 'surface',
      });
      expect(surface.background, PageBackground.surface);
      // Unknown values and pictures not on https are left out.
      final odd = AppPage.fromJson({
        ...appPageJson(blocks: []),
        'background': 'neon',
        'header_image_url': 'http://cdn.example.com/top.jpg',
      });
      expect(odd.background, PageBackground.none);
      expect(odd.headerImageUrl, isNull);
      // Older servers send neither.
      final older = AppPage.fromJson(appPageJson(blocks: []));
      expect(older.background, PageBackground.none);
      expect(older.headerImageUrl, isNull);
    });

    test('icons by Material Symbols name, with a fallback', () {
      expect(symbolByName('home'), AppIcons.home);
      expect(symbolByName('home_rounded'), AppIcons.home);
      expect(symbolByName('menu_book'), AppIcons.courses);
      expect(symbolByName('no_such_icon'), fallbackSymbol);
      expect(symbolByName(null), fallbackSymbol);
    });
  });

  group('GET /pages', () {
    late PagesServer server;
    late HttpYallappApi api;
    var language = 'en';

    setUp(() {
      server = PagesServer();
      language = 'en';
      final dio = createHttpClient(
        baseUrl: 'https://x.test/wp-json/yallapp/v1',
        tokens: TokenManager(
          store: MemoryTokenStore(null),
          refresh: (_) async => throw UnimplementedError(),
        ),
        adapter: server,
        language: () => language,
      );
      api = HttpYallappApi(
        dio: dio,
        refreshDio: Dio(),
        platform: DevicePlatform.ios,
        appVersion: '1.0.0',
        language: () => language,
      );
    });

    test('sends Accept-Language and the platform', () async {
      language = 'ar';
      await api.getPages();
      final request = server.requests.single;
      expect(request.headers['Accept-Language'], 'ar');
      expect(request.queryParameters['platform'], 'ios');
    });

    test('asks with the ETag and reuses the answer on 304', () async {
      final first = await api.getPages();
      final second = await api.getPages();
      expect(server.requests[1].headers['If-None-Match'], isNotNull);
      expect(identical(first, second), isTrue);
    });

    test('another language never reuses the cached answer', () async {
      await api.getPages();
      language = 'tr';
      await api.getPages();
      expect(server.requests[1].headers['If-None-Match'], isNull);
      expect(server.requests[1].headers['Accept-Language'], 'tr');
    });

    for (final status in [404, 501]) {
      test('$status means no pages: the built-in tabs stay', () async {
        server.status = status;
        expect(await api.getPages(), isNull);
      });
    }
  });
}
