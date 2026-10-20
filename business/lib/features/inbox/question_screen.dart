import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final questionProvider = FutureProvider.autoDispose.family<QuestionDetail, int>(
  (ref, id) => ref.watch(apiProvider).question(ref.watch(appIdProvider), id),
);

/// 63 A student's question in a course, with its answers: yours show in the
/// app in your app's name, and the student is told on their phone.
class QuestionScreen extends ConsumerStatefulWidget {
  const QuestionScreen({super.key, required this.questionId});

  final int questionId;

  @override
  ConsumerState<QuestionScreen> createState() => _QuestionScreenState();
}

class _QuestionScreenState extends ConsumerState<QuestionScreen> {
  final _answer = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _answer.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _answer.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(apiProvider)
          .answerQuestion(ref.read(appIdProvider), widget.questionId, text);
      _answer.clear();
      ref.invalidate(questionProvider(widget.questionId));
      if (mounted) showMessage(context, context.l10n.answerSent);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// 64 Hides the question, or a student's answer, from others (its author
  /// still sees it), or shows it again.
  Future<void> _setHidden(bool hidden, {int? answerId}) async {
    final api = ref.read(apiProvider);
    final appId = ref.read(appIdProvider);
    try {
      if (answerId == null) {
        await api.setQuestionHidden(appId, widget.questionId, hidden);
      } else {
        await api.setAnswerHidden(appId, widget.questionId, answerId, hidden);
      }
      ref.invalidate(questionProvider(widget.questionId));
      if (mounted) {
        showMessage(
          context,
          hidden ? context.l10n.reviewHiddenDone : context.l10n.reviewShownDone,
        );
      }
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final detail = ref.watch(questionProvider(widget.questionId));
    final d = detail.value;
    final hidden = d?.question.hidden ?? false;
    return Scaffold(
      appBar: AppBar(
        title: Text(d?.question.person ?? l10n.questionTitle),
        actions: [
          if (d != null)
            IconButton(
              tooltip: hidden ? l10n.showQuestion : l10n.hideQuestion,
              onPressed: () => _setHidden(!hidden),
              icon: Icon(hidden ? AppIcons.visible : AppIcons.hidden),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: pullToRefresh(
                context,
                () => ref.refresh(questionProvider(widget.questionId).future),
              ),
              child: AsyncBody(
                value: detail,
                onRetry: () =>
                    ref.invalidate(questionProvider(widget.questionId)),
                builder: (d) => ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      l10n.inCourse(d.question.courseTitle),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (d.question.hidden) ...[
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          StatusChip(l10n.hiddenFromOthers, tone: Tone.warn),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.questionHiddenNote,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 8),
                    _Bubble(
                      name: d.question.person,
                      text: d.question.text,
                      at: d.question.createdAt,
                      mine: false,
                      hidden: d.question.hidden,
                    ),
                    for (final a in d.answers)
                      _Bubble(
                        name: a.fromBusiness ? l10n.you : a.name,
                        text: a.text,
                        at: a.createdAt,
                        mine: a.fromBusiness,
                        hidden: a.hidden,
                        // 64 A student's answer can be hidden from others.
                        onToggleHidden: a.fromBusiness
                            ? null
                            : () => _setHidden(!a.hidden, answerId: a.id),
                        toggleLabel: a.hidden
                            ? l10n.showAnswerOf(a.name)
                            : l10n.hideAnswerOf(a.name),
                      ),
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _answer,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 2000,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: l10n.writeAnswer,
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: l10n.send,
                    onPressed: _sending ? null : _send,
                    icon: const DirectionalIcon(AppIcons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.name,
    required this.text,
    required this.at,
    required this.mine,
    this.hidden = false,
    this.onToggleHidden,
    this.toggleLabel,
  });

  final String name;
  final String text;
  final DateTime at;
  final bool mine;

  /// 64 Hidden from others (shown dimmed, with the chip).
  final bool hidden;
  final VoidCallback? onToggleHidden;
  final String? toggleLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fg = mine ? context.yb.onInk : context.yb.ink;
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: mine ? context.yb.ink : context.yb.surface,
          borderRadius: BorderRadius.circular(18),
          border: mine ? null : Border.all(color: context.yb.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    name,
                    style: theme.textTheme.labelMedium?.copyWith(color: fg),
                  ),
                ),
                if (hidden) ...[
                  const SizedBox(width: 6),
                  Icon(AppIcons.hidden, size: 16, color: context.yb.ink2),
                ],
              ],
            ),
            if (hidden)
              Text(
                context.l10n.hiddenFromOthers,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: context.yb.ink2,
                ),
              ),
            const SizedBox(height: 2),
            Text(text, style: theme.textTheme.bodyMedium?.copyWith(color: fg)),
            const SizedBox(height: 4),
            Text(
              context.dateTime(at),
              style: theme.textTheme.labelSmall?.copyWith(
                color: mine ? fg.withValues(alpha: 0.8) : context.yb.ink2,
              ),
            ),
            if (onToggleHidden != null)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton.icon(
                  onPressed: onToggleHidden,
                  icon: Icon(hidden ? AppIcons.visible : AppIcons.hidden),
                  label: Semantics(
                    label: toggleLabel,
                    excludeSemantics: true,
                    child: Text(
                      hidden
                          ? context.l10n.showReview
                          : context.l10n.hideReview,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
