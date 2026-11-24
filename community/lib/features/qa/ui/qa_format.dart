import 'package:flutter/material.dart';

import '../../../core/l10n.dart';
import '../data/qa_models.dart';

/// "3h", "2d", "now": how long ago, short (the design's "3h · 284 views").
String shortAge(BuildContext context, DateTime at, {DateTime? now}) {
  final l = context.l10n;
  final d = (now ?? DateTime.now().toUtc()).difference(at.toUtc());
  if (d.inMinutes < 1) return l.qaJustNow;
  if (d.inHours < 1) return l.qaMinutes(d.inMinutes);
  if (d.inDays < 1) return l.qaHours(d.inHours);
  return l.qaDays(d.inDays);
}

/// "2h ago" (the design's answers), "now" alone.
String ago(BuildContext context, DateTime at, {DateTime? now}) {
  final age = shortAge(context, at, now: now);
  return age == context.l10n.qaJustNow ? age : context.l10n.qaAgo(age);
}

String rankLabel(BuildContext context, MemberRank rank) {
  final l = context.l10n;
  return switch (rank) {
    MemberRank.newcomer => l.qaRankNewcomer,
    MemberRank.member => l.qaRankMember,
    MemberRank.contributor => l.qaRankContributor,
    MemberRank.expert => l.qaRankExpert,
    MemberRank.pro => l.qaRankPro,
  };
}

/// A rank's chip (`.lvl`): its wash and its words, by night and by day. The
/// design's "Expert" is pink.
({Color wash, Color ink}) rankColors(MemberRank rank, {required bool dark}) =>
    switch (rank) {
      MemberRank.expert =>
        dark
            ? (wash: const Color(0x26FF6E9A), ink: const Color(0xFFFF8FB3))
            : (wash: const Color(0x1FFF6E9A), ink: const Color(0xFFC2305E)),
      MemberRank.pro =>
        dark
            ? (wash: const Color(0x26FF8A3D), ink: const Color(0xFFFFA37E))
            : (wash: const Color(0x1FFF8A3D), ink: const Color(0xFFC04A12)),
      MemberRank.contributor =>
        dark
            ? (wash: const Color(0x263FA9F5), ink: const Color(0xFF7CC4FF))
            : (wash: const Color(0x1F3FA9F5), ink: const Color(0xFF1F6FD1)),
      MemberRank.member =>
        dark
            ? (wash: const Color(0x267C6BFF), ink: const Color(0xFFB3A8FF))
            : (wash: const Color(0x1F7C6BFF), ink: const Color(0xFF4B3BE0)),
      MemberRank.newcomer =>
        dark
            ? (wash: const Color(0x14FFFFFF), ink: const Color(0xFFCFCBE0))
            : (wash: const Color(0x0F141327), ink: const Color(0xFF6E6B80)),
    };

/// Whether a rank shows its chip beside a name: newcomers and members don't.
bool showsRank(MemberRank? rank) =>
    rank == MemberRank.contributor ||
    rank == MemberRank.expert ||
    rank == MemberRank.pro;
