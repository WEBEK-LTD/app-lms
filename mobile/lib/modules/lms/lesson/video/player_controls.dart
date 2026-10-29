import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/storage/local_settings.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/common.dart';

/// 40 A caption track a player offers.
@immutable
class CaptionTrack {
  const CaptionTrack({required this.language, required this.label});

  final String language;
  final String label;

  @override
  bool operator ==(Object other) =>
      other is CaptionTrack &&
      other.language == language &&
      other.label == label;

  @override
  int get hashCode => Object.hash(language, label);
}

/// 40 A picture quality a player offers.
@immutable
class QualityOption {
  const QualityOption({required this.id, required this.label});

  final String id;
  final String label;

  @override
  bool operator ==(Object other) =>
      other is QualityOption && other.id == id && other.label == label;

  @override
  int get hashCode => Object.hash(id, label);
}

/// 40 What the controls show, the same for files played by the app and for
/// videos played by a video site's player behind the app's controls.
@immutable
class PlayerSnapshot {
  const PlayerSnapshot({
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.buffered = 0,
    this.playing = false,
    this.buffering = false,
    this.started = false,
    this.ended = false,
    this.speed = 1,
    this.speeds = playbackSpeeds,
    this.captions = const [],
    this.captionLanguage,
    this.qualities = const [],
    this.quality,
  });

  final Duration position;
  final Duration duration;

  /// How much is loaded, 0 to 1.
  final double buffered;
  final bool playing;
  final bool buffering;

  /// Played at least once (until then the poster shows).
  final bool started;
  final bool ended;
  final double speed;

  /// The speeds the player can play at; empty when it can't change speed.
  final List<double> speeds;
  final List<CaptionTrack> captions;

  /// The caption track on, or null when captions are off.
  final String? captionLanguage;
  final List<QualityOption> qualities;
  final String? quality;

  PlayerSnapshot copyWith({
    Duration? position,
    Duration? duration,
    double? buffered,
    bool? playing,
    bool? buffering,
    bool? started,
    bool? ended,
    double? speed,
    List<double>? speeds,
    List<CaptionTrack>? captions,
    String? Function()? captionLanguage,
    List<QualityOption>? qualities,
    String? Function()? quality,
  }) => PlayerSnapshot(
    position: position ?? this.position,
    duration: duration ?? this.duration,
    buffered: buffered ?? this.buffered,
    playing: playing ?? this.playing,
    buffering: buffering ?? this.buffering,
    started: started ?? this.started,
    ended: ended ?? this.ended,
    speed: speed ?? this.speed,
    speeds: speeds ?? this.speeds,
    captions: captions ?? this.captions,
    captionLanguage: captionLanguage != null
        ? captionLanguage()
        : this.captionLanguage,
    qualities: qualities ?? this.qualities,
    quality: quality != null ? quality() : this.quality,
  );

  /// The next speed after the current one, round the list.
  double nextSpeed() {
    if (speeds.isEmpty) return speed;
    final index = speeds.indexWhere((s) => s == speed);
    return speeds[(index + 1) % speeds.length];
  }
}

/// 40 Shows the controls over a video: a tap shows or hides them, and they
/// hide on their own after three seconds of playing. Touches never reach
/// what's underneath (a video site's player stays out of reach).
class PlayerSurface extends StatefulWidget {
  const PlayerSurface({
    super.key,
    required this.playing,
    required this.video,
    required this.controls,
  });

  final bool playing;
  final Widget video;
  final Widget controls;

  @override
  State<PlayerSurface> createState() => _PlayerSurfaceState();
}

class _PlayerSurfaceState extends State<PlayerSurface> {
  bool _visible = true;
  Timer? _hide;

  @override
  void didUpdateWidget(PlayerSurface old) {
    super.didUpdateWidget(old);
    if (widget.playing && !old.playing) _scheduleHide();
    if (!widget.playing && old.playing) {
      _hide?.cancel();
      _visible = true;
    }
  }

  void _scheduleHide() {
    _hide?.cancel();
    _hide = Timer(const Duration(seconds: 3), () {
      if (mounted && widget.playing) setState(() => _visible = false);
    });
  }

