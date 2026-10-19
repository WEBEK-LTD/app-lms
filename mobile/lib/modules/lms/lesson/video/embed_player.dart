import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/providers.dart';
import '../../../../core/storage/local_settings.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/web/web_view.dart';
import '../../../../core/widgets/common.dart';
import 'brandless_player_html.dart';
import 'hosted_video.dart';
import 'player_controls.dart';
import 'watch_tracker.dart';
import 'watermark.dart';

/// 40 Where a video site's player is: the page reports these in its `state`
/// events.
enum EmbedPhase { loading, ready, playing, paused, buffering, ended, error }

/// 40 Follows a video site's player in a web view (the events of
/// [brandlessPlayerHtml]) for the app's controls, counts the seconds
/// watched, and sends the controls' commands to the page.
class EmbedPlayerController extends ValueNotifier<PlayerSnapshot> {
  EmbedPlayerController({WatchTracker? tracker, this.preferredSpeed = 1})
    : tracker = tracker ?? WatchTracker(),
      super(const PlayerSnapshot(speeds: []));

  final WatchTracker tracker;

  /// The student's default speed, set once the player is ready.
  final double preferredSpeed;

  EmbedPhase phase = EmbedPhase.loading;

  /// The page's error code when it couldn't play.
  String? error;

  WebViewHandle? _page;
  final _queue = <String>[];

  bool get ready => phase != EmbedPhase.loading && phase != EmbedPhase.error;

  void attach(WebViewHandle page) {
    _page = page;
    for (final message in _queue) {
      unawaited(page.postToPage(message));
    }
    _queue.clear();
  }

  /// Starts over with a new page (after Try again).
  void detach() {
    _page = null;
    phase = EmbedPhase.loading;
    error = null;
    value = value.copyWith(playing: false, buffering: false);
  }

  void _send(Map<String, Object?> command) {
    final text = jsonEncode(command);
    final page = _page;
    if (page == null) {
      _queue.add(text);
    } else {
      unawaited(page.postToPage(text));
    }
  }

  /// One event from the page.
  void handleMessage(String text) {
    final Object? decoded;
    try {
      decoded = jsonDecode(text);
    } on FormatException {
      return;
    }
    if (decoded is! Map) return;
    final event = decoded.cast<String, Object?>();
    var next = value;
    switch (event['type']) {
      case 'ready':
        final rates = _doubles(event['rates']);
        final speeds = [
          for (final s in playbackSpeeds)
            if (rates.contains(s)) s,
        ];
        next = next.copyWith(
          duration: _duration(event['duration']) ?? next.duration,
          speeds: speeds,
          captions: _captions(event['captions']),
          qualities: _qualities(event['qualities']),
          quality: () => event['quality']?.toString(),
        );
        if (phase == EmbedPhase.loading) phase = EmbedPhase.ready;
        if (preferredSpeed != 1 && speeds.contains(preferredSpeed)) {
          _send({'command': 'rate', 'rate': preferredSpeed});
          next = next.copyWith(speed: preferredSpeed);
        }
      case 'state':
        final state = EmbedPhase.values.asNameMap()[event['state']];
        if (state == null) return;
        phase = state;
        final moving =
            state == EmbedPhase.playing || state == EmbedPhase.buffering;
        next = next.copyWith(
          playing: moving,
          buffering: state == EmbedPhase.buffering,
          started:
              next.started ||
              moving ||
              state == EmbedPhase.paused ||
              state == EmbedPhase.ended,
          ended: state == EmbedPhase.ended,
          position: _duration(event['position']),
          duration: _duration(event['duration']),
        );
        if (state == EmbedPhase.ended && next.duration > Duration.zero) {
          next = next.copyWith(position: next.duration);
        }
      case 'time':
        final position = _duration(event['position']) ?? next.position;
        final duration = _duration(event['duration']);
        if (duration != null && duration > Duration.zero) {
          tracker.durationSeconds = duration.inSeconds;
        }
        if (phase == EmbedPhase.playing) tracker.record(position);
        final buffered = event['buffered'];
        next = next.copyWith(
          position: position,
          duration: duration,
          buffered: buffered is num ? buffered.toDouble() : null,
        );
      case 'rate':
        final rate = event['rate'];
        next = next.copyWith(
          speed: rate is num ? rate.toDouble() : null,
          speeds: event['rates'] is List ? const [] : null,
        );
      case 'tracks':
        next = next.copyWith(captions: _captions(event['captions']));
      case 'captions':
        next = next.copyWith(
          captionLanguage: () => event['language']?.toString(),
        );
      case 'quality':
        next = next.copyWith(quality: () => event['quality']?.toString());
      case 'error':
        phase = EmbedPhase.error;
        error = event['code']?.toString();
        next = next.copyWith(playing: false, buffering: false);
      default:
        return;
    }
    value = next;
  }

  void play() => _send({'command': 'play'});

