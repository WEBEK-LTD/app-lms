import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/modules/lms/lesson/video/brandless_player_html.dart';
import 'package:yallapp/modules/lms/lesson/video/embed_player.dart';
import 'package:yallapp/modules/lms/lesson/video/player_controls.dart';
import 'package:yallapp/modules/lms/lesson/video/watermark.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 40 A YouTube lesson plays behind the app's own controls: nothing shows
/// where it's hosted, nothing in it opens YouTube, and progress, the
/// watermark and the screen-capture cover work as with uploaded files.
Map<String, dynamic> youtubeLesson({Map<String, Object?>? video}) {
  final lesson = videoLessonJson();
  lesson['video'] = {
    'source': 'youtube',
    'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'expires_at': null,
    'embed_html': null,
    'duration_seconds': 120,
    'poster_url': null,
    ...?video,
  };
  lesson['position_seconds'] = 30;
  return lesson;
}

Future<TestApp> openLesson(
  WidgetTester tester,
  Map<String, dynamic> lesson, {
  bool autoplayNext = false,
}) async {
  final app = TestApp(
    signedIn: true,
    api: FakeApi(lesson: lesson),
    preferences: {'settings.autoplay_next': autoplayNext},
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).push('/lesson/107');
  await TestApp.settle(tester, 20);
  return app;
}

WebViewRequest player(TestApp app) =>
    app.webViews.requests.lastWhere((r) => r.debugLabel == 'video-player');

void send(TestApp app, Map<String, Object?> event) =>
    app.webViews.post(playerChannel, jsonEncode(event));

