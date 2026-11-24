import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/l10n.dart';
import '../content_direction.dart';
import '../../../../core/theme/tokens.dart';
import '../../../../core/widgets/badge_mark.dart';
import '../../../../core/widgets/sym.dart';
import '../../data/qa_models.dart';
import '../qa_format.dart';
import 'member_avatar.dart';

/// The design's muted words by night (#9C98B5) and the day's muted ink.
Color qaMuted(BuildContext context) => context.palette.muted;

/// A section's chip (orange: "Studio") or a tag's (quiet: "Product page"):
/// mobile.html `.k`, 11.5 semibold, padding 5 × 10, corners 20.
class QaChip extends StatelessWidget {
  const QaChip.section(this.label, {super.key, this.onTap}) : section = true;
  const QaChip.tag(this.label, {super.key, this.onTap}) : section = false;

  final String label;
  final bool section;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dark = context.palette.dark;
    final (Color wash, Color ink, Color? edge) = section
        ? dark
              ? (
                  const Color(0x2EFF5A1F),
                  const Color(0xFFFFA37E),
                  const Color(0x4DFF5A1F),
                )
              : (
                  const Color(0x1FFF5A1F),
                  const Color(0xFFD9440F),
                  const Color(0x40FF5A1F),
                )
        : dark
        ? (const Color(0x14FFFFFF), const Color(0xFFCFCBE0), null)
        : (const Color(0x0D141327), const Color(0xFF3C3A50), null);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: edge == null ? 10 : 9,
          vertical: edge == null ? 5 : 4,
        ),
        decoration: BoxDecoration(
          color: wash,
          borderRadius: BorderRadius.circular(20),
          border: edge == null ? null : Border.all(color: edge),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: ink,
            height: 1.25,
          ),
        ),
      ),
    );
  }
}

/// A member's rank beside their name (`.lvl`: "Expert").
class RankChip extends StatelessWidget {
  const RankChip(this.rank, {super.key, this.label});

  final MemberRank rank;

  /// The server's words for it; missing, the app's.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = rankColors(rank, dark: context.palette.dark);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: c.wash,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label ?? rankLabel(context, rank),
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
          color: c.ink,
          height: 1.3,
        ),
      ),
    );
  }
}

/// "✓ Official" beside the Yallapp Team's name (`.badge-team` by night).
class OfficialBadge extends StatelessWidget {
  const OfficialBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final dark = context.palette.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: dark ? const Color(0x1AFFFFFF) : Brand.navy,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Sym(
            Symbols.verified_rounded,
            size: 12,
            fill: true,
            color: Brand.mint,
          ),
          const SizedBox(width: 3),
          Text(
            context.l10n.qaOfficial,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Brand.cream,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// "✓ Accepted" on the accepted answer's top edge.
class AcceptedPill extends StatelessWidget {
  const AcceptedPill({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Brand.mint, Color(0xFF22C483)],
      ),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Sym(
          Symbols.check_circle_rounded,
          size: 14,
          fill: true,
          color: Color(0xFF05301F),
        ),
        const SizedBox(width: 4),
        Text(
          context.l10n.qaAccepted,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF05301F),
            height: 1.3,
          ),
        ),
      ],
    ),
  );
}

/// The vote pill: ▲ score ▼. The member's own vote is the filled orange
/// arrow (the design's accepted answer: ▲ 42).
class VotePill extends StatelessWidget {
  const VotePill({
    super.key,
    required this.score,
    required this.myVote,
    required this.onVote,
  });

  final int score;
  final int myVote;

  /// 1, -1, or 0 to take the vote back; null: voting is off (signed out).
  final ValueChanged<int>? onVote;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final quiet = p.dark ? const Color(0xFF9C98B5) : p.muted;
    const voted = Color(0xFFFF8A5C);
    Widget arrow(int value, IconData icon, String label) {
      final on = myVote == value;
      return Semantics(
        button: true,
        selected: on,
        label: label,
        child: InkResponse(
          onTap: onVote == null ? null : () => onVote!(on ? 0 : value),
          radius: 18,
          child: Sym(icon, size: 20, fill: on, color: on ? voted : quiet),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x12FFFFFF) : const Color(0x0D141327),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          arrow(1, Symbols.arrow_upward_rounded, context.l10n.qaVoteUp),
          const SizedBox(width: 2),
          Text(
            '$score',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: p.ink,
              height: 1.2,
            ),
          ),
          const SizedBox(width: 2),
          arrow(-1, Symbols.arrow_downward_rounded, context.l10n.qaVoteDown),
        ],
      ),
    );
  }
}

/// A name with what goes beside it: the Yallapp Team's "Official", else the
/// member's rank ("Expert").
class AuthorName extends StatelessWidget {
  const AuthorName(this.author, {super.key, this.official = false});

  final Author author;
  final bool official;

