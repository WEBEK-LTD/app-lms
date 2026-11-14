import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/palette.dart';

/// 128 The shade over an element's picture (`StudioNode.scrim`): its colour
/// darker at the two ends of its direction and clear in between, so a photo
/// hero's words at its foot or a photo tile's caption read. Across (90) it
/// runs from the start, so from the right in Arabic, as Studio's canvas
/// draws it (platform/web/src/lib/studio/scrim.ts).
LinearGradient studioScrimGradient(StudioScrim scrim) {
  final base = parseHexColor(scrim.color) ?? const Color(0xFF000000);
  final middle = scrim.middle;
  // CSS angles: 0 points up, 90 to the end, 180 down.
  final radians = (scrim.angle - 90) * math.pi / 180;
  final dx = math.cos(radians);
  final dy = math.sin(radians);
  return LinearGradient(
    begin: AlignmentDirectional(-dx, -dy),
    end: AlignmentDirectional(dx, dy),
    colors: [
      base.withValues(alpha: scrim.from),
      if (middle != null) base.withValues(alpha: middle),
      base.withValues(alpha: scrim.to),
    ],
    stops: [0, if (middle != null) scrim.at / 100, 1],
  );
}

/// The shade as a layer over the whole picture; it never takes a tap.
Widget studioScrimLayer(StudioNode node, StudioScrim scrim) => Positioned.fill(
  child: IgnorePointer(
    child: DecoratedBox(
      key: ValueKey('studio-scrim-${node.id}'),
      decoration: BoxDecoration(gradient: studioScrimGradient(scrim)),
    ),
  ),
);

/// 130.61 A photo's tone (`StudioNode.tone`): `mono` drains its colours to
/// black and white with a little more contrast, as Studio's canvas draws it
/// (platform/web/src/lib/studio/scrim.ts `toneStyle`); under the element's
/// shade it reads as a duotone in the shade's colour. Otherwise [photo] as
/// it is.
Widget studioToned(StudioNode node, Widget photo) {
  if (!node.monoTone) return photo;
  return ColorFiltered(
    key: ValueKey('studio-tone-${node.id}'),
    colorFilter: _mono,
    child: photo,
  );
}

/// Luminance (Rec. 709) to grey, stretched a little round the middle.
const _c = 1.08;
const _o = -0.04 * 255;
const _mono = ColorFilter.matrix([
  0.2126 * _c, 0.7152 * _c, 0.0722 * _c, 0, _o, //
  0.2126 * _c, 0.7152 * _c, 0.0722 * _c, 0, _o, //
  0.2126 * _c, 0.7152 * _c, 0.0722 * _c, 0, _o, //
  0, 0, 0, 1, 0, //
]);
