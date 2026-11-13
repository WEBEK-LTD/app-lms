import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/data_saver.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import 'studio_motion.dart';
import 'studio_page.dart';
import 'studio_scrim.dart';

/// 129.4 and 129.7 The premium banners of a Studio page (Studio's canvas:
/// components/studio/premium-motion.tsx): a muted looping video under its
/// shade (`video_hero`, its poster first) or a photo that moves slower than
/// the page (`parallax_banner`), what they hold laid out over it in a
/// column, in a frosted panel when `glass` is set.
class StudioMediaCover extends ConsumerWidget {
  const StudioMediaCover({super.key, required this.node, required this.scope});

  final StudioNode node;
  final StudioScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kids = [
      for (final child in node.children)
        if (StudioNodeView.shows(child, ref)) child,
    ];
    final video = node.type == StudioNodeType.videoHero;
    final height = node.height?.fixed ?? (video ? 420.0 : 300.0);
    final pad = node.padding ?? const StudioSides();
    final background = parseHexColor(
      scope.dark ? (node.darkBackground ?? node.background) : node.background,
    );
    Widget front = StudioNodeView(
      node: StudioNode(
        id: '${node.id}-over',
        type: StudioNodeType.column,
        children: kids,
        gap: node.gap,
        align: node.align,
        cross: node.cross,
        height: node.glass
            ? null
            : StudioSize.fixed(math.max(0, height - pad.top - pad.bottom)),
      ),
      scope: scope,
      parent: node,
    );
    if (node.glass) front = _Glass(child: front);
    final photo = AppNetworkImage(url: node.imageUrl, seed: node.id.hashCode);
    // 129.1 The poster growing slowly with `ken_burns`.
    final poster = StudioKenBurns.wrap(context, photo);
    Widget layers(Widget? media, Widget? control) => Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: background ?? const Color(0xFF1F2A37)),
        ?media,
        if (node.scrim case final scrim?)
          IgnorePointer(
            child: DecoratedBox(
              key: ValueKey('studio-scrim-${node.id}'),
              decoration: BoxDecoration(gradient: studioScrimGradient(scrim)),
            ),
          ),
        if (kids.isNotEmpty)
          Padding(
            padding: EdgeInsetsDirectional.only(
              top: pad.top,
              end: pad.end,
              bottom: pad.bottom,
              start: pad.start,
            ),
            child: node.glass
                ? Align(
                    alignment: switch (node.align) {
                      StudioAlign.start => AlignmentDirectional.topCenter,
                      StudioAlign.center => AlignmentDirectional.center,
                      _ => AlignmentDirectional.bottomCenter,
                    },
                    child: front,
                  )
                : front,
          ),
        ?control,
      ],
    );
    final cover = video
        ? _VideoCover(node: node, poster: poster, layers: layers)
        : layers(
            node.imageUrl == null
                ? null
                : _ParallaxPhoto(
                    speed: node.parallaxSpeed,
                    child: StudioKenBurns.wrap(context, photo),
                  ),
            null,
          );
    return SizedBox(
      key: ValueKey('studio-media-cover-${node.id}'),
      height: height,
      child: ClipRRect(borderRadius: _radius(node), child: cover),
    );
  }

  static BorderRadiusGeometry _radius(StudioNode node) {
    final c = node.corners;
    if (c == null) return BorderRadius.circular(node.radius);
    return BorderRadiusDirectional.only(
      topStart: Radius.circular(c.topStart),
      topEnd: Radius.circular(c.topEnd),
      bottomEnd: Radius.circular(c.bottomEnd),
      bottomStart: Radius.circular(c.bottomStart),
    );
  }
}

/// 129.7 A frosted panel behind the words over a banner.
class _Glass extends StatelessWidget {
  const _Glass({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(22),
    child: BackdropFilter(
      key: const ValueKey('studio-glass'),
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0x2EFFFFFF),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0x4DFFFFFF)),
        ),
        child: Padding(padding: const EdgeInsets.all(18), child: child),
      ),
    ),
  );
}

/// 129.7 The photo, a little taller than the banner, moved by less than the
/// page as it scrolls by; still on a phone that reduces motion.
class _ParallaxPhoto extends StatefulWidget {
  const _ParallaxPhoto({required this.speed, required this.child});

  /// How much slower than the page: 0.1 to 0.9.
  final double speed;
  final Widget child;

  @override
  State<_ParallaxPhoto> createState() => _ParallaxPhotoState();
}

