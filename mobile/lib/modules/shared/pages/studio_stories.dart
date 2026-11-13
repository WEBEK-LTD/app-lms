import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import 'page_actions.dart';
import 'studio_page.dart';

/// 129.2 A row of stories on a Studio page (`stories`; Studio's canvas:
/// components/studio/premium-motion.tsx): round photos in a ring, the
/// app's second colour into its main one until the person has seen the
/// story on this phone, their titles under them. A tap opens them full
/// screen ([StudioStoryViewer]).
class StudioStoriesRow extends ConsumerStatefulWidget {
  const StudioStoriesRow({super.key, required this.node, required this.scope});

  final StudioNode node;
  final StudioScope scope;

  @override
  ConsumerState<StudioStoriesRow> createState() => _StudioStoriesRowState();
}

/// The stories this phone has shown, kept between visits.
const _seenKey = 'studio.stories_seen';

/// A story's mark among the seen ones: its element and its photo or title.
String studioStoryMark(StudioNode node, StudioStoryEntry story) =>
    '${node.id}|${story.imageUrl ?? story.heading ?? ''}';

class _StudioStoriesRowState extends ConsumerState<StudioStoriesRow> {
  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final p = context.palette;
    final l10n = context.l10n;
    final seen = {
      ...?ref.watch(sharedPreferencesProvider).getStringList(_seenKey),
    };
    final size = node.storySize;
    final stories = node.slides;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, story) in stories.indexed) ...[
            if (i > 0) const SizedBox(width: 14),
            Semantics(
              button: true,
              label: [
                l10n.studioStoryOf(i + 1, stories.length),
                story.heading ?? '',
              ].where((t) => t.isNotEmpty).join(', '),
              child: GestureDetector(
                key: ValueKey('studio-story-${node.id}-$i'),
                behavior: HitTestBehavior.opaque,
                onTap: () async {
                  // 129.2 A tile without a photo (all of them) opens its link.
                  final link = story.action;
                  if (story.imageUrl == null && link != null) {
                    if (canOpenAction(ref, link)) {
                      runPageAction(context, ref, link);
                    }
                    return;
                  }
                  final action = await StudioStoryViewer.open(
                    context,
                    node,
                    studioViewableStories(node).indexOf(story),
                  );
                  if (!context.mounted) return;
                  setState(() {});
                  // A story's link opens once the stories have closed.
                  if (action != null) runPageAction(context, ref, action);
                },
                child: SizedBox(
                  width: size + 8,
                  child: Column(
                    children: [
                      _Ring(
                        key: ValueKey('studio-story-ring-${node.id}-$i'),
                        size: size,
                        ring: story.ring,
                        seen: seen.contains(studioStoryMark(node, story)),
                        colors: [p.accent, p.primary],
                        lit: parseHexColor(story.ringColor),
                        muted: p.border,
                        gap: widget.scope.dark
                            ? const Color(0xFF14121F)
                            : p.background,
                        child: _Face(
                          story: story,
                          size: size,
                          seed: node.id.hashCode + i,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ExcludeSemantics(
                        child: Text(
                          story.heading ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The stories a row opens full screen: those with a photo, and those
/// without a link.
List<StudioStoryEntry> studioViewableStories(StudioNode node) => [
  for (final s in node.slides)
    if (s.imageUrl != null || s.action == null) s,
];

/// What a story's circle shows: its photo, else its colour with its
/// initials or its icon.
class _Face extends StatelessWidget {
  const _Face({required this.story, required this.size, required this.seed});

  final StudioStoryEntry story;
  final double size;
  final int seed;

  @override
  Widget build(BuildContext context) {
    if (story.imageUrl != null || (story.label == null && story.icon == null)) {
      return AppNetworkImage(url: story.imageUrl, seed: seed);
    }
    final fill = parseHexColor(story.color);
    final ink = fill == null ? context.palette.text : Colors.white;
    return ColoredBox(
      color: fill ?? Colors.transparent,
      child: Center(
        child: story.label != null
            ? Text(
                story.label!,
                style: TextStyle(
                  color: ink,
                  fontSize: size * 0.32,
                  fontWeight: FontWeight.w800,
                ),
              )
            : AppIcon(symbolByName(story.icon), size: size * 0.42, color: ink),
      ),
    );
  }
}

/// A round photo in its ring: lit (the second colour into the main one,
/// or the story's own colour) while unseen or always, a thin quiet line
/// once seen or when quiet, or dashed.
class _Ring extends StatelessWidget {
  const _Ring({
    super.key,
    required this.size,
    required this.ring,
    required this.seen,
    required this.colors,
    required this.lit,
    required this.muted,
    required this.gap,
    required this.child,
  });

  final double size;
  final StudioStoryRing ring;
  final bool seen;
  final List<Color> colors;
  final Color? lit;
  final Color muted;
  final Color gap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final inner = Container(
      padding: EdgeInsets.all(ring == StudioStoryRing.dashed ? 1 : 2.5),
      decoration: BoxDecoration(shape: BoxShape.circle, color: gap),
      child: ClipOval(child: child),
    );
    if (ring == StudioStoryRing.dashed) {
      return CustomPaint(
        painter: _DashedRing(color: muted),
        child: Container(
          width: size + 8,
          height: size + 8,
          padding: const EdgeInsets.all(2.5),
          child: inner,
        ),
      );
    }
    final quiet =
        ring == StudioStoryRing.plain || (ring == StudioStoryRing.auto && seen);
    final solid = ring == StudioStoryRing.highlight
        ? (lit ?? colors.first)
        : lit;
    return Container(
      width: size + 8,
      height: size + 8,
      padding: EdgeInsets.all(quiet ? 2.5 : 3),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: quiet ? muted : solid,
        gradient: quiet || solid != null
            ? null
            : LinearGradient(
                begin: AlignmentDirectional.bottomStart,
                end: AlignmentDirectional.topEnd,
                colors: colors,
              ),
      ),
      child: inner,
    );
  }
}

/// A dashed ring around a tile for all of them.
class _DashedRing extends CustomPainter {
  const _DashedRing({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final rect = (Offset.zero & size).deflate(1);
    const dashes = 28;
    for (var i = 0; i < dashes; i++) {
      final start = i * 2 * math.pi / dashes;
      canvas.drawArc(rect, start, math.pi / dashes, false, paint);
    }
  }

  @override
  bool shouldRepaint(_DashedRing old) => old.color != color;
}

/// 129.2 The stories full screen, one after another: a line per story over
/// the top filling while it shows, a tap on the end side moves on and on
/// the start side goes back, holding pauses, swiping down closes. On a
/// phone that reduces motion nothing moves on by itself.
class StudioStoryViewer extends ConsumerStatefulWidget {
  const StudioStoryViewer({super.key, required this.node, this.initial = 0});

  final StudioNode node;
  final int initial;

  /// Opens the stories at [i]; the link of the story whose button was
  /// tapped, to open once they have closed.
  static Future<PageAction?> open(
    BuildContext context,
    StudioNode node,
    int i,
  ) {
    final still = MediaQuery.disableAnimationsOf(context);
    return Navigator.of(context, rootNavigator: true).push<PageAction?>(
      PageRouteBuilder<PageAction?>(
        opaque: true,
        transitionDuration: still
            ? Duration.zero
            : const Duration(milliseconds: 220),
        reverseTransitionDuration: still
            ? Duration.zero
            : const Duration(milliseconds: 180),
        pageBuilder: (_, _, _) => StudioStoryViewer(node: node, initial: i),
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  ConsumerState<StudioStoryViewer> createState() => _StudioStoryViewerState();
}

class _StudioStoryViewerState extends ConsumerState<StudioStoryViewer>
    with SingleTickerProviderStateMixin {
  late int _index = widget.initial;
  late final AnimationController _time = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: widget.node.intervalMs),
  )..addStatusListener(_onTime);
  double _drag = 0;
  bool _started = false;

  /// The stories that open here: a story without a photo that has a link
  /// opens the link instead.
  List<StudioStoryEntry> get _stories => studioViewableStories(widget.node);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _show(_index);
  }

  void _onTime(AnimationStatus status) {
    if (status == AnimationStatus.completed) _next();
  }

  void _show(int i) {
    setState(() => _index = i);
    _markSeen(_stories[i]);
    _time.value = 0;
    if (!MediaQuery.disableAnimationsOf(context)) _time.forward();
  }

  void _markSeen(StudioStoryEntry story) {
    final prefs = ref.read(sharedPreferencesProvider);
    final seen = [...?prefs.getStringList(_seenKey)];
    final mark = studioStoryMark(widget.node, story);
    if (seen.contains(mark)) return;
    seen.add(mark);
    prefs.setStringList(
      _seenKey,
      seen.length > 300 ? seen.sublist(seen.length - 300) : seen,
    );
  }

  void _next() {
    if (_index < _stories.length - 1) {
      _show(_index + 1);
    } else {
      _close();
    }
  }

  void _previous() => _show(_index > 0 ? _index - 1 : 0);

  void _close() {
    _time.stop();
    Navigator.of(context).maybePop();
  }

  @override
  void dispose() {
    _time.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final story = _stories[_index];
    final padding = MediaQuery.paddingOf(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final action = story.action;
    return Scaffold(
      key: ValueKey('studio-story-viewer-${widget.node.id}'),
      backgroundColor: Colors.black,
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapUp: (d) {
          final width = MediaQuery.sizeOf(context).width;
          final onStart = rtl
              ? d.localPosition.dx > width / 2
              : d.localPosition.dx < width / 2;
          onStart ? _previous() : _next();
        },
        onLongPressStart: (_) => _time.stop(),
        onLongPressEnd: (_) {
          if (!MediaQuery.disableAnimationsOf(context)) _time.forward();
        },
        onVerticalDragUpdate: (d) =>
            setState(() => _drag = (_drag + d.delta.dy).clamp(0, 400)),
        onVerticalDragEnd: (d) {
          if (_drag > 120 || (d.primaryVelocity ?? 0) > 700) {
            _close();
          } else {
            setState(() => _drag = 0);
          }
        },
        child: Transform.translate(
          offset: Offset(0, _drag),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Semantics(
                label: [
                  l10n.studioStoryOf(_index + 1, _stories.length),
                  story.heading ?? '',
                ].where((t) => t.isNotEmpty).join(', '),
                child: AppNetworkImage(
                  key: ValueKey('studio-story-photo-$_index'),
                  url: story.imageUrl,
                  seed: widget.node.id.hashCode + _index,
                ),
              ),
              const IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x8C000000),
                        Color(0x00000000),
                        Color(0x00000000),
                        Color(0xB3000000),
                      ],
                      stops: [0, 0.22, 0.55, 1],
                    ),
                  ),
                ),
              ),
              PositionedDirectional(
                top: padding.top + 10,
                start: 12,
                end: 12,
                child: ExcludeSemantics(
                  child: Row(
                    children: [
                      for (var i = 0; i < _stories.length; i++) ...[
                        if (i > 0) const SizedBox(width: 4),
                        Expanded(
                          child: AnimatedBuilder(
                            animation: _time,
                            builder: (context, _) => _Bar(
                              key: ValueKey('studio-story-bar-$i'),
                              filled: i < _index
                                  ? 1
                                  : i > _index
                                  ? 0
                                  : MediaQuery.disableAnimationsOf(context)
                                  ? 1
                                  : _time.value,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              PositionedDirectional(
                top: padding.top + 20,
                end: 6,
                child: IconButton(
                  key: const ValueKey('studio-story-close'),
                  tooltip: l10n.close,
                  onPressed: _close,
                  icon: const AppIcon(AppIcons.close, color: Colors.white),
                ),
              ),
              PositionedDirectional(
                start: 20,
                end: 20,
                bottom: padding.bottom + 28,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if ((story.heading ?? '').isNotEmpty)
                      Text(
                        story.heading!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          height: 1.15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    if ((story.subheading ?? '').isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        story.subheading!,
                        style: const TextStyle(
                          color: Color(0xE6FFFFFF),
                          fontSize: 15,
                          height: 1.35,
                        ),
                      ),
                    ],
                    if (action != null && canOpenAction(ref, action)) ...[
                      const SizedBox(height: 16),
                      FilledButton(
                        key: const ValueKey('studio-story-open'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF0E0D24),
                          minimumSize: const Size(0, 46),
                          shape: const StadiumBorder(),
                          // The app's font (Arabic's too), bolder.
                          textStyle: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        onPressed: () {
                          _time.stop();
                          Navigator.of(context).pop(action);
                        },
                        child: Text(l10n.studioStoryOpen),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One story's line over the top: white as far as it has shown.
class _Bar extends StatelessWidget {
  const _Bar({super.key, required this.filled});

  final double filled;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(2),
    child: SizedBox(
      height: 3,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const ColoredBox(color: Color(0x59FFFFFF)),
          FractionallySizedBox(
            alignment: AlignmentDirectional.centerStart,
            widthFactor: filled.clamp(0, 1),
            child: const ColoredBox(color: Colors.white),
          ),
        ],
      ),
    ),
  );
}
