import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'content/html_content.dart';
import '../../shared/account/notifications_screen.dart' show timeAgo;
import '../learning/learning_providers.dart';
import '../learning/lesson_tools.dart' show showLessonNotes;
import '../navigation.dart';
import 'lesson_screen.dart';
import '../studio_courses/course_look_kit.dart';

/// 123 A lesson as the premium academy has it (`Config.screens.looks`
/// `lesson: premium`): where it is in the course and its name large, the
/// student's notes, the files and the discussion as chips, the next lesson
/// and the quiz coming up on their own cards, and the files with their
/// kind, in light and dark.
class PremiumLessonBody extends ConsumerStatefulWidget {
  const PremiumLessonBody({
    super.key,
    required this.lesson,
    required this.position,
    required this.download,
    required this.completed,
    required this.completing,
    required this.onComplete,
    this.courseImage,
    this.enrolled = false,
    this.videoPosition,
    this.textFirst = false,
    this.studio,
    this.topics,
  });

  /// 130.52 Studio's course screens' look (`Config.screens.courses.lesson`):
  /// how far through the course, previous and next, and the parts left out.
  final CourseScreensLook? studio;

  /// The course's curriculum, for how far through it the student is.
  final List<Topic>? topics;

  final Lesson lesson;
  final LessonPosition position;
  final Widget download;
  final bool completed;
  final bool completing;
  final VoidCallback onComplete;
  final String? courseImage;

  /// Signed in and enrolled: their bookmark and notes.
  final bool enrolled;

  /// Where the video is now, for a note written while watching.
  final int? Function()? videoPosition;

  /// A lesson without a video: its text is the first chip, open at first.
  final bool textFirst;

  @override
  ConsumerState<PremiumLessonBody> createState() => _PremiumLessonBodyState();
}

enum _Chip { notes, files, discussion, overview }

class _PremiumLessonBodyState extends ConsumerState<PremiumLessonBody> {
  _Chip? _open;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final lesson = widget.lesson;
    final position = widget.position;
    final features = ref.watch(appConfigProvider).features;
    final design = widget.studio?.lesson;
    final notes =
        widget.enrolled &&
        features.notes &&
        (design?.shows(LessonPart.notes) ?? true);
    final hasText = (lesson.html ?? '').trim().isNotEmpty;
    final files = (design?.shows(LessonPart.resources) ?? true)
        ? lesson.attachments
        : const <Attachment>[];
    final upNext = design?.shows(LessonPart.upNext) ?? true;
    final discussion = features.lessonDiscussion
        ? lesson.discussionCount
        : null;
    final chips = [
      if (hasText && widget.textFirst) _Chip.overview,
      if (notes) _Chip.notes,
      if (files.isNotEmpty) _Chip.files,
      if (discussion != null) _Chip.discussion,
      if (hasText && !widget.textFirst) _Chip.overview,
    ];
    final open = chips.contains(_open)
        ? _open
        : chips.where((c) => c != _Chip.discussion).firstOrNull;
    final where = [
      if (position.index != null && position.total != null)
        l10n.lessonPosition(position.index!, position.total!),
      ?position.topic?.title,
    ].join(' · ');
    final next = position.next;
    final quiz = _quizAhead(position, lesson.id);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;

