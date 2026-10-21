import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/lms/lesson/content/code_block.dart';
import 'package:yallapp/modules/lms/lesson/video/embed_player.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// Phone-sized screen: 390 x 844 logical pixels, no system insets.
const _width = 390.0;
const _height = 844.0;

/// The text lesson's own bars (see LessonChrome in lesson_screen.dart).
const _chrome = 170.0;

Future<TestApp> openLesson(
  WidgetTester tester, {
  bool framingAllowed = true,
  String? embedHeight,
  String configEmbedHeight = 'auto',
  String? pageHeight,
}) async {
  final lesson = textLessonJson(embedHeight: embedHeight);
  if (pageHeight != null) {
    ((lesson['embeds'] as List)[1] as Map)['height'] = pageHeight;
  }
  final app = TestApp(
    signedIn: true,
    framingAllowed: framingAllowed,
    api: FakeApi(
      lesson: lesson,
      config: configJson(embedHeight: configEmbedHeight),
    ),
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).push('/lesson/108');
  await TestApp.settle(tester, 20);
  return app;
}

Size videoSize(WidgetTester tester, String placeholder) => tester.getSize(
  find.descendant(
    of: find.byKey(ValueKey('embed-$placeholder')),
    matching: find.byType(BrandlessVideo),
  ),
);

Size frameSize(WidgetTester tester, String placeholder) => tester.getSize(
  find.descendant(
    of: find.byKey(ValueKey('embed-$placeholder')),
    matching: find.byKey(const ValueKey('embed-frame')),
  ),
);

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(_width * 3, _height * 3)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('renders HTML, a highlighted code block and sized embeds', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final app = await openLesson(tester);

    expect(find.text('Writing your first function'), findsOneWidget);
    expect(
      find.text('Lesson 2 of 2'),
      findsNothing,
      reason: 'not in this curriculum',
    );
    expect(find.byType(CodeBlock), findsOneWidget);
    expect(find.text('python'), findsOneWidget);
    expect(find.text('Copy'), findsOneWidget);
    expect(app.security.calls, [true], reason: 'screen capture blocked');

    // Both placeholders became inline web views: the YouTube video (72) in
    // YouTube's own player by default, followed by the app; the host's name
    // never shows under it.
    final labels = app.webViews.requests.map((r) => r.debugLabel).toSet();
    expect(labels, containsAll(['video-player', 'yallapp-embed-2']));
    final youtube = app.webViews.requests.firstWhere(
      (r) => r.debugLabel == 'video-player',
    );
    expect(youtube.html, contains('https://www.youtube.com/embed/abc123?'));
    expect(youtube.html, isNot(contains('controls=0')));
    expect(youtube.html, contains('"site":true'));
    expect(youtube.baseUrl, 'https://your-academy.com/');
    expect(youtube.interactive, isTrue);
    expect(youtube.openLinksOutside, isFalse);
    expect(youtube.allowNavigation, isNotNull);
    expect(find.text('youtube.com'), findsNothing);
    expect(find.text('www.youtube.com'), findsNothing);

    // Content width is the screen minus the 20 px article padding.
    const contentWidth = _width - 40 - 2; // and the 1 px frame border
    final video = videoSize(tester, 'yallapp-embed-1');
    expect(video.width, closeTo(contentWidth + 2, 0.01));
    expect(video.height, closeTo((contentWidth + 2) * 9 / 16, 0.5));

    // "640" wide, "900" high: never wider than the screen, height capped.
    final page = frameSize(tester, 'yallapp-embed-2');
    expect(page.width, closeTo(contentWidth, 0.01));
    expect(page.height, closeTo(_height - _chrome, 0.01));

    // The video has its own full screen (in its controls).
    expect(find.bySemanticsLabel('Open full screen'), findsOneWidget);

    // Attachments follow the article.
    await tester.scrollUntilVisible(
      find.text('Slides.pdf'),
      400,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('lesson-article')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.text('Slides.pdf'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('a page that refuses framing shows the Open card', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await openLesson(tester, framingAllowed: false);
    expect(find.byKey(const ValueKey('embed-open-card')), findsOneWidget);
    expect(find.text('tools.example.org'), findsOneWidget);
    expect(find.text('Open'), findsOneWidget);
    // YouTube is known to allow framing.
    expect(find.byKey(const ValueKey('embed-yallapp-embed-1')), findsOneWidget);

    await tester.ensureVisible(find.text('Open'));
    await tester.pump();
    await tester.tap(find.text('Open'));
    await TestApp.settle(tester);
    expect(find.text('Writing your first function'), findsWidgets);
    expect(find.bySemanticsLabel('Exit full screen'), findsOneWidget);
    expect(find.bySemanticsLabel('Rotate screen'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets("the lesson's embed_height overrides the site setting", (
    tester,
  ) async {
    await openLesson(tester, pageHeight: '300');
    expect(frameSize(tester, 'yallapp-embed-2').height, closeTo(300, 0.01));
    await tester.pumpWidget(const SizedBox());

    await openLesson(tester, embedHeight: 'fit_screen', pageHeight: '300');
    final page = frameSize(tester, 'yallapp-embed-2');
    expect(page.height, closeTo(_height - _chrome, 0.01));
    // 40 Videos stay 16:9 whatever the setting.
    final video = videoSize(tester, 'yallapp-embed-1');
    expect(video.height, closeTo(video.width * 9 / 16, 0.5));
  });
}
