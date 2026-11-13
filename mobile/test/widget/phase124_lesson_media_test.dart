import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/web/media_permission.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/modules/lms/lesson/embeds/embed_frame.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 124.14 The owner (13 November): an academy's call is in a lesson's
/// content (an iframe), and it needs the microphone. A lesson's embedded
/// page, its full screen and a lesson shown as the site's page ask the
/// student for the microphone and camera as a web page of the app does;
/// a video never does.
void main() {
  Future<(TestApp, _Phone)> openLesson(
    WidgetTester tester,
    Map<String, dynamic> lesson,
  ) async {
    final phone = _Phone();
    final app = TestApp(
      signedIn: true,
      api: FakeApi(lesson: lesson),
      overrides: [mediaPermissionsProvider.overrideWithValue(phone)],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/lesson/108');
    await TestApp.settle(tester, 20);
    return (app, phone);
  }

  WebViewRequest requestOf(TestApp app, String label) =>
      app.webViews.requests.lastWhere((r) => r.debugLabel == label);

  test("the embed's frame may ask for the microphone and camera", () {
    final html = embedWrapperHtml(
      src: 'https://call.example.com/join/abc',
      measure: false,
    );
    expect(html, contains('microphone; camera'));
  });

  testWidgets("a page in the lesson's content asks the student first; a "
      'video never asks', (tester) async {
    final (app, phone) = await openLesson(tester, textLessonJson());
    final page = requestOf(app, 'yallapp-embed-2');
    expect(page.onMediaRequest, isNotNull);
    expect(await page.onMediaRequest!(camera: false, microphone: true), isTrue);
    expect(phone.asked, [(camera: false, microphone: true)]);
    expect(requestOf(app, 'video-player').onMediaRequest, isNull);
  });

  testWidgets("a lesson shown as the site's page asks too", (tester) async {
    final lesson = {
      ...textLessonJson(),
      'render_mode': 'webview',
      'html': null,
      'embeds': <Object>[],
      'webview_url': 'https://your-academy.com/lessons/108/',
    };
    final (app, phone) = await openLesson(tester, lesson);
    final page = requestOf(app, 'lesson');
    expect(page.onMediaRequest, isNotNull);
    expect(await page.onMediaRequest!(camera: false, microphone: true), isTrue);
    expect(phone.asked, hasLength(1));
  });
}

class _Phone implements MediaPermissions {
  final asked = <({bool camera, bool microphone})>[];

  @override
  Future<bool> request({required bool camera, required bool microphone}) async {
    asked.add((camera: camera, microphone: microphone));
    return true;
  }
}