  void _toggle() {
    setState(() => _visible = !_visible);
    if (_visible) _scheduleHide();
  }

  @override
  void dispose() {
    _hide?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTap: _toggle,
    child: Stack(
      fit: StackFit.expand,
      children: [
        widget.video,
        AnimatedOpacity(
          opacity: _visible ? 1 : 0,
          duration: const Duration(milliseconds: 200),
          child: IgnorePointer(ignoring: !_visible, child: widget.controls),
        ),
      ],
    ),
  );
}

/// The player's controls (design: Lesson): play or pause in the middle with
/// 10 seconds back and forward, the seek bar (played and loaded), the time,
/// and speed, captions, quality and full screen chips.
class PlayerControls extends StatelessWidget {
  const PlayerControls({
    super.key,
    required this.state,
    required this.fullScreen,
    required this.onPlayPause,
    required this.onSeek,
    required this.onFullScreen,
    this.onSpeed,
    this.onCaptions,
    this.onQuality,
  });

  final PlayerSnapshot state;
  final bool fullScreen;
  final VoidCallback onPlayPause;
  final ValueChanged<Duration> onSeek;
  final VoidCallback onFullScreen;
  final VoidCallback? onSpeed;
  final VoidCallback? onCaptions;
  final VoidCallback? onQuality;

