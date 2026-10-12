import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'watermark.dart';

/// How much of a video has been watched: distinct seconds played, so skipping
/// ahead doesn't count.
class WatchTracker {
  WatchTracker({int? durationSeconds}) : _duration = durationSeconds;

  final _seconds = <int>{};
  int? _duration;

  set durationSeconds(int value) => _duration = value;

  void record(Duration position) => _seconds.add(position.inSeconds);

  double get percent {
    final d = _duration;
    if (d == null || d <= 0) return 0;
    return (_seconds.length / d * 100).clamp(0, 100).toDouble();
  }
}

/// The lesson video (design: Lesson): uploaded and external files play with
/// `video_player` from the signed URL; YouTube, Vimeo and other embeds play
/// in a web view. A moving watermark sits on top, and the video is blanked
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

  @override
  void initState() {
    super.initState();
    _tracker = WatchTracker(durationSeconds: widget.video.durationSeconds);
    _lastPosition = Duration(seconds: widget.startSeconds);
    if (widget.video.playsNatively) {
      unawaited(_init(widget.video, _lastPosition));
      _progressTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (_controller?.value.isPlaying ?? false) _report();
      });
    }
  }

  @override
  void didUpdateWidget(LessonVideoPlayer old) {
    super.didUpdateWidget(old);
    if (widget.captured && !old.captured) _controller?.pause();
    _captured.value = widget.captured;
  }

  Future<void> _init(Video video, Duration at) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    var current = video;
    try {
      if (current.isExpired(DateTime.now().toUtc())) {
        current = await widget.reloadVideo() ?? current;
      }
      final url = current.url;
      if (url == null) throw StateError('No video URL');
      final controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await controller.initialize();
      if (at > Duration.zero && at < controller.value.duration) {
        await controller.seekTo(at);
      }
      await controller.setPlaybackSpeed(
        ref.read(localSettingsProvider).playbackSpeed,
      );
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
      await old?.dispose();
    } on Object catch (e) {
      if (!mounted) return;
      if (!_reloaded) {
        // A signed link may have expired: fetch a fresh one once.
        _reloaded = true;
        final fresh = await widget.reloadVideo();
        if (fresh != null && mounted) return _init(fresh, at);
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
      c.removeListener(_onTick);
      _reloaded = false;
      unawaited(_init(widget.video, _lastPosition));
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
        builder: (_) => _FullscreenVideo(
          controller: c,
          watermark: widget.watermark,
          captured: _captured,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final Widget video;
    if (widget.captured) {
      video = const _CapturedNotice();
    } else if (!widget.video.playsNatively) {
      video = _WebVideo(video: widget.video);
    } else if (_error != null) {
      video = _VideoMessage(
        icon: AppIcons.error,
        message: "The video couldn't be played.",
        actionLabel: 'Try again',
        onAction: () {
          _reloaded = false;
          unawaited(_init(widget.video, _lastPosition));
        },
      );
    } else if (_loading || _controller == null) {
      video = const Center(
        child: CircularProgressIndicator(
          color: Colors.white,
          semanticsLabel: 'Loading video',
        ),
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
              Positioned(top: 12, left: 12, child: widget.overlay!),
          ],
        ),
      ),
    );
  }
}

class _CapturedNotice extends StatelessWidget {
  const _CapturedNotice();

  @override
  Widget build(BuildContext context) => const _VideoMessage(
    icon: AppIcons.visibilityOff,
    message: 'Screen recording is on. Stop recording to keep watching.',
  );
}

