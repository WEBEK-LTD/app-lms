import 'dart:ui';

import 'package:flutter/material.dart';

import '../../../../core/api/models.dart';
import '../../../../core/theme/tokens.dart';
import '../../../../core/widgets/logo.dart';
import '../../../../core/widgets/sym.dart';

// TEMPORARY: stand-ins for the shell's Avatar and IconBtn
// (lib/core/widgets, area D) until they land; this file then goes.

/// A member's round avatar: their photo, else their initial on one of the
/// design's six gradients; the Yallapp Team's is the logo.
class MemberAvatar extends StatelessWidget {
  const MemberAvatar({
    super.key,
    required this.member,
    this.size = 34,
    this.ring = false,
    this.ringGap,
  });

  final MemberSummary member;
  final double size;

  /// The signed-in member's own conic ring (`.me`).
  final bool ring;

  /// The colour between the ring and the avatar (the screen's).
  final Color? ringGap;

  static int gradientOf(String id) => switch (id) {
    'm-mohamed' => 2,
    'm-nour' => 4,
    'm-karim' => 5,
    _ => id.codeUnits.fold(0, (a, b) => a + b) % 6,
  };

  @override
  Widget build(BuildContext context) {
    final Widget face = member.team
        ? CommunityLogo(size: size, radius: size * 10 / 32)
        : Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: Brand.avatars[gradientOf(member.id)],
              ),
              image: member.avatarUrl == null
                  ? null
                  : DecorationImage(
                      image: NetworkImage(member.avatarUrl!),
                      fit: BoxFit.cover,
                    ),
            ),
            child: member.avatarUrl == null
                ? Text(
                    member.initial,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: size * 13 / 34,
                    ),
                  )
                : null,
          );
    if (!ring) return face;
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: Brand.meRing,
      ),
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: ringGap ?? context.palette.screen,
            width: 2,
          ),
        ),
        child: face,
      ),
    );
  }
}

/// The header's glass button (`.ib`): 42 square, corners 15.
class GlassIconButton extends StatelessWidget {
  const GlassIconButton({
    super.key,
    required this.icon,
    required this.onTap,
    required this.label,
    this.fill = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String label;
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
            child: Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: p.iconButton,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: p.iconButtonBorder),
                boxShadow: [
                  BoxShadow(
                    color: p.iconButtonShadow,
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Sym(icon, size: 22, fill: fill, color: p.iconButtonInk),
            ),
          ),
        ),
      ),
    );
  }
}
