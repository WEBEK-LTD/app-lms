import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../lesson/content/html_content.dart';
import '../../../core/l10n/l10n.dart';

/// Answers for the questions the app shows natively. Questions answered in
/// a web view are saved by the site itself and are not sent here.
List<AnswerInput> buildAnswers(
  List<Question> questions,
  Map<int, Set<String>> selections,
) => [
  for (final q in questions)
    if (q.isNative)
      AnswerInput(
        questionId: q.id,
        optionIds: (selections[q.id] ?? const <String>{}).toList(),
      ),
];

/// Options for a true/false question, when the site sends none.
List<QuestionOption> optionsFor(Question q) {
  if (q.options.isNotEmpty || q.type != QuestionType.trueFalse) {
    return q.options;
  }
  return [
    QuestionOption(id: 'true', label: currentL10n.answerTrue),
    QuestionOption(id: 'false', label: currentL10n.answerFalse),
  ];
}

/// Quiz details, a timed attempt with native single, multiple choice and
/// true/false questions (others in a web view) and the result (design: Quiz).
class QuizScreen extends ConsumerStatefulWidget {
  const QuizScreen({super.key, required this.quizId});

  final int quizId;

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  Attempt? _attempt;
  AttemptResult? _result;
  int _index = 0;
  final Map<int, Set<String>> _selections = {};
  bool _starting = false;
  bool _submitting = false;
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _starting = true);
    try {
      final attempt = await ref
          .read(yallappApiProvider)
          .startAttempt(widget.quizId);
      if (!mounted) return;
      setState(() {
        _attempt = attempt;
        _result = null;
        _index = 0;
        _selections.clear();
      });
      _ticker?.cancel();
      if (attempt.endsAt != null) {
        _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
          if (!mounted) return;
          if (_remaining == Duration.zero) {
            _ticker?.cancel();
            unawaited(_submit(timeUp: true));
          } else {
            setState(() {});
          }
        });
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Duration get _remaining {
    final ends = _attempt?.endsAt;
    if (ends == null) return Duration.zero;
    final left = ends.difference(DateTime.now().toUtc());
    return left.isNegative ? Duration.zero : left;
  }

  Future<void> _submit({bool timeUp = false}) async {
    final attempt = _attempt;
    if (attempt == null || _submitting) return;
    if (!timeUp) {
      final unanswered = attempt.questions
          .where((q) => q.isNative && (_selections[q.id]?.isEmpty ?? true))
          .length;
      if (unanswered > 0) {
        final ok = await confirmAction(
          context,
          title: context.l10n.submitQuizTitle,
          message: context.l10n.unansweredQuestions(unanswered),
          confirmLabel: context.l10n.submit,
        );
        if (!ok) return;
      }
    }
    setState(() => _submitting = true);
    try {
      final result = await ref
          .read(yallappApiProvider)
          .submitAttempt(
            widget.quizId,
            attempt.id,
            buildAnswers(attempt.questions, _selections),
          );
      _ticker?.cancel();
      if (!mounted) return;
      ref
        ..invalidate(quizProvider(widget.quizId))
        ..invalidate(quizAttemptsProvider);
      setState(() {
        _result = result;
        _attempt = null;
      });
      if (timeUp) {
        showMessage(context, context.l10n.timeUp);
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _close() async {
    if (_attempt != null) {
      final leave = await confirmAction(
        context,
        title: context.l10n.leaveQuizTitle,
        message: context.l10n.leaveQuizMessage,
        confirmLabel: context.l10n.leave,
        destructive: true,
      );
      if (!leave || !mounted) return;
    }
    if (mounted) Navigator.of(context).maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final quiz = ref.watch(quizProvider(widget.quizId));
    return PopScope(
      canPop: _attempt == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Scaffold(
        body: switch (quiz) {
          AsyncData(:final value) => _body(context, value),
          AsyncError(:final error) => SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SquareIconButton(
                    icon: AppIcons.close,
                    label: context.l10n.closeQuiz,
                    onPressed: _close,
                  ),
                ),
                Expanded(
                  child: ErrorView(
                    error: error,
                    onRetry: () => ref.invalidate(quizProvider(widget.quizId)),
                  ),
                ),
              ],
            ),
          ),
          _ => LoadingView(label: context.l10n.loadingQuiz),
        },
      ),
    );
  }

  Widget _header(BuildContext context, String title) {
    final p = context.palette;
    final timed = _attempt?.endsAt != null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        children: [
          SquareIconButton(
            icon: AppIcons.close,
            label: context.l10n.closeQuiz,
            iconSize: 20,
            onPressed: _close,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(width: 12),
          if (timed)
            Semantics(
              label: context.l10n.timeLeft(formatClock(_remaining)),
              excludeSemantics: true,
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: p.timerSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    AppIcon(AppIcons.schedule, size: 16, color: p.onTimerSoft),
                    const SizedBox(width: 6),
                    Text(
                      formatClock(_remaining),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.onTimerSoft,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            const SizedBox(width: 44),
        ],
      ),
    );
  }

  Widget _body(BuildContext context, Quiz quiz) {
    final attempt = _attempt;
    if (_result != null) return _resultView(context, quiz, _result!);
    if (attempt == null) return _intro(context, quiz);
    if (attempt.questions.isEmpty) {
      return SafeArea(
        child: Column(
          children: [
            _header(context, quiz.title),
            Expanded(
              child: MessageView(
                icon: AppIcons.quiz,
                title: context.l10n.quizNoQuestions,
              ),
            ),
          ],
        ),
      );
    }
    final p = context.palette;
    final q = attempt.questions[_index];
    final last = _index == attempt.questions.length - 1;
    return Column(
      children: [
        Expanded(
          child: SafeArea(
            bottom: false,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _header(context, quiz.title),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              context.l10n.questionPosition(
                                _index + 1,
                                attempt.questions.length,
                              ),
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ),
                          Text(
                            q.typeLabel,
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ProgressTrack(
                        percent: (_index + 1) / attempt.questions.length * 100,
                      ),
                      const SizedBox(height: 22),
                      _QuestionView(
                        key: ValueKey('question-${q.id}'),
                        question: q,
                        selected: _selections[q.id] ?? const {},
                        onChanged: (s) => setState(() => _selections[q.id] = s),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        BottomActionBar(
          child: Row(
            children: [
              Expanded(
                child: SecondaryButton(
                  label: context.l10n.previous,
                  onPressed: _index == 0
                      ? null
                      : () => setState(() => _index--),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: PrimaryButton(
                  label: last
                      ? context.l10n.submitQuiz
                      : context.l10n.nextQuestion,
                  height: 54,
                  loading: _submitting,
                  onPressed: last ? _submit : () => setState(() => _index++),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _intro(BuildContext context, Quiz quiz) {
    final p = context.palette;
    final facts = <(IconData, String)>[
      (AppIcons.quiz, context.l10n.questionCount(quiz.questionCount)),
      if (quiz.timeLimitSeconds != null && quiz.timeLimitSeconds! > 0)
        (
          AppIcons.timer,
          context.l10n.timeLimit(
            formatMinutes((quiz.timeLimitSeconds! / 60).ceil()),
          ),
        ),
      if (quiz.passPercent != null)
        (AppIcons.flag, context.l10n.passMark(quiz.passPercent!)),
      (
        AppIcons.replay,
        quiz.attemptsAllowed == null
            ? context.l10n.unlimitedAttempts
            : context.l10n.attemptsUsed(
                quiz.attemptsUsed,
                quiz.attemptsAllowed!,
              ),
      ),
    ];
    return Column(
      children: [
        Expanded(
          child: SafeArea(
            bottom: false,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _header(context, ''),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          quiz.title,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      const SizedBox(height: 18),
                      AppCard(
                        child: Column(
                          children: [
                            for (final (i, (icon, label)) in facts.indexed) ...[
                              if (i > 0) Divider(height: 1, color: p.divider),
                              SettingsTile(
                                icon: icon,
                                title: label,
                                chevron: false,
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (quiz.lastResult != null) ...[
                        const SizedBox(height: 18),
                        SectionHeader(title: context.l10n.lastResult, size: 16),
                        const SizedBox(height: 8),
                        AttemptResultTile(result: quiz.lastResult!),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        BottomActionBar(
          child: quiz.canStart
              ? PrimaryButton(
                  label: quiz.attemptsUsed == 0
                      ? context.l10n.startQuiz
                      : context.l10n.startNewAttempt,
                  height: 54,
                  loading: _starting,
                  onPressed: _start,
                )
              : Text(
                  context.l10n.noAttemptsLeft,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
        ),
      ],
    );
  }

  Widget _resultView(BuildContext context, Quiz quiz, AttemptResult result) {
    final (icon, title) = switch (result.status) {
      AttemptStatus.passed => (AppIcons.checkCircle, context.l10n.youPassed),
      AttemptStatus.failed => (AppIcons.replay, context.l10n.notPassedThisTime),
      AttemptStatus.pendingReview => (
        AppIcons.schedule,
        context.l10n.submittedForReview,
      ),
    };
    final score = result.scorePercent;
    return SafeArea(
      child: Column(
        children: [
          _header(context, quiz.title),
          Expanded(
            child: MessageView(
              icon: icon,
              title: title,
              message: [
                if (score != null)
                  context.l10n.yourScore(
                    score.toStringAsFixed(score % 1 == 0 ? 0 : 1),
                  ),
                if (quiz.passPercent != null)
                  context.l10n.passMarkColon(quiz.passPercent!),
                if (result.status == AttemptStatus.pendingReview)
                  context.l10n.instructorWillReview,
              ].join('\n'),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              children: [
                if (result.status == AttemptStatus.failed &&
                    (quiz.attemptsAllowed == null ||
                        quiz.attemptsUsed < quiz.attemptsAllowed!)) ...[
                  PrimaryButton(
                    label: context.l10n.tryAgain,
                    loading: _starting,
                    onPressed: _start,
                  ),
                  const SizedBox(height: 10),
                ],
                SecondaryButton(
                  label: context.l10n.backToCourse,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionView extends ConsumerWidget {
  const _QuestionView({
    super.key,
    required this.question,
    required this.selected,
    required this.onChanged,
  });

  final Question question;
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final q = question;
    final title = Semantics(
      header: true,
      child: Text(
        q.title,
        style: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w700,
          height: 1.5,
          color: p.text,
        ),
      ),
    );
    final description = (q.descriptionHtml ?? '').trim().isEmpty
        ? null
        : HtmlContent(html: q.descriptionHtml!);

    if (!q.isNative) {
      final url = q.webviewUrl;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          title,
          ?description,
          const SizedBox(height: 12),
          if (url == null)
            Text(
              context.l10n.questionNotSupported,
              style: TextStyle(color: p.textSecondary),
            )
          else ...[
            Text(
              context.l10n.answerBelow,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            const SizedBox(height: 10),
            Container(
              height: 420,
              decoration: BoxDecoration(
                border: Border.all(color: p.inputBorder),
                borderRadius: BorderRadius.circular(14),
              ),
              clipBehavior: Clip.antiAlias,
              child: ref.watch(webViewBuilderProvider)(
                WebViewRequest(
                  url: Uri.parse(url),
                  debugLabel: 'question-${q.id}',
                ),
              ),
            ),
          ],
        ],
      );
    }

    final multiple = q.type == QuestionType.multipleChoice;
    final options = optionsFor(q);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        title,
        ?description,
        const SizedBox(height: 14),
        Semantics(
          container: true,
          label: multiple ? context.l10n.chooseAll : context.l10n.chooseOne,
          child: Column(
            children: [
              for (final option in options) ...[
                _OptionTile(
                  option: option,
                  multiple: multiple,
                  selected: selected.contains(option.id),
                  onTap: () {
                    final next = {...selected};
                    if (multiple) {
                      if (!next.remove(option.id)) next.add(option.id);
                    } else {
                      next
                        ..clear()
                        ..add(option.id);
                    }
                    onChanged(next);
                  },
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.option,
    required this.multiple,
    required this.selected,
    required this.onTap,
  });

  final QuestionOption option;
  final bool multiple;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final icon = multiple
        ? (selected ? AppIcons.checkboxChecked : AppIcons.checkboxUnchecked)
        : (selected ? AppIcons.radioChecked : AppIcons.radioUnchecked);
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: !multiple,
      button: true,
      label: option.label,
      excludeSemantics: true,
      child: Material(
        color: selected ? p.accentSoft : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: selected ? p.text : p.border,
            width: selected ? 2 : 1.5,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  AppIcon(icon, size: 22, color: p.text, filled: selected),
                  const SizedBox(width: 12),
                  if (option.imageUrl != null) ...[
                    AppNetworkImage(
                      url: option.imageUrl,
                      width: 56,
                      height: 56,
                      radius: 8,
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Text(
                      option.label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: selected
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: p.text,
                      ),
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

/// One quiz result row (quiz screen and the Quiz results list).
class AttemptResultTile extends StatelessWidget {
  const AttemptResultTile({super.key, required this.result});

  final AttemptResult result;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = switch (result.status) {
      AttemptStatus.passed => p.success,
      AttemptStatus.failed => p.danger,
      AttemptStatus.pendingReview => p.textSecondary,
    };
    final score = result.scorePercent;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.quizTitle ?? context.l10n.quiz,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  result.statusLabel,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
          if (score != null)
            Text(
              '${score.round()}%',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
        ],
      ),
    );
  }
}