List<Object?> commands(TestApp app) => [
  for (final m in app.webViews.sent) (jsonDecode(m) as Map)['command'],
];

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(390 * 3, 844 * 3)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('YouTube plays behind our controls, out of reach', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final app = await openLesson(tester, youtubeLesson());
    final api = app.api;

    final request = player(app);
    expect(request.html, contains('www.youtube.com/embed/dQw4w9WgXcQ?'));
    expect(request.html, contains('start=30'), reason: 'resumes');
    expect(request.interactive, isFalse);
    expect(request.openLinksOutside, isFalse);
    expect(request.browserFrame, isTrue);
    expect(
      request.allowNavigation!(
        Uri.parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        true,
      ),
      isFalse,
    );
    expect(
      request.allowNavigation!(Uri.parse('https://your-academy.com/'), true),
      isTrue,
    );
    // Our cover and a spinner until the player is ready; the watermark on top.
    expect(find.byKey(const ValueKey('player-cover')), findsOneWidget);
    expect(find.bySemanticsLabel('Loading video'), findsOneWidget);
    expect(find.byType(MovingWatermark), findsOneWidget);
    expect(find.byType(PlayerControls), findsNothing);

    send(app, {
      'type': 'ready',
      'duration': 120,
      'rates': [0.5, 1, 1.5, 2],
      'captions': [
        {'language': 'en', 'label': 'English'},
      ],
    });
    send(app, {'type': 'state', 'state': 'ready'});
    await tester.pump();
    expect(find.byType(PlayerControls), findsOneWidget);
    expect(find.bySemanticsLabel('Play'), findsOneWidget);
    expect(find.bySemanticsLabel('Playback speed 1x'), findsOneWidget);
    expect(find.bySemanticsLabel('Turn captions on'), findsOneWidget);
    expect(find.bySemanticsLabel('Full screen'), findsOneWidget);
    expect(
      find.textContaining(RegExp('youtube', caseSensitive: false)),
      findsNothing,
    );

    await tester.tap(find.byKey(const ValueKey('player-play')));
    await tester.pump();
    expect(commands(app).last, 'play');

    send(app, {'type': 'state', 'state': 'playing', 'position': 30});
    for (var s = 30; s < 42; s++) {
      send(app, {'type': 'time', 'position': s, 'duration': 120});
    }
    await tester.pump();
    expect(find.byKey(const ValueKey('player-cover')), findsNothing);
    expect(find.text('00:41 / 02:00'), findsOneWidget);
    expect(find.bySemanticsLabel('Forward 10 seconds'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Forward 10 seconds'));
    await tester.pump();
    expect(jsonDecode(app.webViews.sent.last), {
      'command': 'seek',
      'seconds': 51.0,
    });
    await tester.tap(find.bySemanticsLabel('Playback speed 1x'));
    await tester.pump();
    expect(jsonDecode(app.webViews.sent.last), {
      'command': 'rate',
      'rate': 1.5,
    });

    // Pausing saves the place and the share watched (12 of 120 seconds).
    send(app, {'type': 'state', 'state': 'paused', 'position': 51});
    await tester.pump();
    expect(api.savedProgress.last.$1, 51);
    expect(api.savedProgress.last.$2, 10);

    // A screen recording pauses and covers it; the player stays in place.
    final views = app.webViews.requests.length;
    send(app, {'type': 'state', 'state': 'playing', 'position': 51});
    app.security.captures.add(true);
    await tester.pump();
    await tester.pump();
    expect(find.byType(CapturedNotice), findsOneWidget);
    expect(commands(app).last, 'pause');
    expect(find.byType(BrandlessVideo), findsOneWidget);
    app.security.captures.add(false);
    await tester.pump();
    expect(find.byType(CapturedNotice), findsNothing);
    expect(app.webViews.requests.length - views, lessThan(3));

    // The end: our replay button over our cover (the site's end screen
    // never shows), and the place is saved.
    final saves = api.savedProgress.length;
    send(app, {'type': 'state', 'state': 'ended', 'position': 120});
    await tester.pump();
    expect(find.byKey(const ValueKey('player-cover')), findsOneWidget);
    expect(find.bySemanticsLabel('Play again'), findsOneWidget);
    expect(api.savedProgress.length, greaterThan(saves));
    expect(api.savedProgress.last.$1, 120);
    await tester.tap(find.byKey(const ValueKey('player-play')));
    await tester.pump();
    expect(commands(app).last, 'play');
    semantics.dispose();
  });

  testWidgets('the next lesson opens when the video ends', (tester) async {
    final app = await openLesson(tester, youtubeLesson(), autoplayNext: true);
    send(app, {'type': 'ready', 'duration': 120, 'rates': <Object>[]});
    send(app, {'type': 'state', 'state': 'playing', 'position': 110});
    send(app, {'type': 'state', 'state': 'ended', 'position': 120});
    await TestApp.settle(tester);
    expect(app.api.calls.where((c) => c == 'getLesson').length, 2);
  });

  testWidgets('full screen carries on at the same second', (tester) async {
    final semantics = tester.ensureSemantics();
    final app = await openLesson(tester, youtubeLesson());
    send(app, {'type': 'ready', 'duration': 120, 'rates': <Object>[]});
    send(app, {'type': 'state', 'state': 'playing', 'position': 40});
    send(app, {'type': 'time', 'position': 64, 'duration': 120});
    await tester.pump();
    expect(find.bySemanticsLabel('Playback speed 1x'), findsNothing);

    await tester.tap(find.bySemanticsLabel('Full screen'));
    await TestApp.settle(tester);
    expect(find.byType(FullscreenPlayerFrame), findsOneWidget);
    expect(player(app).html, contains('start=64'));
    expect(commands(app), contains('pause'));

    // The full-screen player plays on from there, then closes.
    send(app, {'type': 'ready', 'duration': 120, 'rates': <Object>[]});
    send(app, {'type': 'state', 'state': 'playing', 'position': 64});
    send(app, {'type': 'time', 'position': 70, 'duration': 120});
    await tester.pump();
    expect(commands(app).last, 'play', reason: 'it was playing');
    await tester.tap(find.bySemanticsLabel('Exit full screen'));
    await TestApp.settle(tester);
    expect(find.byType(FullscreenPlayerFrame), findsNothing);
    final sent = [for (final m in app.webViews.sent) jsonDecode(m)];
    expect(sent.reversed.take(2), [
      {'command': 'play'},
      {'command': 'seek', 'seconds': 70.0},
    ]);
    semantics.dispose();
  });

  testWidgets('other video sites keep their player but open nothing', (
    tester,
  ) async {
    final app = await openLesson(
      tester,
      youtubeLesson(
        video: {
          'source': 'embed',
          'url': null,
          'embed_html': '<iframe src="https://fast.wistia.net/embed/iframe/abc123"></iframe>',
        },
      ),
    );
    final request = app.webViews.requests.lastWhere(
      (r) => r.debugLabel == 'video',
    );
    expect(request.html, contains('fast.wistia.net/embed/iframe/abc123?'));
    expect(request.html, contains('copyLinkAndThumbnailEnabled=false'));
    expect(request.openLinksOutside, isFalse);
    expect(
      request.allowNavigation!(Uri.parse('https://wistia.com/'), true),
      isFalse,
    );
    expect(
      request.allowNavigation!(Uri.parse('https://wistia.com/'), false),
      isFalse,
    );
  });

  testWidgets('a Vimeo video in lesson text plays in our player', (
    tester,
  ) async {
    final lesson = textLessonJson();
    (lesson['embeds'] as List)[0] = {
      'placeholder': 'yallapp-embed-1',
      'src': 'https://player.vimeo.com/video/76979871?h=ab12cd34',
      'provider': 'vimeo',
      'width': '640',
      'height': '360',
      'aspect_ratio': 1.7778,
      'allow_fullscreen': true,
    };
    final app = TestApp(signedIn: true, api: FakeApi(lesson: lesson));
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/lesson/108');
    await TestApp.settle(tester, 20);
    final request = player(app);
    expect(request.html, contains('https://player.vimeo.com/api/player.js'));
    expect(request.html, contains('h=ab12cd34'));
    expect(request.html, contains('byline=0'));
    expect(find.text('player.vimeo.com'), findsNothing);
    expect(find.byType(BrandlessVideo), findsOneWidget);
  });
}