    return ListView(
      key: const ValueKey('premium-lesson'),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        24 + MediaQuery.paddingOf(context).bottom,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                where,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11.5, color: p.textSecondary),
              ),
            ),
            widget.download,
            if (notes) _Bookmark(lesson: lesson),
          ],
        ),
        const SizedBox(height: 2),
        // 130.52 How far through the course, and the way to the lessons
        // either side.
        if (widget.studio case final studio?) ...[
          if (studio.lesson.shows(LessonPart.progress) &&
              (widget.topics?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 8),
            _CourseProgress(
              look: studio,
              topics: widget.topics!,
              lessonId: lesson.id,
              completed: widget.completed,
            ),
            const SizedBox(height: 14),
          ],
        ],
        Text(
          lesson.title,
          key: const ValueKey('premium-lesson-title'),
          style: TextStyle(
            fontSize: 23,
            height: 1.3,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        if (widget.studio != null &&
            (position.previous != null || position.next != null)) ...[
          const SizedBox(height: 14),
          _Steps(position: position, courseId: lesson.courseId),
        ],
        if (chips.isNotEmpty) ...[
          const SizedBox(height: 14),
          SizedBox(
            height: 32,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: chips.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final chip = chips[i];
                final (label, icon) = switch (chip) {
                  _Chip.notes => (l10n.myNotes, Symbols.edit_note_rounded),
                  _Chip.files => (
                    '${widget.studio != null ? l10n.courseLookResources : l10n.lessonFiles} ${files.length}',
                    Symbols.folder_rounded,
                  ),
                  _Chip.discussion => (
                    '${l10n.lessonDiscussion} $discussion',
                    Symbols.forum_rounded,
                  ),
                  _Chip.overview => (
                    l10n.lessonOverview,
                    Symbols.article_rounded,
                  ),
                };
                return _InkChip(
                  key: ValueKey('lesson-chip-${chip.name}'),
                  label: label,
                  icon: icon,
                  on: chip == open,
                  onTap: () => chip == _Chip.discussion
                      ? context.push(Paths.lessonDiscussion(lesson.id))
                      : setState(() => _open = chip),
                );
              },
            ),
          ),
        ],
        const SizedBox(height: 14),
        ?switch (open) {
          _Chip.notes => _Notes(
            lesson: lesson,
            videoPosition: widget.videoPosition,
          ),
          _Chip.files => _Files(attachments: files),
          _Chip.overview => HtmlContent(
            html: lesson.html!,
            embeds: lesson.embeds,
            title: lesson.title,
            embedHeight: lesson.embedHeight,
          ),
          _ => null,
        },
        if (upNext && next != null && next.type == CurriculumItemType.lesson) ...[
          const SizedBox(height: 12),
          _NextCard(
            item: next,
            image: widget.courseImage,
            onTap: () => openCurriculumItem(
              context,
              next,
              courseId: lesson.courseId,
              replace: true,
            ),
          ),
        ],
        if (upNext && quiz != null) ...[
          const SizedBox(height: 12),
          _QuizCard(
            item: quiz,
            onTap: () => openCurriculumItem(
              context,
              quiz,
              courseId: lesson.courseId,
              replace: true,
            ),
          ),
        ],
        if (open != _Chip.files && files.isNotEmpty) ...[
          const SizedBox(height: 12),
          _Files(attachments: files),
        ],
        if (signedIn && !widget.completed) ...[
          const SizedBox(height: 18),
          PrimaryButton(
            key: const ValueKey('premium-lesson-complete'),
            label: l10n.markComplete,
            icon: Symbols.check_circle_rounded,
            loading: widget.completing,
            onPressed: widget.onComplete,
          ),
        ],
      ],
    );
  }
}

/// 130.52 How far through the course the student is, as Studio's course
/// screens draw it: a bar, a segment per lesson (the student's place half
/// filled) or a ring, with the lessons done of all.
class _CourseProgress extends StatelessWidget {
  const _CourseProgress({
    required this.look,
    required this.topics,
    required this.lessonId,
    required this.completed,
  });

  final CourseScreensLook look;
  final List<Topic> topics;
  final int lessonId;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final colors = CourseLookColors.of(context, look);
    final items = [for (final t in topics) ...t.items];
    final total = items.length;
    final at = items.indexWhere(
      (i) => i.type == CurriculumItemType.lesson && i.id == lessonId,
    );
    // This lesson counts once it is marked complete here.
    final done =
        items.where((i) => i.completed).length +
        (completed && at >= 0 && !items[at].completed ? 1 : 0);
    final share = total == 0 ? 0.0 : done / total;
    final label = Text(
      l10n.courseLookCourseProgress,
      style: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.4,
        color: p.textSecondary,
      ),
    );
    final counts = Text(
      l10n.lessonsDoneOf(done, total),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: p.text,
      ),
    );
    return Container(
      key: ValueKey('studio-lesson-progress-${look.lesson.progress.name}'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(
          look.look == CourseLook.faculty ? 12 : 20,
        ),
        border: Border.all(color: colors.line),
      ),
      child: switch (look.lesson.progress) {
        LessonProgress.ring => Row(
          children: [
            CourseProgressRing(
              value: share,
              color: colors.accent,
              track: colors.track,
              size: 52,
              stroke: 5,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [label, const SizedBox(height: 3), counts],
              ),
            ),
          ],
        ),
        LessonProgress.segments => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [Expanded(child: label), counts]),
            const SizedBox(height: 10),
            CourseSegments(
              total: total,
              done: done,
              current: completed || at < 0 ? null : at,
              color: colors.accent,
              track: colors.track,
              height: 6,
            ),
          ],
        ),
        LessonProgress.bar => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: label),
                Text(
                  '${(share * 100).round()}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: colors.accent,
                  ),
                ),
                const SizedBox(width: 8),
                counts,
              ],
            ),
            const SizedBox(height: 10),
            CourseProgressBar(
              value: share,
              color: colors.accent,
              track: colors.track,
              height: 7,
            ),
          ],
        ),
      },
    );
  }
}

