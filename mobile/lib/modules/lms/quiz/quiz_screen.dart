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
  return const [
    QuestionOption(id: 'true', label: 'True'),
    QuestionOption(id: 'false', label: 'False'),
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
          title: 'Submit the quiz?',
          message:
              '${plural(unanswered, 'question')} ${unanswered == 1 ? 'has' : 'have'} no answer yet.',
          confirmLabel: 'Submit',
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
        showMessage(context, "Time's up. Your answers were submitted.");
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
        title: 'Leave the quiz?',
        message: "Your answers won't be submitted.",
        confirmLabel: 'Leave',
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
                    label: 'Close quiz',
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
          _ => const LoadingView(label: 'Loading quiz'),
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
            label: 'Close quiz',
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
              label: 'Time left ${formatClock(_remaining)}',
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
            const Expanded(
              child: MessageView(
                icon: AppIcons.quiz,
                title: 'This quiz has no questions yet',
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
                              'Question ${_index + 1} of ${attempt.questions.length}',
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
                  label: 'Previous',
                  onPressed: _index == 0
                      ? null
                      : () => setState(() => _index--),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: PrimaryButton(
                  label: last ? 'Submit quiz' : 'Next question',
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
      (AppIcons.quiz, plural(quiz.questionCount, 'question')),
      if (quiz.timeLimitSeconds != null && quiz.timeLimitSeconds! > 0)
        (
          AppIcons.timer,
          '${formatMinutes((quiz.timeLimitSeconds! / 60).ceil())} time limit',
        ),
      if (quiz.passPercent != null)
        (AppIcons.flag, 'Pass mark ${quiz.passPercent}%'),
      (
        AppIcons.replay,
        quiz.attemptsAllowed == null
            ? 'Unlimited attempts'
            : '${quiz.attemptsUsed} of ${quiz.attemptsAllowed} attempts used',
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
                        const SectionHeader(title: 'Last result', size: 16),
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
                      ? 'Start quiz'
                      : 'Start a new attempt',
                  height: 54,
                  loading: _starting,
                  onPressed: _start,
                )
              : Text(
                  "You've used all your attempts for this quiz.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
        ),
      ],
    );
  }

  Widget _resultView(BuildContext context, Quiz quiz, AttemptResult result) {
    final (icon, title) = switch (result.status) {
      AttemptStatus.passed => (AppIcons.checkCircle, 'You passed'),
      AttemptStatus.failed => (AppIcons.replay, 'Not passed this time'),
      AttemptStatus.pendingReview => (
        AppIcons.schedule,
        'Submitted for review',
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
                  'Your score: ${score.toStringAsFixed(score % 1 == 0 ? 0 : 1)}%',
                if (quiz.passPercent != null) 'Pass mark: ${quiz.passPercent}%',
                if (result.status == AttemptStatus.pendingReview)
                  'Your instructor will review your answers.',
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
                    label: 'Try again',
                    loading: _starting,
                    onPressed: _start,
                  ),
                  const SizedBox(height: 10),
                ],
                SecondaryButton(
                  label: 'Back to the course',
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
              "This question can't be shown in the app.",
              style: TextStyle(color: p.textSecondary),
            )
          else ...[
            Text(
              'Answer below. Your answer is saved when you move on.',
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
          label: multiple ? 'Choose all that apply' : 'Choose one answer',
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
                  result.quizTitle ?? 'Quiz',
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
