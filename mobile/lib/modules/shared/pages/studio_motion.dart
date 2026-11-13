import 'dart:ui' show ImageFilter;

import 'package:flutter/widgets.dart';

/// 129 What the premium elements of a Studio page share about motion:
/// whether an element is on the screen now (a slider, a ticker and a video
/// stand still off it; an entrance plays when it first shows), and the slow
/// zoom over the photo of a slider's open slide (Ken Burns).

/// Whether any of [context]'s widget is on the screen and inside each
/// scrolling view that holds it.
bool studioOnScreen(BuildContext context) {
  final box = context.findRenderObject();
  if (box is! RenderBox || !box.attached || !box.hasSize) return false;
  var rect = box.localToGlobal(Offset.zero) & box.size;
  final screen = Offset.zero & MediaQuery.sizeOf(context);
  rect = rect.intersect(screen);
  if (rect.width <= 0 || rect.height <= 0) return false;
  var scrollable = Scrollable.maybeOf(context);
  while (scrollable != null) {
    final view = scrollable.context.findRenderObject();
    if (view is RenderBox && view.attached && view.hasSize) {
      rect = rect.intersect(view.localToGlobal(Offset.zero) & view.size);
      if (rect.width <= 0 || rect.height <= 0) return false;
    }
    scrollable = Scrollable.maybeOf(scrollable.context);
  }
  return true;
}

/// Calls [onShown] once, the first time its child is on the screen: at
/// once when it already is, else when a scrolling view that holds it
/// brings it in.
class StudioFirstShown extends StatefulWidget {
  const StudioFirstShown({
    super.key,
    required this.onShown,
    required this.child,
  });

  final VoidCallback onShown;
  final Widget child;

  @override
  State<StudioFirstShown> createState() => _StudioFirstShownState();
}

class _StudioFirstShownState extends State<StudioFirstShown> {
  final _positions = <ScrollPosition>[];
  bool _shown = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _unlisten();
    if (_shown) return;
    var scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      _positions.add(scrollable.position..addListener(_later));
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  /// Checks once the page has been laid out where it scrolled to.
  void _later() =>
      WidgetsBinding.instance.addPostFrameCallback((_) => _check());

  void _check() {
    if (_shown || !mounted || !studioOnScreen(context)) return;
    _shown = true;
    _unlisten();
    widget.onShown();
  }

  void _unlisten() {
    for (final p in _positions) {
      p.removeListener(_later);
    }
    _positions.clear();
  }

  @override
  void dispose() {
    _unlisten();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Tells [onChange] each time its child comes on or goes off the screen
/// (a scrolling view that holds it moved), and once when it first lays out.
class StudioOnScreen extends StatefulWidget {
  const StudioOnScreen({
    super.key,
    required this.onChange,
    required this.child,
  });

  final ValueChanged<bool> onChange;
  final Widget child;

  @override
  State<StudioOnScreen> createState() => _StudioOnScreenState();
}

class _StudioOnScreenState extends State<StudioOnScreen> {
  final _positions = <ScrollPosition>[];
  bool? _on;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _unlisten();
    var scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      _positions.add(scrollable.position..addListener(_later));
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  /// Checks once the page has been laid out where it scrolled to.
  void _later() =>
      WidgetsBinding.instance.addPostFrameCallback((_) => _check());

  void _check() {
    if (!mounted) return;
    final on = studioOnScreen(context);
    if (on == _on) return;
    _on = on;
    widget.onChange(on);
  }

  void _unlisten() {
    for (final p in _positions) {
      p.removeListener(_later);
    }
    _positions.clear();
  }

  @override
  void dispose() {
    _unlisten();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// 129.1 The slow zoom over the open slide's photo: the slider gives it to
/// that slide; a photo in it (a photo hero's, a picture's, a background
/// picture's) grows by up to a tenth while the slide shows.
class StudioKenBurns extends InheritedWidget {
  const StudioKenBurns({super.key, required this.zoom, required super.child});

  /// 0 to 1 while the slide shows; null, no zoom.
  final Animation<double>? zoom;

  static Animation<double>? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<StudioKenBurns>()?.zoom;

  /// [photo] growing with the open slide, when it is in one that zooms and
  /// the phone doesn't reduce motion.
  static Widget wrap(BuildContext context, Widget photo) {
    final zoom = of(context);
    if (zoom == null || MediaQuery.disableAnimationsOf(context)) return photo;
    return ClipRect(
      child: ScaleTransition(
        key: const ValueKey('studio-ken-burns'),
        scale: Tween<double>(begin: 1, end: 1.1).animate(zoom),
        child: photo,
      ),
    );
  }

  @override
  bool updateShouldNotify(StudioKenBurns oldWidget) => zoom != oldWidget.zoom;
}

/// 129.1 Where a slider is, as dots in a frosted pill over its slides'
/// foot: the open one a longer white line.
class StudioSliderPill extends StatelessWidget {
  const StudioSliderPill({super.key, required this.count, required this.page});

  final int count;
  final int page;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0x38FFFFFF),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0x40FFFFFF)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < count; i++)
                  AnimatedContainer(
                    duration: MediaQuery.disableAnimationsOf(context)
                        ? Duration.zero
                        : const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    width: i == page ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: i == page
                          ? const Color(0xFFFFFFFF)
                          : const Color(0x8CFFFFFF),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
