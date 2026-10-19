import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/modules/lms/lesson/video/brandless_player_html.dart';
import 'package:yallapp/modules/lms/lesson/video/hosted_video.dart';

/// 40 Writes the video player pages for tool/check_player_pages.sh, which
/// runs them in Chromium against stand-in YouTube, Vimeo and Bunny players
/// (player_pages.cjs). Skipped in the normal test run.
void main() {
  final dir = Platform.environment['PLAYER_PAGES_DIR'];
  test('writes the player pages', () {
    for (final (name, url) in [
      ('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      ('vimeo', 'https://vimeo.com/76979871'),
      ('bunny', 'https://iframe.mediadelivery.net/embed/1234/abcd'),
    ]) {
      File('$dir/$name.html').writeAsStringSync(
        brandlessPlayerHtml(
          HostedVideo.parse(url)!,
          origin: 'http://127.0.0.1:47011',
          startSeconds: 5,
        ),
      );
    }
  }, skip: dir == null ? 'set PLAYER_PAGES_DIR' : false);
}
