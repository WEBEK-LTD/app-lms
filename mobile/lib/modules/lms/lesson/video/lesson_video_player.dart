import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/providers.dart';
import '../../../../core/storage/local_settings.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/web/web_view.dart';
import '../../../../core/widgets/common.dart';
import '../embeds/embed_frame.dart';
import 'embed_player.dart';
import 'hosted_video.dart';
import 'player_controls.dart';
import 'signed_link.dart';
import 'watch_tracker.dart';
import 'watermark.dart';
import '../../../../core/l10n/l10n.dart';

export 'watch_tracker.dart';

/// The lesson video (design: Lesson): uploaded and external files play with
/// `video_player` from the signed URL; YouTube, Vimeo and Bunny Stream play
/// in a web view behind the same controls (40: nothing shows where they're
/// hosted, see [BrandlessVideo]); other embeds play in a web view that can't
/// open their site. A moving watermark sits on top, and the video is blanked
/// while the screen is being captured (iOS).
class LessonVideoPlayer extends ConsumerStatefulWidget {
  const LessonVideoPlayer({
    super.key,
    required this.video,
    required this.reloadVideo,
    this.startSeconds = 0,
    this.watermark,
    this.captured = false,
    this.onProgress,
    this.onEnded,
    this.overlay,
  });

  final Video video;

  /// Re-fetches the lesson for a fresh signed URL when the current one has
  /// expired or stopped working.
  final Future<Video?> Function() reloadVideo;
  final int startSeconds;
  final String? watermark;

  /// True while the screen is recorded or mirrored (iOS): the video is hidden.
  final bool captured;
  final void Function(int positionSeconds, double watchedPercent)? onProgress;
  final VoidCallback? onEnded;

  /// Drawn above the video at the top (back button).
  final Widget? overlay;

  @override
  ConsumerState<LessonVideoPlayer> createState() => _LessonVideoPlayerState();
}

class _LessonVideoPlayerState extends ConsumerState<LessonVideoPlayer> {
  VideoPlayerController? _controller;
  late WatchTracker _tracker;
  Timer? _progressTimer;
  Object? _error;
  bool _loading = false;
  bool _reloaded = false;
  bool _ended = false;
  bool _wasPlaying = false;
  Duration _lastPosition = Duration.zero;
  late final ValueNotifier<bool> _captured = ValueNotifier(widget.captured);

  /// 51 The signed link, renewed before it ends and when it stops working.
  late final SignedVideoLink _link = SignedVideoLink(
    widget.video,
    reload: widget.reloadVideo,
  );
  Timer? _refreshTimer;

  /// 40 The video site and video, when it's on one.
  late final HostedVideo? _hosted = hostedLessonVideo(widget.video);