/// 130.52 The lessons either side: back to the one before, on to the next.
class _Steps extends StatelessWidget {
  const _Steps({required this.position, required this.courseId});

  final LessonPosition position;
  final int courseId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final previous = position.previous;
    final next = position.next;
    void go(CurriculumItem item) =>
        openCurriculumItem(context, item, courseId: courseId, replace: true);
    return Row(
      children: [
        Expanded(
          child: SecondaryButton(
            key: const ValueKey('studio-lesson-previous'),
            label: l10n.previous,
            icon: Symbols.arrow_back_rounded,
            height: 46,
            onPressed: previous == null ? null : () => go(previous),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: PrimaryButton(
            key: const ValueKey('studio-lesson-next'),
            label: l10n.upNext,
            trailingIcon: Symbols.arrow_forward_rounded,
            height: 46,
            onPressed: next == null ? null : () => go(next),
          ),
        ),
      ],
    );
  }
}

/// The first quiz after this lesson in its topic.
CurriculumItem? _quizAhead(LessonPosition position, int lessonId) {
  final items = position.siblings;
  final at = items.indexWhere(
    (i) => i.type == CurriculumItemType.lesson && i.id == lessonId,
  );
  if (at < 0) return null;
  for (final item in items.skip(at + 1)) {
    if (item.type == CurriculumItemType.quiz) return item;
  }
  return null;
}