  void pause() => _send({'command': 'pause'});

  void togglePlay() => value.playing ? pause() : play();

  void seek(Duration to) {
    final seconds = to.inMilliseconds / 1000;
    _send({'command': 'seek', 'seconds': seconds});
    value = value.copyWith(position: to, ended: false);
  }

  void setSpeed(double speed) {
    _send({'command': 'rate', 'rate': speed});
    value = value.copyWith(speed: speed);
  }

  /// Turns captions off, or on in [preferred] language when there is a
  /// track for it (else the first track).
  void toggleCaptions({String? preferred}) {
    if (value.captionLanguage != null) {
      _send({'command': 'captions', 'language': null});
      value = value.copyWith(captionLanguage: () => null);
      return;
    }
    if (value.captions.isEmpty) return;
    final track = value.captions.firstWhere(
      (t) => preferred != null && t.language.split('-').first == preferred,
      orElse: () => value.captions.first,
    );
    _send({'command': 'captions', 'language': track.language});
    value = value.copyWith(captionLanguage: () => track.language);
  }

  void setQuality(String id) {
    _send({'command': 'quality', 'quality': id});
    value = value.copyWith(quality: () => id);
  }

  static Duration? _duration(Object? seconds) => seconds is num && seconds >= 0
      ? Duration(milliseconds: (seconds * 1000).round())
      : null;

  static List<double> _doubles(Object? list) => [
    if (list is List)
      for (final v in list)
        if (v is num) v.toDouble(),
  ];

  static List<CaptionTrack> _captions(Object? list) => [
    if (list is List)
      for (final t in list)
        if (t is Map && t['language'] != null)
          CaptionTrack(
            language: t['language'].toString(),
            label: (t['label'] ?? t['language']).toString(),
          ),
  ];

  static List<QualityOption> _qualities(Object? list) => [
    if (list is List)
      for (final q in list)
        if (q is Map && q['id'] != null)
          QualityOption(
            id: q['id'].toString(),
            label: (q['label'] ?? q['id']).toString(),
          ),
  ];
}

/// 40 A YouTube, Vimeo or Bunny Stream video with the app's controls: the
/// site's player plays the picture underneath, out of reach, and nothing on
/// screen says where the video is hosted (see [brandlessPlayerHtml]).
///
/// Fills its box. Full screen opens the same video in a new player at the
/// same second.
class BrandlessVideo extends ConsumerStatefulWidget {
  const BrandlessVideo({
    super.key,
    required this.video,
    this.posterUrl,
    this.startSeconds = 0,
    this.autoplay = false,
    this.tracker,
    this.onProgress,
    this.onEnded,
    this.watermark,
    this.captured,
    this.fullScreen = false,
    this.onPosition,
  });

  final HostedVideo video;
  final String? posterUrl;
  final int startSeconds;
  final bool autoplay;

  /// Shared with the full-screen player, so both count the same seconds.
  final WatchTracker? tracker;
  final void Function(int positionSeconds, double watchedPercent)? onProgress;
  final VoidCallback? onEnded;

  /// Shown in full screen (the inline player's owner draws its own).
  final String? watermark;

  /// True while the screen is recorded or mirrored: the video pauses and is
  /// covered.
  final ValueListenable<bool>? captured;
  final bool fullScreen;

  /// Full screen only: where the video is and whether it plays, for the
  /// inline player to carry on from when full screen closes.
  final void Function(Duration position, bool playing)? onPosition;

  @override
  ConsumerState<BrandlessVideo> createState() => _BrandlessVideoState();
}

class _BrandlessVideoState extends ConsumerState<BrandlessVideo> {
  static final _notCaptured = ValueNotifier(false);
  late final EmbedPlayerController _controller;
  late final String _site;
  late final String _html;
  Timer? _progressTimer;
  int _attempt = 0;
  bool _wasPlaying = false;
  bool _endedReported = false;
  bool _autoplayed = false;

