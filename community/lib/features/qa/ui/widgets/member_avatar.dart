import 'package:flutter/widgets.dart';

import '../../../../core/api/models.dart';
import '../../../../core/widgets/avatar.dart';

/// A member's avatar wherever area E shows one: the shell's [Avatar] (the
/// design's colours for its people, the Community logo for Yallapp's team)
/// and [MeAvatar] with the member's own ring.
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
  Widget build(BuildContext context) => ring
      ? MeAvatar(
          id: member.id,
          name: member.name,
          url: member.avatarUrl,
          size: size,
        )
      : Avatar(
          id: member.id,
          name: member.name,
          url: member.avatarUrl,
          size: size,
          team: member.team,
        );
}