class _InkChip extends StatelessWidget {
  const _InkChip({
    super.key,
    required this.label,
    required this.icon,
    required this.on,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = on ? p.surface : p.text;
    return Semantics(
      button: true,
      selected: on,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: on ? p.text : p.text.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: ink),
              const SizedBox(width: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A rounded card with a hairline, as every card on the lesson.
class _Card extends StatelessWidget {
  const _Card({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(14),
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: p.divider),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class _Bookmark extends ConsumerStatefulWidget {
  const _Bookmark({required this.lesson});

  final Lesson lesson;

  @override
  ConsumerState<_Bookmark> createState() => _BookmarkState();
}

class _BookmarkState extends ConsumerState<_Bookmark> {
  late bool _on = widget.lesson.bookmarked;
  bool _saving = false;

  Future<void> _toggle() async {
    if (_saving) return;
    final on = !_on;
    setState(() {
      _on = on;
      _saving = true;
    });
    try {
      await ref
          .read(yallappApiProvider)
          .setLessonBookmark(widget.lesson.id, on: on);
      ref.invalidate(courseNotesProvider(widget.lesson.courseId));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _on = !on);
      showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return IconButton(
      key: const ValueKey('lesson-bookmark'),
      tooltip: _on ? l10n.removeBookmark : l10n.bookmarkLesson,
      onPressed: _toggle,
      icon: Icon(
        Symbols.bookmark_rounded,
        fill: _on ? 1 : 0,
        color: Theme.of(context).colorScheme.secondary,
      ),
    );
  }
}

/// The student's notes on the lesson: where in the video, when, and what.
class _Notes extends ConsumerWidget {
  const _Notes({required this.lesson, this.videoPosition});

  final Lesson lesson;
  final int? Function()? videoPosition;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final gold = Theme.of(context).colorScheme.secondary;
    void edit() => showLessonNotes(
      context,
      lesson: lesson,
      position: videoPosition?.call(),
    );
    final items =
        ref.watch(lessonNotesProvider(lesson.id)).value?.items ?? const [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final note in items) ...[
          _Card(
            key: ValueKey('premium-note-${note.id}'),
            onTap: edit,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (note.positionSeconds case final at?)
                      Text(
                        formatClock(Duration(seconds: at)),
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: gold,
                        ),
                      ),
                    const Spacer(),
                    Text(
                      timeAgo(note.createdAt),
                      style: TextStyle(fontSize: 11, color: p.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  note.text,
                  style: TextStyle(fontSize: 12.5, height: 1.55, color: p.text),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton.icon(
            key: const ValueKey('premium-add-note'),
            onPressed: edit,
            style: TextButton.styleFrom(
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 6),
            ),
            icon: Icon(Symbols.add_rounded, size: 16, color: gold),
            label: Text(
              l10n.addNote,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: p.textSecondary,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NextCard extends StatelessWidget {
  const _NextCard({required this.item, required this.onTap, this.image});

  final CurriculumItem item;
  final String? image;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final minutes = item.durationMinutes;
    return _Card(
      key: const ValueKey('premium-next'),
      onTap: onTap,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: AppNetworkImage(
              url: image,
              seed: item.id,
              width: 74,
              height: 56,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    l10n.upNext,
                    if (minutes != null) formatMinutes(minutes),
                  ].join(' · '),
                  style: TextStyle(fontSize: 11, color: p.textSecondary),
                ),
                const SizedBox(height: 3),
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Semantics(
            button: true,
            label: l10n.nextLesson,
            excludeSemantics: true,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: p.text, shape: BoxShape.circle),
              child: Icon(
                Symbols.skip_next_rounded,
                fill: 1,
                size: 24,
                color: p.surface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The quiz coming up, on gold: its name, its questions, and that it opens
/// once this lesson is done.
class _QuizCard extends StatelessWidget {
  const _QuizCard({required this.item, required this.onTap});

  final CurriculumItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final gold = Theme.of(context).colorScheme.secondary;
    const ink = Color(0xFF2A1D05);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final count = item.questionCount;
    return Material(
      key: const ValueKey('premium-quiz'),
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: Ink(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: AlignmentDirectional.centerStart,
            end: AlignmentDirectional.centerEnd,
            colors: [gold, Color.lerp(gold, const Color(0xFFFFEBB0), 0.6)!],
          ),
        ),
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Symbols.quiz_rounded, size: 30, fill: 1, color: ink),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: ink,
                        ),
                      ),
                      if (count != null || item.locked) ...[
                        const SizedBox(height: 3),
                        Text(
                          [
                            if (count != null) l10n.questionCount(count),
                            if (item.locked) l10n.quizOpensAfter,
                          ].join(' · '),
                          style: TextStyle(
                            fontSize: 11,
                            color: ink.withValues(alpha: 0.75),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Icon(
                  rtl
                      ? Symbols.chevron_left_rounded
                      : Symbols.chevron_right_rounded,
                  color: ink,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The lesson's files, each with its kind's icon, its size and a way to
/// get it.
class _Files extends ConsumerWidget {
  const _Files({required this.attachments});

  final List<Attachment> attachments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final gold = Theme.of(context).colorScheme.secondary;
    return Container(
      key: const ValueKey('premium-files'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.divider),
      ),
      child: Column(
        children: [
          for (final (i, a) in attachments.indexed) ...[
            if (i > 0) Divider(height: 1, color: p.divider),
            InkWell(
              onTap: () => openLessonAttachment(context, ref, a),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 11,
                ),
                child: Row(
                  children: [
                    _Kind(name: a.name, mimeType: a.mimeType),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        a.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (a.sizeBytes != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        attachmentSize(a.sizeBytes!),
                        style: TextStyle(fontSize: 11, color: p.textSecondary),
                      ),
                    ],
                    const SizedBox(width: 12),
                    Icon(Symbols.download_rounded, size: 22, color: gold),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A file's kind as an icon in its colour on a soft square.
class _Kind extends StatelessWidget {
  const _Kind({required this.name, this.mimeType});

  final String name;
  final String? mimeType;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final kind = '${mimeType ?? ''} ${name.toLowerCase()}';
    bool has(List<String> words) => words.any(kind.contains);
    final (icon, color) = switch (kind) {
      _ when has(['pdf']) => (
        Symbols.picture_as_pdf_rounded,
        const Color(0xFFE5484D),
      ),
      _ when has(['sheet', 'excel', '.xls', '.csv']) => (
        Symbols.table_chart_rounded,
        const Color(0xFF2FA36B),
      ),
      _ when has(['image', '.png', '.jpg', '.jpeg', '.svg', '.fig']) => (
        Symbols.image_rounded,
        const Color(0xFF2F9E8F),
      ),
      _ when has(['zip', 'compressed', '.rar']) => (
        Symbols.folder_zip_rounded,
        const Color(0xFFD08A1E),
      ),
      _ when has(['audio', '.mp3', '.m4a']) => (
        Symbols.headphones_rounded,
        const Color(0xFF7C5CFF),
      ),
      _ when has(['presentation', 'powerpoint', '.ppt', '.key']) => (
        Symbols.slideshow_rounded,
        const Color(0xFFE07A3F),
      ),
      _ => (Symbols.description_rounded, const Color(0xFF4C7BF3)),
    };
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: p.text.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, size: 22, color: color),
    );
  }
}
