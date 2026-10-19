import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/palette.dart';
import 'lesson_video_player.dart';

/// 51 A video on a screen of its own (a listing's "Watch video"): the app's
/// own player, so a YouTube, Vimeo or Bunny Stream video never shows where
/// it's hosted and nothing opens the site, and a file (or a picture's and
/// video's Yallapp link) plays natively. Before, the site's page opened.
class VideoScreen extends StatelessWidget {
  const VideoScreen({super.key, required this.url, required this.title});

  final String url;
  final String title;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: BrandColors.midnight,
    appBar: AppBar(
      backgroundColor: BrandColors.midnight,
      foregroundColor: BrandColors.white,
      title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
    ),
    body: SafeArea(
      child: Center(
        child: LessonVideoPlayer(
          video: Video(source: VideoSource.external, url: url),
          // A listing's video address isn't signed: nothing to renew.
          reloadVideo: () async => null,
        ),
      ),
    ),
  );
}
