import 'package:flutter/widgets.dart';

import '../../../../core/api/models.dart';
import '../../../../core/theme/tokens.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../core/widgets/logo.dart';

/// A member's avatar wherever area E shows one, on the shell's [Avatar] and
/// [MeAvatar]. The Yallapp Team's is the Community logo (the design's
/// official answer: 32 square, corners 10).
class MemberAvatar extends StatelessWidget {
  const MemberAvatar({
    super.key,
    required this.member,
    this.size = 34,
    this.ring = false,
  });

  final MemberSummary member;
  final double size;

  /// The signed-in member's own conic ring (`.me`).
  final bool ring;

  /// The approved design's people keep the mockup's colours: Mohamed's
  /// green (`.a3`), Nour's pink (`.a5`), Karim's blue (`.a6`).
  static List<Color>? designColors(String id) => switch (id) {
    'm-mohamed' => Brand.avatars[2],
    'm-nour' => Brand.avatars[4],
    'm-karim' => Brand.avatars[5],
    _ => null,
  };

  @override
  Widget build(BuildContext context) {
    final colors = designColors(member.id);
    if (member.team) return CommunityLogo(size: size, radius: size * 10 / 32);
    if (ring) {
      // MeAvatar's ring (`.me`) around the avatar in its colours.
      return Container(
        padding: const EdgeInsets.all(2),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: Brand.meRing,
        ),
        child: Avatar(
          id: member.id,
          name: member.name,
          url: member.avatarUrl,
          size: size,
          colors: colors,
          border: context.palette.screen,
        ),
      );
    }
    return Avatar(
      id: member.id,
      name: member.name,
      url: member.avatarUrl,
      size: size,
      colors: colors,
    );
  }
}
