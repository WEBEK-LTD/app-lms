import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// A member's avatar (common.css `.av`): their photo, else their initial on
/// one of the six gradients, chosen by their id so it never changes.
class Avatar extends StatelessWidget {
  const Avatar({
    super.key,
    required this.id,
    required this.name,
    this.url,
    this.size = 40,
    this.border,
    this.borderWidth = 2,
    this.colors,
  });

  final String id;
  final String name;
  final String? url;
  final double size;

  /// A ring of this colour around it (the design's 2px page-coloured edge).
  final Color? border;
  final double borderWidth;

  /// Its gradient, when not the one its id picks.
  final List<Color>? colors;

  static List<Color> gradientFor(String id) {
    var h = 0;
    for (final c in id.codeUnits) {
      h = (h * 31 + c) & 0x7fffffff;
    }
    return Brand.avatars[h % Brand.avatars.length];
  }

  String get _initial {
    final t = name.trim();
    return t.isEmpty ? '?' : String.fromCharCode(t.runes.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final colors = this.colors ?? gradientFor(id);
    final photo = url;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
        border: border == null
            ? null
            : Border.all(color: border!, width: borderWidth),
        image: photo == null || photo.isEmpty
            ? null
            : DecorationImage(image: NetworkImage(photo), fit: BoxFit.cover),
      ),
      alignment: Alignment.center,
      child: photo == null || photo.isEmpty
          ? Text(
              _initial,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: size * .375,
                height: 1,
              ),
            )
          : null,
    );
  }
}

/// The member's own avatar in the brand's ring (`.me`: a 2px conic ring,
/// the avatar inside a 2px edge of the page's colour).
class MeAvatar extends StatelessWidget {
  const MeAvatar({
    super.key,
    required this.id,
    required this.name,
    this.url,
    this.size = 40,
    this.edge,
  });

  final String id;
  final String name;
  final String? url;

  /// The avatar's own size (the ring adds 2px around it).
  final double size;

  /// The edge's colour; missing, the page's.
  final Color? edge;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(2),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      gradient: Brand.meRing,
    ),
    child: Avatar(
      id: id,
      name: name,
      url: url,
      size: size,
      border: edge ?? context.palette.screen,
    ),
  );
}
