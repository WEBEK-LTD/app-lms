import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/web/web_page_screen.dart';
import 'package:yallapp/modules/shared/links/link_open_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 48 The site's own pages open the app: the app asks the site what a page
/// is and opens that screen, or the page in its in-app browser, never
/// handing it back to the phone.

const _site = 'https://your-academy.com';

TestApp _app(FakeApi api) => TestApp(
  guest: true,
  api: api,
  build: (b) => b.copyWith(
    siteLinkBaseUrl: '$_site/a',
    sitePaths: const ['/courses/', '/lesson/'],
  ),
);

/// What the engine sends when the phone opens an address in the app.
Future<void> _open(WidgetTester tester, String location) async {
  await tester.binding.defaultBinaryMessenger.handlePlatformMessage(
    'flutter/navigation',
    const JSONMethodCodec().encodeMethodCall(
      MethodCall('pushRouteInformation', {'location': location, 'state': null}),
    ),
    (_) {},
  );
  await TestApp.settle(tester);
}

String _location(TestApp app) => app.container
    .read(appRouterProvider)
    .routerDelegate
    .currentConfiguration
    .uri
    .toString();

void main() {
  setUp(forgetLastLinkOpened);

  testWidgets('a course page of the site opens the course (iOS: the whole '
      'address)', (tester) async {
    final api = FakeApi();
    const page = '$_site/courses/intro-to-python/';
    // The router drops the trailing slash; WordPress finds the page either
    // way.
    api.resolvedLinks['$_site/courses/intro-to-python'] = {
      'kind': 'course',
      'id': '1',
    };
    final app = _app(api);
    await app.pump(tester);
    await _open(tester, page);
    expect(api.resolvedUrls, ['$_site/courses/intro-to-python']);
    expect(_location(app), '/course/1');
    expect(find.text(courseDetailJson()['title'] as String), findsWidgets);
  });

  testWidgets('a lesson page opens the lesson (Android: the path only)', (
    tester,
  ) async {
    final api = FakeApi();
    const page = '$_site/courses/intro-to-python/lessons/welcome';
    api.resolvedLinks[page] = {'kind': 'lesson', 'id': '108'};
    final app = _app(api);
    await app.pump(tester);
    await _open(tester, '/courses/intro-to-python/lessons/welcome/');
    expect(api.resolvedUrls, [page]);
    expect(_location(app), '/lesson/108');
  });

  testWidgets(
    'a page the app doesn\'t show opens in the in-app browser, once',
    (tester) async {
      final api = FakeApi();
      const page = '$_site/courses/feed-of-the-week';
      final app = _app(api);
      await app.pump(tester);
      await _open(tester, page);
      expect(api.count('resolveLink'), 1);
      expect(find.byType(WebPageScreen), findsOneWidget);
      expect(app.webViews.requests.map((r) => '${r.url}').toList(), [page]);
      // The web view never hands the address back to the phone; and the same
      // address arriving again goes straight to the browser, without asking.
      await _open(tester, page);
      expect(api.count('resolveLink'), 1);
      expect(app.webViews.requests.map((r) => '${r.url}').toList(), [
        page,
        page,
      ]);
    },
  );

  testWidgets('a kind of another app type, an error or an older plugin: '
      'the in-app browser', (tester) async {
    final api = FakeApi();
    const product = '$_site/courses/shop-item';
    const broken = '$_site/courses/broken';
    api.resolvedLinks[product] = {'kind': 'product', 'id': '3'};
    api.failures['resolveLink'] = const ApiException(
      code: 'not_found',
      message: 'Not found',
      statusCode: 404,
    );
    final app = _app(api);
    await app.pump(tester);
    await _open(tester, broken);
    expect(app.webViews.requests.map((r) => '${r.url}').toList(), [broken]);
    await _open(tester, product);
    expect(app.webViews.requests.map((r) => '${r.url}').toList(), [
      broken,
      product,
    ]);
    expect(api.count('resolveLink'), 2);
  });

  testWidgets('the app\'s own screens are never sent to the site', (
    tester,
  ) async {
    final api = FakeApi();
    final app = _app(api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    app.container.read(appRouterProvider).go('/courses');
    await TestApp.settle(tester);
    expect(api.count('resolveLink'), 0);
    expect(_location(app), '/courses');
  });
}
