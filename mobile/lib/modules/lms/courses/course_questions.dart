import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/account_scaffold.dart';
import '../data/lms_providers.dart';
import 'community_widgets.dart';
import '../../../core/l10n/l10n.dart';

/// The course page's Q&A tab for enrolled students: ask the instructor,
/// and read what others asked.
class CourseQuestionsTab extends ConsumerWidget {
  const CourseQuestionsTab({super.key, required this.courseId});

  final int courseId;

  Future<void> _ask(BuildContext context, WidgetRef ref) => showTextSheet(
    context,
    title: context.l10n.askQuestion,
    hint: context.l10n.askQuestionHint,
    sendLabel: context.l10n.sendQuestion,
    onSend: (text) async {
      try {
        final question = await ref
            .read(yallappApiProvider)
            .askQuestion(courseId, text);
        ref.invalidate(courseQuestionsProvider(courseId));
        // The thread says the student will be notified; a snackbar here
        // would cover its reply box.
        if (context.mounted) context.push(Paths.question(question.id));
        return true;
      } on ApiException catch (e) {
        if (context.mounted) showMessage(context, e.message);
        return false;
      }
    },
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(courseQuestionsProvider(courseId));
    final notifier = ref.read(courseQuestionsProvider(courseId).notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        count: 3,
        padding: EdgeInsets.zero,
        label: context.l10n.loadingQuestions,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SecondaryButton(
          label: context.l10n.askQuestion,
          icon: AppIcons.chat,
          onPressed: () => _ask(context, ref),
          height: 50,
        ),
        const SizedBox(height: 12),
        if (state.items.isEmpty)
          MessageView(
            icon: AppIcons.chat,
            title: context.l10n.noQuestionsTitle,
            message: context.l10n.noQuestionsMessage,
            compact: true,
          ),
        for (final q in state.items) ...[
          _QuestionCard(
            question: q,
            onTap: () => context.push(Paths.question(q.id)),
          ),
          const SizedBox(height: 10),
        ],
        if (state.hasMore)
          Center(
            child: TextButton(
              onPressed: state.loading ? null : notifier.loadMore,
              child: Text(
                state.loading
                    ? context.l10n.loadingEllipsis
                    : context.l10n.showMoreQuestions,
              ),
            ),
          ),
      ],
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.question, required this.onTap});

  final CourseQuestion question;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PersonLine(
            person: question.author,
            time: question.createdAt,
            you: question.mine,
          ),
          const SizedBox(height: 8),
          Text(
            question.text,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 15, height: 1.45, color: p.text),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              AppIcon(AppIcons.chat, size: 16, color: p.textSecondary),
              const SizedBox(width: 6),
              Text(
                question.answerCount == 0
                    ? context.l10n.noAnswersYet
                    : context.l10n.answerCount(question.answerCount),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A question with its answers, and a box to reply.
class QuestionScreen extends ConsumerStatefulWidget {
  const QuestionScreen({super.key, required this.questionId});

  final int questionId;

  @override
  ConsumerState<QuestionScreen> createState() => _QuestionScreenState();
}

class _QuestionScreenState extends ConsumerState<QuestionScreen> {
  final _reply = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send(CourseQuestion question) async {
    final text = _reply.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(yallappApiProvider).answerQuestion(question.id, text);
      _reply.clear();
      ref.invalidate(questionThreadProvider(widget.questionId));
      if (question.courseId != null) {
        ref.invalidate(courseQuestionsProvider(question.courseId!));
      }
      if (mounted) FocusScope.of(context).unfocus();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final thread = ref.watch(questionThreadProvider(widget.questionId));
    final p = context.palette;
    return switch (thread) {
      AsyncData(:final value) => AccountScaffold(
        title: context.l10n.questionOther,
        footer: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _reply,
                minLines: 1,
                maxLines: 5,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: context.l10n.writeReply,
                  counterText: '',
                ),
              ),
            ),
            const SizedBox(width: 10),
            ListenableBuilder(
              listenable: _reply,
              builder: (context, _) => SquareIconButton(
                icon: AppIcons.forward,
                label: context.l10n.sendReply,
                size: 52,
                background: p.primary,
                foreground: p.onPrimary,
                bordered: false,
                onPressed: _sending || _reply.text.trim().isEmpty
                    ? null
                    : () => _send(value.question),
              ),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PersonLine(
                    person: value.question.author,
                    time: value.question.createdAt,
                    you: value.question.mine,
                  ),
                  const SizedBox(height: 10),
                  SelectableText(
                    value.question.text,
                    style: TextStyle(fontSize: 16, height: 1.5, color: p.text),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SectionHeader(
              title: value.answers.isEmpty
                  ? context.l10n.noAnswersYet
                  : context.l10n.answerCount(value.answers.length),
              size: 16,
            ),
            if (value.answers.isEmpty && value.question.mine)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  context.l10n.answerNotification,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              ),
            const SizedBox(height: 10),
            for (final a in value.answers) ...[
              AppCard(
                padding: const EdgeInsets.all(14),
                color: a.author.instructor ? p.accentSoft : null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PersonLine(
                      person: a.author,
                      time: a.createdAt,
                      you: a.mine,
                    ),
                    const SizedBox(height: 8),
                    SelectableText(
                      a.text,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: p.textBody,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
      AsyncError(:final error) => AccountScaffold(
        title: context.l10n.questionOther,
        scrollable: false,
        child: ErrorView(
          error: error,
          onRetry: () =>
              ref.invalidate(questionThreadProvider(widget.questionId)),
        ),
      ),
      _ => AccountScaffold(
        title: context.l10n.questionOther,
        scrollable: false,
        child: LoadingView(label: context.l10n.loadingQuestion),
      ),
    };
  }
}