  @override
  void initState() {
    super.initState();
    _tracker = WatchTracker(durationSeconds: widget.video.durationSeconds);
    _lastPosition = Duration(seconds: widget.startSeconds);
    if (_hosted == null && widget.video.playsNatively) {
      unawaited(_init(_lastPosition));
      _progressTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (_controller?.value.isPlaying ?? false) _report();
      });
      _scheduleRefresh();
    }
  }

  /// 51 A new link shortly before this one ends. A paused video moves to it
  /// at once, so it resumes without a hitch; a playing one keeps the bytes it
  /// has and moves to it if the old link stops working.
  void _scheduleRefresh() {
    _refreshTimer?.cancel();
    final wait = _link.refreshIn();
    if (wait == null) return;
    _refreshTimer = Timer(wait, () async {
      final changed = await _link.renew();
      if (!mounted) return;
      final c = _controller;
      if (changed && c != null && !c.value.isPlaying && !_loading) {
        c.removeListener(_onTick);
        unawaited(_init(_lastPosition));
      }
      _scheduleRefresh();
    });
  }

  @override
  void didUpdateWidget(LessonVideoPlayer old) {
    super.didUpdateWidget(old);
    if (widget.captured && !old.captured) _controller?.pause();
    _captured.value = widget.captured;
  }

  Future<void> _init(Duration at, {bool resume = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // A link that has ended (or is about to) is replaced first.
      final current = await _link.current();
      final url = current.url;
      if (url == null) throw StateError('No video URL');
      // 62 A link bound to the student opens with their access token.
      final headers = await boundMediaHeaders(
        ref.read(tokenManagerProvider),
        url,
      );
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(url),
        httpHeaders: headers,
      );
      await controller.initialize();
      if (at > Duration.zero && at < controller.value.duration) {
        await controller.seekTo(at);
      }
      await controller.setPlaybackSpeed(
        ref.read(localSettingsProvider).playbackSpeed,
      );
      // 51 Carries on playing after a new link.
      if (resume) await controller.play();
      controller.addListener(_onTick);
      _tracker.durationSeconds = controller.value.duration.inSeconds;
      final old = _controller;
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _loading = false;
      });
      _reloaded = false;
      await old?.dispose();
    } on Object catch (e) {
      if (!mounted) return;
      if (!_reloaded) {
        // A signed link may have expired: fetch a fresh one once.
        _reloaded = true;
        await _link.renew();
        if (mounted) return _init(at, resume: resume);
      }
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  void _onTick() {
    final c = _controller;
    if (c == null) return;
    final value = c.value;
    if (value.hasError) {
      // 51 Usually the signed link ended mid-video: a new one, from where it was.
      c.removeListener(_onTick);
      _reloaded = false;
      unawaited(_init(_lastPosition, resume: _wasPlaying));
      return;
    }
    _lastPosition = value.position;
    if (value.isPlaying) _tracker.record(value.position);
    if (_wasPlaying && !value.isPlaying) _report();
    _wasPlaying = value.isPlaying;
    final duration = value.duration;
    if (!_ended &&
        duration > Duration.zero &&
        value.position >= duration - const Duration(milliseconds: 400) &&
        !value.isPlaying) {
      _ended = true;
      _report();
      widget.onEnded?.call();
    }
  }

  void _report() =>
      widget.onProgress?.call(_lastPosition.inSeconds, _tracker.percent);

  @override
  void dispose() {
    _progressTimer?.cancel();
    _refreshTimer?.cancel();
    if (_controller != null) _report();
    _controller?.removeListener(_onTick);
    _controller?.dispose();
    _captured.dispose();
    super.dispose();
  }

  Future<void> _openFullScreen() async {
    final c = _controller;
    if (c == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => FullscreenPlayerFrame(
          captured: _captured,
          portrait: c.value.aspectRatio < 1,
          watermark: widget.watermark == null
              ? null
              : MovingWatermark(text: widget.watermark!),
          child: _NativeVideo(
            controller: c,
            fullScreen: true,
            onFullScreen: () => Navigator.of(context).maybePop(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final Widget video;
    final hosted = _hosted;
    if (hosted != null && hosted.ownControls) {
      // 40 Stays in place while the screen is captured (it pauses and covers
      // itself), so the student carries on where they were.
      video = BrandlessVideo(
        video: hosted,
        posterUrl: widget.video.posterUrl,
        startSeconds: widget.startSeconds,
        tracker: _tracker,
        onProgress: widget.onProgress,
        onEnded: widget.onEnded,
        watermark: widget.watermark,
        captured: _captured,
      );
    } else if (widget.captured) {
      video = const CapturedNotice();
    } else if (hosted != null || !widget.video.playsNatively) {
      video = _WebVideo(video: widget.video, hosted: hosted);
    } else if (_error != null) {
      video = VideoMessage(
        icon: AppIcons.error,
        message: context.l10n.videoFailed,
        actionLabel: context.l10n.tryAgain,
        onAction: () {
          _reloaded = false;
          unawaited(_init(_lastPosition));
        },
      );
    } else if (_loading || _controller == null) {
      // The poster, dimmed, while the video gets ready.
      final poster = widget.video.posterUrl;
      video = Stack(
        fit: StackFit.expand,
        children: [
          if (poster != null && poster.isNotEmpty)
            Opacity(opacity: 0.55, child: AppNetworkImage(url: poster)),
          Center(
            child: CircularProgressIndicator(
              color: Colors.white,
              semanticsLabel: context.l10n.loadingVideo,
            ),
          ),
        ],
      );
    } else {
      video = _NativeVideo(
        controller: _controller!,
        onFullScreen: _openFullScreen,
      );
    }
    return ColoredBox(
      color: BrandColors.midnight,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            video,
            if (widget.watermark != null && !widget.captured)
              MovingWatermark(text: widget.watermark!),
            if (widget.overlay != null)
              PositionedDirectional(top: 12, start: 12, child: widget.overlay!),
          ],
        ),
      ),
    );
  }
}

/// 40 The lesson video's site and video, from its link or its embed code;
/// null for files and for embeds of other sites.
HostedVideo? hostedLessonVideo(Video video) {
  final url = video.url;
  if (url != null && url.isNotEmpty) {
    final hosted = HostedVideo.parse(url);
    if (hosted != null) return hosted;
  }
  final embed = video.embedHtml;
  if (embed != null && embed.isNotEmpty) {
    return HostedVideo.fromEmbedHtml(embed);
  }
  return null;
}

/// A video site's own player (Wistia, Dailymotion, Loom) or another embed in
/// a web view, with its branding turned off where the site allows it. 40
/// Nothing in it can open another page, the site's app or a browser.
class _WebVideo extends ConsumerWidget {
  const _WebVideo({required this.video, this.hosted});

  final Video video;
  final HostedVideo? hosted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = ref.watch(appEnvironmentProvider).siteUrl;
    final builder = ref.watch(webViewBuilderProvider);
    final embedHtml = video.embedHtml;
    final url = video.url;
    final String html;
    if (hosted != null) {
      html = embedWrapperHtml(
        src: hosted!.playerUrl().toString(),
        measure: false,
      );
    } else if (url != null && url.isNotEmpty) {
      html = embedWrapperHtml(src: embeddableVideoUrl(url), measure: false);
    } else if (embedHtml != null && embedHtml.isNotEmpty) {
      html =
          '<!doctype html><html><head><meta name="viewport" '
          'content="width=device-width, initial-scale=1"><style>'
          'html,body{margin:0;height:100%;background:#000;overflow:hidden}'
          'iframe,video{border:0;width:100%!important;height:100%!important}'
          '</style></head><body>$embedHtml</body></html>';
    } else {
      return VideoMessage(
        icon: AppIcons.error,
        message: context.l10n.videoUnavailable,
      );
    }
    final page = Uri.parse('$site/');
    return builder(
      WebViewRequest(
        html: html,
        baseUrl: '$site/',
        allowNavigation: (uri, mainFrame) =>
            videoNavigationAllowed(uri, mainFrame, page: page),
        debugLabel: 'video',
      ),
    );
  }
}