  @override
  Widget build(BuildContext context) {
    final name = Text(
      author.member.name,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 13.5,
        color: context.palette.ink,
        height: 1.3,
      ),
    );
    final team = official || author.member.team;
    // The member's highest badge only (Gold, then Green, then Blue), then
    // the Yallapp Team's "Official" or the member's rank ("Expert").
    final badge = team ? null : author.member.badge;
    final Widget? beside = team
        ? const OfficialBadge()
        : showsRank(author.rank)
        ? RankChip(author.rank!, label: author.rankLabel)
        : null;
    if (beside == null && badge == null) return name;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(child: name),
        if (badge != null) ...[const SizedBox(width: 4), BadgeMark(badge)],
        if (beside != null) ...[const SizedBox(width: 6), beside],
      ],
    );
  }
}

/// An answer's card. The accepted one is green-edged with "Accepted" on its
/// top edge (the design's Yallapp Team answer); the others are quiet glass.
class AnswerCard extends StatelessWidget {
  const AnswerCard({
    super.key,
    required this.answer,
    required this.onVote,
    this.onReplies,
    this.onAccept,
    this.onLongPress,
    this.canAccept = false,
    this.now,
  });

  final Answer answer;
  final ValueChanged<int>? onVote;
  final VoidCallback? onReplies;

  /// Accepts (or un-accepts) it: the asker only.
  final VoidCallback? onAccept;

  /// Its menu (reply, accept, report): the design draws none, so it opens on
  /// a long press.
  final VoidCallback? onLongPress;
  final bool canAccept;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = p.dark;
    final quiet = dark ? const Color(0xFF9C98B5) : p.muted;
    final accepted = answer.accepted;
    final decoration = accepted
        ? BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: dark
                  ? const [Color(0x2918A56B), Color(0x0AFFFFFF)]
                  : const [Color(0x2418A56B), Colors.white],
              stops: const [0, .7],
            ),
            border: Border.all(
              color: dark ? const Color(0x732FD392) : const Color(0x8C2FD392),
            ),
            boxShadow: dark
                ? null
                : [
                    BoxShadow(
                      color: p.cardShadow,
                      blurRadius: 34,
                      offset: const Offset(0, 14),
                    ),
                  ],
          )
        : BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: dark ? const Color(0x0BFFFFFF) : Colors.white,
            border: Border.all(
              color: dark ? const Color(0x12FFFFFF) : const Color(0x0A141327),
            ),
            boxShadow: dark
                ? null
                : [
                    BoxShadow(
                      color: p.cardShadow,
                      blurRadius: 34,
                      offset: const Offset(0, 14),
                    ),
                  ],
          );
    final card = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: decoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              MemberAvatar(member: answer.author.member, size: 32),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AuthorName(answer.author, official: answer.official),
                    Text(
                      ago(context, answer.createdAt, now: now),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: quiet,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (answer.status == ContentStatus.pending) ...[
            const SizedBox(height: 8),
            _PendingNote(),
          ],
          const SizedBox(height: 9),
          Text(
            answer.body,
            textDirection: contentDirection(answer.body),
            style: TextStyle(fontSize: 13.5, height: 1.6, color: p.soft),
          ),
          SizedBox(height: accepted || answer.replyCount > 0 ? 12 : 10),
          Row(
            children: [
              VotePill(
                score: answer.score,
                myVote: answer.myVote,
                onVote: onVote,
              ),
              if (answer.replyCount > 0) ...[
                const SizedBox(width: 12),
                InkWell(
                  onTap: onReplies,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Sym(
                          Symbols.chat_bubble_rounded,
                          size: 17,
                          color: quiet,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          context.l10n.qaReplyCount(answer.replyCount),
                          style: TextStyle(fontSize: 12, color: quiet),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const Spacer(),
              // The asker's Accept, on an answer not yet accepted: an
              // outline of the Accepted badge's green. Others see none.
              if (canAccept && !accepted && onAccept != null)
                AcceptPill(onTap: onAccept!),
            ],
          ),
        ],
      ),
    );
    final pressable = GestureDetector(onLongPress: onLongPress, child: card);
    if (!accepted) return pressable;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        pressable,
        const PositionedDirectional(top: -11, end: 16, child: AcceptedPill()),
      ],
    );
  }
}

class _PendingNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Row(
    children: [
      const Sym(Symbols.schedule_rounded, size: 15, color: Brand.amber),
      const SizedBox(width: 5),
      Expanded(
        child: Text(
          context.l10n.qaPending,
          style: const TextStyle(fontSize: 11.5, color: Brand.amber),
        ),
      ),
    ],
  );
}

/// "✓ Accept": the asker's button on an answer, the Accepted badge's green
/// as an outline.
class AcceptPill extends StatelessWidget {
  const AcceptPill({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dark = context.palette.dark;
    final ink = dark ? Brand.mint : const Color(0xFF0E8F63);
    return Semantics(
      button: true,
      label: context.l10n.qaAccept,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          key: const ValueKey('accept-pill'),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: ink, width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Sym(Symbols.check_circle_rounded, size: 14, color: ink),
              const SizedBox(width: 4),
              Text(
                context.l10n.qaAcceptShort,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: ink,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