  void _skip(int seconds) {
    var to = state.position + Duration(seconds: seconds);
    if (to < Duration.zero) to = Duration.zero;
    if (state.duration > Duration.zero && to > state.duration) {
      to = state.duration;
    }
    onSeek(to);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final duration = state.duration;
    final position = state.position > duration && duration > Duration.zero
        ? duration
        : state.position;
    const muted = Color(0xFFC9C6DC);
    const chip = Color(0xFF24223F);
    final canSeek = duration > Duration.zero;
    final fraction = canSeek
        ? (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0)
        : 0.0;
    return Stack(
      children: [
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (canSeek && state.started && !state.ended)
                _RoundButton(
                  icon: AppIcons.back10,
                  label: l10n.back10Seconds,
                  onTap: () => _skip(-10),
                ),
              const SizedBox(width: 20),
              Semantics(
                button: true,
                label: state.playing
                    ? l10n.pause
                    : (state.ended ? l10n.playAgain : l10n.play),
                excludeSemantics: true,
                child: Material(
                  color: Colors.white,
                  shape: const CircleBorder(),
                  child: InkWell(
                    key: const ValueKey('player-play'),
                    customBorder: const CircleBorder(),
                    onTap: onPlayPause,
                    child: SizedBox(
                      width: 64,
                      height: 64,
                      child: AppIcon(
                        state.playing
                            ? AppIcons.pause
                            : (state.ended ? AppIcons.replay : AppIcons.play),
                        size: 28,
                        color: BrandColors.midnight,
                        filled: true,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              if (canSeek && state.started && !state.ended)
                _RoundButton(
                  icon: AppIcons.forward10,
                  label: l10n.forward10Seconds,
                  onTap: () => _skip(10),
                ),
            ],
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
                  secondaryActiveTrackColor: const Color(0xFF6E6A8E),
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
                    value: fraction,
                    secondaryTrackValue: state.buffered.clamp(0.0, 1.0),
                    semanticFormatterCallback: (_) => l10n.positionOf(
                      formatClock(position),
                      formatClock(duration),
                    ),
                    onChanged: canSeek ? (v) => onSeek(duration * v) : null,
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
                        // 110 Played, then the length, in every language.
                        textDirection: TextDirection.ltr,
                        textAlign:
                            Directionality.of(context) == TextDirection.rtl
                            ? TextAlign.right
                            : TextAlign.left,
                        maxLines: 1,
                        overflow: TextOverflow.fade,
                        softWrap: false,
                        style: const TextStyle(fontSize: 12, color: muted),
                      ),
                    ),
                    if (onSpeed != null && state.speeds.isNotEmpty) ...[
                      PlayerChip(
                        label: speedLabel(state.speed),
                        semantics: l10n.playbackSpeedIs(
                          speedLabel(state.speed),
                        ),
                        color: chip,
                        onTap: onSpeed!,
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (onCaptions != null && state.captions.isNotEmpty) ...[
                      PlayerChip(
                        icon: state.captionLanguage != null
                            ? AppIcons.captions
                            : AppIcons.captionsOff,
                        semantics: state.captionLanguage != null
                            ? l10n.captionsTurnOff
                            : l10n.captionsTurnOn,
                        color: chip,
                        onTap: onCaptions!,
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (onQuality != null && state.qualities.length > 1) ...[
                      PlayerChip(
                        icon: AppIcons.quality,
                        semantics: l10n.videoQuality,
                        color: chip,
                        onTap: onQuality!,
                      ),
                      const SizedBox(width: 8),
                    ],
                    PlayerChip(
                      icon: fullScreen
                          ? AppIcons.fullscreenExit
                          : AppIcons.fullscreen,
                      semantics: fullScreen
                          ? l10n.exitFullScreen
                          : l10n.fullScreen,
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

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: Material(
      color: const Color(0x99000000),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 44,
          height: 44,
          child: AppIcon(icon, size: 24, color: Colors.white),
        ),
      ),
    ),
  );
}

/// A small dark button in the player's bottom row.
class PlayerChip extends StatelessWidget {
  const PlayerChip({
    super.key,
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

/// 40 Lets the student pick a picture quality.
Future<void> pickQuality(
  BuildContext context,
  PlayerSnapshot state,
  ValueChanged<String> onPicked,
) => showModalBottomSheet<void>(
  context: context,
  showDragHandle: true,
  builder: (sheet) => SafeArea(
    child: ListView(
      shrinkWrap: true,
      children: [
        for (final q in state.qualities)
          ListTile(
            title: Text(q.id == 'auto' ? sheet.l10n.videoQualityAuto : q.label),
            trailing: q.id == state.quality
                ? const AppIcon(AppIcons.check, size: 20)
                : null,
            onTap: () {
              Navigator.of(sheet).pop();
              onPicked(q.id);
            },
          ),
      ],
    ),
  ),
);

/// Shown instead of the video while the screen is recorded or mirrored.
class CapturedNotice extends StatelessWidget {
  const CapturedNotice({super.key});

  @override
  Widget build(BuildContext context) => VideoMessage(
    icon: AppIcons.visibilityOff,
    message: context.l10n.screenRecording,
  );
}

/// A message on black in the video's place, with an optional action.
class VideoMessage extends StatelessWidget {
  const VideoMessage({
    super.key,
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
        // Scales down rather than overflowing the 16:9 frame (large text).
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(icon, size: 28, color: BrandColors.ivory),
                const SizedBox(height: 10),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: BrandColors.ivory,
                    fontSize: 14,
                  ),
                ),
                if (actionLabel != null) ...[
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: onAction,
                    style: TextButton.styleFrom(
                      foregroundColor: BrandColors.ivory,
                    ),
                    child: Text(actionLabel!),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

/// 40 The player filling the screen, turned to landscape (portrait videos
/// stay upright), with the watermark and the screen-capture notice on top.
class FullscreenPlayerFrame extends StatefulWidget {
  const FullscreenPlayerFrame({
    super.key,
    required this.child,
    required this.captured,
    this.watermark,
    this.portrait = false,
  });

  final Widget child;
  final ValueListenable<bool> captured;
  final Widget? watermark;
  final bool portrait;

  @override
  State<FullscreenPlayerFrame> createState() => _FullscreenPlayerFrameState();
}

class _FullscreenPlayerFrameState extends State<FullscreenPlayerFrame> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(
      widget.portrait
          ? [DeviceOrientation.portraitUp]
          : [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight],
    );
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
        widget.child,
        ?widget.watermark,
        ValueListenableBuilder<bool>(
          valueListenable: widget.captured,
          builder: (context, captured, _) =>
              captured ? const CapturedNotice() : const SizedBox.shrink(),
        ),
      ],
    ),
  );
}