  @override
  void initState() {
    super.initState();
    _site = ref.read(appEnvironmentProvider).siteUrl;
    _controller = EmbedPlayerController(
      tracker: widget.tracker,
      preferredSpeed: ref.read(localSettingsProvider).playbackSpeed,
    )..addListener(_onChange);
    _html = brandlessPlayerHtml(
      widget.video,
      origin: Uri.parse(_site).origin,
      startSeconds: widget.startSeconds,
    );
    widget.captured?.addListener(_onCaptured);
    _progressTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_controller.value.playing) _report();
    });
  }

  void _onCaptured() {
    if (widget.captured?.value ?? false) _controller.pause();
  }

  void _onChange() {
    final value = _controller.value;
    widget.onPosition?.call(value.position, value.playing);
    if (widget.autoplay &&
        !_autoplayed &&
        _controller.phase == EmbedPhase.ready) {
      _autoplayed = true;
      _controller.play();
    }
    if (_wasPlaying && !value.playing) _report();
    _wasPlaying = value.playing;
    if (value.ended && !_endedReported) {
      _endedReported = true;
      _report();
      widget.onEnded?.call();
    } else if (!value.ended) {
      _endedReported = false;
    }
  }

  void _report() => widget.onProgress?.call(
    _controller.value.position.inSeconds,
    _controller.tracker.percent,
  );

  @override
  void dispose() {
    _progressTimer?.cancel();
    widget.captured?.removeListener(_onCaptured);
    if (_controller.value.started) _report();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _openFullScreen() async {
    if (widget.fullScreen) {
      await Navigator.of(context).maybePop();
      return;
    }
    final value = _controller.value;
    _controller.pause();
    Duration? position;
    var playing = value.playing;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => FullscreenPlayerFrame(
          captured: widget.captured ?? _notCaptured,
          portrait: widget.video.vertical,
          watermark: widget.watermark == null
              ? null
              : MovingWatermark(text: widget.watermark!),
          child: BrandlessVideo(
            video: widget.video,
            posterUrl: widget.posterUrl,
            startSeconds: value.position.inSeconds,
            autoplay: value.playing,
            tracker: _controller.tracker,
            onProgress: widget.onProgress,
            onEnded: widget.onEnded,
            captured: widget.captured,
            fullScreen: true,
            onPosition: (at, wasPlaying) {
              position = at;
              playing = wasPlaying;
            },
          ),
        ),
      ),
    );
    if (!mounted) return;
    final at = position;
    if (at != null && at > Duration.zero) _controller.seek(at);
    if (playing) _controller.play();
  }

  void _retry() {
    _controller.detach();
    setState(() => _attempt++);
  }

  String? get _poster {
    final poster = widget.posterUrl;
    if (poster != null && poster.isNotEmpty) return poster;
    if (widget.video.host == VideoHost.youtube) {
      return 'https://i.ytimg.com/vi/${widget.video.id}/hqdefault.jpg';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final page = Uri.parse('$_site/');
    final web = KeyedSubtree(
      key: ValueKey('brandless-$_attempt'),
      child: ref.watch(webViewBuilderProvider)(
        WebViewRequest(
          html: _html,
          baseUrl: '$_site/',
          interactive: false,
          channels: {playerChannel: _controller.handleMessage},
          onCreated: _controller.attach,
          allowNavigation: (uri, mainFrame) =>
              videoNavigationAllowed(uri, mainFrame, page: page),
          browserFrame: true,
          debugLabel: 'video-player',
        ),
      ),
    );
    final poster = _poster;
    return ColoredBox(
      color: Colors.black,
      child: ValueListenableBuilder<PlayerSnapshot>(
        valueListenable: _controller,
        child: web,
        builder: (context, state, web) {
          if (_controller.phase == EmbedPhase.error) {
            return Stack(
              fit: StackFit.expand,
              children: [
                Offstage(child: web),
                VideoMessage(
                  icon: AppIcons.error,
                  message: context.l10n.videoFailed,
                  actionLabel: context.l10n.tryAgain,
                  onAction: _retry,
                ),
              ],
            );
          }
          // Before it starts and after it ends, the site's player shows its
          // title, suggestions and end screen: the poster covers it.
          final covered = !state.started || state.ended;
          final video = Stack(
            fit: StackFit.expand,
            children: [
              web!,
              if (covered)
                ColoredBox(
                  key: const ValueKey('player-cover'),
                  color: Colors.black,
                  child: poster == null
                      ? null
                      : Opacity(
                          opacity: state.ended ? 0.45 : 0.85,
                          child: AppNetworkImage(url: poster),
                        ),
                ),
              if (!_controller.ready || state.buffering)
                Center(
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    semanticsLabel: context.l10n.loadingVideo,
                  ),
                ),
            ],
          );
          final captured = widget.captured;
          return Stack(
            fit: StackFit.expand,
            children: [
              PlayerSurface(
                playing: state.playing,
                video: video,
                controls: _controller.ready
                    ? PlayerControls(
                        state: state,
                        fullScreen: widget.fullScreen,
                        onPlayPause: _controller.togglePlay,
                        onSeek: _controller.seek,
                        onSpeed: () => _controller.setSpeed(state.nextSpeed()),
                        onCaptions: () => _controller.toggleCaptions(
                          preferred: Localizations.localeOf(context)
                              .languageCode,
                        ),
                        onQuality: () =>
                            pickQuality(context, state, _controller.setQuality),
                        onFullScreen: _openFullScreen,
                      )
                    : const SizedBox.shrink(),
              ),
              if (captured != null)
                ValueListenableBuilder<bool>(
                  valueListenable: captured,
                  builder: (context, on, _) =>
                      on ? const CapturedNotice() : const SizedBox.shrink(),
                ),
            ],
          );
        },
      ),
    );
  }
}
