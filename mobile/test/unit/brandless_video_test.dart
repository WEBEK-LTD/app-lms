import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/modules/lms/lesson/video/brandless_player_html.dart';
import 'package:yallapp/modules/lms/lesson/video/embed_player.dart';
import 'package:yallapp/modules/lms/lesson/video/hosted_video.dart';
import 'package:yallapp/modules/lms/lesson/video/player_controls.dart';
import 'package:yallapp/modules/lms/lesson/video/watch_tracker.dart';

/// 40 Lesson videos without the video site's branding.
class _Page implements WebViewHandle {
  final sent = <Map<String, Object?>>[];

  @override
  Future<void> postToPage(String message) async =>
      sent.add((jsonDecode(message) as Map).cast<String, Object?>());

  List<Object?> get commands => [for (final m in sent) m['command']];
}

void main() {
  group('video links', () {
    HostedVideo? parse(String url) => HostedVideo.parse(url);

    test('YouTube in every link shape', () {
      for (final url in [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?si=abc',
        'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/live/dQw4w9WgXcQ',
      ]) {
        final v = parse(url);
        expect(v?.host, VideoHost.youtube, reason: url);
        expect(v?.id, 'dQw4w9WgXcQ', reason: url);
        expect(v?.ownControls, isTrue);
        expect(v?.vertical, isFalse);
      }
      final short = parse('https://www.youtube.com/shorts/dQw4w9WgXcQ')!;
      expect(short.vertical, isTrue);
      expect(short.aspectRatio, 9 / 16);
      expect(parse('https://www.youtube.com/@academy'), isNull);
      expect(parse('https://www.youtube.com/watch'), isNull);
    });

    test('Vimeo, with the private hash of unlisted videos', () {
      expect(parse('https://vimeo.com/76979871')?.id, '76979871');
      final unlisted = parse('https://vimeo.com/76979871/2b3c4d5e6f')!;
      expect(unlisted.hash, '2b3c4d5e6f');
      final player = parse(
        'https://player.vimeo.com/video/76979871?h=abc123def&badge=0',
      )!;
      expect(player.host, VideoHost.vimeo);
      expect(player.hash, 'abc123def');
      expect(
        parse('https://vimeo.com/channels/staffpicks/76979871')?.id,
        '76979871',
      );
      expect(parse('https://vimeo.com/about'), isNull);
    });

    test('Bunny Stream keeps its signed link', () {
      final v = parse(
        'https://iframe.mediadelivery.net/embed/1234/abcd-ef?token=t1&expires=99&autoplay=true',
      )!;
      expect(v.host, VideoHost.bunny);
      expect(v.library, '1234');
      expect(v.ownControls, isTrue);
      final url = v.playerUrl();
      expect(url.queryParameters['token'], 't1');
      expect(url.queryParameters['expires'], '99');
      expect(url.queryParameters['autoplay'], 'false');
    });

    test('other video sites keep their player, without what can be hidden', () {
      final wistia = parse('https://fast.wistia.net/embed/iframe/abc123')!;
      expect(wistia.ownControls, isFalse);
      expect(wistia.playerUrl().queryParameters, containsPair('seo', 'false'));
      final daily = parse('https://www.dailymotion.com/video/x8abc12_title')!;
      expect(daily.id, 'x8abc12');
      expect(daily.playerUrl().queryParameters, containsPair('ui-logo', '0'));
      expect(parse('https://dai.ly/x8abc12')?.host, VideoHost.dailymotion);
      final loom = parse('https://www.loom.com/share/0123abcd')!;
      expect(loom.playerUrl().toString(), contains('/embed/0123abcd'));
      expect(
        loom.playerUrl().queryParameters,
        containsPair('hide_owner', 'true'),
      );
      expect(parse('https://x.test/video.mp4'), isNull);
      expect(parse('not a link'), isNull);
    });

    test('embed code', () {
      expect(
        HostedVideo.fromEmbedHtml(
          '<div><iframe src="https://player.vimeo.com/video/1234?h=ff00ff00" '
          'width="640"></iframe></div>',
        ),
        const HostedVideo(host: VideoHost.vimeo, id: '1234', hash: 'ff00ff00'),
      );
      expect(HostedVideo.fromEmbedHtml('<video src="a.mp4"></video>'), isNull);
    });
  });

  group('player page', () {
    test("YouTube's player is asked to hide everything it can", () {
      final url = HostedVideo.parse('https://youtu.be/dQw4w9WgXcQ')!
          .playerUrl(startSeconds: 42);
      expect(url.host, 'www.youtube.com');
      expect(url.path, '/embed/dQw4w9WgXcQ');
      expect(url.queryParameters, {
        'enablejsapi': '1',
        'controls': '0',
        'rel': '0',
        'iv_load_policy': '3',
        'disablekb': '1',
        'fs': '0',
        'playsinline': '1',
        'modestbranding': '1',
        'cc_load_policy': '0',
        'autoplay': '0',
        'start': '42',
      });
    });

    test("Vimeo's player too", () {
      final url = HostedVideo.parse('https://vimeo.com/76979871/2b3c4d5e6f')!
          .playerUrl();
      expect(
        url.toString(),
        startsWith('https://player.vimeo.com/video/76979871?'),
      );
      expect(url.queryParameters, containsPair('h', '2b3c4d5e6f'));
      for (final param in [
        'title',
        'byline',
        'portrait',
        'badge',
        'controls',
        'transparent',
        'pip',
        'autopause',
        'keyboard',
      ]) {
        expect(url.queryParameters[param], '0', reason: param);
      }
      expect(url.queryParameters['dnt'], '1');
    });

    test('the page hides the player and talks to the app', () {
      final html = brandlessPlayerHtml(
        HostedVideo.parse('https://youtu.be/dQw4w9WgXcQ')!,
        origin: 'https://academy.test',
        startSeconds: 30,
      );
      final config = jsonDecode(
        RegExp(r'var C = (\{.*?\});').firstMatch(html)!.group(1)!,
      ) as Map<String, dynamic>;
      expect(config['host'], 'youtube');
      expect(config['start'], 30);
      expect(config['origin'], 'https://academy.test');
      expect(
        Uri.parse(config['src'] as String).queryParameters['controls'],
        '0',
      );
      // The IFrame Player API, with the page's own address as origin.
      expect(html, contains('https://www.youtube.com/iframe_api'));
      expect(html, contains("'&origin=' + encodeURIComponent(origin())"));
      // 51 The frame is five times as tall as the box, so the site's title,
      // logo, buttons and pause overlay fall outside it; a layer takes every
      // touch; the last half second is covered before an end screen.
      expect(html, contains('height: 500%'));
      expect(html, contains('top: -200%'));
      expect(
        html,
        contains(
          "duration - position < 0.5 && state === 'playing' ? '' : 'off'",
        ),
      );
      expect(html, contains('pointer-events: none'));
      expect(html, contains('id="shield"'));
      expect(html, contains('id="cover"'));
      expect(html, contains('window.open = function () { return null; }'));
      expect(html, contains('window.YallappPlayer.postMessage(text)'));
      expect(html, contains('window.yallappReceive = receive'));
      expect(html, isNot(contains('allowfullscreen')));

      final vimeo = brandlessPlayerHtml(
        HostedVideo.parse('https://vimeo.com/76979871')!,
        origin: 'https://academy.test',
      );
      expect(vimeo, contains('https://player.vimeo.com/api/player.js'));
      expect(vimeo, contains('"host":"vimeo"'));
    });

    test('72 by default each site shows its normal player', () {
      final youtube = HostedVideo.parse('https://youtu.be/dQw4w9WgXcQ')!
          .playerUrl(startSeconds: 42, hideBranding: false);
      // Only what the app needs: its API, inline play on iPhone, the start.
      expect(youtube.queryParameters, {
        'enablejsapi': '1',
        'playsinline': '1',
        'autoplay': '0',
        'start': '42',
      });
      final vimeo = HostedVideo.parse('https://vimeo.com/76979871/2b3c4d5e6f')!
          .playerUrl(hideBranding: false);
      expect(vimeo.queryParameters, containsPair('h', '2b3c4d5e6f'));
      for (final param in ['title', 'byline', 'controls', 'badge']) {
        expect(vimeo.queryParameters.containsKey(param), isFalse);
      }
      final bunny = HostedVideo.parse(
        'https://iframe.mediadelivery.net/embed/1234/abcd-ef?token=t1&expires=99',
      )!.playerUrl(hideBranding: false);
      expect(bunny.queryParameters['token'], 't1');
      expect(
        HostedVideo.parse('https://fast.wistia.net/embed/iframe/abc123')!
            .playerUrl(hideBranding: false)
            .queryParameters
            .containsKey('seo'),
        isFalse,
      );
      expect(
        HostedVideo.parse('https://dai.ly/x8abc12')!
            .playerUrl(hideBranding: false)
            .queryParameters
            .containsKey('ui-logo'),
        isFalse,
      );
      expect(
        HostedVideo.parse('https://www.loom.com/share/0123abcd')!
            .playerUrl(hideBranding: false)
            .queryParameters,
        isEmpty,
      );
    });

    test(
      "72 the page shows the site's own player and still talks to the app",
      () {
        final html = brandlessPlayerHtml(
          HostedVideo.parse('https://youtu.be/dQw4w9WgXcQ')!,
          origin: 'https://academy.test',
          startSeconds: 30,
          siteControls: true,
        );
        final config = jsonDecode(
          RegExp(r'var C = (\{.*?\});').firstMatch(html)!.group(1)!,
        ) as Map<String, dynamic>;
        expect(config['site'], isTrue);
        final src = Uri.parse(config['src'] as String).queryParameters;
        expect(src.containsKey('controls'), isFalse);
        expect(src.containsKey('modestbranding'), isFalse);
        expect(src['start'], '30');
        // The frame fills the box and takes the touches; no cover, no layer.
        expect(html, contains("frame.style.pointerEvents = 'auto'"));
        expect(html, contains('cover.parentNode.removeChild(cover)'));
        expect(html, contains("frame.style.height = h + 'px'"));
        expect(html, contains('if (!site) cover.className'));
        // The events still reach the app.
        expect(html, contains('window.YallappPlayer.postMessage(text)'));
        expect(html, contains('https://www.youtube.com/iframe_api'));

        final hidden = brandlessPlayerHtml(
          HostedVideo.parse('https://youtu.be/dQw4w9WgXcQ')!,
          origin: 'https://academy.test',
        );
        expect(hidden, contains('"site":false'));
      },
    );

    test("a link can't end the page's script", () {
      final html = brandlessPlayerHtml(
        const HostedVideo(
          host: VideoHost.bunny,
          id: 'x',
          library: '1',
          query: {'token': '</script><script>alert(1)'},
        ),
        origin: 'https://academy.test',
      );
      expect(html, isNot(contains('</script><script>alert')));
    });
  });

  group('navigation', () {
    final page = Uri.parse('https://academy.test/');
    bool allowed(String url, {bool mainFrame = false}) =>
        videoNavigationAllowed(Uri.parse(url), mainFrame, page: page);

    test('the page itself loads; nothing replaces it', () {
      expect(allowed('https://academy.test/', mainFrame: true), isTrue);
      expect(allowed('about:blank', mainFrame: true), isTrue);
      for (final url in [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://vimeo.com/76979871',
        'https://academy.test/other',
        'https://example.com/',
      ]) {
        // Links, window.open and target="_blank" all arrive as top-level
        // navigations: refused, and opened nowhere else either.
        expect(allowed(url, mainFrame: true), isFalse, reason: url);
      }
    });

    test('frames load the players, never the sites or their apps', () {
      expect(allowed('https://www.youtube.com/embed/dQw4w9WgXcQ?x=1'), isTrue);
      expect(allowed('https://www.youtube-nocookie.com/embed/abc'), isTrue);
      expect(allowed('https://player.vimeo.com/video/76979871'), isTrue);
      expect(allowed('https://iframe.mediadelivery.net/embed/1/2'), isTrue);
      expect(allowed('https://fast.wistia.net/embed/iframe/abc'), isTrue);
      expect(allowed('https://www.loom.com/embed/abc'), isTrue);
      expect(allowed('https://www.dailymotion.com/embed/video/x8'), isTrue);
      expect(allowed('https://googleads.g.doubleclick.net/pagead/x'), isTrue);
      expect(allowed('about:blank'), isTrue);
      for (final url in [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/channel/UC123',
        'https://www.youtube.com/@academy',
        'https://consent.youtube.com/m?continue=x',
        'https://accounts.youtube.com/',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://vimeo.com/76979871',
        'https://vimeo.com/',
        'https://player.vimeo.com/',
        'https://www.dailymotion.com/video/x8',
        'https://dai.ly/x8',
        'https://wistia.com/',
        'https://home.wistia.com/medias/abc',
        'https://www.loom.com/share/abc',
        'https://bunny.net/',
        'intent://www.youtube.com/watch?v=x#Intent;scheme=https;end',
        'vnd.youtube:dQw4w9WgXcQ',
        'youtube://watch?v=x',
        'market://details?id=com.google.android.youtube',
      ]) {
        expect(allowed(url), isFalse, reason: url);
      }
    });
  });

  group('player controller', () {
    late _Page page;
    late WatchTracker tracker;
    late EmbedPlayerController c;

    void event(Map<String, Object?> e) => c.handleMessage(jsonEncode(e));

    setUp(() {
      page = _Page();
      tracker = WatchTracker();
      c = EmbedPlayerController(tracker: tracker, preferredSpeed: 1.5);
    });

    tearDown(() => c.dispose());

    test('commands wait for the page', () {
      c.play();
      expect(page.sent, isEmpty);
      c.attach(page);
      expect(page.commands, ['play']);
    });

    test('from loading to the end', () {
      c.attach(page);
      expect(c.phase, EmbedPhase.loading);
      expect(c.ready, isFalse);
      event({'type': 'state', 'state': 'loading'});
      event({
        'type': 'ready',
        'duration': 100,
        'rates': [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        'captions': <Object>[],
      });
      expect(c.ready, isTrue);
      expect(c.phase, EmbedPhase.ready);
      expect(c.value.duration, const Duration(seconds: 100));
      expect(c.value.speeds, [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]);
      expect(c.value.started, isFalse);
      // The student's default speed is set once the player is ready.
      expect(page.sent.last, {'command': 'rate', 'rate': 1.5});
      expect(c.value.speed, 1.5);

      c.togglePlay();
      expect(page.sent.last, {'command': 'play'});
      event({'type': 'state', 'state': 'buffering'});
      expect(c.value.playing, isTrue);
      expect(c.value.buffering, isTrue);
      event({'type': 'state', 'state': 'playing', 'position': 0});
      expect(c.value.started, isTrue);
      expect(c.value.buffering, isFalse);

      // Watched seconds count only while playing.
      for (var s = 0; s < 10; s++) {
        event({
          'type': 'time',
          'position': s + 0.5,
          'duration': 100,
          'buffered': 0.3,
        });
      }
      expect(c.value.position, const Duration(milliseconds: 9500));
      expect(c.value.buffered, 0.3);
      expect(tracker.percent, 10);

      c.togglePlay();
      expect(page.sent.last, {'command': 'pause'});
      event({'type': 'state', 'state': 'paused'});
      expect(c.value.playing, isFalse);
      event({'type': 'time', 'position': 60, 'duration': 100});
      expect(tracker.percent, 10, reason: 'not while paused');

      c.seek(const Duration(seconds: 80));
      expect(page.sent.last, {'command': 'seek', 'seconds': 80.0});
      expect(c.value.position, const Duration(seconds: 80));

      event({
        'type': 'state',
        'state': 'ended',
        'position': 100,
        'duration': 100,
      });
      expect(c.value.ended, isTrue);
      expect(c.value.playing, isFalse);
      expect(c.value.position, const Duration(seconds: 100));

      // Play again starts over (the page seeks to 0).
      c.togglePlay();
      expect(page.sent.last, {'command': 'play'});
      event({'type': 'state', 'state': 'playing', 'position': 0});
      expect(c.value.ended, isFalse);
    });

    test('speeds, captions and quality', () {
      c.attach(page);
      event({
        'type': 'ready',
        'duration': 30,
        'rates': [0.5, 0.75, 1, 1.25, 1.5, 2],
        'captions': [
          {'language': 'en', 'label': 'English'},
          {'language': 'tr', 'label': 'Türkçe'},
        ],
        'qualities': [
          {'id': 'auto', 'label': 'Auto'},
          {'id': '1080p', 'label': '1080p'},
        ],
        'quality': 'auto',
      });
      expect(c.value.nextSpeed(), 2.0);
      c.toggleCaptions(preferred: 'tr');
      expect(page.sent.last, {'command': 'captions', 'language': 'tr'});
      expect(c.value.captionLanguage, 'tr');
      c.toggleCaptions(preferred: 'tr');
      expect(page.sent.last, {'command': 'captions', 'language': null});
      expect(c.value.captionLanguage, isNull);
      c.toggleCaptions(preferred: 'ar');
      expect(c.value.captionLanguage, 'en', reason: 'the first track');
      c.setQuality('1080p');
      expect(page.sent.last, {'command': 'quality', 'quality': '1080p'});
      expect(c.value.quality, '1080p');

      // A plan without speeds: the speed button goes.
      event({'type': 'rate', 'rate': 1, 'rates': <Object>[]});
      expect(c.value.speeds, isEmpty);
      expect(c.value.speed, 1);
    });

    test('caption tracks found later, and errors', () {
      c.attach(page);
      event({'type': 'ready', 'duration': 30, 'rates': <Object>[]});
      expect(c.value.captions, isEmpty);
      expect(c.value.speeds, isEmpty);
      event({
        'type': 'tracks',
        'captions': [
          {'language': 'en', 'label': 'English'},
        ],
      });
      expect(c.value.captions, [
        const CaptionTrack(language: 'en', label: 'English'),
      ]);
      c.handleMessage('not json');
      c.handleMessage('[1, 2]');
      event({'type': 'error', 'code': '150'});
      expect(c.phase, EmbedPhase.error);
      expect(c.error, '150');
      expect(c.ready, isFalse);
      c.detach();
      expect(c.phase, EmbedPhase.loading);
    });
  });
}