class _ParallaxPhotoState extends State<_ParallaxPhoto> {
  ScrollPosition? _position;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _position?.removeListener(_moved);
    _position = Scrollable.maybeOf(context, axis: Axis.vertical)?.position
      ?..addListener(_moved);
  }

  void _moved() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _position?.removeListener(_moved);
    super.dispose();
  }

  /// How far through the screen the banner is: 0 coming in at the foot, 1
  /// leaving at the top.
  double _through(double height) {
    final box = context.findRenderObject();
    final view = Scrollable.maybeOf(
      context,
      axis: Axis.vertical,
    )?.context.findRenderObject();
    if (box is! RenderBox || !box.hasSize || view is! RenderBox) return 0.5;
    final top =
        box.localToGlobal(Offset.zero).dy - view.localToGlobal(Offset.zero).dy;
    final span = view.size.height + height;
    return (1 - (top + height) / span).clamp(0, 1).toDouble();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final height = constraints.maxHeight;
      // `_moved` rebuilds as the page scrolls.
      final extra = height * widget.speed;
      final still = MediaQuery.disableAnimationsOf(context);
      final at = still ? 0.5 : _through(height);
      return ClipRect(
        child: OverflowBox(
          alignment: Alignment.topCenter,
          minHeight: height + extra,
          maxHeight: height + extra,
          child: Transform.translate(
            key: const ValueKey('studio-parallax-photo'),
            offset: Offset(0, -extra * (1 - at)),
            child: widget.child,
          ),
        ),
      );
    },
  );
}

/// 129.4 The video banner: the video muted and looping over its poster
/// (the poster until it plays), and a round frosted play or pause button in
/// its corner. It plays by itself (`autoplay`) only while it is on the
/// screen, and not on a phone that reduces motion or saves data; once the
/// person taps the button, their choice holds.
class _VideoCover extends ConsumerStatefulWidget {
  const _VideoCover({
    required this.node,
    required this.poster,
    required this.layers,
  });

  final StudioNode node;
  final Widget poster;

  /// The banner with the video and the button in their places.
  final Widget Function(Widget media, Widget? control) layers;

  @override
  ConsumerState<_VideoCover> createState() => _VideoCoverState();
}

class _VideoCoverState extends ConsumerState<_VideoCover> {
  VideoPlayerController? _controller;
  bool _ready = false;
  bool _playing = false;
  bool _on = false;

  /// What the person chose with the button; null, as it may by itself.
  bool? _chosen;
  bool? _saver;

  @override
  void initState() {
    super.initState();
    final url = widget.node.videoUrl;
    if (url == null) return;
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    _controller = controller;
    controller
        .initialize()
        .then((_) async {
          await controller.setLooping(true);
          await controller.setVolume(0);
          if (!mounted) return;
          setState(() => _ready = true);
          _decide();
        })
        .catchError((Object _) {});
  }

  /// Plays or pauses as the person chose, else as it may by itself.
  void _decide() {
    final controller = _controller;
    if (controller == null || !_ready || !mounted) return;
    final saver = ref.read(dataSaverProvider).value ?? true;
    final byItself =
        widget.node.autoplay &&
        !MediaQuery.disableAnimationsOf(context) &&
        !saver;
    final play = _on && (_chosen ?? byItself);
    if (play == _playing) return;
    play ? controller.play() : controller.pause();
    setState(() => _playing = play);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Decided again once the phone says whether it saves data.
    final saver = ref.watch(dataSaverProvider).value;
    if (saver != _saver) {
      _saver = saver;
      WidgetsBinding.instance.addPostFrameCallback((_) => _decide());
    }
    final controller = _controller;
    final l10n = context.l10n;
    final media = Stack(
      fit: StackFit.expand,
      children: [
        widget.poster,
        if (controller != null && _ready && _playing)
          FittedBox(
            key: ValueKey('studio-video-${widget.node.id}'),
            fit: BoxFit.cover,
            clipBehavior: Clip.hardEdge,
            child: SizedBox(
              width: controller.value.size.width,
              height: controller.value.size.height,
              child: VideoPlayer(controller),
            ),
          ),
      ],
    );
    final control = controller == null
        ? null
        : PositionedDirectional(
            top: 12,
            end: 12,
            child: ClipOval(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Material(
                  color: const Color(0x3D000000),
                  shape: const CircleBorder(
                    side: BorderSide(color: Color(0x4DFFFFFF)),
                  ),
                  child: IconButton(
                    key: ValueKey('studio-video-button-${widget.node.id}'),
                    tooltip: _playing
                        ? l10n.studioVideoPause
                        : l10n.studioVideoPlay,
                    onPressed: () {
                      _chosen = !_playing;
                      // A tap plays it wherever it is.
                      _on = true;
                      _decide();
                    },
                    icon: AppIcon(
                      _playing
                          ? Symbols.pause_rounded
                          : Symbols.play_arrow_rounded,
                      color: Colors.white,
                      size: 22,
                      filled: true,
                    ),
                  ),
                ),
              ),
            ),
          );
    return StudioOnScreen(
      onChange: (on) {
        _on = on;
        _decide();
      },
      child: widget.layers(media, control),
    );
  }
}
