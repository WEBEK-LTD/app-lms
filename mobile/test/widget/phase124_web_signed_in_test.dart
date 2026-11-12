import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/web/media_permission.dart';
import 'package:yallapp/core/web/site_sign_in.dart';
import 'package:yallapp/core/web/web_page_screen.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/shared/pages/web_tab_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 124.9 A web page or tab on the academy's own WordPress site opens with
/// the student signed in there (a one-time link from `POST /auth/web-link`),
/// its address still hidden; the camera and microphone when the page asks
/// and the student allows them.
void main() {
  const mockExam = 'https://your-academy.com/mock-exam/';
  final refused = lookupAppLocalizations(const Locale('en'))
      .webPageMediaRefused;

  Map<String, dynamic> navigation(String url) => navigationJson(
    tabs: [
      navTabJson('t1', 'Discover', 'explore', {
        'type': 'page',
        'page_slug': 'home',
      }),
      navTabJson('exam', 'Mock exam', 'quiz', {
        'type': 'url',
        'url': url,
        'open_in': 'in_app',
        'web': {'hide_header': true, 'hide_footer': true},
      }),
      navTabJson('t4', 'Me', 'person', {'type': 'screen', 'screen': 'account'}),
    ],
  );

  Future<TestApp> openTab(
    WidgetTester tester, {
    String url = mockExam,
    bool signedIn = true,
    FakeApi? api,
    List<Override> overrides = const [],
  }) async {
    final app = TestApp(
      api: (api ?? FakeApi())
        ..navigation = navigation(url)
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: signedIn,
      // Signed out, the student browses as a guest.
      guest: !signedIn,
      overrides: overrides,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('Mock exam').last);
    await TestApp.settle(tester, 10);
    expect(find.byType(WebTabScreen), findsOneWidget);
    return app;
  }

  WebViewRequest tabRequest(TestApp app) =>
      app.webViews.requests.lastWhere((r) => r.debugLabel == 'web-tab');

  group('the site and its pages', () {
    test('the same host, www either way, the same port and scheme', () {
      bool on(String page, [String site = 'https://academy.test']) =>
          isSitePage(Uri.parse(page), site);
      expect(on('https://academy.test/mock-exam/'), isTrue);
      expect(on('https://www.academy.test/mock-exam/'), isTrue);
      expect(on('https://academy.test/a', 'https://www.academy.test'), isTrue);
      expect(on('https://ACADEMY.test/'), isTrue);
      expect(on('http://academy.test/a'), isFalse);
      expect(on('https://academy.test/a', 'http://academy.test'), isTrue);
      expect(on('https://meet.example.com/room'), isFalse);
      expect(on('https://academy.test.evil.com/'), isFalse);
      expect(on('https://sub.academy.test/'), isFalse);
      expect(on('https://user@academy.test/'), isFalse);
      expect(on('https://academy.test:8443/'), isFalse);
      expect(on('https://academy.test:443/'), isTrue);
      expect(on('http://127.0.0.1:8089/a', 'http://127.0.0.1:8089'), isTrue);
      expect(on('http://127.0.0.1/a', 'http://127.0.0.1:8089'), isFalse);
    });

    test('only a WordPress app asks its site', () {
      expect(isWordPressBuild(testBuild), isTrue);
      expect(
        isWordPressBuild(
          testBuild.copyWith(apiBaseUrl: 'https://yallapp.com.tr/api/app/a1'),
        ),
        isFalse,
      );
    });
  });

  testWidgets('on the site, signed in: the one-time link opens, the '
      'address still hidden', (tester) async {
    final app = await openTab(tester);
    expect(app.api.webLinks, [(url: mockExam, appView: true)]);
    final request = tabRequest(app);
    expect(request.url.toString(), startsWith('https://your-academy.com/?'));
    expect(request.url!.queryParameters['yallapp_link'], 'one-time-1');
    // The site's pages stay in the app, and the owner's look is kept.
    expect(request.pageHost, 'your-academy.com');
    expect(request.injectCss, contains('#colophon'));
    expect(find.textContaining('your-academy.com'), findsNothing);
    expect(find.textContaining('yallapp_link'), findsNothing);
  });

  testWidgets('another host opens as it is', (tester) async {
    final app = await openTab(tester, url: 'https://meet.example.com/room');
    expect(app.api.count('createWebLink'), 0);
    expect(tabRequest(app).url, Uri.parse('https://meet.example.com/room'));
  });

  testWidgets('signed out, the page opens as it is', (tester) async {
    final app = await openTab(tester, signedIn: false);
    expect(app.api.count('createWebLink'), 0);
    expect(tabRequest(app).url, Uri.parse(mockExam));
  });

  testWidgets('when the link can\'t be had, the page opens as it is', (
    tester,
  ) async {
    final api = FakeApi()
      ..failures['createWebLink'] = const ApiException(
        code: 'server_error',
        message: 'No',
      );
    final app = await openTab(tester, api: api);
    expect(app.api.count('createWebLink'), 1);
    expect(tabRequest(app).url, Uri.parse(mockExam));
  });

  testWidgets('the hosted API is never asked', (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation(mockExam)
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: true,
      build: (b) => b.copyWith(apiBaseUrl: 'https://yallapp.com.tr/api/app/a1'),
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('Mock exam').last);
    await TestApp.settle(tester, 10);
    expect(app.api.count('createWebLink'), 0);
    expect(tabRequest(app).url, Uri.parse(mockExam));
  });

  testWidgets('a button\'s web page on the site opens signed in too', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigation(mockExam)
        ..pages = {
          'home': appPageJson(
            blocks: [
              {
                'id': 'b1',
                'type': 'button',
                'visibility': 'everyone',
                'label': 'Video call',
                'action': {
                  'type': 'url',
                  'url': 'https://www.your-academy.com/live/',
                  'open_in': 'in_app',
                  'web': {'hide_header': true},
                },
              },
            ],
          ),
        },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('Video call'));
    await TestApp.settle(tester, 10);
    expect(find.byType(WebPageScreen), findsOneWidget);
    // Only the header hidden: the site keeps its own look.
    expect(app.api.webLinks, [
      (url: 'https://www.your-academy.com/live/', appView: false),
    ]);
    final request = app.webViews.requests.lastWhere(
      (r) => r.debugLabel == 'page',
    );
    expect(request.url!.queryParameters['yallapp_link'], 'one-time-1');
    expect(request.pageHost, 'www.your-academy.com');
    expect(request.onMediaRequest, isNotNull);
    expect(find.textContaining('your-academy.com'), findsNothing);
  });

  group('the camera and microphone', () {
    test('only the camera and the microphone, while the page is open', () {
      const camera = WebViewPermissionResourceType.camera;
      const microphone = WebViewPermissionResourceType.microphone;
      expect(mediaToAsk({camera}, pageOpen: true), (
        camera: true,
        microphone: false,
      ));
      expect(mediaToAsk({camera, microphone}, pageOpen: true), (
        camera: true,
        microphone: true,
      ));
      expect(mediaToAsk({microphone}, pageOpen: true), (
        camera: false,
        microphone: true,
      ));
      expect(mediaToAsk({camera}, pageOpen: false), isNull);
      expect(mediaToAsk({}, pageOpen: true), isNull);
      const midi = _OtherResource('midiSysex');
      expect(mediaToAsk({camera, midi}, pageOpen: true), isNull);
      expect(mediaToAsk({midi}, pageOpen: true), isNull);
    });

    testWidgets('the phone asks; refused, a short message says so', (
      tester,
    ) async {
      final phone = _FakeMediaPermissions(answer: false);
      final app = await openTab(
        tester,
        overrides: [mediaPermissionsProvider.overrideWithValue(phone)],
      );
      final ask = tabRequest(app).onMediaRequest!;
      expect(await ask(camera: true, microphone: true), isFalse);
      expect(phone.asked, [(camera: true, microphone: true)]);
      await tester.pump();
      expect(find.text(refused), findsOneWidget);
    });

    testWidgets('allowed, the page gets them and nothing is said', (
      tester,
    ) async {
      final phone = _FakeMediaPermissions(answer: true);
      final app = await openTab(
        tester,
        overrides: [mediaPermissionsProvider.overrideWithValue(phone)],
      );
      final ask = tabRequest(app).onMediaRequest!;
      expect(await ask(camera: true, microphone: false), isTrue);
      await tester.pump();
      expect(find.text(refused), findsNothing);
    });

    testWidgets('other in-app pages (a checkout) never get them', (
      tester,
    ) async {
      final app = TestApp(signedIn: true);
      await app.pump(tester);
      app.container
          .read(appRouterProvider)
          .push(
            Paths.web,
            extra: const WebPageArgs(
              url: 'https://your-academy.com/checkout/',
              title: 'Checkout',
            ),
          );
      await TestApp.settle(tester, 10);
      final request = app.webViews.requests.lastWhere(
        (r) => r.debugLabel == 'page',
      );
      expect(request.onMediaRequest, isNull);
      expect(app.api.count('createWebLink'), 0);
    });
  });
}

class _OtherResource extends WebViewPermissionResourceType {
  const _OtherResource(super.name);
}

class _FakeMediaPermissions implements MediaPermissions {
  _FakeMediaPermissions({required this.answer});

  final bool answer;
  final asked = <({bool camera, bool microphone})>[];

  @override
  Future<bool> request({required bool camera, required bool microphone}) async {
    asked.add((camera: camera, microphone: microphone));
    return answer;
  }
}
