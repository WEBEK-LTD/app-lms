import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import 'content_direction.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../data/qa_models.dart';
import '../../social/report_sheet.dart';
import '../state/question_controller.dart';
import 'compose_sheet.dart';
import 'qa_format.dart';
import 'replies_sheet.dart';
import 'widgets/qa_widgets.dart';
import '../../../core/widgets/glass.dart';
import 'widgets/member_avatar.dart';

/// A question and its answers: mobile.html's "Question · dark mode" phone.
/// The header (back, save, the member), the section and tag chips, the
/// title, the asker; then the answers, the accepted one first with
/// "Accepted" on its edge. It sits under the shell's floating tab bar (Q&A
/// on), so the list ends above it.
class QuestionScreen extends ConsumerWidget {
  const QuestionScreen({super.key, required this.id, this.now});

  final String id;

  /// The clock the ages are counted from (tests fix it).
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final question = ref.watch(questionProvider(id));
    return Scaffold(
      backgroundColor: p.screen,
      body: Stack(
        children: [
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                _Header(
                  question: question.value,
                  onSave: (saved) => _run(
                    context,
                    () => ref
                        .read(questionProvider(id).notifier)
                        .bookmark(saved: saved),
                  ),
                ),
                Expanded(
                  child: switch (question) {
                    AsyncData(:final value) => _Body(question: value, now: now),
                    AsyncError() => _Failed(
                      onRetry: () => ref.invalidate(questionProvider(id)),
                    ),
                    _ => const Center(child: CircularProgressIndicator()),
                  },
                ),
              ],
            ),
          ),
          if (question.value != null && ref.watch(meProvider) != null)
            PositionedDirectional(
              start: 14,
              end: 14,
              bottom: _barBottom + MediaQuery.paddingOf(context).bottom,
              child: _AnswerBar(
                onTap: () => showComposeSheet(
                  context,
                  title: context.l10n.qaWriteAnswer,
                  hint: context.l10n.qaAnswerHint,
                  minLength: 10,
                  maxLength: 20000,
                  onSend: (text) =>
                      ref.read(questionProvider(id).notifier).answer(text),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Where the answer bar floats: above the shell's tab bar (20 up, 72 tall)
/// and its + button (14 above it), with a gap.
const double _barBottom = 20 + 72 + 22;

/// Runs what the member did and says so when the server refuses it.
Future<void> _run(BuildContext context, Future<void> Function() action) async {
  try {
    await action();
  } on ApiException catch (e) {
    if (!context.mounted) return;
    final l = context.l10n;
    final text = e.code == 'not_allowed'
        ? l.qaOwnVote
        : e.message.isNotEmpty
        ? e.message
        : l.commonError;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.question, required this.onSave});

  final Question? question;
  final ValueChanged<bool> onSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.watch(meProvider);
    final saved = question?.summary.bookmarked ?? false;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
      child: Row(
        children: [
          IconBtn(
            icon: Directionality.of(context) == TextDirection.rtl
                ? Symbols.arrow_forward_rounded
                : Symbols.arrow_back_rounded,
            label: l.commonBack,
            onTap: () => context.canPop() ? context.pop() : context.go('/qa'),
          ),
          const Spacer(),
          IconBtn(
            icon: Symbols.bookmark_rounded,
            fill: saved,
            label: saved ? l.qaSaved : l.qaSave,
            onTap: question == null ? null : () => onSave(!saved),
          ),
          if (me != null) ...[
            const SizedBox(width: 7),
            MemberAvatar(member: me.member, size: 40, ring: true),
          ],
        ],
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.question, this.now});

  final Question question;
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final s = question.summary;
    final quiet = p.dark ? const Color(0xFF9C98B5) : p.muted;
    final controller = ref.read(questionProvider(question.id).notifier);
    final signedIn = ref.watch(meProvider) != null;
    final meId = ref.watch(meProvider)?.member.id;
    return ListView(
      padding: EdgeInsets.only(
        bottom: _barBottom + 50 + 24 + MediaQuery.paddingOf(context).bottom,
      ),
      children: [
        GestureDetector(
          // The question's menu (report): the design draws none, so a long
          // press opens it.
          onLongPress: !signedIn || s.author.member.id == meId
              ? null
              : () => _questionMenu(context, question.id),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    QaChip.section(s.section.name),
                    for (final t in s.tags) QaChip.tag(t.name),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  s.title,
                  textDirection: contentDirection(s.title),
                  style: TextStyle(
                    fontSize: 22,
                    height: 1.35,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.4,
                    color: p.ink,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    MemberAvatar(member: s.author.member, size: 34),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AuthorName(s.author),
                          Text(
                            [
                              shortAge(context, s.createdAt, now: now),
                              l.qaViews(s.viewCount),
                              l.qaAnswerCount(question.answers.length),
                            ].join(' · '),
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
                if (s.status == ContentStatus.pending) ...[
                  const SizedBox(height: 10),
                  Text(
                    l.qaPending,
                    style: const TextStyle(fontSize: 12, color: Brand.amber),
                  ),
                ],
                if (question.body.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    question.body,
                    textDirection: contentDirection(question.body),
                    style: TextStyle(
                      fontSize: 13.5,
                      height: 1.6,
                      color: p.soft,
                    ),
                  ),
                  const SizedBox(height: 10),
                  VotePill(
                    score: s.score,
                    myVote: question.myVote,
                    onVote: !signedIn || s.author.member.id == meId
                        ? null
                        : (v) =>
                              _run(context, () => controller.voteQuestion(v)),
                  ),
                ],
              ],
            ),
          ),
        ),
        for (final (i, a) in question.answers.indexed)
          Padding(
            padding: EdgeInsets.fromLTRB(14, i == 0 ? 18 : 14, 14, 0),
            child: AnswerCard(
              answer: a,
              now: now,
              canAccept: question.canAccept,
              onVote: !signedIn || a.author.member.id == meId
                  ? null
                  : (v) => _run(context, () => controller.voteAnswer(a.id, v)),
              onAccept: () => _run(
                context,
                () => controller.accept(a.id, accept: !a.accepted),
              ),
              onReplies: () => showRepliesSheet(
                context,
                answer: a,
                onPosted: () => controller.replied(a.id),
              ),
              onLongPress: () => _answerMenu(
                context,
                answer: a,
                canAccept: question.canAccept,
                signedIn: signedIn,
                onReplies: () => showRepliesSheet(
                  context,
                  answer: a,
                  onPosted: () => controller.replied(a.id),
                ),
                onAccept: () => _run(
                  context,
                  () => controller.accept(a.id, accept: !a.accepted),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// The question's menu on a long press: report it.
Future<void> _questionMenu(BuildContext context, String id) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      builder: (sheet) => Material(
        type: MaterialType.transparency,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            ListTile(
              leading: const Sym(Symbols.flag_rounded, size: 22),
              title: Text(context.l10n.qaReport),
              onTap: () {
                Navigator.of(sheet).pop();
                showReportSheet(context, targetType: 'question', targetId: id);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

/// An answer's menu on a long press: its replies (and a reply of one's
/// own), accepting it (the asker), reporting it.
Future<void> _answerMenu(
  BuildContext context, {
  required Answer answer,
  required bool canAccept,
  required bool signedIn,
  required VoidCallback onReplies,
  required VoidCallback onAccept,
}) {
  final l = context.l10n;
  return showModalBottomSheet<void>(
    context: context,
    // Over the shell's floating tab bar.
    useRootNavigator: true,
    useSafeArea: true,
    builder: (sheet) {
      Widget line(IconData icon, String label, VoidCallback onTap) => ListTile(
        leading: Sym(icon, size: 22),
        title: Text(label),
        onTap: () {
          Navigator.of(sheet).pop();
          onTap();
        },
      );
      return Material(
        type: MaterialType.transparency,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            line(
              Symbols.chat_bubble_rounded,
              l.qaReplyCount(answer.replyCount),
              onReplies,
            ),
            if (canAccept)
              line(
                Symbols.check_circle_rounded,
                answer.accepted ? l.qaUnaccept : l.qaAccept,
                onAccept,
              ),
            if (signedIn)
              line(
                Symbols.flag_rounded,
                l.qaReport,
                () => showReportSheet(
                  context,
                  targetType: 'answer',
                  targetId: answer.id,
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      );
    },
  );
}

/// "Write an answer…": a glass bar in the floating tab bar's style (its
/// frosted fill, rim, corners and shadow), just above it; a tap opens the
/// composer.
class _AnswerBar extends StatelessWidget {
  const _AnswerBar({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: context.l10n.qaWriteAnswer,
      excludeSemantics: true,
      child: GestureDetector(
        key: const ValueKey('answer-bar'),
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(12)),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              height: 50,
              padding: const EdgeInsetsDirectional.fromSTEB(16, 0, 6, 0),
              decoration: BoxDecoration(
                color: p.tabBar,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: p.tabRim),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      context.l10n.qaAnswerHint,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 14, color: p.tabIcon),
                    ),
                  ),
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: Brand.sunrise,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Sym(
                      Symbols.send_rounded,
                      size: 20,
                      fill: true,
                      color: Colors.white,
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
}

class _Failed extends StatelessWidget {
  const _Failed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(context.l10n.commonError),
        const SizedBox(height: 8),
        TextButton(onPressed: onRetry, child: Text(context.l10n.commonRetry)),
      ],
    ),
  );
}