class _NativeVideo extends StatelessWidget {
  const _NativeVideo({
    required this.controller,
    required this.onFullScreen,
    this.fullScreen = false,
  });

  final VideoPlayerController controller;
  final VoidCallback onFullScreen;
  final bool fullScreen;

  void _togglePlay() {
    final value = controller.value;
    if (value.isPlaying) {
      controller.pause();
    } else {
      if (value.position >= value.duration) controller.seekTo(Duration.zero);
      controller.play();
    }
  }

  @override
  Widget build(BuildContext context) =>
      ValueListenableBuilder<VideoPlayerValue>(
        valueListenable: controller,
        builder: (context, value, _) {
          final state = nativeSnapshot(value);
          return PlayerSurface(
            playing: state.playing,
            video: Center(
              child: AspectRatio(
                aspectRatio: value.aspectRatio,
                child: VideoPlayer(controller),
              ),
            ),
            controls: PlayerControls(
              state: state,
              fullScreen: fullScreen,
              onPlayPause: _togglePlay,
              onSeek: controller.seekTo,
              onSpeed: () => controller.setPlaybackSpeed(state.nextSpeed()),
              onFullScreen: onFullScreen,
            ),
          );
        },
      );
}

/// 40 What the controls show for a file the app plays itself.
PlayerSnapshot nativeSnapshot(VideoPlayerValue value) {
  final duration = value.duration;
  var loaded = Duration.zero;
  for (final range in value.buffered) {
    if (range.end > loaded) loaded = range.end;
  }
  return PlayerSnapshot(
    position: value.position,
    duration: duration,
    buffered: duration > Duration.zero
        ? (loaded.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0)
        : 0,
    playing: value.isPlaying,
    buffering: value.isBuffering,
    started: true,
    ended:
        duration > Duration.zero &&
        value.position >= duration &&
        !value.isPlaying,
    speed: value.playbackSpeed,
  );
}