class _VideoMessage extends StatelessWidget {
  const _VideoMessage({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: Colors.black,
    child: Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(icon, size: 28, color: BrandColors.ivory),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: BrandColors.ivory, fontSize: 14),
            ),
            if (actionLabel != null) ...[
              const SizedBox(height: 10),
              TextButton(
                onPressed: onAction,
                style: TextButton.styleFrom(foregroundColor: BrandColors.ivory),
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

/// YouTube, Vimeo or another embed player in a web view.
class _WebVideo extends ConsumerWidget {
  const _WebVideo({required this.video});

  final Video video;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = ref.watch(appEnvironmentProvider).siteUrl;
    final builder = ref.watch(webViewBuilderProvider);
    final embedHtml = video.embedHtml;
    final url = video.url;
    final String html;
    if (url != null && url.isNotEmpty) {
      html = embedWrapperHtml(src: embeddableVideoUrl(url), measure: false);
    } else if (embedHtml != null && embedHtml.isNotEmpty) {
      html =
          '<!doctype html><html><head><meta name="viewport" '
          'content="width=device-width, initial-scale=1"><style>'
          'html,body{margin:0;height:100%;background:#000;overflow:hidden}'
          'iframe,video{border:0;width:100%!important;height:100%!important}'
          '</style></head><body>$embedHtml</body></html>';
    } else {
      return const _VideoMessage(
        icon: AppIcons.error,
        message: "This video isn't available.",
      );
    }
    return builder(
      WebViewRequest(
        html: html,
        baseUrl: '$site/',
        openLinksOutside: true,
        debugLabel: 'video',
      ),
    );
  }
}

class _NativeVideo extends StatefulWidget {
  const _NativeVideo({
    required this.controller,
    required this.onFullScreen,
    this.fullScreen = false,
  });

  final VideoPlayerController controller;
  final VoidCallback onFullScreen;
  final bool fullScreen;

  @override
  State<_NativeVideo> createState() => _NativeVideoState();
}

class _NativeVideoState extends State<_NativeVideo> {
  bool _controlsVisible = true;
  Timer? _hide;

  VideoPlayerController get _c => widget.controller;

  void _scheduleHide() {
    _hide?.cancel();
    _hide = Timer(const Duration(seconds: 3), () {
      if (mounted && _c.value.isPlaying) {
        setState(() => _controlsVisible = false);
      }
    });
  }

  void _toggleControls() {
    setState(() => _controlsVisible = !_controlsVisible);
    if (_controlsVisible) _scheduleHide();
  }

  void _togglePlay() {
    final value = _c.value;
    if (value.isPlaying) {
      _c.pause();
    } else {
      if (value.position >= value.duration) _c.seekTo(Duration.zero);
      _c.play();
      _scheduleHide();
    }
  }

  void _cycleSpeed() {
    final current = _c.value.playbackSpeed;
    final index = playbackSpeeds.indexWhere((s) => s == current);
    final next = playbackSpeeds[(index + 1) % playbackSpeeds.length];
    _c.setPlaybackSpeed(next);
  }

  @override
  void dispose() {
    _hide?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTap: _toggleControls,
    child: Stack(
      fit: StackFit.expand,
      children: [
        Center(
          child: AspectRatio(
            aspectRatio: _c.value.aspectRatio,
            child: VideoPlayer(_c),
          ),
        ),
        AnimatedOpacity(
          opacity: _controlsVisible ? 1 : 0,
          duration: const Duration(milliseconds: 200),
          child: IgnorePointer(
            ignoring: !_controlsVisible,
            child: ValueListenableBuilder<VideoPlayerValue>(
              valueListenable: _c,
              builder: (context, value, _) => _Controls(
                value: value,
                fullScreen: widget.fullScreen,
                onPlayPause: _togglePlay,
                onSeek: (d) => _c.seekTo(d),
                onSpeed: _cycleSpeed,
                onFullScreen: widget.onFullScreen,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _Controls extends StatelessWidget {
  const _Controls({
    required this.value,
    required this.fullScreen,
    required this.onPlayPause,
    required this.onSeek,
    required this.onSpeed,
    required this.onFullScreen,
  });

  final VideoPlayerValue value;
  final bool fullScreen;
  final VoidCallback onPlayPause;
  final ValueChanged<Duration> onSeek;
  final VoidCallback onSpeed;
  final VoidCallback onFullScreen;

  @override
  Widget build(BuildContext context) {
    final duration = value.duration;
    final position = value.position > duration ? duration : value.position;
    const muted = Color(0xFFC9C6DC);
    const chip = Color(0xFF24223F);
    final ended =
        duration > Duration.zero && position >= duration && !value.isPlaying;
    return Stack(
      children: [
        Center(
          child: Semantics(
            button: true,
            label: value.isPlaying ? 'Pause' : (ended ? 'Play again' : 'Play'),
            excludeSemantics: true,
            child: Material(
              color: Colors.white,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onPlayPause,
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: AppIcon(
                    value.isPlaying
                        ? AppIcons.pause
                        : (ended ? AppIcons.replay : AppIcons.play),
                    size: 28,
                    color: BrandColors.midnight,
                    filled: true,
                  ),
                ),
              ),
            ),
          ),
        ),
        Positioned(
          left: 8,
          right: 8,
          bottom: 4,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 4,
                  activeTrackColor: Colors.white,
                  inactiveTrackColor: const Color(0xFF3A3756),
                  thumbColor: Colors.white,
                  overlayShape: SliderComponentShape.noOverlay,
                  thumbShape: const RoundSliderThumbShape(
                    enabledThumbRadius: 6,
                  ),
                ),
                child: SizedBox(
                  height: 28,
                  child: Slider(
                    value: duration.inMilliseconds == 0
                        ? 0
                        : position.inMilliseconds / duration.inMilliseconds,
                    semanticFormatterCallback: (_) =>
                        '${formatClock(position)} of ${formatClock(duration)}',
                    onChanged: duration == Duration.zero
                        ? null
                        : (v) => onSeek(duration * v),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${formatClock(position)} / ${formatClock(duration)}',
                        style: const TextStyle(fontSize: 12, color: muted),
                      ),
                    ),
                    _ChipButton(
                      label: speedLabel(value.playbackSpeed),
                      semantics:
                          'Playback speed ${speedLabel(value.playbackSpeed)}',
                      color: chip,
                      onTap: onSpeed,
                    ),
                    const SizedBox(width: 8),
                    _ChipButton(
                      icon: fullScreen
                          ? AppIcons.fullscreenExit
                          : AppIcons.fullscreen,
                      semantics: fullScreen
                          ? 'Exit full screen'
                          : 'Full screen',
                      color: chip,
                      onTap: onFullScreen,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChipButton extends StatelessWidget {
  const _ChipButton({
    required this.semantics,
    required this.color,
    required this.onTap,
    this.label,
    this.icon,
  });

  final String? label;
  final IconData? icon;
  final String semantics;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: semantics,
    excludeSemantics: true,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
        child: Center(
          widthFactor: 1,
          child: Container(
            height: 28,
            constraints: const BoxConstraints(minWidth: 28),
            padding: EdgeInsets.symmetric(horizontal: label == null ? 0 : 10),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: label != null
                ? Text(
                    label!,
                    style: const TextStyle(fontSize: 12, color: Colors.white),
                  )
                : AppIcon(icon!, size: 16, color: Colors.white),
          ),
        ),
      ),
    ),
  );
}

/// The same player filling the screen; rotation is allowed here.
class _FullscreenVideo extends StatefulWidget {
  const _FullscreenVideo({
    required this.controller,
    required this.captured,
    this.watermark,
  });

  final VideoPlayerController controller;
  final ValueListenable<bool> captured;
  final String? watermark;

  @override
  State<_FullscreenVideo> createState() => _FullscreenVideoState();
}

class _FullscreenVideoState extends State<_FullscreenVideo> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    body: Stack(
      fit: StackFit.expand,
      children: [
        _NativeVideo(
          controller: widget.controller,
          fullScreen: true,
          onFullScreen: () => Navigator.of(context).maybePop(),
        ),
        if (widget.watermark != null) MovingWatermark(text: widget.watermark!),
        ValueListenableBuilder<bool>(
          valueListenable: widget.captured,
          builder: (context, captured, _) =>
              captured ? const _CapturedNotice() : const SizedBox.shrink(),
        ),
      ],
    ),
  );
}
