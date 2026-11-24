import 'package:flutter/widgets.dart';

import '../../../../core/api/models.dart';
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

  @override
  Widget build(BuildContext context) {
    if (member.team) return CommunityLogo(size: size, radius: size * 10 / 32);
    if (ring) {
      return MeAvatar(
        id: member.id,
        name: member.name,
        url: member.avatarUrl,
        size: size,
      );
    }
    return Avatar(
      id: member.id,
      name: member.name,
      url: member.avatarUrl,
      size: size,
    );
  }
}
