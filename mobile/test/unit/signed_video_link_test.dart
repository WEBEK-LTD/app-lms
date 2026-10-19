import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/lms/lesson/video/signed_link.dart';

/// 51 Videos from the Yallapp Media library (and uploads) play from signed
/// links that end: the player asks for a new one before the end and when it
/// stops on an old one, one request at a time.
void main() {
  final start = DateTime.utc(2026, 10, 19, 12);
  Video video(String url, DateTime? until) =>
      Video(source: VideoSource.upload, url: url, expiresAt: until);

  test('asks for a new link five minutes before this one ends', () {
    final now = start;
    final link = SignedVideoLink(
      video(
        'https://yallapp.test/media/v/a/1.mp4?sig=a',
        start.add(const Duration(hours: 4)),
      ),
      reload: () async => null,
      now: () => now,
    );
    expect(link.refreshIn(), const Duration(hours: 3, minutes: 55));
    // Close to the end: soon, never right away in a loop.
    final soon = SignedVideoLink(
      video('u', start.add(const Duration(minutes: 2))),
      reload: () async => null,
      now: () => start,
    );
    expect(soon.refreshIn(), const Duration(seconds: 10));
    // A link that doesn't end (a video file on the owner's server).
    expect(
      SignedVideoLink(video('u', null), reload: () async => null).refreshIn(),
      isNull,
    );
  });

  test(
    'replaces a link that ended (or is about to) before playing it',
    () async {
      var now = start;
      var fetched = 0;
      final link = SignedVideoLink(
        video(
          'https://yallapp.test/v?sig=old',
          start.add(const Duration(hours: 4)),
        ),
        reload: () async {
          fetched++;
          return video(
            'https://yallapp.test/v?sig=new$fetched',
            now.add(const Duration(hours: 4)),
          );
        },
        now: () => now,
      );
      expect((await link.current()).url, 'https://yallapp.test/v?sig=old');
      expect(fetched, 0);
      now = start.add(const Duration(hours: 3, minutes: 59, seconds: 45));
      expect((await link.current()).url, 'https://yallapp.test/v?sig=new1');
      expect(fetched, 1);
      // The new link is kept: no request until it nears its own end.
      expect((await link.current()).url, 'https://yallapp.test/v?sig=new1');
      expect(fetched, 1);
    },
  );

  test('renews when the player stops on an old link, once for calls at the same time', () async {
    var fetched = 0;
    final link = SignedVideoLink(
      video(
        'https://yallapp.test/v?sig=old',
        start.add(const Duration(hours: 4)),
      ),
      reload: () async {
        fetched++;
        await Future<void>.delayed(const Duration(milliseconds: 10));
        return video(
          'https://yallapp.test/v?sig=new',
          start.add(const Duration(hours: 8)),
        );
      },
      now: () => start,
    );
    final results = await Future.wait([link.renew(), link.renew()]);
    expect(results, [true, true]);
    expect(fetched, 1);
    expect(link.video.url, 'https://yallapp.test/v?sig=new');
    expect(link.video.expiresAt, start.add(const Duration(hours: 8)));
    // The same link again: nothing changed.
    expect(await link.renew(), isFalse);
  });

  test(
    'keeps the old link when the lesson can\'t be fetched or has no video',
    () async {
      Video? answer;
      final link = SignedVideoLink(
        video(
          'https://yallapp.test/v?sig=old',
          start.add(const Duration(hours: 4)),
        ),
        reload: () async => answer,
        now: () => start,
      );
      expect(await link.renew(), isFalse);
      answer = const Video(source: VideoSource.upload);
      expect(await link.renew(), isFalse);
      expect(link.video.url, 'https://yallapp.test/v?sig=old');
    },
  );
}
