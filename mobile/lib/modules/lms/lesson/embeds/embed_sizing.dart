import 'dart:math' as math;

import '../../../../core/api/models/models.dart';

/// Where an embed's height came from (docs/ARCHITECTURE.md, "Iframe sizing
/// in the app").
enum EmbedHeightSource {
  /// 1. Measured from the embedded page (same site only).
  measured,

  /// 2. Reported by the embedded page through `postMessage`.
  reported,

  /// 3. The provider's aspect ratio (16:9 for YouTube and Vimeo) or the
  /// lesson's `aspect_ratio`.
  aspectRatio,

  /// 4. The height set in the lesson, capped to the visible screen.
  lessonHeight,

  /// 5. The visible screen height.
  viewport,
}

class EmbedSize {
  const EmbedSize({
    required this.width,
    required this.height,
    required this.source,
    this.capped = false,
  });

  final double width;
  final double height;
  final EmbedHeightSource source;

  /// The height was reduced to fit the visible screen, so the page scrolls
  /// inside the frame and a full-screen button helps.
  final bool capped;

  /// Content-sized frames don't need to scroll themselves.
  bool get sizedToContent =>
      source == EmbedHeightSource.measured ||
      source == EmbedHeightSource.reported;

  @override
  bool operator ==(Object other) =>
      other is EmbedSize &&
      other.width == width &&
      other.height == height &&
      other.source == source &&
      other.capped == capped;

  @override
  int get hashCode => Object.hash(width, height, source, capped);

  @override
  String toString() =>
      'EmbedSize(${width.toStringAsFixed(1)} x ${height.toStringAsFixed(1)}, '
      '${source.name}${capped ? ', capped' : ''})';
}

/// Smallest height an embed is ever given.
const minEmbedHeight = 120.0;

/// Largest content-measured height accepted (guards against runaway pages).
const maxMeasuredHeight = 20000.0;

/// Default aspect ratio for video providers.
const videoAspectRatio = 16 / 9;

/// Parses a lesson dimension like "900", "900px" or "56.25%".
///
/// Returns pixels for absolute values and null for percentages, "auto" or
/// anything unreadable.
double? parsePixels(String? value) {
  if (value == null) return null;
  final v = value.trim().toLowerCase();
  if (v.isEmpty || v.endsWith('%') || v == 'auto') return null;
  final match = RegExp(r'^(\d+(?:\.\d+)?)(px)?$').firstMatch(v);
  if (match == null) return null;
  final px = double.parse(match.group(1)!);
  return px > 0 ? px : null;
}

/// The aspect ratio to use for an embed, or null when unknown.
double? embedAspectRatio(Embed embed) {
  final ratio = embed.aspectRatio;
  if (ratio != null && ratio > 0.1 && ratio < 10) return ratio;
  if (embed.provider == EmbedProvider.youtube ||
      embed.provider == EmbedProvider.vimeo) {
    return videoAspectRatio;
  }
  return null;
}

/// Computes the size of an inline embed.
///
/// - Width always equals [contentWidth]: values set in the lesson such as
///   "100%" or "640" never make the frame wider than the screen.
/// - Height follows [mode]:
///   - `auto`: measured (same site) → reported → aspect ratio → lesson
///     height capped to [viewportHeight] → [viewportHeight];
///   - `fit_screen`: [viewportHeight];
///   - `as_set`: the lesson height capped to [viewportHeight], else the
///     aspect ratio, else [viewportHeight].
///
/// [viewportHeight] is the visible height available to content (screen minus
/// system bars, app bars and the keyboard), so callers recompute on rotation
/// and keyboard changes.
EmbedSize computeEmbedSize({
  required Embed embed,
  required double contentWidth,
  required double viewportHeight,
  EmbedHeightMode mode = EmbedHeightMode.auto,
  double? measuredHeight,
  double? reportedHeight,
}) {
  final width = math.max(0.0, contentWidth);
  final viewport = math.max(minEmbedHeight, viewportHeight);

  EmbedSize sized(double h, EmbedHeightSource source, {bool capped = false}) =>
      EmbedSize(
        width: width,
        height: math.max(minEmbedHeight, h),
        source: source,
        capped: capped,
      );

  EmbedSize? fromAspect() {
    final ratio = embedAspectRatio(embed);
    if (ratio == null || width <= 0) return null;
    final h = width / ratio;
    return h > viewport
        ? sized(viewport, EmbedHeightSource.aspectRatio, capped: true)
        : sized(h, EmbedHeightSource.aspectRatio);
  }

  EmbedSize? fromLesson() {
    final h = parsePixels(embed.height);
    if (h == null) return null;
    return h > viewport
        ? sized(viewport, EmbedHeightSource.lessonHeight, capped: true)
        : sized(h, EmbedHeightSource.lessonHeight);
  }

  EmbedSize viewportSize() => sized(viewport, EmbedHeightSource.viewport);

  switch (mode) {
    case EmbedHeightMode.fitScreen:
      return viewportSize();
    case EmbedHeightMode.asSet:
      return fromLesson() ?? fromAspect() ?? viewportSize();
    case EmbedHeightMode.auto:
      final measured = _usable(measuredHeight);
      if (embed.provider == EmbedProvider.sameSite && measured != null) {
        return sized(measured, EmbedHeightSource.measured);
      }
      final reported = _usable(reportedHeight);
      if (reported != null) return sized(reported, EmbedHeightSource.reported);
      return fromAspect() ?? fromLesson() ?? viewportSize();
  }
}

double? _usable(double? h) {
  if (h == null || h.isNaN || h <= 0) return null;
  return math.min(h, maxMeasuredHeight);
}

/// Visible height for content: the screen minus system insets, the
/// keyboard and the screen's own fixed bars ([chrome]).
double visibleViewportHeight({
  required double screenHeight,
  required double topPadding,
  required double bottomPadding,
  required double keyboardInset,
  double chrome = 0,
}) {
  final bottom = math.max(bottomPadding, keyboardInset);
  return math.max(0, screenHeight - topPadding - bottom - chrome);
}
